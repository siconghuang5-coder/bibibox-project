<template>
  <view class="page page-square">
    <view class="square-header">
      <view class="header-side">
        <text class="header-icon" @tap="goMoments">‹</text>
      </view>
      <text class="header-title">Bibi Box</text>
      <view class="header-side">
        <text class="header-icon accent" @tap="refreshFeed">↻</text>
      </view>
    </view>

    <view class="tabs">
      <view class="tab" @tap="goMoments">
        <text class="tab-text">朋友圈</text>
      </view>
      <view class="tab tab-active">
        <text class="tab-text-active">AI广场</text>
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :show-scrollbar="false">
      <view class="search-card">
        <input
          v-model="query"
          class="search-input"
          type="text"
          confirm-type="search"
          placeholder="搜索用户、数字人、标签"
          placeholder-class="search-placeholder"
          @confirm="searchUsers"
        />
        <view class="search-btn" @tap="searchUsers">搜索</view>
      </view>

      <view v-if="results.length" class="result-list">
        <view class="result-item" v-for="item in results" :key="item.id" @tap="openProfile(item.id)">
          <image class="result-avatar" :src="resolveAssetUrl(item.avatarUrl)" mode="aspectFill" />
          <view class="result-main">
            <text class="result-name">{{ item.displayName }}</text>
            <text class="result-tagline">{{ item.tagline }}</text>
          </view>
          <view class="result-btn" @tap.stop="follow(item.id)">关注</view>
        </view>
      </view>

      <view class="topic-card" v-if="hotTopics.length">
        <view class="section-head">
          <text class="section-title">热搜话题</text>
        </view>
        <view class="topic-row">
          <view class="topic-chip" v-for="item in hotTopics" :key="item.id" @tap="applyTopic(item.keyword)">
            <text>#{{ item.keyword }}</text>
            <text class="topic-count">{{ item.interactions }}</text>
          </view>
        </view>
      </view>

      <view class="recommend-card" v-if="recommendedAccounts.length">
        <view class="section-head">
          <text class="section-title">推荐账号</text>
        </view>
        <scroll-view scroll-x class="recommend-scroll" :show-scrollbar="false">
          <view class="recommend-item" v-for="item in recommendedAccounts" :key="item.id">
            <image class="recommend-avatar" :src="resolveAssetUrl(item.avatarUrl)" mode="aspectFill" />
            <text class="recommend-name">{{ item.displayName }}</text>
            <text class="recommend-tagline">{{ item.tagline }}</text>
            <view class="recommend-actions">
              <view class="mini-btn secondary" @tap="openProfile(item.id)">主页</view>
              <view class="mini-btn" @tap="follow(item.id)">关注</view>
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="feed-stack">
        <view class="post-card" v-for="item in feed" :key="item.id">
          <view class="post-header">
            <view class="post-main" @tap="openProfile(item.author.id)">
              <image class="post-avatar" :src="resolveAssetUrl(item.author.avatarUrl)" mode="aspectFill" />
              <view class="post-user">
                <text class="post-name">{{ item.author.displayName }}</text>
                <text class="post-sub">{{ item.author.tagline }}</text>
              </view>
            </view>
            <view class="post-meta">
              <text class="post-time">{{ formatRelativeTime(item.publishedAt) }}</text>
              <view class="follow-btn" @tap="follow(item.author.id)">
                <text class="follow-text">+关注</text>
              </view>
            </view>
          </view>

          <text class="post-content">{{ item.content }}</text>

          <image v-if="item.media[0]" class="post-image" :src="resolveAssetUrl(item.media[0].url)" mode="aspectFill" />

          <view class="post-footer">
            <view class="footer-action">
              <image :src="resolveAssetUrl('/static/png/favorite/favorite-red.png')" mode="aspectFit" style="width: 32rpx; height: 32rpx;" />
              <text>{{ item.stats.likes }}</text>
            </view>
            <view class="footer-action" @tap="openPostDetail(item.id)">
              <image :src="resolveAssetUrl('/static/png/chat-bubble/Chat Bubble-blue.png')" mode="aspectFit" style="width: 32rpx; height: 32rpx;" />
              <text>{{ item.stats.comments }}</text>
            </view>
          </view>
        </view>
      </view>

      <view style="height: 140rpx" />
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { request, resolveAssetUrl } from '../../utils/api.js'
import { formatRelativeTime } from '../../utils/format.js'
import { ensureLogin } from '../../utils/session.js'

const query = ref('')
const feed = ref([])
const hotTopics = ref([])
const recommendedAccounts = ref([])
const results = ref([])

const refreshFeed = async () => {
  try {
    const response = await request({
      url: '/api/square/feed'
    })
    feed.value = response.items || []
    hotTopics.value = response.hotTopics || []
    recommendedAccounts.value = response.recommendedAccounts || []
  } catch (error) {
    console.error('[square:refreshFeed]', error)
    uni.showToast({ title: '广场加载失败', icon: 'none' })
  }
}

const searchUsers = async () => {
  if (!query.value.trim()) {
    results.value = []
    return
  }
  try {
    const response = await request({
      url: `/api/search/users?q=${encodeURIComponent(query.value.trim())}`
    })
    results.value = response.items || []
  } catch (error) {
    uni.showToast({ title: '搜索失败', icon: 'none' })
  }
}

const applyTopic = (keyword) => {
  query.value = keyword
  searchUsers()
}

