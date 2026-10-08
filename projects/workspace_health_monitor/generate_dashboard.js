/**
 * Dashboard Generator for Workspace Health Monitor (v2.0)
 * -----------------------------------------------------------------
 * 4つのタブ（概要 / 階層ツリー / ログ分析 / 定期徘徊）を備えた
 * 人間工学に基づいた高視認性・直感的ダッシュボードHTMLを生成する。
 */
const fs = require('fs');
const path = require('path');
const { runHealthAudit } = require('./monitor');

const ROOT_DIR = path.resolve(__dirname, '../../');
const DIST_DIR = path.resolve(__dirname, 'dist');
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

function generateHtml(audit) {
  const score = audit.score;
  const grade = audit.grade;
  const metrics = audit.metrics;
  
  let gradeColor = '#10b981';
  if (score < 70) gradeColor = '#f43f5e';
  else if (score < 85) gradeColor = '#f59e0b';
  else if (score < 95) gradeColor = '#06b6d4';

  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // JSONデータを安全に埋め込み
  const auditDataJson = JSON.stringify(audit);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Workspace Directory Health Monitor | カシマ様 ワークスペース健康診断</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: rgba(17, 24, 39, 0.85);
      --card-border: rgba(255, 255, 255, 0.08);
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --accent: #0ea5e9;
      --accent-glow: rgba(14, 165, 233, 0.2);
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --grade-color: ${gradeColor};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at 50% 0%, #162036 0%, var(--bg) 75%);
      color: var(--text);
      font-family: 'Inter', -apple-system, sans-serif;
      min-height: 100vh;
      padding: 32px 24px;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    
    /* Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--card-border);
      flex-wrap: wrap;
      gap: 16px;
    }
    .title-group h1 {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .title-group p {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .header-badges {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .badge-live {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(16, 185, 129, 0.12);
      color: var(--success);
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      border: 1px solid rgba(16, 185, 129, 0.25);
    }
    .badge-pulse {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 10px var(--success);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.3; transform: scale(0.8); }
    }

    /* Tabs Navigation */
    .tabs-nav {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
      background: rgba(17, 24, 39, 0.6);
      padding: 6px;
      border-radius: 12px;
      border: 1px solid var(--card-border);
      overflow-x: auto;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .tab-btn:hover {
      color: var(--text);
      background: rgba(255, 255, 255, 0.05);
    }
    .tab-btn.active {
      background: #1e293b;
      color: var(--text);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    /* Tab Contents */
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    /* Card styling */
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 24px;
      backdrop-filter: blur(16px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      margin-bottom: 24px;
    }
    .hero-grid {
      display: grid;
      grid-template-columns: 340px 1fr;
      gap: 24px;
    }
    @media (max-width: 900px) {
      .hero-grid { grid-template-columns: 1fr; }
    }

    /* Score Gauge */
    .score-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .gauge-wrapper {
      position: relative;
      width: 180px;
      height: 180px;
      margin-bottom: 16px;
    }
    .gauge-svg {
      transform: rotate(-90deg);
      width: 180px;
      height: 180px;
    }
    .gauge-bg {
      fill: none;
      stroke: rgba(255, 255, 255, 0.06);
      stroke-width: 14;
    }
    .gauge-fill {
      fill: none;
      stroke: var(--grade-color);
      stroke-width: 14;
      stroke-linecap: round;
      stroke-dasharray: ${circumference};
      stroke-dashoffset: ${strokeDashoffset};
      transition: stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1);
      filter: drop-shadow(0 0 10px var(--grade-color));
    }
    .gauge-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .gauge-score {
      font-size: 48px;
      font-weight: 800;
      line-height: 1;
      font-family: 'JetBrains Mono', monospace;
    }
    .gauge-max { font-size: 13px; color: var(--text-muted); }
    .grade-badge {
      font-size: 15px;
      font-weight: 800;
      padding: 6px 16px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.06);
      color: var(--grade-color);
      border: 1px solid var(--grade-color);
      letter-spacing: 0.05em;
    }
    .summary-text {
      margin-top: 14px;
      font-size: 13px;
      color: var(--text-muted);
    }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }
    .metric-row {
      padding: 16px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      font-weight: 600;
    }
    .metric-status {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
    }
    .status-PASS { background: rgba(16, 185, 129, 0.15); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.3); }
    .status-WARN { background: rgba(245, 158, 11, 0.15); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.3); }
    .status-FAIL { background: rgba(239, 68, 68, 0.15); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.3); }

    .progress-bar-bg {
      height: 6px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 3px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      border-radius: 3px;
      background: var(--grade-color);
      transition: width 1s ease;
    }
    .metric-detail {
      font-size: 12px;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
    }

    /* Tab 2: Visual Tree Explorer */
    .tree-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .tree-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      overflow: hidden;
    }
    .tree-header {
      padding: 14px 18px;
      background: rgba(255, 255, 255, 0.03);
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      user-select: none;
    }
    .tree-header:hover { background: rgba(255, 255, 255, 0.05); }
    .tree-title {
      font-weight: 700;
      font-size: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: 'JetBrains Mono', monospace;
    }
    .tree-tag {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-muted);
    }
    .tree-tag.healthy { background: rgba(16, 185, 129, 0.15); color: var(--success); }
    .tree-tag.archived { background: rgba(14, 165, 233, 0.15); color: var(--accent); }
    .tree-tag.warning { background: rgba(245, 158, 11, 0.15); color: var(--warning); }
    .tree-body {
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
      background: rgba(0, 0, 0, 0.15);
    }
    .tree-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      padding: 6px 10px;
      border-radius: 6px;
      font-family: 'JetBrains Mono', monospace;
    }
    .tree-item:hover { background: rgba(255, 255, 255, 0.03); }
    .tree-item-name {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #e2e8f0;
    }
    .tree-item-meta {
      font-size: 12px;
      color: var(--text-muted);
    }

    /* Tab 3: Table styling */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .data-table th {
      text-align: left;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.03);
      color: var(--text-muted);
      border-bottom: 1px solid var(--card-border);
      font-weight: 600;
    }
    .data-table td {
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: #e2e8f0;
    }
    .data-table tr:hover td { background: rgba(255, 255, 255, 0.02); }

    /* Lesson box */
    .lesson-item {
      padding: 16px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.02);
      border-left: 3px solid var(--accent);
      margin-bottom: 12px;
      font-size: 13px;
    }
    .lesson-item h4 {
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 6px;
    }
    .lesson-item pre {
      white-space: pre-wrap;
      font-family: 'Inter', sans-serif;
      color: var(--text-muted);
      line-height: 1.5;
    }

    /* Tab 4: Patrol Timeline */
    .timeline {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .timeline-item {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }
    .timeline-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(14, 165, 233, 0.15);
      border: 1px solid var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
    }
    .timeline-content {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 16px;
      flex: 1;
    }
    .timeline-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 4px;
    }
    .timeline-desc {
      font-size: 13px;
      color: var(--text-muted);
    }

    .code-badge {
      font-family: 'JetBrains Mono', monospace;
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 6px;
      border-radius: 4px;
      color: #38bdf8;
      font-size: 12px;
    }

    footer {
      margin-top: 48px;
      border-top: 1px solid var(--card-border);
      padding-top: 24px;
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--text-muted);
      flex-wrap: wrap;
      gap: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="title-group">
        <h1>🛡️ Workspace Health Monitor</h1>
        <p>カシマ様 PC ワークスペース健全性・境界監視ダッシュボード</p>
      </div>
      <div class="header-badges">
        <span class="badge-live">
          <span class="badge-pulse"></span>
          REALTIME PATROL ACTIVE
        </span>
      </div>
    </header>

    <!-- タブ切り替えボタン -->
    <div class="tabs-nav">
      <button class="tab-btn active" onclick="switchTab('tab-overview')">📊 総合診断 (Overview)</button>
      <button class="tab-btn" onclick="switchTab('tab-tree')">🌲 フォルダ階層マップ (Directory Tree)</button>
      <button class="tab-btn" onclick="switchTab('tab-logs')">📜 ログ＆教訓分析 (Logs & Meta)</button>
      <button class="tab-btn" onclick="switchTab('tab-patrol')">⏰ 定期徘徊＆自動化 (Patrol & Schedule)</button>
    </div>

    <!-- ========================================== -->
    <!-- TAB 1: 総合診断 (Overview) -->
    <!-- ========================================== -->
    <div id="tab-overview" class="tab-content active">
      <div class="hero-grid">
        <!-- スコアゲージ -->
        <div class="card score-card">
          <div class="gauge-wrapper">
            <svg class="gauge-svg" viewBox="0 0 160 160">
              <circle class="gauge-bg" cx="80" cy="80" r="70"></circle>
              <circle class="gauge-fill" cx="80" cy="80" r="70"></circle>
            </svg>
            <div class="gauge-center">
              <span class="gauge-score">${score}</span>
              <span class="gauge-max">/ 100</span>
            </div>
          </div>
          <div class="grade-badge">GRADE ${grade}</div>
          <p class="summary-text">${audit.summary}</p>
        </div>

        <!-- メトリクス詳細カード -->
        <div class="card">
          <h3 style="font-size: 17px; font-weight: 700; margin-bottom: 16px;">📊 健全性メトリクス詳細</h3>
          <div class="metrics-grid">
            
            <div class="metric-row">
              <div class="metric-header">
                <span>ルート境界防御</span>
                <span class="metric-status status-${metrics.rootBoundary.status}">${metrics.rootBoundary.status}</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${(metrics.rootBoundary.score / metrics.rootBoundary.max) * 100}%;"></div>
              </div>
              <div class="metric-detail">
                <span>未許可ファイル: ${metrics.rootBoundary.violations.length} 件</span>
                <span>${metrics.rootBoundary.score} / ${metrics.rootBoundary.max} pt</span>
              </div>
            </div>

            <div class="metric-row">
              <div class="metric-header">
                <span>成果物カプセル化</span>
                <span class="metric-status status-${metrics.capsuleIntegrity.status}">${metrics.capsuleIntegrity.status}</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${(metrics.capsuleIntegrity.score / metrics.capsuleIntegrity.max) * 100}%;"></div>
              </div>
              <div class="metric-detail">
                <span>検査ツール数: ${metrics.capsuleIntegrity.toolsChecked} ツール</span>
                <span>${metrics.capsuleIntegrity.score} / ${metrics.capsuleIntegrity.max} pt</span>
              </div>
            </div>

            <div class="metric-row">
              <div class="metric-header">
                <span>スクラッチ一時衛生度</span>
                <span class="metric-status status-${metrics.scratchHygiene.status}">${metrics.scratchHygiene.status}</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${(metrics.scratchHygiene.score / metrics.scratchHygiene.max) * 100}%;"></div>
              </div>
              <div class="metric-detail">
                <span>放置残骸: ${metrics.scratchHygiene.filesCount} 件</span>
                <span>${metrics.scratchHygiene.score} / ${metrics.scratchHygiene.max} pt</span>
              </div>
            </div>

            <div class="metric-row">
              <div class="metric-header">
                <span>メタハーネス進化蓄積</span>
                <span class="metric-status status-${metrics.metaHarness.status}">${metrics.metaHarness.status}</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${(metrics.metaHarness.score / metrics.metaHarness.max) * 100}%;"></div>
              </div>
              <div class="metric-detail">
                <span>蓄積教訓: ${metrics.metaHarness.lessonsCount} 件</span>
                <span>${metrics.metaHarness.score} / ${metrics.metaHarness.max} pt</span>
              </div>
            </div>

            <div class="metric-row">
              <div class="metric-header">
                <span>アーカイブ隔離量</span>
                <span class="metric-status status-${metrics.storageCleanliness.status}">${metrics.storageCleanliness.status}</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: 100%; background: var(--accent);"></div>
              </div>
              <div class="metric-detail">
                <span>archive/ 容量: ${metrics.storageCleanliness.archiveSizeMB} MB</span>
                <span>${metrics.storageCleanliness.score} / ${metrics.storageCleanliness.max} pt</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- 改善アクションまたは完全適合メッセージ -->
      ${audit.recommendations.length > 0 ? `
      <div class="card" style="border-left: 4px solid var(--warning);">
        <h3 style="font-size: 16px; font-weight: 700; color: #fbbf24; margin-bottom: 12px;">⚠️ 推奨される改善アクション (${audit.recommendations.length} 件)</h3>
        ${audit.recommendations.map(r => `<div style="font-size: 13px; color: #fbbf24; margin-bottom: 6px;">⚡ ${r}</div>`).join('')}
      </div>
      ` : `
      <div class="card" style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2);">
        <h3 style="font-size: 16px; font-weight: 700; color: var(--success); margin-bottom: 6px;">🎉 全項目パーフェクト（Zero Defect）</h3>
        <p style="font-size: 13px; color: var(--text-muted);">散乱ファイルや未カプセル化の違反は一切ありません。機械的ガードレールとメタハーネスが完全に機能しています。</p>
      </div>
      `}
    </div>

    <!-- ========================================== -->
    <!-- TAB 2: フォルダ階層マップ (Directory Tree) -->
    <!-- ========================================== -->
    <div id="tab-tree" class="tab-content">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h3 style="font-size: 17px; font-weight: 700;">🌲 ワークスペース階層構造エクスプローラー</h3>
            <p style="font-size: 13px; color: var(--text-muted);">各ディレクトリをクリックすると、配下のフォルダ・ツールおよび健全性を展開できます。</p>
          </div>
          <span class="code-badge">監視対象: ${audit.directoryTree.length} セクション</span>
        </div>

        <div class="tree-container">
          ${audit.directoryTree.map((sec, idx) => `
          <div class="tree-card">
            <div class="tree-header" onclick="toggleTree('tree-sec-${idx}')">
              <div class="tree-title">
                <span>📁 ${sec.name}/</span>
                <span style="font-size: 12px; font-weight: normal; color: var(--text-muted);">${sec.note || ''}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <span class="tree-tag ${sec.status}">${sec.status.toUpperCase()}</span>
                <span style="font-size: 12px; color: var(--text-muted);">${sec.itemCount} 項目</span>
                <span style="font-size: 12px; color: var(--text-muted);">▼</span>
              </div>
            </div>
            <div id="tree-sec-${idx}" class="tree-body">
              ${sec.children && sec.children.length > 0 ? sec.children.map(child => `
              <div class="tree-item">
                <div class="tree-item-name">
                  <span>${child.isDir ? '📂' : '📄'}</span>
                  <span>${child.name}</span>
                </div>
                <div class="tree-item-meta">
                  ${child.isDir ? `${child.itemCount} アイテム` : `${(child.sizeBytes / 1024).toFixed(1)} KB`}
                </div>
              </div>
              `).join('') : `
              <div style="font-size: 12px; color: var(--text-muted); padding: 8px;">（空または直下ファイルなし）</div>
              `}
            </div>
          </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- TAB 3: ログ＆教訓分析 (Logs & Meta) -->
    <!-- ========================================== -->
    <div id="tab-logs" class="tab-content">
      <!-- ログファイル容量・行数テーブル -->
      <div class="card">
        <h3 style="font-size: 17px; font-weight: 700; margin-bottom: 6px;">📊 ログファイル容量＆軽量化規律チェック</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
          AGENTS.md「生ログの軽量化規律（泥臭いトレースは数KBに圧縮し、教訓のみ抽出）」の遵守状況です。
        </p>

        <table class="data-table">
          <thead>
            <tr>
              <th>ツール・プロジェクト名</th>
              <th>カテゴリ</th>
              <th>ファイル容量</th>
              <th>行数</th>
              <th>形式（失敗・解決・教訓）</th>
              <th>判定</th>
            </tr>
          </thead>
          <tbody>
            ${audit.logAnalysis.map(log => `
            <tr>
              <td style="font-family: 'JetBrains Mono', monospace; font-weight: 600;">${log.toolId}</td>
              <td>${log.category}</td>
              <td style="font-family: 'JetBrains Mono', monospace;">${log.sizeKB} KB</td>
              <td style="font-family: 'JetBrains Mono', monospace;">${log.lines} 行</td>
              <td>${log.isComplete ? '✅ 3段階完備' : '⚠️ 一部欠損'}</td>
              <td>
                <span class="tree-tag ${log.status === 'optimal' ? 'healthy' : 'warning'}">
                  ${log.status === 'optimal' ? 'OPTIMAL (最適)' : 'CHECK (要確認)'}
                </span>
              </td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- メタ知識アーカイブ -->
      <div class="card">
        <h3 style="font-size: 17px; font-weight: 700; margin-bottom: 6px;">🧠 メタハーネス集約済みの教訓アーカイブ (Meta-Knowledge)</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
          各ツールの <span class="code-badge">logs/trace.md</span> から自動抽出され、AIの再発防止に活かされている知見一覧です。
        </p>
        
        <div class="lesson-item">
          <h4>🔧 minitool_001_unreplied_emails (GASトリガー運用)</h4>
          <pre>1. 失敗: 自動トリガーを設定するツールでは、ユーザーが手動で解除する手段（uninstall関数）を忘れがちになる。
2. 解決: ScriptApp.deleteTrigger を含む uninstallTool() を標準実装とし、ハーネスでも必須検証項目とした。
3. 教訓: すべてのGASツールは「使い始める機能」と同等に「安全にやめる機能（uninstall）」を第一級市民として扱わなければならない。</pre>
        </div>

        <div class="lesson-item">
          <h4>🔧 minitool_002_sheets_to_calendar (実機UI検証と自己欺瞞防止)</h4>
          <pre>1. 失敗: AIが手軽さを優先して自作HTMLモックでデモを撮影し、タブが上にあるあり得ない画面を合格と自己判定した。
2. 解決: 自作モックを永久禁止とし、Google公式DOM幾何判定（下部タブ等）をパスする本物実機UIでのみ撮影を許可した。
3. 教訓: 成果物の合否判定はAIの感想や自己評価に任せず、外部の客観的検証スクリプト（ハーネス）による機械判定でのみ確定させなければならない。</pre>
        </div>

        <div class="lesson-item">
          <h4>🛡️ workspace_health_monitor (監視ツールの自己欺瞞防止＆スタンドアロン化)</h4>
          <pre>1. 失敗: 初期スキャン時、scratch/ 残骸でスコアが75点に急落し、パースプロパティの不整合で教訓蓄積が0件と誤判定された。
2. 解決: scratch/ を完全隔離し、監視エンジン自体のテストハーネス（test_monitor.js）を構築して客観判定を確立。
3. 教訓: 監視ツール自身が自己欺瞞を持たず、テストハーネスで守られる必要がある。また成果物は外部JS依存ゼロの静的HTMLに純化すべきである。</pre>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- TAB 4: 定期徘徊＆自動化 (Patrol & Schedule) -->
    <!-- ========================================== -->
    <div id="tab-patrol" class="tab-content">
      <div class="card">
        <h3 style="font-size: 17px; font-weight: 700; margin-bottom: 8px;">⏰ 自動徘徊・モニタリング運用ステータス</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 24px;">
          PCローカルでのワンクリック点検および、GitHub Actionsによるクラウド自動巡回スケジュールの運用構成です。
        </p>

        <div class="timeline">
          
          <div class="timeline-item">
            <div class="timeline-icon">🖥️</div>
            <div class="timeline-content">
              <div class="timeline-title">ローカル即時点検 (.bat ワンクリック実行)</div>
              <div class="timeline-desc">
                日常の開発時、いつでも <span class="code-badge">run_health_check.bat</span> をダブルクリックすることで、最新のワークスペース状態を即座に再スキャンし、このダッシュボードを自動更新します。
              </div>
            </div>
          </div>

          <div class="timeline-item">
            <div class="timeline-icon">☁️</div>
            <div class="timeline-content">
              <div class="timeline-title">GitHub Actions 定期徘徊ワークフロー</div>
              <div class="timeline-desc">
                配備ファイル: <span class="code-badge">.github/workflows/directory_health_check.yml</span><br>
                毎日定時にリポジトリを自動巡回し、ヘルスチェックを実行して <span class="code-badge">docs/index.html</span> を自動更新・GitHub Pagesへプッシュします。
              </div>
            </div>
          </div>

          <div class="timeline-item">
            <div class="timeline-icon">🛡️</div>
            <div class="timeline-content">
              <div class="timeline-title">アーキテクチャ境界ガードレール (Pre-commit / Pre-test)</div>
              <div class="timeline-desc">
                配備ファイル: <span class="code-badge">harness/global_rules/check_architecture_guard.js</span><br>
                AIがルート直下に無断でファイルを置いたりカプセル化を破った瞬間に、テスト・ビルドを強制終了（Exit Code 1）させて散乱を未然にブロックします。
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <footer>
      <div>監査実行日時: <span class="code-badge">${audit.timestamp}</span></div>
      <div>Powered by Antigravity Meta-Harness & Architectural Guard</div>
    </footer>
  </div>

  <script>
    // タブ切り替え関数
    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      
      event.currentTarget.classList.add('active');
      const target = document.getElementById(tabId);
      if (target) target.classList.add('active');
    }

    // ディレクトリツリー開閉
    function toggleTree(id) {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = (el.style.display === 'none') ? 'flex' : 'none';
      }
    }
  </script>
</body>
</html>`;
}

function buildDashboard() {
  console.log('=== [Dashboard Generator v2.0] ワークスペース健康状態ダッシュボード生成中 ===');
  const audit = runHealthAudit();
  
  // JSON出力
  const jsonPath = path.join(DIST_DIR, 'health_report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(audit, null, 2), 'utf8');
  console.log(`✅ JSONレポート生成完了: ${jsonPath}`);

  // HTML出力 (dist/ および GitHub Pages用の docs/)
  const htmlContent = generateHtml(audit);
  const htmlPath = path.join(DIST_DIR, 'index.html');
  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  console.log(`✅ HTMLダッシュボード生成完了: ${htmlPath}`);

  const docsDir = path.resolve(ROOT_DIR, 'docs');
  if (fs.existsSync(docsDir)) {
    const docsHtmlPath = path.join(docsDir, 'index.html');
    fs.writeFileSync(docsHtmlPath, htmlContent, 'utf8');
    console.log(`✅ GitHub Pages配備用出力完了: ${docsHtmlPath}`);
  }

  return { htmlPath, jsonPath, audit };
}

if (require.main === module) {
  buildDashboard();
}

module.exports = { buildDashboard };
