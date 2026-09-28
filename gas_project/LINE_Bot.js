// ==========================================
// 解剖生理学 動画検索LINE Bot (鰐部ゼミナール追加 & ログ列修復版)
// ・鰐部ゼミナール（@wanizemi）を正式ラインナップに追加
// ・スプレッドシートログの列ズレ自動修復（ヘッダーにユーザー名を追加）
// ・上品な二次ボタン（ベタ塗り廃止） & チャンネル別カラーバッジ
// ・LINE公式ローディングアニメーション & ユーザー名記録
// ==========================================

function doGet(e) {
  if (e && e.parameter && e.parameter.setYoutubeKey) {
    PropertiesService.getScriptProperties().setProperty('YOUTUBE_API_KEY', e.parameter.setYoutubeKey);
    return ContentService.createTextOutput("✅ YOUTUBE_API_KEY をスクリプトプロパティに設定しました: " + e.parameter.setYoutubeKey.slice(0, 8) + "...");
  }
  if (e && e.parameter && e.parameter.setTypesafeKey) {
    PropertiesService.getScriptProperties().setProperty('TYPESAFE_API_KEY', e.parameter.setTypesafeKey);
    return ContentService.createTextOutput("✅ TYPESAFE_API_KEY をスクリプトプロパティに設定しました: " + e.parameter.setTypesafeKey.slice(0, 8) + "...");
  }
  if (e && e.parameter && e.parameter.action === 'audit') {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const totalRows = data.length;
    
    // 各チャンネルごとの件数を集計
    const channelCounts = {};
    let activeCount = 0;
    let inactiveCount = 0;
    for (let i = 1; i < data.length; i++) {
      const ch = String(data[i][5] || '（空欄:ゴロー先生）').trim();
      channelCounts[ch] = (channelCounts[ch] || 0) + 1;
      const status = String(data[i][6] || 'ON').trim().toUpperCase();
      if (status === 'OFF') inactiveCount++;
      else activeCount++;
    }
    
    // 直近3行のサンプル
    const recentRows = data.slice(Math.max(1, data.length - 3)).map(r => ({
      title: r[0],
      url: r[1],
      channel: r[5],
      status: r[6] || 'ON'
    }));

    return ContentService.createTextOutput(JSON.stringify({
      totalRows: totalRows,
      headers: headers,
      channelCounts: channelCounts,
      activeCount: activeCount,
      inactiveCount: inactiveCount,
      recentRows: recentRows
    }, null, 2)).setMimeType(ContentService.MimeType.JSON);
  }

  if (e && e.parameter && e.parameter.action === 'testSearch') {
    const q = e.parameter.q || '';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    
    let matches = executeSearch(data, q);
    let jevTerm = null;
    if (matches.length === 0) {
      try {
        jevTerm = queryWithJev(q);
        if (jevTerm && jevTerm !== q) {
          matches = executeSearch(data, jevTerm);
        }
      } catch (err) {
        // ignore
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      query: q,
      jevTerm: jevTerm,
      matchCount: matches.length,
      sampleHits: matches.slice(0, 5)
    }, null, 2)).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput("LINE Bot Webhook Endpoint is Running.");
}

