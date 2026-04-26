# Bibi Box 微信登录小接口（Node + Express）

## 作用

接收小程序 `wx.login` / `uni.login` 拿到的 **code**，在服务端用 **AppSecret** 调用微信 `jscode2session`，返回 **openid**（不把 `session_key` 返回给前端）。

## 快速开始

```bash
cd server
copy .env.example .env
# 编辑 .env，填入 WECHAT_MINI_APPID 和 WECHAT_MINI_SECRET

npm install
npm start
```

默认监听：`http://127.0.0.1:3000`

## 接口

- `GET /health` — 健康检查
- `POST /auth/wechat`
  - Body: `{ "code": "字符串" }`
  - 成功: `{ "openid": "...", "unionid": "..." }`（无 unionid 时可能省略）
  - 失败: `{ "error": "...", "message": "..." }`

## 小程序端配置

1. 将 `pages/login/login.vue` 里 `API_BASE` 改为你的接口地址（上线必须是 **HTTPS**）。
2. 在微信公众平台 → 开发 → 开发管理 → 服务器域名 → **request 合法域名** 添加该域名。
3. 本地调试：开发者工具可勾选「不校验合法域名」，并把 `API_BASE` 设为本机 IP（手机真机需同一局域网），例如 `http://192.168.1.100:3000`。

## 安全

- **永远不要**把 `WECHAT_MINI_SECRET` 写进小程序前端或提交到公开仓库。
- 若密钥曾泄露，请在公众平台 **重置 AppSecret**。
