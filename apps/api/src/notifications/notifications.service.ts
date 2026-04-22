import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from '../realtime/notifications.gateway';

interface CreateNotificationInput {
  recipientId: string;
  actorId?: string | null;
  postId?: string | null;
  commentId?: string | null;
  type: NotificationType;
  title: string;
  content?: string | null;
  payload?: Prisma.InputJsonValue | null;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async create(input: CreateNotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        recipientId: input.recipientId,
        actorId: input.actorId ?? null,
        postId: input.postId ?? null,
        commentId: input.commentId ?? null,
        type: input.type,
        title: input.title,
        content: input.content ?? null,
        payload: input.payload ?? undefined,
      },
      include: {
        actor: true,
        post: true,
        comment: true,
      },
    });

    const unreadCount = await this.getUnreadCount(input.recipientId);
    this.gateway.emitNotificationCreated(input.recipientId, this.serialize(notification));
    this.gateway.emitUnreadCount(input.recipientId, unreadCount);

    return notification;
  }

  async list(accountId: string, page = 1, pageSize = 20) {
    const skip = Math.max(page - 1, 0) * pageSize;
    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { recipientId: accountId },
        orderBy: { createdAt: 'desc' },
        include: {
          actor: true,
          post: true,
          comment: true,
        },
        skip,
        take: pageSize,
      }),
      this.prisma.notification.count({ where: { recipientId: accountId } }),
      this.getUnreadCount(accountId),
    ]);

    return {
      items: items.map((item) => this.serialize(item)),
      total,
      unreadCount,
      page,
      pageSize,
    };
  }

  async markRead(accountId: string, ids: string[]) {
    await this.prisma.notification.updateMany({
      where: {
        recipientId: accountId,
        id: { in: ids },
      },
      data: {
        readAt: new Date(),
      },
    });

    const unreadCount = await this.getUnreadCount(accountId);
    this.gateway.emitUnreadCount(accountId, unreadCount);
    return { success: true, unreadCount };
  }

  async markAllRead(accountId: string) {
    await this.prisma.notification.updateMany({
      where: {
        recipientId: accountId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    this.gateway.emitUnreadCount(accountId, 0);
    return { success: true, unreadCount: 0 };
  }

  async getUnreadCount(accountId: string) {
    return this.prisma.notification.count({
      where: {
        recipientId: accountId,
        readAt: null,
      },
    });
  }

  private serialize(
    notification: Prisma.NotificationGetPayload<{
      include: {
        actor: true;
        post: true;
        comment: true;
      };
    }>,
  ) {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      content: notification.content,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
      actor: notification.actor
        ? {
            id: notification.actor.id,
            displayName: notification.actor.displayName,
            avatarUrl: notification.actor.avatarUrl,
          }
        : null,
      post: notification.post
        ? {
            id: notification.post.id,
            excerpt: notification.post.content.slice(0, 80),
          }
        : null,
      comment: notification.comment
        ? {
            id: notification.comment.id,
            excerpt: notification.comment.content.slice(0, 80),
          }
        : null,
    };
  }
}
