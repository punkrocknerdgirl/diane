function findAirtableTestInSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(VALIDATION_SHEET_NAME);
  const values = sh.getDataRange().getDisplayValues();
  const headers = values[0];
  const idIndex = headers.indexOf('Validation ID');
  const batchIndex = headers.indexOf('Review Batch Key');
  const targetId = 'VAL_INTAKE_MOTIVE_1028398112_1028398113';
  const targetBatch = 'TEST_APPLY_BATCH_FIELDS_20260715';
  const matches = values.slice(1).filter(function(row) { return (idIndex >= 0 && row[idIndex] === targetId) || (batchIndex >= 0 && row[batchIndex] === targetBatch); });
  console.log(JSON.stringify({headers: headers, idIndex: idIndex, batchIndex: batchIndex, matches: matches}, null, 2));
}


const SPREADSHEET_ID = '1rMpc_CEFaIMxmC0jfnpSQ5XSWTIIisXM7wsxE5pKjZA';
const VALIDATION_SHEET_NAME = 'VALIDATION';
const REVIEW_BATCHES_SHEET_NAME = 'REVIEW_BATCHES';
const CONFIG_MATERIALS_SHEET_NAME = 'CONFIG_MATERIALS';
const REVIEW_QUEUE_SUBMISSION_ID_PREFIX = 'MOTIVE_';
const REVIEW_CORRECTIONS_FOLDER_ID = '1k9MEd_2omg9MyTaniksN-YeMe8MBElcv';






function doGet() {
return HtmlService.createHtmlOutputFromFile('Index')
  .setTitle('Diane Ticket Review')
  .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}




// --- Sheet helpers ---




function getSheet_(name) {
const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
if (!sheet) throw new Error('Sheet not found: ' + name);
return sheet;
}
function getValidationSheet_() { return getSheet_(VALIDATION_SHEET_NAME); }
function getReviewBatchesSheet_() { return getSheet_(REVIEW_BATCHES_SHEET_NAME); }




function getHeaderMap_(headers) {
const map = {};
headers.forEach((h, i) => { if (h) map[String(h).trim()] = i + 1; });
return map;
}




function getSheetHeaderMap_(name) {
const sheet = getSheet_(name);
const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
return { sheet, headerMap: getHeaderMap_(headers) };
}
function getValidationHeaderMap_() { return getSheetHeaderMap_(VALIDATION_SHEET_NAME); }
function getReviewBatchesHeaderMap_() { return getSheetHeaderMap_(REVIEW_BATCHES_SHEET_NAME); }




function requireColumns_(headerMap, cols) {
cols.forEach(c => { if (!headerMap[c]) throw new Error('Missing required column: ' + c); });
}




function norm_(v) { return String(v || '').trim(); }




function normalizeReviewer_(v) {
const r = norm_(v).toLowerCase();
if (!r) throw new Error('Reviewer is required before approving.');
if (r.length > 24) throw new Error('Reviewer must be 24 characters or less.');
return r;
}




function normNum_(v) { return String(v || '').trim().replace(/[$,]/g, ''); }




function isPositiveNumber_(v) {
const t = normNum_(v);
if (!t) return false;
const n = Number(t);
return !isNaN(n) && n >= 0;
}




function splitIds_(v) {
return String(v || '').split(';').map(s => s.trim()).filter(Boolean);
}
function uniqueIds_(ids) {
const seen = {};
return (ids || []).map(id => norm_(id)).filter(Boolean).filter(id => {
  if (seen[id]) return false;
  seen[id] = true;
  return true;
});
}






function findRowByValue_(sheet, col, value, startRow) {
const last = sheet.getLastRow();
if (last < startRow) return null;
const vals = sheet.getRange(startRow, col, last - startRow + 1, 1).getDisplayValues();
const target = norm_(value);
for (let i = 0; i < vals.length; i++) {
  if (norm_(vals[i][0]) === target) return startRow + i;
}
return null;
}




function rbh_(rowValues, headerMap, col) {
const n = headerMap[col];
return n ? norm_(rowValues[n - 1]) : '';
}




function isCurrentQueueRow_(rowValues, headerMap) {
if (!REVIEW_QUEUE_SUBMISSION_ID_PREFIX) return true;
return rbh_(rowValues, headerMap, 'Submission ID').indexOf(REVIEW_QUEUE_SUBMISSION_ID_PREFIX) >= 0;
}




function firstNonBlank_(...args) {
for (const v of args) { const t = norm_(v); if (t) return t; }
return '';
}




function displayMissing_(v) { const t = norm_(v); return t || 'Missing'; }


function numberFromReviewValue_(v) {
 const t = normNum_(v);
 if (!t) return null;
 const n = Number(t);
 return isNaN(n) ? null : n;
}


function formatMoney_(v) {
 const n = Number(v || 0);
 return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}




function getReviewLineTotal_(existingLineTotal, quantity, rate) {
  const existing = normNum_(existingLineTotal);
  if (existing) return existing;

  const q = Number(normNum_(quantity));
  const r = Number(normNum_(rate));

  if (isNaN(q) || isNaN(r)) return '';
  return String(Math.round(q * r * 100) / 100);
}

function formatReviewDate_(v) {
 const formatted = formatDateOnlyString_(v);
 return formatted || norm_(v);
}
function formatDateOnlyString_(v) {
 if (v instanceof Date && !isNaN(v.getTime())) {
   const y = v.getFullYear();
   const m = v.getMonth() + 1;
   const d = v.getDate();
   return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
 }
 const t = norm_(v);
 if (!t) return '';
 let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
 if (m) return m[1] + '-' + String(Number(m[2])).padStart(2, '0') + '-' + String(Number(m[3])).padStart(2, '0');
 m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
 if (m) {
   let y = Number(m[3]);
   if (y < 100) y += 2000;
   return y + '-' + String(Number(m[1])).padStart(2, '0') + '-' + String(Number(m[2])).padStart(2, '0');
 }
 if (/^\d+(\.\d+)?$/.test(t)) {
   const n = Number(t);
   if (!isNaN(n) && n > 30000 && n < 60000) {
     const wholeDays = Math.floor(n);
     const base = new Date(1899, 11, 30);
     base.setDate(base.getDate() + wholeDays);
     return base.getFullYear() + '-' + String(base.getMonth() + 1).padStart(2, '0') + '-' + String(base.getDate()).padStart(2, '0');
   }
 }
 return '';
}
function parseReviewDateNoTimezone_(v) {
 const s = formatDateOnlyString_(v);
 if (!s) return null;
 const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
 if (!m) return null;
 return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}


function normBatchKeyPart_(v) {
 return norm_(v)
   .replace(/[^A-Za-z0-9]+/g, ' ')
   .replace(/\s+/g, ' ')
   .trim()
   .toUpperCase();
}


