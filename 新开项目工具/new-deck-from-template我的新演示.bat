@echo off
REM 兼容旧文件名 — 转发到 new-deck-from-template.bat
cd /d "%~dp0"
call "%~dp0new-deck-from-template.bat" %*
