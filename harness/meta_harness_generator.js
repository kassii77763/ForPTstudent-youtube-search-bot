/**
 * Meta-Harness Generator (v1.0)
 * -------------------------------------------------------------
 * 過去の教訓DB（harness/meta_knowledge.json）と新規プロジェクト要件から、
 * プロジェクト専用の受入・回帰テストハーネス（eval.js）を自動生成するエンジン。
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../');
const KNOWLEDGE_PATH = path.join(__dirname, 'meta_knowledge.json');

/**
 * 過去の教訓DBから関連ルールを抽出する
 */
function extractInjectedRules(projectType, requirements) {
  if (!fs.existsSync(KNOWLEDGE_PATH)) return [];
  
  const raw = fs.readFileSync(KNOWLEDGE_PATH, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return [];
  }

  const knowledgeBase = data.knowledgeBase || [];
  const injected = [];

  knowledgeBase.forEach(kb => {
    const text = kb.lessonsRaw || '';
    
    // GASプロジェクト向けの教訓注入
    if (projectType === 'gas_minitool' || projectType === 'gas') {
      if (text.includes('uninstall') || text.includes('トリガー')) {
        injected.push({
          sourceId: kb.toolId,
          ruleName: 'uninstallTool_verification',
          title: '安全なトリガー解除機能の実装検査',
          description: 'ScriptApp.deleteTrigger() を含む uninstallTool() 関数が実装されていること。',
          severity: 'CRITICAL',
          type: 'code_ast_check'
        });
      }
      if (text.includes('モック') || text.includes('実機') || text.includes('DOM')) {
        injected.push({
          sourceId: kb.toolId,
          ruleName: 'anti_mock_optical_scan',
          title: 'Google実機DOM幾何光学検査（自作モック完全排除）',
          description: '自作HTMLモックを排除し、公式Googleスプレッドシート/ドキュメントの実機UIでのみ撮影されていること。',
          severity: 'HIGH',
          type: 'dom_geometry_check'
        });
      }
    }

    // 全般・Web/監視ツール向けの教訓注入
    if (text.includes('自己欺瞞') || text.includes('テストハーネス')) {
      injected.push({
        sourceId: kb.toolId,
        ruleName: 'self_test_integrity_gate',
        title: '自己テストハーネス完備検査',
        description: 'プロジェクト自身が客観的テストスクリプトを持ち、外部依存なしで実行可能であること。',
        severity: 'HIGH',
        type: 'test_coverage_check'
      });
    }

    if (text.includes('静的HTML') || text.includes('Zero External JS')) {
      injected.push({
        sourceId: kb.toolId,
        ruleName: 'standalone_artifact_purity',
        title: '成果物の自己完結性（ゼロ外部依存）検査',
        description: '成果物HTML/スクリプトがローカル・外部環境問わず単独で動作すること。',
        severity: 'MEDIUM',
        type: 'dependency_check'
      });
    }
  });

  // 重複排除
  const uniqueRules = [];
  const seen = new Set();
  injected.forEach(r => {
    if (!seen.has(r.ruleName)) {
      seen.add(r.ruleName);
      uniqueRules.push(r.ruleName === 'uninstallTool_verification' || r.ruleName === 'anti_mock_optical_scan' || r.ruleName === 'self_test_integrity_gate' ? r : null);
    }
  });

  return uniqueRules.filter(Boolean);
}

/**
 * プロジェクト専用ハーネスを自動生成する
 */
function generateProjectHarness(projectName, projectType, requirements = []) {
  console.log(`[Meta-Harness Generator] プロジェクト専用ハーネス生成開始: ${projectName} (${projectType})`);
  
  const injectedRules = extractInjectedRules(projectType, requirements);
  
  const capabilityEvals = requirements.map((req, idx) => ({
    id: `CAP_${idx + 1}`,
    name: req.name || `要件_${idx + 1}`,
    description: req.desc || req,
    assertType: req.type || 'presence'
  }));

  const harnessConfig = {
    projectName,
    projectType,
    generatedAt: new Date().toISOString(),
    globalInvariants: [
      { id: 'INV_1', name: 'workspace_capsule_check', desc: '1ツール1フォルダカプセル化（ルート散乱禁止）' },
      { id: 'INV_2', name: 'trace_log_lightweight', desc: 'trace.mdの教訓フォーマット（失敗/解決/教訓）準拠' }
    ],
    capabilityEvals,
    injectedRegressionChecks: injectedRules
  };

  return harnessConfig;
}

if (require.main === module) {
  const result = generateProjectHarness('minitool_003_gmail_summarizer', 'gas_minitool', [
    { name: 'Gmail下書き自動作成機能', desc: '未読メールから重要要約を作成してDraftに保存する' },
    { name: 'X告知ポスト文作成', desc: 'x_post.mdに140字以内の投稿文が生成されていること' }
  ]);
  console.log('生成されたハーネスマトリクス:');
  console.log(JSON.stringify(result, null, 2));
}

module.exports = {
  generateProjectHarness,
  extractInjectedRules
};
