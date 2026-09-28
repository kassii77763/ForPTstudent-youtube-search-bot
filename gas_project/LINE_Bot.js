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
  if (e && e.parameter && e.parameter.action === 'inspectUserPreferences') {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('ユーザー設定');
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ found: false })).setMimeType(ContentService.MimeType.JSON);
    }
    const data = sheet.getDataRange().getValues();
    return ContentService.createTextOutput(JSON.stringify({ found: true, rows: data }, null, 2)).setMimeType(ContentService.MimeType.JSON);
  }
  if (e && e.parameter && e.parameter.action === 'resetUserPreferences') {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('ユーザー設定');
    if (sheet) {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, 3).clearContent();
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'reset_completed' })).setMimeType(ContentService.MimeType.JSON);
  }
  if (e && e.parameter && e.parameter.action === 'setupWeeklyTriggers') {
    try {
      const res = setupWeeklyLearningTriggers();
      return ContentService.createTextOutput(JSON.stringify(res, null, 2)).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'trigger_setup_notice', 
        message: 'スプレッドシート上部のメニュー「🤖 Bot管理」→「⏰ 週2回AI自動学習トリガーを設定」をクリックするか、エディタから setupWeeklyLearningTriggers を実行してください。',
        error: err.message
      }, null, 2)).setMimeType(ContentService.MimeType.JSON);
    }
  }
  if (e && e.parameter && e.parameter.action === 'runLearningBatch') {
    const res = runBiweeklySynonymLearning();
    return ContentService.createTextOutput(JSON.stringify(res, null, 2)).setMimeType(ContentService.MimeType.JSON);
  }
  if (e && e.parameter && e.parameter.action === 'inspectSynonymDict') {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const groups = loadSynonymGroupsFromSheet(ss);
    return ContentService.createTextOutput(JSON.stringify({ groupCount: groups.length, groups: groups }, null, 2)).setMimeType(ContentService.MimeType.JSON);
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
    
    // クエリ内の明示的チャンネル指定を抽出
    let explicitAuthor = null;
    let cleanQ = q;
    const authorPatterns = [
      { author: 'カラダ研究所', regex: /(?:カラダ研究所|ガラダ研究所|からだ研究所|体研究所)/i },
      { author: 'ゴロー先生', regex: /(?:ゴロー先生|ゴロー|ごろう先生|ごろう)/i },
      { author: '西島ゼミ', regex: /(?:西島ゼミ|西島先生|西島)/i },
      { author: 'かずひろ先生', regex: /(?:かずひろ先生|かずひろ|徹底的解剖学)/i },
      { author: 'ネコかん', regex: /(?:ネコかん|ねこかん|猫缶|ネコ缶)/i },
      { author: '鰐部ゼミナール', regex: /(?:鰐部ゼミナール|わにべ|鰐部)/i }
    ];
    for (const ap of authorPatterns) {
      if (ap.regex.test(q)) {
        explicitAuthor = ap.author;
        cleanQ = q.replace(ap.regex, '').trim();
        break;
      }
    }
    
    let matches = executeSearch(data, q, explicitAuthor ? [explicitAuthor] : null, ss);
    let jevTerm = null;
    if (matches.length === 0) {
      try {
        jevTerm = queryWithJev(cleanQ || q);
        if (jevTerm && jevTerm !== (cleanQ || q)) {
          const retryQuery = explicitAuthor ? `${jevTerm} ${explicitAuthor}` : jevTerm;
          matches = executeSearch(data, retryQuery, explicitAuthor ? [explicitAuthor] : null, ss);
        }
      } catch (err) {
        // ignore
      }
    }
    
    const interleaved = interleaveByChannel(matches, 8).map(m => {
      return Object.assign({}, m, {
        displayTitle: cleanDisplayTitle(m.title)
      });
    });

    return ContentService.createTextOutput(JSON.stringify({
      query: q,
      explicitAuthor: explicitAuthor,
      cleanQuery: cleanQ,
      jevTerm: jevTerm,
      matchCount: matches.length,
      sampleHits: interleaved
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

    // 過去問・メンバー限定・一問一答・暗記スピードチェック等の演習動画除外判定正規表現
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
      /限定公開/i,
      /スピードチェック/i,
      /一問一答/i,
      /フラッシュ暗記/i,
      /聞き流し/i,
      /暗記/i,
      /クイズ/i,
      /出版のお知らせ/i,
      /お疲れ様でした/i,
      /心構え/i,
      /お知らせ/i,
      /企画/i
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

  // クエリ内の明示的な解説者指定を抽出（例: 「歩行周期 カラダ研究所」-> targetAuthor: カラダ研究所, cleanQuery: 歩行周期）
  let explicitAuthor = null;
  let cleanQuery = query;
  const authorPatterns = [
    { author: 'カラダ研究所', regex: /(?:カラダ研究所|ガラダ研究所|からだ研究所|体研究所)/i },
    { author: 'ゴロー先生', regex: /(?:ゴロー先生|ゴロー|ごろう先生|ごろう)/i },
    { author: '西島ゼミ', regex: /(?:西島ゼミ|西島先生|西島)/i },
    { author: 'かずひろ先生', regex: /(?:かずひろ先生|かずひろ|徹底的解剖学)/i },
    { author: 'ネコかん', regex: /(?:ネコかん|ねこかん|猫缶|ネコ缶)/i },
    { author: '鰐部ゼミナール', regex: /(?:鰐部ゼミナール|わにべ|鰐部)/i }
  ];
  for (const ap of authorPatterns) {
    if (ap.regex.test(query)) {
      explicitAuthor = ap.author;
      cleanQuery = query.replace(ap.regex, '').trim();
      break;
    }
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const videoSheet = ss.getSheets()[0]; // 1枚目の動画リスト
  const data = videoSheet.getDataRange().getValues();
  
  // 2. 検索実行（ユーザー好みの優先チャンネルを適用 & スプレッドシート動的辞書連携）
  const prefChannel = getUserPreference(ss, userId);
  let matches = executeSearch(data, query, prefChannel, ss);
  
  // もし直接ヒットしなかった場合、Jev（TypeSafe AI System One）で意味推論・専門用語判定を実施
  let jevExpandedQuery = null;
  if (matches.length === 0) {
    try {
      jevExpandedQuery = queryWithJev(cleanQuery || query);
      if (jevExpandedQuery && jevExpandedQuery !== (cleanQuery || query)) {
        // 明示指定された解説者がある場合は、Jevの展開語にもその解説者制約を必ず継承
        const retryQuery = explicitAuthor ? `${jevExpandedQuery} ${explicitAuthor}` : jevExpandedQuery;
        const retryPref = explicitAuthor ? [explicitAuthor] : prefChannel;
        matches = executeSearch(data, retryQuery, retryPref, ss);
      }
    } catch (e) {
      console.error("Jev呼び出し例外:", e);
    }
  }

  // 3. まだヒットせず、かつ解説者が明示指定されている場合、クエリの部分一致・基底語で再検索（同チャンネル内を徹底探索）
  if (matches.length === 0 && explicitAuthor && cleanQuery.length >= 2) {
    // 例: 「歩行周期」-> 「歩行」
    const subTerms = [cleanQuery.slice(0, 2), cleanQuery.slice(-2)];
    for (const sub of subTerms) {
      if (sub && sub !== cleanQuery && sub.length >= 2) {
        const subMatches = executeSearch(data, `${sub} ${explicitAuthor}`, [explicitAuthor], ss);
        if (subMatches.length > 0) {
          matches = subMatches;
          jevExpandedQuery = `${sub}（関連）`;
          break;
        }
      }
    }
  }

  // 3.5 【UX重要改善】ユーザーのマイ設定（絞り込み）が原因で0件になった場合、
  // 学生を「見つかりませんでした」と突き放さず、全チャンネルから自動探索して届ける
  let prefFallbackNote = null;
  if (matches.length === 0 && !explicitAuthor && prefChannel && prefChannel.length > 0) {
    const allMatches = executeSearch(data, query, null, ss);
    if (allMatches.length > 0) {
      matches = allMatches;
      prefFallbackNote = `【${prefChannel.join('・')}】には動画がなかったため、全チャンネルからお届けします😊`;
    }
  }
  
  if (matches.length > 0) {
    const logLabel = jevExpandedQuery ? `Jev判定ヒット(${jevExpandedQuery})` : (prefFallbackNote ? '優先設定外全ヒット' : '直接ヒット');
    logSearchActivity(ss, userId, userName, query, matches.length, logLabel);
    
    // カルーセルメッセージの構築（最大8件表示）
    const flexMessage = buildFlexCarousel(matches.slice(0, 8), jevExpandedQuery || query);
    
    // 全チャンネル自動補完があった場合はテキスト注記を添えて送信
    if (prefFallbackNote) {
      sendLineReply(replyToken, [
        { type: 'text', text: `💡「${query}」の解説：\n${prefFallbackNote}` },
        flexMessage
      ]);
    } else {
      sendLineReply(replyToken, [flexMessage]);
    }
    return;
  }
  
  // 4. 0件ヒット時：親テーマサジェスト ＆ 検索足跡ログ
  // 解説者指定がある場合は、他チャンネルの動画を混入させず「〇〇先生のチャンネルには見つかりませんでした」と正確に案内
  let suggestions = [];
  try {
    suggestions = getOrLearnSuggestions(ss, cleanQuery || query, data, userId, userName);
  } catch (err) {
    console.error("サジェスト取得エラー:", err);
  }

  if (explicitAuthor) {
    logSearchActivity(ss, userId, userName, query, 0, `未ヒット(${explicitAuthor}限定)`);
    const fallbackText = `「${cleanQuery}」に一致する動画は【${explicitAuthor}】には見つかりませんでした😢\n\n💡 全チャンネル横断で探すか、関連テーマで検索してみてください：`;
    
    // 全チャンネルでの再検索QuickReply & サジェスト
    const qrItems = [
      {
        type: 'action',
        action: {
          type: 'message',
          label: `🌐 全チャンネルで探す`,
          text: cleanQuery
        }
      }
    ];
    if (suggestions && suggestions.length > 0) {
      suggestions.slice(0, 4).forEach(s => {
        qrItems.push({
          type: 'action',
          action: {
            type: 'message',
            label: s.length > 18 ? s.slice(0, 16) + '..' : s,
            text: `${s} ${explicitAuthor}`
          }
        });
      });
    }

    sendLineReply(replyToken, [{
      type: 'text',
      text: fallbackText,
      quickReply: { items: qrItems }
    }]);
    return;
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
function executeSearch(data, query, prefChannels, ss) {
  const spreadsheet = ss || SpreadsheetApp.getActiveSpreadsheet();
  let targetAuthor = null;
  let cleanQuery = query;
  
  const authorPatterns = [
    { author: 'カラダ研究所', regex: /(?:カラダ研究所|ガラダ研究所|からだ研究所|体研究所)/i },
    { author: 'ゴロー先生', regex: /(?:ゴロー先生|ゴロー|ごろう先生|ごろう)/i },
    { author: '西島ゼミ', regex: /(?:西島ゼミ|西島先生|西島)/i },
    { author: 'かずひろ先生', regex: /(?:かずひろ先生|かずひろ|徹底的解剖学)/i },
    { author: 'ネコかん', regex: /(?:ネコかん|ねこかん|猫缶|ネコ缶)/i },
    { author: '鰐部ゼミナール', regex: /(?:鰐部ゼミナール|わにべ|鰐部)/i }
  ];
  for (const ap of authorPatterns) {
    if (ap.regex.test(query)) {
      targetAuthor = ap.author;
      cleanQuery = query.replace(ap.regex, '').trim();
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
  // 同義語展開をループの前に1度だけ事前解決（未定義エラー防止 ＆ 実行速度を大幅改善）
  const keywordVariantsList = keywords.map(k => getSynonymVariants(k, spreadsheet));
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
    
    // 一問一答・暗記・スピードチェック・聞き流し・クイズ・お知らせ等をリアルタイムでも確実に除外
    const isExerciseOrNotice = /(?:スピードチェック|一問一答|フラッシュ暗記|聞き流し|暗記|クイズ|お疲れ様でした|心構え|お知らせ|企画|第\s*\d+\s*回|過去問|午後問|午前問|問\s*\d+|模試)/i.test(title);
    if (isExerciseOrNotice) continue;
    
    if (allowedAuthors && !allowedAuthors.includes(author)) continue;
    
    const searchTarget = (title + " " + timestamps + " " + tags + " " + category).toLowerCase();
    // 医学用語・解剖学の同義語・表記揺れ（事前計算済みバリアントで超高速判定）
    const isMatch = keywordVariantsList.every(variants => {
      return variants.some(v => searchTarget.includes(v.toLowerCase()));
    });
    
    if (isMatch) {
      const isWebArticle = url.includes('anatomy.tokyo') || !url.includes('youtube.com');
      let thumbUrl = '';
      let playUrl = url;

      if (isWebArticle) {
        // かずひろ先生の徹底的解剖学・図解イラスト公式画像 (200 OK実在確認済み)
        thumbUrl = 'https://www.anatomy.tokyo/wp-content/uploads/2024/07/takusannozu2.jpg';
        playUrl = encodeURI(url);
      } else {
        const videoId = extractVideoId(url);
        const targetSeconds = findBestTimestamp(timestamps, keywords[0], spreadsheet);
        playUrl = targetSeconds > 0 ? `${url}&t=${targetSeconds}s` : url;
        thumbUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      }
      
      // HTML特殊文字（&#8211;や&amp;等）を整形
      const cleanTitle = title.replace(/&#8211;/g, '–')
                              .replace(/&#8212;/g, '—')
                              .replace(/&amp;/g, '&')
                              .replace(/&lt;/g, '<')
                              .replace(/&gt;/g, '>');

      results.push({
        title: cleanTitle,
        url: playUrl,
        author: author,
        category: category,
        thumbnail: thumbUrl
      });
    }
  }
  return results;
}

// 医療系・解剖生理学の基本同義語（フォールバック用）
const MEDICAL_SYNONYM_GROUPS = [
  ['脊椎', '脊柱', '椎骨', 'せきつい', 'せきちゅう'],
  ['大腿四頭筋', '太もも', 'ふともも', '前もも', '大腿直筋'],
  ['ハムストリングス', 'ハムストリング', '裏もも', '大腿二頭筋', '半腱様筋', '半膜様筋'],
  ['腱板', '回旋筋腱板', 'ローテーターカフ', '棘上筋', '棘下筋', '小円筋', '肩甲下筋'],
  ['骨盤', '仙腸関節', '寛骨', '仙骨'],
  ['大脳基底核', '線条体', '尾状核', '被殻', '淡蒼球'],
  ['自律神経', '交感神経', '副交感神経'],
  ['脳神経', '脳幹', '脳神経系'],
  ['歩行', '歩行周期', '立脚期', '遊脚期', '歩行分析'],
  ['運動連鎖', 'バイオメカニクス', 'キネマティクス', 'ckc', 'okc'],
  ['体液', '体液区分', '浸透圧', '膠質浸透圧', '脱水', '浮腫'],
  ['酸塩基平衡', '酸塩基', 'アシドーシス', 'アルカローシス', 'ph'],
  ['心電図', '刺激伝導系', '不整脈', '心筋']
];

// スプレッドシートの「表記揺れ・同義語辞書」シートから動的に読み込み（キャッシュ付き）
function loadSynonymGroupsFromSheet(ss) {
  if (!ss) return MEDICAL_SYNONYM_GROUPS;
  
  const cache = CacheService.getScriptCache();
  const cached = cache.get('CUSTOM_SYNONYM_GROUPS');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }

  let sheet = ss.getSheetByName('表記揺れ・同義語辞書');
  if (!sheet) {
    sheet = ss.insertSheet('表記揺れ・同義語辞書');
    sheet.getRange(1, 1, 1, 4).setValues([['代表語・検索語', '同義語・表記揺れ（カンマ区切り）', '登録元', '更新日時']]);
    const initialRows = MEDICAL_SYNONYM_GROUPS.map(g => [g[0], g.slice(1).join(', '), 'システム初期登録', new Date()]);
    sheet.getRange(2, 1, initialRows.length, 4).setValues(initialRows);
  }

  const data = sheet.getDataRange().getValues();
  const groups = MEDICAL_SYNONYM_GROUPS.map(g => [...g]);
  
  for (let i = 1; i < data.length; i++) {
    const mainWord = String(data[i][0] || '').trim();
    const synText = String(data[i][1] || '').trim();
    if (mainWord && synText) {
      const syns = synText.split(/[,、]/).map(s => s.trim()).filter(s => s.length > 0);
      groups.push([mainWord, ...syns]);
    }
  }

  try {
    cache.put('CUSTOM_SYNONYM_GROUPS', JSON.stringify(groups), 21600); // 6時間キャッシュ
  } catch (e) {}

  return groups;
}

function getSynonymVariants(word, ss) {
  if (!word) return [];
  const norm = String(word).toLowerCase().trim();
  const groups = loadSynonymGroupsFromSheet(ss || SpreadsheetApp.getActiveSpreadsheet());
  
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    if (group.some(term => term.toLowerCase() === norm)) {
      return group;
    }
  }
  return [word];
}

function extractVideoId(url) {
  const m = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : '';
}

function findBestTimestamp(timestampsText, keyword, ss) {
  if (!timestampsText || !keyword) return 0;
  const variants = getSynonymVariants(keyword, ss);
  const lines = timestampsText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLower = line.toLowerCase();
    if (variants.some(v => lineLower.includes(v.toLowerCase()))) {
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

// ==========================================
// 週2回（火曜・金曜 深夜3時）のAI自己学習バッチ
// 学生の0件ヒットログをGeminiが自律分析し、スプレッドシート辞書へ自動追記
// ==========================================
function runBiweeklySynonymLearning() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName('AI学習辞書・検索ログ');
  if (!logSheet) return { status: 'no_log_sheet' };

  const logData = logSheet.getDataRange().getValues();
  const zeroHitQueries = [];
  const handledRows = [];
  for (let i = 1; i < logData.length; i++) {
    const q = String(logData[i][3] || '').trim();
    const hitCount = Number(logData[i][4] || 0);
    const memo = String(logData[i][5] || '');
    
    if (hitCount === 0 && q.length >= 2 && !memo.includes('AI同義語登録済')) {
      if (!zeroHitQueries.includes(q)) {
        zeroHitQueries.push(q);
      }
      handledRows.push(i + 1);
    }
  }

  if (zeroHitQueries.length === 0) {
    return { status: 'no_new_zero_hit_queries' };
  }

  const geminiApiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!geminiApiKey) return { status: 'no_gemini_key' };

  const videoSheet = ss.getSheets()[0];
  const videoData = videoSheet.getDataRange().getValues();
  const allTitles = videoData.slice(1).map(r => String(r[0] || '')).join(' ');

  let dictSheet = ss.getSheetByName('表記揺れ・同義語辞書');
  if (!dictSheet) {
    loadSynonymGroupsFromSheet(ss);
    dictSheet = ss.getSheetByName('表記揺れ・同義語辞書');
  }

  const dictData = dictSheet.getDataRange().getValues();
  const existingWords = new Set();
  for (let i = 1; i < dictData.length; i++) {
    existingWords.add(String(dictData[i][0]).toLowerCase());
    String(dictData[i][1]).split(/[,、]/).forEach(w => existingWords.add(w.trim().toLowerCase()));
  }

  const newlyAdded = [];
  const targets = zeroHitQueries.filter(q => !existingWords.has(q.toLowerCase())).slice(0, 10);

  for (let i = 0; i < targets.length; i++) {
    const query = targets[i];
    const prompt = `あなたは医療系国家試験（解剖学・生理学・運動学）の指導講師です。
学生が「${query}」と検索しましたがヒットしませんでした。
この日常語・略称・俗称（例: 「背骨」「ふくらはぎ」「首の骨」「五十肩」「すね」など）に合致する、
標準的な解剖学・医学用語（例: 「脊柱」「下腿三頭筋」「頸椎」「肩関節周囲炎」「前脛骨筋」など）を1つ〜2つ挙げてください。
回答フォーマットは標準用語のみをカンマ区切りで出力してください。解説や前置きは不要です。`;

    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
      const res = UrlFetchApp.fetch(apiUrl, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        muteHttpExceptions: true
      });
      const json = JSON.parse(res.getContentText());
      if (json.candidates && json.candidates[0]?.content?.parts?.[0]?.text) {
        const canonical = json.candidates[0].content.parts[0].text.trim().split(/[,、\n]/).map(s => s.trim())[0];
        if (canonical && allTitles.includes(canonical)) {
          dictSheet.appendRow([canonical, query, 'AI週次自動学習', new Date()]);
          newlyAdded.push({ canonical, query });
          CacheService.getScriptCache().remove('CUSTOM_SYNONYM_GROUPS');
        }
      }
    } catch (err) {
      console.error("AI学習エラー:", err);
    }
  }

  handledRows.forEach(rowIdx => {
    logSheet.getRange(rowIdx, 6).setValue('AI同義語登録済');
  });

  return { status: 'learning_completed', newlyAddedCount: newlyAdded.length, newlyAdded };
}

// 週2回（火曜日・金曜日の深夜3時）のGASトリガーを自動登録
function setupWeeklyLearningTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'runBiweeklySynonymLearning') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // 火曜 深夜3:00〜4:00
  ScriptApp.newTrigger('runBiweeklySynonymLearning')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.TUESDAY)
    .atHour(3)
    .create();

  // 金曜 深夜3:00〜4:00
  ScriptApp.newTrigger('runBiweeklySynonymLearning')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.FRIDAY)
    .atHour(3)
    .create();

  try {
    SpreadsheetApp.getActiveSpreadsheet().toast('週2回（火・金 深夜3時）のAI自動学習トリガーを設定しました！', '設定完了');
  } catch (e) {}

  return { status: 'triggers_configured', schedule: '毎週火曜日・金曜日の午前3:00' };
}

// スプレッドシート起動時にメニューを追加
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🤖 Bot管理')
      .addItem('⏰ 週2回（火・金）AI自動学習トリガーを設定', 'setupWeeklyLearningTriggers')
      .addItem('▶️ 今すぐAI自動学習を実行', 'manualRunLearning')
      .addItem('🔄 表記揺れ辞書のキャッシュを更新', 'clearSynonymCache')
      .addToUi();
  } catch (e) {}
}

