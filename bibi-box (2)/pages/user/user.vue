<template>
  <view class="page page-user">
    <view class="user-header">
      <view class="header-icon-wrap" @tap.stop="toggleDropdown">
        <image :src="resolveAssetUrl('/static/png/settings.png')" mode="aspectFit" style="width: 44rpx; height: 44rpx; opacity: 0.8;" />
        <view v-if="showDropdown" class="dropdown-menu">
          <view class="dropdown-item" @tap.stop="goNotifications">
            <text class="dropdown-item-text">提醒中心</text>
          </view>
          <view class="dropdown-divider" />
          <view class="dropdown-item" @tap.stop="goOrders">
            <text class="dropdown-item-text">订单记录</text>
          </view>
          <view class="dropdown-divider" />
          <view class="dropdown-item" @tap.stop="handleLogout">
            <text class="dropdown-item-text">退出登录</text>
          </view>
        </view>
      </view>
      <text class="header-title">个人中心</text>
      <view style="width: 44rpx; height: 44rpx;"></view>
    </view>

    <view v-if="showDropdown" class="dropdown-overlay" @tap="closeDropdown" />

    <view class="profile">
      <view class="avatar-wrap">
        <image class="avatar-img" :src="resolveAssetUrl(account.avatarUrl)" mode="aspectFill" />
        <view class="avatar-edit">
          <text class="avatar-edit-icon">AI</text>
        </view>
      </view>
      <text class="profile-name">{{ account.displayName }}</text>
      <text class="profile-sub">{{ account.tagline || account.bio }}</text>
      <view class="uid-tag">
        <text>@{{ account.username }}</text>
      </view>
    </view>

    <view class="assets-card" @tap="goAssets">
      <view class="assets-top">
        <view class="assets-top-inner">
          <text class="assets-label">平台币余额</text>
          <text class="assets-value">{{ formatCoins(wallet.balanceCoins) }} 币</text>
        </view>
      </view>
      <view class="assets-bottom">
        <view class="assets-col">
          <text class="assets-sub-label">资产持仓</text>
          <text class="assets-sub-value">{{ assetsSummary.holdings }} 项</text>
        </view>
        <view class="assets-divider" />
        <view class="assets-col">
          <text class="assets-sub-label">我的数字人</text>
          <text class="assets-sub-value">{{ ownedDigitalHumans.length }} 位</text>
        </view>
      </view>
    </view>

    <view class="stats-strip">
      <view class="stats-card">
        <text class="stats-number">{{ stats.followers }}</text>
        <text class="stats-label">被关注</text>
      </view>
      <view class="stats-card">
        <text class="stats-number">{{ stats.posts }}</text>
        <text class="stats-label">动态</text>
      </view>
      <view class="stats-card" @tap="goNotifications">
        <text class="stats-number">{{ stats.unreadCount }}</text>
        <text class="stats-label">提醒</text>
      </view>
    </view>

    <view class="menu-wrap">
      <text class="menu-title">应用管理</text>

      <view class="menu-item" @tap="goAssets">
        <view class="menu-icon-wrap primary">
          <image :src="resolveAssetUrl('/static/png/wallet/wallet.png')" mode="aspectFit" class="menu-icon-img" />
        </view>
        <text class="menu-text">我的资产</text>
        <text class="menu-arrow">›</text>
      </view>

      <view class="menu-item" @tap="goOwnedHumans">
        <view class="menu-icon-wrap pink">
          <image :src="resolveAssetUrl('/static/png/smart-toy/smart_toy.png')" mode="aspectFit" class="menu-icon-img" />
        </view>
        <text class="menu-text">我的数字人</text>
        <text class="menu-arrow">›</text>
      </view>

      <view class="menu-item" @tap="goOrders">
        <view class="menu-icon-wrap primary">
          <image :src="resolveAssetUrl('/static/png/gift/gift.png')" mode="aspectFit" class="menu-icon-img" />
        </view>
        <text class="menu-text">订单记录</text>
        <text class="menu-arrow">›</text>
      </view>

      <view class="menu-item" @tap="goNotifications">
        <view class="menu-icon-wrap gray">
          <image :src="resolveAssetUrl('/static/png/notification/notification.png')" mode="aspectFit" class="menu-icon-img" />
        </view>
        <text class="menu-text">互动提醒</text>
        <text class="menu-arrow">›</text>
      </view>

      <view class="menu-item" @tap="goMarket">
        <view class="menu-icon-wrap gray">
          <image :src="resolveAssetUrl('/static/png/store-front/store-front.png')" mode="aspectFit" class="menu-icon-img" />
        </view>
        <text class="menu-text">返回市场</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <view style="height: 140rpx" />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { fetchMe, logout, resolveAssetUrl } from '../../utils/api.js'
