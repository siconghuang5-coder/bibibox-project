const TOKEN_KEY = 'bibi-mini-token'
const SESSION_KEY = 'bibi-mini-session'
const LOGIN_ROUTE = 'pages/login/login'
const PROTECTED_ROUTES = new Set([
  'pages/market/market',
  'pages/social/moments',
  'pages/social/AIsquare',
  'pages/chat/chat',
  'pages/chat/detail',
  'pages/user/user',
  'pages/assets/assets',
  'pages/orders/orders',
  'pages/product/detail',
  'pages/profile/detail',
  'pages/notifications/list'
])

export const getToken = () => {
  try {
    return uni.getStorageSync(TOKEN_KEY) || ''
  } catch (error) {
    return ''
  }
}

export const getSession = () => {
  try {
    return uni.getStorageSync(SESSION_KEY) || null
  } catch (error) {
    return null
  }
}

export const setSession = (session) => {
  const token = session?.token || ''
  try {
    uni.setStorageSync(TOKEN_KEY, token)
    uni.setStorageSync(SESSION_KEY, session || null)
  } catch (error) {
    console.error('[setSession]', error)
  }
}

export const patchSession = (patch) => {
  const current = getSession() || {}
  const next = {
    ...current,
    ...patch
  }
  setSession(next)
  return next
}

export const clearSession = () => {
  try {
    uni.removeStorageSync(TOKEN_KEY)
    uni.removeStorageSync(SESSION_KEY)
  } catch (error) {
    console.error('[clearSession]', error)
  }
}

export const isLoggedIn = () => Boolean(getToken())

export const getCurrentRoute = () => {
  try {
    const pages = getCurrentPages()
    const current = pages && pages.length ? pages[pages.length - 1] : null
    return current?.route || ''
  } catch (error) {
    return ''
  }
}

export const ensureLogin = () => {
  if (isLoggedIn()) {
    return true
  }

  const route = getCurrentRoute()
  if (!PROTECTED_ROUTES.has(route)) {
    return false
  }

  try {
    uni.reLaunch({
      url: `/${LOGIN_ROUTE}`
    })
  } catch (error) {
    console.error('[ensureLogin]', error)
  }

  return false
}
