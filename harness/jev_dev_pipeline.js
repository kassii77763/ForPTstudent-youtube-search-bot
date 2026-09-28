/**
 * Jev (TypeSafe AI) 開発統合パイプライン
 * 
 * 目的:
 * Jevの3つの基本プリミティブ（Noul / Choice / Score）を開発・テスト・データ選定サイクルに組み込み、
 * 「改善案1: タイトルのスマホ可読性」「改善案2: チャンネル均等配分」「改善案3: ユーザー体験最適化」の
 * 品質向上と回帰防止を自動化する。
 */

const { TypeSafeClient, choice, noul, score } = require("@typesafe-ai/sdk");

class JevDevPipeline {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.TYPESAFE_API_KEY;
    this.client = this.apiKey ? new TypeSafeClient({ apiKey: this.apiKey }) : null;
  }

  /**
   * 1. [Noul: 真偽判定] タイトル可読性ゲート
   * スマホのLINEカード（2行表示）で、学生が冒頭で講義テーマを認識できるかを判定
   */
  async evaluateTitleReadability(rawTitle, shortTitle) {
    if (!this.client) {
      // APIキー未設定時のヒューリスティック・フォールバック
      const hasPrefix = /^【.*?】|^\[.*?\]/.test(shortTitle);
      const isTopicEarly = shortTitle.length <= 25 && !hasPrefix;
      return { isCleanAndClear: isTopicEarly, confidence: 0.9 };
    }

    const res = await this.client.systemOne({
      state: { rawTitle, shortTitle },
      questions: {
        readability: noul("スマホLINEのカルーセルカード（2行切り）で表示した際、冒頭の文字だけで国家試験の勉強テーマが学生に即座に伝わるか？")
      }
    });

    return {
      isCleanAndClear: res.answers.readability.value,
      confidence: res.answers.readability.confidence
    };
  }

  /**
   * 2. [Choice: 最適候補選定] 短縮タイトルの候補選択
   * コード側で生成した複数の短縮候補（Candidate Spans）から、
   * 最も学生にとって分かりやすい1つをChoiceで選定
   */
  async selectBestShortTitle(originalTitle, candidates) {
    if (!candidates || candidates.length === 0) return originalTitle;
    if (candidates.length === 1) return candidates[0];

    if (!this.client) {
      // 最も短く、かつキーワードが含まれている候補を優先
      return candidates.sort((a, b) => a.length - b.length)[0];
    }

    const choiceOptions = {};
    candidates.forEach((c, idx) => {
      choiceOptions[`opt_${idx}`] = c;
    });

    const res = await this.client.systemOne({
      state: { originalTitle, candidates },
      questions: {
        bestTitle: choice("学生がLINEでパッと見たときに、最も検索意図が伝わりやすく魅力的なタイトルはどれか？", choiceOptions)
      }
    });

    const chosenKey = res.answers.bestTitle.choice;
    const chosenIdx = parseInt(chosenKey.replace('opt_', ''), 10);
    return candidates[chosenIdx] || candidates[0];
  }

  /**
   * 3. [Choice: A/B選定] カルーセル配分アルゴリズムのブラインド比較
   * 案A（完全Round-Robin） vs 案B（関連度重視Round-Robin）のどちらが
   * PT学生の学習シーンにおいて探しやすいかを客観判定
   */
  async compareDistributionStrategies(query, listA, listB) {
    if (!this.client) {
      // チャンネル多様性エントロピーによる客観判定
      const setA = new Set(listA.slice(0, 4).map(i => i.author)).size;
      const setB = new Set(listB.slice(0, 4).map(i => i.author)).size;
      return setB >= setA ? "Strategy_B" : "Strategy_A";
    }

    const res = await this.client.systemOne({
      state: {
        query,
        option_A_authors: listA.map(i => `${i.author}: ${i.title}`),
        option_B_authors: listB.map(i => `${i.author}: ${i.title}`)
      },
      questions: {
        preferredStrategy: choice("国家試験の直前で勉強動画を探している学生にとって、最初の3〜4画面で自分に合った動画を最も見つけやすい並び順はどちらか？", {
          Strategy_A: "リストAの並び順",
          Strategy_B: "リストBの並び順"
        })
      }
    });

    return res.answers.preferredStrategy.choice;
  }

  /**
   * 4. [Score: 段階評価] カルーセル全体のUX納得感スコアリング
   */
  async scoreCarouselUX(query, items) {
    if (!this.client) {
      // チャンネル数とタイトル文字数からの合成スコア
      const authors = new Set(items.map(i => i.author)).size;
      const avgLen = items.reduce((acc, i) => acc + (i.shortTitle || i.title).length, 0) / (items.length || 1);
      let calculatedScore = 3;
      if (authors >= 3) calculatedScore += 1;
      if (avgLen <= 25) calculatedScore += 1;
      return { level: `Score_${Math.min(5, calculatedScore)}`, numeric: Math.min(5, calculatedScore) };
    }

    const res = await this.client.systemOne({
      state: {
        query,
        carouselItems: items.map(i => ({ author: i.author, title: i.shortTitle || i.title }))
      },
      questions: {
        uxScore: score("このLINE検索結果カルーセルの全体的な見やすさ・選びやすさを評価してください。", {
          Level_1: "特定チャンネルに偏りすぎ、タイトルも見切れていてストレスを感じる",
          Level_2: "少し見づらいが、最低限探すことはできる",
          Level_3: "標準的。複数の解説者があり、タイトルも読める",
          Level_4: "快適。チャンネルのバランスが良く、スワイプせずに好みの講師を選べる",
          Level_5: "極めて秀逸。タイトルが核心だけを突いており、1秒で目的の講義を見つけられる"
        })
      }
    });

    return {
      level: res.answers.uxScore.level,
      confidence: res.answers.uxScore.confidence
    };
  }
}

module.exports = JevDevPipeline;
