// Add at the top with other constants
const CONFIG = {
  SPREADSHEET_ID: '1Ap9HfUWhE-ed1zIMT2QGf02yhZt7wiawKeFkDz8dcnA',
  DEFAULT_TEST_CHATA_ID: 'CHATA001',
  TEMPLATE_VERSION: '1.0'
};

const EXPECTED_PLACEHOLDERS = [
  'C001', 'C014', 'C015', 'C016', 'C017', 'C018', 'C019', 'C020', 'C021',
  'C022', 'C023', 'C024', 'C025', 'C026', 'P016', 'P017', 'P018',
  'R005', 'R006', 'R007', 'R008', 'R009', 'R010', 'R011', 'R012',
  'R013', 'R014', 'R015', 'T001', 'T002', 'T003', 'T004', 'T005',
  'T006', 'T007', 'T008', 'T009', 'T010', 'T011', 'T012', 'T013', 'T014'
];

// Core utility functions
function setup() {
  const scriptProperties = PropertiesService.getScriptProperties();
  
  // Set spreadsheet ID
  scriptProperties.setProperty('SPREADSHEET_ID', CONFIG.SPREADSHEET_ID);
  
  // Set test CHATA ID if needed
  const testChataId = scriptProperties.getProperty('TEST_CHATA_ID');
  if (!testChataId) {
    scriptProperties.setProperty('TEST_CHATA_ID', CONFIG.DEFAULT_TEST_CHATA_ID);
  }
  
  Logger.log('Setup complete. Script properties initialized.');
  return 'Setup complete';
}

function getSpreadsheet() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const spreadsheetId = scriptProperties.getProperty('SPREADSHEET_ID') || CONFIG.SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('Spreadsheet ID not found. Please run setup() first.');
  }
  return SpreadsheetApp.openById(spreadsheetId);
}

function enableAdvancedServices() {
  try {
    DriveApp.getFiles();
  } catch (e) {
    throw new Error('Please enable Drive API service in Resources > Advanced Google Services');
  }
}

function extractDocIdFromUrl(url) {
  if (!url) throw new Error('URL is undefined or empty');
  const match = url.match(/\/d\/(.*?)(\/|$)/);
  return match ? match[1] : null;
}

function getDocumentContent(url) {
  const docId = extractDocIdFromUrl(url);
  if (!docId) throw new Error('Could not extract document ID from URL');
  
  const doc = DocumentApp.openById(docId);
  const content = doc.getBody().getText();
  Logger.log(`Fetched document content length: ${content.length}`);
  return content;
}

