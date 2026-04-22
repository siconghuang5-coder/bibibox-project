import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccountType, Prisma, WalletTransactionType } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_AVATAR_URL = '/static/default.png';
const DEFAULT_COVER_URL = '/static/moments-sunset.png';
const DEFAULT_TAGLINE = '刚加入 Bibi Box 微信小程序';
const DEFAULT_CITY = '上海';
const DEFAULT_WALLET_BALANCE = 12850;

export interface RegisterPayload {
  username: string;
  displayName: string;
  password: string;
  email?: string;
  accountType?: AccountType;
}

export interface LoginPayload {
  identifier: string;
  password: string;
  accountType: AccountType;
}

interface WechatLoginOptions {
  compatMode?: boolean;
}

interface WechatCodeSession {
  openid: string;
  unionid?: string;
  sessionKey?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async register(payload: RegisterPayload) {
    if (payload.accountType && payload.accountType !== AccountType.USER) {
      throw new BadRequestException('小程序公开注册仅支持普通用户账号');
    }

    const existing = await this.prisma.account.findFirst({
      where: {
        OR: [{ username: payload.username }, payload.email ? { email: payload.email } : undefined].filter(
          Boolean,
        ) as Prisma.AccountWhereInput[],
      },
    });

    if (existing) {
      throw new BadRequestException('用户名或邮箱已存在');
    }

    const passwordHash = await argon2.hash(payload.password, { type: argon2.argon2id });

    const account = await this.prisma.account.create({
      data: {
        username: payload.username,
        displayName: payload.displayName,
        email: payload.email,
        passwordHash,
        accountType: AccountType.USER,
        avatarUrl: DEFAULT_AVATAR_URL,
        tagline: DEFAULT_TAGLINE,
        userProfile: {
          create: this.buildDefaultUserProfile(payload.displayName),
        },
        wallet: {
          create: this.buildDefaultWalletData('注册奖励'),
        },
      },
    });

    return this.createSession(account.id);
  }

  async login(payload: LoginPayload) {
    const account = await this.prisma.account.findFirst({
      where: {
        accountType: payload.accountType,
        OR: [{ username: payload.identifier }, { email: payload.identifier }],
      },
    });

    if (!account) {
      throw new UnauthorizedException('账号或密码错误');
    }

    if (!account.isActive) {
      throw new ForbiddenException('账号已被禁用');
    }

    const matched = await argon2.verify(account.passwordHash, payload.password);
    if (!matched) {
      throw new UnauthorizedException('账号或密码错误');
    }

    return this.createSession(account.id);
  }

  async loginWithWeChat(code: string, options: WechatLoginOptions = {}) {
    const sessionData = await this.exchangeWeChatCode(code);

    let account = await this.prisma.account.findFirst({
      where: {
        OR: [{ wechatOpenId: sessionData.openid }, sessionData.unionid ? { wechatUnionId: sessionData.unionid } : undefined].filter(
          Boolean,
        ) as Prisma.AccountWhereInput[],
      },
    });

    let isFirstLogin = false;

    if (!account) {
      isFirstLogin = true;
      account = await this.createWechatAccount(sessionData);
    } else {
      if (!account.isActive) {
        throw new ForbiddenException('账号已被禁用');
      }

      const nextWechatUnionId = sessionData.unionid ?? account.wechatUnionId ?? null;
      if (account.wechatOpenId !== sessionData.openid || account.wechatUnionId !== nextWechatUnionId) {
        account = await this.prisma.account.update({
          where: { id: account.id },
          data: {
            wechatOpenId: sessionData.openid,
            wechatUnionId: nextWechatUnionId,
          },
        });
      }
    }

    const response = await this.createSession(account.id);

    return {
      openid: sessionData.openid,
      unionid: sessionData.unionid ?? null,
      isFirstLogin,
      compatMode: Boolean(options.compatMode),
      ...response,
    };
  }

  async logout(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.authSession.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
    return { success: true };
  }

