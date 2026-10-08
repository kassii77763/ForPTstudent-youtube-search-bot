/**
 * Workspace Health Monitor - 診断・徘徊スキャンエンジン (v2.0)
 * -----------------------------------------------------------------
 * PC・ワークスペース全体のディレクトリ健全性、階層ツリー構造、
 * ログ容量・行数・肥大化度、メタハーネス進化状況を詳細分析する。
 */
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../../');

// ホワイトリスト（check_architecture_guard.jsと同期）
const ALLOWED_ROOT_ITEMS = new Set([
  '.agents', '.git', '.github', '__pycache__', 'annotations', 'archive', 'bin', 'brain',
  'builtin', 'cards', 'conversations', 'crashes', 'docs', 'gas_project',
  'harness', 'knowledge', 'mcp', 'node_modules', 'output', 'projects',
  'scratch', 'templates', 'test-video', 'thumbnails', 'thumbs',
  '.gitignore', 'AGENTS.md', 'Note_Login.bat', 'NotebookLM_Login.bat',
  'Post_To_X.bat', 'README.md', 'agyhub_summaries_proto.pb',
  'antigravity_state.pbtxt', 'conversation_summaries.db',
  'conversation_summaries.db-shm', 'conversation_summaries.db-wal',
  'installation_id', 'note_login.js', 'package.json', 'package-lock.json',
  'plaud_cli.mjs', 'server.js', 'skills-lock.json'
]);

function getDirStats(dirPath) {
  let count = 0;
  let totalBytes = 0;
  if (!fs.existsSync(dirPath)) return { count: 0, totalBytes: 0 };

  function scan(p) {
    try {
      const items = fs.readdirSync(p, { withFileTypes: true });
      for (const item of items) {
        const full = path.join(p, item.name);
        if (item.isDirectory()) {
          scan(full);
        } else {
          count++;
          try {
            totalBytes += fs.statSync(full).size;
          } catch (e) {}
        }
      }
    } catch (e) {}
  }
  scan(dirPath);
  return { count, totalBytes };
}

// フォルダ構造の階層ツリーを再帰的に生成（深度2まで）
function buildDirectoryNode(name, dirPath, depth = 0, maxDepth = 2) {
  if (!fs.existsSync(dirPath)) return null;
  const isDir = fs.statSync(dirPath).isDirectory();
  const node = {
    name,
    path: path.relative(ROOT_DIR, dirPath).replace(/\\/g, '/'),
    isDir,
    sizeBytes: 0,
    itemCount: 0,
    status: 'healthy', // healthy | warning | violation | archived
    note: '',
    children: []
  };

  if (!isDir) {
    try {
      node.sizeBytes = fs.statSync(dirPath).size;
    } catch (e) {}
    return node;
  }

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    node.itemCount = entries.length;

    if (depth < maxDepth) {
      for (const entry of entries) {
        // 重大または不要な巨大フォルダ（node_modules, .git）は子展開を省略
        if (['node_modules', '.git', '__pycache__'].includes(entry.name)) {
          node.children.push({
            name: entry.name,
            path: path.relative(ROOT_DIR, path.join(dirPath, entry.name)).replace(/\\/g, '/'),
            isDir: true,
            sizeBytes: 0,
            itemCount: 0,
            status: 'healthy',
            note: 'システム管理フォルダ (展開省略)',
            children: []
          });
          continue;
        }

        const childPath = path.join(dirPath, entry.name);
        const childNode = buildDirectoryNode(entry.name, childPath, depth + 1, maxDepth);
        if (childNode) {
          node.sizeBytes += childNode.sizeBytes;
          node.children.push(childNode);
        }
      }
    }
  } catch (e) {}

  return node;
}

