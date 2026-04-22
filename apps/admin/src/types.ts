export interface AdminOverview {
  metrics: {
    accounts: number;
    users: number;
    digitalHumans: number;
    posts: number;
    unreadNotifications: number;
    scheduledTasks: number;
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