function doPost(e) {
  if (!e || !e.postData) return ContentService.createTextOutput("OK");
  
  let json;
  try {
    json = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput("OK");
  }

  // 外部からの動画一括流し込みAPI
  if (json.action === 'batchImportVideos' && Array.isArray(json.videos)) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheets()[0];
    const existingUrls = new Set();
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const urlData = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
      urlData.forEach(r => { if (r[0]) existingUrls.add(String(r[0]).trim()); });
    }

    const rowsToAdd = [];
    json.videos.forEach(v => {
      const url = String(v.url || '').trim();
      if (url && !existingUrls.has(url)) {
        existingUrls.add(url);
        rowsToAdd.push([
          String(v.title || '').trim(),
          url,
          String(v.category || '解剖運動学').trim(),
          String(v.timestamps || '').trim(),
          "",
          String(v.channel || '').trim()
        ]);
      }
    });

    if (rowsToAdd.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAdd.length, 6).setValues(rowsToAdd);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      added: rowsToAdd.length,
      newTotalRows: sheet.getLastRow()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 特定チャンネルの動画一括クリーンアップAPI
  if (json.action === 'deleteChannelVideos' && json.channel) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    let deletedCount = 0;
    
    // 下から逆順に削除
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][5] || '').trim() === json.channel.trim()) {
        sheet.deleteRow(i + 1);
        deletedCount++;
      }
    }
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      deleted: deletedCount,
      newTotalRows: sheet.getLastRow()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // G列の初期化 ＆ 過去問・メンバー限定動画の自動OFFフラグ付けAPI
  if (json.action === 'classifyAndFilterVideos') {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    
    // G1ヘッダー確認
    sheet.getRange(1, 7).setValue("検索対象");
    
    let offCount = 0;
    let onCount = 0;
    const updates = [];

    // 過去問・メンバー限定判定正規表現
    const offPatterns = [
      /第\s*\d+\s*回/i,
      /午後問/i,
      /午前問/i,
      /問\s*\d+/i,
      /過去問/i,
      /直前対策/i,
      /合格速報/i,
      /解答速報/i,
      /模試/i,
      /メンバー限定/i,
      /メンバーシップ/i,
      /会員限定/i,
      /限定公開/i
    ];

    for (let i = 1; i < data.length; i++) {
      const title = String(data[i][0] || '');
      const isOff = offPatterns.some(p => p.test(title));
      
      if (isOff) {
        updates.push(['OFF']);
        offCount++;
      } else {
        updates.push(['ON']);
        onCount++;
      }
    }

    if (updates.length > 0) {
      sheet.getRange(2, 7, updates.length, 1).setValues(updates);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      totalChecked: updates.length,
      activeOnCount: onCount,
      excludedOffCount: offCount
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const events = json.events;
  if (!events || events.length === 0) return ContentService.createTextOutput("OK");

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const userId = (event.source && event.source.userId) ? event.source.userId : 'unknown';
    const replyToken = event.replyToken;

    // 1. Postbackイベント（設定切り替えボタンタップ時）
    if (event.type === 'postback' && event.postback && event.postback.data) {
      handlePostback(replyToken, userId, event.postback.data);
      continue;
    }

    // 2. メッセージ受信時
    if (event.type === 'message' && event.message.type === 'text') {
      const userText = event.message.text.trim();

      // 「設定」「マイ設定」「チャンネル設定」と打たれたら設定メニューを表示
      if (['設定', 'マイ設定', '優先設定', 'チャンネル設定', '設定変更'].includes(userText)) {
        sendSettingsMenu(replyToken, userId);
        continue;
      }

      // 「使い方」「ヘルプ」
      if (['使い方', 'ヘルプ', '検索のコツ', 'ガイド'].includes(userText)) {
        sendHelpGuide(replyToken);
        continue;
      }

      // 「リセット」「全表示に戻す」
      if (['リセット', '全表示に戻す', '初期化'].includes(userText)) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        setUserPreferenceList(ss, userId, []);
        replyTextToLine(replyToken, "✅ 優先設定をリセットしました！\n今後は全チャンネル（すべての解説者＋Web解説）から横断検索します😊");
        continue;
      }
      
      // LINE公式ローディングアニメーションを開始（入力中...）
      startLoadingAnimation(userId);
      
      // LINE表示名を取得
      const userName = getUserDisplayName(userId);
      
      try {
        handleSearch(replyToken, userText, userId, userName);
      } catch (err) {
        console.error("handleSearch致命的エラー:", err);
        replyTextToLine(replyToken, "申し訳ありません。検索中に一時的なエラーが発生しました。別の言葉で試してみてください。");
      }
    }
  }
  return ContentService.createTextOutput("OK");
}

// ユーザー優先チャンネルの取得（スプレッドシート管理・カンマ区切り複数対応）
function getUserPreference(ss, userId) {
  if (!userId || userId === 'unknown') return [];
  try {
    let prefSheet = ss.getSheetByName('ユーザー設定');
    if (!prefSheet) {
      prefSheet = ss.insertSheet('ユーザー設定');
      prefSheet.appendRow(['ユーザーID', '優先チャンネル', '更新日時']);
      return [];
    }
    const data = prefSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(userId).trim()) {
        const val = String(data[i][1]).trim();
        if (!val || val === 'ALL') return [];
        return val.split(',').map(s => s.trim()).filter(s => s.length > 0);
      }
    }
  } catch (e) {
    console.error("設定取得エラー:", e);
  }
  return [];
}

