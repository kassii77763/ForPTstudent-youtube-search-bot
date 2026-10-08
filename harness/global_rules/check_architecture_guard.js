/**
 * Architecture Guardrail (世界標準のガードレール)
 * ------------------------------------------------------------
 * 「Guardrails, Not Guidelines」の思想に基づき、
 * AIエージェントがルート直下やプロジェクト境界を破壊・散乱させるのを
 * 機械的に検知して即座にビルド/実行を落とす（Exit Code 1）。
 */
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../../');

// ルート直下に存在が許可されているホワイトリスト（これ以外は違反）
const ALLOWED_ROOT_ITEMS = new Set([
  // ディレクトリ
  '.agents',
  '.git',
  '.github',
  '__pycache__',
  'annotations',
  'archive',
  'bin',
  'brain',
  'builtin',
  'cards',
  'conversations',
  'crashes',
  'docs',
  'gas_project',
  'harness',
  'knowledge',
  'mcp',
  'node_modules',
  'output',
  'projects',
  'scratch',
  'templates',
  'test-video',
  'thumbnails',
  'thumbs',

  // システム必須ファイル
  '.gitignore',
  'AGENTS.md',
  'Note_Login.bat',
  'NotebookLM_Login.bat',
  'Post_To_X.bat',
  'README.md',
  'agyhub_summaries_proto.pb',
  'antigravity_state.pbtxt',
  'conversation_summaries.db',
  'conversation_summaries.db-shm',
  'conversation_summaries.db-wal',
  'installation_id',
  'note_login.js',
  'package.json',
  'package-lock.json',
  'plaud_cli.mjs',
  'server.js',
  'skills-lock.json'
]);

function checkArchitecture() {
  console.log('=== [Architecture Guard] ワークスペース境界＆ディレクトリ健全性検査 ===');
  const items = fs.readdirSync(ROOT_DIR);
  const violations = [];

  // 1. ルート直下の未許可アイテム検査
  for (const item of items) {
    if (!ALLOWED_ROOT_ITEMS.has(item)) {
      violations.push(`ルート直下に未許可のファイル/フォルダが存在します: ${item} (archive/へ移動してください)`);
    }
  }

  // 2. 成果物カプセル化検査（gas_project 直下の構造）
  const gasProjectDir = path.join(ROOT_DIR, 'gas_project');
  if (fs.existsSync(gasProjectDir)) {
    const gasItems = fs.readdirSync(gasProjectDir, { withFileTypes: true });
    for (const gi of gasItems) {
      if (!gi.isDirectory()) {
        violations.push(`gas_project/ 直下に直接ファイルが置かれています: ${gi.name} (各ツールフォルダ内に隔離してください)`);
      }
    }
  }

  // 判定出力
  if (violations.length === 0) {
    console.log('✅ PASS: ディレクトリ境界は完全にクリーンです（違反ゼロ）。\n');
    return true;
  } else {
    console.error(`❌ FAIL: アーキテクチャ違反が ${violations.length} 件検出されました:`);
    violations.forEach(v => console.error(`  - ${v}`));
    console.error('\nルール違反があるため処理を強制中断します（AGENTS.md のファイル管理規律を参照してください）。\n');
    return false;
  }
}

if (require.main === module) {
  const isClean = checkArchitecture();
  process.exit(isClean ? 0 : 1);
}

module.exports = { checkArchitecture, ALLOWED_ROOT_ITEMS };
