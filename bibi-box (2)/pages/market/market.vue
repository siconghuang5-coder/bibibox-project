<template>
  <view class="page page-market">
    <!-- 顶部栏 -->
    <view class="header">
      <view class="header-btn" @tap="handleScrollToTop">
        <image class="header-icon-img" :src="resolveAssetUrl('/static/arrow-up.png')" mode="aspectFit" />
        <text class="header-text-small">回到顶部</text>
      </view>
      <text class="header-title">Bibi Box 商城</text>
      <view class="header-btn" style="position: relative;" @tap="toggleCart">
        <view class="cart-badge" v-if="cartTotalQty > 0">{{ cartTotalQty }}</view>
        <image class="header-icon-img" :src="resolveAssetUrl('/static/png/shopping-cart/shopping-cart-fill.png')" mode="aspectFit" />
        <text class="header-text-small">购物车</text>
      </view>

    </view>

    <!-- 购物车背景遮罩，移至顶层避免受到 sticky 的高度裁剪导致外部无法点击关闭 -->
    <view class="cart-mask" v-if="showCart" @tap="showCart = false" @touchmove.stop.prevent></view>

    <!-- 购物车下拉面板，同步移至顶层，改为 fixed 定位 -->
    <view class="cart-dropdown" v-if="showCart" @tap.stop>
      <view v-if="cartList.length === 0" class="cart-empty">购物车为空</view>
      <view v-else>
        <view class="cart-list">
          <view class="cart-item" v-for="item in cartList" :key="item.id">
            <image v-if="item.coverUrl" class="cart-item-img" :src="item.coverUrl" mode="aspectFill" />
            <view v-else class="cart-item-icon-wrap"><text>🛍</text></view>

            <view class="cart-item-info">
              <text class="cart-item-name">{{ item.name }}</text>
              <text class="cart-item-price">{{ item.priceCoins }} 币</text>
            </view>

            <view class="cart-item-actions">
              <view class="qty-btn" @tap.stop="decreaseQty(item)">-</view>
              <text class="qty-text">{{ item.quantity }}</text>
              <view class="qty-btn" @tap.stop="increaseQty(item)">+</view>
            </view>
          </view>
        </view>
        <view class="cart-footer">
          <view class="cart-summary">
            <text class="cart-total-original">总价格：{{ formatCoins(cartTotalPrice) }} 币</text>
            <text class="cart-total-discount">当前余额：{{ formatCoins(walletBalance) }} 币</text>
          </view>
          <button class="checkout-btn" @tap="checkout">前往结账</button>
        </view>
      </view>
    </view>

    <!-- 搜索与余额 -->
    <scroll-view
      scroll-y
      class="scroll"
      :show-scrollbar="false"
      :scroll-top="scrollTop"
      scroll-with-animation
      @scroll="onScroll"
    >
      <view class="section search-section">
        <view class="search-box">
          <image class="search-icon-img" :src="resolveAssetUrl('/static/search.png')" mode="aspectFit" />
          <input
            v-model="query"
            class="search-input"
            type="text"
            placeholder="搜索AI伴侣与产品..."
            placeholder-class="search-placeholder"
          />
        </view>

        <view class="balance-card">
          <view class="balance-row">
            <view @tap="openAssets">
              <text class="balance-label">账户余额 (BIBI)</text>
              <text class="balance-value">{{ formatCoins(walletBalance) }}</text>
            </view>
            <view class="balance-btn" @tap="rechargeWallet">
              <text class="balance-btn-text">充值</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 数字人 2x2 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">热门数字人推荐</text>
        </view>

        <view class="section-content-box">
          <view class="box-header">
            <text class="section-subtitle">寻找你的理想 AI 伙伴</text>
            <view class="section-link">
              <text class="section-link-text">查看更多</text>
            </view>
          </view>
          <view class="grid-2">
            <view class="avatar-card" v-for="item in filteredAvatars" :key="item.id" @tap="openProduct(item.id)">
              <image class="avatar-img" :src="item.coverUrl" mode="aspectFill" />
              <view class="avatar-gradient" />
              <view class="avatar-info">
                <text class="avatar-name">{{ item.name }}</text>
                <text class="avatar-role">{{ item.subtitle }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- AI 礼物 横向滑动 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">精选数字人礼物</text>
        </view>

        <view class="section-content-box">
          <view class="box-header">
            <text class="section-subtitle">送出一份特别的数字惊喜</text>
            <view class="section-link">
              <text class="section-link-text">查看更多</text>
            </view>
          </view>
          <scroll-view scroll-x class="h-scroll" :show-scrollbar="false">
            <view class="gift-card" v-for="gift in filteredGifts" :key="gift.id" @tap="openProduct(gift.id)">
              <view class="gift-inner" :class="gift.bgClass">
                <view class="gift-light" />
                <image class="gift-icon-img" :src="gift.coverUrl" mode="aspectFill" />
                <view>
                  <text class="gift-title">{{ gift.name }}</text>
                </view>
              </view>
              <view class="gift-meta">
                <view style="position: relative; width: 100%; height: 40rpx; margin-top: 12rpx;">
                  <text class="gift-meta-price" style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); margin: 0;">{{ gift.priceCoins }} 币</text>
                  <image :src="resolveAssetUrl('/static/png/add-circle/add-circle-blue.png')" style="position: absolute; right: 8rpx; top: 50%; transform: translateY(-50%); width: 36rpx; height: 36rpx;" @tap.stop="addToCart(gift)" />
                </view>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>

      <!-- 精选商品 横向滑动 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">数字人陪伴产品</text>
        </view>

        <view class="section-content-box">
          <view class="box-header">
            <text class="section-subtitle">为你挑选的人气好物</text>
            <view class="section-link">
              <text class="section-link-text">查看更多</text>
            </view>
          </view>
          <scroll-view scroll-x class="h-scroll" :show-scrollbar="false">
            <view class="product-card" v-for="product in filteredProducts" :key="product.id" @tap="openProduct(product.id)">
              <view class="product-img-wrap">
                <image class="product-img" :src="product.coverUrl" mode="aspectFill" />
              </view>
              <view class="product-meta">
                <view class="product-name">
                  <text class="product-name-strong">{{ product.name }}</text>
                  <text class="product-name-sub">{{ product.subtitle }}</text>
                </view>
                <view style="position: relative; width: 100%; height: 48rpx; margin-top: 8rpx;">
                  <text class="product-price" style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); margin: 0;">{{ product.priceCoins }} 币</text>
                  <image :src="resolveAssetUrl('/static/png/add-circle/add-circle.png')" @tap.stop="addToCart(product)" style="position: absolute; right: 0; top: 50%; transform: translateY(-50%); margin: 0; width: 40rpx; height: 40rpx;" />
                </view>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>

      <view style="height: 140rpx" />
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { request, resolveAssetUrl } from '../../utils/api.js'
import { refreshTabBadges } from '../../utils/badges.js'
import { formatCoins } from '../../utils/format.js'
import { ensureLogin } from '../../utils/session.js'

