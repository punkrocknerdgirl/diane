  /**
 * Diane 2.0 read-only adapter.
 *
 * This file is intentionally not wired into the existing UI yet. Add it to
 * the Apps Script project, set Script Property AIRTABLE_TOKEN, and call
 * getPendingReviewBatchesFromAirtable({includePrevious: false}) for the
 * production review queue. This adapter is read-only.
 */

const DIANE_AIRTABLE_BASE_ID = 'appMWvtLU0hMBqjLC';
const DIANE_AIRTABLE_API_ROOT = 'https://api.airtable.com/v0/';

const DIANE_AIRTABLE_TABLES = {
  reviewBatches: 'tbl37qgQqfH1yd8Ww',
  validationQueue: 'tblbiwkOS9LDi5yaV',
  tickets: 'tbloTlWdo1f4hFKXh'
};

function getAirtableToken_() {
  const token = PropertiesService.getScriptProperties()
    .getProperty('AIRTABLE_TOKEN');
  if (!token) {
    throw new Error('Missing Script Property AIRTABLE_TOKEN.');
  }
  return token;
}

function airtableListAll_(tableId, params) {
  const rows = [];
  let offset = '';
  do {
    const query = Object.assign({}, params || {}, offset ? {offset: offset} : {});
    const qs = Object.keys(query)
      .filter(function(key) { return query[key] !== '' && query[key] != null; })
      .map(function(key) {
        return encodeURIComponent(key) + '=' + encodeURIComponent(query[key]);
      }).join('&');
    const response = UrlFetchApp.fetch(
      DIANE_AIRTABLE_API_ROOT + DIANE_AIRTABLE_BASE_ID + '/' + tableId +
        (qs ? '?' + qs : ''),
      {
        method: 'get',
        headers: {Authorization: 'Bearer ' + getAirtableToken_()},
        muteHttpExceptions: true
      }
    );
    const status = response.getResponseCode();
    const body = response.getContentText();
    if (status < 200 || status >= 300) {
      throw new Error('Airtable read failed (' + status + '): ' + body);
    }
    const page = JSON.parse(body);
    (page.records || []).forEach(function(record) { rows.push(record); });
    offset = page.offset || '';
  } while (offset);
  return rows;
}

function airtableField_(record, name) {
  return record && record.fields ? record.fields[name] : '';
}

function airtableLinkIds_(value) {
  return Array.isArray(value) ? value.map(function(x) {
    return typeof x === 'string' ? x : x.id;
  }).filter(Boolean) : [];
}

function airtableText_(value) {
  if (Array.isArray(value)) {
    return value.map(function(x) { return x && x.name ? x.name : x; }).join(', ');
  }
  if (value && typeof value === 'object' && value.name) return value.name;
  return value == null ? '' : String(value);
}

function airtableTruthy_(value) {
  if (value === true || value === 1) return true;
  const text = norm_(airtableText_(value)).toLowerCase();
  return ['true', 'yes', '1', 'on'].indexOf(text) !== -1;
}

