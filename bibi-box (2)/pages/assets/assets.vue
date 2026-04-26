<template>
  <view class="page page-assets">
    <view class="header">
      <text class="header-action" @tap="goBack">‹</text>
      <text class="header-title">我的资产</text>
      <text class="header-action" @tap="goOrders">订单</text>
    </view>

    <scroll-view scroll-y class="scroll" :show-scrollbar="false">
      <view class="wallet-card">
        <text class="wallet-label">钱包余额</text>
        <text class="wallet-value">{{ formatCoins(wallet.balanceCoins) }} 币</text>
        <view class="wallet-actions">
          <view class="wallet-btn" @tap="recharge">充值 1000 币</view>
          <view class="wallet-btn secondary" @tap="goOrders">查看订单</view>
        </view>
      </view>

      <view class="section">
        <view class="section-head">
          <text class="section-title">已拥有的数字人</text>
          <text class="section-link">{{ digitalHumans.length }} 个</text>
        </view>
        <view v-if="digitalHumans.length" class="human-grid">
          <view class="human-card" v-for="item in digitalHumans" :key="item.accountId" @tap="openChat(item.accountId)">
            <image class="human-avatar" :src="resolveAssetUrl(item.avatarUrl)" mode="aspectFill" />
            <text class="human-name">{{ item.displayName }}</text>
            <text class="human-tagline">{{ item.tagline }}</text>
            <view class="human-btn">开始聊天</view>
          </view>
        </view>
        <view v-else class="empty-card">还没有数字人资产，先去市场看看吧。</view>
      </view>

      <view class="section">
        <view class="section-head">
          <text class="section-title">持仓</text>
          <text class="section-link">{{ holdings.length }} 项</text>
        </view>
        <view v-if="holdings.length" class="holding-list">
          <view class="holding-item" v-for="item in holdings" :key="item.id">
            <image class="holding-cover" :src="resolveAssetUrl(item.coverUrl)" mode="aspectFill" />
            <view class="holding-info">
              <text class="holding-title">{{ item.title }}</text>
              <text class="holding-subtitle">{{ item.subtitle || item.assetType }}</text>
            </view>
            <text class="holding-qty">x{{ item.quantity }}</text>
          </view>
        </view>
        <view v-else class="empty-card">暂无额外持仓记录。</view>
      </view>

      <view class="section">
        <view class="section-head">
          <text class="section-title">最近订单</text>
          <text class="section-link" @tap="goOrders">全部订单</text>
        </view>
        <view v-if="orders.length" class="order-list">
          <view class="order-card" v-for="item in orders.slice(0, 6)" :key="item.id">
            <view class="order-row">
              <text class="order-id">订单 {{ item.id.slice(-8) }}</text>
              <text class="order-status">{{ item.status }}</text>
            </view>
            <view class="order-items">
              <text class="order-item-text" v-for="goods in item.items" :key="goods.id">
                {{ goods.productName }} x{{ goods.quantity }}
              </text>
            </view>
            <view class="order-row">
              <text class="order-time">{{ formatDateTime(item.createdAt) }}</text>
              <text class="order-total">{{ formatCoins(item.totalCoins) }} 币</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-card">还没有订单记录。</view>
      </view>

      <view style="height: 120rpx" />
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { request, resolveAssetUrl } from '../../utils/api.js'
import { formatCoins, formatDateTime } from '../../utils/format.js'

const wallet = ref({
  balanceCoins: 0
})
const digitalHumans = ref([])
const holdings = ref([])
const orders = ref([])

const loadAssets = async () => {
  try {
    const response = await request({
      url: '/api/assets'
    })
    wallet.value = response.wallet || { balanceCoins: 0 }
    digitalHumans.value = response.digitalHumans || []
    holdings.value = response.holdings || []
    orders.value = response.orders || []
  } catch (error) {
    console.error('[assets:loadAssets]', error)
    uni.showToast({ title: '资产加载失败', icon: 'none' })
  }
}

