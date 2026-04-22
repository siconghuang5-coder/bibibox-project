#!/bin/bash
set -eu

#=====================================================
# AI 社交一期 - 服务器一键部署脚本
# 前提：
#   1. 已通过宝塔文件管理器上传 ai-social-api-src.tar.gz 到 /www/wwwroot/
#   2. 宝塔已安装 Node.js (v18+) 和 MySQL
#   3. 在宝塔终端中以 root 执行本脚本
#=====================================================

SITE_ROOT="/www/wwwroot/110.42.229.152_3000"
API_ROOT="/www/wwwroot/ai-social-api"
ARCHIVE="/www/wwwroot/ai-social-api-src.tar.gz"
DB_NAME="ai_social"
DB_USER="ai_social_user"
DB_PASS="AiSocial@2026!"

echo "=========================================="
echo " AI 社交一期 - 部署开始"
echo "=========================================="

# ------- 1. 检查 Node.js -------
if ! command -v node &>/dev/null; then
  echo "[错误] 未安装 Node.js，请先在宝塔软件商店安装 Node.js v18 或 v20"
  exit 1
fi
NODE_VER=$(node -v)
echo "[✓] Node.js: $NODE_VER"

# ------- 2. 检查 MySQL -------
if ! command -v mysql &>/dev/null; then
  echo "[错误] 未安装 MySQL，请先在宝塔软件商店安装 MySQL"
  exit 1
fi
echo "[✓] MySQL 已安装"

# ------- 3. 检查压缩包 -------
if [ ! -f "$ARCHIVE" ]; then
  echo "[错误] 未找到 $ARCHIVE"
  echo "请先通过宝塔文件管理器上传 ai-social-api-src.tar.gz 到 /www/wwwroot/"
  exit 1
fi
echo "[✓] 源码包已就位"

# ------- 4. 创建 MySQL 数据库和用户 -------
echo ""
echo ">>> 创建数据库 $DB_NAME ..."
mysql -u root -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || {
  echo "[提示] 如果 MySQL 需要密码，请手动执行："
  echo "  mysql -u root -p -e \"CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\""
  echo "  mysql -u root -p -e \"CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';\""
  echo "  mysql -u root -p -e \"GRANT ALL ON $DB_NAME.* TO '$DB_USER'@'localhost'; FLUSH PRIVILEGES;\""
}
mysql -u root -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';" 2>/dev/null || true
mysql -u root -e "GRANT ALL ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost'; FLUSH PRIVILEGES;" 2>/dev/null || true
echo "[✓] 数据库就绪"

# ------- 5. 解压源码 -------
echo ""
echo ">>> 解压源码到 $API_ROOT ..."
rm -rf "$API_ROOT"
mkdir -p "$API_ROOT"
tar -xzf "$ARCHIVE" -C "$API_ROOT"
echo "[✓] 解压完成"

# ------- 6. 创建站点目录结构 -------
echo ""
echo ">>> 创建站点目录 ..."
mkdir -p "$SITE_ROOT/app"
mkdir -p "$SITE_ROOT/admin"
mkdir -p "$SITE_ROOT/ops-admin"
mkdir -p "$SITE_ROOT/uploads"
mkdir -p "$SITE_ROOT/static"

# 复制静态资源（如果构建产物在源码包里）
if [ -d "$API_ROOT/apps/h5/dist" ]; then
  cp -R "$API_ROOT/apps/h5/dist/." "$SITE_ROOT/app/"
  echo "[✓] H5 静态资源已部署"
fi
if [ -d "$API_ROOT/apps/admin/dist" ]; then
  cp -R "$API_ROOT/apps/admin/dist/." "$SITE_ROOT/admin/"
  echo "[✓] Admin 静态资源已部署"
fi
if [ -d "$API_ROOT/apps/ops-admin/dist" ]; then
  cp -R "$API_ROOT/apps/ops-admin/dist/." "$SITE_ROOT/ops-admin/"
  echo "[✓] Ops Admin 静态资源已部署"
