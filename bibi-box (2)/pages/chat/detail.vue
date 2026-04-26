 <template>
  <view class="page page-chat-detail">
    <view class="header">
      <text class="header-action header-back" @tap="goBack">‹</text>
      <view class="header-main">
        <text class="header-title">{{ conversation?.digitalHuman?.displayName || (conversation ? '未知数字人' : '正在加载...') }}</text>
        <text class="header-sub">{{ conversation?.digitalHuman?.tagline || '' }}</text>
      </view>
      <text class="header-action" @tap="refreshConversation">刷新</text>
    </view>

    <scroll-view
      scroll-y
      class="scroll"
      :show-scrollbar="false"
      :scroll-top="scrollTop"
      scroll-with-animation
    >
      <view class="message-list">
        <view
          class="message-row"
          :class="{ self: item.role === 'USER' }"
          v-for="item in messages"
          :key="item.id"
        >
          <image
            class="message-avatar"
            :src="resolveAssetUrl(item.sender?.avatarUrl || fallbackAvatar(item.role))"
            mode="aspectFill"
          />
          <view class="message-bubble" :class="{ self: item.role === 'USER', 'is-gift-card': isGiftMessage(item) }">
            <template v-if="isGiftMessage(item)">
              <view class="gift-message-content" @tap="toggleGiftPanel">
                <view class="gift-msg-icon-wrap gift-msg-icon-wrap-large">
                  <image :src="item.mediaUrl ? resolveAssetUrl(item.mediaUrl) : resolveAssetUrl('/static/png/gift/gift.png')" mode="aspectFill" class="gift-msg-icon gift-msg-icon-large" />
                </view>
                <view class="gift-msg-info gift-msg-info-large">
                  <text class="gift-msg-title">送出专属礼物</text>
                  <text class="gift-msg-name">{{ extractGiftName(item.textContent) }}</text>
                </view>
              </view>
              <text class="message-time">{{ formatDateTime(item.createdAt) }}</text>
            </template>
            <template v-else>
              <text v-if="item.textContent" class="message-text">{{ item.textContent }}</text>
              <image v-if="item.messageType === 'IMAGE' && item.mediaUrl" class="message-image" :src="item.mediaUrl" mode="widthFix" />
              <view v-if="item.messageType === 'AUDIO'" class="message-audio" @tap="playAudio(item.mediaUrl)">
                <text class="audio-label">语音消息（点击播放）</text>
                <text class="audio-text">{{ item.transcription || '未提供语音摘要' }}</text>
                <view v-if="item.mediaUrl" class="audio-play-btn" @tap="playAudio(item.mediaUrl)">
                  <text class="audio-play-icon">{{ currentPlaying === item.mediaUrl ? '■' : '▶' }}</text>
                  <text>{{ currentPlaying === item.mediaUrl ? '停止播放' : '点击播放' }}</text>
                </view>
              </view>
              <text class="message-time">{{ formatDateTime(item.createdAt) }}</text>
            </template>
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="draft-chip" v-if="audioDraft.path">
      <text class="draft-chip-text">已录制语音，发送时会附带下方文字作为摘要</text>
      <text class="draft-chip-action" @tap="clearAudioDraft">清除</text>
    </view>

    <view class="composer">
      <textarea
        v-model="draft"
        class="composer-input"
        auto-height
        maxlength="600"
        placeholder="发消息给数字人，也可以写语音摘要"
        placeholder-class="composer-placeholder"
      />
      <view class="composer-actions">
        <view class="tool-btn" @tap="toggleGiftPanel">礼物</view>
        <view class="tool-btn" @tap="chooseImage">图片</view>
        <view class="tool-btn" @tap="toggleRecord">{{ isRecording ? '停止' : '语音' }}</view>
        <view class="send-btn" @tap="sendCurrent">发送</view>
      </view>
    </view>

    <!-- Gift Panel Popup -->
    <view v-if="showGiftPanel" class="gift-overlay" @tap="toggleGiftPanel" />
    <view v-if="showGiftPanel" class="gift-panel">
      <view class="gift-header">
        <text class="gift-title">送给 {{ conversation?.digitalHuman?.displayName || '数字人' }}</text>
        <text class="gift-close" @tap="toggleGiftPanel">×</text>
      </view>
      <scroll-view scroll-x class="gift-list" :show-scrollbar="false">
        <view class="gift-items">
          <view
            class="gift-card"
            v-for="item in holdings"
            :key="item.id"
            @tap="sendGift(item)"
          >
            <image class="gift-icon" :src="resolveAssetUrl(item.coverUrl)" mode="aspectFill" />
            <text class="gift-name">{{ item.title }}</text>
            <text class="gift-qty">拥有 {{ item.quantity }} 个</text>
            <view class="gift-send-btn">赠送</view>
          </view>

          <view class="gift-card gift-card-more" @tap="goMarket">
            <view class="gift-icon-more">+</view>
            <text class="gift-name">获取更多</text>
            <text class="gift-qty">前往市场选购</text>
            <view class="gift-send-btn outline">去看看</view>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { request, resolveAssetUrl, uploadFile } from '../../utils/api.js'
