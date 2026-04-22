@echo off
chcp 65001 >nul
title BibiBox 一键控制台
color 0A

echo ========================================================
echo        BibiBox 长官专享 - 极简一键启动程序
echo ========================================================
echo.
echo [1/3] 正在检测并解除端口占用 (清理 3100 端口旧进程)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3100') do (
    if NOT "%%a" == "0" (
        taskkill /F /PID %%a >nul 2>&1
    )
)
echo ---- 端口清理完成 ----
echo.

echo [2/3] 正在启动核心服务器后端...
echo.

cd apps\api
start "BibiBox Backend Server API" cmd /k "title BibiBox Backend Server API && echo 正在启动后端内核... && npm run start:dev"

cd ..\..

echo [3/3] 后端已在独立窗口成功拉起！(请不要关闭弹出的 API 窗口，它是大脑)
echo.
echo ========================================================
echo                  🔥 前端小程序启动指南 🔥
echo ========================================================
echo.
echo 为了给您带来最好的沉浸体验，请通过以下步骤扫码/预览微信小程序：
echo.
echo   第一步：打开桌面上的【HBuilderX】软件。
echo   第二步：确保 "bibi-box (2)" 项目已在左侧打开。
echo   第三步：点击上方绿色三角形：运行 -^> 运行到小程序模拟器 -^> 微信开发者工具。
echo.
echo   ** 重要提示：
echo   - 确保提前打开【微信开发者工具】，并去设置里开启『安全-^>服务端口』。
echo   - 您还可以直接切到“聊天”界面点击“送礼”按钮，体验尊贵全息礼物特效！
echo.
echo ========================================================
pause