// ユーザー優先チャンネルの更新（配列保存）
function setUserPreferenceList(ss, userId, channelList) {
  try {
    let prefSheet = ss.getSheetByName('ユーザー設定');
    if (!prefSheet) {
      prefSheet = ss.insertSheet('ユーザー設定');
      prefSheet.appendRow(['ユーザーID', '優先チャンネル', '更新日時']);
    }
    const val = channelList.length === 0 ? 'ALL' : channelList.join(',');
    const data = prefSheet.getDataRange().getValues();
    let foundRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(userId).trim()) {
        foundRow = i + 1;
        break;
      }
    }
    if (foundRow > 0) {
      prefSheet.getRange(foundRow, 2, 1, 2).setValues([[val, new Date()]]);
    } else {
      prefSheet.appendRow([userId, val, new Date()]);
    }
  } catch (e) {
    console.error("設定保存エラー:", e);
  }
}

// 設定変更メニュー（Flex Message：トグル式複数選択）の送信
function sendSettingsMenu(replyToken, userId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const selectedList = getUserPreference(ss, userId); // 例: ['ゴロー先生', '西島ゼミ']、空なら全選択
  const flex = buildSettingsFlex(selectedList);
  sendLineReply(replyToken, [flex]);
}

// Postback処理（複数選択トグル）
function handlePostback(replyToken, userId, dataString) {
  const params = {};
  dataString.split('&').forEach(pair => {
    const parts = pair.split('=');
    if (parts.length === 2) params[parts[0]] = decodeURIComponent(parts[1]);
  });

  if (params.action === 'toggleChannel') {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let selectedList = getUserPreference(ss, userId);
    const target = params.value;

    if (target === 'ALL') {
      // 全選択にリセット
      setUserPreferenceList(ss, userId, []);
      replyTextToLine(replyToken, "✅ すべての解説者（全チャンネル＋Web）を表示するように設定しました！😊");
      return;
    }

    // もしこれまで全選択だった場合、対象以外を全員ONにするのではなく、対象のみONにするかトグルするか
    if (selectedList.length === 0) {
      // 「全選択」状態から1人をタップしたら、その人だけONにする直感的仕様
      selectedList = [target];
    } else {
      // すでに個別選択中の場合：トグル（あれば外す、なければ加える）
      if (selectedList.includes(target)) {
        selectedList = selectedList.filter(c => c !== target);
      } else {
        selectedList.push(target);
      }
    }

    setUserPreferenceList(ss, userId, selectedList);

    // 更新後の設定メニューを再表示（続けて何人もタップできるようにする）
    const updatedFlex = buildSettingsFlex(selectedList);
    const summaryText = selectedList.length === 0 
      ? "✅ すべての選択を解除したため、「全チャンネル表示」にリセットしました！🌟"
      : `✅ 現在の優先対象:【${selectedList.join('、')}】\n続けて他の解説者をタップして追加・除外できます👇`;

    sendLineReply(replyToken, [
      { type: 'text', text: summaryText },
      updatedFlex
    ]);
  }
}

