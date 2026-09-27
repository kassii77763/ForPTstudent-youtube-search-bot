# ForPTstudent-youtube-search-bot
解剖生理学・運動学・国試対策に特化したYouTube動画横断検索LINE Bot（GAS + TypeSafe AI Jev + Googleスプレッドシート）

## 📌 概要
理学療法士・作業療法士・看護師・医療系学生向けのLINE公式アカウント連携Bot。
YouTubeの人気解説6チャンネル（計3,851本）から、キーワード検索によりピンポイントで動画（タイムスタンプ秒数付きリンク）をFlexカルーセルで提示します。

- **対応チャンネル**: ゴロー先生、西島ゼミ、カラダ研究所、かずひろ先生、鰐部ゼミナール、ネコかん
- **検索最適化**:
  - G列フィルタによる過去問単問動画・有料限定動画の自動除外（1,230件OFF）
  - TypeSafe AI `jev` による口語（「ふともも」「膝伸ばし」など）のミリ秒推論・医学用語ルーティング
- **品質保証**:
  - Stage 5 実機・実データ総合監査ハーネス（Anti-Goodhart Edition）100点満点合格

## 📁 ディレクトリ構成
- `gas_project/` : Google Apps Script本番コード（clasp管理）
  - `LINE_Bot.js` : Webhook受信、検索エンジン、Jev推論連携、Flexカルーセル描画
  - `動画リスト取得.js` : 公開フィードからの動画自動収集バッチ
  - `GetTimestamps.js` : YouTube概要欄からの目次抽出
  - `GenerateKeywords.js` : Gemini APIを活用した医学用語キーワード生成
- `harness/` : 監査ハーネススイート（テストを通すためだけのモックを排除した実機テスト）
  - `live_evaluator_stage5.js` : Stage 5 本番実機データ通信監査

## ⚙️ セットアップ & デプロイ
```bash
# claspを用いたプッシュ
cd gas_project
clasp push
```

※APIキーおよびLINEトークンはGoogle Apps Scriptの「スクリプトプロパティ」で安全に管理されています。
