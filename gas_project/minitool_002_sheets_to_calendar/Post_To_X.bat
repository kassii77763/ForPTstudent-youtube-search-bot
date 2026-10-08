@echo off
chcp 65001 > nul
echo ===================================================
echo 🚀 X（Twitter）告知ポスト支援スクリプト
echo ミニツール #002: スプレッドシートからGoogleカレンダーへ予定を一括登録
echo ===================================================
echo.
echo 📋 ポスト原稿をクリップボードにコピーしています...

powershell -Command "Get-Content -Path '%~dp0x_post.md' -Encoding UTF8 | Set-Clipboard"

echo ✅ クリップボードに原稿をコピーしました！
echo.
echo 🌐 ブラウザでXの投稿作成画面を開きます...
start https://x.com/compose/post

echo.
echo 📁 添付アセットフォルダを開きます...
explorer "%~dp0videos"

echo.
echo 💡 【投稿の手順】
echo 1. 開いたXの画面で [Ctrl + V] を押して本文を貼り付け
echo 2. videos フォルダから [demo_sheets_to_calendar.gif] をXの投稿枠にドラッグ＆ドロップ
echo 3. 「ポストする」をクリックして完了！
echo.
pause