function mapAirtableValidation_(record, ticketById) {
  const linkedTickets = airtableLinkIds_(airtableField_(record, 'Ticket'));
  const ticket = linkedTickets.length ? ticketById[linkedTickets[0]] : null;
  const final = function(name) { return airtableField_(record, name) || ''; };
  const ticketNumber = final('Final Ticket Number') ||
    (ticket && airtableField_(ticket, 'Ticket Number')) || '';
  const ticketDate = final('Final Ticket Date') ||
    (ticket && airtableField_(ticket, 'Ticket Date')) || '';
  const rate = final('Final Rate') || (ticket && airtableField_(ticket, 'Rate')) || '';
  const quantity = final('Final Quantity') ||
    (ticket && airtableField_(ticket, 'Quantity')) || '';
  const lineTotal = final('Final Total') || final('Line Total') ||
    (ticket && airtableField_(ticket, 'Line Total')) ||
    getReviewLineTotal_('', quantity, rate);
  const rowObj = {
    rowNumber: null,
    validationRecordId: record.id,
    validationId: final('Validation ID'),
    ticketRecordId: linkedTickets.length ? linkedTickets[0] : '',
    submissionId: '',
    sourceFileUrl: ticket ? airtableField_(ticket, 'Source File URL') || '' : '',
    sourceFileName: '',
    reviewStatus: airtableText_(airtableField_(record, 'Review Status')),
    readyForClean: airtableTruthy_(airtableField_(record, 'Processed to Tickets')) ? 'Yes' : 'No',
    imported: '',
    testRow: airtableTruthy_(airtableField_(record, 'Do Not Bill')) ? 'Yes' : 'No',
    dataScope: '',
    runLabel: '',
    viewedInReviewApp: '',
    viewedAt: '',
    viewedBy: '',
    ticketDate: airtableText_(ticketDate),
    ticketNumber: airtableText_(ticketNumber),
    broker: airtableText_(final('Final Broker')),
    customerJob: airtableText_(final('Final Customer / Job')),
    poNumber: airtableText_(final('Final PO Number')),
    workOrder: airtableText_(final('Final Work Order / Order')),
    truck: airtableText_(final('Final Truck')),
    driver: airtableText_(final('Final Driver')),
    material: airtableText_(final('Final Material')),
    quantity: airtableText_(quantity),
    rate: airtableText_(rate),
    origin: airtableText_(final('Final Origin')),
    destination: airtableText_(final('Final Destination')),
    lineTotal: airtableText_(lineTotal),
    reviewNotes: airtableText_(final('Reviewer Notes')),
    reviewer: airtableText_(airtableField_(record, 'Reviewer')),
    reviewBatchKey: '',
    reviewBatchRecordIds: airtableLinkIds_(airtableField_(record, 'Review Batches'))
  };

  rowObj.viewedLabel =
    norm_(rowObj.viewedInReviewApp).toLowerCase() === 'yes'
      ? 'Viewed'
      : 'Not Viewed';

  rowObj.viewedClassName =
    norm_(rowObj.viewedInReviewApp).toLowerCase() === 'yes'
      ? 'viewed-yes'
      : 'viewed-no';

  rowObj.ticketDateDisplay = displayMissing_(rowObj.ticketDate);
  rowObj.ticketNumberDisplay = displayMissing_(rowObj.ticketNumber);
  rowObj.brokerDisplay = displayMissing_(rowObj.broker);
  rowObj.customerJobDisplay = displayMissing_(rowObj.customerJob);
  rowObj.poNumberDisplay = displayMissing_(rowObj.poNumber);
  rowObj.workOrderDisplay = displayMissing_(rowObj.workOrder);
  rowObj.truckDisplay = displayMissing_(rowObj.truck);
  rowObj.driverDisplay = displayMissing_(rowObj.driver);
  rowObj.materialDisplay = displayMissing_(rowObj.material);
  rowObj.quantityDisplay = displayMissing_(rowObj.quantity);
  rowObj.rateDisplay = displayMissing_(rowObj.rate);
  rowObj.originDisplay = displayMissing_(rowObj.origin);
  rowObj.destinationDisplay = displayMissing_(rowObj.destination);
  rowObj.lineTotalDisplay = displayMissing_(rowObj.lineTotal);

  const status = getTicketStatus_(rowObj);

  rowObj.statusCode = status.code;
  rowObj.statusLabel = status.label;
  rowObj.statusClassName = status.className;
  rowObj.buttonLabel = status.buttonLabel;
  rowObj.buttonClassName = status.buttonClassName;

  return rowObj;

}

/**
 * Read-only equivalent of the current queue loader.
 * It does not write to Airtable, Google Sheets, Drive, or the UI.
 */
