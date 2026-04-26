# 后台页面与接口文档

## 1. 文档范围

本文档基于当前代码仓库里的三个部分整理：

- `apps/admin`：轻量运营后台
- `apps/ops-admin`：完整运营后台
- `apps/api`：NestJS 后端接口

这份文档的目标是把现有后台页面、用途、对应接口，以及后端接口清单一次讲清楚，方便继续开发、交接、补页面、补权限和补接口。

工程化接口主文件请优先使用：`/Volumes/ORICO/杨/docs/api/ai-social.openapi.yaml`

## 2. 当前本地入口

### 2.1 页面入口

| 模块 | 本地入口 | 说明 |
| --- | --- | --- |
| H5 登录页 `apps/h5` | `http://127.0.0.1:5173/#/login` | H5 统一登录入口，登录成功后跳转到 `/moments` |
| H5 朋友圈页 `apps/h5` | `http://127.0.0.1:5173/#/moments` | H5 登录后的主页面，未登录会被路由守卫重定向到 `/login` |
| 轻量运营后台 `apps/admin` | `http://127.0.0.1:5174/admin/#/login` | 面向一期运营控制台，偏内容与审计 |
| 完整运营后台 `apps/ops-admin` | `http://127.0.0.1:5175/admin/#/login` | 面向完整运营与资产/订单/商品巡检 |
| 完整运营后台首页 `apps/ops-admin` | `http://127.0.0.1:5175/admin/#/dashboard` | 完整运营后台首页，未登录会被路由守卫重定向到 `/login` |
| 小程序/H5 主 API | `http://127.0.0.1:3100/api` | 绝大多数业务接口都走这里 |
| 健康检查 | `http://127.0.0.1:3100/health` | 无需鉴权 |

### 2.2 默认管理员登录

当前两个后台页面内置的默认测试登录信息一致：

- 账号：`opsadmin`
- 密码：`Admin@123456`

注意：

- 后台实际走的是普通登录接口 `POST /api/auth/login`
- 登录 body 里的 `accountType` 固定传 `USER`
- 是否能进入后台，最终以返回结果中的 `account.isAdmin === true` 为准

H5 当前内置的默认测试账号如下：

- 普通用户：`nova / Demo@123456`
- 数字人账号：`mobai / Human@123456`

H5 登录成功后默认跳转到：`http://127.0.0.1:5173/#/moments`

## 3. 后台页面总表

## 3.1 轻量运营后台 `apps/admin`

当前共 6 个页面。

| 路由 | 页面文件 | 页面用途 | 主要接口 |
| --- | --- | --- | --- |
| `/login` | `apps/admin/src/views/LoginView.vue` | 管理员登录入口 | `POST /api/auth/login`、`GET /api/auth/me` |
| `/dashboard` | `apps/admin/src/views/DashboardView.vue` | 一期运营总览，看账号数、数字人数、动态数、未读互动、定时任务、热搜榜 | `GET /api/admin/overview` |
| `/users` | `apps/admin/src/views/UsersView.vue` | 查看系统内所有账号，支持筛选普通用户/数字人，并查看详情 JSON | `GET /api/admin/users`、`GET /api/admin/users/:id` |
| `/posts` | `apps/admin/src/views/PostsView.vue` | AI 社交动态后台，支持按范围/来源/关键词筛选，并可“上帝视角代发” | `GET /api/admin/posts`、`GET /api/admin/users`、`POST /api/admin/posts/impersonate` |
| `/ai-publish` | `apps/admin/src/views/AiPublishView.vue` | 数字人 AI 发帖后台，先生成草稿，再立即发布或加入定时队列 | `GET /api/admin/users?accountType=DIGITAL_HUMAN`、`POST /api/admin/ai-publish/generate`、`POST /api/admin/ai-publish/publish`、`POST /api/admin/ai-publish/schedule` |
| `/audit` | `apps/admin/src/views/AuditView.vue` | 查看互动消息审计，并管理热搜置顶 | `GET /api/admin/notifications`、`GET /api/admin/overview`、`PATCH /api/admin/topics/:id/pin` |

## 3.2 完整运营后台 `apps/ops-admin`

当前共 10 个页面。

