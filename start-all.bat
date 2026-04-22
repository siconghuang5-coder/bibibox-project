@echo off
echo ==========================================
echo       启动 AI Social 项目完整环境
echo ==========================================

echo [1/3] 正在启动后端服务 (apps/api) ...
start cmd /k "title API Server (3100) && cd apps\api && echo 正在安装依赖... && npm install && echo 正在启动服务... && npm run start:dev"

echo [2/3] 正在启动 H5 客户端 (apps/h5) ...
start cmd /k "title H5 Client (5173) && cd apps\h5 && echo 正在安装依赖... && npm install && echo 正在启动服务... && npm run dev"

echo [3/3] 正在启动后台管理系统 (apps/admin) ...
start cmd /k "title Admin Panel (5174) && cd apps\admin && echo 正在安装依赖... && npm install && echo 正在启动服务... && npm run dev"

echo.
echo 所有 Web 服务均已在新的命令行窗口中启动！
echo.
echo 提示:
echo 1. 后端服务 (NestJS) 依赖 MySQL 数据库，请确保本地 MySQL 已启动，并已配置对应的数据库。
echo 2. 小程序端 "bibi-box (2)" 建议直接使用 HBuilderX 打开该目录，然后点击【运行 -> 运行到小程序模拟器】。
echo.
pause
