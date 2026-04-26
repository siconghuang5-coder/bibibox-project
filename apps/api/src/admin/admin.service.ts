import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  Account,
  AiPublishTaskStatus,
  NotificationType,
  PostScope,
  PostSource,
  ProductStatus,
  ProductType,
} from '@prisma/client';
import { CozeService } from '../ai/coze.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SocialService } from '../social/social.service';

interface GenerateDraftInput {
  digitalHumanId: string;
  topic: string;
  scope: PostScope;
  prompt?: string;
  generateImage?: boolean;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socialService: SocialService,
    private readonly notificationsService: NotificationsService,
    private readonly cozeService: CozeService,
  ) {}

  async getOverview() {
    const [accounts, users, digitalHumans, posts, notifications, scheduledTasks, products, orders, conversations] =
      await Promise.all([
      this.prisma.account.count(),
      this.prisma.account.count({ where: { accountType: 'USER' } }),
      this.prisma.account.count({ where: { accountType: 'DIGITAL_HUMAN' } }),
      this.prisma.post.count(),
      this.prisma.notification.count({ where: { readAt: null } }),
      this.prisma.aiPublishTask.count({ where: { status: AiPublishTaskStatus.SCHEDULED } }),
      this.prisma.product.count(),
      this.prisma.order.count(),
      this.prisma.directConversation.count(),
    ]);

    return {
      metrics: {
        accounts,
        users,
        digitalHumans,
        posts,
        unreadNotifications: notifications,
        scheduledTasks,
        products,
        orders,
        conversations,
      },
      hotTopics: await this.prisma.topicStatHourly.findMany({
        orderBy: [{ pinned: 'desc' }, { score: 'desc' }],
        take: 6,
      }),
    };
  }

  async listUsers(query: { q?: string; accountType?: string }) {
    const items = await this.prisma.account.findMany({
      where: {
        ...(query.accountType ? { accountType: query.accountType as any } : {}),
        ...(query.q
          ? {
              OR: [{ username: { contains: query.q } }, { displayName: { contains: query.q } }],
            }
          : {}),
      },
      include: {
        userProfile: true,
        digitalHuman: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return {
      items: await Promise.all(
        items.map(async (account) => ({
          id: account.id,
          username: account.username,
          displayName: account.displayName,
          accountType: account.accountType,
          avatarUrl: account.avatarUrl,
          tagline: account.tagline,
          isAdmin: account.isAdmin,
          isActive: account.isActive,
          ownerAccountId: account.digitalHuman?.ownerAccountId ?? null,
          isPresale: account.digitalHuman?.isPresale ?? false,
          cozeBotId: account.digitalHuman?.cozeBotId ?? null,
          stats: {
            followers: await this.prisma.follow.count({ where: { followingId: account.id } }),
            posts: await this.prisma.post.count({ where: { authorId: account.id } }),
          },
        })),
      ),
    };
  }

  async getUser(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        userProfile: true,
        digitalHuman: true,
        posts: {
          take: 10,
          orderBy: { publishedAt: 'desc' },
          include: {
            media: true,
          },
        },
      },
    });

    if (!account) {
      throw new NotFoundException('账号不存在');
    }

    return {
      account: {
        id: account.id,
        username: account.username,
        email: account.email,
        displayName: account.displayName,
        accountType: account.accountType,
        avatarUrl: account.avatarUrl,
        tagline: account.tagline,
        isAdmin: account.isAdmin,
        isActive: account.isActive,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
        userProfile: account.userProfile,
        digitalHuman: account.digitalHuman,
        posts: account.posts,
      },
      stats: {
        followers: await this.prisma.follow.count({ where: { followingId: id } }),
        following: await this.prisma.follow.count({ where: { followerId: id } }),
        friends: await this.prisma.friendship.count({
          where: {
            status: 'ACCEPTED',
            OR: [{ requesterId: id }, { addresseeId: id }],
          },
        }),
      },
    };
  }

  async listPosts(query: { scope?: PostScope; source?: PostSource; q?: string }) {
    const items = await this.prisma.post.findMany({
      where: {
        ...(query.scope ? { scope: query.scope } : {}),
        ...(query.source ? { source: query.source } : {}),
        ...(query.q ? { content: { contains: query.q } } : {}),
      },
      include: {
        author: true,
        media: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: { publishedAt: 'desc' },
      take: 100,
    });

    return {
      items: items.map((post) => ({
        id: post.id,
        content: post.content,
        scope: post.scope,
        source: post.source,
        isPublic: post.isPublic,
        publishedAt: post.publishedAt,
        author: {
          id: post.author.id,
          displayName: post.author.displayName,
          accountType: post.author.accountType,
        },
        media: post.media,
        stats: post._count,
      })),
    };
  }

  async listProducts(query: { productType?: ProductType; q?: string }) {
    const items = await this.prisma.product.findMany({
      where: {
        ...(query.productType ? { productType: query.productType } : {}),
        ...(query.q
          ? {
              OR: [{ name: { contains: query.q } }, { subtitle: { contains: query.q } }],
            }
          : {}),
      },
      include: {
        relatedAccount: true,
      },
      orderBy: [{ productType: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        slug: item.slug,
        name: item.name,
        subtitle: item.subtitle,
        description: item.description,
        productType: item.productType,
        status: item.status,
        priceCoins: item.priceCoins,
        stock: item.stock,
        coverUrl: item.coverUrl,
        badge: item.badge,
        sortOrder: item.sortOrder,
        relatedAccountId: item.relatedAccountId,
        relatedAccount: item.relatedAccount
          ? {
              id: item.relatedAccount.id,
              displayName: item.relatedAccount.displayName,
            }
          : null,
      })),
    };
  }

  async upsertProduct(payload: {
    id?: string;
    slug: string;
    name: string;
    subtitle?: string;
    description?: string;
    productType: ProductType;
    status: ProductStatus;
    priceCoins: number;
    stock?: number;
    coverUrl?: string;
    badge?: string;
    sortOrder?: number;
    relatedAccountId?: string;
  }) {
    if (payload.productType === ProductType.DIGITAL_HUMAN && !payload.relatedAccountId) {
      throw new BadRequestException('数字人商品必须绑定一个数字人账号');
    }

    if (payload.relatedAccountId) {
      const related = await this.prisma.account.findUnique({
        where: { id: payload.relatedAccountId },
      });
      if (!related) {
        throw new NotFoundException('绑定的数字人账号不存在');
      }
    }

    const data = {
      slug: payload.slug,
      name: payload.name,
      subtitle: payload.subtitle,
      description: payload.description,
      productType: payload.productType,
      status: payload.status,
      priceCoins: payload.priceCoins,
      stock: payload.stock ?? null,
      coverUrl: payload.coverUrl,
      badge: payload.badge,
      sortOrder: payload.sortOrder ?? 0,
      relatedAccountId: payload.relatedAccountId ?? null,
    };

    if (payload.id) {
      return this.prisma.product.update({
        where: { id: payload.id },
        data,
      });
    }

    return this.prisma.product.create({
      data,
    });
  }

  async listOrders(query: { q?: string }) {
    const items = await this.prisma.order.findMany({
      where: query.q
        ? {
            OR: [
              { id: { contains: query.q } },
              { account: { username: { contains: query.q } } },
              { account: { displayName: { contains: query.q } } },
            ],
          }
        : undefined,
      include: {
        account: true,
        items: true,
        wallet: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        status: item.status,
        totalCoins: item.totalCoins,
        paidAt: item.paidAt,
        createdAt: item.createdAt,
        account: {
          id: item.account.id,
          username: item.account.username,
          displayName: item.account.displayName,
        },
        walletBalanceAfter: item.wallet.balanceCoins,
        items: item.items,
      })),
    };
  }

  async listAssets(query: { q?: string }) {
    const items = await this.prisma.assetHolding.findMany({
      where: query.q
        ? {
            OR: [
              { title: { contains: query.q } },
              { account: { username: { contains: query.q } } },
              { account: { displayName: { contains: query.q } } },
            ],
          }
        : undefined,
      include: {
        account: true,
        product: true,
        order: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        assetType: item.assetType,
        title: item.title,
        subtitle: item.subtitle,
        quantity: item.quantity,
        createdAt: item.createdAt,
        account: {
          id: item.account.id,
          username: item.account.username,
          displayName: item.account.displayName,
        },
        product: item.product
          ? {
              id: item.product.id,
              slug: item.product.slug,
              productType: item.product.productType,
            }
          : null,
        orderId: item.orderId,
      })),
    };
  }

  async listConversations(query: { q?: string }) {
    const items = await this.prisma.directConversation.findMany({
      where: query.q
        ? {
            OR: [
              { ownerAccount: { username: { contains: query.q } } },
              { ownerAccount: { displayName: { contains: query.q } } },
              { digitalHumanAccount: { displayName: { contains: query.q } } },
            ],
          }
        : undefined,
      include: {
        ownerAccount: true,
        digitalHumanAccount: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 200,
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        unreadCount: item.unreadCount,
        updatedAt: item.updatedAt,
        owner: {
          id: item.ownerAccount.id,
          username: item.ownerAccount.username,
          displayName: item.ownerAccount.displayName,
        },
        digitalHuman: {
          id: item.digitalHumanAccount.id,
          displayName: item.digitalHumanAccount.displayName,
        },
        messages: item.messages.map((message) => ({
          id: message.id,
          role: message.role,
          messageType: message.messageType,
          textContent: message.textContent,
          transcription: message.transcription,
          createdAt: message.createdAt,
        })),
      })),
    };
  }

  async impersonatePost(admin: Account, payload: { authorId: string; scope: PostScope; content: string; mediaUrls?: string[] }) {
    const author = await this.prisma.account.findUnique({ where: { id: payload.authorId } });
    if (!author) {
      throw new NotFoundException('代发目标不存在');
    }

    const post = await this.socialService.createPost({
      authorId: author.id,
      scope: payload.scope,
      content: payload.content,
      mediaUrls: payload.mediaUrls,
      source: PostSource.ADMIN_IMPERSONATED,
    });

    await this.prisma.adminImpersonationLog.create({
      data: {
        adminAccountId: admin.id,
        authorAccountId: author.id,
        postId: post.id,
        scope: payload.scope,
        contentPreview: payload.content.slice(0, 120),
      },
    });

    return post;
  }

  async generateDraft(input: GenerateDraftInput) {
    const account = await this.prisma.account.findUnique({
      where: { id: input.digitalHumanId },
      include: { digitalHuman: true },
    });

    if (!account || !account.digitalHuman) {
      throw new NotFoundException('数字人不存在');
    }

    return this.cozeService.generatePostDraft({
      account,
      digitalHuman: account.digitalHuman,
      topic: input.topic,
      scope: input.scope,
      prompt: input.prompt,
      generateImage: input.generateImage,
    });
  }

  async publishDraft(admin: Account, payload: { digitalHumanId: string; scope: PostScope; content: string; mediaUrls?: string[] }) {
    const author = await this.prisma.account.findUnique({ where: { id: payload.digitalHumanId } });
    if (!author) {
      throw new NotFoundException('数字人不存在');
    }

    const post = await this.socialService.createPost({
      authorId: author.id,
      scope: payload.scope,
      content: payload.content,
      mediaUrls: payload.mediaUrls,
      source: PostSource.AI,
    });

    if (author.accountType === 'DIGITAL_HUMAN') {
      const ownerId = (
        await this.prisma.digitalHuman.findUnique({
          where: { accountId: author.id },
        })
      )?.ownerAccountId;

      if (ownerId) {
        await this.notificationsService.create({
          recipientId: ownerId,
          actorId: admin.id,
          postId: post.id,
          type: NotificationType.AI_INTERACTION,
          title: `${author.displayName} 已发布新的 AI 动态`,
          content: payload.content.slice(0, 80),
        });
      }
    }

    return post;
  }

  async scheduleDraft(
    admin: Account,
    payload: { digitalHumanId: string; topic: string; scope: PostScope; prompt?: string; generateImage?: boolean; scheduledAt: string },
  ) {
    const scheduledAt = new Date(payload.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('定时发布时间不合法');
    }

    const generated = await this.generateDraft(payload);

    return this.prisma.aiPublishTask.create({
      data: {
        digitalHumanId: payload.digitalHumanId,
        adminAccountId: admin.id,
        scope: payload.scope,
        topic: payload.topic,
        prompt: payload.prompt,
        generatedContent: generated.content,
        generateImage: Boolean(payload.generateImage),
        scheduledAt,
        status: AiPublishTaskStatus.SCHEDULED,
      },
    });
  }

  async listNotifications() {
    const items = await this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        actor: true,
        recipient: true,
        post: true,
      },
      take: 100,
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        content: item.content,
        readAt: item.readAt,
        createdAt: item.createdAt,
        actor: item.actor
          ? {
              id: item.actor.id,
              displayName: item.actor.displayName,
            }
          : null,
        recipient: {
          id: item.recipient.id,
          displayName: item.recipient.displayName,
        },
        post: item.post
          ? {
              id: item.post.id,
              excerpt: item.post.content.slice(0, 80),
            }
          : null,
      })),
    };
  }

  async pinTopic(id: string, pinned: boolean) {
    return this.prisma.topicStatHourly.update({
      where: { id },
      data: { pinned },
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async publishDueTasks() {
    const tasks = await this.prisma.aiPublishTask.findMany({
      where: {
        status: AiPublishTaskStatus.SCHEDULED,
        scheduledAt: {
          lte: new Date(),
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 10,
    });

    for (const task of tasks) {
      try {
        await this.prisma.aiPublishTask.update({
          where: { id: task.id },
          data: { status: AiPublishTaskStatus.PROCESSING },
        });

        const post = await this.publishDraft(
          { id: task.adminAccountId ?? task.digitalHumanId } as Account,
          {
            digitalHumanId: task.digitalHumanId,
            scope: task.scope,
            content: task.generatedContent ?? `${task.topic} #AI数字人`,
            mediaUrls: task.generatedImageUrl ? [task.generatedImageUrl] : undefined,
          },
        );

        await this.prisma.aiPublishTask.update({
          where: { id: task.id },
          data: {
            status: AiPublishTaskStatus.PUBLISHED,
            publishedPostId: post.id,
          },
        });
      } catch (error) {
        await this.prisma.aiPublishTask.update({
          where: { id: task.id },
          data: {
            status: AiPublishTaskStatus.FAILED,
            failureReason: (error as Error).message,
          },
        });
      }
    }
  }
}
