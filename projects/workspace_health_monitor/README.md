# Workspace Health Monitor (ワークスペース健康診断＆可視化ダッシュボード)

PC・ワークスペースのディレクトリ環境が「クリーンで境界規律を守れているか」を自動徘徊・診断し、モダンなHTMLダッシュボードとして可視化する監視システムです。

---

## 🌟 主な機能
1. **ディレクトリ自動徘徊・健康度スコアリング (100点満点)**
   - **ルート境界防御 (25点)**: ルート直下の未許可ファイルの検知
   - **成果物カプセル化 (25点)**: ツール単位の閉鎖性（1ツール1フォルダ）
   - **スクラッチ衛生度 (20点)**: `scratch/` 内の一時残骸の放置チェック
   - **メタハーネス進化蓄積 (15点)**: `logs/trace.md` の配備および教訓集約数
   - **ストレージ＆アーカイブ量 (15点)**: 不要キャッシュや隔離サイズの把握
2. **美しく直感的なHTMLダッシュボード自動生成**
   - ダークモード基調（Cyberpunk Clean Tech UI）
   - SVGサークルスコアゲージ（Grade S/A/B/C/F判定）
   - リアルタイム警告＆改善提案アクション
   - メタハーネス教訓アーカイブの一覧表示
3. **GitHub Pages完全対応**
   - 外部依存ゼロの完全スタンドアロン静的HTML（`dist/index.html`）
   - リポジトリのGitHub Pages（Source: Deploy from a branch / root or dist）に即時公開可能。

---

## 🚀 使い方

### 1. ワンクリック実行（おすすめ）
`projects/workspace_health_monitor/run_health_check.bat` をダブルクリックするだけで、自動診断が行われ、ブラウザでダッシュボードが開きます。

### 2. コマンドライン実行
```bash
# ターミナル診断（JSON/CLIサマリー出力）
node projects/workspace_health_monitor/monitor.js

# ダッシュボード生成
node projects/workspace_health_monitor/generate_dashboard.js

# 品質ハーネステスト
node projects/workspace_health_monitor/harness/test_monitor.js
```

---

## 🌐 GitHub Pages へのデプロイ手順
1. 本ツールの `projects/workspace_health_monitor/dist/index.html` をリポジトリのルートまたは `docs/` に配置するか、GitHub Actions で `dist` を公開指定します。
2. GitHubリポジトリの「Settings」>「Pages」で公開ブランチを指定すれば、いつでもWeb上から現在のフォルダ健康状態を確認できます。
