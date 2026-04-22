export interface AdminOverview {
  metrics: {
    accounts: number;
    users: number;
    digitalHumans: number;
    posts: number;
    unreadNotifications: number;
    scheduledTasks: number;
    products: number;
    orders: number;
    conversations: number;
  };
  hotTopics: Array<{
    id: string;
    keyword: string;
    score: number;
    pinned: boolean;
    interactionCount: number;
  }>;
}

export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  accountType: 'USER' | 'DIGITAL_HUMAN';
  avatarUrl: string | null;
  tagline: string | null;
  isAdmin: boolean;
  isActive: boolean;
  ownerAccountId: string | null;
  isPresale: boolean;
  cozeBotId: string | null;
  stats: {
    followers: number;
    posts: number;
  };
}

export interface AdminPost {
  id: string;
  content: string;
  scope: 'MOMENTS' | 'SQUARE';
  source: 'MANUAL' | 'AI' | 'ADMIN_IMPERSONATED';
  isPublic: boolean;
  publishedAt: string;
  author: {
    id: string;
    displayName: string;
    accountType: 'USER' | 'DIGITAL_HUMAN';
  };
  stats: {
    likes: number;
    comments: number;
  };
  media: Array<{
    id: string;
    url: string;
  }>;
}

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  content: string | null;
  readAt: string | null;
  createdAt: string;
  actor: {
    id: string;
    displayName: string;
  } | null;
  recipient: {
    id: string;
    displayName: string;
  };
  post: {
    id: string;
    excerpt: string;
  } | null;
}

export interface DraftResponse {
  topic: string;
  scope: 'MOMENTS' | 'SQUARE';
  content: string;
  mode: 'coze' | 'fallback';
  image: {
    enabled: boolean;
    status: string;
    workflowId: string | null;
    url: string | null;
  };
}

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  productType: 'DIGITAL_HUMAN' | 'GIFT' | 'MERCH';
  status: 'ACTIVE' | 'SOLD_OUT' | 'ARCHIVED';
  priceCoins: number;
  stock: number | null;
  coverUrl: string | null;
  badge: string | null;
  sortOrder: number;
  relatedAccountId: string | null;
  relatedAccount: {
    id: string;
    displayName: string;
  } | null;
}

export interface AdminOrder {
  id: string;
  status: string;
  totalCoins: number;
  paidAt: string | null;
  createdAt: string;
  account: {
    id: string;
    username: string;
    displayName: string;
  };
  walletBalanceAfter: number;
  items: Array<{
    id: string;
    productId: string | null;
    productName: string;
    productType: string;
    unitCoins: number;
    quantity: number;
    coverUrl: string | null;
  }>;
}

export interface AdminAsset {
  id: string;
  assetType: string;
  title: string;
  subtitle: string | null;
  quantity: number;
  createdAt: string;
  account: {
    id: string;
    username: string;
    displayName: string;
  };
  product: {
    id: string;
    slug: string;
    productType: string;
  } | null;
  orderId: string | null;
}

export interface AdminConversation {
  id: string;
  unreadCount: number;
  updatedAt: string;
  owner: {
    id: string;
    username: string;
    displayName: string;
  };
  digitalHuman: {
    id: string;
    displayName: string;
  };
  messages: Array<{
    id: string;
    role: string;
    messageType: string;
    textContent: string | null;
    transcription: string | null;
    createdAt: string;
  }>;
}
