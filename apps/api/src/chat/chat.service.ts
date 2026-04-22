import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join, resolve } from 'path';
import {
  AccountType,
  ConversationStatus,
  MessageRole,
  MessageType,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { CozeService } from '../ai/coze.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

interface SendMessageInput {
  messageType: MessageType;
  textContent?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  durationSeconds?: number;
  transcription?: string;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cozeService: CozeService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listConversations(accountId: string) {
    const [conversations, ownedHumans, allHumans] = await Promise.all([
      this.prisma.directConversation.findMany({
        where: {
          ownerAccountId: accountId,
          status: ConversationStatus.ACTIVE,
        },
        include: {
          digitalHumanAccount: {
            include: {
              digitalHuman: true,
            },
          },
        },
        orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
      }),
      this.prisma.digitalHuman.findMany({
        where: { ownerAccountId: accountId },
        include: {
          account: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.account.findMany({
        where: {
          accountType: AccountType.DIGITAL_HUMAN,
          isActive: true,
        },
        include: {
          digitalHuman: true,
        },
        take: 20,
      }),
    ]);

    const existingHumanIds = new Set(conversations.map((item) => item.digitalHumanAccountId));

    return {
      unreadCount: conversations.reduce((sum, item) => sum + item.unreadCount, 0),
      items: conversations.map((item) => this.serializeConversation(item)),
      ownedDigitalHumans: ownedHumans.map((item) => ({
        id: item.account.id,
        displayName: item.account.displayName,
        avatarUrl: item.account.avatarUrl,
        tagline: item.account.tagline,
        slug: item.slug,
        isOwned: true,
      })),
      discover: allHumans
        .filter((item) => !existingHumanIds.has(item.id))
        .map((item) => ({
          id: item.id,
          displayName: item.displayName,
          avatarUrl: item.avatarUrl,
          tagline: item.tagline,
          slug: item.digitalHuman?.slug ?? null,
          isOwned: item.digitalHuman?.ownerAccountId === accountId,
        })),
    };
  }

  async ensureConversation(accountId: string, digitalHumanAccountId: string) {
    const human = await this.prisma.account.findFirst({
      where: {
        id: digitalHumanAccountId,
        accountType: AccountType.DIGITAL_HUMAN,
        isActive: true,
      },
      include: {
        digitalHuman: true,
      },
    });

    if (!human || !human.digitalHuman) {
      throw new NotFoundException('数字人不存在');
    }

    const conversation = await this.prisma.directConversation.upsert({
      where: {
        ownerAccountId_digitalHumanAccountId: {
          ownerAccountId: accountId,
          digitalHumanAccountId,
        },
      },
      update: {
        status: ConversationStatus.ACTIVE,
      },
      create: {
        ownerAccountId: accountId,
        digitalHumanAccountId,
        title: human.displayName,
      },
      include: {
        digitalHumanAccount: {
          include: {
            digitalHuman: true,
          },
        },
      },
    });

    return this.serializeConversation(conversation);
  }

  async getConversation(accountId: string, conversationId: string, page = 1, pageSize = 30) {
    const conversation = await this.prisma.directConversation.findFirst({
      where: {
        id: conversationId,
        ownerAccountId: accountId,
      },
      include: {
        digitalHumanAccount: {
          include: {
            digitalHuman: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('会话不存在');
    }

    const skip = Math.max(page - 1, 0) * pageSize;
    const messages = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      include: {
        senderAccount: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    });

    return {
      conversation: this.serializeConversation(conversation),
      messages: messages.reverse().map((item) => this.serializeMessage(item)),
      page,
      pageSize,
    };
  }

  async sendMessage(accountId: string, conversationId: string, input: SendMessageInput) {
    const conversation = await this.prisma.directConversation.findFirst({
      where: {
        id: conversationId,
        ownerAccountId: accountId,
      },
      include: {
        ownerAccount: true,
        digitalHumanAccount: {
          include: {
            digitalHuman: true,
          },
        },
      },
    });

    if (!conversation || !conversation.digitalHumanAccount.digitalHuman) {
      throw new NotFoundException('会话不存在');
    }

    const promptText = this.resolvePromptText(input);
    const preview = this.buildPreview(input.messageType, promptText);

    const sent = await this.prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        senderAccountId: accountId,
        role: MessageRole.USER,
        messageType: input.messageType,
        textContent: input.textContent?.trim() || null,
        mediaUrl: input.mediaUrl ?? null,
        mediaMimeType: input.mediaMimeType ?? null,
        durationSeconds: input.durationSeconds ?? null,
        transcription: input.transcription?.trim() || null,
      },
      include: {
        senderAccount: true,
      },
    });

    await this.prisma.directConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessagePreview: preview,
        lastMessageAt: sent.createdAt,
      },
    });

    const history = await this.prisma.chatMessage.findMany({
      where: {
        conversationId: conversation.id,
      },
      orderBy: { createdAt: 'asc' },
      take: 8,
    });

    const aiReply = await this.cozeService.generateChatReply({
      ownerDisplayName: conversation.ownerAccount.displayName,
      humanAccount: conversation.digitalHumanAccount,
      digitalHuman: conversation.digitalHumanAccount.digitalHuman,
      latestMessage: promptText,
      history: history
        .filter((item) => item.role === MessageRole.USER || item.role === MessageRole.DIGITAL_HUMAN)
        .map((item) => ({
          role: item.role === MessageRole.USER ? 'user' : 'assistant',
          content:
            item.textContent?.trim() ||
            item.transcription?.trim() ||
            (item.messageType === MessageType.IMAGE ? '[图片消息]' : '[语音消息]'),
        })),
    });

    const reply = await this.prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        senderAccountId: conversation.digitalHumanAccountId,
        role: MessageRole.DIGITAL_HUMAN,
        messageType: MessageType.TEXT,
        textContent: aiReply.content,
      },
      include: {
        senderAccount: true,
      },
    });

    await this.prisma.directConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessagePreview: aiReply.content.slice(0, 80),
        lastMessageAt: reply.createdAt,
        unreadCount: {
          increment: 1,
        },
      },
    });

    await this.notificationsService.create({
      recipientId: accountId,
      actorId: conversation.digitalHumanAccountId,
      type: NotificationType.CHAT_MESSAGE,
      title: `${conversation.digitalHumanAccount.displayName} 发来新消息`,
      content: aiReply.content.slice(0, 80),
      payload: {
        conversationId: conversation.id,
        mode: aiReply.mode,
      },
    });

    return {
      sent: this.serializeMessage(sent),
      reply: this.serializeMessage(reply),
      mode: aiReply.mode,
    };
  }

  async markConversationRead(accountId: string, conversationId: string) {
    const conversation = await this.prisma.directConversation.findFirst({
      where: {
        id: conversationId,
        ownerAccountId: accountId,
      },
    });

    if (!conversation) {
      throw new NotFoundException('会话不存在');
    }

    await Promise.all([
      this.prisma.directConversation.update({
        where: { id: conversationId },
        data: { unreadCount: 0 },
      }),
      this.prisma.notification.updateMany({
        where: {
          recipientId: accountId,
          actorId: conversation.digitalHumanAccountId,
          type: NotificationType.CHAT_MESSAGE,
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      }),
    ]);

    return { success: true };
  }

  async getUnreadSummary(accountId: string) {
    const aggregate = await this.prisma.directConversation.aggregate({
      where: {
        ownerAccountId: accountId,
        status: ConversationStatus.ACTIVE,
      },
      _sum: {
        unreadCount: true,
      },
    });

    return {
      unreadCount: aggregate._sum.unreadCount ?? 0,
    };
  }

  async uploadImage(
    accountId: string,
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
  ) {
    if (!file || !file.mimetype.startsWith('image/')) {
      throw new BadRequestException('仅支持上传图片消息');
    }

    return this.uploadMedia(accountId, file, 'images');
  }

  async uploadAudio(
    accountId: string,
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
  ) {
    const extension = extname(file.originalname).replace('.', '').toLowerCase();
    const supportedExtensions = new Set(['mp3', 'wav', 'm4a', 'aac', 'amr']);
    const isAudio = file?.mimetype.startsWith('audio/') || supportedExtensions.has(extension);
    if (!file || !isAudio) {
      throw new BadRequestException('仅支持上传语音消息');
    }

    return this.uploadMedia(accountId, file, 'audio');
  }

  private async uploadMedia(
    accountId: string,
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
    folder: 'images' | 'audio',
  ) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) {
      throw new NotFoundException('上传账号不存在');
    }

    const uploadDir = process.env.UPLOAD_DIR
      ? resolve(process.cwd(), process.env.UPLOAD_DIR)
      : join(process.cwd(), 'uploads');
    const publicBase = (process.env.UPLOAD_PUBLIC_BASE || '/uploads').replace(/\/$/, '');
    const bucket = this.buildUploadBucket(new Date());
    const targetDir = join(uploadDir, 'chat', folder, bucket);

    await mkdir(targetDir, { recursive: true });

    const extension = this.resolveUploadExtension(file.originalname, file.mimetype);
    const filename = `${Date.now()}-${randomUUID()}.${extension}`;
    await writeFile(join(targetDir, filename), file.buffer);

    return {
      url: `${publicBase}/chat/${folder}/${bucket}/${filename}`,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  private resolvePromptText(input: SendMessageInput) {
    const text = input.textContent?.trim();
    if (text) {
      return text;
    }
    const transcription = input.transcription?.trim();
    if (transcription) {
      return transcription;
    }
    if (input.messageType === MessageType.IMAGE) {
      return '[用户发送了一张图片]';
    }
    if (input.messageType === MessageType.AUDIO) {
      return '[用户发送了一段语音]';
    }
    throw new BadRequestException('消息内容不能为空');
  }

  private buildPreview(messageType: MessageType, content: string) {
    if (messageType === MessageType.IMAGE) {
      return '[图片]';
    }
    if (messageType === MessageType.AUDIO) {
      return '[语音]';
    }
    return content.slice(0, 80);
  }

  private serializeConversation(
    conversation: Prisma.DirectConversationGetPayload<{
      include: {
        digitalHumanAccount: {
          include: {
            digitalHuman: true;
          };
        };
      };
    }>,
  ) {
    return {
      id: conversation.id,
      title: conversation.title || conversation.digitalHumanAccount.displayName,
      lastMessagePreview: conversation.lastMessagePreview,
      lastMessageAt: conversation.lastMessageAt,
      unreadCount: conversation.unreadCount,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      digitalHuman: {
        id: conversation.digitalHumanAccount.id,
        displayName: conversation.digitalHumanAccount.displayName,
        avatarUrl: conversation.digitalHumanAccount.avatarUrl,
        tagline: conversation.digitalHumanAccount.tagline,
        slug: conversation.digitalHumanAccount.digitalHuman?.slug ?? null,
        capabilities: conversation.digitalHumanAccount.digitalHuman?.capabilities ?? [],
      },
    };
  }

  private serializeMessage(
    message: Prisma.ChatMessageGetPayload<{
      include: {
        senderAccount: true;
      };
    }>,
  ) {
    return {
      id: message.id,
      role: message.role,
      messageType: message.messageType,
      textContent: message.textContent,
      mediaUrl: message.mediaUrl,
      mediaMimeType: message.mediaMimeType,
      durationSeconds: message.durationSeconds,
      transcription: message.transcription,
      createdAt: message.createdAt,
      sender: message.senderAccount
        ? {
            id: message.senderAccount.id,
            displayName: message.senderAccount.displayName,
            avatarUrl: message.senderAccount.avatarUrl,
          }
        : null,
    };
  }

  private buildUploadBucket(now: Date) {
    const year = now.getFullYear();
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    return `${year}${month}`;
  }

  private resolveUploadExtension(originalName: string, mimeType: string) {
    const originalExtension = extname(originalName).replace('.', '').toLowerCase();
    if (originalExtension) {
      return originalExtension;
    }

    const subtype = mimeType.split('/')[1]?.toLowerCase();
    if (subtype === 'mpeg') {
      return 'mp3';
    }
    if (subtype === 'jpeg') {
      return 'jpg';
    }
    return subtype || 'bin';
  }
}
