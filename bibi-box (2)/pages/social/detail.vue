<template>
  <view class="page page-detail">
    <!-- Header -->
    <view class="detail-header">
      <view class="header-side" @tap="goBack">
        <text class="header-icon">‹</text>
      </view>
      <text class="header-title">动态正文</text>
      <view class="header-side"></view>
    </view>

    <template v-if="post">
      <scroll-view scroll-y class="scroll" :show-scrollbar="false">
        <!-- Main Post Reference Weibo -->
        <view class="post-card">
        <view class="post-header">
          <view class="post-main" @tap="openProfile(post.author.id)">
            <image class="post-avatar" :src="resolveAssetUrl(post.author.avatarUrl)" mode="aspectFill" />
            <view class="post-user">
              <text class="post-name">{{ post.author.displayName }}</text>
              <text class="post-sub">{{ post.author.tagline }}</text>
            </view>
          </view>
          <view class="post-meta">
            <text class="post-time">{{ formatRelativeTime(post.publishedAt) }}</text>
            <view class="follow-btn" @tap="follow(post.author.id)">
              <text class="follow-text">+关注</text>
            </view>
          </view>
        </view>

        <view class="post-content-wrap">
          <text class="post-content">{{ post.content }}</text>
        </view>

        <view class="post-media" v-if="post.media && post.media.length > 0">
          <image class="post-image" :src="resolveAssetUrl(post.media[0].url)" mode="aspectFill" />
        </view>

        <view class="post-footer">
          <view class="footer-action" @tap="toggleLike">
            <image :src="resolveAssetUrl('/static/png/favorite/favorite-red.png')" mode="aspectFit" class="icon-small" />
            <text>{{ post.stats.likes }}</text>
          </view>
          <view class="footer-action">
            <image :src="resolveAssetUrl('/static/png/chat-bubble/Chat Bubble-blue.png')" mode="aspectFit" class="icon-small" />
            <text>{{ post.stats.comments }}</text>
          </view>
        </view>
      </view>

      <!-- Comments Divider -->
      <view class="comments-section">
        <view class="comments-divider">
          <text class="comments-title">全部评论</text>
          <text class="comments-count">{{ post.stats.comments }}</text>
        </view>

        <!-- Comments List -->
        <view class="comment-list" v-if="comments.length > 0">
          <view class="comment-item" v-for="comment in comments" :key="comment.id">
            <image class="comment-avatar" :src="resolveAssetUrl(comment.author.avatarUrl)" mode="aspectFill" @tap="openProfile(comment.author.id)" />
            <view class="comment-body">
              <text class="comment-name">{{ comment.author.displayName }}</text>
              <text class="comment-text">{{ comment.content }}</text>
              <text class="comment-time">{{ formatRelativeTime(comment.createdAt) }}</text>
            </view>
          </view>
        </view>
        <view class="comment-empty" v-else>
          <text>还没有人评论，快来抢沙发~</text>
        </view>

        <!-- Bottom padding for sticky input -->
        <view style="height: 140rpx;"></view>
      </view>
    </scroll-view>

    <!-- Sticky Bottom Comment Input Wrapper -->
    <view class="sticky-footer">
      <view class="comment-input-wrap">
        <input
          v-model="commentText"
          class="comment-input"
          type="text"
          placeholder="说点什么..."
          placeholder-class="comment-placeholder"
          @confirm="submitComment"
        />
        <text class="comment-send" :class="{ 'active': commentText.trim().length > 0 }" @tap="submitComment">发送</text>
      </view>
    </view>
  </template>
  <view class="loading-wrap" v-else>
    <text class="loading-text">加载中...</text>
  </view>
</view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { request, resolveAssetUrl } from '../../utils/api.js'
import { formatRelativeTime } from '../../utils/format.js'
import { ensureLogin } from '../../utils/session.js'

const postId = ref('')
const post = ref(null)
const comments = ref([])
const commentText = ref('')

const goBack = () => {
  uni.navigateBack()
}

const openProfile = (accountId) => {
  uni.navigateTo({
    url: `/pages/profile/detail?accountId=${accountId}`
  })
}