const showCart = ref(false)
const scrollTop = ref(0)
const oldScrollTop = ref(0)
const loading = ref(false)
const query = ref('')
const walletBalance = ref(0)
const avatars = ref([])
const gifts = ref([])
const products = ref([])
const cartList = ref([])

const onScroll = (e) => {
  oldScrollTop.value = e.detail.scrollTop
}

const handleScrollToTop = () => {
  scrollTop.value = oldScrollTop.value
  nextTick(() => {
    scrollTop.value = 0
  })
}

const cartTotalQty = computed(() => {
  return cartList.value.reduce((sum, item) => sum + item.quantity, 0)
})

const cartTotalPrice = computed(() => {
  return cartList.value.reduce((sum, item) => sum + (item.priceCoins * item.quantity), 0)
})

const filteredAvatars = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  if (!keyword) return avatars.value
  return avatars.value.filter(item =>
    String(item.name).toLowerCase().includes(keyword) ||
    String(item.subtitle || '').toLowerCase().includes(keyword)
  )
})

const filteredGifts = computed(() => filterProducts(gifts.value))
const filteredProducts = computed(() => filterProducts(products.value))

const toggleCart = () => {
  showCart.value = !showCart.value
}

const filterProducts = (list) => {
  const keyword = query.value.trim().toLowerCase()
  if (!keyword) return list
  return list.filter(item =>
    String(item.name).toLowerCase().includes(keyword) ||
    String(item.subtitle || '').toLowerCase().includes(keyword)
  )
}

const normalizeProduct = (item, type) => ({
  id: item.id,
  name: item.name,
  subtitle: item.subtitle || '',
  badge: item.badge || '',
  coverUrl: resolveAssetUrl(item.coverUrl),
  priceCoins: item.priceCoins || 0,
  productType: item.productType || type,
  cartQuantity: item.cartQuantity || 0,
  icon: type === 'GIFT' ? '🎁' : '⭐',
  bgClass: type === 'GIFT' ? 'gift-bg-1' : 'gift-bg-3'
})

