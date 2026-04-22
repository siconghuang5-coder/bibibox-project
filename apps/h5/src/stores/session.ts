import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { io, type Socket } from 'socket.io-client';
import { get, post, TOKEN_KEY } from '../lib/api';
import type { SessionResponse } from '../types';

export const useSessionStore = defineStore('session', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || '');
  const account = ref<SessionResponse['account'] | null>(null);
  const stats = ref<SessionResponse['stats'] | null>(null);
  const ownedDigitalHumans = ref<SessionResponse['ownedDigitalHumans']>([]);
  const socket = ref<Socket | null>(null);
  const loading = ref(false);

  const isAuthenticated = computed(() => Boolean(token.value && account.value));
  const unreadCount = computed(() => stats.value?.unreadCount ?? 0);

  async function init() {
    if (!token.value) {
      return;
    }

    try {
      const me = await get<Omit<SessionResponse, 'token' | 'expiresAt'>>('/auth/me');
      applySession({
        ...me,
        token: token.value,
        expiresAt: '',
      });
      connectSocket();
    } catch (error) {
      clearSession();
      throw error;
    }
  }

  async function login(payload: { identifier: string; password: string; accountType: 'USER' | 'DIGITAL_HUMAN' }) {
    loading.value = true;
    try {
      const response = await post<SessionResponse>('/auth/login', payload);
      applySession(response);
      token.value = response.token;
      localStorage.setItem(TOKEN_KEY, response.token);
      connectSocket();
      return response;
    } finally {
      loading.value = false;
    }
  }

  async function register(payload: { username: string; displayName: string; email?: string; password: string }) {
    loading.value = true;
    try {
      const response = await post<SessionResponse>('/auth/register', payload);
      applySession(response);
      token.value = response.token;
      localStorage.setItem(TOKEN_KEY, response.token);
      connectSocket();
      return response;
    } finally {
      loading.value = false;
    }
  }

  async function refreshMe() {
    const me = await get<Omit<SessionResponse, 'token' | 'expiresAt'>>('/auth/me');
    account.value = me.account;
    stats.value = me.stats;
    ownedDigitalHumans.value = me.ownedDigitalHumans;
  }

  async function logout() {
    try {
      if (token.value) {
        await post('/auth/logout');
      }
    } finally {
      clearSession();
    }
  }

  function applySession(session: SessionResponse) {
    account.value = session.account;
    stats.value = session.stats;
    ownedDigitalHumans.value = session.ownedDigitalHumans;
  }

  function connectSocket() {
    if (!token.value) {
      return;
    }
    socket.value?.disconnect();
    socket.value = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
      transports: ['websocket'],
      auth: {
        token: token.value,
      },
    });
    socket.value.on('notification:count', (payload: { unreadCount: number }) => {
      if (stats.value) {
        stats.value.unreadCount = payload.unreadCount;
      }
    });
  }

  function clearSession() {
    token.value = '';
    account.value = null;
    stats.value = null;
    ownedDigitalHumans.value = [];
    localStorage.removeItem(TOKEN_KEY);
    socket.value?.disconnect();
    socket.value = null;
  }

  return {
    account,
    loading,
    ownedDigitalHumans,
    stats,
    unreadCount,
    isAuthenticated,
    init,
    login,
    register,
    refreshMe,
    logout,
  };
});

