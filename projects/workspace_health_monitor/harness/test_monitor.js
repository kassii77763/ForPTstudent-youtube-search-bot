/**
 * Self-Harness Test for Workspace Health Monitor
 * -------------------------------------------------------------
 * 監視エンジンおよびダッシュボード生成器の正常動作を自動検証する。
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { runHealthAudit } = require('../monitor');
const { buildDashboard } = require('../generate_dashboard');

function runTests() {
  console.log('=== [Test Suite] Workspace Health Monitor 検証開始 ===\n');

  // Test 1: Audit Report Data Structure
  console.log('[Test 1] 診断結果データ構造の検証...');
  const audit = runHealthAudit();
  assert(typeof audit.score === 'number', 'score must be a number');
  assert(audit.score >= 0 && audit.score <= 100, 'score must be between 0 and 100');
  assert(['S', 'A', 'B', 'C', 'F'].includes(audit.grade), 'grade must be valid');
  assert(audit.metrics.rootBoundary, 'rootBoundary metric required');
  assert(audit.metrics.capsuleIntegrity, 'capsuleIntegrity metric required');
  assert(audit.metrics.scratchHygiene, 'scratchHygiene metric required');
  assert(audit.metrics.metaHarness, 'metaHarness metric required');
  assert(audit.tokenUsage, 'tokenUsage metric required');
  assert(typeof audit.tokenUsage.tokenHygieneScore === 'number', 'tokenHygieneScore must be number');
  assert(Array.isArray(audit.tokenUsage.contextHeavyFiles), 'contextHeavyFiles must be array');
  console.log(' -> OK: データ構造適合確認 (Score: ' + audit.score + ', Grade: ' + audit.grade + ', TokenHygiene: ' + audit.tokenUsage.tokenHygieneScore + ' pt)');

  // Test 2: Build Output Verification
  console.log('\n[Test 2] ダッシュボード出力成果物の検証...');
  const res = buildDashboard();
  assert(fs.existsSync(res.htmlPath), 'index.html must exist');
  assert(fs.existsSync(res.jsonPath), 'health_report.json must exist');

  const html = fs.readFileSync(res.htmlPath, 'utf8');
  assert(html.includes('Workspace Management Console') || html.includes('Workspace Health Monitor'), 'HTML must contain valid console title');
  assert(html.includes('gauge-svg'), 'HTML must contain gauge SVG');
  assert(html.includes(`GRADE ${audit.grade}`), 'HTML must contain accurate grade');
  // Test 3: Dynamic Topology & Node Completeness Verification
  console.log('\n[Test 3] 新規プロジェクト動的トポロジー自動生成＆ノード完全性の検証...');
  const harnesses = audit.projectHarnesses || {};
  const harnessCount = Object.keys(harnesses).length;
  assert(harnessCount >= 5, `Must detect all projects (found: ${harnessCount})`);

  const requiredNodes = [
    'human', 'compress', 'context', 'curation', 'pre_guard',
    'ai', 'gate', 'mcp', 'memory', 'sub_ai', 'post_guard',
    'continue', 'return', 'session_monitor'
  ];

  for (const [key, pData] of Object.entries(harnesses)) {
    assert(pData.name, `${key} must have name`);
    assert(pData.icon, `${key} must have icon`);
    assert(pData.lblContext, `${key} must have lblContext`);
    assert(pData.lblMcp, `${key} must have lblMcp`);
    assert(pData.lblGate, `${key} must have lblGate`);
    assert(pData.nodes, `${key} must have nodes object`);

    for (const rNode of requiredNodes) {
      const node = pData.nodes[rNode];
      assert(node, `${key} missing node: ${rNode}`);
      assert(node.title, `${key}.${rNode} must have title`);
      assert(node.badge, `${key}.${rNode} must have badge`);
      assert(Array.isArray(node.items) && node.items.length > 0, `${key}.${rNode} must have items`);
    }
  }

  // HTML内に全プロジェクトのタブとルーブリック項目が存在することを検証
  for (const [key, pData] of Object.entries(harnesses)) {
    assert(html.includes(`selectProjectHarness('${key}')`), `HTML must contain tab button for ${key} (${pData.name})`);
    assert(html.includes(`r-item-${key}`), `HTML must contain rubric item for ${key} (${pData.name})`);
  }
  console.log(` -> OK: 全 ${harnessCount} プロジェクトのトポロジーノード・タブ・ルーブリック完全整合確認`);

  console.log('\n========================================');
  console.log('✅ ALL TESTS PASSED: 診断エンジン＆動的トポロジー完全適合');
  console.log('========================================\n');
}

if (require.main === module) {
  try {
    runTests();
    process.exit(0);
  } catch (err) {
    console.error('❌ TEST FAILED:', err.message);
    process.exit(1);
  }
}

module.exports = { runTests };
