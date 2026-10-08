const { runHarness } = require('./evaluator_instagram_carousel.js');

// 監査対象データ（今回生成したカルーセルVol.01）
const carouselVol01 = {
  title: "大臀筋って鍛えるだけじゃダメなの！？ PT学生が知るべき真逆の作用",
  slides: [
    {
      index: 1,
      role: "hook",
      title: "大臀筋って鍛えるだけじゃダメなの！？",
      content: "作用が真逆！？教科書の丸暗記を卒業する臨床バイオメカニクス。実習で誰もがぶつかる疑問を深掘り。",
      visualSpec: {
        aspectRatio: "1:1",
        palette: { background: "#FBF9F5", accent: "#D96B43" },
        hasVisualIllustration: true
      }
    },
    {
      index: 2,
      role: "mechanism",
      title: "上部と下部で作用が逆！骨頭運動軸のトリック",
      content: "上部線維は外転と外旋、腸脛靭帯（ITB）へ連結し膝安定化。下部線維は内転と伸展で大腿骨粗面に停止。作用を一括りにすると臨床で誤診する。",
      visualSpec: {
        aspectRatio: "1:1",
        palette: { background: "#FBF9F5", accent: "#3B6053" },
        hasVisualIllustration: true
      }
    },
    {
      index: 3,
      role: "clinical",
      title: "歩行中の大臀筋は、縮むのではなく耐えている（IC〜LR）",
      content: "踵接地（IC）から荷重応答（LR）で遠心性収縮により衝撃吸収。トレンデレンブルグ歩行の真因と代償動作。実習・臨床での触診評価ポイント。",
      visualSpec: {
        aspectRatio: "1:1",
        palette: { background: "#FBF9F5", accent: "#D96B43" },
        hasVisualIllustration: true
      }
    },
    {
      index: 4,
      role: "summary",
      title: "実習で差がつく！大臀筋の3大鉄則まとめ",
      content: "上部は外転・ITB、下部は内転。歩行初期は遠心性収縮。骨盤水平安定化に必須。実習で見返すために保存しておこう！",
      visualSpec: {
        aspectRatio: "1:1",
        palette: { background: "#FBF9F5", accent: "#D96B43" },
        hasVisualIllustration: true
      }
    }
  ]
};

// ハーネス監査を実行
const report = runHarness(carouselVol01);
process.exit(report.passed ? 0 : 1);