| 路由 | 页面文件 | 页面用途 | 主要接口 |
| --- | --- | --- | --- |
| `/login` | `apps/ops-admin/src/views/LoginView.vue` | 管理员登录入口 | `POST /api/auth/login`、`GET /api/auth/me` |
| `/dashboard` | `apps/ops-admin/src/views/DashboardView.vue` | 完整运营总览，除了基础指标，还会关心商品、订单、会话规模 | `GET /api/admin/overview` |
| `/users` | `apps/ops-admin/src/views/UsersView.vue` | 查看当前系统内所有用户和数字人账号，支持详情抽屉 | `GET /api/admin/users`、`GET /api/admin/users/:id` |
| `/posts` | `apps/ops-admin/src/views/PostsView.vue` | AI 社交推文/动态后台，支持筛选和后台代发 | `GET /api/admin/posts`、`GET /api/admin/users`、`POST /api/admin/posts/impersonate` |
| `/products` | `apps/ops-admin/src/views/ProductsView.vue` | 商品与数字人上架后台，支持数字人商品、礼物、精选商品新增/编辑 | `GET /api/admin/products`、`GET /api/admin/users?accountType=DIGITAL_HUMAN`、`POST /api/admin/products` |
| `/orders` | `apps/ops-admin/src/views/OrdersView.vue` | 订单流水后台，查看平台币购买后的订单、余额和商品明细 | `GET /api/admin/orders` |
| `/assets` | `apps/ops-admin/src/views/AssetsView.vue` | 资产审计后台，查看成交后形成的资产归属 | `GET /api/admin/assets` |
| `/chats` | `apps/ops-admin/src/views/ChatsView.vue` | 会话巡检后台，查看用户与数字人的最近消息摘要 | `GET /api/admin/chats` |
| `/ai-publish` | `apps/ops-admin/src/views/AiPublishView.vue` | 数字人 AI 发帖后台，支持生成、立即发布、定时发布 | `GET /api/admin/users?accountType=DIGITAL_HUMAN`、`POST /api/admin/ai-publish/generate`、`POST /api/admin/ai-publish/publish`、`POST /api/admin/ai-publish/schedule` |
| `/audit` | `apps/ops-admin/src/views/AuditView.vue` | 查看通知审计、热搜置顶等内容运营审计能力 | `GET /api/admin/notifications`、`GET /api/admin/overview`、`PATCH /api/admin/topics/:id/pin` |

## 4. 后端接口约定

### 4.1 基础规则

- 默认接口前缀：`/api`
- 无前缀例外：
  - `GET /health`
  - `POST /auth/wechat`
- 普通业务接口：需要 `Authorization: Bearer <token>`
- 后台管理接口：需要普通鉴权 + 管理员权限
- 文件上传接口：
  - 社交图片：`multipart/form-data`，字段名 `files`
  - 聊天图片/音频：`multipart/form-data`，字段名 `file`

### 4.2 主要枚举值

| 枚举 | 可选值 |
| --- | --- |
| `AccountType` | `USER`、`DIGITAL_HUMAN` |
| `PostScope` | `MOMENTS`、`SQUARE` |
| `PostSource` | `MANUAL`、`AI`、`ADMIN_IMPERSONATED` |
| `ProductType` | `DIGITAL_HUMAN`、`GIFT`、`MERCH` |
| `ProductStatus` | `ACTIVE`、`SOLD_OUT`、`ARCHIVED` |
| `MessageType` | `TEXT`、`IMAGE`、`AUDIO`、`SYSTEM` |
| `NotificationType` | `LIKE`、`COMMENT`、`MENTION`、`FOLLOW`、`AI_INTERACTION`、`CHAT_MESSAGE`、`ORDER_UPDATE`、`SYSTEM` |

## 5. 接口文档

## 5.1 健康检查

| Method | Path | 鉴权 | 说明 | 请求参数 | 主要返回 |
| --- | --- | --- | --- | --- | --- |
| GET | `/health` | 否 | 服务健康检查 | 无 | `{ ok, service, now }` |

## 5.2 认证与会话

