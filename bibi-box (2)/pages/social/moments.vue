<template>
  <view class="page page-social">
    <view class="social-header">
      <view class="header-side">
        <image :src="resolveAssetUrl('/static/png/edit/edit-blue.png')" class="header-icon-img" @tap="toggleComposer" mode="aspectFit" style="width: 40rpx; height: 40rpx;" />
      </view>
      <text class="header-title">Bibi Box</text>
      <view class="header-side">
        <image :src="resolveAssetUrl('/static/png/notification/notification-filling-blue.png')" class="header-icon-img" @tap="goNotifications" mode="aspectFit" style="width: 40rpx; height: 40rpx;" />
      </view>
    </view>

    <view class="tabs">
      <view class="tab tab-active">
        <text class="tab-text-active">朋友圈</text>
      </view>
      <view class="tab" @tap="goSquare">
        <text class="tab-text">AI广场</text>
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :show-scrollbar="false">
      <view class="composer-card" v-if="showComposer">
        <textarea
          v-model="draft"
          class="composer-input"
          auto-height
          maxlength="280"
          placeholder="发一条新的朋友圈，也可以 @用户名"
          placeholder-class="composer-placeholder"
        />
        <view class="composer-preview" v-if="draftImage">
          <image class="composer-image" :src="draftImage" mode="aspectFill" />
          <text class="composer-remove" @tap="clearDraftImage">移除</text>
        </view>
        <view class="composer-actions">
          <view class="composer-btn secondary" @tap="pickImage">图片</view>
          <view class="composer-btn" @tap="publishPost">发布</view>
        </view>
      </view>

      <view class="feed-stack">
        <view class="moment-card" v-for="item in feed" :key="item.id">
          <view class="moment-header">
            <view class="avatar-ring">
              <image class="avatar-img" :src="resolveAssetUrl(item.author.avatarUrl)" mode="aspectFill" />
            </view>
            <view class="moment-user" @tap="openProfile(item.author.id)">
              <text class="moment-name">{{ item.author.displayName }}</text>
              <text class="moment-time">{{ formatRelativeTime(item.publishedAt) }}</text>
            </view>
            <text class="more">{{ item.author.badge || '•••' }}</text>
          </view>

          <view v-if="item.media[0]" class="moment-image-wrap">
            <image class="moment-image" :src="resolveAssetUrl(item.media[0].url)" mode="aspectFill" />
          </view>

          <view class="moment-text-wrap">
            <text class="moment-text">{{ item.content }}</text>
          </view>

          <view class="moment-actions">
            <view class="action" :class="{ active: item.viewer.liked }" @tap="toggleLike(item)">
              <image :src="resolveAssetUrl('/static/png/favorite/favorite-red.png')" mode="aspectFit" style="width: 32rpx; height: 32rpx;" />
              <text class="action-count">{{ item.stats.likes }}</text>
            </view>
            <view class="action" @tap="openPostDetail(item.id)">
              <image :src="resolveAssetUrl('/static/png/chat-bubble/Chat Bubble-blue.png')" mode="aspectFit" style="width: 32rpx; height: 32rpx;" />
              <text class="action-count">{{ item.stats.comments }}</text>
            </view>
          </view>

          <view class="moment-comments" v-if="item.comments.length">
            <text class="comment" v-for="comment in item.comments" :key="comment.id">
              <text class="bold">{{ comment.author.displayName }}：</text>{{ comment.content }}
            </text>
          </view>

          <view v-if="activeCommentPostId === item.id" class="comment-form">
            <input
              v-model="commentText"
              class="comment-input"
              type="text"
              placeholder="说点什么，也可以 @用户名"
              placeholder-class="comment-placeholder"
            />
            <view class="comment-send" @tap="sendComment(item.id)">发送</view>
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
import { request, resolveAssetUrl, uploadFile } from '../../utils/api.js'
import { refreshTabBadges } from '../../utils/badges.js'
import { formatRelativeTime } from '../../utils/format.js'
import { ensureLogin } from '../../utils/session.js'

const feed = ref([])
const draft = ref('')
const draftImage = ref('')
const activeCommentPostId = ref('')
const commentText = ref('')
const showComposer = ref(false)

const toggleComposer = () => {
  showComposer.value = !showComposer.value
}

const refreshFeed = async () => {
  try {
    const response = await request({
      url: '/api/moments/feed'
    })
    feed.value = response.items || []
    await refreshTabBadges()
  } catch (error) {
    console.error('[moments:refreshFeed]', error)
    uni.showToast({ title: '朋友圈加载失败', icon: 'none' })
  }
}

const pickImage = async () => {
  try {
    const chooser = await new Promise((resolve, reject) => {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: resolve,
        fail: reject
      })
    })
    draftImage.value = chooser.tempFilePaths?.[0] || ''
  } catch (error) {
    if (String(error?.errMsg || error).includes('cancel')) return
    uni.showToast({ title: '选择图片失败', icon: 'none' })
  }
}

const clearDraftImage = () => {
  draftImage.value = ''
}

