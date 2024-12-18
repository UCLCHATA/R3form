var formResponsesSheetName = 'R3_Form'
var chataLookupSheetName = 'All_Reports_URL'
var SPREADSHEET_ID = '1Ap9HfUWhE-ed1zIMT2QGf02yhZt7wiawKeFkDz8dcnA'

function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('index')
    .setTitle('R3 Assessment Form')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getChataData() {
  try {
    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    var chataSheet = spreadsheet.getSheetByName(chataLookupSheetName);
    
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
    
    return { 'result': 'success', 'data': chataData };
  } catch (error) {
    return { 'result': 'error', 'error': error.toString() };
  }
}

function submitForm(formData) {
  try {
    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = spreadsheet.getSheetByName(formResponsesSheetName);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Check for existing entries with the same CHATA_ID
    var data = sheet.getDataRange().getValues();
    var chataIdIndex = headers.indexOf('CHATA_ID');
    var chataId = formData.CHATA_ID;
    
    // Remove existing entries for this CHATA_ID
    for (var i = data.length - 1; i > 0; i--) {
      if (data[i][chataIdIndex] === chataId) {
        sheet.deleteRow(i + 1);
      }
    }
    
    // Add new row
    var nextRow = sheet.getLastRow() + 1;
    var newRow = headers.map(function(header) {
      return header === 'Timestamp' ? new Date() : formData[header];
    });

    sheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);
    
    return { 'result': 'success', 'row': nextRow };
  } catch (error) {
    return { 'result': 'error', 'error': error.toString() };
  }
} 