| Method | Path | 鉴权 | 说明 | 请求参数 | 主要返回 |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/auth/register` | 否 | 用户注册，只支持公开注册普通用户 | `username`、`displayName`、`password`、可选 `email`、可选 `accountType` | `token`、`expiresAt`、`account`、`stats`、`wallet`、`assetsSummary`、`ownedDigitalHumans` |
| POST | `/api/auth/login` | 否 | 账号密码登录，小程序/H5/后台共用 | `identifier`、`password`、`accountType` | `token`、`expiresAt`、`account`、`stats`、`wallet`、`assetsSummary`、`ownedDigitalHumans` |
| POST | `/api/auth/wechat/login` | 否 | 微信 code 登录标准接口 | `code` | `openid`、`unionid`、`isFirstLogin`、`token`、`expiresAt`、`account`、`stats`、`wallet`、`assetsSummary` |
| POST | `/auth/wechat` | 否 | 微信小程序兼容登录接口，给小程序旧逻辑直连用 | `code` | 与 `/api/auth/wechat/login` 基本一致，额外带 `compatMode` 标记 |
| POST | `/api/auth/logout` | 是 | 注销当前 token | 无 | `{ success: true }` |
| GET | `/api/auth/me` | 是 | 获取当前会话用户资料 | 无 | `account`、`stats`、`wallet`、`assetsSummary`、`ownedDigitalHumans` |

补充说明：

- 后台页面登录使用的是 `POST /api/auth/login`
- 后台进入成功的判断条件不是 `accountType`，而是 `account.isAdmin === true`

## 5.3 通知模块

| Method | Path | 鉴权 | 说明 | 请求参数 | 主要返回 |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/notifications` | 是 | 获取当前用户通知列表 | Query: `page`、`pageSize` | `{ items, page?, pageSize?, total? }`，每项包含通知类型、标题、内容、已读时间、actor、recipient、post |
| POST | `/api/notifications/read` | 是 | 批量已读指定通知 | Body: `ids: string[]` | 已读结果对象 |
| POST | `/api/notifications/read-all` | 是 | 一键全部已读 | 无 | 操作结果对象 |
| GET | `/api/notifications/unread-count` | 是 | 获取未读数量 | 无 | `{ unreadCount }` |

## 5.4 社交与内容模块

| Method | Path | 鉴权 | 说明 | 请求参数 | 主要返回 |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/moments/feed` | 是 | 获取朋友圈 feed | Query: `page`、`pageSize` | `{ items }`，帖子包含作者、媒体、点赞评论统计、viewer 状态 |
| GET | `/api/square/feed` | 是 | 获取广场 feed | Query: `page`、`pageSize` | `{ items, hotTopics, recommendedAccounts }` |
| POST | `/api/posts` | 是 | 发布动态 | Body: `scope`、`content`、可选 `mediaUrls[]` | 新建 post 对象 |
| POST | `/api/uploads/images` | 是 | 上传社交图片，最多 4 张，每张最多 5MB | FormData: `files[]` | `{ items }`，每项为图片 URL / 元数据 |
| GET | `/api/posts/:id` | 是 | 获取单条动态详情 | Path: `id` | 帖子详情对象，含作者、媒体、互动和评论摘要 |
| GET | `/api/posts/:id/comments` | 是 | 获取动态评论列表 | Path: `id`；Query: `page`、`pageSize` | `{ items }` |
| POST | `/api/posts/:id/like` | 是 | 点赞或取消点赞 | Path: `id` | 点赞状态结果，通常会返回当前 liked / count 变化 |
| POST | `/api/posts/:id/comments` | 是 | 给动态发表评论 | Path: `id`；Body: `content` | 新评论对象 |
| POST | `/api/comments/:id/reply` | 是 | 回复某条评论 | Path: `id`；Body: `content` | 新回复对象 |
| POST | `/api/posts/:id/mentions` | 是 | 提及用户 | Path: `id`；Body: `accountIds: string[]` | mention 写入结果 |
| GET | `/api/search/users` | 是 | 搜索用户/数字人 | Query: `q` | `{ items }`，适合搜索框联想 |
| GET | `/api/profiles/:accountId` | 是 | 查看指定账号主页 | Path: `accountId` | profile 对象，含基础资料、动态、关系状态等 |
| POST | `/api/follows/:accountId` | 是 | 关注或取消关注 | Path: `accountId` | `{ following }` 或类似关系结果 |
| POST | `/api/friends/:accountId/request` | 是 | 发起好友申请 | Path: `accountId` | 好友申请结果 |
| POST | `/api/friends/:requestId/accept` | 是 | 同意好友申请 | Path: `requestId` | 接受结果 |

## 5.5 商城、订单与资产模块

| Method | Path | 鉴权 | 说明 | 请求参数 | 主要返回 |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/market/home` | 是 | 获取商城首页聚合数据 | 无 | `wallet`、`cart`、`sections.digitalHumans`、`sections.gifts`、`sections.merch` |
| GET | `/api/products` | 是 | 获取商品列表 | Query: 可选 `productType`、`q` | `{ items }`，返回商品列表 |
| GET | `/api/products/:id` | 是 | 获取商品详情 | Path: `id` | 商品详情对象 |
| GET | `/api/cart` | 是 | 获取购物车 | 无 | `items`、`totalCoins`、`totalQty` |
| POST | `/api/cart/items` | 是 | 加入购物车或创建购物车项 | Body: `productId`、`quantity` | 更新后的购物车或购物车项 |
| PATCH | `/api/cart/products/:productId` | 是 | 修改指定商品在购物车中的数量 | Path: `productId`；Body: `quantity` | 更新后的购物车或购物车项 |
| DELETE | `/api/cart/items/:id` | 是 | 删除购物车项 | Path: `id` | 删除结果 |
| POST | `/api/wallet/recharge` | 是 | 钱包充值（平台币） | Body: `amountCoins` | 充值后钱包结果 |
| POST | `/api/orders/checkout` | 是 | 下单结算 | Body: 可选 `items[]`，每项 `productId`、`quantity` | 订单对象、扣款结果、资产发放结果 |
| GET | `/api/orders` | 是 | 获取当前用户订单列表 | 无 | `{ items }` 或订单数组 |
| GET | `/api/assets` | 是 | 获取当前用户资产页数据 | 无 | 资产总览、资产列表、持仓信息 |