const follow = async (accountId) => {
  if (!ensureLogin(true)) return
  try {
    const response = await request({
      url: `/api/follows/${accountId}`,
      method: 'POST',
      data: {}
    })
    uni.showToast({ title: response.following ? '已关注' : '已取消关注', icon: 'none' })
  } catch (error) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

const toggleLike = async () => {
  if (!ensureLogin(true)) return
  try {
    const response = await request({
      url: `/api/posts/${postId.value}/like`,
      method: 'POST',
      data: {}
    })
    post.value.viewer = post.value.viewer || {}
    post.value.viewer.liked = response.liked
    post.value.stats.likes = response.totalLikes
  } catch (error) {
    uni.showToast({ title: '点赞失败', icon: 'none' })
  }
}

const fetchPostDetail = async () => {
  try {
    const response = await request({
      url: `/api/posts/${postId.value}`
    })
    post.value = response
  } catch (error) {
    console.error('[detail:fetchPost]', error)
    uni.showToast({ title: '动态加载失败', icon: 'none' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  }
}

const fetchComments = async () => {
  try {
    const response = await request({
      url: `/api/posts/${postId.value}/comments?pageSize=50`
    })
    comments.value = response.items || []
  } catch (error) {
    console.error('[detail:fetchComments]', error)
  }
}

const submitComment = async () => {
  if (!ensureLogin(true)) return
  if (!commentText.value.trim()) {
    uni.showToast({ title: '请输入内容', icon: 'none' })
    return
  }

  try {
    uni.showLoading({ title: '发送中...' })
    await request({
      url: `/api/posts/${postId.value}/comments`,
      method: 'POST',
      data: {
        content: commentText.value.trim()
      }
    })
    commentText.value = ''
    uni.hideLoading()
    uni.showToast({ title: '评论成功', icon: 'none' })

    // Increment local post stat so it renders instantly
    if (post.value) {
      post.value.stats.comments = (post.value.stats.comments || 0) + 1
    }
    // Refresh comment list to append immediately
    await fetchComments()
  } catch (error) {
    uni.hideLoading()
    console.error('[detail:submitComment]', error)
    uni.showToast({ title: '发送失败', icon: 'none' })
  }
}

onLoad((options) => {
  if (!options.id) {
    uni.showToast({ title: '动态参数错误', icon: 'none' })
    uni.navigateBack()
    return
  }
  postId.value = options.id
  fetchPostDetail()
  fetchComments()
})
</script>

<style scoped>
.page-detail {
  background-color: #f6f7f8;
  min-height: 100vh;
  position: relative;
}

.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60vh;
}

.loading-text {
  color: #94a3b8;
  font-size: 28rpx;
}

.detail-header {
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
  margin-left: -20rpx;
}

.header-icon {
  font-size: 56rpx;
  color: #1e293b;
  font-weight: 300;
}

.header-title {
  font-size: 32rpx;
  font-weight: 700;
  flex: 1;
  text-align: center;
}

.scroll {
  height: calc(100vh - 112rpx);
}

.post-card {
  background: #ffffff;
  padding: 32rpx;
  margin-bottom: 24rpx;
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
  background: #f3f4f6;
}

.post-user {
  flex: 1;
  padding: 0 16rpx;
  display: flex;
  flex-direction: column;
}

.post-name {
  font-size: 28rpx;
  font-weight: 700;
  color: #1e293b;
}

.post-sub {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #94a3b8;
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.post-time {
  font-size: 24rpx;
  color: #94a3b8;
}

.follow-btn {
  min-width: 112rpx;
  padding: 12rpx 0;
  background: rgba(54, 164, 242, 0.1);
  border-radius: 999rpx;
  text-align: center;
}

.follow-text {
  color: #36a4f2;
  font-size: 24rpx;
}

.post-content-wrap {
  margin-top: 24rpx;
}

.post-content {
  font-size: 30rpx;
  line-height: 1.6;
  color: #0f172a;
}

.post-media {
  margin-top: 20rpx;
}

.post-image {
  width: 100%;
  height: 480rpx;
  border-radius: 20rpx;
  background: #f3f4f6;
}

.post-footer {
  margin-top: 32rpx;
  display: flex;
  align-items: center;
  font-size: 24rpx;
  color: #64748b;
  padding-top: 24rpx;
  border-top: 1rpx solid #f1f5f9;
}

.footer-action {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12rpx;
}

.icon-small {
  width: 36rpx;
  height: 36rpx;
}

.comments-section {
  background: #ffffff;
  min-height: 50vh;
}

.comments-divider {
  padding: 32rpx;
  border-bottom: 1rpx solid #f1f5f9;
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}

.comments-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #0f172a;
}

.comments-count {
  font-size: 26rpx;
  color: #94a3b8;
}

.comment-list {
  padding: 0 32rpx;
}

.comment-item {
  display: flex;
  padding: 32rpx 0;
  border-bottom: 1rpx solid #f8fafc;
}

.comment-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 999rpx;
  background: #f3f4f6;
  margin-right: 16rpx;
}

.comment-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.comment-name {
  font-size: 26rpx;
  color: #64748b;
  font-weight: 600;
}

.comment-text {
  font-size: 28rpx;
  color: #1e293b;
  margin-top: 12rpx;
  line-height: 1.5;
}

.comment-time {
  font-size: 22rpx;
  color: #cbd5e1;
  margin-top: 12rpx;
}

.comment-empty {
  padding: 80rpx 0;
  text-align: center;
  font-size: 28rpx;
  color: #cbd5e1;
}

/* Sticky bottom footer */
.sticky-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background: #ffffff;
  border-top: 1rpx solid #e2e8f0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  z-index: 100;
}

.comment-input-wrap {
  background: #f1f5f9;
  border-radius: 999rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  padding: 0 16rpx 0 32rpx;
}

.comment-input {
  flex: 1;
  font-size: 28rpx;
  color: #0f172a;
  height: 100%;
}

.comment-placeholder {
  color: #94a3b8;
}

.comment-send {
  font-size: 28rpx;
  color: #94a3b8;
  font-weight: 600;
  padding: 16rpx 32rpx;
  border-radius: 999rpx;
}

.comment-send.active {
  color: #ffffff;
  background: #36a4f2;
}
</style>
