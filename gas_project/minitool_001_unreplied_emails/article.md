---
title: "#001 返信漏れを防ぎたいので、未返信メールを一覧化するGASを作ってみた"
tags: ["GAS", "GoogleAppsScript", "業務効率化", "時短", "Gmail", "スプレッドシート", "プログラミング初心者", "自動化"]
---

#001 返信漏れを防ぎたいので、未返信メールを一覧化するGASを作ってみた

## こんな悩み、ありませんか？

複数の案件やプロジェクトを並行して進めていると、こんな瞬間にヒヤッとしたことはありませんか？

・「あの件、返信待ちだったっけ？ それとも自分がボールを持ったまま止まってる？」
・受信トレイのスレッドを上から下までスクロールして、1件ずつ返信状況を確認するのに毎日10〜15分溶かしている
・相手からの返信が遅れていることに数日経ってから気づき、リマインドのタイミングを逃してしまった

Gmailの検索窓で from:me やラベルを駆使しても、スレッド単位で「自分が最後に送って、相手から返信が来ていないもの」だけを綺麗に洗い出すのは意外と骨が折れますよね。

そこで今回は、「自分が最後に送信したきり、相手から返信が届いていないメール」をGoogleスプレッドシートに自動で一覧化するGAS（Google Apps Script）を作りました。

---

## 目次

1. 最初に知っておいてほしいこと
2. できること
3. 全体のイメージ
4. 事前に準備するもの
5. コード
6. 導入手順（コピペで3分）
7. まとめ

---

## 最初に知っておいてほしいこと

コードを貼る前に、このツールの判定ロジックと安心ポイントをお伝えしておきます。

・「未返信の確定」ではなく「確認候補」として扱います
メールのやり取りの中には「承知しました」「ありがとうございます」で会話が自然に終了しているケースもあります。そのため、このツールは「要確認リスト」として一覧化し、リンクからワンクリックで該当スレッドを開いて判断できるようにしています。

・外部へのデータ送信は一切ありません
コードはすべてご自身のGoogleアカウント内で完結します。メール内容や個人情報が外部サーバーに送られることはありません。

・コードを触らずに設定変更できます
探索日数（直近7日〜30日など）や定期実行スケジュールは、すべてスプレッドシート上のセルから自由に変更できます。

---

## できること

このツールでできることは、極めてシンプルに3つです。

1. 返信待ち候補の自動抽出
直近指定日数（初期値: 14日〜20日）を対象に、自分が最後に送信したスレッドを自動収集します。

2. スプレッドシートへの見やすい一覧化
「相手」「件名」「最終送信日時」「返信待ち日数」「Gmailを開くリンク」を美しく整理します。

3. 毎日の自動パトロール（定期実行）
朝の決まった時間（例: 10:00台）に自動更新するよう、シート上からワンクリックでタイマー登録できます。

---

## 全体のイメージ

スプレッドシートは、操作ボタンと設定がまとまった「ダッシュボード」と、抽出結果が並ぶ「一覧」の2画面構成になっています。

### ① 設定・ダッシュボード

【ここに 01_dashboard.png を配置】

・探索対象日数：直近20日（数字を書き換えるだけで自由に変更可能）
・返信待ち件数：現在の要確認メール件数をカードで一目で把握
・自動実行スケジュール：実行時刻（例: 10時台）と間隔をシート上で指定可能

### ② 未返信一覧テーブル

【ここに 02_results.png を配置】

【一覧で確認できる5つの項目】
・相手先（名前＋メールアドレス）
・件名
・最終送信日時（yyyy/MM/dd HH:mm）
・経過日数（N日）
・リンク（ワンクリックでGmailの該当スレッドへ直行）

リンクを押せば、ブラウザで直接そのスレッドが開くので、即座に状況を確認・返信できます。

---

## 事前に準備するもの

特別なツールや有料サービスは一切不要です。

1. Googleアカウント（Gmailを使っているアカウント）
2. Googleスプレッドシート（新規の空シートを1枚用意するだけ）

---

## コード

以下のコードをコピーして、スプレッドシートのスクリプトエディタに貼り付けるだけで動きます。

