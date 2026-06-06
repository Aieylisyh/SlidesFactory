@echo off
chcp 65001 >nul
title 幻灯片演示 - 本机预览
cd /d "%~dp0..\.."

echo ========================================
echo   幻灯片演示 - 本机预览 (localhost)
echo ========================================
echo.
echo   本机访问: http://localhost:8080/
echo.
echo 按 Ctrl+C 可停止服务。
echo ========================================
echo.

where python >nul 2>&1
if %errorlevel% equ 0 goto :launch

where py >nul 2>&1
if %errorlevel% equ 0 goto :launch

echo [错误] 未找到 Python，请先安装 Python 3 并勾选 Add to PATH
echo        下载: https://www.python.org/downloads/
pause
exit /b 1

:launch
start "" "http://localhost:8080/"

where python >nul 2>&1
if %errorlevel% equ 0 (
    python -m http.server 8080 --bind 127.0.0.1
) else (
    py -3 -m http.server 8080 --bind 127.0.0.1
)

pause
