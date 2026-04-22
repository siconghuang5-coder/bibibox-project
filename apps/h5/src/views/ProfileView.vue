<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import dayjs from 'dayjs';
import { showFailToast, showSuccessToast } from 'vant';
import { get, post } from '../lib/api';
import { useSessionStore } from '../stores/session';
import type { ProfileResponse } from '../types';

const route = useRoute();
const session = useSessionStore();
const loading = ref(false);
const profile = ref<ProfileResponse | null>(null);

const currentAccountId = computed(() => String(route.query.accountId || session.account?.id || ''));

async function loadProfile() {
  if (!currentAccountId.value) {
    return;
  }
  loading.value = true;
  try {
    profile.value = await get<ProfileResponse>(`/profiles/${currentAccountId.value}`);
  } catch (error) {
    showFailToast('主页加载失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
}

async function toggleFollow() {
  if (!profile.value) {
    return;
  }
  try {
    const response = await post<{ following: boolean }>(`/follows/${profile.value.profile.id}`);
    profile.value.relationship.isFollowing = response.following;
    showSuccessToast(response.following ? '已关注' : '已取消关注');
  } catch (error) {
    showFailToast('关注操作失败');
    console.error(error);
  }
}

async function requestFriend() {
  if (!profile.value) {
    return;
  }
  try {
    await post(`/friends/${profile.value.profile.id}/request`);
    showSuccessToast('好友申请已发出');
  } catch (error) {
    showFailToast('好友申请失败');
    console.error(error);
  }
}

watch(currentAccountId, () => {
  void loadProfile();
});

onMounted(() => {
  void loadProfile();
});
</script>

<template>
  <div v-if="profile" class="view-page">
    <section class="profile-cover" :style="{ backgroundImage: `url(${profile.profile.coverImageUrl || '/posts/post-3.jpg'})` }">
      <div class="profile-overlay">
        <img :src="profile.profile.avatarUrl || '/avatars/avatar-6.png'" class="avatar avatar-xl" :alt="profile.profile.displayName" />
        <div class="profile-meta">
          <h2>{{ profile.profile.displayName }}</h2>
          <p class="muted">@{{ profile.profile.username }} · {{ profile.profile.tagline }}</p>
          <p class="profile-bio">{{ profile.profile.bio }}</p>
        </div>
      </div>
    </section>

    <section class="stats-grid">
      <div>
        <strong>{{ profile.stats.followers }}</strong>
        <span>粉丝</span>
      </div>
      <div>
        <strong>{{ profile.stats.following }}</strong>
        <span>关注</span>
      </div>
      <div>
        <strong>{{ profile.stats.friends }}</strong>
        <span>好友</span>
      </div>
      <div>
        <strong>{{ profile.stats.posts }}</strong>
        <span>动态</span>
      </div>
    </section>

    <div v-if="!profile.relationship.isSelf" class="profile-actions">
      <van-button round @click="requestFriend">加好友</van-button>
      <van-button round type="primary" @click="toggleFollow">
        {{ profile.relationship.isFollowing ? '取消关注' : '关注' }}
      </van-button>
    </div>

    <section v-if="profile.ownedDigitalHumans.length" class="section-card">
      <div class="section-head">
        <h3>持有数字人</h3>
        <span class="muted">{{ profile.ownedDigitalHumans.length }} 个</span>
      </div>
      <div class="topic-row">
        <span v-for="item in profile.ownedDigitalHumans" :key="item.id" class="owned-chip">
          {{ item.displayName }}
        </span>
      </div>
    </section>

    <div class="feed-stack">
      <article v-for="item in profile.posts" :key="item.id" class="post-card">
        <div class="post-head">
          <img :src="item.author.avatarUrl || '/avatars/avatar-6.png'" class="avatar" :alt="item.author.displayName" />
          <div>
            <div class="post-name-row">
              <strong>{{ item.author.displayName }}</strong>
              <span class="badge-chip">{{ item.author.badge }}</span>
            </div>
            <p class="muted">{{ dayjs(item.publishedAt).format('MM-DD HH:mm') }}</p>
          </div>
        </div>
        <p class="post-content">{{ item.content }}</p>
      </article>
    </div>
  </div>
</template>

