/**
 * ====================================================================
 * 【コピペで試せるGoogle Workspaceミニツール #2】
 * スプレッドシートからGoogleカレンダーへの予定一括登録ツール
 * --------------------------------------------------------------------
 * 使い方: このスプレッドシートを開き、上部メニュー「🗓️ カレンダー一括登録」から操作します。
 * 「予定一覧」シートに日時とタイトルを入力し、ワンクリックでカレンダーへ一括反映します。
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

// ====================================================================
// メニュー（利用者の目的に直結する操作のみ）
// ====================================================================
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

// ====================================================================
// メイン処理: 予定を一括登録
// ====================================================================
function registerEventsToCalendar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheets(ss);

  const eventSheet = ss.getSheetByName(CONFIG.SHEET_NAME_EVENTS);
  const lastRow = eventSheet.getLastRow();
  if (lastRow < 2) {
    ss.toast("登録対象の予定がありません（2行目以降に予定を入力してください）", "🗓️ 案内", 5);
    SpreadsheetApp.getUi().alert("🗓️ 登録対象の予定がありません", "「予定登録リスト」シートに登録したい予定を入力してから実行してください。", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const calendar = getTargetCalendar(ss);
  if (!calendar) return;

  const reminderMinutes = readReminderMinutes(ss);
  const dataRange = eventSheet.getRange(2, 1, lastRow - 1, 8);
  const values = dataRange.getValues();

  if (values.length === 0) {
    SpreadsheetApp.getUi().alert("🗓️ 対象の予定がありません", "予定登録リストにデータがありませんでした。", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

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

    // 既に登録済みの行はスキップ
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
        // 終日予定
        const endDate = endDateRaw ? new Date(endDateRaw) : new Date(startDate);
        endDate.setDate(endDate.getDate() + 1); // 終日終了日は翌日扱い
        event = calendar.createAllDayEvent(title, startDate, {
          location: location,
          description: description
        });
      } else {
        // 時間指定予定
        const endDate = endDateRaw ? new Date(endDateRaw) : new Date(startDate.getTime() + 60 * 60 * 1000); // 未指定なら1時間
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

// ====================================================================
// 未登録の予定の件数チェック
// ====================================================================
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

// ====================================================================
// カレンダー取得と設定読み込み
// ====================================================================
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

// ====================================================================
// シートとUIの構築
// ====================================================================
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

  // カード1: 対象カレンダー
  d.getRange("C5:D5").merge().setValue("📅 対象カレンダーID").setFontSize(10).setFontWeight("bold").setFontColor("#475569").setBackground("#f8fafc");
  d.getRange("C6:D6").merge().setValue("primary")
    .setFontSize(20).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setFontColor("#1e40af").setBackground("#eff6ff");
  d.getRange("C7:D8").merge().setValue("「primary」で自身のメインカレンダー\n（別カレンダーはIDを指定）")
    .setFontSize(9).setFontColor("#3b82f6").setHorizontalAlignment("center").setVerticalAlignment("middle").setBackground("#eff6ff");
  d.getRange("C5:D8").setBorder(true, true, true, true, false, false, "#bfdbfe", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  // カード2: 登録実績
  d.getRange("F5:G5").merge().setValue("📊 直近の登録実績").setFontSize(10).setFontWeight("bold").setFontColor("#475569").setBackground("#f8fafc");
  d.getRange("F6:G6").merge().setValue("- 件")
    .setFontSize(26).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setFontColor("#0f172a").setBackground("#f8fafc");
  d.getRange("F7:G8").merge().setValue("最終実行: まだ実行していません")
    .setFontSize(9).setFontColor("#64748b").setHorizontalAlignment("center").setVerticalAlignment("middle").setBackground("#f8fafc");
  d.getRange("F5:G8").setBorder(true, true, true, true, false, false, "#e2e8f0", SpreadsheetApp.BorderStyle.SOLID);

  // カード3: 通知リマインダー設定
  d.getRange("I5:J5").merge().setValue("⏰ ポップアップ通知").setFontSize(10).setFontWeight("bold").setFontColor("#475569").setBackground("#f8fafc");
  d.getRange(CONFIG.CELL_REMINDER_MINUTES).setValue(CONFIG.DEFAULT_REMINDER_MINUTES)
    .setFontSize(22).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setFontColor("#0f766e").setBackground("#ccfbf1");
  d.getRange("J6").setValue("分前に通知").setFontSize(12).setFontWeight("bold").setFontColor("#0f766e").setVerticalAlignment("middle").setBackground("#f0fdfa");
  d.getRange("I7:J8").merge().setValue("予定開始の何分前に通知するか\n（0で通知なし、1〜1440で指定）")
    .setFontSize(9).setFontColor("#0f766e").setHorizontalAlignment("center").setVerticalAlignment("middle").setBackground("#f0fdfa");
  d.getRange("I5:J8").setBorder(true, true, true, true, false, false, "#99f6e4", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  // 入力規則
  d.getRange(CONFIG.CELL_REMINDER_MINUTES).setDataValidation(
    SpreadsheetApp.newDataValidation().requireNumberBetween(0, 1440).setAllowInvalid(false).build()
  );

  // 使い方
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

  // 列幅
  [220, 150, 150, 90, 160, 240, 130, 160].forEach((w, i) => e.setColumnWidth(i + 1, w));

  // 日時フォーマットの初期設定（2〜100行）
  e.getRange("B2:C100").setNumberFormat("yyyy/MM/dd HH:mm");
  e.getRange("D2:D100").setHorizontalAlignment("center");
  e.getRange("G2:G100").setHorizontalAlignment("center");

  // 入力規則（終日フラグのチェックボックス）
  e.getRange("D2:D100").setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());

  return e;
}

function updateDashboardStats(ss, registeredCount, skipCount) {
  const dash = ss.getSheetByName(CONFIG.SHEET_NAME_DASHBOARD);
  if (!dash) return;
  dash.getRange("F6").setValue(`${registeredCount} 件 登録`);
  dash.getRange("F7:G8").merge().setValue(`最終実行: ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm")}\n（スキップ: ${skipCount}件）`);
}

// ====================================================================
// 安全停止・アンインストール関数
// ====================================================================
function uninstallTool() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.alert(
    "🛑 停止・完全解除の確認",
    "ツールの設定情報および自動化トリガーを解除しますか？\n（シートに入力された予定データはそのまま残ります）",
    ui.ButtonSet.YES_NO
  );
  if (res !== ui.Button.YES) return;

  // 関連トリガーの削除
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  const props = PropertiesService.getUserProperties();
  props.deleteAllProperties();

  SpreadsheetApp.getActiveSpreadsheet().toast("カレンダー連携ツールの初期化が完了しました", "🛑 解除完了", 5);
  ui.alert("🛑 解除が完了しました", "トリガーおよび設定情報はすべて安全に解除されました。\nシート上の予定データは保持されています。", ui.ButtonSet.OK);
}
