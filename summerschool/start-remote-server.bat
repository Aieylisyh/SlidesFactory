@echo off
chcp 65001 >nul
title 夏校说明会 · 翻页笔 · 局域网服务
cd /d "%~dp0.."

echo ========================================
echo   夏校说明会 · 翻页笔 · HTTP + WebSocket
echo ========================================
echo.

call :ResolveNode
if not defined NODE_EXE goto :node_missing

where python >nul 2>&1
if %errorlevel% equ 0 goto :show_urls
where py >nul 2>&1
if %errorlevel% equ 0 goto :show_urls

echo [错误] 未找到 Python 3（用于静态 HTTP 服务）
pause
exit /b 1

:show_urls
echo 正在生成夏校导航文件...
"%NODE_EXE%" remoteNavigator/scripts/generate-deck-nav.js --deck summerschool/index.html
if %errorlevel% neq 0 (
    echo [错误] 导航文件生成失败
    pause
    exit /b 1
)
echo.

echo 使用 Node: %NODE_EXE%
echo 使用 HTTP: remoteNavigator/scripts/http-server.py
echo 正在获取本机局域网 IP...

set "LAN_IP="
set "PS_SCRIPT=%~dp0..\remoteNavigator\scripts\get-lan-ip.ps1"
for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" 2^>nul`) do (
    if not defined LAN_IP set "LAN_IP=%%i"
)

if defined LAN_IP (
    echo   主讲端: http://%LAN_IP%:8080/remoteNavigator/presenter-summerschool.html
    echo   翻页笔: http://%LAN_IP%:8080/summerschool/r/房间码
) else (
    echo   [警告] 未检测到局域网 IP，将使用 localhost（手机可能无法扫码）
)
echo   本机主讲: http://localhost:8080/remoteNavigator/presenter-summerschool.html
echo.
echo 将用局域网 IP 打开主讲页，右侧会自动显示二维码
echo 关闭本窗口即可停止服务
echo ========================================
echo.

start "ws-relay" /min cmd /c ""%NODE_EXE%" remoteNavigator/scripts/ws-relay.js"

if defined LAN_IP (
    start "" "http://%LAN_IP%:8080/remoteNavigator/presenter-summerschool.html"
) else (
    start "" "http://localhost:8080/remoteNavigator/presenter-summerschool.html"
)

where python >nul 2>&1
if %errorlevel% equ 0 (
    python remoteNavigator/scripts/http-server.py --port 8080 --bind 0.0.0.0
) else (
    py -3 remoteNavigator/scripts/http-server.py --port 8080 --bind 0.0.0.0
)

pause
exit /b 0

:ResolveNode
set "NODE_EXE="
where node >nul 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%N in ('where node 2^>nul ^| findstr /i /v "cursor\\resources"') do (
        if not defined NODE_EXE set "NODE_EXE=%%N"
    )
)
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%LocalAppData%\Programs\node\node.exe" set "NODE_EXE=%LocalAppData%\Programs\node\node.exe"
exit /b 0

:node_missing
echo [错误] 未找到 Node.js（系统 PATH 中不可用）
echo.
echo 请安装 Node.js LTS 并勾选 Add to PATH，然后重新运行本 bat。
pause
exit /b 1
