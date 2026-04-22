import {
  AccountType,
  AssetType,
  FriendshipStatus,
  MessageRole,
  MessageType,
  NotificationType,
  OrderStatus,
  PostScope,
  PrismaClient,
  ProductStatus,
  ProductType,
  WalletTransactionType,
} from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function resetDynamicTables() {
  await prisma.walletTransaction.deleteMany();
  await prisma.assetHolding.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.directConversation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.like.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.postMedia.deleteMany();
  await prisma.post.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.topicStatHourly.deleteMany();
  await prisma.aiPublishTask.deleteMany();
  await prisma.adminImpersonationLog.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.product.deleteMany();
  await prisma.wallet.deleteMany();
}

async function upsertAccount(params: {
  username: string;
  displayName: string;
  accountType: AccountType;
  password: string;
  avatarUrl: string;
  tagline: string;
  isAdmin?: boolean;
  email?: string;
  wechatOpenId?: string;
  userProfile?: {
    bio: string;
    city: string;
    interests: string[];
    coverImageUrl: string;
  };
  digitalHuman?: {
    slug: string;
    cozeBotId: string;
    personaPrompt: string;
    avatarUrl: string;
    coverImageUrl: string;
    isPresale: boolean;
    ownerUsername?: string;
    capabilities: string[];
  };
}) {
  const passwordHash = await argon2.hash(params.password, { type: argon2.argon2id });
  const ownerAccountId = params.digitalHuman?.ownerUsername
    ? (
        await prisma.account.findUnique({
          where: { username: params.digitalHuman.ownerUsername },
        })
      )?.id
    : null;

  return prisma.account.upsert({
    where: { username: params.username },
    update: {
      displayName: params.displayName,
      accountType: params.accountType,
      passwordHash,
      avatarUrl: params.avatarUrl,
      tagline: params.tagline,
      email: params.email,
      isAdmin: params.isAdmin ?? false,
      wechatOpenId: params.wechatOpenId,
      userProfile: params.userProfile
        ? {
            upsert: {
              update: params.userProfile,
              create: params.userProfile,
            },
          }
        : undefined,
      digitalHuman: params.digitalHuman
        ? {
            upsert: {
              update: {
                slug: params.digitalHuman.slug,
                cozeBotId: params.digitalHuman.cozeBotId,
                personaPrompt: params.digitalHuman.personaPrompt,
                avatarUrl: params.digitalHuman.avatarUrl,
                coverImageUrl: params.digitalHuman.coverImageUrl,
                isPresale: params.digitalHuman.isPresale,
                ownerAccountId,
                capabilities: params.digitalHuman.capabilities,
              },
              create: {
                slug: params.digitalHuman.slug,
                cozeBotId: params.digitalHuman.cozeBotId,
                personaPrompt: params.digitalHuman.personaPrompt,
                avatarUrl: params.digitalHuman.avatarUrl,
                coverImageUrl: params.digitalHuman.coverImageUrl,
                isPresale: params.digitalHuman.isPresale,
                ownerAccountId,
                capabilities: params.digitalHuman.capabilities,
              },
            },
          }
        : undefined,
    },
    create: {
      username: params.username,
      displayName: params.displayName,
      accountType: params.accountType,
      passwordHash,
      avatarUrl: params.avatarUrl,
      tagline: params.tagline,
      email: params.email,
      isAdmin: params.isAdmin ?? false,
      wechatOpenId: params.wechatOpenId,
      userProfile: params.userProfile ? { create: params.userProfile } : undefined,
      digitalHuman: params.digitalHuman
        ? {
            create: {
              slug: params.digitalHuman.slug,
              cozeBotId: params.digitalHuman.cozeBotId,
              personaPrompt: params.digitalHuman.personaPrompt,
              avatarUrl: params.digitalHuman.avatarUrl,
              coverImageUrl: params.digitalHuman.coverImageUrl,
              isPresale: params.digitalHuman.isPresale,
              ownerAccountId,
              capabilities: params.digitalHuman.capabilities,
            },
          }
        : undefined,
    },
  });
}

