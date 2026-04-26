<template>
  <view class="page page-profile">
    <view class="header">
      <text class="header-action" @tap="goBack">‹</text>
      <text class="header-title">主页</text>
      <text class="header-action" @tap="refreshProfile">刷新</text>
    </view>

    <scroll-view scroll-y class="scroll" :show-scrollbar="false">
      <view v-if="profile" class="hero">
        <image class="hero-cover" :src="resolveAssetUrl(profile.coverImageUrl)" mode="aspectFill" />
        <view class="hero-card">
          <image class="hero-avatar" :src="resolveAssetUrl(profile.avatarUrl)" mode="aspectFill" />
          <text class="hero-name">{{ profile.displayName }}</text>
          <text class="hero-tagline">{{ profile.tagline }}</text>
          <text class="hero-bio">{{ profile.bio }}</text>
          <view class="stats-row">
            <view class="stat-item">
              <text class="stat-value">{{ stats.followers }}</text>
              <text class="stat-label">关注者</text>
            </view>
            <view class="stat-item">
              <text class="stat-value">{{ stats.posts }}</text>
              <text class="stat-label">动态</text>
            </view>
            <view class="stat-item">
              <text class="stat-value">{{ stats.ownedDigitalHumans }}</text>
              <text class="stat-label">持有</text>
            </view>
          </view>
          <view class="action-row" v-if="!relationship.isSelf">
            <view class="action-btn secondary" @tap="toggleFollow">{{ relationship.isFollowing ? '取消关注' : '关注' }}</view>
            <view class="action-btn" @tap="requestFriend">{{ relationship.isFriend ? '已是好友' : '加好友' }}</view>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-head">
          <text class="section-title">TA 的动态</text>
        </view>
        <view v-if="posts.length" class="post-list">
          <view class="post-card" v-for="item in posts" :key="item.id">
            <view class="post-top">
              <text class="post-scope">{{ item.scope }}</text>
              <text class="post-time">{{ formatRelativeTime(item.publishedAt) }}</text>
            </view>
            <text class="post-content">{{ item.content }}</text>
            <image v-if="item.media[0]" class="post-image" :src="resolveAssetUrl(item.media[0].url)" mode="aspectFill" />
            <view class="post-bottom">
              <text>{{ item.stats.likes }} 赞</text>
              <text>{{ item.stats.comments }} 评论</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-card">还没有公开动态。</view>
      </view>

      <view style="height: 120rpx" />
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { request, resolveAssetUrl } from '../../utils/api.js'
import { formatRelativeTime } from '../../utils/format.js'

const accountId = ref('')
const profile = ref(null)
const relationship = ref({
  isSelf: false,
  isFollowing: false,
  isFriend: false
})
const stats = ref({
  followers: 0,
  posts: 0,
  ownedDigitalHumans: 0
})
const posts = ref([])

const refreshProfile = async () => {
  if (!accountId.value) return
  try {
    const response = await request({
      url: `/api/profiles/${accountId.value}`
    })
    profile.value = response.profile || null
    relationship.value = response.relationship || relationship.value
    stats.value = response.stats || stats.value
    posts.value = response.posts || []
  } catch (error) {
    console.error('[profile:refresh]', error)
    uni.showToast({ title: '主页加载失败', icon: 'none' })
  }
}

const toggleFollow = async () => {
  try {
    const response = await request({
      url: `/api/follows/${accountId.value}`,
      method: 'POST'
    })
    relationship.value.isFollowing = !!response.following
    uni.showToast({ title: response.following ? '已关注' : '已取消关注', icon: 'none' })
    await refreshProfile()
  } catch (error) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

const requestFriend = async () => {
  if (relationship.value.isFriend) {
    uni.showToast({ title: '已经是好友了', icon: 'none' })
    return
  }
  try {
    await request({
      url: `/api/friends/${accountId.value}/request`,
      method: 'POST'
    })
    uni.showToast({ title: '好友申请已发送', icon: 'none' })
  } catch (error) {
    uni.showToast({ title: error.message || '申请失败', icon: 'none' })
  }
}

const goBack = () => {
  uni.navigateBack({
    delta: 1
  })
}

onLoad((options) => {
  accountId.value = options?.accountId || ''
  refreshProfile()
})
</script>

<style scoped>
.page-profile {
  min-height: 100vh;
  background: #f6f7f8;
}

.header {
  position: sticky;
  top: 0;
  z-index: 10;
  height: 96rpx;
  padding: 0 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(246, 247, 248, 0.96);
  border-bottom: 1rpx solid #e5e7eb;
}

.header-title {
  font-size: 30rpx;
  font-weight: 700;
}

.header-action {
  min-width: 72rpx;
  font-size: 24rpx;
  color: #36a4f2;
}

.scroll {
  height: calc(100vh - 96rpx);
}

.hero {
  position: relative;
}

.hero-cover {
  width: 100%;
  height: 360rpx;
  background: #e5e7eb;
}

.hero-card {
  margin: -80rpx 32rpx 0;
  padding: 28rpx;
  border-radius: 28rpx;
  background: #ffffff;
  box-shadow: 0 16rpx 40rpx rgba(15, 23, 42, 0.08);
  position: relative;
}

.hero-avatar {
  width: 140rpx;
  height: 140rpx;
  border-radius: 999rpx;
  border: 8rpx solid #ffffff;
  margin-top: -92rpx;
  background: #f3f4f6;
}

.hero-name {
  margin-top: 16rpx;
  display: block;
  font-size: 34rpx;
  font-weight: 800;
}

.hero-tagline,
.hero-bio {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: #6b7280;
}

.stats-row {
  margin-top: 24rpx;
  display: flex;
  justify-content: space-between;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 30rpx;
  font-weight: 800;
}

.stat-label {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #94a3b8;
}

.action-row {
  margin-top: 24rpx;
  display: flex;
  gap: 16rpx;
}

.action-btn {
  flex: 1;
  padding: 18rpx 0;
  border-radius: 999rpx;
  text-align: center;
  background: #36a4f2;
  color: #ffffff;
  font-size: 24rpx;
}

.action-btn.secondary {
  background: rgba(54, 164, 242, 0.1);
  color: #36a4f2;
}

.section {
  padding: 28rpx 32rpx 0;
}

.section-title {
  font-size: 32rpx;
  font-weight: 800;
}

.post-list {
  margin-top: 18rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.post-card,
.empty-card {
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 30rpx rgba(15, 23, 42, 0.06);
}

.post-card {
  padding: 24rpx;
}

.post-top,
.post-bottom {
  display: flex;
  justify-content: space-between;
  font-size: 22rpx;
  color: #94a3b8;
}

.post-content {
  display: block;
  margin-top: 16rpx;
  font-size: 26rpx;
  line-height: 1.7;
  color: #334155;
}

.post-image {
  margin-top: 16rpx;
  width: 100%;
  height: 360rpx;
  border-radius: 20rpx;
  background: #f3f4f6;
}

.post-bottom {
  margin-top: 16rpx;
}

.empty-card {
  margin-top: 18rpx;
  padding: 40rpx 28rpx;
  text-align: center;
  font-size: 24rpx;
  color: #9ca3af;
}
</style>
