@echo off
chcp 65001 >nul
title AI 安全趣味抢答 - 局域网服务
cd /d "%~dp0\.."

echo ========================================
echo   quiz-live 暖场抢答 · 局域网启动
echo ========================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

where python >nul 2>&1
if %errorlevel% equ 0 goto :show_urls
where py >nul 2>&1
if %errorlevel% equ 0 goto :show_urls
echo [错误] 未找到 Python 3
pause
exit /b 1

:show_urls
echo 正在获取本机局域网 IP...
set "LAN_IP="
set "PS_SCRIPT=%~dp0..\remoteNavigator\scripts\get-lan-ip.ps1"
for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" 2^>nul`) do (
    if not defined LAN_IP set "LAN_IP=%%i"
)

if defined LAN_IP (
    echo   控台: http://%LAN_IP%:8080/quiz-live/admin.html
    echo   大屏: http://%LAN_IP%:8080/quiz-live/screen.html?room=房间码
    echo   答题: http://%LAN_IP%:8080/quiz-live/answer.html?room=房间码
    echo %LAN_IP%> quiz-live\data\lan-host.txt
    echo.
    echo 已写入局域网 IP: %LAN_IP%
    echo 将用局域网地址打开控台（二维码可直接给手机扫）
) else (
    echo.
    echo [警告] 未能获取局域网 IP，将使用 localhost 打开
)
echo   本机备用: http://localhost:8080/quiz-live/admin.html
echo.
if defined LAN_IP (
    echo WebSocket 中继: ws://%LAN_IP%:8082
) else (
    echo WebSocket 中继: ws://本机IP:8082
)
echo 按 Ctrl+C 停止各服务窗口。
echo ========================================
echo.

start "quiz-ws-relay" cmd /k node quiz-live/scripts/quiz-ws-relay.js
timeout /t 2 /nobreak >nul

if defined LAN_IP (
    start "" "http://%LAN_IP%:8080/quiz-live/admin.html"
) else (
    start "" "http://localhost:8080/quiz-live/admin.html"
)

where python >nul 2>&1
if %errorlevel% equ 0 (
    python -m http.server 8080 --bind 0.0.0.0
) else (
    py -3 -m http.server 8080 --bind 0.0.0.0
)

pause