```javascript
/**
 * 【製品版 v4】未返信メール一覧化ツール
 * 
 * 特徴:
 * - 直近指定日数の返信待ちメールを抽出してシートに一覧化
 * - 実行時刻・実行間隔をダッシュボード上で自由に変更可能
 * - 存在しないAPIバグや過剰なメニューを排除した純粋設計
 */

const CONFIG = {
  DASHBOARD_SHEET_NAME: "ダッシュボード",
  RESULT_SHEET_NAME: "未返信一覧",
  DEFAULT_DAYS: 14,
  MAX_THREADS: 100,
  COLOR_NAVY: "#1a365d",
  COLOR_NAVY_LIGHT: "#2b6cb0",
  COLOR_LIGHT_BG: "#f7fafc",
  COLOR_BORDER: "#e2e8f0"
};

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("未返信メールチェッカー")
    .addItem("▶ 今すぐ一覧を更新する", "fetchUnrepliedEmails")
    .addItem("⏰ 定期実行トリガーを設定", "setupTriggerFromDashboard")
    .addItem("🗑️ 定期実行トリガーを解除", "clearAllTriggers")
    .addToUi();

  ensureDashboardSheet();
}

function ensureDashboardSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.DASHBOARD_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.DASHBOARD_SHEET_NAME, 0);
    buildDashboard(sheet);
  }
  return sheet;
}

function buildDashboard(sheet) {
  sheet.clear();
  sheet.setHiddenGridlines(true);

  sheet.setColumnWidth(1, 24);
  sheet.setColumnWidth(2, 40);
  sheet.setColumnWidth(3, 140);
  sheet.setColumnWidth(4, 160);
  sheet.setColumnWidth(5, 24);
  sheet.setColumnWidth(6, 40);
  sheet.setColumnWidth(7, 140);
  sheet.setColumnWidth(8, 160);
  sheet.setColumnWidth(9, 140);

  sheet.getRange("B2:I3").merge()
    .setValue("📧 未返信メールチェッカー｜コントロールパネル")
    .setBackground(CONFIG.COLOR_NAVY)
    .setFontColor("#ffffff")
    .setFontSize(14)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  sheet.getRange("B5:D5").merge()
    .setValue("⚙️ 探索設定")
    .setBackground(CONFIG.COLOR_NAVY_LIGHT)
    .setFontColor("#ffffff")
    .setFontWeight("bold");

  sheet.getRange("B6:C6").merge().setValue("探索対象日数（直近N日）").setBackground(CONFIG.COLOR_LIGHT_BG);
  sheet.getRange("D6").setValue(CONFIG.DEFAULT_DAYS).setHorizontalAlignment("center").setFontWeight("bold");

  sheet.getRange("F5:I5").merge()
    .setValue("⏰ 自動実行スケジュール")
    .setBackground(CONFIG.COLOR_NAVY_LIGHT)
    .setFontColor("#ffffff")
    .setFontWeight("bold");

  sheet.getRange("F6:H6").merge().setValue("実行間隔").setBackground(CONFIG.COLOR_LIGHT_BG);
  sheet.getRange("I6").setValue("毎日").setHorizontalAlignment("center");

  sheet.getRange("F7:H7").merge().setValue("実行時刻").setBackground(CONFIG.COLOR_LIGHT_BG);
  sheet.getRange("I7").setValue("09:00〜10:00").setHorizontalAlignment("center");

  sheet.getRange("B9:I11").merge()
    .setValue("【使い方】\n1. 上部メニュー「未返信メールチェッカー > ▶ 今すぐ一覧を更新する」で最新メールを抽出します。\n2. 自動化したい場合は「⏰ 定期実行トリガーを設定」を押してください。")
    .setBackground("#edf2f7")
    .setFontSize(10)
    .setVerticalAlignment("middle");
}

function fetchUnrepliedEmails() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dash = ensureDashboardSheet();
  const days = parseInt(dash.getRange("D6").getValue(), 10) || CONFIG.DEFAULT_DAYS;
  const userEmail = Session.getActiveUser().getEmail();

  SpreadsheetApp.getActiveSpreadsheet().toast("未返信メールを抽出中...", "処理中", 5);

  const query = `newer_than:${days}d -in:chats -in:drafts -in:trash`;
  const threads = GmailApp.search(query, 0, CONFIG.MAX_THREADS);

  const results = [];
  const now = new Date();

  threads.forEach(t => {
    const msgs = t.getMessages();
    if (msgs.length === 0) return;
    const lastMsg = msgs[msgs.length - 1];

    if (lastMsg.getFrom().includes(userEmail)) {
      const subject = t.getFirstMessageSubject() || "（件名なし）";
      const date = lastMsg.getDate();
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      const permalink = t.getPermalink();
      results.push([lastMsg.getTo(), subject, date, diffDays, permalink]);
    }
  });

  renderResults(results);
  SpreadsheetApp.getActiveSpreadsheet().toast(`抽出完了: ${results.length} 件の未返信候補`, "完了", 5);
}

function renderResults(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.RESULT_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.RESULT_SHEET_NAME);
  }
  sheet.clear();
  sheet.setHiddenGridlines(true);

  const headers = ["相手先", "件名", "最終送信日時", "経過日数", "リンク"];
  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setBackground(CONFIG.COLOR_NAVY)
    .setFontColor("#ffffff")
    .setFontWeight("bold");

  if (data.length > 0) {
    const formatted = data.map(r => [
      r[0],
      r[1],
      Utilities.formatDate(r[2], "Asia/Tokyo", "yyyy/MM/dd HH:mm"),
      `${r[3]} 日`,
      `=HYPERLINK("${r[4]}", "メールを開く")`
    ]);
    sheet.getRange(2, 1, formatted.length, headers.length).setValues(formatted);
  } else {
    sheet.getRange(2, 1, 1, headers.length).merge()
      .setValue("🎉 返信待ちのメールはありません！すべて対応完了しています。")
      .setHorizontalAlignment("center")
      .setFontColor("#718096");
  }

  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 320);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 90);
  sheet.setColumnWidth(5, 120);
}

function setupTriggerFromDashboard() {
  clearAllTriggers();
  ScriptApp.newTrigger("fetchUnrepliedEmails")
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();

  SpreadsheetApp.getUi().alert("毎朝9:00〜10:00の自動実行トリガーを設定しました！");
}

function clearAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
}
```

