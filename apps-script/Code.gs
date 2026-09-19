const SHEET_NAME = "inquiries";
const DEFAULT_STATUS = "접수대기";
const ADMIN_TOKEN = "CHANGE_ME";
const STATUS_OPTIONS = ["접수대기", "상담중", "연락완료", "보류", "완료"];

function doGet() {
  return json_({ ok: true, message: "SELVERE inquiry API ready" });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json_({ ok: false, error: "요청 본문이 없습니다." });
    }

    const data = JSON.parse(e.postData.contents);
    const action = data.action || "create";

    if (action === "list") {
      return listInquiries_(data.token);
    }
    if (action === "update") {
      return updateInquiry_(data);
    }
    return createInquiry_(data);
  } catch (error) {
    return json_({ ok: false, error: String(error) });
  }
}

function createInquiry_(data) {
  const row = [
    Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss"),
    text_(data.clientName),
    text_(data.company),
    text_(data.phone),
    text_(data.email),
    text_(data.inquiryType),
    text_(data.message),
    DEFAULT_STATUS,
    data.privacyConsent ? "동의" : "미동의",
    ""
  ];

  if (!row[1] || !row[2] || !row[3] || !row[4] || !row[5] || !row[6]) {
    return json_({ ok: false, error: "필수 값이 비어 있습니다." });
  }

  const sheet = getSheet_();
  ensureHeader_(sheet);
  sheet.appendRow(row);
  return json_({ ok: true });
}

function listInquiries_(token) {
  if (!isAdmin_(token)) {
    return json_({ ok: false, error: "관리자 비밀번호가 올바르지 않습니다." });
  }

  const sheet = getSheet_();
  ensureHeader_(sheet);
  const lastRow = sheet.getLastRow();
  const items = [];

  if (lastRow >= 2) {
    const values = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
    for (var i = 0; i < values.length; i++) {
      const row = values[i];
      items.push({
        row: i + 2,
        timestamp: formatCell_(row[0]),
        name: formatCell_(row[1]),
        company: formatCell_(row[2]),
        phone: formatCell_(row[3]),
        email: formatCell_(row[4]),
        category: formatCell_(row[5]),
        message: formatCell_(row[6]),
        status: formatCell_(row[7]) || DEFAULT_STATUS,
        privacyConsent: formatCell_(row[8]),
        note: formatCell_(row[9])
      });
    }
  }

  items.reverse();
  return json_({ ok: true, items: items, statuses: STATUS_OPTIONS });
}

function updateInquiry_(data) {
  if (!isAdmin_(data.token)) {
    return json_({ ok: false, error: "관리자 비밀번호가 올바르지 않습니다." });
  }

  const rowNumber = Number(data.row);
  const status = text_(data.status);
  const note = text_(data.note);

  if (!rowNumber || rowNumber < 2) {
    return json_({ ok: false, error: "수정할 행이 올바르지 않습니다." });
  }
  if (STATUS_OPTIONS.indexOf(status) === -1) {
    return json_({ ok: false, error: "허용되지 않은 상태 값입니다." });
  }

  const sheet = getSheet_();
  ensureHeader_(sheet);
  if (rowNumber > sheet.getLastRow()) {
    return json_({ ok: false, error: "해당 문의가 없습니다." });
  }

  sheet.getRange(rowNumber, 8).setValue(status);
  sheet.getRange(rowNumber, 10).setValue(note);
  return json_({ ok: true });
}

function getSheet_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error("inquiries 시트를 찾을 수 없습니다.");
  }
  return sheet;
}

function ensureHeader_(sheet) {
  const headers = [
    "Timestamp",
    "Name",
    "Company",
    "Phone",
    "Email",
    "Category",
    "Message",
    "Status",
    "PrivacyConsent",
    "Note"
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function isAdmin_(token) {
  return ADMIN_TOKEN && ADMIN_TOKEN !== "CHANGE_ME" && token === ADMIN_TOKEN;
}

function text_(value) {
  return String(value || "").trim();
}

function formatCell_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
  }
  return text_(value);
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
