/**
 * ====================================================================
 * 【コピペで試せるGoogle Workspaceミニツール #1】
 * 未返信メール一覧ツール
 * --------------------------------------------------------------------
 * 使い方: このスプレッドシートを開き、上部メニュー「📮 未返信メールツール」から操作します。
 * 設定（探索日数・実行時刻・実行間隔）はすべて「ダッシュボード」シートのセルで変更できます。
 * ====================================================================
 */

const CONFIG = {
  DASHBOARD_VERSION: "v4",
  // ↓ すべて「シートが空・不正な値のとき」に使うデフォルト値（実際の値はシートから読む）
  DEFAULT_LOOKBACK_DAYS: 14,
  DEFAULT_TRIGGER_HOUR: 9,
  DEFAULT_TRIGGER_INTERVAL_DAYS: 1,
  SHEET_NAME_RESULT: "未返信一覧",
  SHEET_NAME_DASHBOARD: "ダッシュボード",
  MAX_THREADS: 150,
  TRIGGER_FUNCTION_NAME: "exportUnrepliedEmailsToSheet",
  // 設定セルの位置（ダッシュボード）
  CELL_LOOKBACK_DAYS: "C6",
  CELL_TRIGGER_HOUR: "I7",
  CELL_TRIGGER_INTERVAL: "I8",
  PROP_TRIGGER_HOUR: "UNREPLIED_TRIGGER_HOUR",
  PROP_TRIGGER_INTERVAL: "UNREPLIED_TRIGGER_INTERVAL"
};

// ====================================================================
// メニュー（利用者の目的に直結する操作のみ）
// ====================================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("📮 未返信メールツール")
    .addItem("▶ 今すぐ一覧を更新する", "exportUnrepliedEmailsToSheet")
    .addSeparator()
    .addItem("⏰ 自動実行を設定・更新する", "setupAutoTrigger")
    .addItem("🛑 ツールを停止・完全解除する", "uninstallTool")
    .addToUi();
  ensureDashboardSheet(SpreadsheetApp.getActiveSpreadsheet());
}

// ====================================================================
// メイン処理: 未返信メールを一覧化
// ====================================================================
function exportUnrepliedEmailsToSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureDashboardSheet(ss);

  const lookbackDays = readIntSetting(ss, CONFIG.CELL_LOOKBACK_DAYS, CONFIG.DEFAULT_LOOKBACK_DAYS, 1, 365);
  const myEmail = getMyEmail();
  const threads = GmailApp.search(`newer_than:${lookbackDays}d`, 0, CONFIG.MAX_THREADS);
  const now = new Date();
  const list = [];

  threads.forEach(thread => {
    const messages = thread.getMessages();
    if (!messages.length) return;
    const last = messages[messages.length - 1];
    if (!last.getFrom().toLowerCase().includes(myEmail)) return; // 最後の送信者が自分でなければ対象外

    const lastDate = last.getDate();
    const waitingDays = Math.floor((now - lastDate) / 86400000);
    if (waitingDays > lookbackDays) return;

    list.push({
      partner: formatPartner(last.getTo()),
      subject: thread.getFirstMessageSubject() || "(件名なし)",
      lastDate: Utilities.formatDate(lastDate, Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm"),
      waitingDays: waitingDays,
      link: `=HYPERLINK("${thread.getPermalink()}", "メールを開く ↗")`,
      raw: lastDate
    });
  });

  // 返信待ちが長い順
  list.sort((a, b) => a.raw - b.raw);

  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME_RESULT);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SHEET_NAME_RESULT, 0);
  sheet.clear();

  const headers = ["相手", "件名", "最終送信日", "返信待ち日数", "Gmailで開くリンク"];
  const rows = [headers];
  if (list.length === 0) {
    rows.push(["（未返信のメールはありません）", `直近 ${lookbackDays} 日間に、返信待ちのスレッドは見つかりませんでした`, "-", "-", "-"]);
  } else {
    list.forEach(i => rows.push([i.partner, i.subject, i.lastDate, i.waitingDays, i.link]));
  }
  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  formatResultSheet(sheet, rows.length, headers.length, list.length > 0);

  updateDashboardStatus(ss, list.length);
  ss.toast(`未返信候補を ${list.length} 件抽出しました`, "📮 更新完了", 5);
}

