# 【コピペで完成】スプレッドシートからGoogleカレンダーへ予定を一括登録するGAS【時短・自動化】

## こんな悩み、ありませんか？

- 会議や面談、セミナー、現場作業などの日程を、Googleカレンダーに1件ずつ手作業で登録していて時間がかかる
- 日時や場所のコピペミス、入力漏れでダブルブッキングしそうになったことがある
- 「スプレッドシートで一覧管理している予定を、ボタン1つでカレンダーにまとめて同期できたらいいのに…」と思ったことがある

今回は、スプレッドシートに入力した予定を、**メニューからワンクリックするだけでGoogleカレンダーへ一括登録するGAS（Google Apps Script）** を作りました！

日時の指定はもちろん、終日予定や通知設定（◯分前リマインダー）にも対応。
一度登録した行には自動で「✅ 登録完了」が付くため、二重登録の心配もありません。

---

## 目次
1. 最初に知っておいてほしいこと
2. できること
3. 全体のイメージ
4. 事前に準備するもの
5. コピペで使えるコード全文
6. かんたん導入手順（Step 1〜3）
7. 安心の停止・アンインストール方法
8. まとめ＆他の自動化事例集
9. ハッシュタグ

---

## 最初に知っておいてほしいこと

- **安全なコンテナバインド型**: このスプレッドシートの中だけで動くため、外部にデータが漏れる心配はありません。
- **初回実行時の権限承認**: 最初に実行する際のみ、Googleからカレンダーアクセスの許可画面が表示されます。「詳細」>「安全ではないページに移動」をクリックして承認してください。
- **二重登録防止**: 「登録ステータス」列が「✅ 登録完了」になっている行は自動でスキップされるため、何度実行しても安全です。

---

## できること

1. **ワンクリックでカレンダー一括同期**: シートの表に並んだ予定を、ボタン1つで指定カレンダーへ自動反映。
2. **終日予定・通知リマインダー対応**: 「終日」チェックを入れるだけで終日イベントとして登録され、ダッシュボードから通知分数の設定も可能。
3. **二重登録の自動ガード＆件数事前チェック**: 事前に「未登録が何件あるか」を確認でき、登録済みの予定は自動スキップ。

---

## 全体のイメージ

スプレッドシートの「予定登録リスト」に予定を並べ、上部メニュー「🗓️ カレンダー一括登録」→「▶ 今すぐ予定を一括登録する」をクリックするだけで、一瞬でカレンダーに反映されます。

---

## 事前に準備するもの

1. Googleアカウント（Gmail / Google Workspace）
2. 新規のGoogleスプレッドシート（1枚）

---

## コピペで使えるコード全文

以下のコードを丸ごとコピーして貼り付けるだけで、すぐにお使いいただけます。