const recharge = async () => {
  try {
    await request({
      url: '/api/wallet/recharge',
      method: 'POST',
      data: {
        amountCoins: 1000
      }
    })
    uni.showToast({ title: '已充值 1000 币', icon: 'none' })
    await loadAssets()
  } catch (error) {
    uni.showToast({ title: '充值失败', icon: 'none' })
  }
}

const openChat = async (digitalHumanAccountId) => {
  try {
    const response = await request({
      url: '/api/chat/conversations',
      method: 'POST',
      data: {
        digitalHumanAccountId
      }
    })
    uni.navigateTo({
      url: `/pages/chat/detail?id=${response.id}`
    })
  } catch (error) {
    uni.showToast({ title: '打开会话失败', icon: 'none' })
  }
}

const goBack = () => {
  uni.navigateBack({
    delta: 1
  })
}

const goOrders = () => {
  uni.navigateTo({
    url: '/pages/orders/orders'
  })
}

onShow(() => {
  loadAssets()
})
</script>

<style scoped>
.page-assets {
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

.wallet-card {
  margin: 24rpx 32rpx 0;
  border-radius: 28rpx;
  padding: 28rpx;
  background: linear-gradient(135deg, #4ab3ff, #7dd3fc);
  color: #ffffff;
  box-shadow: 0 24rpx 50rpx rgba(54, 164, 242, 0.22);
}

.wallet-label {
  font-size: 24rpx;
  opacity: 0.88;
}

.wallet-value {
  display: block;
  margin-top: 12rpx;
  font-size: 50rpx;
  font-weight: 800;
}

.wallet-actions {
  margin-top: 28rpx;
  display: flex;
  gap: 16rpx;
}

.wallet-btn {
  flex: 1;
  padding: 18rpx 0;
  border-radius: 18rpx;
  text-align: center;
  background: rgba(255, 255, 255, 0.22);
  font-size: 24rpx;
}

.wallet-btn.secondary {
  background: rgba(15, 23, 42, 0.16);
}

.section {
  padding: 24rpx 32rpx 0;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 800;
}

.section-link {
  font-size: 22rpx;
  color: #36a4f2;
}

.human-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20rpx;
}

.human-card,
.order-card,
.holding-item,
.empty-card {
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 30rpx rgba(15, 23, 42, 0.06);
}

.human-card {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
}

.human-avatar {
  width: 100%;
  height: 220rpx;
  border-radius: 20rpx;
  background: #e5e7eb;
}

.human-name {
  margin-top: 16rpx;
  font-size: 28rpx;
  font-weight: 700;
}

.human-tagline {
  margin-top: 8rpx;
  min-height: 64rpx;
  font-size: 22rpx;
  line-height: 1.5;
  color: #6b7280;
}

.human-btn {
  margin-top: 16rpx;
  padding: 14rpx 0;
  border-radius: 999rpx;
  text-align: center;
  color: #ffffff;
  background: #36a4f2;
  font-size: 22rpx;
}

.holding-list,
.order-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.holding-item {
  padding: 18rpx;
  display: flex;
  align-items: center;
}

.holding-cover {
  width: 96rpx;
  height: 96rpx;
  border-radius: 18rpx;
  background: #f3f4f6;
}

.holding-info {
  flex: 1;
  padding: 0 16rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.holding-title {
  font-size: 26rpx;
  font-weight: 700;
}

.holding-subtitle {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #9ca3af;
}

.holding-qty {
  font-size: 24rpx;
  color: #36a4f2;
}

.order-card {
  padding: 24rpx;
}

.order-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.order-id,
.order-total {
  font-size: 24rpx;
  font-weight: 700;
}

.order-status,
.order-time {
  font-size: 22rpx;
  color: #9ca3af;
}

.order-items {
  padding: 14rpx 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.order-item-text {
  font-size: 24rpx;
  color: #334155;
}

.empty-card {
  padding: 36rpx 28rpx;
  text-align: center;
  font-size: 24rpx;
  color: #9ca3af;
}
</style>