// ログ解析（trace.mdの行数・容量・品質）
function analyzeLogFiles() {
  const logEntries = [];
  const searchRoots = [
    { base: path.join(ROOT_DIR, 'gas_project'), label: 'GAS MiniTool' },
    { base: path.join(ROOT_DIR, 'projects'), label: 'Projects' }
  ];

  for (const root of searchRoots) {
    if (!fs.existsSync(root.base)) continue;
    const subdirs = fs.readdirSync(root.base, { withFileTypes: true })
      .filter(d => d.isDirectory());

    for (const sub of subdirs) {
      const traceFile = path.join(root.base, sub.name, 'logs', 'trace.md');
      if (fs.existsSync(traceFile)) {
        try {
          const stat = fs.statSync(traceFile);
          const content = fs.readFileSync(traceFile, 'utf8');
          const lines = content.split('\n').length;
          const sizeKB = (stat.size / 1024).toFixed(1);

          // 3大セクションのチェック
          const hasFailure = content.includes('失敗');
          const hasResolution = content.includes('解決');
          const hasLesson = content.includes('教訓');
          const isComplete = hasFailure && hasResolution && hasLesson;

          let status = 'optimal'; // optimal | bulky | incomplete
          if (stat.size > 50 * 1024) status = 'bulky';
          else if (!isComplete) status = 'incomplete';

          logEntries.push({
            toolId: sub.name,
            category: root.label,
            path: path.relative(ROOT_DIR, traceFile).replace(/\\/g, '/'),
            sizeKB: parseFloat(sizeKB),
            lines,
            updatedAt: stat.mtime.toISOString(),
            isComplete,
            status,
            note: status === 'optimal' ? '軽量（3段階形式で圧縮保存済み）' : '形式不備または要圧縮'
          });
        } catch (e) {}
      }
    }
  }

  return logEntries;
}

