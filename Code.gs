/**
 * Google Apps Script Web App for WorkTrack IPC Dashboard
 * 
 * Instructions:
 * 1. Open Google Sheets.
 * 2. Click Extensions > Apps Script.
 * 3. Delete any default code in Code.gs and paste this code.
 * 4. Ensure your Spreadsheet ID is "18T-f6OzWwopQCzpTl7nPzVX0LF7hidCtOVM6tzcMybQ" or update it below.
 * 5. Ensure you have two sheets (tabs) named:
 *    - "Nhân viên" with headers: [MSNV, Họ và tên]
 *    - "Báo cáo tháng" with headers: [MSNV, Tháng, Số mẫu, Ngày làm, Đi trễ, Quên chấm công, Ngày cập nhật]
 * 6. Click "Deploy" (top right) > "New deployment".
 * 7. Choose "Web app" as the deployment type.
 * 8. Set Description to "WorkTrack Apps Script".
 * 9. Set "Execute as" to "Me (your-email@gmail.com)".
 * 10. Set "Who has access" to "Anyone".
 * 11. Click "Deploy" and authorize the permissions.
 * 12. Copy the "Web app URL" and paste it as the VITE_APPS_SCRIPT_URL in your .env or .env.example file.
 */

var SPREADSHEET_ID = "18T-f6OzWwopQCzpTl7nPzVX0LF7hidCtOVM6tzcMybQ";