```javascript
/**
 * ====================================================================
 * 【コピペで試せるGoogle Workspaceミニツール #2】
 * スプレッドシートからGoogleカレンダーへの予定一括登録ツール
 * --------------------------------------------------------------------
 * 使い方: このスプレッドシートを開き、上部メニュー「🗓️ カレンダー一括登録」から操作します。
 * 「予定登録リスト」シートに日時とタイトルを入力し、ワンクリックでカレンダーへ一括反映します。
 * ====================================================================
 */

const CONFIG = {
  DASHBOARD_VERSION: "v1",
  SHEET_NAME_DASHBOARD: "ダッシュボード",
  SHEET_NAME_EVENTS: "予定登録リスト",
  CELL_CALENDAR_ID: "C6",
  CELL_REMINDER_MINUTES: "I6",
  DEFAULT_REMINDER_MINUTES: 10,
  STATUS_DONE: "✅ 登録完了",
  STATUS_ERROR: "❌ エラー"
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🗓️ カレンダー一括登録")
    .addItem("▶ 今すぐ予定を一括登録する", "registerEventsToCalendar")
    .addItem("🔍 未登録の予定を件数確認する", "checkPendingEventsCount")
    .addSeparator()
    .addItem("🛑 ツールを停止・完全解除する", "uninstallTool")
    .addToUi();
  ensureSheets(SpreadsheetApp.getActiveSpreadsheet());
}

function registerEventsToCalendar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheets(ss);

  const eventSheet = ss.getSheetByName(CONFIG.SHEET_NAME_EVENTS);
  const lastRow = eventSheet.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("🗓️ 登録対象の予定がありません", "「予定登録リスト」シートに登録したい予定を入力してから実行してください。", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const calendar = getTargetCalendar(ss);
  if (!calendar) return;

  const reminderMinutes = readReminderMinutes(ss);
  const dataRange = eventSheet.getRange(2, 1, lastRow - 1, 8);
  const values = dataRange.getValues();

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const rowIndex = i + 2;
    const title = String(row[0] || "").trim();
    const startDateRaw = row[1];
    const endDateRaw = row[2];
    const isAllDay = row[3] === true || String(row[3]).toLowerCase() === "true" || row[3] === "終日";
    const location = String(row[4] || "").trim();
    const description = String(row[5] || "").trim();
    const currentStatus = String(row[6] || "").trim();

    if (currentStatus === CONFIG.STATUS_DONE) {
      skipCount++;
      continue;
    }

    if (!title || !startDateRaw) {
      if (title || startDateRaw) {
        eventSheet.getRange(rowIndex, 7).setValue("❌ タイトルまたは開始日不足").setFontColor("#dc2626");
        errorCount++;
      }
      continue;
    }

    try {
      const startDate = new Date(startDateRaw);
      let event;

      if (isAllDay) {
        const endDate = endDateRaw ? new Date(endDateRaw) : new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        event = calendar.createAllDayEvent(title, startDate, {
          location: location,
          description: description
        });
      } else {
        const endDate = endDateRaw ? new Date(endDateRaw) : new Date(startDate.getTime() + 60 * 60 * 1000);
        event = calendar.createEvent(title, startDate, endDate, {
          location: location,
          description: description
        });
      }

      if (reminderMinutes > 0 && event.addPopupReminder) {
        try { event.addPopupReminder(reminderMinutes); } catch (e) {}
      }

      const eventId = event.getId();
      eventSheet.getRange(rowIndex, 7).setValue(CONFIG.STATUS_DONE).setFontColor("#15803d").setFontWeight("bold");
      eventSheet.getRange(rowIndex, 8).setValue(eventId).setFontColor("#64748b");
      successCount++;
    } catch (err) {
      eventSheet.getRange(rowIndex, 7).setValue("❌ 登録失敗: " + err.message).setFontColor("#dc2626");
      errorCount++;
    }
  }

  updateDashboardStats(ss, successCount, skipCount);

  if (successCount === 0 && errorCount === 0) {
    SpreadsheetApp.getUi().alert(
      "🗓️ 対象の予定がありませんでした",
      `未登録の新しい予定は見つかりませんでした。\n（既に登録済みの予定: ${skipCount} 件）`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } else {
    SpreadsheetApp.getUi().alert(
      "🎉 カレンダー一括登録が完了しました",
      `・新規登録完了: ${successCount} 件\n・登録済みスキップ: ${skipCount} 件\n・エラー件数: ${errorCount} 件\n\nGoogleカレンダーに反映されていることをご確認ください。`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

function checkPendingEventsCount() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheets(ss);
  const eventSheet = ss.getSheetByName(CONFIG.SHEET_NAME_EVENTS);
  const lastRow = eventSheet.getLastRow();

  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("🔍 確認結果", "登録対象の予定がありません。シートに入力してください。", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const values = eventSheet.getRange(2, 1, lastRow - 1, 7).getValues();
  let pendingCount = 0;
  let doneCount = 0;

  values.forEach(row => {
    const title = String(row[0] || "").trim();
    const status = String(row[6] || "").trim();
    if (title) {
      if (status === CONFIG.STATUS_DONE) doneCount++;
      else pendingCount++;
    }
  });

  if (pendingCount === 0) {
    SpreadsheetApp.getUi().alert("🔍 確認結果", `現在、未登録の新しい予定はありませんでした。\n（全 ${doneCount} 件が登録済みです）`, SpreadsheetApp.getUi().ButtonSet.OK);
  } else {
    SpreadsheetApp.getUi().alert("🔍 確認結果", `現在、一括登録可能な未登録予定が 【 ${pendingCount} 件 】 あります。\nメニュー「▶ 今すぐ予定を一括登録する」から登録できます。`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function getTargetCalendar(ss) {
  const dash = ss.getSheetByName(CONFIG.SHEET_NAME_DASHBOARD);
  let calId = "";
  if (dash) {
    calId = String(dash.getRange(CONFIG.CELL_CALENDAR_ID).getValue() || "").trim();
  }

  try {
    if (!calId || calId === "primary" || calId === "メインカレンダー") {
      return CalendarApp.getDefaultCalendar();
    }
    const cal = CalendarApp.getCalendarById(calId);
    if (!cal) {
      SpreadsheetApp.getUi().alert("❌ カレンダーが見つかりません", `指定されたカレンダーID [${calId}] が見つかりませんでした。ダッシュボードの設定を確認してください。`, SpreadsheetApp.getUi().ButtonSet.OK);
      return null;
    }
    return cal;
  } catch (err) {
    SpreadsheetApp.getUi().alert("❌ カレンダー取得エラー", `カレンダーのアクセス権限またはIDを確認してください: ${err.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
    return null;
  }
}