function normLookupKey_(v) {
 return norm_(v).replace(/[^A-Za-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
}


function splitAliasList_(v) {
 return String(v || '').split(/[;,]/).map(s => s.trim()).filter(Boolean);
}


let MATERIAL_ALIAS_MAP_ = null;


function getMaterialAliasMap_() {
 if (MATERIAL_ALIAS_MAP_) return MATERIAL_ALIAS_MAP_;
 const sheet = getSheet_(CONFIG_MATERIALS_SHEET_NAME);
 const lastRow = sheet.getLastRow();
 const lastCol = sheet.getLastColumn();
 const map = {};
 if (lastRow < 2) {
   MATERIAL_ALIAS_MAP_ = map;
   return map;
 }
 const headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
 const headerMap = getHeaderMap_(headers);
 requireColumns_(headerMap, ['Material Name']);
 const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
 rows.forEach(row => {
   const activeCol = headerMap['Active'];
   const active = activeCol ? norm_(row[activeCol - 1]).toLowerCase() : 'true';
   if (active && active !== 'true' && active !== 'yes' && active !== 'y') return;
   const materialName = rbh_(row, headerMap, 'Material Name');
   if (!materialName) return;
   const aliases = [];
   aliases.push(materialName);
   if (headerMap['Material Code']) aliases.push(rbh_(row, headerMap, 'Material Code'));
   if (headerMap['Aliases']) aliases.push(...splitAliasList_(rbh_(row, headerMap, 'Aliases')));
   aliases.forEach(alias => {
     const key = normLookupKey_(alias);
     if (key) map[key] = materialName;
   });
 });
 MATERIAL_ALIAS_MAP_ = map;
 return map;
}


function canonicalizeMaterial_(v) {
 const raw = norm_(v);
 if (!raw) return '';
 const found = getMaterialAliasMap_()[normLookupKey_(raw)];
 return found || raw;
}




function isManualBatchKey_(v) {
 const t = norm_(v).toUpperCase();
 return t.indexOf('MANUAL_') === 0 || t.indexOf('MANUAL-') === 0;
}


function buildBatchKey_(f) {
return [
  normBatchKeyPart_(f.broker) || 'UNBATCHED',
  normBatchKeyPart_(f.customerJob) || 'MISSING_JOB',
  normBatchKeyPart_(f.poNumber) || 'MISSING_PO',
  normBatchKeyPart_(f.workOrder),
  normBatchKeyPart_(f.origin),
  normBatchKeyPart_(f.destination),
  normBatchKeyPart_(f.truck),
  normBatchKeyPart_(f.driver),
  normBatchKeyPart_(f.rate)
].join('|');
}
function isMissingToken_(v) {
const t = norm_(v).toUpperCase();
return !t || t === 'UNBATCHED' || /^MISSING/.test(t);
}
function buildBatchDisplayTitle_(f, fallbackKey) {
const parts = [
  norm_(f.broker),
  norm_(f.customerJob),
  norm_(f.poNumber),
  norm_(f.workOrder),
  norm_(f.origin),
  norm_(f.destination),
  norm_(f.rate)
].filter(v => !isMissingToken_(v));
return parts.length ? parts.join(' · ') : norm_(fallbackKey) || 'Review Batch';
}




// --- Display fields ---




function getDisplayFields_(rowValues, headerMap) {
function final(finalCol, guessCol) {
  return firstNonBlank_(rbh_(rowValues, headerMap, finalCol), rbh_(rowValues, headerMap, guessCol));
}
const broker      = final('Final Broker',            'Broker Guess');
const customerJob = final('Final Customer / Job',    'Customer / Job Guess');
const poNumber    = final('Final PO Number',         'PO Number Guess');
const workOrder   = final('Final Work Order / Order','Work Order / Order Guess');
const truck       = final('Final Truck',             'Truck Guess');
const driver      = final('Final Driver',            'Driver Guess');
const rate        = final('Final Rate',              'Rate Guess');
const origin      = final('Final Origin',            'Origin Guess');
const destination = final('Final Destination',       'Destination Guess');
const quantity    = final('Final Quantity',          'Quantity Guess');
const lineTotal   = getReviewLineTotal_(firstNonBlank_(rbh_(rowValues, headerMap, 'Line Total Guess')), quantity, rate);
const storedKey   = rbh_(rowValues, headerMap, 'Review Batch Key');




return {
  ticketDate:   formatReviewDate_(final('Final Ticket Date',   'Ticket Date Guess')),
  ticketNumber: final('Final Ticket Number', 'Ticket Number Guess'),
  broker, customerJob, poNumber, workOrder, truck, driver,
  material:     canonicalizeMaterial_(final('Final Material',      'Material Guess')),
  quantity,
  rate, origin, destination, lineTotal,
  reviewNotes:  rbh_(rowValues, headerMap, 'Confidence / Issue Flags'),
  reviewBatchKey: isManualBatchKey_(storedKey) ? storedKey : buildBatchKey_({ broker, customerJob, poNumber, workOrder, origin, destination, truck, driver, rate })
};
}




function hasAnyData_(row) {
return [
  row.ticketDate, row.ticketNumber, row.broker, row.customerJob,
  row.poNumber, row.workOrder, row.truck, row.driver,
  row.material, row.quantity, row.rate,
  row.origin, row.destination, row.lineTotal,
  row.reviewNotes
].some(v => norm_(v) !== '');
}




// --- Status helpers ---




function getTicketStatus_(row) {
if (norm_(row.testRow) === 'Yes')
  return { code:'DO_NOT_BILL', label:'Do Not Bill', className:'status-do-not-bill', buttonLabel:'View', buttonClassName:'secondary' };
if (norm_(row.imported) === 'Yes')
  return { code:'PROCESSED', label:'Processed', className:'status-processed', buttonLabel:'View', buttonClassName:'secondary' };
if (norm_(row.reviewStatus) === 'Reviewed' || norm_(row.readyForClean) === 'Yes')
  return { code:'APPROVED', label:'Approved', className:'status-approved', buttonLabel:'View/Edit', buttonClassName:'approve' };
if (norm_(row.reviewNotes).toLowerCase().indexOf('hold') >= 0)
  return { code:'HOLD', label:'Hold', className:'status-hold', buttonLabel:'Review', buttonClassName:'danger' };
if (hasAnyData_(row))
  return { code:'DRAFT', label:'Draft', className:'status-draft', buttonLabel:'Review', buttonClassName:'warning' };
return { code:'NEW', label:'New', className:'status-new', buttonLabel:'Review', buttonClassName:'blue' };
}




function getBatchStatus_(rows) {
const codes = (rows || []).map(r => r.statusCode);
if (!codes.length) return { code:'EMPTY', label:'Empty', className:'status-processed' };
const all  = c => codes.every(x => x === c);
const some = c => codes.some(x => x === c);
if (all('DO_NOT_BILL')) return { code:'DO_NOT_BILL', label:'Do Not Bill', className:'status-do-not-bill' };
if (all('PROCESSED'))   return { code:'PROCESSED',   label:'Processed',   className:'status-processed' };
if (all('APPROVED'))    return { code:'APPROVED',    label:'Approved',    className:'status-approved' };
if (some('HOLD'))       return { code:'HOLD',        label:'Hold',        className:'status-hold' };
if (some('APPROVED') || some('PROCESSED')) return { code:'PARTIAL', label:'Partial', className:'status-partial' };
if (some('DRAFT'))      return { code:'IN_REVIEW',   label:'In Review',   className:'status-draft' };
if (some('NEW'))        return { code:'NEW',         label:'New',         className:'status-new' };
return { code:'IN_REVIEW', label:'In Review', className:'status-draft' };
}




// --- Approval validation ---




function getApprovalProblems_(payload) {
const problems = [];
const req = (key, label) => { if (!norm_(payload[key])) problems.push(label + ' is required.'); };
req('ticketNumber', 'Ticket #'); req('ticketDate', 'Ticket Date');
req('broker', 'Broker'); req('customerJob', 'Customer / Job');
req('poNumber', 'PO Number'); req('truck', 'Truck');
req('driver', 'Driver'); req('material', 'Material');
if (!norm_(payload.quantity)) problems.push('Quantity is required.');
else if (!isPositiveNumber_(payload.quantity)) problems.push('Quantity must be a number 0 or greater.');
if (!norm_(payload.rate)) problems.push('Rate is required.');
else if (!isPositiveNumber_(payload.rate)) problems.push('Rate must be a number 0 or greater.');
if (!norm_(payload.reviewer || payload.reviewerInitials)) problems.push('Reviewer is required.');
return problems;
}




function requireApprovalReady_(payload) {
const p = getApprovalProblems_(payload);
if (p.length) throw new Error('Approval blocked. ' + p.join(' '));
}




function requireApprovalReadyFromSheet_(sheet, headerMap, rowNumber) {
requireColumns_(headerMap, ['Final Ticket Number','Final Ticket Date','Final Broker',
  'Final Customer / Job','Final PO Number','Final Truck','Final Driver',
  'Final Material','Final Quantity','Final Rate',
  'Viewed in Review App','Viewed At','Viewed By']);
const g = col => sheet.getRange(rowNumber, headerMap[col]).getDisplayValue();
const payload = {
  ticketNumber: g('Final Ticket Number'), ticketDate: g('Final Ticket Date'),
  broker: g('Final Broker'), customerJob: g('Final Customer / Job'),
  poNumber: g('Final PO Number'), truck: g('Final Truck'),
  driver: g('Final Driver'), material: g('Final Material'),
  quantity: g('Final Quantity'), rate: g('Final Rate'), reviewer: 'system-check'
};
const p = getApprovalProblems_(payload);
if (p.length) throw new Error('Approval blocked. ' + p.join(' '));
}




// --- Validation ID helpers ---




function getValidationIdsByBatchKey_(batchKey) {
const { sheet, headerMap } = getValidationHeaderMap_();
requireColumns_(headerMap, ['Validation ID','Submission ID','Review Status']);
const last = sheet.getLastRow();
if (last < 2) return [];
const vals = sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getDisplayValues();
const target = norm_(batchKey);
const ids = [];
vals.forEach(row => {
  if (!isCurrentQueueRow_(row, headerMap)) return;
  const id = rbh_(row, headerMap, 'Validation ID');
  if (!id) return;
  if (getDisplayFields_(row, headerMap).reviewBatchKey === target) ids.push(id);
});
return ids;
}




function getValidationIdsForBatch_(batchKey) {
const batch = getReviewBatchByKey_(batchKey);
const fromBatches = batch ? splitIds_(batch.sourceValidationIds) : [];
if (fromBatches.length) return fromBatches;
const fromValidation = getValidationIdsByBatchKey_(batchKey);
if (fromValidation.length) return fromValidation;
throw new Error('No Source Validation IDs found for batch: ' + batchKey);
}




// --- Review batch helpers ---




function getReviewBatchRow_(batchKey) {
const { sheet, headerMap } = getReviewBatchesHeaderMap_();
requireColumns_(headerMap, ['Review Batch Key']);
const rowNumber = findRowByValue_(sheet, headerMap['Review Batch Key'], batchKey, 2);
return { sheet, headerMap, rowNumber };
}




function getReviewBatchByKey_(batchKey) {
const { sheet, headerMap, rowNumber } = getReviewBatchRow_(batchKey);
if (!rowNumber) return null;
const vals = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
const r = col => { const n = headerMap[col]; return n ? vals[n - 1] : ''; };
return {
  rowNumber, batchKey: r('Review Batch Key'), dataScope: r('Data Scope'),
  runLabel: r('Run Label'), broker: r('Broker'), customerJob: r('Customer / Job'),
  poNumber: r('PO Number'), workOrder: r('Work Order / Order'), origin: r('Origin'), destination: r('Destination'), truck: r('Truck'),
  driver: r('Driver'), rate: r('Rate'), ticketCount: r('Ticket Count'),
  totalQuantity: r('Total Quantity'), batchStatus: r('Batch Status'),
  batchNotes: r('Batch Notes'), applyToTickets: r('Apply to Tickets?'),
  lastUpdated: r('Last Updated'), sourceValidationIds: r('Source Validation IDs'),
  missingBatchInfo: r('Missing Batch Info'), readyForTicketApproval: r('Ready for Ticket Approval'),
  doNotBill: r('Do Not Bill?'), createdBy: r('Created By'),
  reviewer: r('Reviewer'), formAction: r('Form Action')
};
}


function getReviewBatchLookup_() {
 const { sheet, headerMap } = getReviewBatchesHeaderMap_();
 requireColumns_(headerMap, ['Review Batch Key']);
 const lastRow = sheet.getLastRow();
 const lastCol = sheet.getLastColumn();
 const lookup = {};
 if (lastRow < 2) return lookup;
 const vals = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
 const r = (row, col) => { const n = headerMap[col]; return n ? row[n - 1] : ''; };
 vals.forEach((row, i) => {
   const batchKey = r(row, 'Review Batch Key');
   if (!batchKey) return;
   lookup[batchKey] = {
     rowNumber: i + 2, batchKey, dataScope: r(row, 'Data Scope'),
     runLabel: r(row, 'Run Label'), broker: r(row, 'Broker'), customerJob: r(row, 'Customer / Job'),
     poNumber: r(row, 'PO Number'), workOrder: r(row, 'Work Order / Order'), origin: r(row, 'Origin'), destination: r(row, 'Destination'), truck: r(row, 'Truck'),
     driver: r(row, 'Driver'), rate: r(row, 'Rate'), ticketCount: r(row, 'Ticket Count'),
     totalQuantity: r(row, 'Total Quantity'), batchStatus: r(row, 'Batch Status'),
     batchNotes: r(row, 'Batch Notes'), applyToTickets: r(row, 'Apply to Tickets?'),
     lastUpdated: r(row, 'Last Updated'), sourceValidationIds: r(row, 'Source Validation IDs'),
     missingBatchInfo: r(row, 'Missing Batch Info'), readyForTicketApproval: r(row, 'Ready for Ticket Approval'),
     doNotBill: r(row, 'Do Not Bill?'), createdBy: r(row, 'Created By'),
     reviewer: r(row, 'Reviewer'), formAction: r(row, 'Form Action')
   };
 });
 return lookup;
}






function saveBatchFields(payload) {
if (!payload) throw new Error('Missing batch save payload.');
const batchKey = norm_(payload.batchKey);
if (!batchKey) throw new Error('Missing Review Batch Key.');
const { sheet, headerMap, rowNumber } = getReviewBatchRow_(batchKey);
requireColumns_(headerMap, ['Review Batch Key','Broker','Customer / Job','PO Number',
  'Work Order / Order','Origin','Destination','Truck','Driver','Rate','Batch Status','Batch Notes',
  'Apply to Tickets?','Last Updated','Source Validation IDs','Reviewer','Form Action']);
const targetRow = rowNumber || sheet.getLastRow() + 1;
if (!rowNumber) sheet.getRange(targetRow, headerMap['Review Batch Key']).setValue(batchKey);
const existingIds = sheet.getRange(targetRow, headerMap['Source Validation IDs']).getDisplayValue();
const fallbackIds = uniqueIds_(
  splitIds_(payload.sourceValidationIds)
    .concat(splitIds_(existingIds))
    .concat(getValidationIdsByBatchKey_(batchKey))
).join('; ');
const reviewer = (!payload.reviewer && payload.reviewer !== 0) ? '' : normalizeReviewer_(payload.reviewer);
const updates = {
  'Broker': payload.broker, 'Customer / Job': payload.customerJob,
  'PO Number': payload.poNumber, 'Work Order / Order': payload.workOrder,
  'Origin': payload.origin, 'Destination': payload.destination,
  'Truck': payload.truck, 'Driver': payload.driver, 'Rate': payload.rate,
  'Batch Status': payload.batchStatus || 'Draft', 'Batch Notes': payload.batchNotes,
  'Apply to Tickets?': payload.applyToTickets || 'No', 'Last Updated': new Date(),
  'Source Validation IDs': fallbackIds, 'Reviewer': reviewer,
  'Form Action': payload.formAction || 'Save Batch Draft'
};
Object.keys(updates).forEach(col => {
  const n = headerMap[col];
  if (!n) return;
  const v = updates[col];
  sheet.getRange(targetRow, n).setValue(v == null ? '' : (v instanceof Date ? v : String(v).trim()));
});
SpreadsheetApp.flush();
return { ok: true, batchKey, rowNumber: targetRow, sourceValidationIds: fallbackIds, message: 'Batch draft saved for ' + batchKey + '.' };
}






function applyBatchFieldsToTickets(payload) {
if (!payload) throw new Error('Missing apply batch payload.');
const batchKey = norm_(payload.batchKey);
if (!batchKey) throw new Error('Missing Review Batch Key.');
saveBatchFields({ ...payload, batchStatus: payload.batchStatus || 'Draft', formAction: 'Apply Batch Fields to Tickets', applyToTickets: 'Yes' });
const batch = getReviewBatchByKey_(batchKey);
if (!batch) throw new Error('Batch not found after save: ' + batchKey);
const validationIds = getValidationIdsForBatch_(batchKey);
const { sheet, headerMap } = getValidationHeaderMap_();
requireColumns_(headerMap, ['Validation ID','Final Broker','Final Customer / Job',
  'Final PO Number','Final Work Order / Order','Final Origin','Final Destination','Final Truck','Final Driver','Final Rate','Review Batch Key']);
let updatedCount = 0;
validationIds.forEach(id => {
  const row = findRowByValue_(sheet, headerMap['Validation ID'], id, 2);
  if (!row) return;
  const batchUpdates = {
    'Final Broker': batch.broker, 'Final Customer / Job': batch.customerJob,
    'Final PO Number': batch.poNumber, 'Final Work Order / Order': batch.workOrder,
    'Final Origin': batch.origin, 'Final Destination': batch.destination,
    'Final Truck': batch.truck, 'Final Driver': batch.driver, 'Final Rate': batch.rate
  };
  Object.keys(batchUpdates).forEach(col => {
    const v = norm_(batchUpdates[col]);
    if (v) sheet.getRange(row, headerMap[col]).setValue(v);
  });
  updatedCount++;
});
SpreadsheetApp.flush();
return { ok: true, batchKey, updatedCount, message: 'Applied batch fields to ' + updatedCount + ' ticket row(s).' };
}




function prefillFinalApprovalFieldsFromDisplay_(sheet, headerMap, rowNumber) {
 const rowValues = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
 const df = getDisplayFields_(rowValues, headerMap);
 const updates = {
   'Final Ticket Date': df.ticketDate,
   'Final Ticket Number': df.ticketNumber,
   'Final Broker': df.broker,
   'Final Customer / Job': df.customerJob,
   'Final PO Number': df.poNumber,
   'Final Work Order / Order': df.workOrder,
   'Final Truck': df.truck,
   'Final Driver': df.driver,
   'Final Material': df.material,
   'Final Quantity': df.quantity,
   'Final Rate': df.rate,
   'Final Origin': df.origin,
   'Final Destination': df.destination
 };
 Object.keys(updates).forEach(col => {
   const n = headerMap[col];
   if (!n) return;
   const existing = norm_(sheet.getRange(rowNumber, n).getDisplayValue());
   const v = norm_(updates[col]);
   if (!existing && v) sheet.getRange(rowNumber, n).setValue(v);
 });
}


function approveBatch(payload) {
 if (!payload) throw new Error('Missing batch approval payload.');
 const batchKey = norm_(payload.batchKey);
 if (!batchKey) throw new Error('Missing Review Batch Key.');
 const reviewer = normalizeReviewer_(payload.reviewer || payload.reviewerInitials);
 const { sheet, headerMap } = getValidationHeaderMap_();
 let rowTargets = (payload.rowNumbers || [])
   .map(n => Number(n))
   .filter(n => n && n >= 2)
   .filter((n, i, arr) => arr.indexOf(n) === i);
 if (!rowTargets.length) {
   const validationIds = getValidationIdsForBatch_(batchKey);
   rowTargets = validationIds.map(id => findRowByValue_(sheet, headerMap['Validation ID'], id, 2)).filter(Boolean);
 }
 if (!rowTargets.length) throw new Error('No tickets found for batch: ' + batchKey);
 requireColumns_(headerMap, ['Validation ID','Review Status','Reviewer','Reviewed At',
   'Ready for TICKETS_CLEAN','Imported to READY_FOR_INTAKE','Test Row / Do Not Bill']);
 const problems = [];
 const rowsToApprove = [];
 rowTargets.forEach(rowNumber => {
   rowNumber = Number(rowNumber);
   if (!rowNumber || rowNumber < 2 || rowNumber > sheet.getLastRow()) {
     problems.push('Invalid selected row ' + rowNumber + '.');
     return;
   }
   const g = col => sheet.getRange(rowNumber, headerMap[col]).getDisplayValue();
   if (g('Imported to READY_FOR_INTAKE') === 'Yes') {
     problems.push('Row ' + rowNumber + ' is already imported downstream.');
     return;
   }
   if (g('Test Row / Do Not Bill') === 'Yes') {
     problems.push('Row ' + rowNumber + ' is marked Do Not Bill.');
     return;
   }
   try {
     prefillFinalApprovalFieldsFromDisplay_(sheet, headerMap, rowNumber);
     requireApprovalReadyFromSheet_(sheet, headerMap, rowNumber);
     rowsToApprove.push(rowNumber);
   } catch (err) {
     problems.push('Row ' + rowNumber + ': ' + String(err && err.message ? err.message : err));
   }
 });
 if (problems.length) throw new Error('Batch approval blocked. ' + problems.join(' '));
 rowsToApprove.forEach(rowNumber => {
   sheet.getRange(rowNumber, headerMap['Review Status']).setValue('Reviewed');
   sheet.getRange(rowNumber, headerMap['Reviewer']).setValue(reviewer);
   sheet.getRange(rowNumber, headerMap['Reviewed At']).setValue(new Date());
   sheet.getRange(rowNumber, headerMap['Ready for TICKETS_CLEAN']).setValue('Yes');
 });
 SpreadsheetApp.flush();
 return { ok: true, batchKey, approvedCount: rowsToApprove.length, reviewer, message: 'Approved ' + rowsToApprove.length + ' ticket(s) in batch.' };
}


function createManualBatchFromSelected(payload) {
 if (!payload) throw new Error('Missing manual batch payload.');
 const rowNumbers = (payload.rowNumbers || [])
   .map(n => Number(n))
   .filter(n => n && n >= 2)
   .filter((n, i, arr) => arr.indexOf(n) === i);
 if (rowNumbers.length < 2) throw new Error('Select at least 2 ticket rows to create a batch.');
 const { sheet, headerMap } = getValidationHeaderMap_();
 requireColumns_(headerMap, ['Validation ID','Review Batch Key']);
 const lastRow = sheet.getLastRow();
 const lastCol = sheet.getLastColumn();
 const firstRowNumber = rowNumbers[0];
 if (firstRowNumber > lastRow) throw new Error('Selected row is outside VALIDATION: ' + firstRowNumber);
 const firstValues = sheet.getRange(firstRowNumber, 1, 1, lastCol).getDisplayValues()[0];
 const firstFields = getDisplayFields_(firstValues, headerMap);
 const firstTicket = firstFields.ticketNumber || rbh_(firstValues, headerMap, 'Validation ID') || String(firstRowNumber);
 const safeTicket = String(firstTicket).replace(/[^A-Za-z0-9]+/g, '').slice(0, 18) || String(firstRowNumber);
 const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
 const batchKey = 'MANUAL_' + stamp + '_' + safeTicket;
 const sourceValidationIds = [];
 rowNumbers.forEach(rowNumber => {
   if (rowNumber > lastRow) return;
   const rowValues = sheet.getRange(rowNumber, 1, 1, lastCol).getDisplayValues()[0];
   const validationId = rbh_(rowValues, headerMap, 'Validation ID');
   if (!validationId) return;
   sourceValidationIds.push(validationId);
   sheet.getRange(rowNumber, headerMap['Review Batch Key']).setValue(batchKey);
 });
 if (sourceValidationIds.length < 2) throw new Error('Could not find at least 2 valid selected tickets.');
 const reviewer = norm_(payload.reviewer || payload.reviewerInitials);
 const batchPayload = {
   batchKey,
   broker: firstFields.broker,
   customerJob: firstFields.customerJob,
   poNumber: firstFields.poNumber,
   workOrder: firstFields.workOrder,
   origin: firstFields.origin,
   destination: firstFields.destination,
   truck: firstFields.truck,
   driver: firstFields.driver,
   rate: firstFields.rate,
   batchStatus: 'Draft',
   batchNotes: 'Manual batch created from selected tickets.',
   reviewer,
   applyToTickets: 'No',
   formAction: 'Manual Batch Create'
 };
 const saved = saveBatchFields(batchPayload);
 SpreadsheetApp.flush();
 return {
   ok: true,
   batchKey,
   selectedCount: sourceValidationIds.length,
   sourceValidationIds: sourceValidationIds.join('; '),
   message: 'Created manual batch with ' + sourceValidationIds.length + ' selected ticket(s).'
 };
}
function addSelectedTicketsToExistingBatch(payload) {
 if (!payload) throw new Error('Missing add-to-batch payload.');
 const targetBatchKey = norm_(payload.targetBatchKey || payload.batchKey);
 if (!targetBatchKey) throw new Error('Choose an existing batch before adding tickets.');
 const rowNumbers = (payload.rowNumbers || [])
   .map(n => Number(n))
   .filter(n => n && n >= 2)
   .filter((n, i, arr) => arr.indexOf(n) === i);
 if (!rowNumbers.length) throw new Error('Select at least 1 ticket row to add to the batch.');
 const existingBatch = getReviewBatchByKey_(targetBatchKey);
 if (!existingBatch) throw new Error('Target batch not found: ' + targetBatchKey);
 const { sheet, headerMap } = getValidationHeaderMap_();
 requireColumns_(headerMap, ['Validation ID','Review Batch Key','Final Broker','Final Customer / Job',
   'Final PO Number','Final Work Order / Order','Final Origin','Final Destination','Final Truck','Final Driver','Final Rate']);
 const lastRow = sheet.getLastRow();
 const lastCol = sheet.getLastColumn();
 const addedIds = [];
 const batchUpdates = {
   'Final Broker': existingBatch.broker,
   'Final Customer / Job': existingBatch.customerJob,
   'Final PO Number': existingBatch.poNumber,
   'Final Work Order / Order': existingBatch.workOrder,
   'Final Origin': existingBatch.origin,
   'Final Destination': existingBatch.destination,
   'Final Truck': existingBatch.truck,
   'Final Driver': existingBatch.driver,
   'Final Rate': existingBatch.rate
 };
 rowNumbers.forEach(rowNumber => {
   if (rowNumber > lastRow) return;
   const rowValues = sheet.getRange(rowNumber, 1, 1, lastCol).getDisplayValues()[0];
   const validationId = rbh_(rowValues, headerMap, 'Validation ID');
   if (!validationId) return;
   addedIds.push(validationId);
   sheet.getRange(rowNumber, headerMap['Review Batch Key']).setValue(targetBatchKey);
   Object.keys(batchUpdates).forEach(col => {
     const v = norm_(batchUpdates[col]);
     if (v) sheet.getRange(rowNumber, headerMap[col]).setValue(v);
   });
 });
 if (!addedIds.length) throw new Error('Could not find valid selected ticket rows to add.');
 const mergedIds = uniqueIds_(splitIds_(existingBatch.sourceValidationIds).concat(addedIds));
 saveBatchFields({
   batchKey: targetBatchKey,
   broker: existingBatch.broker,
   customerJob: existingBatch.customerJob,
   poNumber: existingBatch.poNumber,
   workOrder: existingBatch.workOrder,
   origin: existingBatch.origin,
   destination: existingBatch.destination,
   truck: existingBatch.truck,
   driver: existingBatch.driver,
   rate: existingBatch.rate,
   batchStatus: existingBatch.batchStatus || 'Draft',
   batchNotes: existingBatch.batchNotes,
   reviewer: existingBatch.reviewer || norm_(payload.reviewer || payload.reviewerInitials),
   sourceValidationIds: mergedIds.join('; '),
   applyToTickets: 'No',
   formAction: 'Add Tickets to Existing Batch'
 });
 SpreadsheetApp.flush();
 return {
   ok: true,
   batchKey: targetBatchKey,
   addedCount: addedIds.length,
   sourceValidationIds: mergedIds.join('; '),
   message: 'Added ' + addedIds.length + ' selected ticket(s) to batch ' + targetBatchKey + '.'
 };
}






// --- Main overview queue ---




function getPendingReviewBatches(options) {
return getPendingReviewBatchesFromAirtable(options);
if (false) {
const includePrevious = !!(options && options.includePrevious);
const sheet = getValidationSheet_();
const lastRow = sheet.getLastRow();
if (lastRow < 2) return [];
const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
const headerMap = getHeaderMap_(headers);
requireColumns_(headerMap, [
  'Validation ID','Submission ID','Review File URL','Source File Name',
  'Review File URL','Review File Name','Review Status','Ready for TICKETS_CLEAN',
  'Imported to READY_FOR_INTAKE','Test Row / Do Not Bill','Confidence / Issue Flags',
  'Data Scope','Run Label','Ticket Date Guess','Ticket Number Guess','Broker Guess',
  'Customer / Job Guess','PO Number Guess','Work Order / Order Guess','Truck Guess',
  'Driver Guess','Material Guess','Quantity Guess','Rate Guess',
  'Origin Guess','Destination Guess','Line Total Guess','Final Origin','Final Destination',
  'Final Broker','Final Customer / Job','Final PO Number','Final Work Order / Order',
  'Final Ticket Date','Final Ticket Number','Final Truck','Final Driver',
  'Final Material','Final Quantity','Final Rate',
  'Viewed in Review App','Viewed At','Viewed By'
]);
const savedBatchLookup = getReviewBatchLookup_();
const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getDisplayValues();
const batches = {};
values.forEach((rowValues, index) => {
  const sheetRow = index + 2;
  const validationId = rbh_(rowValues, headerMap, 'Validation ID');
  if (!validationId || !isCurrentQueueRow_(rowValues, headerMap)) return;
  const df = getDisplayFields_(rowValues, headerMap);
  const reviewStatus  = rbh_(rowValues, headerMap, 'Review Status');
  const readyForClean = rbh_(rowValues, headerMap, 'Ready for TICKETS_CLEAN');
  const imported      = rbh_(rowValues, headerMap, 'Imported to READY_FOR_INTAKE');
  const testRow       = rbh_(rowValues, headerMap, 'Test Row / Do Not Bill');
  const dataScope     = rbh_(rowValues, headerMap, 'Data Scope');
  const runLabel      = rbh_(rowValues, headerMap, 'Run Label');
  const sourceFileUrl = getEffectiveReviewFileUrl_(rowValues, headers, headerMap);
  const sourceFileName = getEffectiveReviewFileName_(rowValues, headers, headerMap);
  const viewedInReviewApp = rbh_(rowValues, headerMap, 'Viewed in Review App');
  const viewedAt = rbh_(rowValues, headerMap, 'Viewed At');
  const viewedBy = rbh_(rowValues, headerMap, 'Viewed By');
  const batchKey  = df.reviewBatchKey || 'UNBATCHED';
  const savedBatch = batches[batchKey] ? null : savedBatchLookup[batchKey];
  const bk = (saved, fallback) => saved ? saved : fallback;
  if (!batches[batchKey]) {
    const bb = savedBatch;
    batches[batchKey] = {
      batchKey, batchHasSavedRecord: !!bb,
      batchFormAction: bb ? bb.formAction : '',
      broker: bk(bb && bb.broker, df.broker), brokerDisplay: displayMissing_(bk(bb && bb.broker, df.broker)),
      customerJob: bk(bb && bb.customerJob, df.customerJob), customerJobDisplay: displayMissing_(bk(bb && bb.customerJob, df.customerJob)),
      poNumber: bk(bb && bb.poNumber, df.poNumber), poNumberDisplay: displayMissing_(bk(bb && bb.poNumber, df.poNumber)),
      workOrder: bk(bb && bb.workOrder, df.workOrder), workOrderDisplay: displayMissing_(bk(bb && bb.workOrder, df.workOrder)),
      origin: bk(bb && bb.origin, df.origin), originDisplay: displayMissing_(bk(bb && bb.origin, df.origin)),
      destination: bk(bb && bb.destination, df.destination), destinationDisplay: displayMissing_(bk(bb && bb.destination, df.destination)),
      truck: bk(bb && bb.truck, df.truck), truckDisplay: displayMissing_(bk(bb && bb.truck, df.truck)),
      driver: bk(bb && bb.driver, df.driver), driverDisplay: displayMissing_(bk(bb && bb.driver, df.driver)),
      rate: bk(bb && bb.rate, df.rate), rateDisplay: displayMissing_(bk(bb && bb.rate, df.rate)),
      batchStatus: bb ? bb.batchStatus : '', batchNotes: bb ? bb.batchNotes : '',
      reviewer: bb ? bb.reviewer : '',
      dataScope: bb ? bb.dataScope : dataScope, runLabel: bb ? bb.runLabel : runLabel,
      batchTitle: buildBatchDisplayTitle_({ broker: bk(bb && bb.broker, df.broker), customerJob: bk(bb && bb.customerJob, df.customerJob), poNumber: bk(bb && bb.poNumber, df.poNumber), workOrder: bk(bb && bb.workOrder, df.workOrder), origin: bk(bb && bb.origin, df.origin), destination: bk(bb && bb.destination, df.destination), rate: bk(bb && bb.rate, df.rate) }, batchKey),
      ticketCount: 0, invoiceTotal: 0, invoiceTotalDisplay: formatMoney_(0), rows: []
    };
  }
  const rowObj = {
    rowNumber: sheetRow, validationId, submissionId: rbh_(rowValues, headerMap, 'Submission ID'),
    sourceFileUrl, sourceFileName, reviewStatus, readyForClean, imported, testRow, dataScope, runLabel,
    viewedInReviewApp, viewedAt, viewedBy,
    viewedLabel: norm_(viewedInReviewApp).toLowerCase() === 'yes' ? 'Viewed' : 'Not Viewed',
    viewedClassName: norm_(viewedInReviewApp).toLowerCase() === 'yes' ? 'viewed-yes' : 'viewed-no',
    ticketDate: df.ticketDate, ticketNumber: df.ticketNumber, broker: df.broker,
    customerJob: df.customerJob, poNumber: df.poNumber, workOrder: df.workOrder,
    truck: df.truck, driver: df.driver, material: df.material, quantity: df.quantity,
    rate: df.rate, origin: df.origin, destination: df.destination, lineTotal: df.lineTotal,
    reviewNotes: df.reviewNotes,
    ticketDateDisplay: displayMissing_(df.ticketDate), ticketNumberDisplay: displayMissing_(df.ticketNumber),
    brokerDisplay: displayMissing_(df.broker), customerJobDisplay: displayMissing_(df.customerJob),
    poNumberDisplay: displayMissing_(df.poNumber), workOrderDisplay: displayMissing_(df.workOrder),
    truckDisplay: displayMissing_(df.truck), driverDisplay: displayMissing_(df.driver),
    materialDisplay: displayMissing_(df.material), quantityDisplay: displayMissing_(df.quantity),
    rateDisplay: displayMissing_(df.rate), originDisplay: displayMissing_(df.origin),
    destinationDisplay: displayMissing_(df.destination), lineTotalDisplay: displayMissing_(df.lineTotal)
  };
  const status = getTicketStatus_(rowObj);
  if (!includePrevious && ['APPROVED', 'PROCESSED', 'DO_NOT_BILL'].indexOf(status.code) !== -1) return;
  rowObj.statusCode = status.code; rowObj.statusLabel = status.label;
  rowObj.statusClassName = status.className; rowObj.buttonLabel = status.buttonLabel;
  rowObj.buttonClassName = status.buttonClassName;
  const rowLineTotalNumber = numberFromReviewValue_(rowObj.lineTotal);
  if (rowLineTotalNumber !== null) batches[batchKey].invoiceTotal += rowLineTotalNumber;
  batches[batchKey].ticketCount++;
  batches[batchKey].rows.push(rowObj);
});
const ORDER = { NEW:1, IN_REVIEW:2, HOLD:3, PARTIAL:4, APPROVED:5, PROCESSED:6, DO_NOT_BILL:7, EMPTY:8 };
return Object.values(batches).map(batch => {
  const s = getBatchStatus_(batch.rows);
  batch.statusCode = s.code; batch.statusLabel = s.label; batch.statusClassName = s.className;
  batch.invoiceTotalDisplay = formatMoney_(batch.invoiceTotal || 0);
  return batch;
}).filter(batch => {
  return batch.rows.length > 0 && (includePrevious || ['APPROVED', 'PROCESSED', 'DO_NOT_BILL', 'EMPTY'].indexOf(batch.statusCode) === -1);
}).sort((a, b) => {
  const diff = (ORDER[a.statusCode] || 99) - (ORDER[b.statusCode] || 99);
  return diff !== 0 ? diff : a.batchKey.localeCompare(b.batchKey);
});
}
}






// --- Ticket save / approve / return to draft ---


function markTicketViewed(payload) {
 if (!payload) throw new Error('Missing viewed payload.');
 const rowNumber = Number(payload.rowNumber);
 if (!rowNumber || rowNumber < 2) throw new Error('Invalid row number: ' + payload.rowNumber);
 const { sheet, headerMap } = getValidationHeaderMap_();
 requireColumns_(headerMap, ['Viewed in Review App','Viewed At','Viewed By']);
 if (rowNumber > sheet.getMaxRows()) throw new Error('Row number outside sheet: ' + rowNumber);
 const existingViewed = sheet.getRange(rowNumber, headerMap['Viewed in Review App']).getDisplayValue();
 if (norm_(existingViewed).toLowerCase() === 'yes') {
   return { ok: true, rowNumber, alreadyViewed: true, message: 'Ticket was already marked viewed.' };
 }
 const viewedBy = norm_(payload.viewedBy || payload.reviewer || payload.reviewerInitials);
 sheet.getRange(rowNumber, headerMap['Viewed in Review App']).setValue('Yes');
 sheet.getRange(rowNumber, headerMap['Viewed At']).setValue(new Date());
 sheet.getRange(rowNumber, headerMap['Viewed By']).setValue(viewedBy);
 SpreadsheetApp.flush();
 return { ok: true, rowNumber, alreadyViewed: false, message: 'Ticket marked viewed.' };
}






function saveTicketFields(payload) {
if (!payload) throw new Error('Missing save payload.');
const rowNumber = Number(payload.rowNumber);
if (!rowNumber || rowNumber < 2) throw new Error('Invalid row number: ' + payload.rowNumber);
const { sheet, headerMap } = getValidationHeaderMap_();
const cols = {
  ticketDate: 'Final Ticket Date', ticketNumber: 'Final Ticket Number',
  broker: 'Final Broker', customerJob: 'Final Customer / Job',
  poNumber: 'Final PO Number', workOrder: 'Final Work Order / Order',
  truck: 'Final Truck', driver: 'Final Driver', material: 'Final Material',
  quantity: 'Final Quantity', rate: 'Final Rate',
  origin: 'Final Origin', destination: 'Final Destination',
  lineTotal: 'Line Total Guess', reviewNotes: 'Confidence / Issue Flags'
};
requireColumns_(headerMap, Object.values(cols));
if (rowNumber > sheet.getMaxRows()) throw new Error('Row number outside sheet: ' + rowNumber);
Object.keys(cols).forEach(key => {
  let v = payload[key] == null ? '' : String(payload[key]).trim();
  if (key === 'material') v = canonicalizeMaterial_(v);
  sheet.getRange(rowNumber, headerMap[cols[key]]).setValue(v);
});
SpreadsheetApp.flush();
return { ok: true, rowNumber, message: 'Draft saved for row ' + rowNumber + '.' };
}




function approveTicket(payload) {
if (!payload) throw new Error('Missing approval payload.');
const rowNumber = Number(payload.rowNumber);
if (!rowNumber || rowNumber < 2) throw new Error('Invalid row number: ' + payload.rowNumber);
requireApprovalReady_(payload);
const reviewer = normalizeReviewer_(payload.reviewer || payload.reviewerInitials);
const { sheet, headerMap } = getValidationHeaderMap_();
requireColumns_(headerMap, ['Review Status','Reviewer','Reviewed At',
  'Ready for TICKETS_CLEAN','Imported to READY_FOR_INTAKE','Test Row / Do Not Bill','Final Rate']);
if (rowNumber > sheet.getMaxRows()) throw new Error('Row number outside sheet: ' + rowNumber);
saveTicketFields(payload);
requireApprovalReadyFromSheet_(sheet, headerMap, rowNumber);
const g = col => sheet.getRange(rowNumber, headerMap[col]).getDisplayValue();
if (g('Imported to READY_FOR_INTAKE') === 'Yes') throw new Error('Approval blocked. This ticket has already been imported downstream.');
if (g('Test Row / Do Not Bill') === 'Yes') throw new Error('Approval blocked. This is marked Test Row / Do Not Bill.');
sheet.getRange(rowNumber, headerMap['Review Status']).setValue('Reviewed');
sheet.getRange(rowNumber, headerMap['Reviewer']).setValue(reviewer);
sheet.getRange(rowNumber, headerMap['Reviewed At']).setValue(new Date());
sheet.getRange(rowNumber, headerMap['Ready for TICKETS_CLEAN']).setValue('Yes');
SpreadsheetApp.flush();
return { ok: true, rowNumber, reviewer, message: 'Saved and approved row ' + rowNumber + ' by ' + reviewer + '.' };
}




function returnTicketToDraft(payload) {
if (!payload) throw new Error('Missing return-to-draft payload.');
const rowNumber = Number(payload.rowNumber);
if (!rowNumber || rowNumber < 2) throw new Error('Invalid row number: ' + payload.rowNumber);
const { sheet, headerMap } = getValidationHeaderMap_();
requireColumns_(headerMap, ['Review Status','Reviewed At','Ready for TICKETS_CLEAN',
  'Imported to READY_FOR_INTAKE','Test Row / Do Not Bill']);
const g = col => sheet.getRange(rowNumber, headerMap[col]).getDisplayValue();
if (g('Imported to READY_FOR_INTAKE') === 'Yes') throw new Error('Cannot return to draft. This ticket has already been imported downstream.');
if (g('Test Row / Do Not Bill') === 'Yes') throw new Error('Cannot return to draft. This ticket is marked Test Row / Do Not Bill.');
sheet.getRange(rowNumber, headerMap['Review Status']).setValue('Draft');
sheet.getRange(rowNumber, headerMap['Reviewed At']).setValue('');
sheet.getRange(rowNumber, headerMap['Ready for TICKETS_CLEAN']).setValue('No');
SpreadsheetApp.flush();
return { ok: true, rowNumber, message: 'Returned row ' + rowNumber + ' to draft.' };
}




// ============================================================================
// Row-level ticket scan replacement support
// Purpose: let the review app save a corrected/separated image for one VALIDATION row.
// ============================================================================


function rbFirst_(rowValues, headers, colName) {
 const cols = getAllColumnIndexes_(headers, colName);
 for (let i = 0; i < cols.length; i++) {
   const v = norm_(rowValues[cols[i] - 1]);
   if (v) return v;
 }
 return '';
}


function getEffectiveReviewFileUrl_(rowValues, headers, headerMap) {
 return firstNonBlank_(
   rbh_(rowValues, headerMap, 'Final Review File URL'),
   rbFirst_(rowValues, headers, 'Review File URL')
 );
}


function getEffectiveReviewFileName_(rowValues, headers, headerMap) {
 return firstNonBlank_(
   rbh_(rowValues, headerMap, 'Final Review File Name'),
   rbh_(rowValues, headerMap, 'Review File Name'),
   rbh_(rowValues, headerMap, 'Source File Name')
 );
}


function setAllMatchingHeaders_(sheet, headers, rowNumber, colName, value) {
 const cols = getAllColumnIndexes_(headers, colName);
 cols.forEach(col => sheet.getRange(rowNumber, col).setValue(value == null ? '' : value));
}


function cleanUploadedFileName_(name, fallbackBase) {
 const raw = norm_(name);
 const fallback = sanitizeId_(fallbackBase || 'corrected_ticket_scan') + '.png';
 if (!raw) return fallback;
 return raw.replace(/[^A-Za-z0-9._ -]+/g, '_').trim() || fallback;
}


function replaceTicketScanAirtable_(payload) {
  const validationRecordId = norm_(payload.validationRecordId);
  if (!validationRecordId) throw new Error('Missing Airtable validation record ID.');
  const folderId = norm_(payload.folderId) || REVIEW_CORRECTIONS_FOLDER_ID;
  if (!folderId || folderId === 'PASTE_CORRECTED_REVIEW_IMAGES_FOLDER_ID_HERE') throw new Error('Missing corrected review image folder ID. Set REVIEW_CORRECTIONS_FOLDER_ID before using Replace Scan.');
  const dataBase64 = String(payload.dataBase64 || '').replace(/^data:[^,]+,/, '');
  if (!dataBase64) throw new Error('Missing uploaded file data.');
  const fileName = cleanUploadedFileName_(payload.fileName, validationRecordId);
  const file = DriveApp.getFolderById(folderId).createFile(Utilities.newBlob(Utilities.base64Decode(dataBase64), norm_(payload.mimeType) || 'application/octet-stream', fileName));
  const fileUrl = file.getUrl();
  const correctedBy = normalizeReviewer_(payload.correctedBy || payload.reviewer || 'system');
  const notes = norm_(payload.notes);
  const fields = {
    'Final Review File URL': fileUrl,
    'Final Review File Name': fileName,
    'Image Correction Status': 'Corrected',
    'Image Correction Notes': notes,
    'Image Corrected At': new Date().toISOString(),
    'Image Corrected By': correctedBy
  };
  const response = UrlFetchApp.fetch(DIANE_AIRTABLE_API_ROOT + DIANE_AIRTABLE_BASE_ID + '/' + DIANE_AIRTABLE_TABLES.validationQueue + '/' + encodeURIComponent(validationRecordId), {method:'patch', contentType:'application/json', headers:{Authorization:'Bearer ' + getAirtableToken_()}, payload:JSON.stringify({fields:fields}), muteHttpExceptions:true});
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) throw new Error('Airtable replacement update failed (' + status + '): ' + response.getContentText());
  return {ok:true, validationRecordId:validationRecordId, fileName:fileName, fileUrl:fileUrl, message:'Replacement scan saved to Airtable.'};
}

function replaceTicketScan(payload) {
 if (!payload) throw new Error('Missing scan replacement payload.');
 console.log(JSON.stringify({event:'replaceTicketScan received', source:payload.source || '', rowNumber:payload.rowNumber, validationRecordId:payload.validationRecordId || ''}));
 var isAirtable = payload.source === 'AIRTABLE_TEST' || !!norm_(payload.validationRecordId);
 console.log(JSON.stringify({event:'replaceTicketScan branch', handler:isAirtable?'Airtable':'Google Sheets', source:payload.source || '', rowNumber:payload.rowNumber, validationRecordId:payload.validationRecordId || ''}));
 if (isAirtable) return replaceTicketScanAirtable_(payload);
 const rowNumber = Number(payload.rowNumber);
 if (!rowNumber || rowNumber < 2) throw new Error('Invalid row number: ' + payload.rowNumber);


 const folderId = norm_(payload.folderId) || REVIEW_CORRECTIONS_FOLDER_ID;
 if (!folderId || folderId === 'PASTE_CORRECTED_REVIEW_IMAGES_FOLDER_ID_HERE') {
   throw new Error('Missing corrected review image folder ID. Set REVIEW_CORRECTIONS_FOLDER_ID before using Replace Scan.');
 }


 const dataBase64 = String(payload.dataBase64 || '').replace(/^data:[^,]+,/, '');
 if (!dataBase64) throw new Error('Missing uploaded file data.');
 const mimeType = norm_(payload.mimeType) || 'application/octet-stream';


 const { sheet, headerMap } = getValidationHeaderMap_();
 const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
 requireColumns_(headerMap, [
   'Validation ID',
   'Final Review File URL',
   'Final Review File Name',
   'Original Review File URL',
   'Original Review File Name',
   'Image Correction Status',
   'Image Correction Notes',
   'Image Corrected At',
   'Image Corrected By'
 ]);


 const rowValues = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
 const validationId = rbh_(rowValues, headerMap, 'Validation ID') || ('ROW_' + rowNumber);
 const oldUrl = getEffectiveReviewFileUrl_(rowValues, headers, headerMap);
 const oldName = getEffectiveReviewFileName_(rowValues, headers, headerMap);


 const fileName = cleanUploadedFileName_(payload.fileName, validationId);
 const bytes = Utilities.base64Decode(dataBase64);
 const blob = Utilities.newBlob(bytes, mimeType, fileName);
 const file = DriveApp.getFolderById(folderId).createFile(blob);
 const newUrl = file.getUrl();
 const correctedBy = normalizeReviewer_(payload.correctedBy || payload.reviewer || payload.reviewerInitials || 'system');
 const notes = norm_(payload.notes);


 if (!rbh_(rowValues, headerMap, 'Original Review File URL')) {
   sheet.getRange(rowNumber, headerMap['Original Review File URL']).setValue(oldUrl);
 }
 if (!rbh_(rowValues, headerMap, 'Original Review File Name')) {
   sheet.getRange(rowNumber, headerMap['Original Review File Name']).setValue(oldName);
 }


 sheet.getRange(rowNumber, headerMap['Final Review File URL']).setValue(newUrl);
 sheet.getRange(rowNumber, headerMap['Final Review File Name']).setValue(fileName);
 sheet.getRange(rowNumber, headerMap['Image Correction Status']).setValue('Corrected');
 sheet.getRange(rowNumber, headerMap['Image Correction Notes']).setValue(notes);
 sheet.getRange(rowNumber, headerMap['Image Corrected At']).setValue(new Date());
 sheet.getRange(rowNumber, headerMap['Image Corrected By']).setValue(correctedBy);


 // Keep legacy duplicate Review File URL columns compatible with the review app and downstream tools.
 setAllMatchingHeaders_(sheet, headers, rowNumber, 'Review File URL', newUrl);


 SpreadsheetApp.flush();
 return {
   ok: true,
   rowNumber,
   validationId,
   fileName,
   fileUrl: newUrl,
   message: 'Replacement scan saved for row ' + rowNumber + '.'
 };
}


// ============================================================================
// 07 PARSER_OUTPUT to VALIDATION
// Purpose: move structured Document AI parser rows into VALIDATION for review.
// Safe behavior:
// - skips old DOC_AI_TEST rows
// - skips rows already marked Imported to RAW_OCR = Yes
// - skips parser rows whose generated Validation ID already exists
// - skips duplicate tickets by Ticket Search Key
// - also skips duplicate tickets by Ticket Number + Date so truck-name weirdness does not duplicate rows
// - writes review rows as Needs Review, not approved
// - fills both guess fields and final/editable fields so the review UI can edit/approve
// ============================================================================




function preview07ParserOutputToValidation() {
 return importParserOutputToValidation_({ dryRun: true, limit: 250 });
}




function logPreview07ParserOutputToValidation() {
 const result = preview07ParserOutputToValidation();
 console.log(JSON.stringify(result, null, 2));
 return result;
}




function run07ParserOutputToValidation() {
 return importParserOutputToValidation_({ dryRun: false, limit: 250 });
}




function importParserOutputToValidation_(options) {
 options = options || {};
 const dryRun = options.dryRun === true;
 const limit = Number(options.limit || 250);




 const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 const parserSheet = ss.getSheetByName('PARSER_OUTPUT');
 const validationSheet = ss.getSheetByName(VALIDATION_SHEET_NAME);
 const submissionsSheet = ss.getSheetByName('SUBMISSIONS');




 if (!parserSheet) throw new Error('Sheet not found: PARSER_OUTPUT');
 if (!validationSheet) throw new Error('Sheet not found: ' + VALIDATION_SHEET_NAME);
 if (!submissionsSheet) throw new Error('Sheet not found: SUBMISSIONS');




 const parser = getTableData_(parserSheet);
 const validation = getTableData_(validationSheet);
 const submissions = getTableData_(submissionsSheet);




 requireColumns_(parser.headerMap, [
   'Parser Run ID','OCR ID','Submission ID','Source File Name','Raw OCR Text',
   'Matched Profile','Parser Status','Ticket Date','Ticket Number','Truck',
   'Work Order / Order','PO Number','Customer / Job','Material','Quantity',
   'Broker','Driver','Origin','Destination','Rate','Line Total','Parser Notes',
   'Imported to RAW_OCR'
 ]);




 requireColumns_(validation.headerMap, [
   'Validation ID','OCR ID','Submission ID','OCR Processed At','OCR Tool / Method',
   'Raw OCR Text','Source File Name','Broker Guess','Ticket Date Guess','Ticket Number Guess',
   'Truck Guess','Driver Guess','Customer / Job Guess','PO Number Guess','Work Order / Order Guess',
   'Origin Guess','Destination Guess','Material Guess','Quantity Guess','Rate Guess','Line Total Guess',
   'OCR Confidence','OCR Notes','Confidence / Issue Flags','Review Status','Final Ticket Date',
   'Final Ticket Number','Final Broker','Final Truck','Final Driver','Final Customer / Job',
   'Final PO Number','Final Work Order / Order','Final Origin','Final Destination','Final Material',
   'Final Quantity','Final Rate','Ready for TICKETS_CLEAN','Imported to READY_FOR_INTAKE',
   'Test Row / Do Not Bill','Review Batch Key','Data Scope','Run Label','Review File Name',
   'Parsed to PARSER_OUTPUT?','Ticket Search Key'
 ]);




 const submissionLookup = buildSubmissionLookup_(submissions);
 const existingValidationIds = buildExistingSet_(validation, 'Validation ID');
 const existingTicketKeys = buildExistingSet_(validation, 'Ticket Search Key');
 const existingTicketDateKeys = buildExistingTicketDateSet_(validation);




 const results = {
   dryRun,
   checked: 0,
   inserted: 0,
   skipped: 0,
   skippedRows: [],
   insertedRows: []
 };




 const reviewFileUrlColumns = getAllColumnIndexes_(validation.headers, 'Review File URL');
 const now = new Date();




 for (let i = 0; i < parser.rows.length; i++) {
   if (results.checked >= limit) break;




   const sourceRowNumber = i + 2;
   const row = parser.rows[i];
   const p = col => valueByHeader_(row, parser.headerMap, col);




   const parserRunId = norm_(p('Parser Run ID'));
   const importedFlag = norm_(p('Imported to RAW_OCR'));
   const submissionId = norm_(p('Submission ID'));
   const ocrId = norm_(p('OCR ID'));




   if (!parserRunId && !submissionId && !ocrId) continue;




   results.checked++;




   if (/^DOC_AI_TEST_/i.test(parserRunId)) {
     pushSkip_(results, sourceRowNumber, parserRunId, 'Skipped old DOC_AI_TEST parser row.');
     continue;
   }




   if (importedFlag.toLowerCase() === 'yes') {
     pushSkip_(results, sourceRowNumber, parserRunId, 'Already marked Imported to RAW_OCR = Yes.');
     continue;
   }




   const validationId = makeValidationIdFromParserRun_(parserRunId, submissionId, ocrId);
   if (existingValidationIds.has(validationId)) {
     pushSkip_(results, sourceRowNumber, parserRunId, 'Validation ID already exists: ' + validationId);
     if (!dryRun) markParserRowImported_(parserSheet, parser.headerMap, sourceRowNumber, 'Already existed in VALIDATION: ' + validationId);
     continue;
   }




   const ticketSearchKey = buildParserTicketSearchKey_(p('Ticket Number'), p('Truck'), p('Ticket Date'));
   const ticketDateKey = buildTicketDateKey_(p('Ticket Number'), p('Ticket Date'));




   if (ticketSearchKey && existingTicketKeys.has(ticketSearchKey)) {
     pushSkip_(results, sourceRowNumber, parserRunId, 'Ticket Search Key already exists: ' + ticketSearchKey);
     continue;
   }




   if (ticketDateKey && existingTicketDateKeys.has(ticketDateKey)) {
     pushSkip_(results, sourceRowNumber, parserRunId, 'Ticket Number + Date already exists: ' + ticketDateKey);
     continue;
   }




   const sub = submissionLookup[submissionId] || {};
   const reviewFileUrl = firstNonBlank_(sub.normalizedFileLink, sub.sourceDriveFileLink, sub.sourceFileUrl);
   const reviewFileName = firstNonBlank_(p('Source File Name'), sub.sourceFileName);




   const broker = firstNonBlank_(p('Broker'), p('Context Broker'));
   const driver = firstNonBlank_(p('Driver'), p('Context Driver'));
   const rate = firstNonBlank_(p('Rate'), p('Context Rate'));
   const destination = firstNonBlank_(p('Destination'), p('Context Destination'));




   const fieldValues = {
     ticketDate: p('Ticket Date'),
     ticketNumber: p('Ticket Number'),
     broker,
     truck: p('Truck'),
     driver,
     customerJob: p('Customer / Job'),
     poNumber: p('PO Number'),
     workOrder: p('Work Order / Order'),
     origin: p('Origin'),
     destination,
     material: p('Material'),
     quantity: p('Quantity'),
     rate,
     lineTotal: p('Line Total')
   };




   const reviewBatchKey = buildBatchKey_({
     broker: fieldValues.broker,
     customerJob: fieldValues.customerJob,
     poNumber: fieldValues.poNumber,
     workOrder: fieldValues.workOrder,
     origin: fieldValues.origin,
     destination: fieldValues.destination,
     truck: fieldValues.truck,
     driver: fieldValues.driver,
     rate: fieldValues.rate
   });




   const targetRowValues = new Array(validation.headers.length).fill('');
   const set = (col, value) => setByHeader_(targetRowValues, validation.headerMap, col, value);




   set('Validation ID', validationId);
   set('OCR ID', firstNonBlank_(ocrId, parserRunId));
   set('Submission ID', submissionId);
   set('OCR Processed At', now);
   set('OCR Tool / Method', '07 PARSER_OUTPUT to VALIDATION');
   set('Raw OCR Text', p('Raw OCR Text'));
   set('Source File Name', reviewFileName);




   set('Broker Guess', fieldValues.broker);
   set('Ticket Date Guess', fieldValues.ticketDate);
   set('Ticket Number Guess', fieldValues.ticketNumber);
   set('Truck Guess', fieldValues.truck);
   set('Driver Guess', fieldValues.driver);
   set('Customer / Job Guess', fieldValues.customerJob);
   set('PO Number Guess', fieldValues.poNumber);
   set('Work Order / Order Guess', fieldValues.workOrder);
   set('Origin Guess', fieldValues.origin);
   set('Destination Guess', fieldValues.destination);
   set('Material Guess', fieldValues.material);
   set('Quantity Guess', fieldValues.quantity);
   set('Rate Guess', fieldValues.rate);
   set('Line Total Guess', fieldValues.lineTotal);




   set('OCR Confidence', 'Parser');
   set('OCR Notes', 'Created by 07 PARSER_OUTPUT to VALIDATION. Source parser row ' + sourceRowNumber + '.');
   set('Confidence / Issue Flags', firstNonBlank_(p('Parser Notes'), 'Needs human review before invoicing or driver pay.'));
   set('Review Status', 'Needs Review');




   set('Final Ticket Date', fieldValues.ticketDate);
   set('Final Ticket Number', fieldValues.ticketNumber);
   set('Final Broker', fieldValues.broker);
   set('Final Truck', fieldValues.truck);
   set('Final Driver', fieldValues.driver);
   set('Final Customer / Job', fieldValues.customerJob);
   set('Final PO Number', fieldValues.poNumber);
   set('Final Work Order / Order', fieldValues.workOrder);
   set('Final Origin', fieldValues.origin);
   set('Final Destination', fieldValues.destination);
   set('Final Material', fieldValues.material);
   set('Final Quantity', fieldValues.quantity);
   set('Final Rate', fieldValues.rate);




   set('Ready for TICKETS_CLEAN', 'No');
   set('Imported to READY_FOR_INTAKE', 'No');
   set('Test Row / Do Not Bill', 'No');
   set('Review Batch Key', reviewBatchKey);
   set('Data Scope', 'Document AI Parsed Ticket');
   set('Run Label', '07 PARSER_OUTPUT to VALIDATION');
   set('Review File Name', reviewFileName);
   set('Parsed to PARSER_OUTPUT?', 'Yes');
   set('Ticket Search Key', ticketSearchKey);
    set('Viewed in Review App', 'No');




   reviewFileUrlColumns.forEach(colIndex => {
     targetRowValues[colIndex - 1] = reviewFileUrl;
   });




   if (!dryRun) {
     validationSheet.appendRow(targetRowValues);
     markParserRowImported_(parserSheet, parser.headerMap, sourceRowNumber, 'Imported to VALIDATION: ' + validationId);
   }




   existingValidationIds.add(validationId);
   if (ticketSearchKey) existingTicketKeys.add(ticketSearchKey);
   if (ticketDateKey) existingTicketDateKeys.add(ticketDateKey);




   results.inserted++;
   results.insertedRows.push({ sourceRowNumber, validationId, ticketSearchKey, ticketDateKey, submissionId, ticketNumber: fieldValues.ticketNumber });
 }




 SpreadsheetApp.flush();
 return results;
}




function getTableData_(sheet) {
 const lastRow = sheet.getLastRow();
 const lastCol = sheet.getLastColumn();
 const headers = lastCol ? sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0] : [];
 const rows = lastRow > 1 && lastCol ? sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues() : [];
 return { sheet, headers, headerMap: getHeaderMap_(headers), rows };
}




