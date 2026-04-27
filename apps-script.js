// Google Apps Script
// 部署設定：執行者 = 我，存取 = 任何人（含匿名）
// 更新部署時選「管理部署 → 編輯 → 版本：新版本」，URL 不會變

var HEADERS = ['LINE_UID', '顯示名稱', 'LIFF驗證時間', '驗證碼', '來源影片', '消費金額', '桌號', '人數', '核銷時間', '核銷狀態'];

function doGet(e) {
  var action = e.parameter.action || 'verify';
  if (action === 'verify') return handleVerify(e);
  if (action === 'redeem') return handleRedeem(e);
  return respond({ status: 'error', message: 'unknown action' });
}

function getSheet() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Records');
  if (!sheet) {
    sheet = ss.insertSheet('Records');
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

// 客人掃 QR → LIFF 驗證身份
function handleVerify(e) {
  var uid    = e.parameter.uid    || '';
  var name   = e.parameter.name   || '顧客';
  var source = e.parameter.source || 'direct';

  if (!uid) return respond({ status: 'error', message: 'missing uid' });

  var sheet = getSheet();
  var now   = new Date();
  var data  = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === uid) {
      var usedAt   = new Date(data[i][2]);
      var diffDays = Math.floor((now - usedAt) / 86400000);
      if (diffDays < 30) {
        return respond({ status: 'used', daysRemaining: 30 - diffDays });
      }
    }
  }

  var dateStr = Utilities.formatDate(now, 'Asia/Taipei', 'yyyyMMdd');
  var seed    = parseInt(dateStr) + uid.split('').reduce(function(a, c) { return a + c.charCodeAt(0); }, 0);
  var code    = (((seed % 9000) + 1000) % 9000 + 1000).toString().slice(0, 4);

  // LINE_UID, 顯示名稱, LIFF驗證時間, 驗證碼, 來源影片, 消費金額, 桌號, 人數, 核銷時間, 核銷狀態
  sheet.appendRow([uid, name, now, code, source, '', '', '', '', '']);

  return respond({ status: 'ok', code: code, name: name });
}

// 店員輸入驗證碼 + 消費金額核銷
function handleRedeem(e) {
  var code   = e.parameter.code   || '';
  var amount = e.parameter.amount || '';
  var table  = e.parameter.table  || '';
  var pax    = e.parameter.pax    || '';

  if (!code || !amount) return respond({ status: 'error', message: 'missing code or amount' });

  var sheet = getSheet();
  var now   = new Date();
  var today = Utilities.formatDate(now, 'Asia/Taipei', 'yyyy/MM/dd');
  var data  = sheet.getDataRange().getValues();

  for (var i = data.length - 1; i >= 1; i--) {
    var rowCode     = data[i][3] ? data[i][3].toString() : '';
    var rowVerifyAt = data[i][2] ? new Date(data[i][2]) : null;
    var rowDate     = rowVerifyAt ? Utilities.formatDate(rowVerifyAt, 'Asia/Taipei', 'yyyy/MM/dd') : '';
    var rowRedeemed = data[i][9] || '';

    if (rowCode === code && rowDate === today && !rowRedeemed) {
      // 欄位：消費金額(6), 桌號(7), 人數(8), 核銷時間(9), 核銷狀態(10)
      sheet.getRange(i + 1, 6).setValue(parseInt(amount));
      sheet.getRange(i + 1, 7).setValue(table);
      sheet.getRange(i + 1, 8).setValue(pax ? parseInt(pax) : '');
      sheet.getRange(i + 1, 9).setValue(now);
      sheet.getRange(i + 1, 10).setValue('✓');
      return respond({ status: 'ok', name: data[i][1], amount: parseInt(amount) });
    }
  }

  return respond({ status: 'error', message: 'invalid or already redeemed' });
}

function respond(obj) {
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