import { refreshTabBadges } from '../../utils/badges.js'
import { formatCoins } from '../../utils/format.js'
import { ensureLogin } from '../../utils/session.js'

const showDropdown = ref(false)
const account = ref({
  username: '',
  displayName: '',
  avatarUrl: resolveAssetUrl('/static/default.png'),
  tagline: '',
  bio: ''
})
const stats = ref({
  followers: 0,
  posts: 0,
  unreadCount: 0
})
const wallet = ref({
  balanceCoins: 0
})
const assetsSummary = ref({
  holdings: 0
})
const ownedDigitalHumans = ref([])

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

const closeDropdown = () => {
  showDropdown.value = false
}

const refreshProfile = async () => {
  try {
    const response = await fetchMe()
    account.value = response.account || account.value
    stats.value = response.stats || stats.value
    wallet.value = response.wallet || wallet.value
    assetsSummary.value = response.assetsSummary || assetsSummary.value
    ownedDigitalHumans.value = response.ownedDigitalHumans || []
    await refreshTabBadges()
  } catch (error) {
    console.error('[user:refreshProfile]', error)
    uni.showToast({ title: '个人信息加载失败', icon: 'none' })
  }
}

const handleLogout = async () => {
  closeDropdown()
  await logout()
  uni.reLaunch({
    url: '/pages/login/login'
  })
}

const goAssets = () => {
  closeDropdown()
  uni.navigateTo({
    url: '/pages/assets/assets'
  })
}

const goOrders = () => {
  closeDropdown()
  uni.navigateTo({
    url: '/pages/orders/orders'
  })
}

const goNotifications = () => {
  closeDropdown()
  uni.navigateTo({
    url: '/pages/notifications/list'
  })
}

const goOwnedHumans = () => {
  closeDropdown()
  if (!ownedDigitalHumans.value.length) {
    uni.showToast({ title: '还没有拥有的数字人', icon: 'none' })
    return
  }
  uni.switchTab({
    url: '/pages/chat/chat'
  })
}

const goMarket = () => {
  closeDropdown()
  uni.switchTab({
    url: '/pages/market/market'
  })
}

onShow(() => {
  if (!ensureLogin()) {
    return
  }
  refreshProfile()
})
</script>

<style scoped>
.page-user {
  background-color: #f6f7f8;
  min-height: 100vh;
  padding-bottom: 40rpx;
}

.user-header {
  height: 96rpx;
  padding: 0 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 20;
}

.header-icon-wrap {
  position: relative;
}

.header-icon {
  font-size: 32rpx;
  color: #6b7280;
}

.dropdown-overlay {
  position: fixed;
  inset: 0;
  z-index: 15;
}

.dropdown-menu {
  position: absolute;
  top: 72rpx;
  left: 0;
  width: 280rpx;
  background-color: #ffffff;
  border-radius: 20rpx;
  box-shadow: 0 16rpx 48rpx rgba(15, 23, 42, 0.12);
  z-index: 25;
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx 28rpx;
}

.dropdown-item:active {
  background-color: #f3f4f6;
}

.dropdown-item-text {
  font-size: 26rpx;
  color: #374151;
}

.dropdown-divider {
  height: 1rpx;
  background-color: #f3f4f6;
  margin: 0 20rpx;
}

.header-title {
  font-size: 30rpx;
  font-weight: 600;
}