const syncHome = async () => {
  loading.value = true
  try {
    const response = await request({
      url: '/api/market/home'
    })
    walletBalance.value = response.wallet?.balanceCoins || 0
    cartList.value = (response.cart?.items || []).map(item => ({
      id: item.id,
      productId: item.product.id,
      name: item.product.name,
      subtitle: item.product.subtitle || '',
      priceCoins: item.product.priceCoins || 0,
      quantity: item.quantity || 0,
      coverUrl: resolveAssetUrl(item.product.coverUrl)
    }))
    avatars.value = (response.sections?.digitalHumans || []).map(item => normalizeProduct(item, 'DIGITAL_HUMAN'))
    gifts.value = (response.sections?.gifts || []).map((item, index) => ({
      ...normalizeProduct(item, 'GIFT'),
      bgClass: ['gift-bg-1', 'gift-bg-2', 'gift-bg-3'][index % 3]
    }))
    products.value = (response.sections?.merch || []).map(item => normalizeProduct(item, 'MERCH'))
    await refreshTabBadges()
  } catch (error) {
    console.error('[market:syncHome]', error)
    uni.showToast({ title: '市场加载失败', icon: 'none' })
  }
}

const addToCart = async (item) => {
  try {
    await request({
      url: '/api/cart/items',
      method: 'POST',
      data: {
        productId: item.id,
        quantity: Math.max(1, (item.cartQuantity || 0) + 1)
      }
    })
    uni.showToast({ title: '已加入购物车', icon: 'none' })
    await syncHome()
  } catch (error) {
    console.error('[market:addToCart]', error)
    uni.showToast({ title: error.message || '加入购物车失败', icon: 'none' })
  }
}

const decreaseQty = async (item) => {
  try {
    if (item.quantity <= 1) {
      await request({
        url: `/api/cart/items/${item.id}`,
        method: 'DELETE'
      })
    } else {
      await request({
        url: `/api/cart/products/${item.productId}`,
        method: 'PATCH',
        data: {
          quantity: item.quantity - 1
        }
      })
    }
    await syncHome()
  } catch (error) {
    uni.showToast({ title: '更新失败', icon: 'none' })
  }
}

const increaseQty = async (item) => {
  try {
    await request({
      url: `/api/cart/products/${item.productId}`,
      method: 'PATCH',
      data: {
        quantity: item.quantity + 1
      }
    })
    await syncHome()
  } catch (error) {
    uni.showToast({ title: '更新失败', icon: 'none' })
  }
}

const openProduct = (id) => {
  uni.navigateTo({
    url: `/pages/product/detail?id=${id}`
  })
}

const openAssets = () => {
  uni.navigateTo({
    url: '/pages/assets/assets'
  })
}

const rechargeWallet = async () => {
  try {
    await request({
      url: '/api/wallet/recharge',
      method: 'POST',
      data: {
        amountCoins: 1000
      }
    })
    uni.showToast({ title: '已充值 1000 币', icon: 'none' })
    await syncHome()
  } catch (error) {
    uni.showToast({ title: '充值失败', icon: 'none' })
  }
}

const checkout = async () => {
  if (!cartList.value.length) {
    uni.showToast({ title: '购物车为空', icon: 'none' })
    return
  }

  try {
    await request({
      url: '/api/orders/checkout',
      method: 'POST',
      data: {}
    })
    uni.showToast({ title: '结算成功', icon: 'none' })
    showCart.value = false
    await syncHome()
    uni.navigateTo({
      url: '/pages/assets/assets'
    })
  } catch (error) {
    console.error('[market:checkout]', error)
    uni.showToast({ title: error.message || '结算失败', icon: 'none' })
  }
}

onShow(() => {
  if (!ensureLogin()) {
    return
  }
  syncHome()
})
</script>

<style scoped>
.page-market {
  background-color: #f6f7f8;
  min-height: 100vh;
  font-weight: 700;
  font-family: 'SF Pro Rounded', 'SF Pro Display', 'PingFang SC', 'Helvetica Rounded', 'Arial Rounded MT Bold',
    system-ui, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
}

.header {
  position: sticky;
  top: 0;
  z-index: 10;
  height: 112rpx;
  padding: 0 32rpx;
  background-color: #f6f7f8;
  border-bottom: 1rpx solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8rpx 12rpx;
  border-radius: 999rpx;
}

.header-icon {
  font-size: 32rpx;
  color: #6b7280;
}

.header-icon-img {
  width: 32rpx;
  height: 32rpx;
}

.header-text-small {
  font-size: 20rpx;
  color: #9ca3af;
  margin-top: 4rpx;
}

.header-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #0f172a;
}