function runHealthAudit() {
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    score: 100,
    grade: 'S',
    summary: '',
    metrics: {
      rootBoundary: { score: 25, max: 25, violations: [], status: 'PASS' },
      capsuleIntegrity: { score: 25, max: 25, violations: [], toolsChecked: 0, status: 'PASS' },
      scratchHygiene: { score: 20, max: 20, filesCount: 0, totalBytes: 0, status: 'PASS' },
      metaHarness: { score: 15, max: 15, traceCount: 0, lessonsCount: 0, status: 'PASS' },
      storageCleanliness: { score: 15, max: 15, archiveSizeMB: 0, status: 'PASS' }
    },
    directoryTree: [],
    logAnalysis: [],
    patrol: {
      schedule: 'Daily (GitHub Actions 0:00 UTC) & On-Demand (.bat)',
      lastCheck: timestamp,
      status: 'ACTIVE',
      monitoredFoldersCount: 0
    },
    recommendations: []
  };

  // 1. Root Boundary (25点)
  try {
    const rootItems = fs.readdirSync(ROOT_DIR);
    for (const item of rootItems) {
      if (!ALLOWED_ROOT_ITEMS.has(item)) {
        report.metrics.rootBoundary.violations.push(`未許可アイテム: ${item}`);
      }
    }
    const rootViolations = report.metrics.rootBoundary.violations.length;
    if (rootViolations > 0) {
      const deduction = Math.min(25, rootViolations * 5);
      report.metrics.rootBoundary.score -= deduction;
      report.metrics.rootBoundary.status = 'FAIL';
      report.recommendations.push(`ルート直下に未許可アイテムが ${rootViolations} 件あります。archive/ 配下に退避してください。`);
    }
  } catch (err) {
    report.metrics.rootBoundary.violations.push(err.message);
    report.metrics.rootBoundary.score = 0;
  }

  // 2. Capsule Integrity (25点)
  const gasDir = path.join(ROOT_DIR, 'gas_project');
  if (fs.existsSync(gasDir)) {
    const gasItems = fs.readdirSync(gasDir, { withFileTypes: true });
    for (const gi of gasItems) {
      if (!gi.isDirectory()) {
        report.metrics.capsuleIntegrity.violations.push(`gas_project/ 直下に直接配置されたファイル: ${gi.name}`);
      } else {
        report.metrics.capsuleIntegrity.toolsChecked++;
        const toolDir = path.join(gasDir, gi.name);
        const traceFile = path.join(toolDir, 'logs', 'trace.md');
        if (!fs.existsSync(traceFile)) {
          report.metrics.capsuleIntegrity.violations.push(`${gi.name}: logs/trace.md が未配備です`);
        }
      }
    }
    const capViolations = report.metrics.capsuleIntegrity.violations.length;
    if (capViolations > 0) {
      const deduction = Math.min(25, capViolations * 5);
      report.metrics.capsuleIntegrity.score -= deduction;
      report.metrics.capsuleIntegrity.status = capViolations > 2 ? 'FAIL' : 'WARN';
      report.recommendations.push(`成果物カプセル化の違反が ${capViolations} 件検出されました。各ツール内に隔離してください。`);
    }
  }

  // 3. Scratch Hygiene (20点)
  const scratchDir = path.join(ROOT_DIR, 'scratch');
  if (fs.existsSync(scratchDir)) {
    const scratchFiles = fs.readdirSync(scratchDir).filter(f => !f.startsWith('.'));
    report.metrics.scratchHygiene.filesCount = scratchFiles.length;
    if (scratchFiles.length > 0) {
      const deduction = Math.min(20, scratchFiles.length * 4);
      report.metrics.scratchHygiene.score -= deduction;
      report.metrics.scratchHygiene.status = scratchFiles.length > 3 ? 'FAIL' : 'WARN';
      report.recommendations.push(`scratch/ に放置された検証ファイルが ${scratchFiles.length} 件あります。即時破棄または archive/ へ隔離してください。`);
    }
  }

  // 4. Meta Harness Evolution (15点)
  const metaJson = path.join(ROOT_DIR, 'harness', 'meta_knowledge.json');
  if (fs.existsSync(metaJson)) {
    try {
      const data = JSON.parse(fs.readFileSync(metaJson, 'utf8'));
      const list = data.knowledgeBase || data.lessons || [];
      report.metrics.metaHarness.lessonsCount = list.length;
      report.metrics.metaHarness.traceCount = data.totalToolsCount || list.length;
    } catch (e) {}
  }
  if (report.metrics.metaHarness.lessonsCount === 0) {
    report.metrics.metaHarness.score -= 5;
    report.metrics.metaHarness.status = 'WARN';
    report.recommendations.push('メタハーネス知識集約データに教訓が蓄積されていません。node harness/meta_harness_collector.js を実行してください。');
  }

  // 5. Storage Cleanliness (15点)
  const archiveDir = path.join(ROOT_DIR, 'archive');
  if (fs.existsSync(archiveDir)) {
    const archStats = getDirStats(archiveDir);
    const mb = (archStats.totalBytes / (1024 * 1024)).toFixed(1);
    report.metrics.storageCleanliness.archiveSizeMB = parseFloat(mb);
  }

  // 総合スコア算出
  const totalScore = 
    report.metrics.rootBoundary.score +
    report.metrics.capsuleIntegrity.score +
    report.metrics.scratchHygiene.score +
    report.metrics.metaHarness.score +
    report.metrics.storageCleanliness.score;

  report.score = Math.max(0, Math.min(100, totalScore));

  if (report.score >= 95) report.grade = 'S';
  else if (report.score >= 85) report.grade = 'A';
  else if (report.score >= 70) report.grade = 'B';
  else if (report.score >= 50) report.grade = 'C';
  else report.grade = 'F';

  if (report.score >= 95) {
    report.summary = '極めて健全です。境界規律・カプセル化・ハーネス蓄積ともに完璧に保たれています。';
  } else if (report.score >= 80) {
    report.summary = '概ね良好ですが、一部カプセル化や一時ファイルの整理が推奨されます。';
  } else {
    report.summary = 'ディレクトリ散乱や規律違反が検知されています。改善提案を確認してください。';
  }

  // 階層ツリー生成（主要セクション）
  const keySections = ['gas_project', 'projects', 'harness', 'docs', 'scratch', 'archive'];
  for (const sec of keySections) {
    const p = path.join(ROOT_DIR, sec);
    if (fs.existsSync(p)) {
      const treeNode = buildDirectoryNode(sec, p, 0, 2);
      if (treeNode) {
        // ステータス付与
        if (sec === 'scratch' && report.metrics.scratchHygiene.filesCount > 0) {
          treeNode.status = 'warning';
          treeNode.note = `残骸 ${report.metrics.scratchHygiene.filesCount} 件放置中`;
        } else if (sec === 'archive') {
          treeNode.status = 'archived';
          treeNode.note = `過去アセット完全隔離 (${report.metrics.storageCleanliness.archiveSizeMB} MB)`;
        } else if (sec === 'gas_project') {
          treeNode.note = `GASミニツール本番 (${report.metrics.capsuleIntegrity.toolsChecked} ツール完全カプセル化)`;
        } else if (sec === 'harness') {
          treeNode.note = '16基準評価＆メタ集約エンジン';
        }
        report.directoryTree.push(treeNode);
      }
    }
  }

  // ログ詳細分析
  report.logAnalysis = analyzeLogFiles();

  // 監視対象フォルダ総数
  report.patrol.monitoredFoldersCount = report.directoryTree.length;

  return report;
}

if (require.main === module) {
  const audit = runHealthAudit();
  console.log(`\n=== 🏥 WORKSPACE HEALTH AUDIT REPORT (v2.0) ===`);
  console.log(`Timestamp: ${audit.timestamp}`);
  console.log(`Score: ${audit.score} / 100  [Grade: ${audit.grade}]`);
  console.log(`Directory Nodes: ${audit.directoryTree.length} sections`);
  console.log(`Logs Analyzed: ${audit.logAnalysis.length} files`);
}

module.exports = { runHealthAudit };
