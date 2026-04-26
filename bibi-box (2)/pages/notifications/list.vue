<template>
  <view class="page page-notifications">
    <view class="header">
      <text class="header-action" @tap="goBack">‹</text>
      <text class="header-title">提醒中心</text>
      <text class="header-action" @tap="markAllRead">全读</text>
    </view>

    <scroll-view scroll-y class="scroll" :show-scrollbar="false">
      <view v-if="items.length" class="list">
        <view class="notify-card" v-for="item in items" :key="item.id">
          <view class="notify-top">
            <text class="notify-title">{{ item.title }}</text>
            <text class="notify-time">{{ formatRelativeTime(item.createdAt) }}</text>
          </view>
          <text class="notify-content">{{ item.content || '暂无附加内容' }}</text>
          <view class="notify-meta">
            <text>{{ item.type }}</text>
            <text v-if="!item.readAt" class="notify-unread">未读</text>
          </view>
        </view>
      </view>
      <view v-else class="empty-card">暂时没有新的提醒。</view>
      <view style="height: 120rpx" />
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { request } from '../../utils/api.js'
import { refreshTabBadges } from '../../utils/badges.js'
import { formatRelativeTime } from '../../utils/format.js'

const items = ref([])

const loadNotifications = async () => {
  try {
    const response = await request({
      url: '/api/notifications'
    })
    items.value = response.items || []
    await refreshTabBadges()
  } catch (error) {
    console.error('[notifications:load]', error)
    uni.showToast({ title: '提醒加载失败', icon: 'none' })
  }
}

const markAllRead = async () => {
  try {
    await request({
      url: '/api/notifications/read-all',
      method: 'POST',
      data: {}
    })
    uni.showToast({ title: '已全部标记已读', icon: 'none' })
    await loadNotifications()
  } catch (error) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

const goBack = () => {
  uni.navigateBack({
    delta: 1
  })
}

onShow(() => {
  loadNotifications()
})
</script>

<style scoped>
.page-notifications {
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

.list {
  padding: 24rpx 32rpx 0;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.notify-card,
.empty-card {
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 30rpx rgba(15, 23, 42, 0.06);
}

.notify-card {
  padding: 24rpx;
}

.notify-top,
.notify-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.notify-title {
  flex: 1;
  font-size: 28rpx;
  font-weight: 700;
}

.notify-time,
.notify-meta {
  font-size: 22rpx;
  color: #94a3b8;
}

.notify-content {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: #475569;
}

.notify-meta {
  margin-top: 18rpx;
}

.notify-unread {
  color: #36a4f2;
}

.empty-card {
  margin: 24rpx 32rpx 0;
  padding: 40rpx 28rpx;
  text-align: center;
  font-size: 24rpx;
  color: #9ca3af;
}
</style>
