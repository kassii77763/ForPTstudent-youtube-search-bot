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
  console.log(' -> OK: データ構造適合確認 (Score: ' + audit.score + ', Grade: ' + audit.grade + ')');

  // Test 2: Build Output Verification
  console.log('\n[Test 2] ダッシュボード出力成果物の検証...');
  const res = buildDashboard();
  assert(fs.existsSync(res.htmlPath), 'index.html must exist');
  assert(fs.existsSync(res.jsonPath), 'health_report.json must exist');

  const html = fs.readFileSync(res.htmlPath, 'utf8');
  assert(html.includes('Workspace Management Console') || html.includes('Workspace Health Monitor'), 'HTML must contain valid console title');
  assert(html.includes('gauge-svg'), 'HTML must contain gauge SVG');
  assert(html.includes(`GRADE ${audit.grade}`), 'HTML must contain accurate grade');
  console.log(' -> OK: HTML/JSON成果物およびDOM整合性確認');

  console.log('\n========================================');
  console.log('✅ ALL TESTS PASSED: 診断エンジン＆ダッシュボード完全適合');
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
