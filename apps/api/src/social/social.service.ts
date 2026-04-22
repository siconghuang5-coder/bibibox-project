import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join, resolve } from 'path';
import {
  Account,
  AccountType,
  FriendshipStatus,
  NotificationType,
  PostScope,
  PostSource,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../realtime/notifications.gateway';

interface CreatePostInput {
  authorId: string;
  scope: PostScope;
  content: string;
  mediaUrls?: string[];
  source?: PostSource;
  isPublic?: boolean;
}

@Injectable()
export class SocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async getMomentsFeed(accountId: string, page = 1, pageSize = 10) {
    const authorIds = await this.resolveMomentsAuthorIds(accountId);
    const skip = Math.max(page - 1, 0) * pageSize;

    const posts = await this.prisma.post.findMany({
      where: {
        authorId: { in: authorIds },
        scope: PostScope.MOMENTS,
      },
      orderBy: { publishedAt: 'desc' },
      include: this.postInclude(),
      skip,
      take: pageSize,
    });

    return {
      items: posts.map((post) => this.serializePost(post, accountId)),
      page,
      pageSize,
      authors: authorIds.length,
    };
  }

  async getSquareFeed(accountId: string, page = 1, pageSize = 10) {
    const skip = Math.max(page - 1, 0) * pageSize;
    const [posts, hotTopics, recommendedAccounts] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          scope: PostScope.SQUARE,
          isPublic: true,
        },
        orderBy: [{ publishedAt: 'desc' }],
        include: this.postInclude(),
        skip,
        take: pageSize,
      }),
      this.prisma.topicStatHourly.findMany({
        orderBy: [{ pinned: 'desc' }, { score: 'desc' }, { interactionCount: 'desc' }],
        take: 8,
      }),
      this.prisma.account.findMany({
        where: {
          isActive: true,
          id: { not: accountId },
        },
        include: {
          digitalHuman: true,
        },
        take: 6,
      }),
    ]);

    return {
      items: posts.map((post) => this.serializePost(post, accountId)),
      page,
      pageSize,
      hotTopics: hotTopics.map((item) => ({
        id: item.id,
        keyword: item.keyword,
        score: item.score,
        pinned: item.pinned,
        interactions: item.interactionCount,
      })),
      recommendedAccounts: recommendedAccounts.map((account) => this.serializeAccountCard(account)),
    };
  }

  async createPost(input: CreatePostInput) {
    const author = await this.prisma.account.findUnique({ where: { id: input.authorId } });
    if (!author) {
      throw new NotFoundException('作者不存在');
    }

    const post = await this.prisma.post.create({
      data: {
        authorId: input.authorId,
        scope: input.scope,
        source: input.source ?? PostSource.MANUAL,
        content: input.content,
        isPublic: input.scope === PostScope.SQUARE ? true : input.isPublic ?? true,
        media:
          input.mediaUrls && input.mediaUrls.length > 0
            ? {
                create: input.mediaUrls.map((url, index) => ({
                  url,
                  sortOrder: index,
                })),
              }
            : undefined,
      },
      include: this.postInclude(),
    });

    await this.handleContentMentions(post.id, input.authorId, input.content);
    if (input.scope === PostScope.SQUARE) {
      await this.bumpTopicsByText(input.content, { postCount: 1, score: 3 });
    }

    const serialized = this.serializePost(post, input.authorId);
    this.gateway.emitFeedPost(serialized);
    return serialized;
  }

  async uploadImages(
    accountId: string,
    files: Array<{
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    }>,
  ) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) {
      throw new NotFoundException('上传账号不存在');
    }

    if (!files.length) {
      throw new BadRequestException('请至少选择一张图片');
    }

    const uploadDir = process.env.UPLOAD_DIR
      ? resolve(process.cwd(), process.env.UPLOAD_DIR)
      : join(process.cwd(), 'uploads');
    const publicBase = (process.env.UPLOAD_PUBLIC_BASE || '/uploads').replace(/\/$/, '');
    const bucket = this.buildUploadBucket(new Date());
    const targetDir = join(uploadDir, 'posts', bucket);

    await mkdir(targetDir, { recursive: true });

    const items = await Promise.all(
      files.map(async (file) => {
        if (!file.mimetype.startsWith('image/')) {
          throw new BadRequestException('仅支持上传图片文件');
        }

        const extension = this.resolveUploadExtension(file.originalname, file.mimetype);
        const filename = `${Date.now()}-${randomUUID()}.${extension}`;
        await writeFile(join(targetDir, filename), file.buffer);

        return {
          url: `${publicBase}/posts/${bucket}/${filename}`,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
        };
      }),
    );

    return { items };
  }

  async getPost(accountId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: this.postInclude(),
    });

    if (!post) {
      throw new NotFoundException('动态不存在');
    }

    return this.serializePost(post, accountId, true);
  }

  async listPostComments(accountId: string, postId: string, page = 1, pageSize = 20) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('动态不存在');
    }

    const skip = Math.max(page - 1, 0) * pageSize;
    const [items, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: {
          postId,
          parentId: null,
        },
        include: {
          author: true,
          replies: {
            include: {
              author: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: pageSize,
      }),
      this.prisma.comment.count({
        where: {
          postId,
          parentId: null,
        },
      }),
    ]);

    return {
      postId,
      page,
      pageSize,
      total,
      viewerId: accountId,
      items: items.map((item) => this.serializeComment(item)),
    };
  }

  async toggleLike(account: Account, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { author: true },
    });

    if (!post) {
      throw new NotFoundException('动态不存在');
    }

    const existing = await this.prisma.like.findUnique({
      where: {
        postId_accountId: {
          postId,
          accountId: account.id,
        },
      },
    });

    let liked = false;
    if (existing) {
      await this.prisma.like.delete({ where: { id: existing.id } });
    } else {
      liked = true;
      await this.prisma.like.create({
        data: {
          postId,
          accountId: account.id,
        },
      });

      if (post.authorId !== account.id) {
        await this.notificationsService.create({
          recipientId: post.authorId,
          actorId: account.id,
          postId: post.id,
          type: NotificationType.LIKE,
          title: `${account.displayName} 点赞了你的动态`,
          content: post.content.slice(0, 60),
        });
      }
    }

    if (post.scope === PostScope.SQUARE) {
      await this.bumpTopicsByText(post.content, { interactionCount: 1, score: 1 });
    }

    return {
      liked,
      postId,
      totalLikes: await this.prisma.like.count({ where: { postId } }),
    };
  }

  async commentPost(account: Account, postId: string, content: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException('动态不存在');
    }

    const comment = await this.prisma.comment.create({
      data: {
        postId,
        authorId: account.id,
        content,
      },
      include: {
        author: true,
        replies: {
          include: { author: true },
        },
      },
    });

    if (post.authorId !== account.id) {
      await this.notificationsService.create({
        recipientId: post.authorId,
        actorId: account.id,
        postId: post.id,
        commentId: comment.id,
        type: NotificationType.COMMENT,
        title: `${account.displayName} 评论了你的动态`,
        content,
      });
    }

    await this.handleContentMentions(postId, account.id, content, comment.id);
    if (post.scope === PostScope.SQUARE) {
      await this.bumpTopicsByText(post.content, { interactionCount: 2, score: 2 });
    }

    return this.serializeComment(comment);
  }

  async replyComment(account: Account, commentId: string, content: string) {
    const parent = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { post: true },
    });

    if (!parent) {
      throw new NotFoundException('评论不存在');
    }

    const reply = await this.prisma.comment.create({
      data: {
        postId: parent.postId,
        authorId: account.id,
        parentId: parent.id,
        content,
      },
      include: {
        author: true,
        replies: {
          include: { author: true },
        },
      },
    });

    if (parent.authorId !== account.id) {
      await this.notificationsService.create({
        recipientId: parent.authorId,
        actorId: account.id,
        postId: parent.postId,
        commentId: reply.id,
        type: NotificationType.COMMENT,
        title: `${account.displayName} 回复了你的评论`,
        content,
      });
    }

    await this.handleContentMentions(parent.postId, account.id, content, reply.id);
    return this.serializeComment(reply);
  }

  async mentionUsers(author: Account, postId: string, accountIds: string[]) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('动态不存在');
    }

    const uniqueIds = [...new Set(accountIds)].filter((id) => id !== author.id);
    await Promise.all(
      uniqueIds.map((accountId) =>
        this.notificationsService.create({
          recipientId: accountId,
          actorId: author.id,
          postId,
          type: NotificationType.MENTION,
          title: `${author.displayName} 在动态中提到了你`,
          content: post.content.slice(0, 80),
        }),
      ),
    );

    return { success: true, mentioned: uniqueIds.length };
  }

  async searchUsers(accountId: string, query: string) {
    const q = query.trim();
    const items = await this.prisma.account.findMany({
      where: q
        ? {
            isActive: true,
            OR: [{ username: { contains: q } }, { displayName: { contains: q } }],
          }
        : { isActive: true },
      include: {
        digitalHuman: true,
      },
      take: 12,
    });

    if (q) {
      await this.bumpTopic(q, { searchCount: 1, score: 1 });
    }

    return {
      items: items.map((account) => this.serializeAccountCard(account)),
      viewerId: accountId,
    };
  }

  async getProfile(viewerId: string, accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: {
        userProfile: true,
        digitalHuman: true,
      },
    });

    if (!account) {
      throw new NotFoundException('用户不存在');
    }

    const [followers, following, friends, posts, follows, friendship, ownedDigitalHumans] = await Promise.all([
      this.prisma.follow.count({ where: { followingId: accountId } }),
      this.prisma.follow.count({ where: { followerId: accountId } }),
      this.prisma.friendship.count({
        where: {
          status: FriendshipStatus.ACCEPTED,
          OR: [{ requesterId: accountId }, { addresseeId: accountId }],
        },
      }),
      this.prisma.post.findMany({
        where: {
          authorId: accountId,
          ...(viewerId === accountId ? {} : { isPublic: true }),
        },
        orderBy: { publishedAt: 'desc' },
        include: this.postInclude(),
        take: 20,
      }),
      this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: accountId,
          },
        },
      }),
      this.prisma.friendship.findFirst({
        where: {
          status: FriendshipStatus.ACCEPTED,
          OR: [
            { requesterId: viewerId, addresseeId: accountId },
            { requesterId: accountId, addresseeId: viewerId },
          ],
        },
      }),
      this.prisma.digitalHuman.findMany({
        where: { ownerAccountId: accountId },
        include: { account: true },
      }),
    ]);

    return {
      profile: {
        id: account.id,
        username: account.username,
        displayName: account.displayName,
        accountType: account.accountType,
        avatarUrl: account.avatarUrl,
        tagline: account.tagline,
        bio: account.userProfile?.bio ?? account.digitalHuman?.personaPrompt ?? '',
        city: account.userProfile?.city ?? null,
        coverImageUrl: account.userProfile?.coverImageUrl ?? account.digitalHuman?.coverImageUrl ?? '/posts/post-3.jpg',
        digitalHuman: account.digitalHuman
          ? {
              slug: account.digitalHuman.slug,
              isPresale: account.digitalHuman.isPresale,
              ownerAccountId: account.digitalHuman.ownerAccountId,
              capabilities: account.digitalHuman.capabilities,
            }
          : null,
      },
      relationship: {
        isSelf: viewerId === accountId,
        isFollowing: Boolean(follows),
        isFriend: Boolean(friendship),
      },
      stats: {
        followers,
        following,
        friends,
        posts: posts.length,
        ownedDigitalHumans: ownedDigitalHumans.length,
      },
      ownedDigitalHumans: ownedDigitalHumans.map((human) => this.serializeAccountCard(human.account)),
      posts: posts.map((post) => this.serializePost(post, viewerId)),
    };
  }

  async toggleFollow(account: Account, targetId: string) {
    if (account.id === targetId) {
      throw new BadRequestException('不能关注自己');
    }

    const target = await this.prisma.account.findUnique({ where: { id: targetId } });
    if (!target) {
      throw new NotFoundException('目标账号不存在');
    }

    const existing = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: account.id,
          followingId: targetId,
        },
      },
    });

    if (existing) {
      await this.prisma.follow.delete({ where: { id: existing.id } });
      return { following: false };
    }

    await this.prisma.follow.create({
      data: {
        followerId: account.id,
        followingId: targetId,
      },
    });

    await this.notificationsService.create({
      recipientId: targetId,
      actorId: account.id,
      type: NotificationType.FOLLOW,
      title: `${account.displayName} 关注了你`,
      content: `${account.displayName} 想看你的最新动态`,
    });

    return { following: true };
  }

  async requestFriend(account: Account, targetId: string) {
    if (account.id === targetId) {
      throw new BadRequestException('不能添加自己为好友');
    }

    const target = await this.prisma.account.findUnique({ where: { id: targetId } });
    if (!target) {
      throw new NotFoundException('目标账号不存在');
    }

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: account.id, addresseeId: targetId },
          { requesterId: targetId, addresseeId: account.id },
        ],
      },
    });

    if (existing) {
      if (existing.status === FriendshipStatus.ACCEPTED) {
        return { success: true, requestId: existing.id, status: existing.status };
      }
      return { success: true, requestId: existing.id, status: existing.status };
    }

    const friendship = await this.prisma.friendship.create({
      data: {
        requesterId: account.id,
        addresseeId: targetId,
      },
    });

    await this.notificationsService.create({
      recipientId: targetId,
      actorId: account.id,
      type: NotificationType.SYSTEM,
      title: `${account.displayName} 申请添加你为好友`,
      content: '可在关系页接受请求。',
      payload: {
        requestId: friendship.id,
      },
    });

    return { success: true, requestId: friendship.id, status: friendship.status };
  }

  async acceptFriend(account: Account, requestId: string) {
    const friendship = await this.prisma.friendship.findUnique({ where: { id: requestId } });
    if (!friendship) {
      throw new NotFoundException('好友请求不存在');
    }

    if (friendship.addresseeId !== account.id) {
      throw new BadRequestException('只能接受发给自己的好友请求');
    }

    const updated = await this.prisma.friendship.update({
      where: { id: requestId },
      data: { status: FriendshipStatus.ACCEPTED },
    });

    await this.notificationsService.create({
      recipientId: updated.requesterId,
      actorId: account.id,
      type: NotificationType.SYSTEM,
      title: `${account.displayName} 已通过你的好友申请`,
      content: '现在你们可以互看朋友圈了。',
      payload: {
        requestId,
      },
    });

    return { success: true, requestId, status: updated.status };
  }

  private async resolveMomentsAuthorIds(accountId: string) {
    const [friendships, follows, owned, friendsOwned] = await Promise.all([
      this.prisma.friendship.findMany({
        where: {
          status: FriendshipStatus.ACCEPTED,
          OR: [{ requesterId: accountId }, { addresseeId: accountId }],
        },
      }),
      this.prisma.follow.findMany({
        where: { followerId: accountId },
      }),
      this.prisma.digitalHuman.findMany({
        where: { ownerAccountId: accountId },
      }),
      this.prisma.digitalHuman.findMany({
        where: {
          ownerAccountId: {
            in: (
              await this.prisma.friendship.findMany({
                where: {
                  status: FriendshipStatus.ACCEPTED,
                  OR: [{ requesterId: accountId }, { addresseeId: accountId }],
                },
              })
            ).map((item) => (item.requesterId === accountId ? item.addresseeId : item.requesterId)),
          },
        },
      }),
    ]);

    const friendIds = friendships.map((item) => (item.requesterId === accountId ? item.addresseeId : item.requesterId));
    const followIds = follows.map((item) => item.followingId);
    const ownedIds = owned.map((item) => item.accountId);
    const friendsOwnedIds = friendsOwned.map((item) => item.accountId);

    return [...new Set([accountId, ...friendIds, ...followIds, ...ownedIds, ...friendsOwnedIds])];
  }

  private async handleContentMentions(postId: string, actorId: string, content: string, commentId?: string) {
    const usernames = [...content.matchAll(/@([a-zA-Z0-9_]+)/g)].map((match) => match[1]);
    if (usernames.length === 0) {
      return;
    }

    const accounts = await this.prisma.account.findMany({
      where: {
        username: { in: [...new Set(usernames)] },
      },
    });

    await Promise.all(
      accounts
        .filter((account) => account.id !== actorId)
        .map((account) =>
          this.notificationsService.create({
            recipientId: account.id,
            actorId,
            postId,
            commentId,
            type: NotificationType.MENTION,
            title: '你被提到了',
            content: content.slice(0, 80),
          }),
        ),
    );
  }

  async bumpTopicsByText(
    text: string,
    increments: { searchCount?: number; interactionCount?: number; postCount?: number; score?: number },
  ) {
    const keywords = [...new Set([...text.matchAll(/#([\p{L}\p{N}_-]+)/gu)].map((item) => item[1]))];
    await Promise.all(keywords.map((keyword) => this.bumpTopic(keyword, increments)));
  }

  async bumpTopic(
    keyword: string,
    increments: { searchCount?: number; interactionCount?: number; postCount?: number; score?: number },
  ) {
    if (!keyword.trim()) {
      return;
    }

    const now = new Date();
    now.setMinutes(0, 0, 0);

    await this.prisma.topicStatHourly.upsert({
      where: {
        hourBucket_keyword: {
          hourBucket: now,
          keyword,
        },
      },
      create: {
        hourBucket: now,
        keyword,
        searchCount: increments.searchCount ?? 0,
        interactionCount: increments.interactionCount ?? 0,
        postCount: increments.postCount ?? 0,
        score: increments.score ?? 0,
      },
      update: {
        searchCount: { increment: increments.searchCount ?? 0 },
        interactionCount: { increment: increments.interactionCount ?? 0 },
        postCount: { increment: increments.postCount ?? 0 },
        score: { increment: increments.score ?? 0 },
      },
    });
  }

  private postInclude() {
    return {
      author: {
        include: {
          digitalHuman: true,
        },
      },
      media: true,
      likes: true,
      comments: {
        where: { parentId: null },
        orderBy: { createdAt: 'asc' as const },
        take: 6,
        include: {
          author: true,
          replies: {
            orderBy: { createdAt: 'asc' as const },
            include: {
              author: true,
            },
          },
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    } satisfies Prisma.PostInclude;
  }

  private serializePost(
    post: Prisma.PostGetPayload<{ include: ReturnType<SocialService['postInclude']> }>,
    viewerId: string,
    fullComments = false,
  ) {
    return {
      id: post.id,
      scope: post.scope,
      source: post.source,
      content: post.content,
      isPublic: post.isPublic,
      publishedAt: post.publishedAt,
      createdAt: post.createdAt,
      author: this.serializeAccountCard(post.author),
      media: post.media.map((item) => ({
        id: item.id,
        url: item.url,
        mediaType: item.mediaType,
      })),
      stats: {
        likes: post._count.likes,
        comments: post._count.comments,
      },
      viewer: {
        liked: post.likes.some((like) => like.accountId === viewerId),
      },
      comments: (fullComments ? post.comments : post.comments.slice(0, 3)).map((comment) => this.serializeComment(comment)),
    };
  }

  private serializeComment(
    comment: Prisma.CommentGetPayload<{
      include: {
        author: true;
        replies: {
          include: {
            author: true;
          };
        };
      };
    }>
      | {
          id: string;
          content: string;
          createdAt: Date;
          author: { id: string; displayName: string; avatarUrl: string | null };
          replies: Array<{
            id: string;
            content: string;
            createdAt: Date;
            author: { id: string; displayName: string; avatarUrl: string | null };
          }>;
        },
  ) {
    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      author: {
        id: comment.author.id,
        displayName: comment.author.displayName,
        avatarUrl: comment.author.avatarUrl,
      },
      replies: comment.replies.map((reply) => ({
        id: reply.id,
        content: reply.content,
        createdAt: reply.createdAt,
        author: {
          id: reply.author.id,
          displayName: reply.author.displayName,
          avatarUrl: reply.author.avatarUrl,
        },
      })),
    };
  }

  private serializeAccountCard(
    account: Pick<Account, 'id' | 'username' | 'displayName' | 'accountType' | 'avatarUrl' | 'tagline'> & {
      digitalHuman?: { isPresale: boolean; slug: string | null } | null;
    },
  ) {
    return {
      id: account.id,
      username: account.username,
      displayName: account.displayName,
      accountType: account.accountType,
      avatarUrl: account.avatarUrl,
      tagline: account.tagline,
      isPresale: account.digitalHuman?.isPresale ?? false,
      badge: account.accountType === AccountType.DIGITAL_HUMAN ? '数字人' : '用户',
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
    if (subtype === 'jpeg') {
      return 'jpg';
    }

    return subtype || 'png';
  }
}
