<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter, RouterView } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  Bell,
  Document,
  MagicStick,
  Monitor,
  User,
} from '@element-plus/icons-vue';
import { useAdminSessionStore } from './stores/session';

const session = useAdminSessionStore();
const route = useRoute();
const router = useRouter();

const showShell = computed(() => session.isAuthenticated && route.name !== 'login');

const menuItems = [
  { path: '/dashboard', label: '总览', icon: Monitor },
  { path: '/users', label: '用户管理', icon: User },
  { path: '/posts', label: '动态管理', icon: Document },
  { path: '/products', label: '商品目录', icon: Document },
  { path: '/orders', label: '订单流水', icon: Document },
  { path: '/assets', label: '资产审计', icon: Document },
  { path: '/chats', label: '会话巡检', icon: Bell },
  { path: '/ai-publish', label: 'AI 发布', icon: MagicStick },
  { path: '/audit', label: '互动审计', icon: Bell },
];

async function logout() {
  await session.logout();
  router.replace('/login');
}

onMounted(async () => {
  if (route.name === 'login') {
    return;
  }
  try {
    await session.init();
  } catch (error) {
    console.error(error);
    ElMessage.error('管理员登录状态失效');
    router.replace('/login');
  }
});
</script>

<template>
  <div class="admin-root">
    <RouterView v-if="!showShell" />
    <div v-else class="admin-shell">
      <aside class="admin-sidebar">
        <div class="sidebar-brand">
          <p class="eyebrow">Mini Program Ops</p>
          <h2>Bibi Box 运营台</h2>
          <p>{{ session.account?.displayName }}</p>
        </div>
        <nav class="sidebar-nav">
          <button
            v-for="item in menuItems"
            :key="item.path"
            type="button"
            class="nav-button"
            :class="{ active: route.path === item.path }"
            @click="router.push(item.path)"
          >
            <component :is="item.icon" class="nav-icon" />
            <span>{{ item.label }}</span>
          </button>
        </nav>
        <button type="button" class="nav-button logout" @click="logout">退出登录</button>
      </aside>

      <main class="admin-main">
        <header class="main-header">
          <div>
            <p class="eyebrow">Operations Console</p>
            <h1>{{ menuItems.find((item) => item.path === route.path)?.label || '后台' }}</h1>
          </div>
          <el-badge :value="session.unreadCount" :max="99">
            <div class="notification-bubble">未读互动</div>
          </el-badge>
        </header>
        <RouterView />
      </main>
    </div>
  </div>
</template>