// 設定メニューのFlexオブジェクト生成（共通関数）
function buildSettingsFlex(selectedList) {
  const allChannels = [
    { name: 'ゴロー先生', label: '👨‍🏫 ゴロー先生', desc: 'イラスト図解・解剖生理学の基礎' },
    { name: '西島ゼミ', label: '🎓 西島ゼミ', desc: 'PT/OT国試過去問・網羅的講義' },
    { name: 'カラダ研究所', label: '🔬 カラダ研究所', desc: '運動器・3Dバイオメカニクス' },
    { name: 'かずひろ先生', label: '📖 かずひろ先生【Web解説】', desc: '徹底的解剖学の体系的テキスト・図解' },
    { name: '鰐部ゼミナール', label: '🐊 鰐部ゼミナール', desc: '国家試験対策の重要ポイント整理' },
    { name: 'ネコかん', label: '🐱 ネコかん', desc: '看護・生理学スライドまとめ' }
  ];

  const isAll = (selectedList.length === 0);

  // 全チャンネル一括ボタン
  const allBtn = {
    type: 'box',
    layout: 'vertical',
    margin: 'sm',
    contents: [
      {
        type: 'button',
        style: isAll ? 'primary' : 'secondary',
        color: isAll ? '#2563eb' : '#f1f5f9',
        height: 'sm',
        action: {
          type: 'postback',
          label: isAll ? '✔ 🌟 全て表示（全員ON）' : '🌟 全て表示（リセット）',
          data: 'action=toggleChannel&value=ALL'
        }
      }
    ]
  };

  // 各チャンネルのトグルボタン
  const channelBoxes = allChannels.map(ch => {
    const isChecked = isAll || selectedList.includes(ch.name);
    return {
      type: 'box',
      layout: 'horizontal',
      spacing: 'sm',
      margin: 'sm',
      paddingAll: 'sm',
      backgroundColor: isChecked ? '#eff6ff' : '#f8fafc',
      cornerRadius: 'md',
      contents: [
        {
          type: 'text',
          text: isChecked ? '✅' : '⬜',
          size: 'md',
          align: 'center',
          gravity: 'center',
          flex: 1
        },
        {
          type: 'box',
          layout: 'vertical',
          flex: 6,
          contents: [
            { type: 'text', text: ch.label, weight: 'bold', size: 'xs', color: isChecked ? '#1e40af' : '#475569' },
            { type: 'text', text: ch.desc, size: 'xxs', color: '#94a3b8' }
          ]
        },
        {
          type: 'button',
          style: isChecked ? 'primary' : 'secondary',
          color: isChecked ? '#3b82f6' : '#e2e8f0',
          height: 'sm',
          flex: 3,
          action: {
            type: 'postback',
            label: isChecked ? 'ON' : 'OFF',
            data: `action=toggleChannel&value=${ch.name}`
          }
        }
      ]
    };
  });

  return {
    type: 'flex',
    altText: '優先解説者の設定（複数選択可能）',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#f8fafc',
        paddingAll: 'md',
        contents: [
          { type: 'text', text: '⚙️ 優先解説者・マイフィルター', weight: 'bold', size: 'md', color: '#1e293b' },
          { type: 'text', text: 'タップで何人でも自由にON/OFFできます👇', size: 'xs', color: '#64748b', margin: 'xs' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'md',
        contents: [allBtn, ...channelBoxes]
      }
    }
  };
}

// 使い方・検索ガイド（Flex Message）
function sendHelpGuide(replyToken) {
  const guideText = [
    "💡【解剖生理・運動学 動画＆Web検索Botの使い方】",
    "",
    "1️⃣ 日常語・口語で検索OK！",
    "「ふともも」「膝伸ばし」「肩が痛い」などの普段の言葉でも、AIが自動で医学用語（大腿四頭筋など）を判定して動画を探します。",
    "",
    "2️⃣ 2語以上の絞り込み（スペース区切り）",
    "「歩行 股関節」「心臓 弁」「脳神経 運動」のようにスペースで区切ると、より絞り込んだ動画やWeb解説が見つかります。",
    "",
    "3️⃣ ピンポイント秒数再生",
    "ゴロー先生などの動画は、探したいトピックの解説秒数から直接YouTube再生できます。",
    "",
    "4️⃣ 優先解説者・マイフィルター",
    "下のメニューの「⚙️ 優先設定」から、ゴロー先生や西島ゼミなど、見たい解説者だけに固定することも可能です！"
  ].join("\n");

  replyTextToLine(replyToken, guideText);
}

function startLoadingAnimation(userId) {
  if (!userId || userId === 'unknown') return;
  const token = PropertiesService.getScriptProperties().getProperty('LINE_ACCESS_TOKEN');
  if (!token) return;
  
  try {
    const url = 'https://api.line.me/v2/bot/chat/loading/start';
    UrlFetchApp.fetch(url, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      payload: JSON.stringify({
        chatId: userId,
        loadingSeconds: 5
      }),
      muteHttpExceptions: true
    });
  } catch (e) {
    console.warn("ローディング表示スキップ:", e);
  }
}

function getUserDisplayName(userId) {
  if (!userId || userId === 'unknown') return 'ゲスト';
  const token = PropertiesService.getScriptProperties().getProperty('LINE_ACCESS_TOKEN');
  if (!token) return 'ゲスト';

  try {
    const url = `https://api.line.me/v2/bot/profile/${userId}`;
    const res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { 'Authorization': 'Bearer ' + token },
      muteHttpExceptions: true
    });
    const json = JSON.parse(res.getContentText());
    return json.displayName || 'ゲスト';
  } catch (e) {
    return 'ゲスト';
  }
}