fi

# 复制头像和帖子图片
if [ -d "$API_ROOT/apps/h5/public/avatars" ]; then
  cp -R "$API_ROOT/apps/h5/public/avatars" "$SITE_ROOT/"
fi
if [ -d "$API_ROOT/apps/h5/public/posts" ]; then
  cp -R "$API_ROOT/apps/h5/public/posts" "$SITE_ROOT/"
fi
if [ -d "$API_ROOT/bibi-box (2)/static" ]; then
  cp -R "$API_ROOT/bibi-box (2)/static/." "$SITE_ROOT/static/"
fi

# ------- 7. 配置 API 环境变量 -------
echo ""
echo ">>> 配置 API 环境变量 ..."
cat > "$API_ROOT/apps/api/.env" << ENVEOF
NODE_ENV=production
PORT=3100
APP_ORIGIN=http://110.42.229.152:3000
ADMIN_ORIGIN=http://110.42.229.152:3000/admin
DATABASE_URL=mysql://${DB_USER}:${DB_PASS}@127.0.0.1:3306/${DB_NAME}
SESSION_TTL_DAYS=14
WECHAT_MINI_APPID=wxad915b4cd0ef02b9
WECHAT_MINI_SECRET=9415c0bfdcc080e84535a6e0718bd9dd
COZE_API_TOKEN=
COZE_BASE_URL=https://api.coze.cn
COZE_IMAGE_WORKFLOW_ID=
UPLOAD_DIR=/www/wwwroot/110.42.229.152_3000/uploads
STATIC_DIR=/www/wwwroot/110.42.229.152_3000/static
UPLOAD_PUBLIC_BASE=http://110.42.229.152:3000/uploads
ENVEOF
echo "[✓] .env 已写入"

# ------- 8. 安装依赖 -------
echo ""
echo ">>> 安装 npm 依赖 (可能需要几分钟) ..."
cd "$API_ROOT"
npm install --production=false 2>&1 | tail -5
echo "[✓] 依赖安装完成"

# ------- 9. Prisma 生成 + 数据库迁移 + 种子数据 -------
echo ""
echo ">>> Prisma generate ..."
npm run db:generate
echo "[✓] Prisma client 已生成"

echo ""
echo ">>> 数据库迁移 ..."
npm run db:migrate:prod
echo "[✓] 数据库迁移完成"

echo ""
echo ">>> 种子数据 ..."
npm run db:seed
echo "[✓] 种子数据已写入"

# ------- 10. 构建 API -------
echo ""
echo ">>> 构建 API ..."
npm run build --workspace @ai-social/api
echo "[✓] API 构建完成"

# ------- 11. 构建前端（如果需要） -------
if [ ! -f "$SITE_ROOT/app/index.html" ]; then
  echo ""
  echo ">>> 构建 H5 前端 ..."
  cp "$API_ROOT/apps/h5/.env.production.example" "$API_ROOT/apps/h5/.env.production" 2>/dev/null || true
  npm run build --workspace @ai-social/h5
  cp -R "$API_ROOT/apps/h5/dist/." "$SITE_ROOT/app/"
  echo "[✓] H5 前端已构建并部署"
fi

if [ ! -f "$SITE_ROOT/admin/index.html" ]; then
  echo ""
  echo ">>> 构建 Admin 后台 ..."
  cp "$API_ROOT/apps/admin/.env.production.example" "$API_ROOT/apps/admin/.env.production" 2>/dev/null || true
  npm run build --workspace @ai-social/admin
  cp -R "$API_ROOT/apps/admin/dist/." "$SITE_ROOT/admin/"
  echo "[✓] Admin 后台已构建并部署"
fi