.cart-badge {
  position: absolute;
  top: 4rpx;
  right: 6rpx;
  background-color: #ef4444;
  color: #ffffff;
  font-size: 20rpx;
  font-weight: bold;
  height: 32rpx;
  min-width: 32rpx;
  padding: 0 8rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.cart-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 15;
  background-color: rgba(0, 0, 0, 0.4); /* 半透明遮罩更符合弹窗 UX，并且能稳定拦截点击 */
}

.scroll {
  height: calc(100vh - 112rpx);
}

.section {
  padding: 24rpx 32rpx 16rpx;
}

.search-section {
  padding-top: 24rpx;
}

.search-box {
  position: relative;
  border-radius: 24rpx;
  background-color: #ffffff;
  padding: 16rpx 24rpx 16rpx 72rpx;
}

.search-icon {
  position: absolute;
  left: 24rpx;
  top: 50%;
  transform: translateY(-50%);
  font-size: 28rpx;
  color: #9ca3af;
}

.search-icon-img {
  position: absolute;
  left: 24rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 32rpx;
  height: 32rpx;
}

.search-input {
  font-size: 26rpx;
}

.search-placeholder {
  color: #9ca3af;
}

.balance-card {
  margin-top: 24rpx;
  border-radius: 24rpx;
  /* 比原来稍微浅一点的蓝色 */
  background-color: #4ab3ff;
  padding: 24rpx;
  color: #ffffff;
}

.balance-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.balance-label {
  font-size: 22rpx;
  opacity: 0.8;
  display: block;
}

.balance-value {
  margin-top: 8rpx;
  font-size: 44rpx;
  font-weight: 700;
  display: block;
}

.balance-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12rpx 32rpx;
  border-radius: 16rpx;
  background-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 8rpx 20rpx rgba(15, 23, 42, 0.12);
  transition: background-color 0.2s ease, transform 0.15s ease, box-shadow 0.15s ease;
}

.balance-btn-text {
  font-size: 24rpx;
}

/* 悬浮（H5 / PC 上鼠标移入） */
.balance-btn:hover {
  background-color: rgba(255, 255, 255, 0.28);
  box-shadow: 0 10rpx 26rpx rgba(15, 23, 42, 0.18);
}

/* 点击按下效果（移动端手指按下 / H5 点击） */
.balance-btn:active {
  transform: scale(0.96);
  box-shadow: 0 4rpx 12rpx rgba(15, 23, 42, 0.16);
}

.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 36rpx;
  font-weight: 900; /* 加黑加粗重点感 */
  letter-spacing: 1rpx;
  color: #000000; /* 纯黑 */
  display: flex;
  align-items: center;
  position: relative;
}

.section-title::before {
  content: '';
  display: block;
  width: 12rpx;
  height: 12rpx;
  background-color: #36a4f2; /* 主题蓝悬浮点 */
  border-radius: 50%;
  margin-right: 16rpx;
  box-shadow: 0 0 12rpx rgba(54, 164, 242, 0.6); /* 呼吸灯发光特效 */
}

.box-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-subtitle {
  font-size: 24rpx;
  color: #6b7280;
}

.section-link-text {
  font-size: 24rpx;
  color: #36a4f2;
}

.section-link {
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  transition: background-color 0.15s ease, transform 0.12s ease;
}

.section-link:hover {
  background-color: rgba(54, 164, 242, 0.06);
}

.section-link:active {
  transform: scale(0.96);
  background-color: rgba(54, 164, 242, 0.12);
}

.section-content-box {
  background-color: #ffffff;
  border: 1rpx solid #e5e7eb;
  border-radius: 24rpx;
  padding: 16rpx 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.02);
}

.grid-2 {
  display: flex;
  flex-wrap: wrap;
  margin: 0 -8rpx;
}

.avatar-card {
  position: relative;
  width: 50%;
  padding: 0 8rpx 16rpx;
  box-sizing: border-box;
}

.avatar-img {
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 24rpx;
}

.avatar-gradient {
  position: absolute;
  left: 8rpx;
  right: 8rpx;
  bottom: 16rpx;
  height: 140rpx;
  border-bottom-left-radius: 24rpx;
  border-bottom-right-radius: 24rpx;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
}

.avatar-info {
  position: absolute;
  left: 24rpx;
  bottom: 40rpx;
}

.avatar-name {
  font-size: 26rpx;
  color: #ffffff;
  display: block;
}

.avatar-role {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
  display: block;
}

.h-scroll {
  white-space: nowrap;
}

.h-scroll ::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
  color: transparent;
}

.gift-card {
  display: inline-block;
  width: 200rpx;
  margin-right: 24rpx;
}

