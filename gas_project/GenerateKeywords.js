function generateKeywordsWithGemini() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  
  if (lastRow < 2) return;
  
  // スクリプトプロパティから安全に取得
  var geminiApiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!geminiApiKey) {
    Logger.log("⚠️ スクリプトプロパティに GEMINI_API_KEY が設定されていません");
    return;
  }
  
  // gemini-model-policy に準拠: gemini-3.8-flash を標準採用
  var apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=' + geminiApiKey;
  
  // A列(タイトル)からG列(検索対象)までのデータを取得
  var data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  
  for (var i = 0; i < data.length; i++) {
    var title = data[i][0];          // A列：動画タイトル
    var timestamps = data[i][3];     // D列：タイムスタンプ（目次）
    var currentKeyword = data[i][4]; // E列：現在のキーワード
    var status = String(data[i][6] || 'ON').trim().toUpperCase(); // G列：検索対象
    
    // G列がOFF（過去問やメンバー限定）はスキップ
    if (status === 'OFF') continue;

    // すでにキーワードがある行はスキップ
    if (currentKeyword && currentKeyword.toString().trim() !== "") {
      continue; 
    }
    
    var prompt = "あなたは解剖生理学・理学療法・作業療法の専門家です。以下のYouTube動画タイトルから、医療系学生がLINE等で検索しそうな【重要な解剖学・運動学・生理学・疾患名・部位名キーワード】をカンマ区切りで5~8個抽出してください。余計な解説は書かず単語のみカンマ区切りで答えてください。\n\n【動画タイトル】\n" + title;
    
    var payload = {
      "contents": [{"parts": [{"text": prompt}]}]
    };
    
    var options = {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    };
    
    try {
      var response = UrlFetchApp.fetch(apiUrl, options);
      var json = JSON.parse(response.getContentText());
      
      if (json.candidates && json.candidates.length > 0) {
        var generatedText = json.candidates[0].content.parts[0].text.trim().replace(/\n/g, ', ');
        sheet.getRange(i + 2, 5).setValue(generatedText);
      }
    } catch(e) {
      Logger.log("エラー: " + title + " / " + e.message);
    }
    
    Utilities.sleep(500); 
  }
  
  sheet.getRange(lastRow + 1, 1).setValue("✅ キーワード生成完了");
}
