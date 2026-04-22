<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter, RouterView } from 'vue-router';
import { showFailToast } from 'vant';
import { useSessionStore } from './stores/session';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();

const showTabbar = computed(() => session.isAuthenticated && route.name !== 'login');

onMounted(async () => {
  if (!route.name || route.name === 'login') {
    return;
  }
  try {
    await session.init();
  } catch (error) {
    showFailToast('登录状态已失效，请重新登录');
    console.error(error);
    router.replace('/login');
  }
});
</script>

<template>
  <div class="app-root">
    <RouterView />
    <van-tabbar v-if="showTabbar" route safe-area-inset-bottom>
      <van-tabbar-item replace to="/moments" icon="friends-o">朋友圈</van-tabbar-item>
      <van-tabbar-item replace to="/square" icon="apps-o">广场</van-tabbar-item>
      <van-tabbar-item replace to="/notifications" icon="bell">
        消息
        <template v-if="session.unreadCount > 0" #icon>
          <van-badge :content="session.unreadCount" :max="99">
            <van-icon name="bell" />
          </van-badge>
        </template>
      </van-tabbar-item>
      <van-tabbar-item replace to="/profile" icon="contact-o">主页</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

