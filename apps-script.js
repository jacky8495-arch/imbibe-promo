// Google Apps Script - 貼到 script.google.com 並部署為 Web App
// 部署設定：執行者 = 我，存取 = 任何人

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  // 第一次執行時建立標題列
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['時間', '日期', '消費金額', '桌號', '人數']);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  }

  const data = JSON.parse(e.postData.contents);
  const ts = new Date(data.ts);

  sheet.appendRow([
    Utilities.formatDate(ts, 'Asia/Taipei', 'HH:mm'),
    Utilities.formatDate(ts, 'Asia/Taipei', 'yyyy-MM-dd'),
    data.amount,
    data.table || '',
    data.pax || ''
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return ContentService
    .createTextOutput('IMBIBE tracking endpoint is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}
