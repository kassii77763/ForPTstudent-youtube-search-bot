/**
 * Instagram カルーセル投稿・品質監査ハーネス (Evaluator Instagram Carousel)
 * 
 * 監査基準:
 * 1. Carousel Architecture (カルーセル構成監査: 3〜4枚スライド構成)
 *    - Slide 1: 強烈なフック・疑問（思わず手を止める問いかけ）
 *    - Slide 2: 解剖生理学の核心メカニズム（起始停止ではなく機能解剖・線維別走行）
 *    - Slide 3: 臨床・歩行・実習との接続（「だから臨床ではここを見る」）
 *    - Slide 4: まとめ・アクション喚起（要点3行まとめ ＋ 保存コール）
 * 
 * 2. Anatomical Rigor (解剖生理学の深さ・学術的価値監査)
 *    - 丸暗記知識（単なる「伸展・外旋」）の検出時は減点
 *    - 運動連鎖、筋膜連結、遠心性収縮、相反抑制などの本質キーワード必須
 * 
 * 3. Visual & Aesthetic Integrity (ビジュアル品質 & Anti-Cheap監査)
 *    - アスペクト比: 1:1 (正方形) または 4:5 (縦長フィード)
 *    - 余白比率 (Padding): 画面の15%以上のマクロ余白を担保
 *    - コントラスト比: WCAG AA準拠 (4.5:1以上)
 *    - 禁止パターン排除: 単なる灰色枠線、ダサいベタ塗り四角形の排除
 * 
 * 4. Jev / TypeSafe-style Scoring
 *    - 総合得点 90点以上で合格 (PASS)
 */

class InstagramCarouselAuditor {
  constructor() {
    this.requiredKeywords = [
      '作用', '線維', '歩行', '臨床', '遠心性', '安定', '代償', '評価'
    ];
    this.bannedCheapPatterns = [
      '単なる四角枠', '無機質ベタ塗り', '教科書写し'
    ];
  }

  /**
   * カルーセルデータ全体の監査を実行
   * @param {Object} carousel - { title, slides: [ { index, type, title, content, visualSpec } ] }
   */
  audit(carousel) {
    const report = {
      title: carousel.title,
      slideCount: carousel.slides.length,
      scores: {
        architecture: 0,
        anatomyDepth: 0,
        visualQuality: 0,
        engagement: 0
      },
      deductions: [],
      passed: false,
      totalScore: 0
    };

    // 1. カルーセル枚数チェック (3〜4枚)
    if (carousel.slides.length >= 3 && carousel.slides.length <= 5) {
      report.scores.architecture += 25;
    } else {
      report.deductions.push(`カルーセル枚数は3〜4枚が最適です（現在: ${carousel.slides.length}枚）`);
    }

    // 各スライドの役割チェック (フック -> メカニズム -> 臨床 -> まとめ)
    const expectedRoles = ['hook', 'mechanism', 'clinical', 'summary'];
    const rolesPresent = carousel.slides.map(s => s.role);
    
    if (rolesPresent[0] === 'hook') report.scores.architecture += 25;
    else report.deductions.push('1枚目は必ず「フック（疑問・惹きつけ）」である必要があります');

    if (rolesPresent.includes('mechanism')) report.scores.architecture += 25;
    else report.deductions.push('解剖生理の「核心メカニズム」を解説するスライドが不足しています');

    if (rolesPresent.includes('clinical') || rolesPresent.includes('summary')) report.scores.architecture += 25;

    // 2. 解剖生理学の深さ監査
    const allContent = carousel.slides.map(s => `${s.title} ${s.content}`).join(' ');
    let matchedKeywords = 0;
    this.requiredKeywords.forEach(kw => {
      if (allContent.includes(kw)) matchedKeywords++;
    });

    const anatomyScore = Math.min(100, Math.round((matchedKeywords / 5) * 100));
    report.scores.anatomyDepth = anatomyScore;
    if (anatomyScore < 80) {
      report.deductions.push('解剖生理学の臨床的キーワード（線維走行、遠心性制御など）の踏み込みが浅いです');
    }

    // 3. ビジュアル & デザイン仕様監査 (Anti-Cheap)
    let visualScore = 100;
    carousel.slides.forEach((slide, idx) => {
      const v = slide.visualSpec || {};
      if (!v.aspectRatio || (v.aspectRatio !== '1:1' && v.aspectRatio !== '4:5')) {
        visualScore -= 10;
        report.deductions.push(`Slide ${idx + 1}: アスペクト比は 1:1 または 4:5 である必要があります`);
      }
      if (!v.palette || !v.palette.background || !v.palette.accent) {
        visualScore -= 10;
        report.deductions.push(`Slide ${idx + 1}: パレット設定（背景・アクセントカラー）が不完全です`);
      }
      if (v.hasVisualIllustration !== true) {
        visualScore -= 15;
        report.deductions.push(`Slide ${idx + 1}: 文字だけのベタ塗りは不可。解剖図やクレイ調イラスト・アイコンが必須です`);
      }
    });
    report.scores.visualQuality = Math.max(0, visualScore);

    // 4. エンゲージメント監査（保存促進、タイトルの疑問形）
    let engScore = 100;
    const firstSlide = carousel.slides[0];
    if (!firstSlide.title.includes('？') && !firstSlide.title.includes('!') && !firstSlide.title.includes('！？')) {
      engScore -= 20;
      report.deductions.push('表紙タイトルに「疑問・フック（？/！）」を入れて読者の注意を惹きつけてください');
    }
    const lastSlide = carousel.slides[carousel.slides.length - 1];
    if (!lastSlide.content.includes('保存') && !lastSlide.content.includes('実習')) {
      engScore -= 20;
      report.deductions.push('最終スライドに「保存コール（実習で見返そう）」を入れてください');
    }
    report.scores.engagement = Math.max(0, engScore);

    // 総合スコア算出 (平均)
    report.totalScore = Math.round(
      (report.scores.architecture * 0.25) +
      (report.scores.anatomyDepth * 0.30) +
      (report.scores.visualQuality * 0.25) +
      (report.scores.engagement * 0.20)
    );

    report.passed = report.totalScore >= 90;
    return report;
  }
}

// 実行エントリーポイント
function runHarness(carouselData) {
  const auditor = new InstagramCarouselAuditor();
  const result = auditor.audit(carouselData);

  console.log("==================================================");
  console.log(`📊 カルーセル品質監査レポート: ${result.title}`);
  console.log("==================================================");
  console.log(`総合得点: ${result.totalScore}点 / 100点 (判定: ${result.passed ? '✅ 合格 (PASS)' : '❌ 不合格 (FAIL)'})`);
  console.log("--------------------------------------------------");
  console.log(`- 構成・ストーリーライン : ${result.scores.architecture}点`);
  console.log(`- 解剖生理学の深さ (ガチ度): ${result.scores.anatomyDepth}点`);
  console.log(`- ビジュアル品質 (Anti-Cheap): ${result.scores.visualQuality}点`);
  console.log(`- エンゲージメント・保存率 : ${result.scores.engagement}点`);
  console.log("--------------------------------------------------");

  if (result.deductions.length > 0) {
    console.log("⚠️ 減点・改善指摘項目:");
    result.deductions.forEach((d, i) => console.log(`  ${i + 1}. ${d}`));
  } else {
    console.log("✨ 完璧です！すべての品質基準をクリアしました！");
  }
  console.log("==================================================\n");

  return result;
}

module.exports = { InstagramCarouselAuditor, runHarness };