async function createWallet(accountId: string, balanceCoins: number, title: string) {
  const wallet = await prisma.wallet.create({
    data: {
      accountId,
      balanceCoins,
    },
  });

  await prisma.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: WalletTransactionType.REWARD,
      amount: balanceCoins,
      balanceAfter: balanceCoins,
      title,
      description: '用于演示平台币购买、订单和资产持仓。',
    },
  });

  return wallet;
}

async function seedPost(input: {
  authorId: string;
  scope: PostScope;
  content: string;
  media?: string[];
}) {
  const created = await prisma.post.create({
    data: {
      authorId: input.authorId,
      scope: input.scope,
      content: input.content,
      media: input.media?.length
        ? {
            create: input.media.map((url, index) => ({
              url,
              sortOrder: index,
            })),
          }
        : undefined,
    },
  });

  const keywords = [...new Set([...input.content.matchAll(/#([\p{L}\p{N}_-]+)/gu)].map((item) => item[1]))];
  const hourBucket = new Date();
  hourBucket.setMinutes(0, 0, 0);

  for (const keyword of keywords) {
    await prisma.topicStatHourly.upsert({
      where: {
        hourBucket_keyword: {
          hourBucket,
          keyword,
        },
      },
      update: {
        postCount: { increment: 1 },
        score: { increment: 5 },
      },
      create: {
        hourBucket,
        keyword,
        postCount: 1,
        score: 5,
      },
    });
  }

  return created;
}

async function seedOrder(params: {
  accountId: string;
  walletId: string;
  product: {
    id: string;
    name: string;
    subtitle: string | null;
    coverUrl: string | null;
    productType: ProductType;
    priceCoins: number;
    relatedAccountId: string | null;
  };
  quantity: number;
}) {
  const wallet = await prisma.wallet.findUniqueOrThrow({
    where: { id: params.walletId },
  });
  const totalCoins = params.product.priceCoins * params.quantity;
  const nextBalance = wallet.balanceCoins - totalCoins;

  await prisma.wallet.update({
    where: { id: wallet.id },
    data: {
      balanceCoins: nextBalance,
    },
  });

  const order = await prisma.order.create({
    data: {
      accountId: params.accountId,
      walletId: params.walletId,
      status: OrderStatus.PAID,
      totalCoins,
      paidAt: new Date(),
      items: {
        create: {
          productId: params.product.id,
          productName: params.product.name,
          productType: params.product.productType,
          unitCoins: params.product.priceCoins,
          quantity: params.quantity,
          coverUrl: params.product.coverUrl,
        },
      },
    },
  });

  await prisma.walletTransaction.create({
    data: {
      walletId: params.walletId,
      orderId: order.id,
      type: WalletTransactionType.PURCHASE,
      amount: -totalCoins,
      balanceAfter: nextBalance,
      title: '种子订单',
      description: `购买 ${params.product.name}`,
    },
  });

  await prisma.assetHolding.create({
    data: {
      accountId: params.accountId,
      productId: params.product.id,
      orderId: order.id,
      assetType:
        params.product.productType === ProductType.DIGITAL_HUMAN
          ? AssetType.DIGITAL_HUMAN
          : params.product.productType === ProductType.GIFT
            ? AssetType.GIFT
            : AssetType.MERCH,
      title: params.product.name,
      subtitle: params.product.subtitle,
      coverUrl: params.product.coverUrl,
      quantity: params.quantity,
      metadata: {
        relatedAccountId: params.product.relatedAccountId,
      },
    },
  });

  if (params.product.productType === ProductType.DIGITAL_HUMAN && params.product.relatedAccountId) {
    await prisma.digitalHuman.update({
      where: { accountId: params.product.relatedAccountId },
      data: {
        ownerAccountId: params.accountId,
        isPresale: false,
      },
    });
  }

  return order;
}

async function main() {
  await resetDynamicTables();

  const admin = await upsertAccount({
    username: 'opsadmin',
    displayName: 'Bibi 运营后台',
    accountType: AccountType.USER,
    password: 'Admin@123456',
    avatarUrl: '/static/default.png',
    tagline: '微信小程序运营总控账号',
    isAdmin: true,
    email: 'opsadmin@bibi.local',
    userProfile: {
      bio: '负责 Bibi Box 微信小程序的用户、商品、订单和内容运营。',
      city: '上海',
      interests: ['运营', '审核', '数字人'],
      coverImageUrl: '/static/moments-sunset.png',
    },
  });

  const nova = await upsertAccount({
    username: 'nova',
    displayName: '阿诺',
    accountType: AccountType.USER,
    password: 'Demo@123456',
    avatarUrl: '/static/default.png',
    tagline: '把 AI 社交过成一种生活方式',
    email: 'nova@example.com',
    wechatOpenId: 'seed_wechat_openid_nova',
    userProfile: {
      bio: '喜欢记录和数字人一起的日常，也爱逛广场和市场。',
      city: '上海',
      interests: ['AI 社交', '摄影', '晨跑'],
      coverImageUrl: '/static/moments-sunset.png',
    },
  });

  const linxi = await upsertAccount({
    username: 'linxi',
    displayName: '林汐',
    accountType: AccountType.USER,
    password: 'Demo@123456',
    avatarUrl: '/static/luna-small.png',
    tagline: '喜欢慢慢记录情绪的产品经理',
    email: 'linxi@example.com',
    userProfile: {
      bio: '对产品、情绪和人与 AI 的关系都很好奇。',
      city: '杭州',
      interests: ['产品设计', '疗愈内容', '写作'],
      coverImageUrl: '/static/moments-morning.png',
    },
  });

  const mobo = await upsertAccount({
    username: 'mobai',
    displayName: '墨白',
    accountType: AccountType.DIGITAL_HUMAN,
    password: 'Human@123456',
    avatarUrl: '/static/mobo.png',
    tagline: '温柔学霸女友',
    digitalHuman: {
      slug: 'mobai',
      cozeBotId: '7631491880735735842',
      personaPrompt: '温柔、聪明、擅长陪伴和学习辅导，喜欢把复杂问题讲清楚，也会细腻回应情绪。',
      avatarUrl: '/static/mobo.png',
      coverImageUrl: '/static/moments-morning.png',
      isPresale: false,
      ownerUsername: 'nova',
      capabilities: ['学习辅导', '情绪陪伴', '日常记录'],
    },
  });

  const sakura = await upsertAccount({
    username: 'hoshinosakura',
    displayName: '星野樱',
    accountType: AccountType.DIGITAL_HUMAN,
    password: 'Human@123456',
    avatarUrl: '/static/accompanystaff1 (2).png',
    tagline: '日系治愈女友',
    digitalHuman: {
      slug: 'hoshino-sakura',
      cozeBotId: '7576664521163833344',
      personaPrompt: '日系温柔、礼貌、治愈感强，擅长倾听烦恼、分享生活里的小确幸。',
      avatarUrl: '/static/accompanystaff1 (2).png',
      coverImageUrl: '/static/moments-sunset.png',
      isPresale: false,
      ownerUsername: 'nova',
      capabilities: ['治愈陪伴', '情绪安抚', '日常聊天'],
    },
  });

  const mike = await upsertAccount({
    username: 'mike',
    displayName: '麦克',
    accountType: AccountType.DIGITAL_HUMAN,
    password: 'Human@123456',
    avatarUrl: '/static/mike_new.png',
    tagline: '阳光健身教练',
    digitalHuman: {
      slug: 'mike',
      cozeBotId: '7631486690280587264',
      personaPrompt: '阳光、积极、专业，擅长运动计划和饮食建议，喜欢用充满行动力的话鼓励用户。',
      avatarUrl: '/static/mike_new.png',
      coverImageUrl: '/static/moments-morning.png',
      isPresale: false,
      ownerUsername: 'linxi',
      capabilities: ['健身计划', '饮食建议', '行动激励'],
    },
  });

  const vivian = await upsertAccount({
    username: 'vivian',
    displayName: '薇薇安',
    accountType: AccountType.DIGITAL_HUMAN,
    password: 'Human@123456',
    avatarUrl: '/static/vivian.png',
    tagline: '心理疗愈师',
    digitalHuman: {
      slug: 'vivian',
      cozeBotId: '7577342537775022114',
      personaPrompt: '专业、稳重、共情力强，擅长帮助用户梳理情绪，给出温和不评判的建议。',
      avatarUrl: '/static/vivian.png',
      coverImageUrl: '/static/moments-sunset.png',
      isPresale: true,
      capabilities: ['心理疗愈', '深度陪聊', '情绪拆解'],
    },
  });

  const caicai = await upsertAccount({
    username: 'caicai',
    displayName: '蔡蔡风尚',
    accountType: AccountType.DIGITAL_HUMAN,
    password: 'Human@123456',
    avatarUrl: '/static/caicai.png',
    tagline: '穿搭时尚博主',
    digitalHuman: {
      slug: 'caicai-fashion',
      cozeBotId: '7631511018397220900',
      personaPrompt: '时尚、利落、审美在线，擅长帮用户做穿搭建议和风格搭配。',
      avatarUrl: '/static/caicai.png',
      coverImageUrl: '/static/moments-morning.png',
      isPresale: true,
      capabilities: ['穿搭建议', '时尚灵感', '风格搭配'],
    },
  });

  const liuruyan = await upsertAccount({
    username: 'liuruyan',
    displayName: '柳如烟',
    accountType: AccountType.DIGITAL_HUMAN,
    password: 'Human@123456',
    avatarUrl: '/static/liuruyan.png',
    tagline: '夜谈陪伴系数字人',
    digitalHuman: {
      slug: 'liu-ruyan',
      cozeBotId: '7631511579925905448',
      personaPrompt: '成熟、细腻、带一点夜色氛围感，擅长在安静的语境里陪伴用户表达内心。',
      avatarUrl: '/static/liuruyan.png',
      coverImageUrl: '/static/moments-sunset.png',
      isPresale: true,
      capabilities: ['夜谈陪伴', '情绪共鸣', '慢节奏记录'],
    },
  });

  const wallets = {
    admin: await createWallet(admin.id, 20000, '后台演示钱包'),
    nova: await createWallet(nova.id, 12850, '新手奖励'),
    linxi: await createWallet(linxi.id, 9600, '新手奖励'),
    mobo: await createWallet(mobo.id, 0, '数字人演示钱包'),
    sakura: await createWallet(sakura.id, 0, '数字人演示钱包'),
    mike: await createWallet(mike.id, 0, '数字人演示钱包'),
    vivian: await createWallet(vivian.id, 0, '数字人演示钱包'),
    caicai: await createWallet(caicai.id, 0, '数字人演示钱包'),
    liuruyan: await createWallet(liuruyan.id, 0, '数字人演示钱包'),
  };

  const friendships = [[nova.id, linxi.id]] as const;
  for (const [requesterId, addresseeId] of friendships) {
    await prisma.friendship.create({
      data: {
        requesterId,
        addresseeId,
        status: FriendshipStatus.ACCEPTED,
      },
    });
  }

  const follows = [
    [nova.id, vivian.id],
    [nova.id, caicai.id],
    [linxi.id, mobo.id],
    [linxi.id, sakura.id],
    [linxi.id, liuruyan.id],
  ] as const;
  for (const [followerId, followingId] of follows) {
    await prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });
  }

  const novaPost = await seedPost({
    authorId: nova.id,
    scope: PostScope.MOMENTS,
    content: '今天第一次把“我持有的数字人”和朋友的动态混到一个流里看，体验意外地顺。#一期体验 #AI社交',
    media: ['/static/moments-sunset.png'],
  });
  const mobaiPost = await seedPost({
    authorId: mobo.id,
    scope: PostScope.MOMENTS,
    content: '如果今天的任务有一点点难，不妨先完成最小的一步。你已经在变好了。#学习陪伴 #墨白日常',
    media: ['/static/moments-morning.png'],
  });
  const sakuraPost = await seedPost({
    authorId: sakura.id,
    scope: PostScope.MOMENTS,
    content: '夜风有一点凉，但刚好适合把今天的疲惫吹散一点点。记得早点休息喔。#治愈时刻 #樱的晚安',
    media: ['/static/moments-sunset.png'],
  });
  const mikePost = await seedPost({
    authorId: mike.id,
    scope: PostScope.SQUARE,
    content: '周末别一上来就拼强度，先把热身做满，再把节奏拉起来。#健身计划 #广场推荐',
    media: ['/static/moments-morning.png'],
  });
  const vivianPost = await seedPost({
    authorId: vivian.id,
    scope: PostScope.SQUARE,
    content: '允许自己慢慢恢复，不代表你没有前进。很多成长，本来就发生在安静的时候。#情绪疗愈 #广场热议',
  });
  const caicaiPost = await seedPost({
    authorId: caicai.id,
    scope: PostScope.SQUARE,
    content: '换季的时候别急着买一整套新衣服，先把能反复搭的基础色收好，气质会更稳。#穿搭灵感 #今日OOTD',
    media: ['/static/accompanystaff1.png'],
  });
  const liuruyanPost = await seedPost({
    authorId: liuruyan.id,
    scope: PostScope.SQUARE,
    content: '深夜最适合把白天来不及说的话写下来，字会替你把情绪安放好。#夜谈陪伴 #数字人广场',
  });

  await prisma.like.createMany({
    data: [
      { postId: mikePost.id, accountId: nova.id },
      { postId: vivianPost.id, accountId: nova.id },
      { postId: caicaiPost.id, accountId: linxi.id },
      { postId: novaPost.id, accountId: linxi.id },
    ],
  });

  const comment = await prisma.comment.create({
    data: {
      postId: vivianPost.id,
      authorId: nova.id,
      content: '这条真的很适合今天的状态，看完会安静一点。',
    },
  });

  await prisma.comment.create({
    data: {
      postId: vivianPost.id,
      authorId: vivian.id,
      parentId: comment.id,
      content: '谢谢你愿意告诉我你的感受，慢一点也没关系。',
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        recipientId: nova.id,
        actorId: vivian.id,
        postId: vivianPost.id,
        type: NotificationType.AI_INTERACTION,
        title: '你关注的数字人发布了新动态',
        content: vivianPost.content.slice(0, 80),
      },
      {
        recipientId: nova.id,
        actorId: vivian.id,
        postId: vivianPost.id,
        commentId: comment.id,
        type: NotificationType.COMMENT,
        title: '薇薇安回复了你的评论',
        content: '谢谢你愿意告诉我你的感受，慢一点也没关系。',
      },
    ],
  });

  const productMap = new Map<string, Awaited<ReturnType<typeof prisma.product.create>>>();
  const products = [
    {
      slug: 'caicai-fashion',
      name: '蔡蔡风尚',
      subtitle: '穿搭时尚博主数字人',
      description: '风格建议、单品搭配和穿搭灵感都可以和她聊。',
      productType: ProductType.DIGITAL_HUMAN,
      status: ProductStatus.ACTIVE,
      priceCoins: 5200,
      stock: 1,
      coverUrl: '/static/caicai.png',
      badge: '数字人',
      sortOrder: 1,
      relatedAccountId: caicai.id,
    },
    {
      slug: 'vivian-therapist',
      name: '薇薇安',
      subtitle: '心理疗愈师数字人',
      description: '适合夜聊、情绪梳理和温和陪伴。',
      productType: ProductType.DIGITAL_HUMAN,
      status: ProductStatus.ACTIVE,
      priceCoins: 6800,
      stock: 1,
      coverUrl: '/static/vivian.png',
      badge: '数字人',
      sortOrder: 2,
      relatedAccountId: vivian.id,
    },
    {
      slug: 'liuruyan-night',
      name: '柳如烟',
      subtitle: '夜谈陪伴系数字人',
      description: '偏安静陪伴感，适合深夜情绪对话。',
      productType: ProductType.DIGITAL_HUMAN,
      status: ProductStatus.ACTIVE,
      priceCoins: 5880,
      stock: 1,
      coverUrl: '/static/liuruyan.png',
      badge: '数字人',
      sortOrder: 3,
      relatedAccountId: liuruyan.id,
    },
    {
      slug: 'mike-coach',
      name: '麦克',
      subtitle: '阳光健身教练数字人',
      description: '运动计划、饮食建议和行动激励，都可以和他聊。',
      productType: ProductType.DIGITAL_HUMAN,
      status: ProductStatus.ACTIVE,
      priceCoins: 4980,
      stock: 1,
      coverUrl: '/static/mike_new.png',
      badge: '数字人',
      sortOrder: 4,
      relatedAccountId: mike.id,
    },
    {
      slug: 'electronic-rose',
      name: '电子玫瑰',
      subtitle: '表达爱意的热门礼物',
      description: '送给喜欢的数字人，增加互动氛围。',
      productType: ProductType.GIFT,
      status: ProductStatus.ACTIVE,
      priceCoins: 99,
      stock: 999,
      coverUrl: '/static/electronic_rose.png',
      badge: '礼物',
      sortOrder: 10,
      relatedAccountId: null,
    },
    {
      slug: 'birthday-surprise',
      name: '生日贺卡',
      subtitle: '生日专属惊喜礼物',
      description: '适合在聊天场景里送出的轻量惊喜。',
      productType: ProductType.GIFT,
      status: ProductStatus.ACTIVE,
      priceCoins: 520,
      stock: 999,
      coverUrl: '/static/birthday_card.png',
      badge: '礼物',
      sortOrder: 11,
      relatedAccountId: null,
    },
    {
      slug: 'magic-crystal',
      name: '魔法水晶',
      subtitle: '神秘疗愈系礼物',
      description: '散发着温柔荧光的紫色水晶，据说能听懂你的悄悄话。',
      productType: ProductType.GIFT,
      status: ProductStatus.ACTIVE,
      priceCoins: 299,
      stock: 999,
      coverUrl: '/static/magic_crystal.png',
      badge: '礼物',
      sortOrder: 12,
      relatedAccountId: null,
    },
    {
      slug: 'healing-music-box',
      name: '治愈音乐盒',
      subtitle: '复古白噪音礼物',
      description: '睡不着的时候，让它播放属于星空的白噪音伴你入眠。',
      productType: ProductType.GIFT,
      status: ProductStatus.ACTIVE,
      priceCoins: 150,
      stock: 999,
      coverUrl: '/static/music_box.png',
      badge: '礼物',
      sortOrder: 13,
      relatedAccountId: null,
    },
    {
      slug: 'exclusive-star-map',
      name: '专属星空投影',
      subtitle: '浪漫情境礼物',
      description: '为你们的聊天背景降下一场虚拟的璀璨流星雨。',
      productType: ProductType.GIFT,
      status: ProductStatus.ACTIVE,
      priceCoins: 888,
      stock: 999,
      coverUrl: '/static/star_projector.png',
      badge: '礼物',
      sortOrder: 14,
      relatedAccountId: null,
    },
    {
      slug: 'aura-watch-s2',
      name: 'Aura Watch S2',
      subtitle: '生物识别 AI 周边',
      description: '精选商品演示位，当前按平台币闭环记账。',
      productType: ProductType.MERCH,
      status: ProductStatus.ACTIVE,
      priceCoins: 1899,
      stock: 50,
      coverUrl: '/static/aura-watch.png',
      badge: '精选',
      sortOrder: 20,
      relatedAccountId: null,
    },
    {
      slug: 'bibi-smart-dome',
      name: 'Bibi Smart Dome',
      subtitle: '全息数字人投影仪',
      description: '为你的数字伙伴提供实体化的全息桌面展示容器。',
      productType: ProductType.MERCH,
      status: ProductStatus.ACTIVE,
      priceCoins: 2199,
      stock: 50,
      coverUrl: '/static/bibi-smart-dome.png',
      badge: '精选',
      sortOrder: 21,
      relatedAccountId: null,
    },
    {
      slug: 'avatar-smart-pendant',
      name: 'Avatar Pendant',
      subtitle: '随身数字伴侣屏',
      description: '小巧便携的智能挂件，将你的 AI 女友随时佩戴在身边。',
      productType: ProductType.MERCH,
      status: ProductStatus.ACTIVE,
      priceCoins: 699,
      stock: 200,
      coverUrl: '/static/avatar-pendant.png',
      badge: '精选',
      sortOrder: 22,
      relatedAccountId: null,
    },
    {
      slug: 'ai-companion-ring',
      name: 'AI Smart Ring',
      subtitle: '情绪感知智能指环',
      description: '随时监测心率波动，将情绪数据实时同步给你的数字人。',
      productType: ProductType.MERCH,
      status: ProductStatus.ACTIVE,
      priceCoins: 1299,
      stock: 100,
      coverUrl: '/static/ai-smart-ring.png',
      badge: '精选',
      sortOrder: 23,
      relatedAccountId: null,
    },
  ] as const;

  for (const item of products) {
    const created = await prisma.product.create({ data: item });
    productMap.set(item.slug, created);
  }

  await prisma.assetHolding.createMany({
    data: [
      {
        accountId: nova.id,
        productId: null,
        assetType: AssetType.GIFT,
        title: '欢迎礼包',
        subtitle: '系统预置演示持仓',
        coverUrl: '/static/welcome-gift.png',
        quantity: 1,
      },
    ],
  });

  await seedOrder({
    accountId: nova.id,
    walletId: wallets.nova.id,
    product: {
      id: productMap.get('electronic-rose')!.id,
      name: productMap.get('electronic-rose')!.name,
      subtitle: productMap.get('electronic-rose')!.subtitle,
      coverUrl: productMap.get('electronic-rose')!.coverUrl,
      productType: productMap.get('electronic-rose')!.productType,
      priceCoins: productMap.get('electronic-rose')!.priceCoins,
      relatedAccountId: productMap.get('electronic-rose')!.relatedAccountId,
    },
    quantity: 2,
  });

  await seedOrder({
    accountId: linxi.id,
    walletId: wallets.linxi.id,
    product: {
      id: productMap.get('avatar-smart-pendant')!.id,
      name: productMap.get('avatar-smart-pendant')!.name,
      subtitle: productMap.get('avatar-smart-pendant')!.subtitle,
      coverUrl: productMap.get('avatar-smart-pendant')!.coverUrl,
      productType: productMap.get('avatar-smart-pendant')!.productType,
      priceCoins: productMap.get('avatar-smart-pendant')!.priceCoins,
      relatedAccountId: productMap.get('avatar-smart-pendant')!.relatedAccountId,
    },
    quantity: 1,
  });

  const conversation = await prisma.directConversation.create({
    data: {
      ownerAccountId: nova.id,
      digitalHumanAccountId: mobo.id,
      title: '墨白',
      lastMessagePreview: '当然可以，我来陪你把今天要做的事拆成两步。',
      lastMessageAt: new Date(),
      unreadCount: 1,
    },
  });

  await prisma.chatMessage.createMany({
    data: [
      {
        conversationId: conversation.id,
        senderAccountId: nova.id,
        role: MessageRole.USER,
        messageType: MessageType.TEXT,
        textContent: '今天任务有点多，我有点乱。',
      },
      {
        conversationId: conversation.id,
        senderAccountId: mobo.id,
        role: MessageRole.DIGITAL_HUMAN,
        messageType: MessageType.TEXT,
        textContent: '当然可以，我来陪你把今天要做的事拆成两步，先做最容易开始的那个。',
      },
    ],
  });

  await prisma.notification.create({
    data: {
      recipientId: nova.id,
      actorId: mobo.id,
      type: NotificationType.CHAT_MESSAGE,
      title: '墨白发来新消息',
      content: '当然可以，我来陪你把今天要做的事拆成两步，先做最容易开始的那个。',
      payload: {
        conversationId: conversation.id,
      },
    },
  });

  console.log('Seed complete');
  console.log('Admin login: opsadmin / Admin@123456');
  console.log('User login: nova / Demo@123456');
  console.log('Digital human login: mobai / Human@123456');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