// Content replacement function
function replaceContentInBody(body, id, content) {
  Logger.log(`\nReplacing content for ID: ${id}`);
  Logger.log(`Content length: ${content.length} chars`);
  
  // Clean up content formatting and spelling
  content = content
    .replace(/\/$/, '')  // Remove trailing slashes
    .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold markdown
    .replace(/\*([^\*]+)\*/g, '$1')   // Remove single asterisk italics
    .replace(/_([^_]+)_/g, '$1')      // Remove underscore italics/bold
    .replace(/`([^`]+)`/g, '$1')      // Remove code formatting
    .trim();             // Ensure no trailing whitespace
  
  content = cleanupText(content);
  Logger.log(`Content after cleanup: "${content}"`);
  
  // Search for exact pattern
  const exactPattern = `{{${id}}}`;
  const range = body.findText(exactPattern);
  
  if (range) {
    try {
      const element = range.getElement();
      const startOffset = range.getStartOffset();
      const endOffsetInclusive = range.getEndOffsetInclusive();
      
      // Log the context around the replacement
      const elementText = element.asText().getText();
      const contextStart = Math.max(0, startOffset - 20);
      const contextEnd = Math.min(elementText.length, endOffsetInclusive + 20);
      Logger.log(`Found pattern "${exactPattern}" at position ${startOffset}`);
      Logger.log(`Context: "${elementText.substring(contextStart, contextEnd)}"`);
      
      // Delete the placeholder
      const textElement = element.asText();
      textElement.deleteText(startOffset, endOffsetInclusive);
      
      // Insert new content
      const insertedText = textElement.insertText(startOffset, content);
      
      // Apply only yellow highlighting
      insertedText.setBold(false);
      insertedText.setItalic(false);
      insertedText.setUnderline(false);
      insertedText.setBackgroundColor('#FFFF00');  // Yellow highlight
      
      Logger.log(`Successfully replaced "${exactPattern}" with new content`);
      return 1;
    } catch (e) {
      Logger.log(`Error during replacement: ${e.message}`);
    }
  } else {
    Logger.log(`Pattern "${exactPattern}" not found in document`);
  }
  
  return 0;
}

// Content extraction function
function extractPlaceholderContentAndEvidence(response) {
  const contentMatches = [];
  
  // First try to find regular placeholders
  const contentPattern = /##([A-Z][0-9]{3})##([\s\S]*?)##END##/g;
  let match;
  while ((match = contentPattern.exec(response)) !== null) {
    const id = match[1];
    const content = match[2].trim();
    contentMatches.push({ id, content });
    Logger.log(`Found content for ID ${id}, length: ${content.length} chars`);
  }
  
  // Then look for revisions if any
  const revisionPattern = /##REVISE_([A-Z][0-9]{3})##([\s\S]*?)##END##/g;
  while ((match = revisionPattern.exec(response)) !== null) {
    const id = match[1];
    const content = match[2].trim();
    // Replace or add revised content
    const existingIndex = contentMatches.findIndex(m => m.id === id);
    if (existingIndex !== -1) {
      contentMatches[existingIndex].content = content;
      Logger.log(`Updated content for ID ${id} with revision`);
    } else {
      contentMatches.push({ id, content });
      Logger.log(`Added revision content for ID ${id}`);
    }
  }
  
  Logger.log(`\nExtraction Summary: Found ${contentMatches.length} content sections`);
  return contentMatches;
}

// Add after other constants
const BRITISH_SPELLING = {
  'behavior': 'behaviour',
  'color': 'colour',
  'favor': 'favour',
  'humor': 'humour',
  'labor': 'labour',
  'neighbor': 'neighbour',
  'organization': 'organisation',
  'organize': 'organise',
  'organized': 'organised',
  'organizing': 'organising',
  'recognize': 'recognise',
  'recognized': 'recognised',
  'recognizing': 'recognising',
  'specialize': 'specialise',
  'specialized': 'specialised',
  'specializing': 'specialising',
  'center': 'centre',
  'practice': 'practise',  // verb form
  'analyze': 'analyse',
  'analyzed': 'analysed',
  'analyzing': 'analysing'
};

// Add new function for text cleanup
function cleanupText(text) {
  // Fix common formatting issues
  let cleaned = text
    .replace(/\s+/g, ' ')               // Multiple spaces to single space
    .replace(/\s+\./g, '.')             // Remove spaces before periods
    .replace(/\s+,/g, ',')              // Remove spaces before commas
    .replace(/\s+:/g, ':')              // Remove spaces before colons
    .replace(/\s+;/g, ';')              // Remove spaces before semicolons
    .replace(/\(\s+/g, '(')             // Remove spaces after opening parentheses
    .replace(/\s+\)/g, ')')             // Remove spaces before closing parentheses
    .replace(/\.{2,}/g, '...')          // Multiple periods to ellipsis
    .replace(/\s*\.\.\.\s*/g, '... ')   // Standardize ellipsis spacing
    .replace(/\s+$/gm, '')              // Remove trailing spaces
    .replace(/^\s+/gm, '')              // Remove leading spaces
    .replace(/\n{3,}/g, '\n\n')         // Multiple blank lines to double
    .trim();

  // Convert to British English
  Object.entries(BRITISH_SPELLING).forEach(([american, british]) => {
    // Case-insensitive replacement while preserving original case
    const regex = new RegExp(american, 'gi');
    cleaned = cleaned.replace(regex, match => {
      // If the original was capitalized, capitalize the replacement
      return match[0] === match[0].toUpperCase() 
        ? british.charAt(0).toUpperCase() + british.slice(1)
        : british;
    });
  });

  return cleaned;
}

// Add new function to verify template
function verifyTemplate(body) {
  Logger.log('\n=== Verifying template integrity ===');
  const bodyText = body.getText();
  const missingPlaceholders = [];
  const malformedPlaceholders = [];
  
  EXPECTED_PLACEHOLDERS.forEach(id => {
    const exactPattern = `{{${id}}}`;
    const singleBracePattern = `{${id}}`;
    
    if (!bodyText.includes(exactPattern)) {
      if (bodyText.includes(singleBracePattern)) {
        malformedPlaceholders.push(id);
      } else {
        missingPlaceholders.push(id);
      }
    }
  });
  
  if (missingPlaceholders.length > 0) {
    Logger.log(`Warning: Missing placeholders: ${missingPlaceholders.join(', ')}`);
  }
  if (malformedPlaceholders.length > 0) {
    Logger.log(`Warning: Malformed placeholders (single braces): ${malformedPlaceholders.join(', ')}`);
  }
  
  return {
    isValid: missingPlaceholders.length === 0 && malformedPlaceholders.length === 0,
    missingPlaceholders,
    malformedPlaceholders
  };
}

// Main function
function populateTemplateWithSecondPass(timestamp, chataId, responseDocUrl) {
  if (!timestamp || !chataId || !responseDocUrl) {
    throw new Error('timestamp, chataId, and responseDocUrl are all required');
  }

  if (!responseDocUrl.startsWith('https://')) {
    throw new Error('Invalid response document URL format');
  }

  enableAdvancedServices();
  const ss = getSpreadsheet();
  Logger.log(`\n=== Processing template for CHATA_ID: ${chataId} ===`);
  Logger.log(`Response document URL: ${responseDocUrl}`);

  // Get template URL from R3_Form
  const r3Sheet = ss.getSheetByName('R3_Form');
  if (!r3Sheet) throw new Error('R3_Form sheet not found');

  const r3Data = r3Sheet.getDataRange().getValues();
  const r3Headers = r3Data[0];
  const chataIdIndex = r3Headers.indexOf('chata_id');
  const docUrlIndex = r3Headers.indexOf('Generated (Docx for LLM)');

  const row = r3Data.find(row => row[chataIdIndex] === chataId);
  if (!row) throw new Error(`No data found for CHATA ID: ${chataId}`);

  const templateUrl = row[docUrlIndex];
  if (!templateUrl) throw new Error('Template URL not found in R3_Form');
  
  Logger.log(`Template URL: ${templateUrl}`);
  const templateId = extractDocIdFromUrl(templateUrl);

  try {
    // Get content from the response document
    Logger.log('Fetching content from response document...');
    const responseContent = getDocumentContent(responseDocUrl);
    if (!responseContent || !responseContent.includes('##C')) {
      throw new Error('Invalid or empty response document content');
    }

    // Extract and process content
    const placeholderContent = extractPlaceholderContentAndEvidence(responseContent);
    Logger.log(`Processing ${placeholderContent.length} placeholders`);
    
    // Create new document from template
    const templateDoc = DriveApp.getFileById(templateId);
    const newFileName = `${chataId}_R3_Report_${new Date().toISOString().split('T')[0]}`;
    const docCopy = templateDoc.makeCopy(newFileName);
    const doc = DocumentApp.openById(docCopy.getId());
    const body = doc.getBody();
    
    // Verify template before proceeding
    const templateVerification = verifyTemplate(body);
    if (!templateVerification.isValid) {
      const error = 'Template verification failed:\n' +
        (templateVerification.missingPlaceholders.length > 0 ? 
          `Missing placeholders: ${templateVerification.missingPlaceholders.join(', ')}\n` : '') +
        (templateVerification.malformedPlaceholders.length > 0 ? 
          `Malformed placeholders: ${templateVerification.malformedPlaceholders.join(', ')}` : '');
      throw new Error(error);
    }
    
    // Replace content
    let totalReplacements = 0;
    let failedReplacements = [];
    
    placeholderContent.forEach(({ id, content }) => {
      const count = replaceContentInBody(body, id, content);
      if (count > 0) {
        totalReplacements += count;
      } else {
        failedReplacements.push(id);
      }
    });
    
    // Log results
    Logger.log(`\nReplacement Summary:`);
    Logger.log(`- Successful replacements: ${totalReplacements}`);
    if (failedReplacements.length > 0) {
      Logger.log(`- Failed replacements: ${failedReplacements.join(', ')}`);
    }
    
    doc.saveAndClose();
    
    // Update R3_Form with new document
    const completedReportIndex = r3Headers.indexOf('Completed Report from LLM');
    Logger.log(`\nUpdating R3_Form sheet:
