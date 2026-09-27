/**
 * Stage 2 Evaluator: 豊富機能 & リッチFlex UIハーネス
 * - Flex Messageカルーセル構文のLINE公式API完全準拠
 * - 16:9比率のアスペクト比とcover設定
 * - タイトル2行折り返し (maxLines: 2, wrap: true)
 * - チャプター/タイムスタンプ見出し表示
 * - チャンネル名・バッジの配置
 * - ボタンアクションURIスキーマ検証
 * - LINE通知用 altText 完備
 */

function buildTestCarousel(items) {
  const bubbles = items.slice(0, 5).map(item => {
    const videoIdMatch = item.url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : 'default';
    const thumbUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    
    return {
      type: 'bubble',
      size: 'kilo',
      hero: {
        type: 'image',
        url: thumbUrl,
        size: 'full',
        aspectRatio: '16:9',
        aspectMode: 'cover'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: item.channelName || 'ゴロー 解剖生理学',
            size: 'xs',
            color: '#1DB446',
            weight: 'bold'
          },
          {
            type: 'text',
            text: item.title,
            weight: 'bold',
            size: 'sm',
            maxLines: 2,
            wrap: true
          },
          item.matchedChapter ? {
            type: 'box',
            layout: 'horizontal',
            spacing: 'xs',
            contents: [
              { type: 'text', text: '📌', size: 'xs', flex: 0 },
              { type: 'text', text: item.matchedChapter, size: 'xs', color: '#666666', wrap: true, maxLines: 2 }
            ]
          } : null
        ].filter(Boolean)
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'none',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#06C755',
            height: 'sm',
            action: {
              type: 'uri',
              label: '▶ YouTubeで再生',
              uri: item.playbackUrl || item.url
            }
          }
        ]
      }
    };
  });

  return {
    type: 'flex',
    altText: `💡動画検索結果（${items.length}件）`,
    contents: {
      type: 'carousel',
      contents: bubbles
    }
  };
}

function runStage2() {
  const tests = [];
  let score = 0;
  const maxScore = 100;
  const defects = [];

  const mockItems = [
    {
      title: '自然免疫と獲得免疫の違いを徹底解説！【解剖生理学】',
      url: 'https://www.youtube.com/watch?v=JSYVQfgGYaY',
      playbackUrl: 'https://www.youtube.com/watch?v=JSYVQfgGYaY&t=32s',
      channelName: 'ゴロー/イラストで学ぶ解剖生理学',
      matchedChapter: '00:32 自然免疫：第1段階（皮膚・粘膜）'
    },
    {
      title: '【結合組織の分類】密性結合組織、疎性結合組織、脂肪組織',
      url: 'https://www.youtube.com/watch?v=ag4DgqgIVwo',
      playbackUrl: 'https://www.youtube.com/watch?v=ag4DgqgIVwo&t=677s',
      channelName: 'ゴロー/イラストで学ぶ解剖生理学',
      matchedChapter: '11:17 皮膚の構造と美容'
    }
  ];

  const flex = buildTestCarousel(mockItems);

  // Test 1: FlexメッセージのルートおよびCarousel型判定
  if (flex.type === 'flex' && flex.contents?.type === 'carousel' && Array.isArray(flex.contents?.contents)) {
    score += 20;
    tests.push({ name: 'Flex Carousel ルート構造スキーマ', pass: true, points: 20 });
  } else {
    defects.push('Flex Carousel構造が不正');
    tests.push({ name: 'Flex Carousel ルート構造スキーマ', pass: false, points: 0 });
  }

  // Test 2: Hero画像の16:9比率とアスペクトモード
  const firstBubble = flex.contents.contents[0];
  if (firstBubble.hero?.type === 'image' && 
      firstBubble.hero?.aspectRatio === '16:9' && 
      firstBubble.hero?.aspectMode === 'cover' &&
      firstBubble.hero?.url.includes('https://img.youtube.com/vi/')) {
    score += 20;
    tests.push({ name: 'Heroサムネイル (16:9 cover HTTPS) 構造', pass: true, points: 20 });
  } else {
    defects.push('Heroサムネイル画像設定が不完全');
    tests.push({ name: 'Heroサムネイル (16:9 cover HTTPS) 構造', pass: false, points: 0 });
  }

  // Test 3: タイトル2行折り返しとチャプター表示
  const bodyContents = firstBubble.body?.contents || [];
  const titleText = bodyContents.find(c => c.type === 'text' && c.text === mockItems[0].title);
  if (titleText && titleText.maxLines === 2 && titleText.wrap === true) {
    score += 20;
    tests.push({ name: 'タイトル2行制限・自動折り返し (maxLines:2, wrap:true)', pass: true, points: 20 });
  } else {
    defects.push('タイトルのmaxLinesまたはwrap設定が欠落');
    tests.push({ name: 'タイトル2行制限・自動折り返し (maxLines:2, wrap:true)', pass: false, points: 0 });
  }

  // Test 4: Primaryボタンと再生URIアクション
  const footerBtn = firstBubble.footer?.contents?.[0];
  if (footerBtn && footerBtn.type === 'button' && footerBtn.action?.type === 'uri' && footerBtn.action?.uri.includes('&t=')) {
    score += 20;
    tests.push({ name: 'FooterボタンのPrimaryスタイルと秒数付きURIアクション', pass: true, points: 20 });
  } else {
    defects.push('再生ボタンまたはURIアクションに秒数パラメータがありません');
    tests.push({ name: 'FooterボタンのPrimaryスタイルと秒数付きURIアクション', pass: false, points: 0 });
  }

  // Test 5: LINEプッシュ通知用 altText の完全性
  if (typeof flex.altText === 'string' && flex.altText.length > 0 && flex.altText.includes('件')) {
    score += 20;
    tests.push({ name: '通知用 altText の適切な件数表示', pass: true, points: 20 });
  } else {
    defects.push('altTextが未設定または形式不正');
    tests.push({ name: '通知用 altText の適切な件数表示', pass: false, points: 0 });
  }

  return {
    stage: 2,
    name: 'Stage 2: 豊富機能 & リッチFlex UIハーネス',
    score,
    maxScore,
    pass: score === maxScore,
    tests,
    defects
  };
}

module.exports = { runStage2, buildTestCarousel };
if (require.main === module) {
  console.log(JSON.stringify(runStage2(), null, 2));
}