function manualRunLearning() {
  const res = runBiweeklySynonymLearning();
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(`AI学習完了: 新規登録 ${res.newlyAddedCount || 0} 件`, '成功');
  } catch (e) {}
}

function clearSynonymCache() {
  CacheService.getScriptCache().remove('CUSTOM_SYNONYM_GROUPS');
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast('表記揺れ辞書のキャッシュを更新しました！シートの追記が即座に反映されます。', '更新完了');
  } catch (e) {}
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

// タイトル冒頭の定型プレフィックスをトリムして核心単語を前面に出す（改善案1）
function cleanDisplayTitle(title) {
  if (!title) return '';
  let clean = title;
  // 【解剖生理学（呼吸器系）】などの長大なプレフィックスを除去
  clean = clean.replace(/^【(?:解剖生理学|徹底的解剖学|解剖学|生理学|運動学|PTOT|国試対策|専門基礎).*?】\s*/i, '');
  clean = clean.replace(/^\[.*?\]\s*/, '');
  // 末尾の定型タグ（：リメイクver.など）をトリム
  clean = clean.replace(/[:：]\s*(?:リメイクver|完全攻略|決定版|無料公開).*?$/i, '');
  // 全角スペースや重複スペースを整理
  clean = clean.replace(/[\s　]+/g, ' ').trim();
  return clean || title;
}

