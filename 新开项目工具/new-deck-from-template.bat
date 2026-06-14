@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

set "TOOL_ROOT=%~dp0"
set "SRC=%TOOL_ROOT%.."
set "WORKSHOP=%TOOL_ROOT%..\..\"
set "SCAFFOLD=%SRC%\tools\dev\new-deck-scaffold"
set "CLEANUP_PS1=%TOOL_ROOT%scaffold-cleanup.ps1"
set "DECK_NAME=%~1"

echo ========================================
echo   幻灯片生成工坊 · 从 Project 新建 Deck
echo ========================================
echo.

if not exist "%SRC%\index.html" (
    echo [错误] 未找到参考工程目录:
    echo   %SRC%
    echo 请确认 Project\ 完整存在后再运行本脚本。
    goto :fail
)

if not exist "%SCAFFOLD%\index.html" (
    echo [错误] 未找到最小脚手架:
    echo   %SCAFFOLD%
    echo 请确认 Project\tools\dev\new-deck-scaffold\ 存在。
    goto :fail
)

if not exist "%CLEANUP_PS1%" (
    echo [错误] 未找到清理脚本:
    echo   %CLEANUP_PS1%
    goto :fail
)

if "%DECK_NAME%"=="" (
    set /p "DECK_NAME=请输入新 deck 文件夹名（将创建在工坊根目录）: "
)

if "%DECK_NAME%"=="" (
    echo.
    echo [错误] 未指定文件夹名。
    echo 用法: new-deck-from-template.bat 文件夹名
    echo 示例: new-deck-from-template.bat 2026春季宣讲
    goto :fail
)

for /f "tokens=* delims= " %%a in ("%DECK_NAME%") do set "DECK_NAME=%%a"

powershell -NoProfile -Command "if ($args[0] -match '[\\/:*?""<>|]') { exit 1 } else { exit 0 }" "%DECK_NAME%" >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 文件夹名不能包含 \ / : * ? " ^< ^> ^|
    goto :fail
)

if /i "%DECK_NAME%"=="Project" goto :reserved
if /i "%DECK_NAME%"=="template" goto :reserved
if /i "%DECK_NAME%"=="starter" goto :reserved
if /i "%DECK_NAME%"=="draft" goto :reserved
if /i "%DECK_NAME%"=="secrets" goto :reserved
powershell -NoProfile -Command "if ($args[0] -match '\.\.') { exit 1 } else { exit 0 }" "%DECK_NAME%" >nul 2>&1
if %errorlevel% neq 0 goto :reserved
goto :name_ok

:reserved
echo [错误] 不能使用保留名或含 .. 的名称: %DECK_NAME%
goto :fail

:name_ok
set "DST=%WORKSHOP%%DECK_NAME%"
if exist "%DST%" (
    echo [错误] 目标已存在，请换一个名称:
    echo   %DST%
    goto :fail
)

echo 参考工程: %SRC%
echo 目标目录: %DST%
echo.
echo 正在复制 Project -^> %DECK_NAME% ...
echo （排除课例站点、大素材、.git 等，详见 新建演示说明.md）
echo.

robocopy "%SRC%" "%DST%" /E /XD ".git" "summerschool" "quiz-live" "新开项目工具" "pdf-extracted" "employment" "__pycache__" "述职ppt" "PureVersion" /XF "deploy\sync.env" "deploy\quiz-live-relay.env" "deploy\cos.yaml" /NFL /NDL /NJH /NJS
set "RC=%errorlevel%"
if %RC% GEQ 8 (
    echo [错误] 复制失败 (robocopy 退出码 %RC%^)
    if exist "%DST%" rmdir /s /q "%DST%" 2>nul
    goto :fail
)

echo 正在写入最小示例页（index / outline / share-pages / README）...
copy /Y "%SCAFFOLD%\index.html" "%DST%\index.html" >nul
if not exist "%DST%\config" mkdir "%DST%\config"
copy /Y "%SCAFFOLD%\config\outline.md" "%DST%\config\outline.md" >nul
copy /Y "%SCAFFOLD%\config\share-pages.json" "%DST%\config\share-pages.json" >nul
copy /Y "%SCAFFOLD%\DECK-README.md" "%DST%\README.md" >nul

echo 正在清理课例残留素材...
powershell -NoProfile -ExecutionPolicy Bypass -File "%CLEANUP_PS1%" -DestRoot "%DST%"
if %errorlevel% neq 0 (
    echo [警告] 清理脚本返回非零，请检查新目录内容。
)

echo.
echo [完成] 已创建新演示目录
echo   %DST%
echo.
call :hint_next_steps
echo.

set /p "INIT_GIT=在新目录初始化 Git 仓库? [y/N]: "
if /i "%INIT_GIT%"=="y" (
    pushd "%DST%"
    git init
    if %errorlevel% equ 0 (
        echo [完成] 已执行 git init
    ) else (
        echo [警告] git init 失败，请手动在新目录执行。
    )
    popd
    echo.
)

set /p "OPEN_DIR=用资源管理器打开新目录? [Y/n]: "
if /i "%OPEN_DIR%"=="n" goto :done
start "" explorer "%DST%"

:done
echo.
endlocal
exit /b 0

:hint_next_steps
powershell -NoProfile -Command "Write-Host ''; Write-Host '建议下一步:'; Write-Host '  - 阅读新目录 README.md'; Write-Host '  - 编辑 config/outline.md'; Write-Host '  - 将素材放入 contents/'; Write-Host '  - 修改 index.html 标题与议程'; Write-Host '  - 进入新目录后运行 start-lan-server.bat 预览'; Write-Host '  - 详细说明见 Project\新开项目工具\新建演示说明.md'"
goto :eof

:fail
echo.
pause
endlocal
exit /b 1