const publishPost = async () => {
  if (!draft.value.trim() && !draftImage.value) {
    uni.showToast({ title: '先写点内容吧', icon: 'none' })
    return
  }

  try {
    let mediaUrls = []
    if (draftImage.value) {
      const uploaded = await uploadFile({
        url: '/api/uploads/images',
        filePath: draftImage.value,
        name: 'files'
      })
      mediaUrls = (uploaded.items || []).map(item => item.url)
    }

    await request({
      url: '/api/posts',
      method: 'POST',
      data: {
        scope: 'MOMENTS',
        content: draft.value.trim(),
        mediaUrls
      }
    })
    draft.value = ''
    draftImage.value = ''
    showComposer.value = false
    uni.showToast({ title: '已发布', icon: 'none' })
    await refreshFeed()
  } catch (error) {
    console.error('[moments:publishPost]', error)
    uni.showToast({ title: error.message || '发布失败', icon: 'none' })
  }
}

const toggleLike = async (item) => {
  try {
    const response = await request({
      url: `/api/posts/${item.id}/like`,
      method: 'POST',
      data: {}
    })
    item.viewer.liked = response.liked
    item.stats.likes = response.totalLikes
  } catch (error) {
    uni.showToast({ title: '点赞失败', icon: 'none' })
  }
}

const toggleComment = (postId) => {
  activeCommentPostId.value = activeCommentPostId.value === postId ? '' : postId
}

const sendComment = async (postId) => {
  if (!commentText.value.trim()) {
    uni.showToast({ title: '先输入评论内容', icon: 'none' })
    return
  }

  try {
    await request({
      url: `/api/posts/${postId}/comments`,
      method: 'POST',
      data: {
        content: commentText.value.trim()
      }
    })
    commentText.value = ''
    activeCommentPostId.value = ''
    await refreshFeed()
  } catch (error) {
    uni.showToast({ title: '评论失败', icon: 'none' })
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

const goSquare = () => {
  uni.navigateTo({
    url: '/pages/social/AIsquare'
  })
}

const goNotifications = () => {
  uni.navigateTo({
    url: '/pages/notifications/list'
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
.page-social {
  background-color: #f6f7f8;
  min-height: 100vh;
}

.social-header {
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

.result-main {
  display: flex;
  flex-direction: column;
}

.post-user {
  flex: 1;
  padding: 0 16rpx;
  display: flex;
  flex-direction: column;
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

.composer-card,
.moment-card {
  margin: 18rpx 32rpx 0;
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: 0 12rpx 30rpx rgba(15, 23, 42, 0.06);
}

.composer-card {
  padding: 24rpx;
}

.composer-input {
  width: 100%;
  min-height: 120rpx;
  font-size: 26rpx;
}

.composer-placeholder {
  color: #9ca3af;
}

.composer-preview {
  margin-top: 16rpx;
  position: relative;
}

.composer-image {
  width: 200rpx;
  height: 200rpx;
  border-radius: 18rpx;
}

.composer-remove {
  position: absolute;
  right: 0;
  bottom: 0;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(15, 23, 42, 0.56);
  color: #ffffff;
  font-size: 20rpx;
}

.composer-actions {
  margin-top: 20rpx;
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
}

.composer-btn {
  min-width: 140rpx;
  padding: 16rpx 24rpx;
  border-radius: 999rpx;
  text-align: center;
  background: #36a4f2;
  color: #ffffff;
  font-size: 24rpx;
}

.composer-btn.secondary {
  background: rgba(54, 164, 242, 0.1);
  color: #36a4f2;
}

.moment-card {
  padding: 24rpx;
}

.moment-header {
  display: flex;
  align-items: center;
}

.avatar-ring {
  width: 84rpx;
  height: 84rpx;
  border-radius: 999rpx;
  padding: 4rpx;
  background: rgba(54, 164, 242, 0.08);
  margin-right: 20rpx;
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 999rpx;
}

.moment-user {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.moment-name {
  font-size: 26rpx;
  font-weight: 700;
}

.moment-time {
  margin-top: 6rpx;
  font-size: 20rpx;
  color: #9ca3af;
}

.more {
  font-size: 22rpx;
  color: #36a4f2;
}

.moment-image-wrap {
  margin-top: 18rpx;
  border-radius: 22rpx;
  overflow: hidden;
}

.moment-image {
  width: 100%;
  height: 420rpx;
}

.moment-text-wrap {
  margin-top: 16rpx;
}

.moment-text {
  font-size: 26rpx;
  line-height: 1.7;
  color: #334155;
}

.moment-actions {
  margin-top: 18rpx;
  display: flex;
  align-items: center;
  border-top: 1rpx solid #f1f5f9;
  padding-top: 16rpx;
}

.action {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12rpx;
  font-size: 24rpx;
  color: #64748b;
}

.action.active {
  color: #ef4444;
}

.moment-comments {
  margin-top: 18rpx;
  padding: 18rpx;
  border-radius: 18rpx;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.comment {
  font-size: 24rpx;
  color: #475569;
  line-height: 1.7;
}

.bold {
  font-weight: 700;
  color: #0f172a;
}

.comment-form {
  margin-top: 18rpx;
  display: flex;
  gap: 12rpx;
}

.comment-input {
  flex: 1;
  height: 72rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  background: #f3f4f6;
  font-size: 24rpx;
}

.comment-placeholder {
  color: #9ca3af;
}

.comment-send {
  min-width: 120rpx;
  height: 72rpx;
  line-height: 72rpx;
  border-radius: 999rpx;
  text-align: center;
  background: #36a4f2;
  color: #ffffff;
  font-size: 24rpx;
}
</style>