function handleSearch(replyToken, query, userId, userName) {
  // 1. ノイズ対策
  const isSingleNoise = /^[\u3040-\u309F\u30A0-\u30FFa-zA-Z0-9]$/.test(query);
  if (query.length < 1 || isSingleNoise) {
    replyTextToLine(replyToken, `「${query}」だけでは検索できません。\n2文字以上の専門用語（例：心臓、大腿四頭筋、胃、脳 など）を入力してください😊`);
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const videoSheet = ss.getSheets()[0]; // 1枚目の動画リスト
  const data = videoSheet.getDataRange().getValues();
  
  // 2. 検索実行（ユーザー好みの優先チャンネルを適用）
  const prefChannel = getUserPreference(ss, userId);
  let matches = executeSearch(data, query, prefChannel);
  
  // もし直接ヒットしなかった場合、Jev（TypeSafe AI System One）で意味推論・専門用語判定を実施
  let jevExpandedQuery = null;
  if (matches.length === 0) {
    try {
      jevExpandedQuery = queryWithJev(query);
      if (jevExpandedQuery && jevExpandedQuery !== query) {
        matches = executeSearch(data, jevExpandedQuery, prefChannel);
      }
    } catch (e) {
      console.error("Jev呼び出し例外:", e);
    }
  }
  
  if (matches.length > 0) {
    const logLabel = jevExpandedQuery ? `Jev判定ヒット(${jevExpandedQuery})` : '直接ヒット';
    logSearchActivity(ss, userId, userName, query, matches.length, logLabel);
    
    // カルーセルメッセージの構築
    const flexMessage = buildFlexCarousel(matches.slice(0, 5), jevExpandedQuery || query);
    sendLineReply(replyToken, [flexMessage]);
    return;
  }
  
  // 3. 0件ヒット時：親テーマサジェスト ＆ 検索足跡ログ
  let suggestions = [];
  try {
    suggestions = getOrLearnSuggestions(ss, query, data, userId, userName);
  } catch (err) {
    console.error("サジェスト取得エラー:", err);
  }

  if (suggestions && suggestions.length > 0) {
    const fallbackMsg = buildSmartFallbackMessage(query, suggestions);
    sendLineReply(replyToken, [fallbackMsg]);
  } else {
    logSearchActivity(ss, userId, userName, query, 0, '未ヒット');
    replyTextToLine(replyToken, `「${query}」の解説動画は見つかりませんでした。\n関連する別の単語や上位テーマ（例: 運動連鎖、心臓、歩行 など）で検索してみてください👇`);
  }
}

// 検索ロジック（F列チャンネル名対応 & ユーザー優先設定対応）
function executeSearch(data, query, prefChannels) {
  let targetAuthor = null;
  let cleanQuery = query;
  
  const knownAuthors = ['ゴロー先生', '西島ゼミ', 'カラダ研究所', 'かずひろ先生', 'ネコかん', '鰐部ゼミナール'];
  for (const author of knownAuthors) {
    if (query.includes(author)) {
      targetAuthor = author;
      cleanQuery = query.replace(author, '').trim();
      break;
    }
  }

  // クエリ指定がない場合、ユーザーの複数設定（配列）を適用
  let allowedAuthors = null;
  if (targetAuthor) {
    allowedAuthors = [targetAuthor];
  } else if (prefChannels) {
    if (Array.isArray(prefChannels) && prefChannels.length > 0) {
      allowedAuthors = prefChannels;
    } else if (typeof prefChannels === 'string' && prefChannels !== 'ALL' && prefChannels.length > 0) {
      allowedAuthors = [prefChannels];
    }
  }

  const keywords = cleanQuery.replace(/　/g, ' ').trim().split(/\s+/).filter(k => k.length > 0);
  const results = [];
  
  for (let i = 1; i < data.length; i++) {
    const title = String(data[i][0] || '');
    const url = String(data[i][1] || '');
    const category = String(data[i][2] || '解剖生理学');
    const timestamps = String(data[i][3] || '');
    const tags = String(data[i][4] || '');
    const author = String(data[i][5] || '').trim() || 'ゴロー先生';
    const searchStatus = String(data[i][6] || 'ON').trim().toUpperCase();
    
    if (!url || !url.startsWith('http')) continue;
    if (searchStatus === 'OFF') continue; // 過去問・メンバー限定等を除外
    
    if (allowedAuthors && !allowedAuthors.includes(author)) continue;
    
    const searchTarget = (title + " " + timestamps + " " + tags + " " + category).toLowerCase();
    const isMatch = keywords.every(k => searchTarget.includes(k.toLowerCase()));
    
    if (isMatch) {
      const isWebArticle = url.includes('anatomy.tokyo') || !url.includes('youtube.com');
      let thumbUrl = '';
      let playUrl = url;

      if (isWebArticle) {
        // かずひろ先生のWebサイト用公式解剖学バナー画像 (200 OK実在確認済み)
        thumbUrl = 'https://www.anatomy.tokyo/wp-content/uploads/2025/03/4a82b4381eabc73dff8b878c669db5c6-768x432.png';
      } else {
        const videoId = extractVideoId(url);
        const targetSeconds = findBestTimestamp(timestamps, keywords[0]);
        playUrl = targetSeconds > 0 ? `${url}&t=${targetSeconds}s` : url;
        thumbUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      }
      
      results.push({
        title: title,
        url: playUrl,
        author: author,
        category: category,
        thumbnail: thumbUrl
      });
    }
  }
  return results;
}

function extractVideoId(url) {
  const m = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : '';
}

function findBestTimestamp(timestampsText, keyword) {
  if (!timestampsText || !keyword) return 0;
  const lines = timestampsText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.toLowerCase().includes(keyword.toLowerCase())) {
      const timeMatch = line.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      if (timeMatch) {
        if (timeMatch[3]) {
          return parseInt(timeMatch[1], 10) * 3600 + parseInt(timeMatch[2], 10) * 60 + parseInt(timeMatch[3], 10);
        } else {
          return parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10);
        }
      }
    }
  }
  return 0;
}

