import { API_BASE } from '../config/api.js'
import { clearSession, getToken, patchSession, setSession } from './session.js'

const buildUrl = (path) => {
  if (!path) return API_BASE
  if (/^https?:\/\//.test(path)) return path
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
}

const parseResponseData = (data) => {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch (error) {
      return data
    }
  }
  return data
}

export const resolveAssetUrl = (value) => {
  if (!value) {
    return buildUrl('/static/default.png')
  }
  if (/^(https?:)?\/\//.test(value) || value.startsWith('data:')) {
    return value
  }
  return buildUrl(value)
}

export const request = ({ url, method = 'GET', data, auth = true, header = {} }) =>
  new Promise((resolve, reject) => {
    const token = getToken()
    const nextHeader = {
      'Content-Type': 'application/json',
      ...header
    }

    if (auth && token) {
      nextHeader.Authorization = `Bearer ${token}`
    }

    uni.request({
      url: buildUrl(url),
      method,
      data,
      header: nextHeader,
      success: (response) => {
        const body = parseResponseData(response.data)
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(body)
          return
        }

        if (response.statusCode === 401) {
          clearSession()
          try {
            uni.reLaunch({
              url: '/pages/login/login'
            })
          } catch (navError) {
            console.error('[request:401]', navError)
          }
        }

        const error = new Error((body && (body.message || body.error)) || `HTTP ${response.statusCode}`)
        error.body = body
        error.statusCode = response.statusCode
        reject(error)
      },
      fail: reject
    })
  })

export const uploadFile = ({ url, filePath, name = 'file', formData = {}, auth = true }) =>
  new Promise((resolve, reject) => {
    const token = getToken()
    const header = {}

    if (auth && token) {
      header.Authorization = `Bearer ${token}`
    }

    uni.uploadFile({
      url: buildUrl(url),
      filePath,
      name,
      formData,
      header,
      success: (response) => {
        const body = parseResponseData(response.data)
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(body)
          return
        }
        const error = new Error((body && (body.message || body.error)) || `HTTP ${response.statusCode}`)
        error.body = body
        error.statusCode = response.statusCode
        reject(error)
      },
      fail: reject
    })
  })

export const fetchMe = async () => {
  const me = await request({
    url: '/api/auth/me'
  })
  patchSession(me)
  return me
}

export const loginWithWechat = async (code) => {
  const session = await request({
    url: '/auth/wechat',
    method: 'POST',
    auth: false,
    data: { code }
  })
  setSession(session)
  return session
}

export const loginWithPassword = async (payload) => {
  const session = await request({
    url: '/api/auth/login',
    method: 'POST',
    auth: false,
    data: payload
  })
  setSession(session)
  return session
}

export const registerAccount = async (payload) => {
  const session = await request({
    url: '/api/auth/register',
    method: 'POST',
    auth: false,
    data: payload
  })
  setSession(session)
  return session
}

export const logout = async () => {
  try {
    await request({
      url: '/api/auth/logout',
      method: 'POST'
    })
  } finally {
    clearSession()
  }
}
