<template>
  <view :class="['page', 'page-login', { 'is-animating': isAnimating }]">
    <!-- 背景 -->
    <view :class="['bg-layer', { 'fade-to-white': isAnimating }]">
      <view class="bg-gradient"></view>
      <view class="bg-bubble bg-bubble-1" />
      <view class="bg-bubble bg-bubble-2" />
    </view>

    <!-- 内容 -->
    <view class="page-inner">
      <!-- Logo / 视频动画区域 -->
      <view :class="['brand', { 'brand-animating': isAnimating }]">
        <view :class="['brand-logo', { 'brand-logo-animating': isAnimating }]">
          <!-- NOTE: 视频始终存在于底层，初始暂停显示首帧，登录成功后才播放 -->
          <video
            id="loginVideo"
            class="login-video"
            :src="videoSrc"
            :poster="videoPoster"
            :autoplay="false"
            :controls="false"
            :show-center-play-btn="false"
            :show-play-btn="false"
            :show-fullscreen-btn="false"
            :show-progress="false"
            :enable-progress-gesture="false"
            :muted="true"
            object-fit="cover"
            @ended="onVideoEnded"
            @error="onVideoError"
          />
        </view>
        <text :class="['brand-title', { 'fade-out': isAnimating }]">Bibi Box</text>
        <text :class="['brand-subtitle', { 'fade-out': isAnimating }]">你的 AI 伙伴</text>
      </view>

      <!-- 登录方式 -->
      <view :class="['login-list', { 'fade-out': isAnimating }]">
        <button class="btn btn-wechat" @tap="handleWeChatLogin">
          <view class="btn-icon-wrap">
            <image class="btn-icon" :src="resolveAssetUrl('/static/png/wechat.png')" mode="aspectFit" />
          </view>
          <text class="btn-text">微信一键登录</text>
        </button>

        <button class="btn btn-alipay" @tap="handleLogin">
          <view class="btn-icon-wrap btn-icon-wrap-alipay">
            <image class="btn-icon" :src="resolveAssetUrl('/static/png/alipay.png')" mode="aspectFit" />
          </view>
          <text class="btn-text">支付宝一键登录</text>
        </button>

        <view class="divider">
          <view class="divider-line" />
          <text class="divider-text">Web3 登录</text>
          <view class="divider-line" />
        </view>

        <button class="btn btn-outline" @tap="handleLogin">
          <image class="btn-outline-icon-img" :src="resolveAssetUrl('/static/metamasklogo.jpg')" mode="aspectFit" />
          <text class="btn-text">MetaMask 钱包登录</text>
        </button>

        <button class="btn btn-outline" @tap="handleLogin">
          <image class="btn-outline-icon-img" :src="resolveAssetUrl('/static/walletconnect.jpg')" mode="aspectFit" />
          <text class="btn-text">WalletConnect 登录</text>
        </button>
      </view>

      <!-- 底部说明 -->
      <view :class="['footer', { 'fade-out': isAnimating }]">
        <button class="footer-link" @tap="handleLogin">访客模式</button>
        <text class="footer-tip">
          登录即代表您同意我们的
          <text class="footer-link-text">服务协议</text>
          和
          <text class="footer-link-text">隐私政策</text>
        </text>
      </view>
    </view>

    <!-- NOTE: 动画播放时在顶部 1/4 处显示欢迎文字 -->
    <view :class="['welcome-text-wrap', { 'welcome-visible': isAnimating }]">
      <text class="welcome-text">欢迎来到</text>
      <text class="welcome-text">bibibox！</text>
    </view>

    <!-- 纹理覆盖层 -->
    <view :class="['texture-layer', { 'fade-to-white': isAnimating }]">
      <image class="texture-image" :src="resolveAssetUrl('/static/default.png')" mode="aspectFill" />
    </view>
  </view>
</template>

<script setup>
import { ref, getCurrentInstance } from 'vue'
import { API_BASE } from '../../config/api.js'
import { loginWithPassword, loginWithWechat, resolveAssetUrl } from '../../utils/api.js'