// チャンネルごとのテーマカラー・アイコン設定（鰐部ゼミナール & かずひろ先生Web解説対応）
const CHANNEL_STYLES = {
  'ゴロー先生': { color: '#2563eb', label: '👨‍🏫 ゴロー先生' },
  '西島ゼミ': { color: '#059669', label: '🎓 西島ゼミ' },
  'カラダ研究所': { color: '#7c3aed', label: '🔬 カラダ研究所' },
  'かずひろ先生': { color: '#d97706', label: '📖 かずひろ先生【徹底的解剖学】' },
  'かずひろ先生【徹底的解剖学】': { color: '#d97706', label: '📖 かずひろ先生【徹底的解剖学】' },
  'ネコかん': { color: '#db2777', label: '🐱 ネコかん' },
  '鰐部ゼミナール': { color: '#0284c7', label: '🐊 鰐部ゼミナール' }
};

// カルーセルメッセージ生成
function buildFlexCarousel(items, query) {
  const bubbles = items.map(item => {
    const style = CHANNEL_STYLES[item.author] || { color: '#4b5563', label: item.author };
    const isWebArticle = item.url.includes('anatomy.tokyo') || !item.url.includes('youtube.com');
    const actionLabel = isWebArticle ? '解説を読む ↗' : '再生する ▷';
    
    return {
      type: 'bubble',
      size: 'micro',
      header: {
        type: 'box',
        layout: 'horizontal',
        paddingAll: 'xs',
        paddingBottom: 'none',
        contents: [
          {
            type: 'text',
            text: style.label,
            size: 'xxs',
            color: style.color,
            weight: 'bold',
            flex: 1
          }
        ]
      },
      hero: {
        type: 'image',
        url: item.thumbnail,
        size: 'full',
        aspectRatio: '16:9',
        aspectMode: 'cover'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'xs',
        paddingAll: 'sm',
        paddingTop: 'xs',
        contents: [
          {
            type: 'text',
            text: item.title,
            weight: 'bold',
            size: 'xs',
            wrap: true,
            maxLines: 2,
            color: '#1f2937'
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'sm',
        paddingTop: 'none',
        contents: [
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'uri',
              label: actionLabel,
              uri: item.url
            }
          }
        ]
      }
    };
  });

  let baseQuery = query;
  ['ゴロー先生', '西島ゼミ', 'カラダ研究所', 'かずひろ先生', 'ネコかん', '鰐部ゼミナール'].forEach(a => {
    baseQuery = baseQuery.replace(a, '').trim();
  });

  // チャンネル深掘りQuickReplyボタン
  const quickReplyItems = [];
  const allChannels = ['ゴロー先生', '西島ゼミ', 'カラダ研究所', 'かずひろ先生', 'ネコかん', '鰐部ゼミナール'];
  
  allChannels.forEach(author => {
    if (!query.includes(author)) {
      quickReplyItems.push({
        type: 'action',
        action: {
          type: 'message',
          label: `${author}で見る`,
          text: `${baseQuery} ${author}`
        }
      });
    }
  });

  const flexMessage = {
    type: 'flex',
    altText: `「${query}」の検索結果（${items.length}件）`,
    contents: {
      type: 'carousel',
      contents: bubbles
    }
  };

  if (quickReplyItems.length > 0) {
    flexMessage.quickReply = {
      items: quickReplyItems.slice(0, 6)
    };
  }

  return flexMessage;
}

