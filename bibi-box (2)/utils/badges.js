import { isLoggedIn } from './session.js'
import { request } from './api.js'

const TABBAR_PAGES = new Set([
  'pages/market/market',
  'pages/social/moments',
  'pages/chat/chat',
  'pages/user/user'
])

const canUseTabBarBadge = () => {
  try {
    const pages = getCurrentPages()
    const current = pages && pages.length ? pages[pages.length - 1] : null
    const route = current?.route || ''
    return TABBAR_PAGES.has(route)
  } catch (error) {
    return false
  }
}

const setBadge = (index, count) => {
  if (!canUseTabBarBadge()) {
    return
  }

  const text = String(count > 99 ? '99+' : count)
  if (!count) {
    uni.removeTabBarBadge({
      index,
      fail: () => {}
    })
    return
  }
  uni.setTabBarBadge({
    index,
    text,
    fail: () => {}
  })
}

export const refreshTabBadges = async () => {
  if (!isLoggedIn()) {
    setBadge(1, 0)
    setBadge(2, 0)
    return
  }

  try {
    const [notify, chat] = await Promise.all([
      request({ url: '/api/notifications/unread-count' }),
      request({ url: '/api/chat/unread-summary' })
    ])

    setBadge(1, Number(notify?.unreadCount || 0))
    setBadge(2, Number(chat?.unreadCount || 0))
  } catch (error) {
    console.error('[refreshTabBadges]', error)
  }
}
