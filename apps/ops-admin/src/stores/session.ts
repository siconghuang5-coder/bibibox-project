import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { io, type Socket } from 'socket.io-client';
import { get, LOGOUT_KEY, post, postWithToken, TOKEN_KEY } from '../lib/api';

interface AdminSession {
  token: string;
  account: {
    id: string;
    username: string;
    displayName: string;
    isAdmin: boolean;
    avatarUrl: string | null;
  };
  stats: {
    unreadCount: number;
  };
}

export const useAdminSessionStore = defineStore('adminSession', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || '');
  const account = ref<AdminSession['account'] | null>(null);
  const unreadCount = ref(0);
  const socket = ref<Socket | null>(null);
  const loading = ref(false);

  const isAuthenticated = computed(() => Boolean(token.value && account.value?.isAdmin));

  async function init() {
    if (!token.value) {
      return;
    }
    try {
      const response = await get<{ account: AdminSession['account']; stats: { unreadCount: number } }>('/auth/me');
      if (!response.account.isAdmin) {
        throw new Error('not admin');
      }
      account.value = response.account;
      unreadCount.value = response.stats.unreadCount;
      connectSocket();
    } catch (error) {
      clear();
      throw error;
    }
  }

  async function login(identifier: string, password: string) {
    loading.value = true;
    try {
      const response = await post<AdminSession & { expiresAt: string }>('/auth/login', {
        identifier,
        password,
        accountType: 'USER',
      });
      if (!response.account.isAdmin) {
        throw new Error('当前账号不是管理员');
      }
      sessionStorage.removeItem(LOGOUT_KEY);
      token.value = response.token;
      localStorage.setItem(TOKEN_KEY, response.token);
      account.value = response.account;
      unreadCount.value = response.stats.unreadCount;
      connectSocket();
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    const currentToken = token.value;
    sessionStorage.setItem(LOGOUT_KEY, '1');
    if (currentToken) {
      window.setTimeout(() => {
        clear();
        sessionStorage.removeItem(LOGOUT_KEY);
        void postWithToken('/auth/logout', currentToken).catch((error) => {
          console.warn('服务端退出登录失败，本地登录态已清理', error);
        });
      }, 5000);
    } else {
      clear();
      sessionStorage.removeItem(LOGOUT_KEY);
    }
  }

  function connectSocket() {
    if (!token.value) {
      return;
    }
    socket.value?.disconnect();
    socket.value = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
      transports: ['websocket'],
      auth: { token: token.value },
    });
    socket.value.on('notification:count', (payload: { unreadCount: number }) => {
      unreadCount.value = payload.unreadCount;
    });
  }

  function clear() {
    token.value = '';
    account.value = null;
    unreadCount.value = 0;
    localStorage.removeItem(TOKEN_KEY);
    socket.value?.disconnect();
    socket.value = null;
  }

  return {
    account,
    loading,
    unreadCount,
    isAuthenticated,
    init,
    login,
    logout,
  };
});