function valueByHeader_(row, headerMap, col) {
 const n = headerMap[col];
 return n ? norm_(row[n - 1]) : '';
}




function setByHeader_(row, headerMap, col, value) {
 const n = headerMap[col];
 if (!n) return;
 row[n - 1] = value == null ? '' : value;
}




function getAllColumnIndexes_(headers, colName) {
 const target = String(colName || '').trim();
 const matches = [];
 headers.forEach((h, i) => {
   if (String(h || '').trim() === target) matches.push(i + 1);
 });
 return matches;
}




function buildExistingSet_(table, colName) {
 const set = new Set();
 table.rows.forEach(row => {
   const v = valueByHeader_(row, table.headerMap, colName);
   if (v) set.add(v);
 });
 return set;
}




function buildExistingTicketDateSet_(validationTable) {
 const set = new Set();
 validationTable.rows.forEach(row => {
   const ticketNumber = firstNonBlank_(
     valueByHeader_(row, validationTable.headerMap, 'Final Ticket Number'),
     valueByHeader_(row, validationTable.headerMap, 'Ticket Number Guess')
   );
   const ticketDate = firstNonBlank_(
     valueByHeader_(row, validationTable.headerMap, 'Final Ticket Date'),
     valueByHeader_(row, validationTable.headerMap, 'Ticket Date Guess')
   );
   const key = buildTicketDateKey_(ticketNumber, ticketDate);
   if (key) set.add(key);
 });
 return set;
}




