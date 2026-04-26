/**
 * 微信小程序登录：用 code 换取 openid（需配置 WECHAT_MINI_APPID / WECHAT_MINI_SECRET）
 * POST /auth/wechat  { "code": "wx.login 返回的 code" }
 */
require('dotenv').config()

const express = require('express')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3000
const path = require('path')

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
)
app.use(express.json())

// 提供静态文件访问，使得微信小程序可以通过 HTTP URL 访问到本地的视频和图片
app.use('/static', express.static(path.join(__dirname, '../static')))

const APPID = process.env.WECHAT_MINI_APPID
const SECRET = process.env.WECHAT_MINI_SECRET

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'bibi-box-auth' })
})

app.post('/auth/wechat', async (req, res) => {
  const { code } = req.body || {}

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'missing_code', message: '请提供 wx.login 返回的 code' })
  }

  if (!APPID || !SECRET) {
    console.error('[auth/wechat] 未配置 WECHAT_MINI_APPID 或 WECHAT_MINI_SECRET')
    return res.status(500).json({
      error: 'server_misconfigured',
      message: '服务端未配置小程序 AppID 或 AppSecret，请检查 .env'
    })
  }

  const url = new URL('https://api.weixin.qq.com/sns/jscode2session')
  url.searchParams.set('appid', APPID)
  url.searchParams.set('secret', SECRET)
  url.searchParams.set('js_code', code)
  url.searchParams.set('grant_type', 'authorization_code')

  try {
    const wxRes = await fetch(url.toString())
    const data = await wxRes.json()

    if (data.errcode) {
      console.error('[auth/wechat] weixin error', data)
      return res.status(400).json({
        error: 'weixin_error',
        errcode: data.errcode,
        errmsg: data.errmsg || 'code 无效或已使用'
      })
    }

    const { openid, session_key, unionid } = data

    // 不要把 session_key 返回给前端；openid 可给前端做展示/本地缓存
    return res.json({
      openid,
      unionid: unionid || undefined
    })
  } catch (e) {
    console.error('[auth/wechat]', e)
    return res.status(502).json({ error: 'upstream_error', message: '请求微信接口失败' })
  }
})

// 监听 0.0.0.0，手机通过局域网 IP（如 192.168.x.x）才能访问；仅 127.0.0.1 时真机无法连本机服务
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[bibi-box-auth] listening on http://0.0.0.0:${PORT}（本机也可 http://127.0.0.1:${PORT}）`)
  console.log(`[bibi-box-auth] POST /auth/wechat  { "code": "..." }`)
  if (!APPID || !SECRET) {
    console.warn('[bibi-box-auth] 警告：未配置 WECHAT_MINI_APPID / WECHAT_MINI_SECRET，复制 server/.env.example 为 .env 并填写')
  }
})
