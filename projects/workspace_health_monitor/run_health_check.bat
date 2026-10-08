@echo off
chcp 65001 > nul
echo ========================================================
echo   Workspace Health Monitor - ディレクトリ健康診断
echo ========================================================
echo.
cd /d "%~dp0\..\..\"
node projects\workspace_health_monitor\generate_dashboard.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] 診断完了！ダッシュボードをブラウザで開きます...
    start "" "%~dp0dist\index.html"
) else (
    echo.
    echo [ERROR] 診断中にエラーが発生しました。
    pause
)
