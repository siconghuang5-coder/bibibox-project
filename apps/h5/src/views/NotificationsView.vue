<script setup lang="ts">
import { onMounted, ref } from 'vue';
import dayjs from 'dayjs';
import { showFailToast } from 'vant';
import { get, post } from '../lib/api';
import { useSessionStore } from '../stores/session';
import type { NotificationItem } from '../types';

const session = useSessionStore();
const loading = ref(false);
const items = ref<NotificationItem[]>([]);

async function loadNotifications() {
  loading.value = true;
  try {
    const response = await get<{ items: NotificationItem[]; unreadCount: number }>('/notifications');
    items.value = response.items;
    if (session.stats) {
      session.stats.unreadCount = response.unreadCount;
    }
  } catch (error) {
    showFailToast('消息加载失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
}

async function markAllRead() {
  try {
    await post('/notifications/read-all');
    await loadNotifications();
  } catch (error) {
    showFailToast('操作失败');
    console.error(error);
  }
}

onMounted(() => {
  void loadNotifications();
});
</script>

<template>
  <div class="view-page">
    <section class="hero-panel compact">
      <div>
        <p class="eyebrow">消息提醒</p>
        <h2>点赞、评论、@、关注和数字人互动都汇总到这里</h2>
      </div>
      <van-button round size="small" @click="markAllRead">全部已读</van-button>
    </section>

    <div class="notification-list">
      <article v-for="item in items" :key="item.id" class="notification-card" :class="{ unread: !item.readAt }">
        <div class="notification-head">
          <img
            :src="item.actor?.avatarUrl || '/avatars/avatar-6.png'"
            class="avatar avatar-sm"
            :alt="item.actor?.displayName || 'system'"
          />
          <div>
            <strong>{{ item.title }}</strong>
            <p class="muted">{{ dayjs(item.createdAt).format('MM-DD HH:mm') }}</p>
          </div>
        </div>
        <p class="notification-body">{{ item.content || item.post?.excerpt || '系统已记录本次互动。' }}</p>
      </article>
      <van-empty v-if="!loading && items.length === 0" description="还没有新的互动" />
    </div>
  </div>
</template>