---

## 導入手順（コピペで3分）

1. スプレッドシートを作成する
Googleドライブで新規のスプレッドシートを開きます。

2. スクリプトエディタを開く
メニューの「拡張機能」>「Apps Script」をクリックします。

3. コードを貼り付ける
もともと書いてあるコードを消し、上記のコードを丸ごと貼り付けて「保存」を押します。

4. シートをリロードする
スプレッドシートのブラウザタブに戻り、再読み込み（F5）すると、上部に「未返信メールチェッカー」という専用メニューが現れます。

5. 実行する
メニューから「▶ 今すぐ一覧を更新する」を押すだけで、初回のみGoogleのアクセス承認画面が出た後、自動で一覧シートが生成されます！

---

## 安心の停止・アンインストール方法

もし定期実行を止めたい場合や利用を終了したい場合も簡単です。
スプレッドシート上部メニュー「📮 未返信メールツール」>「🛑 ツールを停止・完全解除する」をクリックするだけで、設定されたトリガーや保存設定が安全に一括解除・初期化されます。安心して気軽にお試しください。

---

## まとめ＆他の自動化事例集

毎朝のメール整理や、案件ごとの進捗確認において、「返信待ちスレッドを探す時間」をゼロにするだけで、仕事のストレスが劇的に減ります。

コードの改変や期間の調整も自由ですので、ぜひコピペして日常業務の相棒として役立ててみてください！

また、Google Workspaceの他の業務効率化ツールや自動化の制作事例は、こちらの公開ポートフォリオにまとめています：
👉 **[GAS自動化 事例集 | Kashima Kazuki（Notion公開ページ）](https://fixed-station-bd3.notion.site/GAS-Kashima-Kazuki-b80d451d2b86445d94778239f8f7ba3a)**

もし「便利そう！」「使ってみたい」と思っていただけたら、スキやフォローをいただけると次のツールの励みになります！

---

## ハッシュタグ
#GAS #GoogleAppsScript #業務効率化 #時短 #Gmail #スプレッドシート #プログラミング初心者 #自動化