## 5.6 聊天模块

| Method | Path | 鉴权 | 说明 | 请求参数 | 主要返回 |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/chat/conversations` | 是 | 获取当前用户会话列表 | 无 | `{ items }` 或会话数组，含未读数、最近消息 |
| POST | `/api/chat/conversations` | 是 | 确保某个数字人会话存在，不存在则创建 | Body: `digitalHumanAccountId` | 会话对象 |
| GET | `/api/chat/conversations/:id` | 是 | 获取会话详情和消息分页 | Path: `id`；Query: `page`、`pageSize` | 会话详情、消息列表 |
| POST | `/api/chat/conversations/:id/messages` | 是 | 发送消息 | Path: `id`；Body: `messageType`、可选 `textContent`、`mediaUrl`、`mediaMimeType`、`durationSeconds`、`transcription` | 新消息对象、会话更新结果 |
| POST | `/api/chat/conversations/:id/read` | 是 | 会话标记已读 | Path: `id` | 已读结果 |
| GET | `/api/chat/unread-summary` | 是 | 获取聊天未读汇总 | 无 | 未读会话数、未读消息数等摘要 |
| POST | `/api/chat/uploads/image` | 是 | 上传聊天图片，单文件最大 8MB | FormData: `file` | 图片 URL / 元数据 |
| POST | `/api/chat/uploads/audio` | 是 | 上传聊天音频，单文件最大 12MB | FormData: `file` | 音频 URL / 元数据 |

## 5.7 管理后台专用接口

所有以下接口都要求：

- `Authorization: Bearer <token>`
- 当前账号 `account.isAdmin === true`

| Method | Path | 说明 | 请求参数 | 主要返回 |
| --- | --- | --- | --- | --- |
| GET | `/api/admin/overview` | 运营总览 | 无 | `metrics`、`hotTopics`。当前指标包括 `accounts`、`users`、`digitalHumans`、`posts`、`unreadNotifications`、`scheduledTasks`、`products`、`orders`、`conversations` |
| GET | `/api/admin/users` | 后台用户列表 | Query: 可选 `q`、`accountType` | `{ items }`，每项含 `id`、`username`、`displayName`、`accountType`、`tagline`、`isAdmin`、`isActive`、`ownerAccountId`、`isPresale`、`cozeBotId`、`stats` |
| GET | `/api/admin/users/:id` | 后台用户详情 | Path: `id` | `{ account, stats }`，含 userProfile、digitalHuman、最近 10 条 posts |
| GET | `/api/admin/posts` | 后台动态列表 | Query: 可选 `scope`、`source`、`q` | `{ items }`，每项含作者、媒体、点赞评论统计 |
| POST | `/api/admin/posts/impersonate` | 后台代发动态 | Body: `authorId`、`scope`、`content`、可选 `mediaUrls[]` | 新发布的 post；同时会写 `adminImpersonationLog` |
| GET | `/api/admin/products` | 商品目录列表 | Query: 可选 `productType`、`q` | `{ items }`，每项含 `slug`、`name`、`productType`、`status`、`priceCoins`、`stock`、`relatedAccount` |
| POST | `/api/admin/products` | 新增或编辑商品/数字人上架 | Body: 可选 `id`、`slug`、`name`、可选 `subtitle`、可选 `description`、`productType`、`status`、`priceCoins`、可选 `stock`、可选 `coverUrl`、可选 `badge`、可选 `sortOrder`、可选 `relatedAccountId` | 商品对象。若 `productType=DIGITAL_HUMAN` 则 `relatedAccountId` 必填 |
| GET | `/api/admin/orders` | 订单流水列表 | Query: 可选 `q` | `{ items }`，每项含订单号、状态、金额、下单用户、余额、订单商品明细 |
| GET | `/api/admin/assets` | 资产列表 | Query: 可选 `q` | `{ items }`，每项含资产类型、归属用户、来源商品、数量、订单号 |
| GET | `/api/admin/chats` | 会话巡检列表 | Query: 可选 `q` | `{ items }`，每项含 owner、digitalHuman、`unreadCount`、最近 3 条消息 |
| POST | `/api/admin/ai-publish/generate` | 生成数字人发帖草稿 | Body: `digitalHumanId`、`topic`、`scope`、可选 `prompt`、可选 `generateImage` | `topic`、`scope`、`content`、`mode`、`image.enabled/status/workflowId/url` |
| POST | `/api/admin/ai-publish/publish` | 立即发布数字人 AI 动态 | Body: `digitalHumanId`、`scope`、`content`、可选 `mediaUrls[]` | 新发布的 post；如数字人已有 owner，会给 owner 写一条 `AI_INTERACTION` 通知 |
| POST | `/api/admin/ai-publish/schedule` | 定时发布数字人 AI 动态 | Body: `digitalHumanId`、`topic`、`scope`、可选 `prompt`、可选 `generateImage`、`scheduledAt` | 新建 `aiPublishTask` 记录，状态为 `SCHEDULED` |
| GET | `/api/admin/notifications` | 后台通知审计列表 | 无 | `{ items }`，每项含 `type`、`title`、`content`、`actor`、`recipient`、`post.excerpt` |
| PATCH | `/api/admin/topics/:id/pin` | 热搜置顶或取消置顶 | Path: `id`；Body: `pinned: boolean` | 更新后的 topic 记录 |

## 5.8 后台实时消息补充

两个后台 Pinia session store 都会在登录成功后建立 Socket.IO 连接，用于实时更新未读数。

| 类型 | 值 |
| --- | --- |
| 连接地址 | `VITE_SOCKET_URL`，未配置时回退到当前站点 origin |
| 鉴权方式 | `auth: { token }` |
| 当前使用事件 | `notification:count` |
| 事件载荷 | `{ unreadCount: number }` |

## 6. 页面与接口对应关系

这一节按“你关心的后台能力”来对照。

| 业务能力 | 后台页面 | 主要接口 |
| --- | --- | --- |
| 查看当前系统内所有用户 | `/users` | `GET /api/admin/users`、`GET /api/admin/users/:id` |
| 查看数字人列表 | `/users`、`/ai-publish`、`/products` | `GET /api/admin/users?accountType=DIGITAL_HUMAN` |
| 数字人上架 | `/products` | `GET /api/admin/products`、`POST /api/admin/products` |
| AI 社交推文后台 | `/posts` | `GET /api/admin/posts`、`POST /api/admin/posts/impersonate` |
| AI 自动生成数字人动态 | `/ai-publish` | `POST /api/admin/ai-publish/generate` |
| AI 动态立即发布 | `/ai-publish` | `POST /api/admin/ai-publish/publish` |
| AI 动态定时发布 | `/ai-publish` | `POST /api/admin/ai-publish/schedule` |
| 查看运营总览 | `/dashboard` | `GET /api/admin/overview` |
| 查看互动消息审计 | `/audit` | `GET /api/admin/notifications` |
| 热搜置顶管理 | `/audit` | `PATCH /api/admin/topics/:id/pin` |
| 查看订单流水 | `/orders` | `GET /api/admin/orders` |
| 查看资产归属 | `/assets` | `GET /api/admin/assets` |
| 查看用户与数字人的聊天巡检 | `/chats` | `GET /api/admin/chats` |

## 7. 建议后续补强点

如果后面继续扩后台，建议优先补下面这些：

| 方向 | 建议 |
| --- | --- |
| 文档化 | 给每个接口补一份真实示例请求/响应 JSON |
| 权限 | 区分内容运营、商品运营、财务巡检、超级管理员等角色 |
| 后台页面 | 给用户页、会话页、订单页补详情页，而不是只看 JSON 抽屉 |
| 审计 | 给代发、上架、改价、置顶、定时发布补完整操作日志 |
| API 规范 | 给后台接口统一加分页结构 `page/pageSize/total/items` |
| 接口测试 | 给 `apps/api` 增加 Postman/Apifox/OpenAPI 导出文件 |
