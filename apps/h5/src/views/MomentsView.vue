<script setup lang="ts">
import { onMounted, ref } from 'vue';
import dayjs from 'dayjs';
import { showFailToast } from 'vant';
import { get, post } from '../lib/api';
import { useSessionStore } from '../stores/session';
import type { FeedResponse, PostItem } from '../types';
import PostComposer from '../components/PostComposer.vue';

const session = useSessionStore();
const loading = ref(false);
const feed = ref<PostItem[]>([]);
const activeCommentPostId = ref<string | null>(null);
const commentText = ref('');

async function loadFeed() {
  loading.value = true;
  try {
    const response = await get<FeedResponse>('/moments/feed');
    feed.value = response.items;
  } catch (error) {
    showFailToast('朋友圈加载失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
}

async function toggleLike(item: PostItem) {
  try {
    const response = await post<{ liked: boolean; totalLikes: number }>(`/posts/${item.id}/like`);
    item.viewer.liked = response.liked;
    item.stats.likes = response.totalLikes;
  } catch (error) {
    showFailToast('点赞失败');
    console.error(error);
  }
}

async function sendComment(postId: string) {
  if (!commentText.value.trim()) {
    return;
  }
  try {
    await post(`/posts/${postId}/comments`, {
      content: commentText.value,
    });
    commentText.value = '';
    activeCommentPostId.value = null;
    await loadFeed();
    await session.refreshMe();
  } catch (error) {
    showFailToast('评论失败');
    console.error(error);
  }
}

onMounted(async () => {
  await Promise.all([loadFeed(), session.refreshMe()]);
});
</script>

<template>
  <div class="view-page">
    <section class="hero-panel">
      <div>
        <p class="eyebrow">朋友圈 / 我的</p>
        <h2>把自己、好友、关注的人和持有数字人的动态放在同一条流里</h2>
        <p class="hero-copy">
          当前未读 {{ session.unreadCount }}，已持有 {{ session.ownedDigitalHumans.length }} 个数字人。
        </p>
      </div>
      <div class="hero-metrics">
        <div>
          <strong>{{ session.stats?.friends ?? 0 }}</strong>
          <span>好友</span>
        </div>
        <div>
          <strong>{{ session.stats?.following ?? 0 }}</strong>
          <span>关注</span>
        </div>
        <div>
          <strong>{{ session.stats?.posts ?? 0 }}</strong>
          <span>发帖</span>
        </div>
      </div>
    </section>

    <PostComposer default-scope="MOMENTS" @created="feed.unshift($event)" />

    <van-pull-refresh :model-value="loading" @refresh="loadFeed">
      <div class="feed-stack">
        <article v-for="item in feed" :key="item.id" class="post-card">
          <div class="post-head">
            <img :src="item.author.avatarUrl || '/avatars/avatar-6.png'" class="avatar" :alt="item.author.displayName" />
            <div>
              <div class="post-name-row">
                <strong>{{ item.author.displayName }}</strong>
                <span class="badge-chip" :class="{ presale: item.author.isPresale }">{{ item.author.badge }}</span>
              </div>
              <p class="muted">{{ item.author.tagline }}</p>
            </div>
            <span class="muted">{{ dayjs(item.publishedAt).format('MM-DD HH:mm') }}</span>
          </div>

          <p class="post-content">{{ item.content }}</p>

          <div v-if="item.media.length" class="media-grid">
            <img v-for="media in item.media" :key="media.id" :src="media.url" class="post-image" :alt="item.author.displayName" />
          </div>

          <div class="action-row">
            <button class="action-button" :class="{ active: item.viewer.liked }" @click="toggleLike(item)">
              {{ item.viewer.liked ? '已赞' : '点赞' }} · {{ item.stats.likes }}
            </button>
            <button class="action-button" @click="activeCommentPostId = activeCommentPostId === item.id ? null : item.id">
              评论 · {{ item.stats.comments }}
            </button>
          </div>

          <div v-if="item.comments.length" class="comment-block">
            <div v-for="comment in item.comments" :key="comment.id" class="comment-item">
              <strong>{{ comment.author.displayName }}</strong>
              <span>{{ comment.content }}</span>
            </div>
          </div>

          <div v-if="activeCommentPostId === item.id" class="comment-form">
            <van-field
              v-model="commentText"
              placeholder="说点什么，也可以 @用户名"
              class="comment-field"
            />
            <van-button size="small" round type="primary" @click="sendComment(item.id)">发送</van-button>
          </div>
        </article>
      </div>
    </van-pull-refresh>
  </div>
</template>

