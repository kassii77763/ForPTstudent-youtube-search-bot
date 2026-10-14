@echo off
chcp 65001 > nul
echo ========================================================
echo   Workspace Health Monitor - タスクスケジューラ登録
echo ========================================================
echo.

set TASK_NAME=Antigravity_Workspace_Health_Monitor

if "%1"=="uninstall" (
    echo [INFO] タスクを削除しています: %TASK_NAME%
    schtasks /delete /tn "%TASK_NAME%" /f > nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [SUCCESS] タスクスケジューラから削除完了しました。
    ) else (
        echo [INFO] 登録済みタスクはありませんでした。
    )
    goto end
)

echo [INFO] 毎朝9:00に自動実行するタスクを登録します...
node "%~dp0register_task.js"

:end
pause