function buildSmartFallbackMessage(query, suggestions) {
  return {
    type: 'text',
    text: `「${query}」の動画は見つかりませんでした。\n関連する以下のテーマから選んでみてください👇`,
    quickReply: {
      items: suggestions.map(word => ({
        type: 'action',
        action: {
          type: 'message',
          label: word.length > 20 ? word.substring(0, 17) + '...' : word,
          text: word
        }
      }))
    }
  };
}

// 検索足跡・分析ログの永続化（ヘッダー自動修復付き）
function logSearchActivity(ss, userId, userName, query, hitCount, note) {
  try {
    let logSheet = ss.getSheetByName('AI学習辞書・検索ログ');
    if (!logSheet) {
      logSheet = ss.insertSheet('AI学習辞書・検索ログ');
    }
    
    // ヘッダーが6列でない場合、自動で正しいヘッダーに修復
    const headerRange = logSheet.getRange(1, 1, 1, 6);
    const currentHeaders = headerRange.getValues()[0];
    if (currentHeaders[1] !== 'ユーザー名') {
      logSheet.getRange(1, 1, 1, 6).setValues([['日時', 'ユーザー名', 'ユーザーID', '検索ワード', 'ヒット数', 'サジェスト/メモ']]);
    }
    
    logSheet.appendRow([new Date(), userName, userId, query, hitCount, note]);
  } catch (e) {
    console.error("ログ記録失敗:", e);
  }
}

const INSTANT_PARENT_THEMES = {
  '線条体': ['大脳基底核', '錐体外路'],
  '尾状核': ['大脳基底核'],
  '被殻': ['大脳基底核'],
  '猫背': ['脊柱', '骨盤'],
  '後弯': ['脊柱'],
  '脊柱後弯': ['脊柱'],
  '熱': ['体温調節', '発熱'],
  'ねつ': ['体温調節', '発熱'],
  '太もも': ['大腿四頭筋', '下肢'],
  'ふともも': ['大腿四頭筋', '下肢'],
  '頭痛': ['脳神経', '自律神経'],
  '仙腸関節': ['骨盤', '脊柱'],
  'ckc': ['関節', '下肢', '骨格系'],
  'okc': ['関節', '上肢', '骨格系'],
  'バイオメカニクス': ['関節', '下肢', '骨格系'],
  '運動連鎖': ['関節', '下肢', '骨格系']
};