// ====================================================================
// ダッシュボード
// ====================================================================
function ensureDashboardSheet(ss) {
  const old = ss.getSheetByName(CONFIG.SHEET_NAME_DASHBOARD);
  if (old && old.getRange("Z1").getValue() === CONFIG.DASHBOARD_VERSION) return;

  // 旧レイアウトなら、利用者の設定値を引き継いで作り直す
  let keepDays = null, keepHour = null;
  if (old) {
    keepDays = old.getRange(CONFIG.CELL_LOOKBACK_DAYS).getValue();
    keepHour = old.getRange(CONFIG.CELL_TRIGGER_HOUR).getValue();
    ss.deleteSheet(old);
  }
  const d = buildDashboardSheet(ss);
  if (keepDays) d.getRange(CONFIG.CELL_LOOKBACK_DAYS).setValue(keepDays);
  if (keepHour !== null && keepHour !== "") d.getRange(CONFIG.CELL_TRIGGER_HOUR).setValue(keepHour);
  updateDashboardStatus(ss, null);
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

  d.getRange("C2").setValue("📮 未返信メール一覧ツール").setFontSize(20).setFontWeight("bold").setFontColor("#0f172a");
  d.getRange("C3").setValue("Gmailから「自分が最後に送信したまま、返信が止まっているスレッド」を自動で一覧化します")
    .setFontSize(10).setFontColor("#64748b");

  // カード1: 探索期間（設定）
  d.getRange("C5:D5").merge().setValue("⚙️ 探索する期間").setFontSize(10).setFontWeight("bold").setFontColor("#475569").setBackground("#f8fafc");
  d.getRange("C6:D6").merge().setValue(CONFIG.DEFAULT_LOOKBACK_DAYS)
    .setFontSize(26).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setFontColor("#1e40af").setBackground("#eff6ff");
  d.getRange("C7:D8").merge().setValue("日分さかのぼって探します\n（数字を書き換えて変更）")
    .setFontSize(9).setFontColor("#3b82f6").setHorizontalAlignment("center").setVerticalAlignment("middle").setBackground("#eff6ff");
  d.getRange("C5:D8").setBorder(true, true, true, true, false, false, "#bfdbfe", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  // カード2: 検出件数（表示）
  d.getRange("F5:G5").merge().setValue("📊 返信待ちの件数").setFontSize(10).setFontWeight("bold").setFontColor("#475569").setBackground("#f8fafc");
  d.getRange("F6:G6").merge().setValue("- 件")
    .setFontSize(26).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setFontColor("#0f172a").setBackground("#f8fafc");
  d.getRange("F7:G8").merge().setValue("最終更新: まだ実行していません")
    .setFontSize(9).setFontColor("#64748b").setHorizontalAlignment("center").setVerticalAlignment("middle").setBackground("#f8fafc");
  d.getRange("F5:G8").setBorder(true, true, true, true, false, false, "#e2e8f0", SpreadsheetApp.BorderStyle.SOLID);

  // カード3: 自動実行（時刻・間隔を設定）
  d.getRange("I5:J5").merge().setValue("⏰ 自動実行").setFontSize(10).setFontWeight("bold").setFontColor("#475569").setBackground("#f8fafc");
  d.getRange("I6:J6").merge().setValue("停止中")
    .setFontSize(22).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setFontColor("#64748b").setBackground("#f8fafc");
  styleInputCell(d.getRange(CONFIG.CELL_TRIGGER_HOUR).setValue(CONFIG.DEFAULT_TRIGGER_HOUR));
  d.getRange("J7").setValue("時台に実行（0〜23）").setFontSize(9).setFontColor("#0f766e").setVerticalAlignment("middle").setBackground("#f0fdfa");
  styleInputCell(d.getRange(CONFIG.CELL_TRIGGER_INTERVAL).setValue(CONFIG.DEFAULT_TRIGGER_INTERVAL_DAYS));
  d.getRange("J8").setValue("日に1回実行（1＝毎日）").setFontSize(9).setFontColor("#0f766e").setVerticalAlignment("middle").setBackground("#f0fdfa");
  d.getRange("I5:J8").setBorder(true, true, true, true, false, false, "#99f6e4", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  // 入力規則（不正値をシート側で防ぐ）
  d.getRange(CONFIG.CELL_LOOKBACK_DAYS).setDataValidation(SpreadsheetApp.newDataValidation().requireNumberBetween(1, 365).setAllowInvalid(false).build());
  d.getRange(CONFIG.CELL_TRIGGER_HOUR).setDataValidation(SpreadsheetApp.newDataValidation().requireNumberBetween(0, 23).setAllowInvalid(false).build());
  d.getRange(CONFIG.CELL_TRIGGER_INTERVAL).setDataValidation(SpreadsheetApp.newDataValidation().requireNumberBetween(1, 30).setAllowInvalid(false).build());

  // 使い方
  d.getRange("C11").setValue("📖 使い方").setFontSize(12).setFontWeight("bold").setFontColor("#0f172a");
  const guide = [
    ["1", "期間を決める", "青いカードの数字（何日分さかのぼるか）を書き換えます"],
    ["2", "一覧を更新する", "上部メニュー「📮 未返信メールツール」→「▶ 今すぐ一覧を更新する」"],
    ["3", "結果を見る", "「未返信一覧」タブに、メールへのリンク付きで並びます"],
    ["4", "自動化する（任意）", "緑のカードで時刻と間隔を決め、メニュー「⏰ 自動実行を設定・更新する」"]
  ];
  guide.forEach((g, i) => {
    const r = 12 + i;
    d.setRowHeight(r, 28);
    d.getRange(r, 3).setValue("STEP " + g[0]).setFontWeight("bold").setFontColor("#3b82f6");
    d.getRange(r, 4).setValue(g[1]).setFontWeight("bold").setFontColor("#1e293b");
    d.getRange(r, 5, 1, 6).merge().setValue(g[2]).setFontColor("#64748b");
    d.getRange(r, 3, 1, 8).setBorder(false, false, true, false, false, false, "#f1f5f9", SpreadsheetApp.BorderStyle.SOLID);
  });
  d.getRange("C17").setValue("※ 一覧は「返信漏れの確定」ではなく「確認したほうがよい候補」です。").setFontSize(9).setFontColor("#94a3b8");
  return d;
}

function styleInputCell(range) {
  range.setFontSize(14).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setFontColor("#0f766e").setBackground("#ccfbf1");
}

function updateDashboardStatus(ss, count) {
  const d = ss.getSheetByName(CONFIG.SHEET_NAME_DASHBOARD);
  if (!d) return;
  if (count !== null) {
    d.getRange("F6").setValue(count + " 件");
    d.getRange("F7").setValue("最終更新: " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm"));
  }
  const t = getTriggerInfo();
  if (t) {
    d.getRange("I6").setValue(`稼働中｜${t.interval === 1 ? "毎日" : t.interval + "日ごと"} ${t.hour}時台`).setFontSize(14).setFontColor("#15803d").setBackground("#f0fdf4");
  } else {
    d.getRange("I6").setValue("停止中").setFontSize(22).setFontColor("#64748b").setBackground("#f8fafc");
  }
}

// ====================================================================
// 自動実行トリガー（時刻・間隔はシートの設定セルから読む）
// ====================================================================
function setupAutoTrigger() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureDashboardSheet(ss);
  const hour = readIntSetting(ss, CONFIG.CELL_TRIGGER_HOUR, CONFIG.DEFAULT_TRIGGER_HOUR, 0, 23);
  const interval = readIntSetting(ss, CONFIG.CELL_TRIGGER_INTERVAL, CONFIG.DEFAULT_TRIGGER_INTERVAL_DAYS, 1, 30);

  deleteOwnTriggers();
  ScriptApp.newTrigger(CONFIG.TRIGGER_FUNCTION_NAME).timeBased().everyDays(interval).atHour(hour).create();

  const props = PropertiesService.getUserProperties();
  props.setProperty(CONFIG.PROP_TRIGGER_HOUR, String(hour));
  props.setProperty(CONFIG.PROP_TRIGGER_INTERVAL, String(interval));
  updateDashboardStatus(ss, null);

  const when = interval === 1 ? "毎日" : `${interval}日ごと`;
  SpreadsheetApp.getUi().alert("⏰ 自動実行を設定しました",
    `${when} ${hour}:00〜${hour + 1}:00 のあいだに自動で一覧を更新します。\n時刻や間隔を変えたいときは、緑のカードの数字を変えてもう一度このメニューを押してください。`,
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function uninstallTool() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.alert(
    "🛑 停止・トリガー全解除の確認",
    "設定済みの自動実行トリガーおよび保存設定をすべて解除しますか？\n（再度「自動実行を設定」を押せばいつでも再開できます）",
    ui.ButtonSet.YES_NO
  );
  if (res !== ui.Button.YES) return;

  deleteOwnTriggers();
  const props = PropertiesService.getUserProperties();
  props.deleteProperty(CONFIG.PROP_TRIGGER_HOUR);
  props.deleteProperty(CONFIG.PROP_TRIGGER_INTERVAL);
  updateDashboardStatus(SpreadsheetApp.getActiveSpreadsheet(), null);
  SpreadsheetApp.getActiveSpreadsheet().toast("自動実行トリガーをすべて解除しました", "🛑 解除完了", 5);
  ui.alert("🛑 解除が完了しました", "自動実行トリガーと設定情報はすべて停止・解除されました。\nシート上のデータはそのまま保持されます。", ui.ButtonSet.OK);
}

function removeAutoTrigger() {
  uninstallTool();
}

function deleteOwnTriggers() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === CONFIG.TRIGGER_FUNCTION_NAME)
    .forEach(t => ScriptApp.deleteTrigger(t));
}

function getTriggerInfo() {
  const exists = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === CONFIG.TRIGGER_FUNCTION_NAME);
  if (!exists) return null;
  const props = PropertiesService.getUserProperties();
  return {
    hour: parseInt(props.getProperty(CONFIG.PROP_TRIGGER_HOUR), 10) || CONFIG.DEFAULT_TRIGGER_HOUR,
    interval: parseInt(props.getProperty(CONFIG.PROP_TRIGGER_INTERVAL), 10) || CONFIG.DEFAULT_TRIGGER_INTERVAL_DAYS
  };
}

