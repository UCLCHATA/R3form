var formResponsesSheetName = 'R3_Form'
var chataLookupSheetName = 'All_Reports_URL'
var SPREADSHEET_ID = '1Ap9HfUWhE-ed1zIMT2QGf02yhZt7wiawKeFkDz8dcnA'
var scriptProp = PropertiesService.getScriptProperties()

function initialSetup() {
  try {
    // Save the spreadsheet ID
    scriptProp.setProperty('spreadsheetId', SPREADSHEET_ID);
    
    // Get or create the R3_Form sheet
    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    var formSheet = spreadsheet.getSheetByName(formResponsesSheetName);
    
    if (!formSheet) {
      formSheet = spreadsheet.insertSheet(formResponsesSheetName);
      
      // Set up headers for form responses
      var headers = [
        'CHATA_ID',
        'Name',
        'Timestamp',
        'ASC_Status',
        'ADHD_Status',
        'Key_Clinical_Observations',
        'Strengths_and_Abilities',
        'Priority_Support_Areas',
        'Support_Recommendations',
        'Professional_Referrals'
      ];
      
      formSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    Logger.log('Setup complete for spreadsheet: ' + spreadsheet.getUrl());
    return 'Success! Setup complete.';
  } catch (error) {
    Logger.log('Error in initialSetup: ' + error.toString());
    return 'Error: ' + error.toString();
  }
}

function doGet(e) {
  var lock = LockService.getScriptLock()
  lock.tryLock(10000)
  
  try {
    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    var callback = e.parameter.callback;
    
    // Check if this is a request for CHATA IDs
    if (e.parameter.type === 'chataIds') {
      var chataSheet = spreadsheet.getSheetByName(chataLookupSheetName)
      
      // Get all data from columns A and B
      var dataRange = chataSheet.getRange('A:B').getValues();
      
      // Remove header row and filter out empty rows
      var chataData = dataRange
        .slice(1) // Remove header row
        .filter(row => row[0] && row[0] !== '') // Filter out empty rows
        .map(row => ({
          id: row[0],    // Column A
          name: row[1]   // Column B
        }));
      
      var response = { 'result': 'success', 'data': chataData };
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(response) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    // Default behavior - return form responses
    var formSheet = spreadsheet.getSheetByName(formResponsesSheetName)
    var headers = formSheet.getRange(1, 1, 1, formSheet.getLastColumn()).getValues()[0]
    var rows = formSheet.getDataRange().getValues()
    
    rows.shift()
    
    var data = rows.map(function(row) {
      var obj = {}
      headers.forEach(function(header, i) {
        obj[header] = row[i]
      })
      return obj
    })
    
    var response = { 'result': 'success', 'data': data };
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(response) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  catch (e) {
    var response = { 'result': 'error', 'error': e.toString() };
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(response) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  finally {
    lock.releaseLock()
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock()
  lock.tryLock(10000)

  try {
    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = spreadsheet.getSheetByName(formResponsesSheetName);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Check for existing entries with the same CHATA_ID
    var data = sheet.getDataRange().getValues();
    var chataIdIndex = headers.indexOf('CHATA_ID');
    var chataId = e.parameter['CHATA_ID'];
    
    // Remove existing entries for this CHATA_ID
    for (var i = data.length - 1; i > 0; i--) {  // Start from bottom to maintain indices
      if (data[i][chataIdIndex] === chataId) {
        sheet.deleteRow(i + 1);  // +1 because array is 0-based but sheet is 1-based
      }
    }
    
    // Add new row
    var nextRow = sheet.getLastRow() + 1;
    var newRow = headers.map(function(header) {
      return header === 'Timestamp' ? new Date() : e.parameter[header];
    });

    sheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);

    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'success', 'row': nextRow }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'error', 'error': e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  finally {
    lock.releaseLock()
  }
} 