// チャンネル交互配分（Round-Robin / 多様性インターリーブ）（改善案2）
function interleaveByChannel(items, maxCount) {
  if (!items || items.length <= 1) return items || [];
  const limit = maxCount || 8;
  
  // チャンネルごとにバケット分け
  const groups = {};
  const channelOrder = [];
  items.forEach(item => {
    const ch = item.author || 'その他';
    if (!groups[ch]) {
      groups[ch] = [];
      channelOrder.push(ch);
    }
    groups[ch].push(item);
  });

  const interleaved = [];
  let added = true;
  let round = 0;

  while (interleaved.length < limit && added) {
    added = false;
    for (let c = 0; c < channelOrder.length; c++) {
      const ch = channelOrder[c];
      if (groups[ch] && groups[ch].length > round) {
        interleaved.push(groups[ch][round]);
        added = true;
        if (interleaved.length >= limit) break;
      }
    }
    round++;
  }
  return interleaved;
}

// カルーセルメッセージ生成（改善案1〜3統合版）
function buildFlexCarousel(items, query) {
  // チャンネル交互配分を適用して特定チャンネルの画面独占を排除
  const displayItems = interleaveByChannel(items, 8);

  const bubbles = displayItems.map(item => {
    const style = CHANNEL_STYLES[item.author] || { color: '#4b5563', label: item.author };
    const isWebArticle = item.url.includes('anatomy.tokyo') || !item.url.includes('youtube.com');
    const actionLabel = isWebArticle ? '解説を読む ↗' : '再生する ▷';
    
    // 改善案1: スマホカード用最適化タイトル
    const displayTitle = cleanDisplayTitle(item.title);
    
    // 改善案3: 所要時間/メディアバッジ
    const badgeText = isWebArticle ? '📖 Web 3分' : (item.url.includes('&t=') ? '⏱️ 直行' : '⏱️ 動画');
    
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
          },
          {
            type: 'text',
            text: badgeText,
            size: 'xxs',
            color: '#6b7280',
            align: 'end'
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
            text: displayTitle,
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
  '脊椎': ['脊柱', '体幹', '骨格系'],
  '脊柱': ['脊椎', '体幹', '骨格系'],
  '熱': ['体温調節', '発熱'],
  'ねつ': ['体温調節', '発熱'],
  '太もも': ['大腿四頭筋', '下肢'],
  'ふともも': ['大腿四頭筋', '下肢'],
  '頭痛': ['脳神経', '自律神経'],
  '仙腸関節': ['骨盤', '脊柱'],
  'ckc': ['関節', '下肢', '骨格系'],
  'okc': ['関節', '上肢', '骨格系'],
  'バイオメカニクス': ['関節', '下肢', '骨格系'],
  '運動連鎖': ['関節', '下肢', '骨格系'],
  '歩行周期': ['歩行', '下肢', '運動学'],
  '立脚期': ['歩行', '歩行周期', '下肢'],
  '遊脚期': ['歩行', '歩行周期', '下肢'],
  '体液': ['浸透圧', '浮腫', '脱水'],
  '体液区分': ['体液', '細胞内液', '細胞外液'],
  '酸塩基': ['酸塩基平衡', 'アシドーシス', 'アルカローシス'],
  'ph': ['酸塩基平衡', '体液']
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
  try {
    const res = UrlFetchApp.fetch(url, {
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
    if (res.getResponseCode() !== 200) {
      console.error("LINE返信エラー:", res.getResponseCode(), res.getContentText());
    }
  } catch (err) {
    console.error("sendLineReply例外:", err);
  }
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
          gait_analysis: '歩行、歩行周期、立脚期、遊脚期、歩行分析、二足歩行',
          kinematics_chain: 'CKC、OKC、運動連鎖、バイオメカニクス、関節モーメント',
          digestive_system: '胃、腸、肝臓、胆嚢、膵臓、消化吸収',
          body_fluid: '体液、浸透圧、浮腫、むくみ、脱水、血漿、膠質浸透圧',
          acid_base: '酸塩基、酸塩基平衡、pH、アシドーシス、アルカローシス、緩衝系',
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
          gait_analysis: '歩行',
          kinematics_chain: '関節',
          digestive_system: '消化器',
          body_fluid: '体液',
          acid_base: '酸塩基平衡'
        };
        return termMap[choice] || null;
      }
    }
  } catch (err) {
    console.error("Jev System One error:", err);
  }
  return null;
}