if [ ! -f "$SITE_ROOT/ops-admin/index.html" ]; then
  echo ""
  echo ">>> 构建 Ops Admin 后台 ..."
  cp "$API_ROOT/apps/ops-admin/.env.example" "$API_ROOT/apps/ops-admin/.env.production" 2>/dev/null || true
  npm run build --workspace @ai-social/ops-admin
  cp -R "$API_ROOT/apps/ops-admin/dist/." "$SITE_ROOT/ops-admin/"
  echo "[✓] Ops Admin 后台已构建并部署"
fi

# ------- 12. 配置 Nginx -------
echo ""
echo ">>> 配置 Nginx ..."
NGINX_CONF="/www/server/panel/vhost/nginx/110.42.229.152_3000.conf"
cat > "$NGINX_CONF" << 'NGINXEOF'
server {
    listen 3000;
    server_name 110.42.229.152;

    root /www/wwwroot/110.42.229.152_3000;
    index index.html;

    client_max_body_size 20m;

    location /api/ {
        proxy_pass http://127.0.0.1:3100/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3100/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /uploads/ {
        alias /www/wwwroot/110.42.229.152_3000/uploads/;
        access_log off;
        expires 30d;
    }

    location /static/ {
        alias /www/wwwroot/110.42.229.152_3000/static/;
        access_log off;
        expires 30d;
    }

    location /avatars/ {
        alias /www/wwwroot/110.42.229.152_3000/avatars/;
        access_log off;
        expires 30d;
    }

    location /posts/ {
        alias /www/wwwroot/110.42.229.152_3000/posts/;
        access_log off;
        expires 30d;
    }

    location /admin/ {
        alias /www/wwwroot/110.42.229.152_3000/admin/;
        try_files $uri $uri/ /admin/index.html;
    }

    location /ops-admin/ {
        alias /www/wwwroot/110.42.229.152_3000/ops-admin/;
        try_files $uri $uri/ /ops-admin/index.html;
    }

    location / {
        alias /www/wwwroot/110.42.229.152_3000/app/;
        try_files $uri $uri/ /app/index.html;
    }
}
NGINXEOF
echo "[✓] Nginx 配置已写入"

# 测试并重载 Nginx
nginx -t && nginx -s reload
echo "[✓] Nginx 已重载"

# ------- 13. 启动 API 服务 -------
echo ""
echo ">>> 启动 API 服务 ..."
cd "$API_ROOT/apps/api"

# 停止已有进程
if command -v pm2 &>/dev/null; then
  pm2 delete ai-social-api 2>/dev/null || true
  pm2 start dist/src/main.js --name ai-social-api --cwd "$API_ROOT/apps/api"
  pm2 save
  echo "[✓] API 已通过 PM2 启动"
else
  # 如果没有 PM2 则用 nohup
  pkill -f "node.*dist/src/main.js" 2>/dev/null || true
  sleep 1
  nohup node dist/src/main.js > /var/log/ai-social-api.log 2>&1 &
  echo "[✓] API 已通过 nohup 启动 (PID: $!)"
  echo "    日志: /var/log/ai-social-api.log"
fi

# ------- 14. 放行端口 -------
echo ""
echo ">>> 放行端口 3000 ..."
if command -v firewall-cmd &>/dev/null; then
  firewall-cmd --permanent --add-port=3000/tcp 2>/dev/null || true
  firewall-cmd --reload 2>/dev/null || true
fi
echo "[✓] 端口已放行"

# ------- 完成 -------
echo ""
echo "=========================================="
echo " 部署完成！"
echo "=========================================="
echo ""
echo " H5 前台:   http://110.42.229.152:3000/"
echo " 运营后台:  http://110.42.229.152:3000/admin"
echo " API 健康:  http://110.42.229.152:3000/api/health"
echo ""
echo " 后台登录:  opsadmin / Admin@123456"
echo " H5 登录:   nova / Demo@123456"
echo ""
echo " 如需配置 Coze AI，编辑: $API_ROOT/apps/api/.env"
echo " 然后重启: pm2 restart ai-social-api"
echo "=========================================="