const apiUrl = String(API_BASE).replace(/\/$/, '')
const videoSrc = apiUrl + '/static/login.mp4'
const videoPoster = apiUrl + '/static/login.jpg'

// NOTE: 控制登录成功后的动画状态，避免重复点击
const isAnimating = ref(false)

// NOTE: 超时保底时长（毫秒），防止视频加载失败导致用户卡住
const FALLBACK_TIMEOUT_MS = 10000
let fallbackTimer = null
// NOTE: 防止 navigateToMain 被多次调用（ended + timeout 可能同时触发）
let hasNavigated = false

/** 调试：true 用弹窗显示完整报错（方便测试）；上线前改为 false 仅用短 Toast */
const LOGIN_ERROR_DETAIL_MODAL = true

/**
 * 登录相关错误提示：调试模式下用 showModal 展示长文案
 */
const showLoginError = (detail, shortTitle = '登录失败') => {
  const text = String(detail || '未知错误')
  if (LOGIN_ERROR_DETAIL_MODAL) {
    const content = text.length > 800 ? text.slice(0, 800) + '…' : text
    uni.showModal({
      title: shortTitle,
      content,
      showCancel: false,
      confirmText: '知道了'
    })
  } else {
    uni.showToast({
      title: text.length > 28 ? text.slice(0, 28) + '…' : text,
      icon: 'none',
      duration: 4000
    })
  }
}

/**
 * 跳转到主页面
 */
const navigateToMain = () => {
  if (hasNavigated) return
  hasNavigated = true

  if (fallbackTimer) {
    clearTimeout(fallbackTimer)
    fallbackTimer = null
  }
  uni.switchTab({
    url: '/pages/market/market'
  })
}

/**
 * 开始登录成功后的动画（视频 + 淡出 + 跳转商城）
 */
const startLoginSuccessAnimation = () => {
  if (isAnimating.value) return

  isAnimating.value = true

  const instance = getCurrentInstance()
  const videoCtx = uni.createVideoContext('loginVideo', instance?.proxy)

  // 强制确保调用 play
  setTimeout(() => {
    videoCtx.play()
  }, 50)

  fallbackTimer = setTimeout(() => {
    navigateToMain()
  }, FALLBACK_TIMEOUT_MS)
}

/**
 * 获取 wx.login 的 code（小程序内优先用原生 wx.login，避免部分环境 uni.login 报 login:fail method…）
 */
const getLoginCode = () => {
  return new Promise((resolve, reject) => {
    if (typeof wx !== 'undefined' && typeof wx.login === 'function') {
      wx.login({
        success: (res) => resolve(res),
        fail: (err) => reject(err)
      })
    } else {
      uni.login({
        success: (res) => resolve(res),
        fail: (err) => reject(err)
      })
    }
  })
}

/**
 * 微信小程序：先拿 code → 请求自建 /auth/wechat → 再播放入场动画
 */
