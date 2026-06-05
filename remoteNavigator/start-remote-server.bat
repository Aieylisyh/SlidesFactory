@echo off
chcp 65001 >nul
title 翻页笔 · 局域网服务
cd /d "%~dp0.."

echo ========================================
echo   翻页笔 · HTTP + WebSocket 服务
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
echo 使用 Node: %NODE_EXE%
echo 使用 HTTP: remoteNavigator/scripts/http-server.py
echo 正在获取本机局域网 IP...

set "LAN_IP="
set "PS_SCRIPT=%~dp0scripts\get-lan-ip.ps1"
for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" 2^>nul`) do (
    if not defined LAN_IP set "LAN_IP=%%i"
)

if defined LAN_IP (
    echo   主讲端: http://%LAN_IP%:8080/remoteNavigator/presenter.html
    echo   翻页笔: http://%LAN_IP%:8080/remoteNavigator/remote.html
) else (
    echo   [警告] 未检测到局域网 IP，将使用 localhost（手机可能无法扫码）
)
echo   本机主讲: http://localhost:8080/remoteNavigator/presenter.html
echo.
echo 将用局域网 IP 打开主讲页，右侧会自动显示二维码
echo 关闭本窗口即可停止服务
echo ========================================
echo.

start "ws-relay" /min cmd /c ""%NODE_EXE%" remoteNavigator/scripts/ws-relay.js"

if defined LAN_IP (
    start "" "http://%LAN_IP%:8080/remoteNavigator/presenter.html"
) else (
    start "" "http://localhost:8080/remoteNavigator/presenter.html"
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
echo 常见原因：
echo   - 只在 Cursor / VS Code 终端里能用 node，但双击 bat 用的是系统 PATH
echo   - 安装 Node 时未勾选 "Add to PATH"
echo   - 安装后未重启命令行 / 电脑
echo.
echo 解决办法：
echo   1. 打开 https://nodejs.org/ 下载 LTS 版并安装
echo   2. 安装时勾选 "Add to PATH" / 自动配置环境变量
echo   3. 安装完成后关闭本窗口，重新双击 start-remote-server.bat
echo.
echo 验证：打开 cmd 输入 node -v ，应显示版本号（如 v22.x.x）
pause
exit /b 1