  async getMe(accountId: string) {
    await this.ensureWallet(accountId);

    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: {
        userProfile: true,
        digitalHuman: true,
        wallet: true,
      },
    });

    if (!account) {
      throw new NotFoundException('账号不存在');
    }

    const [followers, following, friends, posts, unreadCount, assetsCount, ordersCount, ownedDigitalHumans] =
      await Promise.all([
        this.prisma.follow.count({ where: { followingId: accountId } }),
        this.prisma.follow.count({ where: { followerId: accountId } }),
        this.prisma.friendship.count({
          where: {
            status: 'ACCEPTED',
            OR: [{ requesterId: accountId }, { addresseeId: accountId }],
          },
        }),
        this.prisma.post.count({ where: { authorId: accountId } }),
        this.prisma.notification.count({ where: { recipientId: accountId, readAt: null } }),
        this.prisma.assetHolding.count({ where: { accountId } }),
        this.prisma.order.count({ where: { accountId } }),
        account.accountType === AccountType.USER
          ? this.prisma.digitalHuman.findMany({
              where: { ownerAccountId: accountId },
              include: {
                account: true,
              },
            })
          : Promise.resolve([]),
      ]);

    return {
      account: {
        id: account.id,
        username: account.username,
        displayName: account.displayName,
        accountType: account.accountType,
        avatarUrl: account.avatarUrl,
        tagline: account.tagline,
        isAdmin: account.isAdmin,
        bio: account.userProfile?.bio ?? account.digitalHuman?.personaPrompt ?? '',
        wechatBound: Boolean(account.wechatOpenId),
      },
      stats: {
        followers,
        following,
        friends,
        posts,
        unreadCount,
      },
      wallet: {
        balanceCoins: account.wallet?.balanceCoins ?? 0,
      },
      assetsSummary: {
        holdings: assetsCount,
        orders: ordersCount,
      },
      ownedDigitalHumans,
    };
  }

  async validateToken(rawToken: string) {
    if (!rawToken) {
      return null;
    }

    const tokenHash = this.hashToken(rawToken);
    const session = await this.prisma.authSession.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        account: true,
      },
    });

    if (!session) {
      return null;
    }

    await this.ensureWallet(session.accountId);

    await this.prisma.authSession.updateMany({
      where: {
        id: session.id,
        revokedAt: null,
      },
      data: { lastSeenAt: new Date() },
    });

    return session;
  }

  async ensureWallet(accountId: string) {
    return this.prisma.wallet.upsert({
      where: { accountId },
      update: {},
      create: {
        accountId,
        ...this.buildDefaultWalletData('系统补建钱包'),
      },
    });
  }

  private async createSession(accountId: string) {
    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const ttlDays = Number(this.configService.get('SESSION_TTL_DAYS') ?? 14);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await this.prisma.authSession.create({
      data: {
        accountId,
        tokenHash,
        expiresAt,
      },
    });

    const me = await this.getMe(accountId);

    return {
      token,
      expiresAt,
      ...me,
    };
  }

  private async createWechatAccount(sessionData: WechatCodeSession) {
    const username = await this.generateWechatUsername(sessionData.openid);
    const displayName = `微信用户${sessionData.openid.slice(-4)}`;
    const passwordHash = await argon2.hash(randomBytes(24).toString('hex'), { type: argon2.argon2id });

    return this.prisma.account.create({
      data: {
        username,
        displayName,
        accountType: AccountType.USER,
        passwordHash,
        avatarUrl: DEFAULT_AVATAR_URL,
        tagline: '从微信小程序加入 Bibi Box',
        wechatOpenId: sessionData.openid,
        wechatUnionId: sessionData.unionid ?? null,
        userProfile: {
          create: this.buildDefaultUserProfile(displayName),
        },
        wallet: {
          create: this.buildDefaultWalletData('微信登录新手奖励'),
        },
      },
    });
  }

  private async exchangeWeChatCode(code: string) {
    const appId = this.configService.get<string>('WECHAT_MINI_APPID');
    const appSecret =
      this.configService.get<string>('WECHAT_MINI_APPSECRET') ?? this.configService.get<string>('WECHAT_MINI_SECRET');

    if (!appId || !appSecret) {
      throw new InternalServerErrorException('服务端未配置 WECHAT_MINI_APPID 或 WECHAT_MINI_SECRET');
    }

    const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
    url.searchParams.set('appid', appId);
    url.searchParams.set('secret', appSecret);
    url.searchParams.set('js_code', code);
    url.searchParams.set('grant_type', 'authorization_code');

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new BadRequestException(`微信登录请求失败（HTTP ${response.status}）`);
    }

    const data = (await response.json()) as Record<string, any>;
    if (data.errcode) {
      throw new BadRequestException(data.errmsg || `微信登录失败（${data.errcode}）`);
    }

    if (!data.openid || typeof data.openid !== 'string') {
      throw new InternalServerErrorException('微信登录结果缺少 openid');
    }

    return {
      openid: data.openid,
      unionid: typeof data.unionid === 'string' ? data.unionid : undefined,
      sessionKey: typeof data.session_key === 'string' ? data.session_key : undefined,
    } satisfies WechatCodeSession;
  }

  private async generateWechatUsername(openid: string) {
    const suffix = openid.slice(-8).toLowerCase();
    const base = `wx_${suffix}`;
    const existing = await this.prisma.account.findUnique({ where: { username: base } });
    if (!existing) {
      return base;
    }

    let next = '';
    do {
      next = `${base}_${randomBytes(2).toString('hex')}`;
    } while (await this.prisma.account.findUnique({ where: { username: next } }));
    return next;
  }

  private buildDefaultUserProfile(displayName: string) {
    return {
      bio: `${displayName}，欢迎来到 Bibi Box 微信小程序，一起探索数字人社交与互动内容。`,
      city: DEFAULT_CITY,
      interests: ['AI 社交', '数字人', '小程序互动'],
      coverImageUrl: DEFAULT_COVER_URL,
    };
  }

  private buildDefaultWalletData(title: string) {
    return {
      balanceCoins: DEFAULT_WALLET_BALANCE,
      transactions: {
        create: {
          type: WalletTransactionType.REWARD,
          amount: DEFAULT_WALLET_BALANCE,
          balanceAfter: DEFAULT_WALLET_BALANCE,
          title,
          description: '平台初始发放，可用于购买数字人、礼物和精选商品。',
        },
      },
    };
  }

  private hashToken(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