import { refreshTabBadges } from '../../utils/badges.js'
import { formatDateTime } from '../../utils/format.js'

const conversationId = ref('')
const conversation = ref(null)
const messages = ref([])
const draft = ref('')
const scrollTop = ref(999999)
const isRecording = ref(false)
const audioDraft = ref({
  path: '',
  durationSeconds: 0
})

const currentPlaying = ref('')
let innerAudioContext = null

const playAudio = (url) => {
  if (!url) return

  if (!innerAudioContext) {
    innerAudioContext = uni.createInnerAudioContext()
    innerAudioContext.onEnded(() => {
      currentPlaying.value = ''
    })
    innerAudioContext.onError((err) => {
      console.error('[chat:playAudio]', err)
      currentPlaying.value = ''
      uni.showToast({ title: '播放失败', icon: 'none' })
    })
  }

  if (currentPlaying.value === url) {
    innerAudioContext.stop()
    currentPlaying.value = ''
  } else {
    innerAudioContext.src = resolveAssetUrl(url)
    innerAudioContext.play()
    currentPlaying.value = url
  }
}

const isGiftMessage = (item) => {
  return item.role === 'USER' && item.textContent && item.textContent.startsWith('【赠送礼物】')
}

const extractGiftName = (text) => {
  const match = text.match(/【赠送礼物】：([^\n]+)/)
  return match ? match[1] : '精美礼物'
}



const showGiftPanel = ref(false)
const holdings = ref([])

const toggleGiftPanel = async () => {
  showGiftPanel.value = !showGiftPanel.value
  if (showGiftPanel.value && holdings.value.length === 0) {
    try {
      const resp = await request({ url: '/api/assets' })
      holdings.value = resp.holdings || []
    } catch (e) {
      console.error('Failed to load assets', e)
    }
  }
}

const sendGift = async (item) => {
  toggleGiftPanel()
  const giftText = `【赠送礼物】：${item.title}\n（这是一份充满心意的珍贵礼物，希望你能喜欢！）`
  try {
    await sendPayload({
      messageType: 'TEXT',
      textContent: giftText,
      mediaUrl: item.coverUrl
    })
    uni.showToast({ title: '礼物已送达', icon: 'success' })
  } catch (error) {
    uni.showToast({ title: '送礼失败', icon: 'none' })
  }
}

let pollTimer = null
let recorderManager = null

const fallbackAvatar = (role) => {
  return role === 'USER' ? resolveAssetUrl('/static/default.png') : resolveAssetUrl('/static/xiaomei.jpg')
}

const bindRecorder = () => {
  // #ifndef H5
  if (recorderManager || typeof uni.getRecorderManager !== 'function') {
    return
  }

  const manager = uni.getRecorderManager()
  if (!manager) return

  recorderManager = manager
  recorderManager.onStop((result) => {
    isRecording.value = false
    audioDraft.value = {
      path: result.tempFilePath,
      durationSeconds: Math.round((result.duration || 0) / 1000)
    }
    uni.showToast({ title: '语音已录制', icon: 'none' })
  })
  recorderManager.onError((error) => {
    isRecording.value = false
    console.error('[chat:recorder]', error)
    uni.showToast({ title: '录音失败', icon: 'none' })
  })
  // #endif
}