.profile {
  align-items: center;
  padding-top: 8rpx;
  padding-bottom: 32rpx;
  display: flex;
  flex-direction: column;
}

.avatar-wrap {
  position: relative;
  width: 176rpx;
  height: 176rpx;
  border-radius: 999rpx;
  padding: 8rpx;
  background: linear-gradient(135deg, rgba(54, 164, 242, 0.32), rgba(244, 114, 182, 0.32));
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 999rpx;
}

.avatar-edit {
  position: absolute;
  right: 12rpx;
  bottom: 20rpx;
  min-width: 52rpx;
  height: 44rpx;
  padding: 0 10rpx;
  border-radius: 999rpx;
  background-color: #36a4f2;
  border-width: 4rpx;
  border-style: solid;
  border-color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-edit-icon {
  font-size: 20rpx;
  color: #ffffff;
}

.profile-name {
  margin-top: 16rpx;
  font-size: 32rpx;
  font-weight: 700;
}

.profile-sub {
  margin-top: 8rpx;
  padding: 0 72rpx;
  text-align: center;
  font-size: 24rpx;
  line-height: 1.7;
  color: #6b7280;
}

.uid-tag {
  margin-top: 12rpx;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  background-color: rgba(54, 164, 242, 0.1);
  color: #36a4f2;
  font-size: 22rpx;
}

.assets-card {
  margin: 0 32rpx 24rpx;
  border-radius: 24rpx;
  padding: 24rpx;
  background: linear-gradient(135deg, #4fa4f0, #89befa);
  color: #ffffff;
  box-shadow: 0 24rpx 60rpx rgba(54, 164, 242, 0.3);
  text-align: center;
}

.assets-top {
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.assets-top-inner {
  width: 100%;
}

.assets-label {
  font-size: 22rpx;
  opacity: 0.82;
  display: block;
}

.assets-value {
  margin-top: 12rpx;
  font-size: 44rpx;
  font-weight: 700;
  display: block;
}

.assets-bottom {
  margin-top: 28rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.assets-col {
  flex: 1;
  text-align: center;
}

.assets-sub-label {
  font-size: 20rpx;
  opacity: 0.82;
  display: block;
}

.assets-sub-value {
  margin-top: 8rpx;
  font-size: 30rpx;
  font-weight: 700;
  display: block;
}

.assets-divider {
  width: 1rpx;
  height: 60rpx;
  background: rgba(255, 255, 255, 0.32);
  margin: 0 24rpx;
}

.stats-strip {
  margin: 0 32rpx 28rpx;
  display: flex;
  gap: 16rpx;
}

.stats-card {
  flex: 1;
  padding: 24rpx 0;
  border-radius: 20rpx;
  background: #ffffff;
  text-align: center;
  box-shadow: 0 10rpx 26rpx rgba(15, 23, 42, 0.06);
}

.stats-number {
  display: block;
  font-size: 32rpx;
  font-weight: 800;
}

.stats-label {
  margin-top: 8rpx;
  display: block;
  font-size: 22rpx;
  color: #94a3b8;
}

.menu-wrap {
  margin: 0 32rpx;
}

.menu-title {
  display: block;
  margin-bottom: 18rpx;
  font-size: 26rpx;
  color: #64748b;
  font-weight: 700;
}

.menu-item {
  margin-bottom: 16rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 26rpx rgba(15, 23, 42, 0.06);
}

.menu-icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  align-items: center;
  justify-content: center;
  display: flex;
  margin-right: 20rpx;
}

.menu-icon-wrap.primary {
  background: rgba(54, 164, 242, 0.12);
}

.menu-icon-wrap.pink {
  background: rgba(244, 114, 182, 0.12);
}

.menu-icon-wrap.gray {
  background: rgba(100, 116, 139, 0.12);
}

.menu-icon-img {
  width: 44rpx;
  height: 44rpx;
  opacity: 0.8;
}

.menu-text {
  flex: 1;
  font-size: 26rpx;
  color: #334155;
}

.menu-arrow {
  font-size: 32rpx;
  color: #94a3b8;
}
</style>
