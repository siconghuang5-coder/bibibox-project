<template>
  <view class="page page-product">
    <view class="header">
      <text class="header-action" @tap="goBack">‹</text>
      <text class="header-title">商品详情</text>
      <text class="header-action" @tap="openCart">购物车</text>
    </view>

    <scroll-view scroll-y class="scroll" :show-scrollbar="false">
      <view v-if="product" class="content">
        <image class="hero" :src="product.coverUrl" mode="aspectFill" />

        <view class="summary-card">
          <view class="summary-top">
            <view>
              <text class="product-name">{{ product.name }}</text>
              <text class="product-subtitle">{{ product.subtitle }}</text>
            </view>
            <text class="product-price">{{ formatCoins(product.priceCoins) }} 币</text>
          </view>
          <text class="product-description">{{ product.description || '暂无更多介绍。' }}</text>
          <view class="meta-row">
            <text class="meta-chip">{{ product.productType }}</text>
            <text class="meta-chip">{{ product.status }}</text>
            <text class="meta-chip" v-if="product.badge">{{ product.badge }}</text>
          </view>
        </view>

        <view v-if="product.relatedAccount" class="human-card" @tap="openProfile(product.relatedAccount.id)">
          <image class="human-avatar" :src="resolveAssetUrl(product.relatedAccount.avatarUrl)" mode="aspectFill" />
          <view class="human-main">
            <text class="human-name">{{ product.relatedAccount.displayName }}</text>
            <text class="human-tagline">{{ product.relatedAccount.tagline }}</text>
          </view>
          <text class="human-link">主页</text>
        </view>

        <view class="wallet-card">
          <text class="wallet-label">当前余额</text>
          <text class="wallet-value">{{ formatCoins(wallet.balanceCoins) }} 币</text>
        </view>

        <view style="height: 160rpx" />
      </view>
    </scroll-view>

    <view class="footer" v-if="product">
      <view class="footer-price">
        <text class="footer-label">立即购买</text>
        <text class="footer-value">{{ formatCoins(product.priceCoins) }} 币</text>
      </view>
      <view class="footer-actions">
        <button class="footer-btn secondary" @tap="addToCart">加入购物车</button>
        <button class="footer-btn" @tap="buyNow">直接购买</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { request, resolveAssetUrl } from '../../utils/api.js'
import { formatCoins } from '../../utils/format.js'

const product = ref(null)
const wallet = ref({
  balanceCoins: 0
})

const loadDetail = async (id) => {
  try {
    const response = await request({
      url: `/api/products/${id}`
    })
    wallet.value = response.wallet || { balanceCoins: 0 }
    product.value = response.product
      ? {
          ...response.product,
          coverUrl: resolveAssetUrl(response.product.coverUrl)
        }
      : null
  } catch (error) {
    console.error('[product:loadDetail]', error)
    uni.showToast({ title: '商品加载失败', icon: 'none' })
  }
}

const addToCart = async () => {
  try {
    await request({
      url: '/api/cart/items',
      method: 'POST',
      data: {
        productId: product.value.id,
        quantity: Math.max(1, product.value.cartQuantity || 1)
      }
    })
    uni.showToast({ title: '已加入购物车', icon: 'none' })
  } catch (error) {
    uni.showToast({ title: error.message || '加入失败', icon: 'none' })
  }
}

const buyNow = async () => {
  try {
    await request({
      url: '/api/orders/checkout',
      method: 'POST',
      data: {
        items: [
          {
            productId: product.value.id,
            quantity: 1
          }
        ]
      }
    })
    uni.showToast({ title: '购买成功', icon: 'none' })
    uni.navigateTo({
      url: '/pages/assets/assets'
    })
  } catch (error) {
    uni.showToast({ title: error.message || '购买失败', icon: 'none' })
  }
}

const openProfile = (accountId) => {
  uni.navigateTo({
    url: `/pages/profile/detail?accountId=${accountId}`
  })
}

const openCart = () => {
  uni.switchTab({
    url: '/pages/market/market'
  })
}

const goBack = () => {
  uni.navigateBack({
    delta: 1
  })
}

onLoad((options) => {
  if (options?.id) {
    loadDetail(options.id)
  }
})
</script>

<style scoped>
.page-product {
  min-height: 100vh;
  background: #f6f7f8;
}

.header,
.footer {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 10;
  background: rgba(246, 247, 248, 0.96);
}

.header {
  top: 0;
  height: 96rpx;
  padding: 0 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  height: 100vh;
}

.content {
  padding-top: 96rpx;
}

.hero {
  width: 100%;
  height: 520rpx;
  background: #e5e7eb;
}

.summary-card,
.wallet-card,
.human-card {
  margin: 24rpx 32rpx 0;
  border-radius: 28rpx;
  background: #ffffff;
  box-shadow: 0 12rpx 30rpx rgba(15, 23, 42, 0.06);
}

.summary-card {
  padding: 28rpx;
}

.summary-top {
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
}

.product-name {
  font-size: 36rpx;
  font-weight: 800;
}

.product-subtitle {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #6b7280;
}

.product-price {
  font-size: 30rpx;
  color: #36a4f2;
  font-weight: 800;
}

.product-description {
  margin-top: 24rpx;
  font-size: 24rpx;
  line-height: 1.75;
  color: #334155;
}

.meta-row {
  margin-top: 20rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.meta-chip {
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(54, 164, 242, 0.08);
  color: #36a4f2;
  font-size: 22rpx;
}

.human-card {
  padding: 20rpx;
  display: flex;
  align-items: center;
}

.human-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 20rpx;
  background: #f3f4f6;
}

.human-main {
  flex: 1;
  padding: 0 18rpx;
}

.human-name {
  font-size: 28rpx;
  font-weight: 700;
}

.human-tagline {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #9ca3af;
}

.human-link {
  font-size: 22rpx;
  color: #36a4f2;
}

.wallet-card {
  padding: 24rpx 28rpx;
}

.wallet-label {
  font-size: 22rpx;
  color: #94a3b8;
}

.wallet-value {
  display: block;
  margin-top: 10rpx;
  font-size: 38rpx;
  font-weight: 800;
}

.footer {
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 32rpx 32rpx;
  border-top: 1rpx solid #e5e7eb;
}

.footer-price {
  display: flex;
  flex-direction: column;
}

.footer-label {
  font-size: 22rpx;
  color: #94a3b8;
}

.footer-value {
  margin-top: 6rpx;
  font-size: 30rpx;
  font-weight: 800;
}

.footer-actions {
  display: flex;
  gap: 12rpx;
}

.footer-btn {
  border: none;
  border-radius: 999rpx;
  padding: 0 28rpx;
  height: 72rpx;
  line-height: 72rpx;
  background: #36a4f2;
  color: #ffffff;
  font-size: 24rpx;
}

.footer-btn.secondary {
  background: rgba(54, 164, 242, 0.1);
  color: #36a4f2;
}
</style>
