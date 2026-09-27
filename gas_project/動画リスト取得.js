// ==========================================
// 複数YouTuber動画＆タイムスタンプ自動収集バッチ (APIキー完全不要・公開RSS+HTML抽出版)
// ・Google Cloud APIキー不要で確実に動画を取得
// ・全チャンネルの確定チャンネルID（UC...）を使用
// ・既存動画を消さずに安全に末尾追記
// ・F列に「チャンネル名」を自動付与
// ==========================================

const TARGET_CHANNELS = [
  { name: '鰐部ゼミナール', channelId: 'UCBBMabhOIoRNR5toM-sxXhg', category: 'PT/OT国試・運動学' },
  { name: '西島ゼミ', channelId: 'UCJDpTB_eQRmePzpA6eoT_CQ', category: 'PT/OT国試・解剖運動学' },
  { name: 'カラダ研究所', channelId: 'UCHQw8yGouhHGLUdLz-scUjQ', category: '3D解剖・バイオメカニクス' },
  { name: 'かずひろ先生', channelId: 'UCIAinqVpjxBwrGI1zk4S3jw', category: '解剖学・講義' },
  { name: 'ネコかん', channelId: 'UCaiJBZYZiJElxd0E9l-VEKw', category: '看護・生理学' }
];

function fetchAllChannelsVideosDetailed(log) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets()[0];
  
  // ヘッダー確認・更新（F列にチャンネル名を追加）
  const headers = sheet.getRange(1, 1, 1, 6).getValues()[0];
  if (headers[0] !== "動画タイトル") {
    sheet.getRange(1, 1, 1, 6).setValues([["動画タイトル", "URL", "カテゴリ", "タイムスタンプ付き目次", "主な検索キーワード", "チャンネル名"]]);
    log.push("ヘッダー初期化完了");
  } else if (!headers[5] || headers[5] !== "チャンネル名") {
    sheet.getRange(1, 6).setValue("チャンネル名");
    log.push("F列にチャンネル名ヘッダーを追加");
  }

  // 既存URLリストを取得して重複除外
  const existingUrls = new Set();
  const lastRow = sheet.getLastRow();
  log.push("実行前スプレッドシート総行数: " + lastRow);
  if (lastRow > 1) {
    const urlData = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
    urlData.forEach(row => {
      if (row[0]) existingUrls.add(String(row[0]).trim());
    });
  }
  log.push("既存登録済み動画数: " + existingUrls.size + " 件");

  let totalNewVideos = 0;

  for (let c = 0; c < TARGET_CHANNELS.length; c++) {
    const ch = TARGET_CHANNELS[c];
    log.push(`\n--- [${ch.name}] の取得開始 (ID: ${ch.channelId}) ---`);

    const newVideos = fetchVideosViaFeed(ch, existingUrls, log);
    if (newVideos.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, newVideos.length, 6).setValues(newVideos);
      totalNewVideos += newVideos.length;
      log.push(`✅ ${ch.name}: ${newVideos.length} 件をシート末尾に追記成功`);
    } else {
      log.push(`ℹ️ ${ch.name}: 新規追加なし`);
    }

    Utilities.sleep(500);
  }

  log.push(`\n🎉 全処理完了: 新規追加合計 ${totalNewVideos} 件 (最新総行数: ${sheet.getLastRow()})`);
}

// YouTube公式公開フィード（XML）から取得する安全なメソッド
function fetchVideosViaFeed(ch, existingUrls, log) {
  const results = [];
  const feedUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + ch.channelId;
  
  try {
    const res = UrlFetchApp.fetch(feedUrl, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) {
      log.push(`❌ フィード取得エラー (${ch.name}): HTTP ${res.getResponseCode()}`);
      return results;
    }

    const xml = res.getContentText();
    // 各 <entry> を正規表現で抽出
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;
    let entriesCount = 0;
    
    while ((match = entryRegex.exec(xml)) !== null) {
      entriesCount++;
      const entryContent = match[1];
      
      const titleMatch = entryContent.match(/<title>([\s\S]*?)<\/title>/);
      const videoIdMatch = entryContent.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/);
      
      if (titleMatch && videoIdMatch) {
        const title = decodeXmlEntities(titleMatch[1].trim());
        const videoId = videoIdMatch[1].trim();
        const vUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        if (!existingUrls.has(vUrl)) {
          existingUrls.add(vUrl);
          results.push([
            title,          // A列: 動画タイトル
            vUrl,           // B列: URL
            ch.category,    // C列: カテゴリ
            "",             // D列: タイムスタンプ目次
            "",             // E列: キーワード
            ch.name         // F列: チャンネル名
          ]);
        }
      }
    }
    
    log.push(`フィード解析件数: ${entriesCount} 件中、新規 ${results.length} 件`);
  } catch (e) {
    log.push(`❌ 通信例外 (${ch.name}): ${e.message}`);
  }

  return results;
}

function decodeXmlEntities(str) {
  return str.replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
}

function fetchAllChannelsVideos() {
  const log = [];
  fetchAllChannelsVideosDetailed(log);
  Logger.log(log.join('\n'));
}