const handleWeChatLogin = async () => {
  if (isAnimating.value) return

  if (!API_BASE || !String(API_BASE).trim()) {
    showLoginError('请先在 config/api.js 填写 API_BASE', '配置缺失')
    return
  }

  uni.showLoading({ title: '登录中...', mask: true })

  try {
    const loginRes = await getLoginCode()

    const code = loginRes.code
    if (!code) {
      uni.hideLoading()
      showLoginError('wx.login 未返回 code，请检查 manifest 中小程序 AppID 是否已填写', '未获取到凭证')
      return
    }

    uni.hideLoading()
    const body = await loginWithWechat(code)

    if (body.openid) {
      try {
        uni.setStorageSync('openid', body.openid)
      } catch (e) {
        /* ignore */
      }
    }

    startLoginSuccessAnimation()
  } catch (e) {
    uni.hideLoading()
    const errMsg =
      (e && (e.errMsg || e.message)) ||
      (typeof e === 'string' ? e : '') ||
      '未知错误'
    let extra = ''
    if (e && typeof e === 'object') {
      try {
        extra =
          '\n' +
          JSON.stringify(
            {
              errMsg: e.errMsg,
              message: e.message,
              errno: e.errno
            },
            null,
            2
          )
      } catch (_) {
        extra = '\n' + String(e)
      }
    }
    console.error('[handleWeChatLogin]', e)
    const isRequestFail = String(errMsg).includes('request:fail')
    const networkHint = isRequestFail
      ? '\n\n【网络请求失败 · 请逐项检查】\n' +
        '1. 后端服务已启动，且已对外提供 /auth/wechat 与 /api/*\n' +
        '2. 微信工具里不要用 127.0.0.1：config/api.js 请填【局域网IP】如 192.168.x.x:3000\n' +
        '3. 本机浏览器打开：http://' +
        (String(API_BASE).match(/\/\/([^/:]+)/)?.[1] || 'IP') +
        ':3000/health 应显示 {"ok":true}\n' +
        '4. 防火墙放行 3000；工具：详情→本地设置→勾选「不校验合法域名」并重启工具\n' +
        '5. 真机与电脑同一 WiFi'
      : ''
    showLoginError(errMsg + extra + networkHint, '请求异常')
  }
}

/**
 * 其他登录方式 / 访客：直接播放入场动画（不调用微信 code2session）
 */
const handleLogin = async () => {
  if (isAnimating.value) return

  uni.showLoading({ title: '进入体验中...', mask: true })
  try {
    await loginWithPassword({
      identifier: 'nova',
      password: 'Demo@123456',
      accountType: 'USER'
    })
    uni.hideLoading()
    startLoginSuccessAnimation()
  } catch (e) {
    uni.hideLoading()
    const errMsg =
      (e && (e.message || e.errMsg)) ||
      '进入体验失败'
    showLoginError(errMsg, '体验账号异常')
  }
}

/**
 * 视频播放完毕回调
 */
const onVideoEnded = () => {
  if (isAnimating.value) {
    navigateToMain()
  }
}

/**
 * 视频播放出错回调，直接跳转不阻塞用户
 */
const onVideoError = () => {
  if (isAnimating.value) {
    navigateToMain()
  }
}
</script>

<style scoped>
.page-login {
  position: relative;
  min-height: 100vh;
  background-color: #f6f7f8;
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
  /* NOTE: 动画状态下背景过渡为白色 */
  transition: background-color 0.6s ease;
}

.page-login.is-animating {
  background-color: #ffffff;
}

.bg-layer {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  transition: opacity 0.6s ease;
}

.bg-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(54, 164, 242, 0.1), #ffffff 40%, rgba(252, 231, 243, 0.6));
}

.bg-bubble {
  position: absolute;
  border-radius: 9999px;
  filter: blur(40rpx);
}

.bg-bubble-1 {
  width: 260rpx;
  height: 260rpx;
  right: -80rpx;
  top: -80rpx;
  background-color: rgba(54, 164, 242, 0.12);
}

.bg-bubble-2 {
  width: 320rpx;
  height: 320rpx;
  left: -120rpx;
  bottom: -40rpx;
  background-color: rgba(251, 207, 232, 0.4);
}

.page-inner {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  padding: 96rpx 48rpx 72rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
}

.brand {
  align-items: center;
  transition: transform 0.6s ease;
}

/* NOTE: 动画状态下品牌区域上移居中，突出视频 */
.brand-animating {
  transform: translateY(30vh);
}