function buildSubmissionLookup_(submissions) {
 const h = submissions.headerMap;
 const lookup = {};
 submissions.rows.forEach(row => {
   const id = valueByHeader_(row, h, 'Submission ID');
   if (!id) return;
   lookup[id] = {
     sourceFileUrl: valueByHeader_(row, h, 'Source File URL'),
     sourceFileName: valueByHeader_(row, h, 'Source File Name'),
     sourceDriveFileLink: valueByHeader_(row, h, 'Source Drive File Link'),
     normalizedFileLink: valueByHeader_(row, h, 'Normalized File Link')
   };
 });
 return lookup;
}




function makeValidationIdFromParserRun_(parserRunId, submissionId, ocrId) {
 const base = firstNonBlank_(parserRunId, submissionId, ocrId, 'UNKNOWN');
 return 'VAL_' + sanitizeId_(base);
}




function sanitizeId_(value) {
 return String(value || '')
   .trim()
   .replace(/[^A-Za-z0-9_-]+/g, '_')
   .replace(/^_+|_+$/g, '')
   .slice(0, 180);
}




function buildParserTicketSearchKey_(ticketNumber, truck, ticketDate) {
 const parts = [ticketNumber, truck, ticketDate].map(v => norm_(v));
 if (!parts[0]) return '';
 return parts.join('_');
}




