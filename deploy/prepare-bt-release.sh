#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
OUTPUT_DIR="$ROOT_DIR/output/bt-release"
SITE_DIR="$OUTPUT_DIR/110.42.229.152_3000"
APP_DIR="$SITE_DIR/app"
ADMIN_DIR="$SITE_DIR/admin"
OPS_ADMIN_DIR="$SITE_DIR/ops-admin"
UPLOADS_DIR="$SITE_DIR/uploads"
API_BUNDLE="$OUTPUT_DIR/ai-social-api-src.tar.gz"

echo "==> Cleaning previous release output"
rm -rf "$OUTPUT_DIR"
mkdir -p "$APP_DIR" "$ADMIN_DIR" "$OPS_ADMIN_DIR" "$UPLOADS_DIR"

echo "==> Building H5, admin, ops-admin, and API"
cd "$ROOT_DIR"
npm run build --workspace @ai-social/h5
npm run build --workspace @ai-social/admin
npm run build --workspace @ai-social/ops-admin
npm run build --workspace @ai-social/api

echo "==> Staging static assets"
cp -R "$ROOT_DIR/apps/h5/dist/." "$APP_DIR"
cp -R "$ROOT_DIR/apps/admin/dist/." "$ADMIN_DIR"
cp -R "$ROOT_DIR/apps/ops-admin/dist/." "$OPS_ADMIN_DIR"
touch "$UPLOADS_DIR/.gitkeep"

echo "==> Packing deployable source bundle"
tar \
  --exclude='node_modules' \
  --exclude='output' \
  --exclude='apps/h5/dist' \
  --exclude='apps/admin/dist' \
  --exclude='apps/ops-admin/dist' \
  --exclude='apps/api/dist' \
  -czf "$API_BUNDLE" \
  -C "$ROOT_DIR" \
  .

cat <<EOF

Release output ready:
- Static site root: $SITE_DIR
- API source bundle: $API_BUNDLE

Server-side next steps:
1. Upload extracted project to /www/wwwroot/ai-social-api
2. Upload app -> /www/wwwroot/110.42.229.152_3000/app
3. Upload admin -> /www/wwwroot/110.42.229.152_3000/admin
4. Upload ops-admin -> /www/wwwroot/110.42.229.152_3000/ops-admin
5. Create /www/wwwroot/110.42.229.152_3000/uploads
6. In server API dir run: npm install && npm run db:generate && npm run db:migrate:prod && npm run db:seed && npm run build --workspace @ai-social/api
EOF