.gift-inner {
  border-radius: 24rpx;
  padding: 10rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.gift-bg-1 {
  background: linear-gradient(135deg, #36a4f2, #87ccf9);
}

.gift-bg-2 {
  background: linear-gradient(135deg, #ff85c0, #ffb3d9);
}

.gift-bg-3 {
  background: linear-gradient(135deg, #4b5563, #6b7280);
}

.gift-light {
  position: absolute;
}

.gift-icon-img {
  width: 180rpx;
  height: 180rpx;
  border-radius: 16rpx;
  display: block;
  margin-bottom: 8rpx;
}

.gift-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #ffffff;
  text-align: center;
}

.gift-meta {
  margin-top: 8rpx;
  padding: 0 4rpx;
}

.gift-meta-title {
  font-size: 22rpx;
  color: #111827;
}

.gift-meta-price {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #36a4f2;
  font-weight: 700;
}

.product-card {
  display: inline-block;
  width: 240rpx;
  margin-right: 32rpx;
}

.product-img-wrap {
  border-radius: 24rpx;
  overflow: hidden;
  background-color: #e5e7eb;
}

.product-img {
  width: 100%;
  height: 240rpx;
}

.product-name {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  font-size: 24rpx;
  font-weight: 700;
}

.product-name-strong {
  font-size: 24rpx;
  font-weight: 700;
}

.product-name-sub {
  font-size: 20rpx;
  color: #6b7280;
  font-weight: 700;
  margin-top: 4rpx;
}

.product-bottom {
  margin-top: 8rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.product-price {
  font-size: 24rpx;
  color: #36a4f2;
  font-weight: 700;
}

.product-add {
  width: 40rpx;
  height: 40rpx;
  border-radius: 999rpx;
  background-color: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-add-icon {
  font-size: 24rpx;
}

/* 购物车弹窗样式 */
.cart-dropdown {
  position: fixed;
  top: 112rpx;
  right: 24rpx;
  width: 520rpx;
  background-color: #ffffff;
  border-radius: 20rpx;
  box-shadow: 0 16rpx 48rpx rgba(15, 23, 42, 0.12);
  z-index: 20;
  padding: 16rpx;
  display: flex;
  flex-direction: column;
}

.cart-empty {
  text-align: center;
  padding: 40rpx;
  font-size: 24rpx;
  color: #9ca3af;
}

.cart-list {
  max-height: 400rpx;
  overflow-y: auto;
}

.cart-item {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}

.cart-item-img {
  width: 64rpx;
  height: 64rpx;
  border-radius: 12rpx;
  margin-right: 16rpx;
  background-color: #f3f4f6;
}

.cart-item-icon-wrap {
  width: 64rpx;
  height: 64rpx;
  border-radius: 12rpx;
  margin-right: 16rpx;
  background-color: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
}

.cart-item-info {
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  overflow: hidden;
}

.cart-item-name {
  font-size: 24rpx;
  font-weight: 700;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 12rpx;
}

.cart-item-price {
  font-size: 22rpx;
  color: #36a4f2;
  flex-shrink: 0;
  margin-left: auto;
}

.cart-item-actions {
  display: flex;
  align-items: center;
  margin-left: 16rpx;
}

.qty-btn {
  width: 44rpx;
  height: 44rpx;
  border-radius: 999rpx;
  background-color: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 700;
  color: #111827;
}

.qty-btn:active {
  background-color: #e5e7eb;
}

.qty-text {
  font-size: 24rpx;
  width: 40rpx;
  text-align: center;
}

.cart-footer {
  margin-top: 12rpx;
  border-top: 1px solid #f3f4f6;
  padding-top: 16rpx;
}

.cart-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  padding: 0 8rpx;
}

.cart-total-original {
  font-size: 22rpx;
  color: rgba(107, 114, 128, 0.7);
  text-decoration: line-through;
}

.cart-total-discount {
  font-size: 24rpx;
  font-weight: 900;
  color: #f59e0b; /* 橙金色 */
}

.checkout-btn {
  width: 100%;
  background-color: #36a4f2;
  color: #ffffff;
  font-size: 28rpx;
  border-radius: 16rpx;
  padding: 12rpx 0;
  border: none;
  font-weight: 700;
  line-height: 1.5;
}

.checkout-btn:active {
  background-color: #2b8bd1;
}

/* AI 礼物增加的加号样式 */
.gift-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.gift-meta-price {
  margin-top: 0 !important;
}

.gift-add {
  width: 36rpx;
  height: 36rpx;
  border-radius: 999rpx;
  background-color: rgba(54, 164, 242, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.gift-add-icon {
  font-size: 20rpx;
  color: #36a4f2;
}
</style>