function getPendingReviewBatchesFromAirtable(options) {
  options = options || {};
  const includePrevious = !!options.includePrevious;
  const batchRecords = airtableListAll_(DIANE_AIRTABLE_TABLES.reviewBatches);
  const validationRecords = airtableListAll_(DIANE_AIRTABLE_TABLES.validationQueue);
  const ticketRecords = airtableListAll_(DIANE_AIRTABLE_TABLES.tickets);
  const ticketById = {};
  ticketRecords.forEach(function(record) { ticketById[record.id] = record; });

  const batchById = {};
  batchRecords.forEach(function(record) {
    batchById[record.id] = record;
  });

  const validationById = {};
  validationRecords.forEach(function(record) {
    const row = mapAirtableValidation_(record, ticketById);
    const status = norm_(row.reviewStatus).replace(/\s+/g, ' ').toLowerCase();
    const processed = airtableTruthy_(airtableField_(record, 'Processed to Tickets'));
    const doNotBill = airtableTruthy_(airtableField_(record, 'Do Not Bill'));
    if (!includePrevious && (status !== 'pending review' || processed || doNotBill)) return;
    if (includePrevious && !row.validationId) return;
    validationById[record.id] = row;
  });

  const batches = {};
  Object.keys(validationById).forEach(function(recordId) {
    const row = validationById[recordId];
    const batchIds = row.reviewBatchRecordIds || [];
    const saved = batchIds.length ? batchById[batchIds[0]] : null;
    const savedKey = saved ? airtableText_(airtableField_(saved, 'Review Batch Key')) : '';
    row.reviewBatchKey = savedKey || 'UNBATCHED_' + (row.validationId || recordId);
    const key = row.reviewBatchKey;
    if (!batches[key]) batches[key] = {saved: saved, rows: []};
    batches[key].rows.push(row);
  });

  batchRecords.forEach(function(batchRecord) {
    const f = batchRecord.fields || {};
    const batchKey = airtableText_(f['Review Batch Key']);
    if (!batchKey || batches[batchKey]) return;
    batches[batchKey] = {saved: batchRecord, rows: []};
  });

  const ORDER = {NEW:1, IN_REVIEW:2, HOLD:3, PARTIAL:4, APPROVED:5, PROCESSED:6, DO_NOT_BILL:7, EMPTY:8};
  return Object.keys(batches).map(function(batchKey) {
    const saved = batches[batchKey].saved;
    const f = saved ? saved.fields || {} : {};
    const rows = batches[batchKey].rows;
    const status = airtableText_(f['Batch Status']);
    const first = rows[0] || {};
    const value = function(name, fallback) {
      const savedValue = airtableText_(f[name]);
      return savedValue || fallback || '';
    };
    const batch = {
      batchRecordId: saved ? saved.id : '', batchKey: batchKey,
      batchHasSavedRecord: !!saved, batchFormAction: value('Form Action', saved ? airtableText_(f['Apply Batch Fields']) : ''),
      broker: value('Broker', first.broker), brokerDisplay: displayMissing_(value('Broker', first.broker)),
      customerJob: value('Customer / Job', first.customerJob), customerJobDisplay: displayMissing_(value('Customer / Job', first.customerJob)),
      poNumber: value('PO Number', first.poNumber), poNumberDisplay: displayMissing_(value('PO Number', first.poNumber)),
      workOrder: value('Work Order / Order', first.workOrder), workOrderDisplay: displayMissing_(value('Work Order / Order', first.workOrder)),
      origin: value('Origin', first.origin), originDisplay: displayMissing_(value('Origin', first.origin)),
      destination: value('Destination', first.destination), destinationDisplay: displayMissing_(value('Destination', first.destination)),
      truck: value('Truck', first.truck), truckDisplay: displayMissing_(value('Truck', first.truck)),
      driver: value('Driver', first.driver), driverDisplay: displayMissing_(value('Driver', first.driver)),
      rate: value('Rate', first.rate), rateDisplay: displayMissing_(value('Rate', first.rate)),
      batchStatus: status, batchNotes: airtableText_(f['Batch Notes']), reviewer: airtableText_(f['Reviewer']),
      dataScope: airtableText_(f['Data Scope']), runLabel: airtableText_(f['Run Label']),
      batchTitle: buildBatchDisplayTitle_({broker:value('Broker',first.broker), customerJob:value('Customer / Job',first.customerJob), poNumber:value('PO Number',first.poNumber), workOrder:value('Work Order / Order',first.workOrder), origin:value('Origin',first.origin), destination:value('Destination',first.destination), rate:value('Rate',first.rate)}, batchKey),
      ticketCount: 0, invoiceTotal: 0, invoiceTotalDisplay: formatMoney_(0), rows: rows
    };
    rows.forEach(function(row) {
      const n = numberFromReviewValue_(row.lineTotal);
      if (n !== null) batch.invoiceTotal += n;
      batch.ticketCount++;
    });
    const s = getBatchStatus_(rows);
    batch.statusCode = s.code; batch.statusLabel = s.label; batch.statusClassName = s.className;
    batch.invoiceTotalDisplay = formatMoney_(batch.invoiceTotal);
    return batch;
  }).filter(function(batch) {
    return batch.rows.length > 0 && (includePrevious || ['APPROVED','PROCESSED','DO_NOT_BILL','EMPTY'].indexOf(batch.statusCode) === -1);
  }).sort(function(a,b) {
    const diff = (ORDER[a.statusCode] || 99) - (ORDER[b.statusCode] || 99);
    return diff || a.batchKey.localeCompare(b.batchKey);
  });
}

function testAirtableReviewBatches() {
  const results = getPendingReviewBatchesFromAirtable({
    includePrevious: false
  });

  console.log(JSON.stringify(results, null, 2));
}

function testGetPendingReviewBatchesFromAirtable() {
  const result = getPendingReviewBatchesFromAirtable({
    includePrevious: false
  });

  console.log(JSON.stringify(result, null, 2));
}