- Column 'Completed Report from LLM' index: ${completedReportIndex}
- Headers found: ${r3Headers.join(', ')}`);

    if (completedReportIndex !== -1) {
      const rowIndex = r3Data.findIndex(r => r[chataIdIndex] === chataId);
      Logger.log(`- Row index for CHATA_ID ${chataId}: ${rowIndex}`);
      
      if (rowIndex !== -1) {
        const hyperlinkFormula = `=HYPERLINK("${docCopy.getUrl()}", "${docCopy.getUrl()}")`;
        Logger.log(`- Setting formula in R3_Form: ${hyperlinkFormula}`);
        r3Sheet.getRange(rowIndex + 1, completedReportIndex + 1).setFormula(hyperlinkFormula);
        Logger.log('✓ Successfully updated R3_Form sheet');
      } else {
        Logger.log(`! Warning: Could not find row for ${chataId} in R3_Form sheet`);
      }
    } else {
      Logger.log('! Error: Column "Completed Report from LLM" not found in R3_Form sheet');
    }

    // Update All_URL sheet with the generated document URL
    const allUrlSheet = ss.getSheetByName('All_URL');
    if (!allUrlSheet) throw new Error('All_URL sheet not found');

    const allUrlData = allUrlSheet.getDataRange().getValues();
    const allUrlHeaders = allUrlData[0];
    const allUrlChataIdIndex = allUrlHeaders.indexOf('CHATA_ID');
    const r3GeneratedWordIndex = allUrlHeaders.indexOf('R3_Generated (Word)');

    Logger.log(`\nUpdating All_URL sheet:
- Column 'CHATA_ID' index: ${allUrlChataIdIndex}
- Column 'R3_Generated (Word)' index: ${r3GeneratedWordIndex}
- Headers found: ${allUrlHeaders.join(', ')}`);

    if (allUrlChataIdIndex === -1 || r3GeneratedWordIndex === -1) {
      throw new Error('Required columns not found in All_URL sheet');
    }

    // Find the row with matching CHATA_ID
    const allUrlRowIndex = allUrlData.findIndex(row => row[allUrlChataIdIndex] === chataId);
    Logger.log(`- Row index for CHATA_ID ${chataId}: ${allUrlRowIndex}`);

    if (allUrlRowIndex !== -1) {
      // Create HYPERLINK formula for the URL
      const hyperlinkFormula = `=HYPERLINK("${docCopy.getUrl()}", "${docCopy.getUrl()}")`;
      Logger.log(`- Setting formula in All_URL: ${hyperlinkFormula}`);
      allUrlSheet.getRange(allUrlRowIndex + 1, r3GeneratedWordIndex + 1).setFormula(hyperlinkFormula);
      Logger.log('✓ Successfully updated All_URL sheet');
    } else {
      Logger.log(`! Warning: Could not find row for ${chataId} in All_URL sheet`);
    }
    
    Logger.log(`\nCompleted successfully. New document: ${docCopy.getUrl()}`);
    return docCopy.getUrl();
    
  } catch (e) {
    Logger.log(`Error: ${e.message}`);
    throw e;
  }
}

// Test function
function _testTemplatePopulation() {
  const testTimestamp = new Date().toISOString();
  
  try {
    // Get test CHATA ID from script properties
    const scriptProperties = PropertiesService.getScriptProperties();
    const testChataId = scriptProperties.getProperty('TEST_CHATA_ID');
    if (!testChataId) {
      throw new Error('TEST_CHATA_ID not found in script properties. Please run setup() first.');
    }
    
    Logger.log(`\n=== Testing template population for ${testChataId} ===`);
    
    // Get spreadsheet
    const ss = getSpreadsheet();
    const logsSheet = ss.getSheetByName('API_Logs');
    if (!logsSheet) throw new Error('API_Logs sheet not found');
    
    // Get and verify data
    const logsData = logsSheet.getDataRange().getValues();
    const logsHeaders = logsData[0];
    Logger.log(`Found headers: ${JSON.stringify(logsHeaders)}`);
    
    // Find column indices
    const timestampIndex = logsHeaders.findIndex(h => h.toString().trim() === 'Timestamp (IST)');
    const chataIdIndex = logsHeaders.findIndex(h => h.toString().trim() === 'CHATA_ID');
    const operationIndex = logsHeaders.findIndex(h => h.toString().trim() === 'Operation');
    const contentIndex = logsHeaders.findIndex(h => h.toString().trim() === 'Content');
    const statusIndex = logsHeaders.findIndex(h => h.toString().trim() === 'Status/Details');
    
    Logger.log(`Column indices found:
- Timestamp: ${timestampIndex}
- CHATA_ID: ${chataIdIndex}
- Operation: ${operationIndex}
- Content: ${contentIndex}
- Status/Details: ${statusIndex}`);
    
    if (timestampIndex === -1 || chataIdIndex === -1 || operationIndex === -1 || 
        contentIndex === -1 || statusIndex === -1) {
      throw new Error('Could not find required columns in API_Logs');
    }
    
    // Find rows with Final Response for this CHATA_ID
    const matchingRows = [];
    for (let i = 1; i < logsData.length; i++) {
      const row = logsData[i];
      const rowChataId = row[chataIdIndex]?.toString().trim();
      const rowContent = row[contentIndex]?.toString().trim();
      const rowStatus = row[statusIndex]?.toString().trim();
      
      // Look for rows where CHATA_ID matches and Content contains "Final Response"
      if (rowChataId === testChataId && 
          rowContent === 'Final Response' && 
          rowStatus) {
        let docUrl = rowStatus;
        
        // Check if it's a HYPERLINK formula and extract URL if it is
        const urlMatch = rowStatus.match(/HYPERLINK\("([^"]+)"/);
        if (urlMatch) {
          docUrl = urlMatch[1];
        }
        
        // Verify it's a valid Google Docs URL
        if (docUrl.startsWith('https://docs.google.com/')) {
          matchingRows.push({
            index: i,
            timestamp: row[timestampIndex],
            docUrl: docUrl
          });
          Logger.log(`Found matching row ${i}:
- CHATA_ID: ${rowChataId}
- Content: ${rowContent}
- Timestamp: ${row[timestampIndex]}
- Document URL: ${docUrl}`);
        }
      }
    }
    
    Logger.log(`Found ${matchingRows.length} matching rows`);
    
    if (matchingRows.length === 0) {
      throw new Error(`No Final Response document URLs found for ${testChataId}`);
    }
    
    // Sort by timestamp to get most recent
    matchingRows.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateB - dateA;  // Most recent first
    });
    
    const mostRecent = matchingRows[0];
    Logger.log(`Using most recent response document:
- Row: ${mostRecent.index}
- Timestamp: ${mostRecent.timestamp}
- Document URL: ${mostRecent.docUrl}`);
    
    // Process template using the document URL
    const result = populateTemplateWithSecondPass(testTimestamp, testChataId, mostRecent.docUrl);
    Logger.log(`Test completed. Result: ${result}`);
    return result;
    
  } catch (error) {
    Logger.log(`Test failed: ${error.message}`);
    throw error;
  }
}

// Add function to get clinician's email
function getClinicianEmail(chataId) {
  const ss = getSpreadsheet();
  const adosSheet = ss.getSheetByName('ADOS_Data');
  if (!adosSheet) throw new Error('ADOS_Data sheet not found');

  const data = adosSheet.getDataRange().getValues();
  const headers = data[0];
  
  // Log headers for debugging
  Logger.log(`ADOS_Data headers found: ${headers.join(', ')}`);
  
  const chataIdIndex = headers.indexOf('CHATA_ID');
  const emailIndex = headers.indexOf('Clinicians_email'); // Updated to match exact column name
  
  Logger.log(`Column indices - CHATA_ID: ${chataIdIndex}, Clinicians_email: ${emailIndex}`);

  if (chataIdIndex === -1 || emailIndex === -1) {
    throw new Error(`Required columns not found in ADOS_Data sheet. Looking for: CHATA_ID and Clinicians_email. Found headers: ${headers.join(', ')}`);
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][chataIdIndex] === chataId) {
      const email = data[i][emailIndex];
      if (!email) throw new Error(`No email found for CHATA_ID: ${chataId}`);
      Logger.log(`Found email for ${chataId}: ${email}`);
      return email;
    }
  }
  throw new Error(`No data found for CHATA_ID: ${chataId}`);
}

// Add function to send email
function sendReportEmail(chataId, documentUrl) {
  Logger.log(`\n=== Starting email process for CHATA_ID: ${chataId} ===`);
  Logger.log(`Document URL: ${documentUrl}`);
  
  try {
    // Get clinician's email
    Logger.log('Fetching clinician email...');
    const clinicianEmail = getClinicianEmail(chataId);
    Logger.log(`Found clinician email: ${clinicianEmail}`);
    
    // Open and prepare document
    Logger.log('Opening document...');
    const docId = extractDocIdFromUrl(documentUrl);
    const doc = DocumentApp.openById(docId);
    const docName = doc.getName();
    Logger.log(`Document name: ${docName}`);
    
    // Export as Word document using Google's export API
    Logger.log('Exporting document as Word...');
    const url = 'https://docs.google.com/feeds/download/documents/export/Export?id=' + docId + '&exportFormat=docx';
    const options = {
      method: 'get',
      headers: {
        Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
      },
      muteHttpExceptions: true
    };
    
    // Fetch the DOCX file as a blob
    const response = UrlFetchApp.fetch(url, options);
    const wordBlob = response.getBlob().setName(docName + '.docx');
    Logger.log('Word document prepared successfully');
    
    // Prepare email content
    const emailBody = `
      Dear Clinician,
      
      The R3 report for ${chataId} has been generated and is ready for your review.
      
      You can access the Google Doc version here: ${documentUrl}
      
      A Microsoft Word copy has been attached to this email for your convenience.
      
      Best regards,
      CHATA System
      
      ---
      CHATA Report Writing System
    `;

    Logger.log('Sending email...');
    GmailApp.sendEmail(
      clinicianEmail,
      `R3 Report Generated - ${chataId}`,
      emailBody, // Plain text version
      {
        name: 'CHATA System',
        htmlBody: emailBody.replace(/\n/g, '<br>'),
        attachments: [wordBlob]
      }
    );
    Logger.log('Email sent successfully');

    const result = {
      sent: true,
      recipientEmail: clinicianEmail,
      documentId: docId,
      wordAttached: true
    };
    Logger.log(`Email process completed successfully: ${JSON.stringify(result)}`);
    return result;
    
  } catch (error) {
    Logger.log(`Error sending email: ${error.message}`);
    Logger.log(`Error stack: ${error.stack}`);
    return {
      sent: false,
      error: error.message
    };
  }
}

// Update populateR3Template to include more detailed logging
function populateR3Template(chataId, responseDocUrl) {
  Logger.log(`\n=== Starting R3 template population for CHATA_ID: ${chataId} ===`);
  Logger.log(`Response document URL: ${responseDocUrl}`);
  
  try {
    const timestamp = new Date().toISOString();
    Logger.log('Step 1: Calling populateTemplateWithSecondPass...');
    const documentUrl = populateTemplateWithSecondPass(timestamp, chataId, responseDocUrl);
    Logger.log(`Generated document URL: ${documentUrl}`);
    
    // Send email with the document
    Logger.log('Step 2: Sending email...');
    const emailStatus = sendReportEmail(chataId, documentUrl);
    Logger.log(`Email status: ${JSON.stringify(emailStatus)}`);

    const result = {
      success: true,
      documentUrl: documentUrl,
      timestamp: timestamp,
      step: 3,
      totalSteps: 3,
      emailStatus: {
        ...emailStatus,
        details: emailStatus.sent ? 
          `Email sent to ${emailStatus.recipientEmail} with Google Doc link and Word attachment` :
          `Email sending failed: ${emailStatus.error}`
      }
    };
    Logger.log(`Template population completed successfully: ${JSON.stringify(result)}`);
    return result;
    
  } catch (error) {
    Logger.log(`Template population failed: ${error.message}`);
    Logger.log(`Error stack: ${error.stack}`);
    return {
      success: false,
      error: error.message,
      step: 0,
      totalSteps: 3,
      details: {
        timestamp: new Date().toISOString(),
        stack: error.stack
      }
    };
  }
}

// Update doGet to include more detailed logging
function doGet(e) {
  Logger.log('\n=== Starting doGet request ===');
  Logger.log(`Request parameters: ${JSON.stringify(e?.parameter)}`);
  
  try {
    const callback = e?.parameter?.callback || 'jsonp_callback_' + Math.round(100000 * Math.random());
    const chataId = e?.parameter?.chataId || 
                   PropertiesService.getScriptProperties().getProperty('TEST_CHATA_ID');
    
    Logger.log(`Callback: ${callback}`);
    Logger.log(`CHATA_ID: ${chataId}`);
    
    if (!chataId) {
      Logger.log('Error: No CHATA_ID provided');
      return createJSONPResponse(callback, {
        success: false,
        error: 'No CHATA_ID provided',
        stage: 'initialization',
        progress: {
          status: 'error',
          message: 'Missing CHATA_ID',
          step: 0,
          totalSteps: 3
        }
      });
    }
    
    if (e?.parameter?.test === 'true') {
      Logger.log('Processing test request');
      return createJSONPResponse(callback, {
        success: true,
        message: 'Template population endpoint is working',
        stage: 'test',
        progress: {
          status: 'complete',
          message: 'Test successful',
          step: 1,
          totalSteps: 1
        }
      });
    }
    
    // Get response document URL from logs
    Logger.log('Looking up response document URL from API_Logs...');
    const ss = getSpreadsheet();
    const logsSheet = ss.getSheetByName('API_Logs');
    if (!logsSheet) {
      throw new Error('API_Logs sheet not found');
    }
    
    const logsData = logsSheet.getDataRange().getValues();
    const logsHeaders = logsData[0];
    Logger.log(`API_Logs headers: ${logsHeaders.join(', ')}`);
    
    const chataIdIndex = logsHeaders.findIndex(h => h.toString().trim() === 'CHATA_ID');
    const contentIndex = logsHeaders.findIndex(h => h.toString().trim() === 'Content');
    const statusIndex = logsHeaders.findIndex(h => h.toString().trim() === 'Status/Details');
    
    Logger.log(`Column indices - CHATA_ID: ${chataIdIndex}, Content: ${contentIndex}, Status/Details: ${statusIndex}`);
    
    let responseDocUrl = null;
    for (let i = logsData.length - 1; i >= 1; i--) {
      const row = logsData[i];
      if (row[chataIdIndex]?.toString().trim() === chataId && 
          row[contentIndex]?.toString().trim() === 'Final Response') {
        let docUrl = row[statusIndex]?.toString().trim();
        const urlMatch = docUrl.match(/HYPERLINK\("([^"]+)"/);
        responseDocUrl = urlMatch ? urlMatch[1] : docUrl;
        Logger.log(`Found response document URL: ${responseDocUrl}`);
        break;
      }
    }
    
    if (!responseDocUrl) {
      Logger.log('Error: No response document found');
      return createJSONPResponse(callback, {
        success: false,
        error: 'No response document found for the provided CHATA_ID',
        stage: 'document_lookup',
        progress: {
          status: 'error',
          message: 'Response document not found',
          step: 0,
          totalSteps: 3
        }
      });
    }
    
    Logger.log('Calling populateR3Template...');
    const result = populateR3Template(chataId, responseDocUrl);
    Logger.log(`Template population result: ${JSON.stringify(result)}`);
    
    const response = {
      success: result.success,
      message: result.success ? 'Template population complete' : result.error,
      stage: 'population',
      progress: {
        status: result.success ? 'complete' : 'error',
        message: result.success ? 'Template successfully populated' : result.error,
        step: result.step || 0,
        totalSteps: 3,
        details: result.success ? {
          documentUrl: result.documentUrl,
          timestamp: result.timestamp,
          emailStatus: result.emailStatus
        } : result.details
      }
    };
    
    Logger.log(`Sending response: ${JSON.stringify(response)}`);
    return createJSONPResponse(callback, response);
    
  } catch (error) {
    Logger.log(`Error in doGet: ${error.message}`);
    Logger.log(`Error stack: ${error.stack}`);
    return createJSONPResponse(callback || 'callback', {
      success: false,
      error: error.message,
      stage: 'error',
      progress: {
        status: 'error',
        message: error.message,
        step: 0,
        totalSteps: 3,
        details: {
          timestamp: new Date().toISOString(),
          stack: error.stack
        }
      }
    });
  }
}

// Helper function for JSONP responses
function createJSONPResponse(callback, data) {
  const jsonData = JSON.stringify(data);
  const output = `${callback}(${jsonData});`;
  
  return ContentService.createTextOutput(output)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
} 