const refreshConversation = async () => {
  if (!conversationId.value) return

  const isFirstLoad = !conversation.value
  if (isFirstLoad) {
    uni.showLoading({ title: '加载中...', mask: true })
  }

  try {
    const response = await request({
      url: `/api/chat/conversations/${conversationId.value}`
    })
    conversation.value = response.conversation || null
    messages.value = response.messages || []
    scrollTop.value = 999999
    await request({
      url: `/api/chat/conversations/${conversationId.value}/read`,
      method: 'POST',
      data: {}
    })
    await refreshTabBadges()
  } catch (error) {
    console.error('[chat:refreshConversation]', error)
    uni.showToast({ title: '会话加载失败', icon: 'none' })
  } finally {
    if (isFirstLoad) {
      uni.hideLoading()
    }
  }
}

const sendPayload = async (payload) => {
  await request({
    url: `/api/chat/conversations/${conversationId.value}/messages`,
    method: 'POST',
    data: payload
  })
  draft.value = ''
  clearAudioDraft()
  await refreshConversation()
}

const sendCurrent = async () => {
  if (audioDraft.value.path) {
    try {
      const uploaded = await uploadFile({
        url: '/api/chat/uploads/audio',
        filePath: audioDraft.value.path
      })
      await sendPayload({
        messageType: 'AUDIO',
        mediaUrl: uploaded.url,
        mediaMimeType: uploaded.mimeType,
        durationSeconds: audioDraft.value.durationSeconds,
        transcription: draft.value.trim()
      })
    } catch (error) {
      console.error('[chat:sendAudio]', error)
      uni.showToast({ title: '语音发送失败', icon: 'none' })
    }
    return
  }

  if (!draft.value.trim()) {
    uni.showToast({ title: '先写点内容吧', icon: 'none' })
    return
  }

  try {
    await sendPayload({
      messageType: 'TEXT',
      textContent: draft.value.trim()
    })
  } catch (error) {
    console.error('[chat:sendText]', error)
    uni.showToast({ title: '发送失败', icon: 'none' })
  }
}

const chooseImage = async () => {
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
    const filePath = chooser.tempFilePaths?.[0]
    if (!filePath) return
    const uploaded = await uploadFile({
      url: '/api/chat/uploads/image',
      filePath
    })
    await sendPayload({
      messageType: 'IMAGE',
      mediaUrl: uploaded.url,
      mediaMimeType: uploaded.mimeType,
      textContent: draft.value.trim() || undefined
    })
  } catch (error) {
    if (String(error?.errMsg || error).includes('cancel')) return
    console.error('[chat:chooseImage]', error)
    uni.showToast({ title: '图片发送失败', icon: 'none' })
  }
}

const toggleRecord = () => {
  bindRecorder()
  if (!recorderManager) {
    uni.showToast({ title: '当前环境不支持录音', icon: 'none' })
    return
  }

  if (isRecording.value) {
    recorderManager.stop()
    return
  }

  clearAudioDraft()
  isRecording.value = true
  recorderManager.start({
    duration: 60000,
    format: 'mp3'
  })
}

const clearAudioDraft = () => {
  audioDraft.value = {
    path: '',
    durationSeconds: 0
  }
}

const goBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.switchTab({
      url: '/pages/chat/chat',
      fail: () => {
        uni.reLaunch({ url: '/pages/chat/chat' })
      }
    })
  }
}

const goMarket = () => {
  toggleGiftPanel()
  uni.switchTab({
    url: '/pages/market/market'
  })
}

const startPolling = () => {
  stopPolling()
  pollTimer = setInterval(() => {
    refreshConversation()
  }, 8000)
}

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onLoad((options) => {
  conversationId.value = options?.id || ''
  refreshConversation()
})

onShow(() => {
  bindRecorder()
  if (conversationId.value && conversation.value) {
    refreshConversation()
  }
  startPolling()
})

