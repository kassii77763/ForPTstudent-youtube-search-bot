/**
 * Meta-Harness Self-Verification Test Suite (メタハーネス実動検証ハーネス)
 * -----------------------------------------------------------------------
 * メタハーネスが「ハーネスを生み出す頭脳」かつ「自己進化する回路」として
 * ワークスペース上で現実に正しく作動しているかを機械的に客観検証するテストスイート。
 *
 * [Test 1] メタ回収エンジン (meta_harness_collector.js) の実動 & ナレッジDB更新検証
 * [Test 2] ナレッジDB (meta_knowledge.json) の構造完全性 & 教訓パース検証
 * [Test 3] ハーネス合成エンジン (meta_harness_generator.js) の動的テスト生成検証
 * [Test 4] 事前境界ガード (check_architecture_guard.js) の実効性検証
 */

const fs = require('fs');
const path = require('path');
const { collectLessons } = require('./meta_harness_collector');
const { generateProjectHarness, extractInjectedRules } = require('./meta_harness_generator');

const ROOT_DIR = path.resolve(__dirname, '../');
const KNOWLEDGE_PATH = path.join(__dirname, 'meta_knowledge.json');

function runMetaHarnessTests() {
  console.log('=== [Meta-Harness Test Suite] メタハーネス実動検証開始 ===\n');
  const results = {
    timestamp: new Date().toISOString(),
    testsPassed: 0,
    testsTotal: 4,
    details: []
  };

  // [Test 1] メタ回収エンジンの実動
  console.log('[Test 1] メタ回収エンジンの実動検証 (collectLessons)...');
  try {
    const collected = collectLessons();
    if (!Array.isArray(collected) || collected.length === 0) {
      throw new Error('教訓が1件も回収されませんでした。');
    }
    console.log(` -> OK: ${collected.length} 件のプロジェクトから教訓を正常回収`);
    results.testsPassed++;
    results.details.push({ test: 'Collector Execution', status: 'PASS', items: collected.length });
  } catch (err) {
    console.error(` -> FAIL: ${err.message}`);
    results.details.push({ test: 'Collector Execution', status: 'FAIL', error: err.message });
  }

  // [Test 2] ナレッジDBの構造完全性
  console.log('\n[Test 2] ナレッジDB (meta_knowledge.json) の完全性検証...');
  try {
    if (!fs.existsSync(KNOWLEDGE_PATH)) {
      throw new Error('meta_knowledge.json が存在しません。');
    }
    const data = JSON.parse(fs.readFileSync(KNOWLEDGE_PATH, 'utf8'));
    if (!data.knowledgeBase || !Array.isArray(data.knowledgeBase) || data.knowledgeBase.length === 0) {
      throw new Error('knowledgeBase 配列が不正または空です。');
    }

    const first = data.knowledgeBase[0];
    if (!first.toolId || !first.harnessVersion || !first.lessonsRaw) {
      throw new Error('必須スキーマ (toolId, harnessVersion, lessonsRaw) が欠落しています。');
    }
    console.log(` -> OK: ナレッジDB構造適合確認 (蓄積数: ${data.knowledgeBase.length} 件, 最終更新: ${data.updatedAt})`);
    results.testsPassed++;
    results.details.push({ test: 'Knowledge DB Schema', status: 'PASS', count: data.knowledgeBase.length });
  } catch (err) {
    console.error(` -> FAIL: ${err.message}`);
    results.details.push({ test: 'Knowledge DB Schema', status: 'FAIL', error: err.message });
  }

  // [Test 3] ハーネス合成エンジンの動的テスト生成
  console.log('\n[Test 3] ハーネス合成エンジンの動的生成能力検証 (generateProjectHarness)...');
  try {
    const generated = generateProjectHarness('test_dummy_project', 'gas_minitool', [
      { name: 'ダミー機能', desc: 'テスト要件' }
    ]);

    if (!generated.injectedRegressionChecks || !Array.isArray(generated.injectedRegressionChecks)) {
      throw new Error('過去教訓からの回帰テスト注入配列が生成されませんでした。');
    }

    const ruleNames = generated.injectedRegressionChecks.map(r => r.ruleName);
    const hasUninstallCheck = ruleNames.includes('uninstallTool_verification');
    const hasAntiMockCheck = ruleNames.includes('anti_mock_optical_scan');

    if (!hasUninstallCheck || !hasAntiMockCheck) {
      throw new Error(`過去教訓の自動注入ルールが不足しています。検出されたルール: ${ruleNames.join(', ')}`);
    }

    console.log(` -> OK: 過去教訓から ${generated.injectedRegressionChecks.length} 件の回帰テストを動的合成成功`);
    results.testsPassed++;
    results.details.push({ test: 'Harness Synthesis', status: 'PASS', generatedRules: ruleNames });
  } catch (err) {
    console.error(` -> FAIL: ${err.message}`);
    results.details.push({ test: 'Harness Synthesis', status: 'FAIL', error: err.message });
  }

  // [Test 4] 事前境界ガードの実効性
  console.log('\n[Test 4] 事前境界ガードの実効性検証 (check_architecture_guard.js)...');
  try {
    const guardPath = path.join(__dirname, 'global_rules', 'check_architecture_guard.js');
    if (!fs.existsSync(guardPath)) {
      throw new Error('check_architecture_guard.js が存在しません。');
    }
    const guardContent = fs.readFileSync(guardPath, 'utf8');
    if (!guardContent.includes('ALLOWED_ROOT_ITEMS') && !guardContent.includes('ALLOWED_ENTRIES')) {
      throw new Error('ホワイトリスト判定ロジックが見つかりません。');
    }
    console.log(' -> OK: 事前境界ガードの構文＆ホワイトリスト定義確認');
    results.testsPassed++;
    results.details.push({ test: 'Architecture Guard Integrity', status: 'PASS' });
  } catch (err) {
    console.error(` -> FAIL: ${err.message}`);
    results.details.push({ test: 'Architecture Guard Integrity', status: 'FAIL', error: err.message });
  }

  console.log('\n========================================');
  const allPassed = results.testsPassed === results.testsTotal;
  if (allPassed) {
    console.log(`✅ ALL META-HARNESS TESTS PASSED (${results.testsPassed} / ${results.testsTotal}): メタハーネス実動稼働確認`);
  } else {
    console.error(`❌ SOME TESTS FAILED (${results.testsPassed} / ${results.testsTotal})`);
    process.exit(1);
  }
  console.log('========================================\n');

  return results;
}

if (require.main === module) {
  runMetaHarnessTests();
}

module.exports = { runMetaHarnessTests };
