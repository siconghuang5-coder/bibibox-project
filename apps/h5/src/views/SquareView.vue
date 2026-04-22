<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import dayjs from 'dayjs';
import { showFailToast, showSuccessToast } from 'vant';
import { get, post } from '../lib/api';
import type { AccountCard, FeedResponse, HotTopic, PostItem } from '../types';

const router = useRouter();
const loading = ref(false);
const query = ref('');
const feed = ref<PostItem[]>([]);
const hotTopics = ref<HotTopic[]>([]);
const recommendedAccounts = ref<AccountCard[]>([]);
const results = ref<AccountCard[]>([]);

async function loadFeed() {
  loading.value = true;
  try {
    const response = await get<FeedResponse>('/square/feed');
    feed.value = response.items;
    hotTopics.value = response.hotTopics ?? [];
    recommendedAccounts.value = response.recommendedAccounts ?? [];
  } catch (error) {
    showFailToast('广场加载失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
}

async function searchUsers() {
  if (!query.value.trim()) {
    results.value = [];
    return;
  }
  try {
    const response = await get<{ items: AccountCard[] }>('/search/users', { q: query.value.trim() });
    results.value = response.items;
  } catch (error) {
    showFailToast('搜索失败');
    console.error(error);
  }
}

async function follow(accountId: string) {
  try {
    const response = await post<{ following: boolean }>(`/follows/${accountId}`);
    showSuccessToast(response.following ? '已关注' : '已取消关注');
  } catch (error) {
    showFailToast('操作失败');
    console.error(error);
  }
}

function openProfile(accountId: string) {
  router.push({ name: 'profile', query: { accountId } });
}

watch(query, () => {
  void searchUsers();
});

onMounted(() => {
  void loadFeed();
});
</script>

<template>
  <div class="view-page">
    <section class="hero-panel">
      <div>
        <p class="eyebrow">广场</p>
        <h2>推荐流、热搜、搜索和公开主页放在同一层体验里</h2>
        <p class="hero-copy">未售数字人可以自动向广场发动态，热搜由动态标签、搜索和互动热度共同驱动。</p>
      </div>
    </section>

    <div class="search-card">
      <van-search v-model="query" shape="round" placeholder="搜用户、搜数字人、搜标签" />
      <div v-if="results.length" class="search-results">
        <button
          v-for="item in results"
          :key="item.id"
          type="button"
          class="search-result"
          @click="openProfile(item.id)"
        >
          <img :src="item.avatarUrl || '/avatars/avatar-6.png'" class="avatar avatar-sm" :alt="item.displayName" />
          <div>
            <strong>{{ item.displayName }}</strong>
            <p class="muted">{{ item.tagline }}</p>
          </div>
        </button>
      </div>
    </div>

    <section class="section-card">
      <div class="section-head">
        <h3>热搜</h3>
        <span class="muted">按小时聚合</span>
      </div>
      <div class="topic-row">
        <button v-for="topic in hotTopics" :key="topic.id" type="button" class="topic-chip" @click="query = topic.keyword">
          <span>#{{ topic.keyword }}</span>
          <small>{{ topic.interactions }}</small>
        </button>
      </div>
    </section>

    <section class="section-card">
      <div class="section-head">
        <h3>推荐账号</h3>
        <span class="muted">可直接关注</span>
      </div>
      <div class="recommend-row">
        <div v-for="item in recommendedAccounts" :key="item.id" class="recommend-card">
          <img :src="item.avatarUrl || '/avatars/avatar-6.png'" class="avatar avatar-lg" :alt="item.displayName" />
          <strong>{{ item.displayName }}</strong>
          <p class="muted clamp-2">{{ item.tagline }}</p>
          <div class="recommend-actions">
            <van-button size="small" round @click="openProfile(item.id)">主页</van-button>
            <van-button size="small" round type="primary" @click="follow(item.id)">关注</van-button>
          </div>
        </div>
      </div>
    </section>

    <div class="feed-stack">
      <article v-for="item in feed" :key="item.id" class="post-card">
        <div class="post-head">
          <img :src="item.author.avatarUrl || '/avatars/avatar-6.png'" class="avatar" :alt="item.author.displayName" />
          <div class="post-head-main" @click="openProfile(item.author.id)">
            <div class="post-name-row">
              <strong>{{ item.author.displayName }}</strong>
              <span class="badge-chip">{{ item.author.badge }}</span>
            </div>
            <p class="muted">{{ item.author.tagline }}</p>
          </div>
          <span class="muted">{{ dayjs(item.publishedAt).format('MM-DD HH:mm') }}</span>
        </div>

        <p class="post-content">{{ item.content }}</p>
        <div v-if="item.media.length" class="media-grid">
          <img v-for="media in item.media" :key="media.id" :src="media.url" class="post-image" :alt="item.author.displayName" />
        </div>
      </article>
    </div>
  </div>
</template>