.brand-logo {
  width: 236rpx;
  height: 340rpx;
  border-radius: 32rpx;
  background-color: rgba(255, 255, 255, 0.82);
  box-shadow: 0 24rpx 80rpx rgba(54, 164, 242, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 48rpx auto 32rpx;
  transition: all 0.6s ease;
  overflow: hidden;
  /* NOTE: 初始容器按 730:1080 比例显示，确保视频完整可见 */
  position: relative;
}

/* NOTE: 动画状态下按视频原始比例 730:1080 展开容器 */
.brand-logo-animating {
  width: 480rpx;
  height: 710rpx;
  border-radius: 48rpx;
  background-color: transparent;
  box-shadow: none;
}

.material-icon {
  font-size: 96rpx;
  color: #36a4f2;
}

.brand-logo-img {
  width: 340rpx;
  height: 340rpx;
  border-radius: 24rpx;
}

/* 视频播放器，填满容器 */
.login-video {
  width: 100%;
  height: 100%;
  border-radius: 24rpx;
}

.brand-title {
  display: block;
  font-size: 84rpx;
  font-weight: 700;
  color: #020617;
  text-align: center;
  transition: opacity 0.6s ease;
}

.brand-subtitle {
  margin-top: 8rpx;
  font-size: 42rpx;
  color: #6b7280;
  text-align: center;
  display: block;
  margin-left: auto;
  margin-right: auto;
  transition: opacity 0.6s ease;
}

.login-list {
  width: 100%;
  max-width: 640rpx;
  margin-top: 40rpx;
  transition: opacity 0.6s ease;
}

.btn {
  width: 100%;
  height: 112rpx;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
}

.btn-wechat {
  background-color: #07c160;
  color: #ffffff;
}

.btn-alipay {
  background-color: #1677ff;
  color: #ffffff;
}

.btn-icon-wrap {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background-color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12rpx;
}

/* 支付宝图标的白色底框再小一点 */
.btn-icon-wrap-alipay {
  width: 39rpx;
  height: 39rpx;
}

.btn-outline {
  background-color: rgba(255, 255, 255, 0.8);
  color: #111827;
  border-width: 1rpx;
  border-style: solid;
  border-color: #e5e7eb;
}

.btn-icon {
  width: 156rpx;
  height: 156rpx;
}

.btn-outline-icon-img {
  width: 40rpx;
  height: 40rpx;
  margin-right: 16rpx;
}

.btn-text {
  font-size: 28rpx;
  margin-left: 4rpx;
}

.divider {
  flex-direction: row;
  align-items: center;
  margin: 24rpx 0;
  display: flex;
}

.divider-line {
  flex: 1;
  height: 1rpx;
  background-color: #e5e7eb;
}

.divider-text {
  margin: 0 16rpx;
  font-size: 22rpx;
  color: #9ca3af;
}

.footer {
  align-items: center;
  transition: opacity 0.6s ease;
}

.footer-link {
  font-size: 24rpx;
  color: #6b7280;
  text-decoration: underline;
  text-underline-offset: 6rpx;
  background-color: transparent;
  border: none;
  margin-bottom: 32rpx;
}

.footer-tip {
  font-size: 20rpx;
  color: #9ca3af;
  text-align: center;
  line-height: 1.6;
  padding: 0 32rpx;
  display: block;
}

.footer-link-text {
  color: rgba(54, 164, 242, 0.9);
}

.texture-layer {
  position: fixed;
  inset: 0;
  opacity: 0.35;
  mix-blend-mode: overlay;
  pointer-events: none;
  transition: opacity 0.6s ease;
}

.texture-image {
  width: 100%;
  height: 100%;
}

/* ====== 动画状态下的淡出效果 ====== */

/* NOTE: 背景层和纹理层淡出为不可见 */
.fade-to-white {
  opacity: 0 !important;
}

/* NOTE: 按钮列表、文字等内容淡出 */
.fade-out {
  opacity: 0 !important;
}

/* ====== 欢迎文字 ====== */

.welcome-text-wrap {
  position: fixed;
  top: 25vh;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: 0;
  transition: opacity 0.6s ease;
  pointer-events: none;
}

.welcome-visible {
  opacity: 1;
}

.welcome-text {
  font-size: 48rpx;
  font-weight: 700;
  color: #9ca3af;
  text-align: center;
  line-height: 1.5;
}
</style>
