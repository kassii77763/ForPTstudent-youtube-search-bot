/**
 * Meta-Harness Knowledge Collector (メタハーネス知識集約エンジン)
 * ------------------------------------------------------------
 * 数理の弾丸氏が解説した「Meta-Harness (proposer)」の燃料供給システム。
 * 各ツールフォルダ内の logs/trace.md を自動巡回し、
 * 「失敗」「解決」「恒久教訓」を構造化データとして harness/meta_knowledge.json に集約する。
 *
 * 次回以降、親AI（proposer）はこのJSONを1回読むだけで、
 * 過去の全失敗パターンを踏まえた次世代ハーネスを自動設計できる。
 */
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../');
const GAS_PROJECT_DIR = path.join(ROOT_DIR, 'gas_project');
const PROJECTS_DIR = path.join(ROOT_DIR, 'projects');
const OUTPUT_FILE = path.join(__dirname, 'meta_knowledge.json');

function collectLessons() {
  console.log('=== [Meta-Harness] 過去の全ツール教訓ログ集約処理開始 ===');
  const knowledgeBase = [];

  const targets = [];
  if (fs.existsSync(GAS_PROJECT_DIR)) {
    fs.readdirSync(GAS_PROJECT_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name.startsWith('minitool_'))
      .forEach(d => targets.push({ name: d.name, base: GAS_PROJECT_DIR }));
  }
  if (fs.existsSync(PROJECTS_DIR)) {
    fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .forEach(d => targets.push({ name: d.name, base: PROJECTS_DIR }));
  }

  for (const item of targets) {
    const tracePath = path.join(item.base, item.name, 'logs', 'trace.md');
    if (fs.existsSync(tracePath)) {
      const content = fs.readFileSync(tracePath, 'utf8');
      
      const toolIdMatch = content.match(/ツールID:\s*(.+)/) || content.match(/プロジェクト名:\s*`?([^`\n]+)`?/);
      const versionMatch = content.match(/ハーネスバージョン:\s*(.+)/);
      const lessonMatch = content.match(/## 恒久教訓[^\n]*\n([\s\S]*?)(?=\n##|$)/) || content.match(/### 3\. 教訓[^\n]*\n([\s\S]*?)(?=\n##|$)/);

      knowledgeBase.push({
        toolId: toolIdMatch ? toolIdMatch[1].trim() : item.name,
        harnessVersion: versionMatch ? versionMatch[1].trim() : 'harness_v1.0',
        lessonsRaw: lessonMatch ? lessonMatch[1].trim() : '',
        timestamp: new Date().toISOString()
      });
      console.log(`  ✔ [集約完了] ${item.name}`);
    }
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    totalToolsCount: knowledgeBase.length,
    knowledgeBase
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`\n✅ 集約完了: ${OUTPUT_FILE} に ${knowledgeBase.length} 件の教訓を保存しました。\n`);
  return knowledgeBase;
}

if (require.main === module) {
  collectLessons();
}

module.exports = { collectLessons };
