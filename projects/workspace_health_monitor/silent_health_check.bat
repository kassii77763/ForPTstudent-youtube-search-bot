@echo off
chcp 65001 > nul
cd /d "%~dp0\..\..\"
node projects\workspace_health_monitor\generate_dashboard.js > nul 2>&1
exit /b %ERRORLEVEL%
