@echo off
chcp 65001 >nul
title 幻灯片演示 - 局域网服务
cd /d "%~dp0"

echo ========================================
echo   幻灯片演示 - 本地 HTTP 服务
echo ========================================
echo.

where python >nul 2>&1
if %errorlevel% equ 0 goto :show_urls

where py >nul 2>&1
if %errorlevel% equ 0 goto :show_urls

echo [错误] 未找到 Python，请先安装 Python 3 并勾选 Add to PATH
echo        下载: https://www.python.org/downloads/
pause
exit /b 1

:show_urls
echo 正在获取本机局域网 IP...
for /f "usebackq tokens=* delims=" %%i in (`powershell -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 ^| Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -notlike '169.254*' } ^| Select-Object -ExpandProperty IPAddress"`) do (
    echo   局域网访问: http://%%i:8080
)
echo   本机访问:   http://localhost:8080/
echo.
echo 同一 WiFi / 局域网内的设备，用上方 IP 地址即可打开。
echo 仅本机预览可改用 start-local-server.bat（仅绑定 localhost）。
echo 客户端需能访问互联网（Reveal.js 从 CDN 加载）。
echo 按 Ctrl+C 可停止服务。
echo ========================================
echo.

start "" "http://localhost:8080/"

where python >nul 2>&1
if %errorlevel% equ 0 (
    python -m http.server 8080 --bind 0.0.0.0
) else (
    py -3 -m http.server 8080 --bind 0.0.0.0
)

pause
