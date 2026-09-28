/**
 * Jev (TypeSafe AI) 開発サイクル実証テスト
 * 
 * 目的:
 * Jevの3つの基本プリミティブ（Noul / Choice / Score）が
 * 改善案1〜3の開発サイクルにおいて実際にどう駆動するかを実証実行する。
 */

const JevDevPipeline = require('./jev_dev_pipeline');

async function testJevCycle() {
  console.log("==================================================================");
  console.log("⚡ Jev (TypeSafe AI) 開発統合パイプライン 実証テスト");
  console.log("   検証対象: Noul (Yes/No), Choice (最適選択/AB比較), Score (UX採点)");
  console.log("==================================================================\n");

  const pipeline = new JevDevPipeline();

  // 1. [Noul: 可読性ゲート]
  console.log("▶ [Test 1: Noul] タイトル可読性ゲートの検証...");
  const rawTitle = "【解剖生理学（呼吸器系）】酸塩基平衡②実践編：リメイクver.";
  const cleanTitle = "酸塩基平衡②実践編";
  const readability1 = await pipeline.evaluateTitleReadability(rawTitle, rawTitle);
  const readability2 = await pipeline.evaluateTitleReadability(rawTitle, cleanTitle);
  console.log(`   ・トリム前タイトル: "${rawTitle}" ➔ 合格判定: ${readability1.isCleanAndClear}`);
  console.log(`   ・トリム後タイトル: "${cleanTitle}" ➔ 合格判定: ${readability2.isCleanAndClear}`);

  // 2. [Choice: 最適候補の選定]
  console.log("\n▶ [Test 2: Choice] タイトル短縮候補からの最適選択（Select instead of generate）...");
  const original = "【解剖生理学】アシドーシスとアルカローシスの病態まとめ";
  const candidates = [
    "アシドーシスとアルカローシス",
    "アシドーシスとアルカローシスの病態まとめ",
    "解剖生理学 アシドーシス"
  ];
  const bestTitle = await pipeline.selectBestShortTitle(original, candidates);
  console.log(`   ・元のタイトル: "${original}"`);
  console.log(`   ・コード側生成候補: ${JSON.stringify(candidates)}`);
  console.log(`   ・Jev Choice選定結果: "👉 ${bestTitle}"`);

  // 3. [Choice: A/B選定] チャンネル配分アルゴリズム比較
  console.log("\n▶ [Test 3: Choice A/B] チャンネル配分戦略のブラインド比較（PT学生ペルソナ）...");
  const strategyA = [
    { author: 'ゴロー先生', title: '心臓の構造と機能' },
    { author: 'ゴロー先生', title: '刺激伝導系' },
    { author: 'ゴロー先生', title: '心周期と弁' },
    { author: 'ゴロー先生', title: '心電図の基礎' }
  ];
  const strategyB = [
    { author: 'ゴロー先生', title: '心臓の構造と機能' },
    { author: '西島ゼミ', title: '心電図波形の判別ポイント' },
    { author: 'かずひろ先生', title: '循環器系 心臓の解剖' },
    { author: 'ネコかん', title: '心音と心周期まとめ' }
  ];
  const winner = await pipeline.compareDistributionStrategies("心臓", strategyA, strategyB);
  console.log(`   ・Strategy A (偏重配分): ${strategyA.map(i => i.author).join(', ')}`);
  console.log(`   ・Strategy B (交互配分): ${strategyB.map(i => i.author).join(', ')}`);
  console.log(`   ・Jev Choice勝利判定: 🏆 ${winner}`);

  // 4. [Score: UX納得感]
  console.log("\n▶ [Test 4: Score] 改善後カルーセルの全体UXスコアリング...");
  const uxScoreResult = await pipeline.scoreCarouselUX("心臓", strategyB);
  console.log(`   ・評価レベル: ${uxScoreResult.level}`);
  console.log(`   ・信頼度/スコア値: ${JSON.stringify(uxScoreResult)}`);

  console.log("\n==================================================================");
  console.log("✅ Jev開発パイプラインの全プリミティブ（Noul, Choice, Score）連携完了！");
  console.log("==================================================================");
}

if (require.main === module) {
  testJevCycle();
}