function doGet(e) {
  // Handle CORS Preflight / Simple request check
  if (!e || !e.parameter) {
    return createJsonResponse({ error: "No parameters provided" });
  }

  var action = e.parameter.action;
  var ss;
  try {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (err) {
    return createJsonResponse({ error: "Failed to open spreadsheet: " + err.message });
  }

  if (action === "employee") {
    var msnv = (e.parameter.msnv || "").trim().toUpperCase();
    if (!msnv) {
      return createJsonResponse({ found: false, error: "Missing MSNV" });
    }

    var sheet = ss.getSheetByName("Nhân viên");
    if (!sheet) {
      return createJsonResponse({ found: false, error: "Nhân viên sheet not found" });
    }

    var values = sheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      if (values[i][0] && values[i][0].toString().trim().toUpperCase() === msnv) {
        return createJsonResponse({
          found: true,
          name: values[i][1].toString().trim()
        });
      }
    }
    return createJsonResponse({ found: false });
  }

  if (action === "report") {
    var msnv = (e.parameter.msnv || "").trim().toUpperCase();
    var monthInput = (e.parameter.month || "").trim(); // format: "2026-06" or "06/2026"
    if (!msnv || !monthInput) {
      return createJsonResponse({ found: false, error: "Missing MSNV or Month" });
    }

    var formattedMonth = monthInput;
    if (monthInput.indexOf("-") !== -1) {
      var parts = monthInput.split("-");
      formattedMonth = parts[1] + "/" + parts[0]; // convert "2026-06" to "06/2026"
    }

    var sheet = ss.getSheetByName("Báo cáo tháng");
    if (!sheet) {
      return createJsonResponse({ found: false, error: "Báo cáo tháng sheet not found" });
    }

    var values = sheet.getDataRange().getValues();
    // Search backward to get the latest updated record
    for (var i = values.length - 1; i >= 1; i--) {
      var row = values[i];
      if (row[0] && row[1] && 
          row[0].toString().trim().toUpperCase() === msnv && 
          row[1].toString().trim() === formattedMonth) {
        return createJsonResponse({
          found: true,
          samples: row[2] !== undefined && row[2] !== "" ? parseInt(row[2]) : null,
          workDays: row[3] !== undefined && row[3] !== "" ? parseInt(row[3]) : null,
          lateDays: row[4] !== undefined && row[4] !== "" ? parseInt(row[4]) : null,
          forgotDays: row[5] !== undefined && row[5] !== "" ? parseInt(row[5]) : null
        });
      }
    }
    return createJsonResponse({ found: false });
  }

  if (action === "ranking") {
    var monthInput = (e.parameter.month || "").trim(); // format: "2026-06" or "06/2026"
    if (!monthInput) {
      return createJsonResponse({ error: "Missing Month parameter" });
    }

    var formattedMonth = monthInput;
    if (monthInput.indexOf("-") !== -1) {
      var parts = monthInput.split("-");
      formattedMonth = parts[1] + "/" + parts[0]; // convert "2026-06" to "06/2026"
    }

    // Load employee names map
    var empSheet = ss.getSheetByName("Nhân viên");
    var employeesMap = {};
    if (empSheet) {
      var empValues = empSheet.getDataRange().getValues();
      for (var i = 1; i < empValues.length; i++) {
        if (empValues[i][0] && empValues[i][1]) {
          employeesMap[empValues[i][0].toString().trim().toUpperCase()] = empValues[i][1].toString().trim();
        }
      }
    }

    // Load reports
    var repSheet = ss.getSheetByName("Báo cáo tháng");
    var latestReportsMap = {};
    if (repSheet) {
      var repValues = repSheet.getDataRange().getValues();
      for (var i = 1; i < repValues.length; i++) {
        var row = repValues[i];
        if (row[0] && row[1]) {
          var msnv = row[0].toString().trim().toUpperCase();
          var month = row[1].toString().trim();
          if (month === formattedMonth) {
            latestReportsMap[msnv] = {
              msnv: msnv,
              name: employeesMap[msnv] || msnv,
              samples: row[2] !== undefined && row[2] !== "" ? parseInt(row[2]) || 0 : 0,
              workDays: row[3] !== undefined && row[3] !== "" ? parseInt(row[3]) || 0 : 0,
              lateDays: row[4] !== undefined && row[4] !== "" ? parseInt(row[4]) || 0 : 0,
              forgotDays: row[5] !== undefined && row[5] !== "" ? parseInt(row[5]) || 0 : 0
            };
          }
        }
      }
    }

    var rankings = Object.keys(latestReportsMap).map(function(key) {
      return latestReportsMap[key];
    });

    // Create pre-sorted lists
    var sampleRanking = rankings.slice().sort(function(a, b) { return b.samples - a.samples; });
    var workdayRanking = rankings.slice().sort(function(a, b) { return b.workDays - a.workDays; });

    return createJsonResponse({
      rankings: rankings,
      sampleRanking: sampleRanking,
      workdayRanking: workdayRanking
    });
  }

  if (action === "notifications") {
    var empSheet = ss.getSheetByName("Nhân viên");
    var employeesMap = {};
    if (empSheet) {
      var empValues = empSheet.getDataRange().getValues();
      for (var i = 1; i < empValues.length; i++) {
        if (empValues[i][0] && empValues[i][1]) {
          employeesMap[empValues[i][0].toString().trim().toUpperCase()] = empValues[i][1].toString().trim();
        }
      }
    }

    var sheet = ss.getSheetByName("Báo cáo tháng");
    if (!sheet) {
      return createJsonResponse({ notifications: [] });
    }
    var values = sheet.getDataRange().getValues();
    var list = [];
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      var msnv = row[0] ? row[0].toString().trim().toUpperCase() : "";
      var updateDate = row[6] ? row[6].toString().trim() : "";
      var fullName = row[7] ? row[7].toString().trim() : "";
      
      // Fallback if Column H is blank but MSNV exists in employee map
      if (!fullName && msnv && employeesMap[msnv]) {
        fullName = employeesMap[msnv];
      }
      
      if (updateDate && fullName) {
        list.push({
          date: updateDate,
          name: fullName,
          month: row[1] ? row[1].toString().trim() : ""
        });
      }
    }
    return createJsonResponse({ notifications: list });
  }

  return createJsonResponse({ error: "Unknown GET action: " + action });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ success: false, error: "No post data received" });
    }

    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (action === "saveReport") {
      var msnv = (postData.msnv || "").trim().toUpperCase();
      var monthInput = (postData.month || "").trim(); // e.g., "2026-06" or "06/2026"
      
      if (!msnv || !monthInput) {
        return createJsonResponse({ success: false, error: "Missing MSNV or Month" });
      }

      var formattedMonth = monthInput;
      if (monthInput.indexOf("-") !== -1) {
        var parts = monthInput.split("-");
        formattedMonth = parts[1] + "/" + parts[0]; // convert "2026-06" to "06/2026"
      }

      var samples = parseInt(postData.samples) || 0;
      var workDays = parseInt(postData.workDays) || 0;
      var lateDays = parseInt(postData.lateDays) || 0;
      var forgotDays = parseInt(postData.forgotDays) || 0;

      var repSheet = ss.getSheetByName("Báo cáo tháng");
      if (!repSheet) {
        return createJsonResponse({ success: false, error: "Báo cáo tháng sheet not found" });
      }

      // Fetch employee's name for Column H
      var empSheet = ss.getSheetByName("Nhân viên");
      var employeeName = postData.name || "";
      if (!employeeName && empSheet) {
        var empValues = empSheet.getDataRange().getValues();
        for (var i = 1; i < empValues.length; i++) {
          if (empValues[i][0] && empValues[i][0].toString().trim().toUpperCase() === msnv) {
            employeeName = empValues[i][1].toString().trim();
            break;
          }
        }
      }

      // Format current timestamp in Vietnam Timezone
      var dateString = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");

      repSheet.appendRow([
        msnv,
        formattedMonth,
        samples,
        workDays,
        lateDays,
        forgotDays,
        dateString,
        employeeName
      ]);

      return createJsonResponse({ success: true });
    }

    return createJsonResponse({ success: false, error: "Unknown POST action: " + action });
  } catch (err) {
    return createJsonResponse({ success: false, error: err.message });
  }
}

/**
 * Helper to build JSON responses with appropriate headers for CORS
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