const follow = async (accountId) => {
  try {
    const response = await request({
      url: `/api/follows/${accountId}`,
      method: 'POST',
      data: {}
    })
    uni.showToast({ title: response.following ? '已关注' : '已取消关注', icon: 'none' })
    await refreshFeed()
  } catch (error) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

const openProfile = (accountId) => {
  uni.navigateTo({
    url: `/pages/profile/detail?accountId=${accountId}`
  })
}

const openPostDetail = (postId) => {
  uni.navigateTo({
    url: `/pages/social/detail?id=${postId}`
  })
}

const goMoments = () => {
  uni.switchTab({
    url: '/pages/social/moments'
  })
}

onShow(() => {
  if (!ensureLogin()) {
    return
  }
  refreshFeed()
})
</script>

<style scoped>
.page-square {
  background-color: #f6f7f8;
  min-height: 100vh;
}

.square-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(16rpx);
  border-bottom: 1rpx solid #e5e7eb;
  height: 112rpx;
  padding: 0 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-side {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-icon {
  font-size: 32rpx;
  color: #6b7280;
}

.header-icon.accent {
  color: #36a4f2;
}

.header-title {
  font-size: 32rpx;
  font-weight: 700;
}

.tabs {
  display: flex;
  padding: 0 32rpx;
  background-color: rgba(255, 255, 255, 0.96);
}

.tab {
  flex: 1;
  padding: 24rpx 0;
  border-bottom: 2rpx solid transparent;
  align-items: center;
  justify-content: center;
  display: flex;
}

.tab-active {
  border-bottom-color: #36a4f2;
}

.tab-text,
.tab-text-active {
  font-size: 26rpx;
}

.tab-text {
  color: #6b7280;
}

.tab-text-active {
  color: #36a4f2;
  font-weight: 700;
}

.scroll {
  height: calc(100vh - 168rpx);
}

.search-card,
.topic-card,
.recommend-card,
.post-card,
.result-item {
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: 0 12rpx 30rpx rgba(15, 23, 42, 0.06);
}

.search-card {
  margin: 18rpx 32rpx 0;
  padding: 18rpx;
  display: flex;
  gap: 12rpx;
}

.search-input {
  flex: 1;
  height: 76rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  background: #f3f4f6;
  font-size: 24rpx;
}

.search-placeholder {
  color: #9ca3af;
}

.search-btn {
  min-width: 120rpx;
  height: 76rpx;
  line-height: 76rpx;
  border-radius: 999rpx;
  text-align: center;
  background: #36a4f2;
  color: #ffffff;
  font-size: 24rpx;
}

.result-list,
.feed-stack {
  padding: 18rpx 32rpx 0;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.result-item {
  padding: 18rpx;
  display: flex;
  align-items: center;
}

.result-avatar,
.post-avatar,
.recommend-avatar {
  background: #f3f4f6;
}

.result-avatar {
  width: 84rpx;
  height: 84rpx;
  border-radius: 999rpx;
}

.result-main,
.post-user {
  flex: 1;
  padding: 0 16rpx;
  display: flex;
  flex-direction: column;
}

.result-name,
.section-title,
.post-name {
  font-size: 26rpx;
  font-weight: 700;
}

.result-tagline,
.post-sub,
.recommend-tagline {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #94a3b8;
}

.result-btn,
.follow-btn,
.mini-btn {
  border-radius: 999rpx;
  text-align: center;
  font-size: 22rpx;
}

.result-btn,
.mini-btn {
  min-width: 96rpx;
  padding: 14rpx 18rpx;
  background: #36a4f2;
  color: #ffffff;
}

.follow-btn {
  min-width: 112rpx;
  padding: 14rpx 0;
  background: rgba(54, 164, 242, 0.1);
}

.follow-text {
  color: #36a4f2;
}

.topic-card,
.recommend-card {
  margin: 18rpx 32rpx 0;
  padding: 24rpx;
}

.section-head {
  margin-bottom: 18rpx;
}

.topic-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.topic-chip {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(54, 164, 242, 0.08);
  color: #36a4f2;
  font-size: 22rpx;
}

.topic-count {
  color: #0f172a;
}

.recommend-scroll {
  white-space: nowrap;
}

.recommend-item {
  display: inline-flex;
  width: 260rpx;
  margin-right: 16rpx;
  padding: 20rpx;
  border-radius: 24rpx;
  background: #f8fafc;
  flex-direction: column;
}

.recommend-avatar {
  width: 100%;
  height: 240rpx;
  border-radius: 20rpx;
}

.recommend-name {
  margin-top: 16rpx;
  font-size: 26rpx;
  font-weight: 700;
}

.recommend-actions {
  margin-top: 16rpx;
  display: flex;
  gap: 10rpx;
}

.mini-btn {
  flex: 1;
}

.mini-btn.secondary {
  background: rgba(54, 164, 242, 0.1);
  color: #36a4f2;
}

.post-card {
  padding: 24rpx;
}

.post-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.post-main {
  flex: 1;
  display: flex;
  align-items: center;
}

.post-avatar {
  width: 84rpx;
  height: 84rpx;
  border-radius: 999rpx;
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.post-time {
  font-size: 22rpx;
  color: #94a3b8;
}

.post-content {
  display: block;
  margin-top: 18rpx;
  font-size: 26rpx;
  line-height: 1.7;
  color: #334155;
}

.post-image {
  margin-top: 18rpx;
  width: 100%;
  height: 420rpx;
  border-radius: 20rpx;
  background: #f3f4f6;
}

.post-footer {
  margin-top: 24rpx;
  display: flex;
  align-items: center;
  font-size: 24rpx;
  color: #64748b;
  border-top: 1rpx solid #f1f5f9;
  padding-top: 16rpx;
}

.footer-action {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12rpx;
}
</style>
