# 宝塔一期部署说明

## 目标环境

- 站点：`110.42.229.152:3000`
- 站点根目录：`/www/wwwroot/110.42.229.152_3000`
- API Node 项目目录：`/www/wwwroot/ai-social-api`
- API 端口：`3100`
- 数据库：`ai_social`

## 前端发布

### H5

1. 复制 `apps/h5/.env.production.example` 为 `apps/h5/.env.production`
2. 在本地或服务器执行：

```bash
cd /www/wwwroot/ai-social-api
npm install
npm run build --workspace @ai-social/h5
```

3. 将 `apps/h5/dist` 内容上传到：

```text
/www/wwwroot/110.42.229.152_3000/app
```

### 后台

1. 复制 `apps/admin/.env.production.example` 为 `apps/admin/.env.production`
2. 执行：

```bash
npm run build --workspace @ai-social/admin
```

3. 将 `apps/admin/dist` 内容上传到：

```text
/www/wwwroot/110.42.229.152_3000/admin
```

### 小程序运营后台

1. 复制 `apps/ops-admin/.env.production.example` 为 `apps/ops-admin/.env.production`
2. 执行：

```bash
npm run build --workspace @ai-social/ops-admin
```

3. 将 `apps/ops-admin/dist` 内容上传到：

```text
/www/wwwroot/110.42.229.152_3000/ops-admin
```

## API 发布

1. 上传整个仓库到：

```text
/www/wwwroot/ai-social-api
```

2. 复制 `apps/api/.env.production.example` 为 `apps/api/.env`
3. 在 `apps/api/.env` 填好生产值，重点确认：
   - `DATABASE_URL`
   - `COZE_API_TOKEN`
   - `WECHAT_MINI_APPID`
   - `WECHAT_MINI_SECRET`
   - `UPLOAD_PUBLIC_BASE=http://110.42.229.152:3000/uploads`
   - `PORT=3100`
4. 若需要本地先打包上传，可先运行 `npm run release:bt`
5. 执行：

```bash
npm install
npm run db:generate
npm run db:migrate:prod
npm run db:seed
npm run build --workspace @ai-social/api
```

4. 在宝塔 Node 项目中新建：

- 项目名：`ai-social-api`
- 启动目录：`/www/wwwroot/ai-social-api/apps/api`
- 启动命令：`node dist/src/main.js`
- 运行端口：`3100`
- Node 版本：`v22.21.1`

## Nginx 反代

将站点 `110.42.229.152:3000` 的 Nginx 配置补充为：

- `/api` 反向代理到 `http://127.0.0.1:3100`
- `/socket.io` 反向代理到 `http://127.0.0.1:3100`
- `/uploads` 指向公开媒体目录
- `/admin` 指向后台静态目录
- `/ops-admin` 指向小程序运营后台静态目录
- `/` 指向 H5 静态目录

参考配置见 [deploy/bt-nginx-ai-social.conf](/Volumes/ORICO/杨/deploy/bt-nginx-ai-social.conf)。

## 安全补充

- 立即轮换历史上曾暴露在原型文件中的 Coze token
- API 的 `COZE_API_TOKEN` 只放 `apps/api/.env`
- 宝塔面板开启 SSL
- 宝塔面板开启白名单访问
- 不把 `.env`、Prisma migration 备份、日志文件放进公开静态目录

## 验收检查

- `http://110.42.229.152:3000/` 打开 H5
- `http://110.42.229.152:3000/admin` 打开后台
- `http://110.42.229.152:3000/api/health` 返回健康状态
- 登录 `opsadmin / Admin@123456` 可以进入后台
- H5 登录 `nova / Demo@123456` 可以看到朋友圈、广场、消息、主页
- H5 可上传最多 4 张图片并成功发布动态，图片地址应位于 `/uploads/posts/...`
- Socket.IO 在线时未读数会变动