function readReminderMinutes(ss) {
  const dash = ss.getSheetByName(CONFIG.SHEET_NAME_DASHBOARD);
  if (!dash) return CONFIG.DEFAULT_REMINDER_MINUTES;
  const val = parseInt(dash.getRange(CONFIG.CELL_REMINDER_MINUTES).getValue(), 10);
  if (isNaN(val) || val < 0 || val > 1440) return CONFIG.DEFAULT_REMINDER_MINUTES;
  return val;
}

function ensureSheets(ss) {
  let dash = ss.getSheetByName(CONFIG.SHEET_NAME_DASHBOARD);
  if (!dash) dash = buildDashboardSheet(ss);

  let events = ss.getSheetByName(CONFIG.SHEET_NAME_EVENTS);
  if (!events) events = buildEventsSheet(ss);
}

function buildDashboardSheet(ss) {
  const d = ss.insertSheet(CONFIG.SHEET_NAME_DASHBOARD, 0);
  d.setHiddenGridlines(true);
  d.getRange("Z1").setValue(CONFIG.DASHBOARD_VERSION).setFontColor("#ffffff");

  [24, 24, 160, 160, 24, 160, 160, 24, 90, 230].forEach((w, i) => d.setColumnWidth(i + 1, w));
  d.setRowHeight(2, 45);
  d.setRowHeight(3, 24);
  d.setRowHeight(4, 16);
  d.setRowHeight(5, 28);
  d.setRowHeight(6, 56);
  d.setRowHeight(7, 30);
  d.setRowHeight(8, 30);

  d.getRange("C2").setValue("🗓️ Googleカレンダー予定一括登録ツール").setFontSize(20).setFontWeight("bold").setFontColor("#0f172a");
  d.getRange("C3").setValue("スプレッドシートの表から、ワンクリックでGoogleカレンダーへ予定を一括同期します")
    .setFontSize(10).setFontColor("#64748b");

  d.getRange("C5:D5").merge().setValue("📅 対象カレンダーID").setFontSize(10).setFontWeight("bold").setFontColor("#475569").setBackground("#f8fafc");
  d.getRange("C6:D6").merge().setValue("primary")
    .setFontSize(20).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setFontColor("#1e40af").setBackground("#eff6ff");
  d.getRange("C7:D8").merge().setValue("「primary」で自身のメインカレンダー\n（別カレンダーはIDを指定）")
    .setFontSize(9).setFontColor("#3b82f6").setHorizontalAlignment("center").setVerticalAlignment("middle").setBackground("#eff6ff");
  d.getRange("C5:D8").setBorder(true, true, true, true, false, false, "#bfdbfe", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  d.getRange("F5:G5").merge().setValue("📊 直近の登録実績").setFontSize(10).setFontWeight("bold").setFontColor("#475569").setBackground("#f8fafc");
  d.getRange("F6:G6").merge().setValue("- 件")
    .setFontSize(26).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setFontColor("#0f172a").setBackground("#f8fafc");
  d.getRange("F7:G8").merge().setValue("最終実行: まだ実行していません")
    .setFontSize(9).setFontColor("#64748b").setHorizontalAlignment("center").setVerticalAlignment("middle").setBackground("#f8fafc");
  d.getRange("F5:G8").setBorder(true, true, true, true, false, false, "#e2e8f0", SpreadsheetApp.BorderStyle.SOLID);

  d.getRange("I5:J5").merge().setValue("⏰ ポップアップ通知").setFontSize(10).setFontWeight("bold").setFontColor("#475569").setBackground("#f8fafc");
  d.getRange(CONFIG.CELL_REMINDER_MINUTES).setValue(CONFIG.DEFAULT_REMINDER_MINUTES)
    .setFontSize(22).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setFontColor("#0f766e").setBackground("#ccfbf1");
  d.getRange("J6").setValue("分前に通知").setFontSize(12).setFontWeight("bold").setFontColor("#0f766e").setVerticalAlignment("middle").setBackground("#f0fdfa");
  d.getRange("I7:J8").merge().setValue("予定開始の何分前に通知するか\n（0で通知なし、1〜1440で指定）")
    .setFontSize(9).setFontColor("#0f766e").setHorizontalAlignment("center").setVerticalAlignment("middle").setBackground("#f0fdfa");
  d.getRange("I5:J8").setBorder(true, true, true, true, false, false, "#99f6e4", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  d.getRange(CONFIG.CELL_REMINDER_MINUTES).setDataValidation(
    SpreadsheetApp.newDataValidation().requireNumberBetween(0, 1440).setAllowInvalid(false).build()
  );

  d.getRange("C11").setValue("📖 使い方").setFontSize(12).setFontWeight("bold").setFontColor("#0f172a");
  const guide = [
    ["1", "予定を入力", "「予定登録リスト」シートにタイトル・開始日時・終了日時などを入力します"],
    ["2", "事前チェック", "上部メニュー「🗓️ カレンダー一括登録」→「🔍 未登録の予定を件数確認する」"],
    ["3", "一括登録を実行", "メニュー「▶ 今すぐ予定を一括登録する」をクリック（初回のみアクセス承認）"],
    ["4", "結果確認", "ステータス列に「✅ 登録完了」が付き、二重登録を自動防止します"]
  ];
  guide.forEach((g, i) => {
    const r = 12 + i;
    d.setRowHeight(r, 28);
    d.getRange(r, 3).setValue("STEP " + g[0]).setFontWeight("bold").setFontColor("#3b82f6");
    d.getRange(r, 4).setValue(g[1]).setFontWeight("bold").setFontColor("#1e293b");
    d.getRange(r, 5, 1, 6).merge().setValue(g[2]).setFontColor("#64748b");
    d.getRange(r, 3, 1, 8).setBorder(false, false, true, false, false, false, "#f1f5f9", SpreadsheetApp.BorderStyle.SOLID);
  });

  return d;
}

function buildEventsSheet(ss) {
  const e = ss.insertSheet(CONFIG.SHEET_NAME_EVENTS);
  e.setHiddenGridlines(true);
  e.setRowHeight(1, 36);

  const headers = ["予定タイトル", "開始日時", "終了日時", "終日フラグ", "場所", "詳細・メモ", "登録ステータス", "カレンダーEventID"];
  e.getRange(1, 1, 1, headers.length).setValues([headers])
    .setBackground("#0f172a").setFontColor("#ffffff").setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  e.setFrozenRows(1);

  [220, 150, 150, 90, 160, 240, 130, 160].forEach((w, i) => e.setColumnWidth(i + 1, w));
  e.getRange("B2:C100").setNumberFormat("yyyy/MM/dd HH:mm");
  e.getRange("D2:D100").setHorizontalAlignment("center");
  e.getRange("G2:G100").setHorizontalAlignment("center");
  e.getRange("D2:D100").setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());

  return e;
}

function updateDashboardStats(ss, registeredCount, skipCount) {
  const dash = ss.getSheetByName(CONFIG.SHEET_NAME_DASHBOARD);
  if (!dash) return;
  dash.getRange("F6").setValue(`${registeredCount} 件 登録`);
  dash.getRange("F7:G8").merge().setValue(`最終実行: ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm")}\n（スキップ: ${skipCount}件）`);
}

function uninstallTool() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.alert(
    "🛑 停止・完全解除の確認",
    "ツールの設定情報および自動化トリガーを解除しますか？\n（シートに入力された予定データはそのまま残ります）",
    ui.ButtonSet.YES_NO
  );
  if (res !== ui.Button.YES) return;

  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  const props = PropertiesService.getUserProperties();
  props.deleteAllProperties();

  SpreadsheetApp.getActiveSpreadsheet().toast("カレンダー連携ツールの初期化が完了しました", "🛑 解除完了", 5);
  ui.alert("🛑 解除が完了しました", "トリガーおよび設定情報はすべて安全に解除されました。\nシート上の予定データは保持されています。", ui.ButtonSet.OK);
}
```

---

## かんたん導入手順（Step 1〜3）

### Step 1: スプレッドシートを新規作成
Googleドライブで新しいGoogleスプレッドシートを作成します。

### Step 2: Apps Scriptエディタを開いて貼り付け
上部メニュー「拡張機能」>「Apps Script」を開き、上記のコードを丸ごと貼り付けて保存（Ctrl + S）します。

### Step 3: シートを再読み込みして実行
スプレッドシートのタブに戻り、再読み込み（F5）すると、上部に専用メニュー「🗓️ カレンダー一括登録」が表示されます！
あとは「予定登録リスト」に予定を書き込み、メニューから実行するだけで完了です。

---

## 安心の停止・アンインストール方法

もしツールの利用を終了したい場合や初期化したい場合も簡単です。
スプレッドシート上部メニュー「🗓️ カレンダー一括登録」>「🛑 ツールを停止・完全解除する」をクリックするだけで、設定やトリガーが安全に一括解除されます。シート上の予定データは消えませんので、いつでも安心してお試しいただけます。

---

## まとめ＆他の自動化事例集

複数日程の予定作成、シフトや面談のスケジュール登録など、これまで手作業で1件ずつ行っていた作業が「コピペ＋ボタン1押し」で完了します。

業務の小さな自動化を積み重ねることで、毎日の仕事が驚くほど軽くなります。ぜひお気軽にお試しください！

また、Google Workspaceの他の業務効率化ツールや自動化の制作事例は、こちらの公開ポートフォリオにまとめています：
👉 **[GAS自動化 事例集 | Kashima Kazuki（Notion公開ページ）](https://fixed-station-bd3.notion.site/GAS-Kashima-Kazuki-b80d451d2b86445d94778239f8f7ba3a)**

もし「便利そう！」「使ってみたい」と思っていただけたら、スキやフォローをいただけると次のツールの励みになります！

---

## ハッシュタグ
#GAS #GoogleAppsScript #Googleカレンダー #スプレッドシート #業務効率化 #時短 #スケジュール管理 #自動化
