@echo off
chcp 65001 > nul
echo ======================================================
echo  X (Twitter) 自動投稿スクリプト
echo  - ツイート本文の自動入力
echo  - デモ動画 (demo_approach2_god.mp4) の自動添付
echo ======================================================
echo.

cd /d "c:\Users\四季　かしま\.gemini\antigravity"

node scratch/post_to_x.js %1

pause