function buildTicketDateKey_(ticketNumber, ticketDate) {
 const ticket = normalizeKeyPart_(ticketNumber);
 const date = normalizeDateKeyPart_(ticketDate);
 if (!ticket || !date) return '';
 return ticket + '_' + date;
}




function normalizeKeyPart_(value) {
 return String(value || '')
   .trim()
   .toUpperCase()
   .replace(/[^A-Z0-9]+/g, '');
}




function normalizeDateKeyPart_(value) {
 const parsed = parseReviewDateNoTimezone_(value);
 if (parsed) return Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'yyyyMMdd');
 const raw = String(value || '').trim();
 return raw.replace(/[^0-9]+/g, '');
}
function pushSkip_(results, sourceRowNumber, parserRunId, reason) {
 results.skipped++;
 results.skippedRows.push({ sourceRowNumber, parserRunId, reason });
}




function markParserRowImported_(parserSheet, parserHeaderMap, rowNumber, note) {
 const importedCol = parserHeaderMap['Imported to RAW_OCR'];
 if (importedCol) parserSheet.getRange(rowNumber, importedCol).setValue('Yes');




 const notesCol = parserHeaderMap['Parser Notes'];
 if (notesCol) {
   const existing = parserSheet.getRange(rowNumber, notesCol).getDisplayValue();
   const stamped = '[' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss') + '] ' + note;
   parserSheet.getRange(rowNumber, notesCol).setValue(existing ? existing + '\n' + stamped : stamped);
 }
}


