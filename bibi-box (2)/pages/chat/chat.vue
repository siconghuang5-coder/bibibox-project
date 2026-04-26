<template>
  <view class="page page-chat">
    <view class="chat-header">
      <text class="chat-title">聊天</text>
      <view class="chat-header-actions">
        <text class="chat-header-icon" @tap="refreshList">↻</text>
        <text class="chat-header-icon" @tap="goAssets">＋</text>
      </view>
    </view>

    <view class="chat-search-wrap">
      <view class="chat-search">
        <image class="chat-search-icon" :src="resolveAssetUrl('/static/png/search/search.png')" mode="aspectFit" />
        <input
          v-model="query"
          class="chat-search-input"
          type="text"
          placeholder="搜索联系人或AI角色"
          placeholder-class="chat-search-placeholder"
        />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :show-scrollbar="false">
      <view v-if="ownedDigitalHumans.length" class="pin-ai">
        <view class="pin-ai-inner">
          <view class="avatar-status">
            <image class="avatar-img" :src="resolveAssetUrl(ownedDigitalHumans[0].avatarUrl)" mode="aspectFill" />
            <view class="status-dot" />
          </view>
          <view class="pin-ai-text">
            <view class="row">
              <text class="name">
                {{ ownedDigitalHumans[0].displayName }}
                <text class="tag">AI</text>
              </text>
              <text class="time">已拥有</text>
            </view>
            <text class="preview primary">{{ ownedDigitalHumans[0].tagline || '随时可以开始聊天' }}</text>
          </view>
        </view>
      </view>

      <view class="section">
        <text class="section-title">最近会话</text>
      </view>
      <view class="chat-list" v-if="filteredItems.length">
        <view class="chat-item" v-for="item in filteredItems" :key="item.id" @tap="openConversation(item.id)">
          <view class="avatar">
            <image class="avatar-img" :src="resolveAssetUrl(item.digitalHuman.avatarUrl)" mode="aspectFill" />
          </view>
          <view class="item-main">
            <view class="row">
              <text class="name">{{ item.digitalHuman.displayName }}</text>
              <text class="time">{{ formatRelativeTime(item.lastMessageAt) }}</text>
            </view>
            <view class="row">
              <text class="preview">{{ item.lastMessagePreview || item.digitalHuman.tagline || '开始新的聊天吧' }}</text>
              <view class="unread-dot" v-if="item.unreadCount > 0">
                <text class="unread-text">{{ item.unreadCount > 99 ? '99+' : item.unreadCount }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
      <view v-else class="empty-card">还没有会话，去资产页挑一个已拥有数字人开始聊天吧。</view>

      <view class="section">
        <text class="section-title">发现数字人</text>
      </view>
      <view class="discover-list">
        <view class="discover-card" v-for="item in filteredDiscover" :key="item.id" @tap="startConversation(item.id)">
          <image class="discover-avatar" :src="resolveAssetUrl(item.avatarUrl)" mode="aspectFill" />
          <view class="discover-main">
            <text class="discover-name">{{ item.displayName }}</text>
            <text class="discover-tagline">{{ item.tagline }}</text>
          </view>
          <view class="discover-btn">{{ item.isOwned ? '进入' : '试聊' }}</view>
        </view>
      </view>

      <view style="height: 140rpx" />
    </scroll-view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { request, resolveAssetUrl } from '../../utils/api.js'
import { refreshTabBadges } from '../../utils/badges.js'
import { formatRelativeTime } from '../../utils/format.js'
import { ensureLogin } from '../../utils/session.js'

const query = ref('')
const items = ref([])
const ownedDigitalHumans = ref([])
const discover = ref([])

const filterList = (list, mapper) => {
  const keyword = query.value.trim().toLowerCase()
  if (!keyword) return list
  return list.filter((item) => {
    const target = mapper(item).toLowerCase()
    return target.includes(keyword)
  })
}

const filteredItems = computed(() =>
  filterList(items.value, (item) => `${item.digitalHuman.displayName} ${item.lastMessagePreview || ''}`)
)
// NOTE: 过滤掉薇薇安和星野樱，不在发现列表中展示
const HIDDEN_DISCOVER_NAMES = new Set(['薇薇安', '星野樱'])
const filteredDiscover = computed(() => {
  const visible = discover.value.filter((item) => !HIDDEN_DISCOVER_NAMES.has(item.displayName))
  return filterList(visible, (item) => `${item.displayName} ${item.tagline || ''}`)
})

const refreshList = async () => {
  try {
    const response = await request({
      url: '/api/chat/conversations'
    })
    items.value = response.items || []
    ownedDigitalHumans.value = response.ownedDigitalHumans || []
    discover.value = response.discover || []
    await refreshTabBadges()
  } catch (error) {
    console.error('[chat:refreshList]', error)
    uni.showToast({ title: '聊天列表加载失败', icon: 'none' })
  }
}

const openConversation = (id) => {
  uni.navigateTo({
    url: `/pages/chat/detail?id=${id}`
  })
}

const startConversation = async (digitalHumanAccountId) => {
  try {
    const response = await request({
      url: '/api/chat/conversations',
      method: 'POST',
      data: {
        digitalHumanAccountId
      }
    })
    openConversation(response.id)
  } catch (error) {
    uni.showToast({ title: '创建会话失败', icon: 'none' })
  }
}

const goAssets = () => {
  uni.navigateTo({
    url: '/pages/assets/assets'
  })
}

onShow(() => {
  if (!ensureLogin()) {
    return
  }
  refreshList()
})
</script>

<style scoped>
.page-chat {
  background-color: #ffffff;
  min-height: 100vh;
}

.chat-header {
  position: sticky;
  top: 0;
  z-index: 10;
  height: 96rpx;
  padding: 0 32rpx;
  background-color: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(16rpx);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chat-title {
  font-size: 32rpx;
  font-weight: 600;
}

.chat-header-actions {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.chat-header-icon {
  font-size: 30rpx;
  color: #6b7280;
}

.chat-search-wrap {
  padding: 0 32rpx 16rpx;
  background-color: #ffffff;
}

.chat-search {
  position: relative;
  border-radius: 16rpx;
  background-color: #f3f4f6;
  padding-left: 64rpx;
  padding-right: 24rpx;
}

.chat-search-icon {
  position: absolute;
  left: 24rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 28rpx;
  height: 28rpx;
}

.chat-search-input {
  height: 72rpx;
  font-size: 24rpx;
}

.chat-search-placeholder {
  color: #9ca3af;
}

.scroll {
  height: calc(100vh - 176rpx);
}

.pin-ai {
  padding: 8rpx 24rpx 4rpx;
}

.pin-ai-inner {
  padding: 16rpx 20rpx;
  border-radius: 20rpx;
  background-color: rgba(54, 164, 242, 0.06);
  border-width: 1rpx;
  border-style: solid;
  border-color: rgba(54, 164, 242, 0.15);
  display: flex;
  align-items: center;
}

.avatar-status,
.avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 999rpx;
  overflow: hidden;
  position: relative;
  margin-right: 20rpx;
}

.avatar-img,
.discover-avatar {
  width: 100%;
  height: 100%;
}

.status-dot {
  position: absolute;
  width: 18rpx;
  height: 18rpx;
  border-radius: 999rpx;
  background-color: #22c55e;
  border-width: 4rpx;
  border-style: solid;
  border-color: #ffffff;
  bottom: 4rpx;
  right: 4rpx;
}

.pin-ai-text,
.item-main {
  flex: 1;
  margin-left: 24rpx;
}

.discover-main {
  flex: 1;
  margin-left: 24rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.name {
  font-size: 26rpx;
  font-weight: 600;
}

.tag {
  margin-left: 8rpx;
  font-size: 18rpx;
  padding: 4rpx 10rpx;
  border-radius: 10rpx;
  background-color: rgba(54, 164, 242, 0.16);
  color: #36a4f2;
}

.time {
  font-size: 20rpx;
  color: #9ca3af;
}

.preview {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #9ca3af;
}

.preview.primary {
  color: #36a4f2;
}

.section {
  padding: 20rpx 32rpx 10rpx;
}

.section-title {
  font-size: 24rpx;
  font-weight: 700;
  color: #64748b;
}

.chat-list {
  padding: 0 24rpx;
}

.chat-item {
  flex-direction: row;
  align-items: center;
  padding: 20rpx 8rpx;
  display: flex;
  border-bottom-width: 1rpx;
  border-bottom-style: solid;
  border-bottom-color: #f3f4f6;
}

.unread-dot {
  min-width: 36rpx;
  height: 36rpx;
  padding: 0 10rpx;
  border-radius: 999rpx;
  background-color: #36a4f2;
  align-items: center;
  justify-content: center;
  display: flex;
}

.unread-text {
  font-size: 18rpx;
  color: #ffffff;
}

.discover-list {
  padding: 0 32rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.discover-card,
.empty-card {
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 30rpx rgba(15, 23, 42, 0.06);
}

.discover-card {
  padding: 20rpx;
  display: flex;
  align-items: center;
}

.discover-avatar {
  width: 92rpx;
  height: 92rpx;
  border-radius: 20rpx;
  background: #f3f4f6;
}

.discover-info {
  flex: 1;
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.discover-name {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #0f172a;
}

.discover-tagline {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #64748b;
}

.discover-btn {
  min-width: 96rpx;
  padding: 14rpx 18rpx;
  border-radius: 999rpx;
  text-align: center;
  font-size: 22rpx;
  color: #36a4f2;
  background: rgba(54, 164, 242, 0.1);
}

.empty-card {
  margin: 0 32rpx;
  padding: 36rpx 28rpx;
  text-align: center;
  font-size: 24rpx;
  color: #9ca3af;
}
</style>
