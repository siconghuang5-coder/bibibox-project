<template>
  <view class="page page-orders">
    <view class="header">
      <text class="header-action" @tap="goBack">‹</text>
      <text class="header-title">我的订单</text>
      <text class="header-action" @tap="refreshOrders">刷新</text>
    </view>

    <scroll-view scroll-y class="scroll" :show-scrollbar="false">
      <view class="list" v-if="orders.length">
        <view class="order-card" v-for="item in orders" :key="item.id">
          <view class="order-top">
            <text class="order-id">订单 {{ item.id.slice(-8) }}</text>
            <text class="order-status">{{ item.status }}</text>
          </view>
          <view class="goods-list">
            <view class="goods-item" v-for="goods in item.items" :key="goods.id">
              <image class="goods-cover" :src="resolveAssetUrl(goods.coverUrl)" mode="aspectFill" />
              <view class="goods-info">
                <text class="goods-name">{{ goods.productName }}</text>
                <text class="goods-sub">{{ goods.productType }}</text>
              </view>
              <view class="goods-right">
                <text class="goods-price">{{ formatCoins(goods.unitCoins) }} 币</text>
                <text class="goods-qty">x{{ goods.quantity }}</text>
              </view>
            </view>
          </view>
          <view class="order-bottom">
            <text class="order-time">{{ formatDateTime(item.createdAt) }}</text>
            <text class="order-total">合计 {{ formatCoins(item.totalCoins) }} 币</text>
          </view>
        </view>
      </view>
      <view v-else class="empty-card">还没有订单，先去市场选点喜欢的内容吧。</view>
      <view style="height: 120rpx" />
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { request, resolveAssetUrl } from '../../utils/api.js'
import { formatCoins, formatDateTime } from '../../utils/format.js'

const orders = ref([])

const refreshOrders = async () => {
  try {
    const response = await request({
      url: '/api/orders'
    })
    orders.value = response.items || []
  } catch (error) {
    console.error('[orders:refresh]', error)
    uni.showToast({ title: '订单加载失败', icon: 'none' })
  }
}

const goBack = () => {
  uni.navigateBack({
    delta: 1
  })
}

onShow(() => {
  refreshOrders()
})
</script>

<style scoped>
.page-orders {
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

.order-card,
.empty-card {
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: 0 12rpx 30rpx rgba(15, 23, 42, 0.06);
}

.order-card {
  padding: 24rpx;
}

.order-top,
.order-bottom {
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

.goods-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 20rpx 0;
}

.goods-item {
  display: flex;
  align-items: center;
}

.goods-cover {
  width: 96rpx;
  height: 96rpx;
  border-radius: 18rpx;
  background: #f3f4f6;
}

.goods-info {
  flex: 1;
  padding: 0 16rpx;
}

.goods-name {
  font-size: 26rpx;
  font-weight: 700;
}

.goods-sub,
.goods-qty {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #9ca3af;
}

.goods-right {
  align-items: flex-end;
  display: flex;
  flex-direction: column;
}

.goods-price {
  font-size: 24rpx;
  color: #36a4f2;
  font-weight: 700;
}

.empty-card {
  margin: 24rpx 32rpx 0;
  padding: 40rpx 28rpx;
  text-align: center;
  font-size: 24rpx;
  color: #9ca3af;
}
</style>