// ============================================================================
// 10 Generate Broker Invoice
// Purpose: generate broker invoice output from INVOICE_BUILD_QUEUE + TICKETS_CLEAN.
// Current first target: Statewide Materials invoice on INVOICE_ST.
// Active run ID is read from hidden INVOICE_CONTROL sheet.
//
// 2026-06-04 patch notes:
// - Uses numeric yyyyMMdd date keys for period filtering so 06/01 cannot sneak into a 05/25-05/31 run.
// - Writes invoice summary values directly instead of relying on stale formulas.
// - Clears old line/totals content and formatting before rebuilding the invoice body.
// - Keeps Make out of row-by-row sheet surgery. Apps Script owns the invoice build.
// ============================================================================
function generateBrokerInvoiceFromRunId() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const invoiceSheet = ss.getSheetByName('INVOICE_ST');
  const queueSheet = ss.getSheetByName('INVOICE_BUILD_QUEUE');
  const ticketsSheet = ss.getSheetByName('TICKETS_CLEAN');


  if (!invoiceSheet) throw new Error('Missing sheet: INVOICE_ST');
  if (!queueSheet) throw new Error('Missing sheet: INVOICE_BUILD_QUEUE');
  if (!ticketsSheet) throw new Error('Missing sheet: TICKETS_CLEAN');


  const runId = getActiveInvoiceRunId_('INVOICE_ST');
  if (!runId) throw new Error('Missing active Invoice Run ID in hidden INVOICE_CONTROL sheet for INVOICE_ST.');


  const queueValues = queueSheet.getDataRange().getValues();
  const queueDisplayValues = queueSheet.getDataRange().getDisplayValues();
  if (queueDisplayValues.length < 2) throw new Error('INVOICE_BUILD_QUEUE has no control rows.');


  const queueHeaders = queueDisplayValues[0];
  const q = makeInvoiceHeaderMap_(queueHeaders);
  requireInvoiceColumns_(q, [
    'Invoice Run ID',
    'Broker Code',
    'Invoice Number',
    'Invoice Date',
    'Period Start',
    'Period End',
    'Driver',
    'Truck #',
    'Customer / Job'
  ], 'INVOICE_BUILD_QUEUE');


  let runRow = null;
  let runDisplayRow = null;
  for (let i = 1; i < queueDisplayValues.length; i++) {
    if (String(queueDisplayValues[i][q['Invoice Run ID']]).trim() === runId) {
      runRow = queueValues[i];
      runDisplayRow = queueDisplayValues[i];
      break;
    }
  }


  if (!runRow) {
    throw new Error('Invoice Run ID not found in INVOICE_BUILD_QUEUE: ' + runId);
  }


  const brokerCode = String(runDisplayRow[q['Broker Code']] || '').trim();
  const invoiceNumber = String(runDisplayRow[q['Invoice Number']] || '').trim();
  const invoiceDateValue = firstNonBlankInvoiceValue_(runRow[q['Invoice Date']], runDisplayRow[q['Invoice Date']]);
  const periodStartValue = firstNonBlankInvoiceValue_(runRow[q['Period Start']], runDisplayRow[q['Period Start']]);
  const periodEndValue = firstNonBlankInvoiceValue_(runRow[q['Period End']], runDisplayRow[q['Period End']]);
  const periodStartKey = normalizeInvoiceDateOnly_(periodStartValue);
  const periodEndKey = normalizeInvoiceDateOnly_(periodEndValue);


  if (periodEndKey < periodStartKey) {
    throw new Error('Period End is before Period Start for run ' + runId + '.');
  }


  const driverFromQueue = String(runDisplayRow[q['Driver']] || '').trim();
  const driverFromRunId = getDriverCodeFromInvoiceRunId_(runId);
  const driverTokens = buildInvoiceMatchTokens_([driverFromQueue, driverFromRunId]);
  const truckNumber = String(runDisplayRow[q['Truck #']] || '').trim();
  const customerJob = String(runDisplayRow[q['Customer / Job']] || '').trim();


  const ticketValues = ticketsSheet.getDataRange().getValues();
  const ticketDisplayValues = ticketsSheet.getDataRange().getDisplayValues();
  if (ticketDisplayValues.length < 2) throw new Error('TICKETS_CLEAN has no ticket rows.');


  const ticketHeaders = ticketDisplayValues[0];
  const t = makeInvoiceHeaderMap_(ticketHeaders);
  requireInvoiceColumns_(t, [
    'Broker Code',
    'Driver Code',
    'Driver Name',
    'Ticket Date',
    'Ticket Number',
    'Origin',
    'Destination',
    'Quantity',
    'Rate',
    'Line Total'
  ], 'TICKETS_CLEAN');


  const invoiceRows = [];
  const rejectedRows = [];


  for (let i = 1; i < ticketValues.length; i++) {
    const rawRow = ticketValues[i];
    const displayRow = ticketDisplayValues[i];


    const ticketNumber = String(displayRow[t['Ticket Number']] || '').trim();
    const rowBroker = String(displayRow[t['Broker Code']] || '').trim();
    const rowDriverCode = String(displayRow[t['Driver Code']] || '').trim();
    const rowDriverName = String(displayRow[t['Driver Name']] || '').trim();
    const rowDateValue = firstNonBlankInvoiceValue_(rawRow[t['Ticket Date']], displayRow[t['Ticket Date']]);


    if (!ticketNumber && !rowBroker && !rowDateValue) continue;


    let rowDateKey = null;
    try {
      rowDateKey = normalizeInvoiceDateOnly_(rowDateValue);
    } catch (err) {
      rejectedRows.push({ rowNumber: i + 1, ticketNumber, reason: 'Invalid ticket date: ' + rowDateValue });
      continue;
    }


    const brokerMatch = normalizeInvoiceMatchToken_(rowBroker) === normalizeInvoiceMatchToken_(brokerCode);
    const dateMatch = rowDateKey >= periodStartKey && rowDateKey <= periodEndKey;
    const driverMatch = driverTokens.length
      ? driverTokens.includes(normalizeInvoiceMatchToken_(rowDriverCode)) || driverTokens.includes(normalizeInvoiceMatchToken_(rowDriverName))
      : true;


    if (brokerMatch && dateMatch && driverMatch) {
      invoiceRows.push({ rawRow, displayRow, rowDateKey });
    } else if (brokerMatch && driverMatch) {
      rejectedRows.push({
        rowNumber: i + 1,
        ticketNumber,
        ticketDateKey: rowDateKey,
        reason: 'Outside invoice period ' + periodStartKey + '-' + periodEndKey
      });
    }
  }


  invoiceRows.sort((a, b) => {
    const dateDiff = a.rowDateKey - b.rowDateKey;
    if (dateDiff !== 0) return dateDiff;
    const ticketA = String(a.displayRow[t['Ticket Number']] || '').trim();
    const ticketB = String(b.displayRow[t['Ticket Number']] || '').trim();
    return ticketA.localeCompare(ticketB, undefined, { numeric: true, sensitivity: 'base' });
  });


  cleanInvoiceOutputArea_(invoiceSheet);


  if (invoiceRows.length === 0) {
    writeInvoiceSummary_(invoiceSheet, 0, 0, 0);
    throw new Error(
      'No matching TICKETS_CLEAN rows found for run: ' + runId +
      ' | Broker=' + brokerCode +
      ' | Driver queue=' + driverFromQueue +
      ' | Driver run suffix=' + driverFromRunId +
      ' | Period=' + periodStartKey + '-' + periodEndKey
    );
  }


  const output = invoiceRows.map(item => {
    const rawRow = item.rawRow;
    const displayRow = item.displayRow;
    const quantity = safeInvoiceNumber_(firstNonBlankInvoiceValue_(rawRow[t['Quantity']], displayRow[t['Quantity']]));
    const rate = safeInvoiceNumber_(firstNonBlankInvoiceValue_(rawRow[t['Rate']], displayRow[t['Rate']]));
    const lineTotal = safeInvoiceNumber_(firstNonBlankInvoiceValue_(rawRow[t['Line Total']], displayRow[t['Line Total']]));


    return [
      invoiceDateObjectFromKey_(item.rowDateKey),
      String(displayRow[t['Ticket Number']] || '').trim(),
      String(displayRow[t['Origin']] || '').trim(),
      String(displayRow[t['Destination']] || '').trim(),
      quantity,
      rate,
      lineTotal
    ];
  });


  const totalQuantity = roundInvoiceNumber_(output.reduce((sum, row) => sum + safeInvoiceNumber_(row[4]), 0), 2);
  const grandTotal = roundInvoiceNumber_(output.reduce((sum, row) => sum + safeInvoiceNumber_(row[6]), 0), 2);


  setInvoiceValueByLabel_(invoiceSheet, 'Driver', driverFromQueue);
  setInvoiceValueByLabel_(invoiceSheet, 'Truck #', truckNumber);
  setInvoiceValueByLabel_(invoiceSheet, 'Invoice Date', invoiceDateObjectFromKey_(normalizeInvoiceDateOnly_(invoiceDateValue)));
  setInvoiceValueByLabel_(invoiceSheet, 'Invoice No.', invoiceNumber || 'TBD');
  setActiveInvoiceRunId_('INVOICE_ST', runId);


  invoiceSheet.getRange(10, 1, 1, 7).setValues([[
    'Date', 'Ticket #', 'Origin', 'Destination', 'Loads / Tons', 'Rate', 'Total'
  ]]);


  invoiceSheet.getRange(11, 1, output.length, 7).setValues(output);


  const totalRow = 11 + output.length + 2;
  invoiceSheet.getRange(totalRow, 4).setValue('Total Tonnage');
  invoiceSheet.getRange(totalRow, 5).setValue(totalQuantity);
  invoiceSheet.getRange(totalRow, 6).setValue('Grand Total');
  invoiceSheet.getRange(totalRow, 7).setValue(grandTotal);


  writ
