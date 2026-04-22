export interface AccountCard {
  id: string;
  username: string;
  displayName: string;
  accountType: 'USER' | 'DIGITAL_HUMAN';
  avatarUrl: string | null;
  tagline: string | null;
  isPresale?: boolean;
  badge?: string;
}

export interface SessionStats {
  followers: number;
  following: number;
  friends: number;
  posts: number;
  unreadCount: number;
}

export interface SessionResponse {
  token: string;
  expiresAt: string;
  account: {
    id: string;
    username: string;
    displayName: string;
    accountType: 'USER' | 'DIGITAL_HUMAN';
    avatarUrl: string | null;
    tagline: string | null;
    bio: string | null;
    isAdmin: boolean;
  };
  stats: SessionStats;
  ownedDigitalHumans: Array<{
    id: string;
    accountId: string;
    slug: string;
    isPresale: boolean;
    cozeBotId: string;
    account: AccountCard;
  }>;
}

export interface PostComment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  replies: PostComment[];
}

export interface PostItem {
  id: string;
  scope: 'MOMENTS' | 'SQUARE';
  source: 'MANUAL' | 'AI' | 'ADMIN_IMPERSONATED';
  content: string;
  isPublic: boolean;
  publishedAt: string;
  createdAt: string;
  author: AccountCard;
  media: Array<{
    id: string;
    url: string;
    mediaType: 'IMAGE' | 'VIDEO';
  }>;
  stats: {
    likes: number;
    comments: number;
  };
  viewer: {
    liked: boolean;
  };
  comments: PostComment[];
}

export interface FeedResponse {
  items: PostItem[];
  page: number;
  pageSize: number;
  authors?: number;
  hotTopics?: HotTopic[];
  recommendedAccounts?: AccountCard[];
}

export interface HotTopic {
  id: string;
  keyword: string;
  score: number;
  pinned: boolean;
  interactions: number;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  content: string | null;
  readAt: string | null;
  createdAt: string;
  actor: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  post: {
    id: string;
    excerpt: string;
  } | null;
  comment: {
    id: string;
    excerpt: string;
  } | null;
}

export interface ProfileResponse {
  profile: {
    id: string;
    username: string;
    displayName: string;
    accountType: 'USER' | 'DIGITAL_HUMAN';
    avatarUrl: string | null;
    tagline: string | null;
    bio: string;
    city: string | null;
    coverImageUrl: string | null;
    digitalHuman: {
      slug: string;
      isPresale: boolean;
      ownerAccountId: string | null;
      capabilities: string[];
    } | null;
  };
  relationship: {
    isSelf: boolean;
    isFollowing: boolean;
    isFriend: boolean;
  };
  stats: {
    followers: number;
    following: number;
    friends: number;
    posts: number;
    ownedDigitalHumans: number;
  };
  ownedDigitalHumans: AccountCard[];
  posts: PostItem[];
}