// ====================================================================
// 補助関数
// ====================================================================
function readIntSetting(ss, cell, fallback, min, max) {
  const d = ss.getSheetByName(CONFIG.SHEET_NAME_DASHBOARD);
  if (!d) return fallback;
  const n = parseInt(d.getRange(cell).getValue(), 10);
  if (isNaN(n) || n < min || n > max) return fallback;
  return n;
}

function getMyEmail() {
  let email = "";
  try { email = Session.getActiveUser().getEmail(); } catch (e) {}
  if (!email) { try { email = Session.getEffectiveUser().getEmail(); } catch (e) {} }
  return (email || "").toLowerCase();
}

function formatPartner(rawTo) {
  if (!rawTo || !rawTo.trim()) return "(宛先不明)";
  const first = rawTo.split(",")[0].trim();
  const m = first.match(/^(?:"?([^"]*)"?\s)?(?:<?(.+@[^>]+)>?)$/);
  if (m) {
    const name = (m[1] || "").trim();
    const email = (m[2] || "").trim();
    if (name && email) return `${name} <${email}>`;
    return name || email;
  }
  return first;
}

function formatResultSheet(sheet, rowCount, colCount, hasData) {
  sheet.setHiddenGridlines(true);
  sheet.setRowHeight(1, 36);
  sheet.getRange(1, 1, 1, colCount).setBackground("#0f172a").setFontColor("#ffffff").setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sheet.setFrozenRows(1);

  for (let r = 2; r <= rowCount; r++) {
    sheet.setRowHeight(r, 30);
    sheet.getRange(r, 1, 1, colCount).setBackground(r % 2 === 0 ? "#ffffff" : "#f8fafc").setVerticalAlignment("middle");
  }
  if (rowCount > 1) {
    sheet.getRange(2, 3, rowCount - 1, 3).setHorizontalAlignment("center");
    if (hasData) {
      sheet.getRange(2, 4, rowCount - 1, 1).setNumberFormat('0"日"').setFontWeight("bold");
      sheet.getRange(2, 5, rowCount - 1, 1).setFontColor("#2563eb");
      // 7日以上の返信待ちを強調
      const rule = SpreadsheetApp.newConditionalFormatRule()
        .whenNumberGreaterThanOrEqualTo(7).setBackground("#fee2e2").setFontColor("#b91c1c")
        .setRanges([sheet.getRange(2, 4, rowCount - 1, 1)]).build();
      sheet.setConditionalFormatRules([rule]);
    } else {
      sheet.getRange(2, 1, 1, colCount).setFontColor("#64748b");
    }
    sheet.getRange(1, 1, rowCount, colCount).setBorder(true, true, true, true, false, true, "#e2e8f0", SpreadsheetApp.BorderStyle.SOLID);
  }
  [240, 360, 150, 120, 150].forEach((w, i) => sheet.setColumnWidth(i + 1, w));
}