function findInvoiceLabelCell_(invoiceSheet, label) {
  const finder = invoiceSheet.createTextFinder(String(label || '').trim()).matchEntireCell(true);
  const matches = finder.findAll();
  if (!matches || matches.length === 0) {
    throw new Error('Missing invoice template label: ' + label);
  }
  return matches[0];
}


function setInvoiceValueByLabel_(invoiceSheet, label, value, numberFormat) {
  const labelCell = findInvoiceLabelCell_(invoiceSheet, label);
  const valueCell = labelCell.offset(0, 1);
  valueCell.setValue(value);
  if (numberFormat) valueCell.setNumberFormat(numberFormat);
}


function clearInvoiceValueByLabel_(invoiceSheet, label) {
  const labelCell = findInvoiceLabelCell_(invoiceSheet, label);
  labelCell.offset(0, 1).clearContent();
}
eInvoiceSummary_(invoiceSheet, output.length, totalQuantity, grandTotal);
  formatInvoiceOutput_(invoiceSheet, output.length, totalRow);


  SpreadsheetApp.flush();


  return {
    ok: true,
    runId,
    brokerCode,
    driverFromQueue,
    driverFromRunId,
    periodStartKey,
    periodEndKey,
    invoiceRowCount: output.length,
    totalTickets: output.length,
    totalQuantity,
    grandTotal,
    totalRow,
    rejectedRows
  };
}


function getInvoiceControlSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('INVOICE_CONTROL');
  if (!sheet) {
    sheet = ss.insertSheet('INVOICE_CONTROL');
    sheet.getRange('A1:B1').setValues([['Invoice Sheet', 'Active Run ID']]);
    sheet.hideSheet();
  }
  return sheet;
}


function getActiveInvoiceRunId_(invoiceSheetName) {
  const sheet = getInvoiceControlSheet_();
  const lastRow = Math.max(sheet.getLastRow(), 1);
  const values = sheet.getRange(1, 1, lastRow, 2).getDisplayValues();
  const target = String(invoiceSheetName || '').trim();


  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === target) {
      return String(values[i][1] || '').trim();
    }
  }


  return '';
}


function setActiveInvoiceRunId_(invoiceSheetName, runId) {
  const sheet = getInvoiceControlSheet_();
  const target = String(invoiceSheetName || '').trim();
  const value = String(runId || '').trim();
  const lastRow = Math.max(sheet.getLastRow(), 1);
  const values = sheet.getRange(1, 1, lastRow, 2).getDisplayValues();


  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === target) {
      sheet.getRange(i + 1, 2).setValue(value);
      sheet.hideSheet();
      return;
    }
  }


  sheet.appendRow([target, value]);
  sheet.hideSheet();
}


function restoreInvoiceTemplate_(invoiceSheet) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const templateSheet = ss.getSheetByName('INVOICE_ST_TEMPLATE');
  if (!templateSheet) throw new Error('Missing sheet: INVOICE_ST_TEMPLATE');


  // Restore formatting from the locked template without copying old invoice values.
  const templateRange = templateSheet.getRange(1, 1, templateSheet.getMaxRows(), templateSheet.getMaxColumns());
  const targetRange = invoiceSheet.getRange(1, 1, templateSheet.getMaxRows(), templateSheet.getMaxColumns());
  templateRange.copyTo(targetRange, { formatOnly: true });


  // Preserve the template layout, but clear live invoice values that are rebuilt by the script.
  clearInvoiceValueByLabel_(invoiceSheet, 'Driver');
  clearInvoiceValueByLabel_(invoiceSheet, 'Truck #');
  clearInvoiceValueByLabel_(invoiceSheet, 'Invoice Date');
  clearInvoiceValueByLabel_(invoiceSheet, 'Invoice No.');
  clearInvoiceValueByLabel_(invoiceSheet, 'Total Tickets');
  clearInvoiceValueByLabel_(invoiceSheet, 'Total Tons');
  clearInvoiceValueByLabel_(invoiceSheet, 'Grand Total');
  invoiceSheet.getRange('A11:H100').clearContent();
  invoiceSheet.getRange('J3').clearContent();
}


function cleanInvoiceOutputArea_(invoiceSheet) {
  restoreInvoiceTemplate_(invoiceSheet);
}


function writeInvoiceSummary_(invoiceSheet, totalTickets, totalQuantity, grandTotal) {
  setInvoiceValueByLabel_(invoiceSheet, 'Total Tickets', Number(totalTickets || 0));
  setInvoiceValueByLabel_(invoiceSheet, 'Total Tons', roundInvoiceNumber_(totalQuantity || 0, 2), '0.00');
  setInvoiceValueByLabel_(invoiceSheet, 'Grand Total', roundInvoiceNumber_(grandTotal || 0, 2), '$#,##0.00');
}


function formatInvoiceOutput_(invoiceSheet, outputLength, totalRow) {
  invoiceSheet.getRange('A10:G10').setFontWeight('bold');
  // No heavy borders on invoice header row.


  if (outputLength > 0) {
    // No heavy borders on invoice detail rows.
    invoiceSheet.getRange(11, 1, outputLength, 1).setNumberFormat('m/d/yyyy');
    invoiceSheet.getRange(11, 5, outputLength, 1).setNumberFormat('0.00');
    invoiceSheet.getRange(11, 6, outputLength, 2).setNumberFormat('$#,##0.00');
  }


  invoiceSheet.getRange(totalRow, 4, 1, 4).setFontWeight('bold');
  invoiceSheet.getRange(totalRow, 5).setNumberFormat('0.00');
  invoiceSheet.getRange(totalRow, 7).setNumberFormat('$#,##0.00');
}


function makeInvoiceHeaderMap_(headers) {
  const map = {};
  headers.forEach((header, index) => {
    const key = String(header || '').trim();
    if (key) map[key] = index;
  });
  return map;
}


function requireInvoiceColumns_(headerMap, columnNames, sheetName) {
  const missing = columnNames.filter(name => headerMap[name] === undefined);
  if (missing.length) {
    throw new Error('Missing required column(s) in ' + sheetName + ': ' + missing.join(', '));
  }
}


function getDriverCodeFromInvoiceRunId_(runId) {
  const parts = String(runId || '').split('_').map(part => String(part || '').trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}


function buildInvoiceMatchTokens_(values) {
  const tokens = [];
  values.forEach(value => {
    const token = normalizeInvoiceMatchToken_(value);
    if (token && tokens.indexOf(token) === -1) tokens.push(token);
  });
  return tokens;
}


function normalizeInvoiceMatchToken_(value) {
  return String(value || '').trim().toUpperCase();
}


function firstNonBlankInvoiceValue_(...values) {
  for (const value of values) {
    if (value instanceof Date) return value;
    if (typeof value === 'number' && !isNaN(value)) return value;
    const text = String(value == null ? '' : value).trim();
    if (text !== '') return value;
  }
  return '';
}


function numberFromInvoiceValue_(value) {
  if (typeof value === 'number') return value;
  const raw = String(value || '').trim().replace(/[$,]/g, '');
  if (raw === '') return '';
  const number = Number(raw);
  return isNaN(number) ? value : number;
}


function safeInvoiceNumber_(value) {
  const number = numberFromInvoiceValue_(value);
  if (number === '' || number == null) return 0;
  const parsed = Number(number);
  return isNaN(parsed) ? 0 : parsed;
}


function roundInvoiceNumber_(value, decimals) {
  const factor = Math.pow(10, decimals || 2);
  return Math.round((Number(value) || 0) * factor) / factor;
}


function normalizeInvoiceDateOnly_(value) {
  return invoiceDateKey_(value);
}


function invoiceDateKey_(value) {
  if (value instanceof Date) {
    return Number(Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyyMMdd'));
  }


  if (typeof value === 'number' && !isNaN(value)) {
    return Number(Utilities.formatDate(serialToInvoiceDate_(value), Session.getScriptTimeZone(), 'yyyyMMdd'));
  }


  const raw = String(value == null ? '' : value).trim();
  if (!raw) throw new Error('Invalid blank date value.');


  if (!isNaN(Number(raw))) {
    return Number(Utilities.formatDate(serialToInvoiceDate_(Number(raw)), Session.getScriptTimeZone(), 'yyyyMMdd'));
  }


  const parsed = parseInvoiceDateString_(raw);
  if (!parsed) throw new Error('Invalid date value: ' + value);


  return Number(Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'yyyyMMdd'));
}


function serialToInvoiceDate_(serial) {
  const millis = Math.round((Number(serial) - 25569) * 86400 * 1000);
  const utcDate = new Date(millis);
  return new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate());
}


function parseInvoiceDateString_(raw) {
  let match = String(raw).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));


  match = String(raw).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (match) {
    let year = Number(match[3]);
    if (year < 100) year += 2000;
    return new Date(year, Number(match[1]) - 1, Number(match[2]));
  }


  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }


  return null;
}


function invoiceDateObjectFromKey_(key) {
  const text = String(key || '').trim();
  if (!/^\d{8}$/.test(text)) throw new Error('Invalid invoice date key: ' + key);
  return new Date(Number(text.slice(0, 4)), Number(text.slice(4, 6)) - 1, Number(text.slice(6, 8)));
}






















function testGetPendingReviewBatches() {
  const results = getPendingReviewBatches({
    includePrevious: false
  });

  console.log(JSON.stringify(results, null, 2));
}
