// Google Apps Script
// 部署設定：執行者 = 我，存取 = 任何人（含匿名）

function doGet(e) {
  var uid  = e.parameter.uid  || '';
  var name = e.parameter.name || '顧客';

  if (!uid) {
    return respond({ status: 'error', message: 'missing uid' });
  }

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Records');
  if (!sheet) {
    sheet = ss.insertSheet('Records');
    sheet.appendRow(['LINE_UID', '顯示名稱', '使用時間', '驗證碼']);
    sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  }

  // 檢查過去 30 天是否已使用
  var now  = new Date();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === uid) {
      var usedAt   = new Date(data[i][2]);
      var diffDays = Math.floor((now - usedAt) / 86400000);
      if (diffDays < 30) {
        return respond({ status: 'used', daysRemaining: 30 - diffDays });
      }
    }
  }

  // 產生驗證碼（4 碼數字，每天換）
  var dateStr = Utilities.formatDate(now, 'Asia/Taipei', 'yyyyMMdd');
  var seed    = parseInt(dateStr) + uid.split('').reduce(function(a, c) { return a + c.charCodeAt(0); }, 0);
  var code    = (((seed % 9000) + 1000) % 9000 + 1000).toString().slice(0, 4);

  // 記錄
  sheet.appendRow([uid, name, now, code]);

  return respond({ status: 'ok', code: code, name: name });
}

function respond(obj) {
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
