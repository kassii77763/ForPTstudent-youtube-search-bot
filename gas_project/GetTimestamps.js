function extractTimestamps() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  
  if (lastRow < 2) {
    Browser.msgBox("データがありません");
    return;
  }
  
  // スクリプトプロパティから安全に取得（ハードコード防止）
  var apiKey = PropertiesService.getScriptProperties().getProperty('YOUTUBE_API_KEY');
  if (!apiKey) {
    Browser.msgBox("⚠️ スクリプトプロパティに YOUTUBE_API_KEY が設定されていません");
    return;
  }
  
  // A列〜B列のデータを取得
  var data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  var successCount = 0;
  
  // YouTube APIは一度に最大50件までしか詳細を取得できないため、50件ずつ処理する
  for (var i = 0; i < data.length; i += 50) {
    var batch = data.slice(i, i + 50);
    var ids = [];
    var rowIndices = [];
    
    // URLから動画ID（v=の後の文字列）を抽出
    for (var j = 0; j < batch.length; j++) {
      var url = batch[j][1]; // B列のURL
      if (url && url.indexOf('v=') !== -1) {
        var videoId = url.split('v=')[1].split('&')[0];
        ids.push(videoId);
        rowIndices.push(i + j + 2); // 書き込み先の行番号
      }
    }
    
    if (ids.length === 0) continue;
    
    // 動画の詳細（概要欄含む）を一括取得するAPI
    var apiUrl = 'https://www.googleapis.com/youtube/v3/videos?part=snippet&id=' + ids.join(',') + '&key=' + apiKey;
    
    try {
      var response = UrlFetchApp.fetch(apiUrl, {muteHttpExceptions: true});
      var json = JSON.parse(response.getContentText());
      
      if (json.items) {
        json.items.forEach(function(item) {
          var vId = item.id;
          var desc = item.snippet.description; // 概要欄のテキスト
          
          // 正規表現で「0:00」や「00:00:00」のような時間表記が含まれる行をすべて抜き出す
          var timestampRegex = /(?:\d{1,2}:)?\d{1,2}:\d{2}.*/g;
          var matches = desc.match(timestampRegex);
          
          var index = ids.indexOf(vId);
          if (index !== -1 && matches) {
            var timestampText = matches.join('\n'); // 抜き出した目次を改行でつなぐ
            var rowNum = rowIndices[index];
            
            // D列（4列目）にタイムスタンプ付き目次を書き込む
            sheet.getRange(rowNum, 4).setValue(timestampText);
            successCount++;
          }
        });
      }
    } catch(e) {
      console.error("エラーが発生しました: " + e.message);
    }
    
    // APIの制限に引っかからないよう少し待機
    Utilities.sleep(500); 
  }
  
  // 処理完了後にスプレッドシート側にアラートを出す
  sheet.getRange(lastRow + 1, 1).setValue("✅ タイムスタンプ抽出完了");
}