onHide(() => {
  stopPolling()
})

onUnload(() => {
  stopPolling()
  if (recorderManager && isRecording.value) {
    recorderManager.stop()
  }
  if (innerAudioContext) {
    innerAudioContext.destroy()
  }
})
</script>

<style scoped>
.page-chat-detail {
  min-height: 100vh;
  background: #f6f7f8;
}

.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  height: 96rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.96);
  border-bottom: 1rpx solid #e5e7eb;
}

.header-main {
  flex: 1;
  padding: 0 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.header-title {
  font-size: 28rpx;
  font-weight: 700;
}

.header-sub {
  margin-top: 6rpx;
  font-size: 20rpx;
  color: #9ca3af;
}

.header-action {
  min-width: 72rpx;
  font-size: 24rpx;
  color: #36a4f2;
}

.header-back {
  font-size: 44rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  margin-top: -6rpx;
}

.scroll {
  height: calc(100vh - 320rpx);
  padding-top: 96rpx;
}

.message-list {
  padding: 24rpx 24rpx 0;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.message-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.message-row.self {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 999rpx;
  background: #e5e7eb;
  flex-shrink: 0;
}

.message-bubble {
  max-width: 520rpx;
  border-radius: 24rpx;
  padding: 18rpx 20rpx;
  background: #ffffff;
  box-shadow: 0 12rpx 24rpx rgba(15, 23, 42, 0.05);
}

.message-bubble.self {
  background: #36a4f2;
}

.message-text,
.audio-text {
  font-size: 24rpx;
  line-height: 1.7;
  color: #334155;
}

.message-bubble.self .message-text {
  color: #ffffff;
}

.message-image {
  width: 360rpx;
  border-radius: 18rpx;
}

.message-audio {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.audio-play-btn {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: rgba(54, 164, 242, 0.1);
  padding: 12rpx 24rpx;
  border-radius: 99rpx;
  margin-top: 10rpx;
  color: #36a4f2;
  font-size: 24rpx;
  align-self: flex-start;
}

.message-bubble.self .audio-play-btn {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.audio-play-icon {
  font-size: 20rpx;
}

.audio-label {
  font-size: 22rpx;
  color: #36a4f2;
}

.message-time {
  display: block;
  margin-top: 10rpx;
  font-size: 18rpx;
  color: #94a3b8;
}

.message-bubble.self .message-time {
  color: rgba(255, 255, 255, 0.75);
}

/* Luxury Gift Card Styles */
.message-bubble.is-gift-card {
  background: linear-gradient(145deg, #1e293b, #0f172a);
  border: 1rpx solid #38bdf8;
  box-shadow: 0 10rpx 30rpx rgba(56, 189, 248, 0.25), inset 0 0 20rpx rgba(56, 189, 248, 0.1);
  padding: 32rpx;
  min-width: 460rpx;
  position: relative;
  overflow: hidden;
  border-radius: 28rpx;
}

.message-bubble.is-gift-card::before {
  content: '';
  position: absolute;
  top: -50%; left: -50%; width: 200%; height: 200%;
  background: linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent);
  transform: rotate(45deg) translateY(-100%);
  animation: sweep 3s infinite linear;
  pointer-events: none;
}

@keyframes sweep {
  0% { transform: rotate(45deg) translateY(-100%); }
  50% { transform: rotate(45deg) translateY(100%); }
  100% { transform: rotate(45deg) translateY(100%); }
}

.gift-message-content {
  display: flex;
  align-items: center;
  gap: 32rpx;
}

.gift-msg-icon-wrap.gift-msg-icon-wrap-large {
  width: 120rpx;
  height: 120rpx;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 20rpx;
  border: 1rpx solid rgba(56, 189, 248, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 4rpx 15rpx rgba(0,0,0,0.3);
  flex-shrink: 0;
}

.gift-msg-icon.gift-msg-icon-large {
  width: 100%;
  height: 100%;
}

.gift-msg-info-large {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  flex: 1;
}

.gift-msg-info-large .gift-msg-title {
  color: #bae6fd;
  font-size: 22rpx;
  font-weight: 500;
  margin-bottom: 6rpx;
}

.gift-msg-info-large .gift-msg-name {
  color: #ffffff;
  font-size: 34rpx;
  font-weight: 800;
  text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.4);
}

.message-bubble.is-gift-card .message-time {
  margin-top: 20rpx;
  color: rgba(255,255,255,0.4);
  text-align: right;
  border-top: 1rpx solid rgba(255,255,255,0.05);
  padding-top: 16rpx;
}

.draft-chip {
  margin: 16rpx 24rpx 0;
  padding: 18rpx 20rpx;
  border-radius: 20rpx;
  background: rgba(54, 164, 242, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.draft-chip-text {
  flex: 1;
  font-size: 22rpx;
  color: #36a4f2;
}

.draft-chip-action {
  margin-left: 16rpx;
  font-size: 22rpx;
  color: #ef4444;
}

.composer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 24rpx 30rpx;
  background: rgba(255, 255, 255, 0.98);
  border-top: 1rpx solid #e5e7eb;
}

.composer-input {
  width: 100%;
  min-height: 88rpx;
  padding: 18rpx 20rpx;
  border-radius: 22rpx;
  background: #f3f4f6;
  font-size: 24rpx;
  box-sizing: border-box;
}

.composer-placeholder {
  color: #9ca3af;
}

.composer-actions {
  margin-top: 16rpx;
  display: flex;
  gap: 12rpx;
}

.tool-btn,
.send-btn {
  height: 72rpx;
  line-height: 72rpx;
  border-radius: 999rpx;
  text-align: center;
  font-size: 24rpx;
}

.tool-btn {
  flex: 1;
  background: #f3f4f6;
  color: #475569;
}

.send-btn {
  min-width: 180rpx;
  background: #36a4f2;
  color: #ffffff;
}

/* Gift Settings - Tik Tok Style */
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.gift-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 100;
}

.gift-panel {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  height: 560rpx;
  background: #ffffff;
  border-radius: 36rpx 36rpx 0 0;
  z-index: 101;
  padding: 32rpx 0;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  box-shadow: 0 -10rpx 40rpx rgba(0, 0, 0, 0.05);
}

.gift-header {
  padding: 0 40rpx 32rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.gift-title {
  color: #0f172a;
  font-size: 32rpx;
  font-weight: bold;
}

.gift-close {
  color: #94a3b8;
  font-size: 44rpx;
  line-height: 1;
}

.gift-list {
  flex: 1;
  width: 100%;
}

.gift-items {
  display: flex;
  padding: 0 32rpx;
  gap: 20rpx;
}

.gift-card {
  width: 200rpx;
  flex-shrink: 0;
  background: #f8fafc;
  border: 1rpx solid #e2e8f0;
  border-radius: 20rpx;
  padding: 24rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
}

.gift-icon {
  width: 110rpx;
  height: 110rpx;
  border-radius: 16rpx;
}

.gift-name {
  color: #1e293b;
  font-size: 26rpx;
  margin-top: 16rpx;
  font-weight: 700;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.gift-qty {
  color: #64748b;
  font-size: 20rpx;
  margin-top: 8rpx;
}

.gift-send-btn {
  margin-top: 24rpx;
  background: linear-gradient(135deg, #36a4f2, #7dd3fc);
  color: #ffffff;
  font-size: 24rpx;
  font-weight: 600;
  padding: 10rpx 36rpx;
  border-radius: 99rpx;
  box-shadow: 0 8rpx 20rpx rgba(54, 164, 242, 0.25);
}

.gift-card-more {
  background: #f1f5f9;
  border: 1rpx dashed #cbd5e1;
}

.gift-icon-more {
  width: 110rpx;
  height: 110rpx;
  border-radius: 16rpx;
  background: #e2e8f0;
  color: #94a3b8;
  font-size: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 300;
}

.gift-send-btn.outline {
  background: transparent;
  color: #36a4f2;
  border: 2rpx solid #36a4f2;
  box-shadow: none;
  padding: 8rpx 34rpx;
}
</style>