function getOrLearnSuggestions(ss, query, data, userId, userName) {
  const normQuery = query.toLowerCase().trim();
  
  if (INSTANT_PARENT_THEMES[query] || INSTANT_PARENT_THEMES[normQuery]) {
    const list = INSTANT_PARENT_THEMES[query] || INSTANT_PARENT_THEMES[normQuery];
    logSearchActivity(ss, userId, userName, query, 0, '即答サジェスト: ' + list.join(', '));
    return list;
  }

  let dictSheet = ss.getSheetByName('AI学習辞書・検索ログ');
  if (dictSheet) {
    const dictData = dictSheet.getDataRange().getValues();
    for (let i = 1; i < dictData.length; i++) {
      if (String(dictData[i][3]).trim().toLowerCase() === normQuery && String(dictData[i][5]).startsWith('AI提案:')) {
        const saved = String(dictData[i][5]).replace('AI提案:', '').trim().split(',').map(s => s.trim());
        logSearchActivity(ss, userId, userName, query, 0, 'キャッシュサジェスト: ' + saved.join(', '));
        return saved;
      }
    }
  }
  
  const geminiApiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!geminiApiKey) return [];
  
  const prompt = `あなたは医療系国家試験（解剖学・生理学・運動学）の指導講師です。
学生が「${query}」と検索しましたが、動画がありませんでした。
この単語が所属する【1段階上の親器官・親組織・標準的解剖生理学テーマ単語（動画タイトルになりやすい単位）】を推論し、2〜3個厳選してカンマ区切りで答えてください。
同階層の細かい部位ではなく、必ず1段階上位の包括テーマ（例: バイオメカニクス→関節, 下肢 / 運動連鎖→関節 / 線条体→大脳基底核）を挙げてください。挨拶や解説は不要です。`;

  const models = ['models/gemini-3.8-flash', 'models/gemini-3.1-flash-lite'];
  
  for (let m = 0; m < models.length; m++) {
    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/${models[m]}:generateContent?key=${geminiApiKey}`;
      const res = UrlFetchApp.fetch(apiUrl, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        muteHttpExceptions: true
      });
      
      const json = JSON.parse(res.getContentText());
      if (json.candidates && json.candidates.length > 0) {
        const text = json.candidates[0].content.parts[0].text.trim();
        const terms = text.split(/[,、\n]/)
                          .map(t => t.trim().replace(/^[-*・\d.]+\s*/, ''))
                          .filter(t => t.length > 0)
                          .slice(0, 3);
        
        if (terms.length > 0) {
          logSearchActivity(ss, userId, userName, query, 0, 'AI提案: ' + terms.join(', '));
          return terms;
        }
      }
    } catch (e) {
      console.error(`${models[m]} 呼び出しエラー:`, e);
    }
  }
  return [];
}

function sendLineReply(replyToken, messages) {
  const token = PropertiesService.getScriptProperties().getProperty('LINE_ACCESS_TOKEN');
  if (!token) return;
  const url = 'https://api.line.me/v2/bot/message/reply';
  UrlFetchApp.fetch(url, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    payload: JSON.stringify({
      replyToken: replyToken,
      messages: messages
    }),
    muteHttpExceptions: true
  });
}

function replyTextToLine(replyToken, text) {
  sendLineReply(replyToken, [{ type: 'text', text: text }]);
}

// ==========================================
// TypeSafe AI (System One: Jev) 連携モジュール
// 学生の自然言語の検索語から、解剖生理学の正確な医学用語を判定・推論
// ==========================================
function queryWithJev(query) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('TYPESAFE_API_KEY');
  if (!apiKey) return null;

  const url = 'https://api.typesafe.ai/v1/systemone';
  const payload = {
    state: query,
    model: 'jev-latest',
    questions: {
      canonical_term: {
        type: 'choice',
        instructions: '学生が入力した検索語（口語、略称、部位など）に対応する、最も標準的で動画タイトルに含まれやすい解剖生理学・医学用語を1つ判定してください。',
        criteria: {
          quadriceps: '太もも、前もも、膝伸ばし、大腿四頭筋、大腿直筋',
          hamstrings: '裏もも、ハム、ハムストリングス、膝曲げ、大腿二頭筋',
          rotator_cuff: '肩、五十肩、肩腱板、回旋筋腱板、棘上筋、肩甲骨',
          cerebrum_basal_ganglia: '線条体、大脳基底核、パーキンソン、黒質、被殻、淡蒼球',
          autonomic_nervous: '自律神経、交感神経、副交感神経、緊張、リラックス',
          cranial_nerves: '脳神経、動眼神経、三叉神経、顔面神経、迷走神経',
          circulatory_system: '心臓、心電図、血液循環、弁、刺激伝導系、不整脈',
          respiratory_system: '呼吸、肺、換気、外呼吸、内呼吸、スパイロ',
          kinematics_chain: 'CKC、OKC、運動連鎖、バイオメカニクス、歩行分析、関節モーメント',
          digestive_system: '胃、腸、肝臓、胆嚢、膵臓、消化吸収',
          other: 'その他の特定の医学・解剖学用語'
        }
      }
    }
  };

  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + apiKey
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    if (res.getResponseCode() === 200) {
      const json = JSON.parse(res.getContentText());
      const choice = json.answers?.canonical_term?.choice;
      const confidence = json.answers?.canonical_term?.confidence || 0;
      
      if (confidence >= 0.7) {
        const termMap = {
          quadriceps: '大腿四頭筋',
          hamstrings: 'ハムストリングス',
          rotator_cuff: '腱板',
          cerebrum_basal_ganglia: '大脳基底核',
          autonomic_nervous: '自律神経',
          cranial_nerves: '脳神経',
          circulatory_system: '心臓',
          respiratory_system: '呼吸',
          kinematics_chain: '関節',
          digestive_system: '消化器'
        };
        return termMap[choice] || null;
      }
    }
  } catch (err) {
    console.error("Jev System One error:", err);
  }
  return null;
}
