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
  tickets: 'tbloTlWdo1f4hFKXh',
  parserOutputs: 'tblvgGjGiSJCNid36',
  ocrOutputs: 'tblVXINiOoN7hPGpa',
  trucks: 'tbl34C0X7sRdpFsP5',
  drivers: 'tblrAWk0omo16cx6x',
  brokers: 'tblqyPewObvpgrHmY',
  aliases: 'tblFdkclbZCaaI8Ly'
};

function buildTruckAliasMap_(truckRecords, driverRecords, brokerRecords, aliasRecords) {
  const driversById = {};
  const brokersById = {};
  const trucksById = {};
  const map = {};
  (driverRecords || []).forEach(function(record) {
    const fields = record.fields || {};
    driversById[record.id] = {code: norm_(fields['Driver Code']), name: norm_(fields['Driver Name'])};
  });
  (brokerRecords || []).forEach(function(record) {
    const fields = record.fields || {};
    const brokerKeys = [normLookupKey_(fields['Broker Code']), normLookupKey_(fields['Broker Name'])].filter(Boolean);
    if (brokerKeys.length) brokersById[record.id] = brokerKeys;
  });
  (truckRecords || []).forEach(function(record) {
    const fields = record.fields || {};
    const truckCode = norm_(fields['Truck Code']);
    const truckKey = normLookupKey_(truckCode);
    if (!truckKey) return;
    const defaultDriverIds = airtableLinkIds_(fields['Default Driver']);
    const defaultDriver = defaultDriverIds.length ? driversById[defaultDriverIds[0]] || {} : {};
    trucksById[record.id] = {code: truckCode, driverCode: norm_(defaultDriver.code)};
    const canonicalCandidates = map[truckKey] || [];
    if (!canonicalCandidates.some(function(item) { return item.code + '|' + item.driverCode === truckCode + '|' + norm_(defaultDriver.code); })) canonicalCandidates.push({code: truckCode, driverCode: norm_(defaultDriver.code), brokerKeys: []});
    map[truckKey] = canonicalCandidates;
  });
  (aliasRecords || []).forEach(function(record) {
    const fields = record.fields || {};
    const aliasKey = normLookupKey_(fields['Alias Value']);
    if (!aliasKey) return;
    const linkedTruckIds = airtableLinkIds_(fields['Maps To Truck']);
    const linkedTruck = linkedTruckIds.length ? trucksById[linkedTruckIds[0]] : null;
    const mappedCodeKey = normLookupKey_(fields['Maps To Code']);
    const mappedTruck = mappedCodeKey ? Object.keys(trucksById).map(function(id) { return trucksById[id]; }).filter(function(truck) { return normLookupKey_(truck.code) === mappedCodeKey; })[0] : null;
    const truck = linkedTruck || mappedTruck;
    if (!truck) return;
    const brokerKeys = airtableLinkIds_(fields['Broker']).reduce(function(keys, id) { return keys.concat(brokersById[id] || []); }, []).filter(Boolean).filter(function(key, index, all) { return all.indexOf(key) === index; });
    const candidate = {code: truck.code, driverCode: truck.driverCode, brokerKeys: brokerKeys};
    const candidates = map[aliasKey] || [];
    const resultKey = candidate.code + '|' + candidate.driverCode;
    const existing = candidates.filter(function(item) { return item.code + '|' + item.driverCode === resultKey; })[0];
    if (existing) existing.brokerKeys = existing.brokerKeys.concat(candidate.brokerKeys).filter(function(key, index, all) { return all.indexOf(key) === index; });
    else candidates.push(candidate);
    map[aliasKey] = candidates;
  });
  return map;
}

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

function ocrDateCandidate_(raw) {
  const text = String(raw || '');
  const match = text.match(/(?:date|dated)\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i) || text.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/);
  if (!match) return '';
  const parts = match[1].split(/[\/\-]/);
  let year = Number(parts[2]);
  if (year < 100) year += 2000;
  return String(parts[0]).padStart(2, '0') + '/' + String(parts[1]).padStart(2, '0') + '/' + String(year);
}

function reviewDateKey_(value) {
  const text = String(value || '').trim();
  let m = text.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (!m) m = text.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (!m) return '';
  const y = m[1].length === 4 ? m[1] : m[3];
  const mo = m[1].length === 4 ? m[2] : m[1];
  const d = m[1].length === 4 ? m[3] : m[2];
  return y + String(mo).padStart(2, '0') + String(d).padStart(2, '0');
}

function mapAirtableValidation_(record, ticketById, parserById, ocrById, parserByValidationId, ocrByTicketId, ocrByTicketNumber) {
  const linkedTickets = airtableLinkIds_(airtableField_(record, 'Ticket'));
  const ticket = linkedTickets.length ? ticketById[linkedTickets[0]] : null;
  const parserIds = airtableLinkIds_(airtableField_(record, 'Parser Output'));
  const parser = parserIds.length ? parserById[parserIds[0]] : (parserByValidationId[record.id] || null);
  const ocrIds = parser ? airtableLinkIds_(airtableField_(parser, 'OCR Output')) : [];
  const ocr = ocrIds.length ? ocrById[ocrIds[0]] : (linkedTickets.length ? ocrByTicketId[linkedTickets[0]] || ocrByTicketNumber[airtableText_(airtableField_(record, 'Final Ticket Number') || (ticket && airtableField_(ticket, 'Ticket Number')))] || null : ocrByTicketNumber[airtableText_(airtableField_(record, 'Final Ticket Number') || (ticket && airtableField_(ticket, 'Ticket Number')))] || null);
  const final = function(name) { return airtableField_(record, name) || ''; };
  const parsed = function(name) { return parser ? airtableField_(parser, name) || '' : ''; };
  const extracted = function(name) { return ocr ? airtableField_(ocr, name) || '' : ''; };
  const candidate = function(finalValue, parsedValue, extractedValue) {
    return airtableText_(finalValue || parsedValue || extractedValue || '');
  };
  const ticketNumber = final('Final Ticket Number') || (ticket && airtableField_(ticket, 'Ticket Number')) || '';
  const ticketDate = final('Final Ticket Date') || (ticket && airtableField_(ticket, 'Ticket Date')) || '';
  const rate = final('Final Rate') || (ticket && airtableField_(ticket, 'Rate')) || '';
  const quantity = final('Final Quantity') || (ticket && airtableField_(ticket, 'Quantity')) || '';
  const savedFinalTotal = airtableField_(record, 'Final Total');
  const lineTotal = savedFinalTotal !== null && savedFinalTotal !== undefined && savedFinalTotal !== ''
    ? savedFinalTotal
    : final('Line Total') || (ticket && airtableField_(ticket, 'Line Total')) || getReviewLineTotal_('', quantity, rate);
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
    imported: '', testRow: airtableTruthy_(airtableField_(record, 'Do Not Bill')) ? 'Yes' : 'No',
    dataScope: '', runLabel: '', viewedInReviewApp: '', viewedAt: '', viewedBy: '',
    ticketDate: airtableText_(ticketDate), ticketNumber: airtableText_(airtableField_(record, 'Final Ticket Number') || (ticket && airtableField_(ticket, 'Ticket Number'))),
    broker: airtableText_(final('Final Broker')), customerJob: airtableText_(final('Final Customer / Job')),
    poNumber: airtableText_(final('Final PO Number')), workOrder: airtableText_(final('Final Work Order / Order')),
    truck: airtableText_(final('Final Truck')), driver: airtableText_(final('Final Driver')),
    material: airtableText_(final('Final Material')), quantity: airtableText_(quantity), rate: airtableText_(rate),
    origin: airtableText_(final('Final Origin')), destination: airtableText_(final('Final Destination')),
    lineTotal: airtableText_(lineTotal), reviewNotes: airtableText_(final('Reviewer Notes')),
    reviewer: (function(value) {
      return value && typeof value === 'object' && value.id ? value.id : '';
    })(airtableField_(record, 'Reviewer')), reviewBatchKey: '',
    reviewBatchRecordIds: airtableLinkIds_(airtableField_(record, 'Review Batches')),
    ocrRawText: ocr ? airtableText_(airtableField_(ocr, 'Raw OCR Text')) : '',
    ocrTicketDate: ocr ? (airtableText_(airtableField_(ocr, 'Extracted Ticket Date')) || ocrDateCandidate_(airtableField_(ocr, 'Raw OCR Text'))) : '',
    ocrTicketNumber: ocr ? airtableText_(airtableField_(ocr, 'Extracted Ticket Number')) : '',
    ocrDriver: ocr ? airtableText_(airtableField_(ocr, 'Extracted Driver')) : '',
    ocrTruck: ocr ? airtableText_(airtableField_(ocr, 'Extracted Truck')) : '',
    ocrMaterial: ocr ? airtableText_(airtableField_(ocr, 'Extracted Material')) : '',
    ocrQuantity: ocr ? airtableText_(airtableField_(ocr, 'Extracted Quantity')) : '',
    ocrRate: ocr ? airtableText_(airtableField_(ocr, 'Extracted Rate')) : '',
    ocrTotal: ocr ? airtableText_(airtableField_(ocr, 'Extracted Total')) : '',
    parsedTicketDate: airtableText_(parsed('Parsed Ticket Date')), parsedTicketNumber: airtableText_(parsed('Parsed Ticket Number')),
    parsedDriver: airtableText_(parsed('Parsed Driver')), parsedTruck: airtableText_(parsed('Parsed Truck')),
    parsedMaterial: airtableText_(parsed('Parsed Material')), parsedQuantity: airtableText_(parsed('Parsed Quantity')),
    parsedRate: airtableText_(parsed('Parsed Rate')), parsedTotal: airtableText_(parsed('Parsed Total'))
  };
  rowObj.ticketDateCandidate = candidate(final('Final Ticket Date') || ticketDate, parsed('Parsed Ticket Date'), rowObj.ocrTicketDate);
  rowObj.ticketNumberCandidate = candidate(final('Final Ticket Number') || ticketNumber, parsed('Parsed Ticket Number'), rowObj.ocrTicketNumber);
  rowObj.driverCandidate = candidate(final('Final Driver'), parsed('Parsed Driver'), rowObj.ocrDriver);
  rowObj.truckCandidate = candidate(final('Final Truck'), parsed('Parsed Truck'), rowObj.ocrTruck);
  rowObj.materialCandidate = candidate(final('Final Material'), parsed('Parsed Material'), rowObj.ocrMaterial);
  rowObj.quantityCandidate = candidate(final('Final Quantity') || quantity, parsed('Parsed Quantity'), rowObj.ocrQuantity);
  rowObj.rateCandidate = candidate(final('Final Rate') || rate, parsed('Parsed Rate'), rowObj.ocrRate);
  rowObj.totalCandidate = candidate(final('Final Total') || final('Line Total') || lineTotal, parsed('Parsed Total'), rowObj.ocrTotal);
  rowObj.viewedLabel = norm_(rowObj.viewedInReviewApp).toLowerCase() === 'yes' ? 'Viewed' : 'Not Viewed';
  rowObj.viewedClassName = norm_(rowObj.viewedInReviewApp).toLowerCase() === 'yes' ? 'viewed-yes' : 'viewed-no';
  rowObj.ticketDateDisplay = displayMissing_(rowObj.ticketDate); rowObj.ticketNumberDisplay = displayMissing_(rowObj.ticketNumber);
  rowObj.brokerDisplay = displayMissing_(rowObj.broker); rowObj.customerJobDisplay = displayMissing_(rowObj.customerJob);
  rowObj.poNumberDisplay = displayMissing_(rowObj.poNumber); rowObj.workOrderDisplay = displayMissing_(rowObj.workOrder);
  rowObj.truckDisplay = displayMissing_(rowObj.truck); rowObj.driverDisplay = displayMissing_(rowObj.driver);
  rowObj.materialDisplay = displayMissing_(rowObj.material); rowObj.quantityDisplay = displayMissing_(rowObj.quantity);
  rowObj.rateDisplay = displayMissing_(rowObj.rate); rowObj.originDisplay = displayMissing_(rowObj.origin);
  rowObj.destinationDisplay = displayMissing_(rowObj.destination); rowObj.lineTotalDisplay = displayMissing_(rowObj.lineTotal);
  const status = getTicketStatus_(rowObj); rowObj.statusCode = status.code; rowObj.statusLabel = status.label;
  rowObj.statusClassName = status.className; rowObj.buttonLabel = status.buttonLabel; rowObj.buttonClassName = status.buttonClassName;
  return rowObj;
}

function getPendingReviewBatchesFromAirtable(options) {
  options = options || {};
  const includePrevious = !!options.includePrevious;
  const batchRecords = airtableListAll_(DIANE_AIRTABLE_TABLES.reviewBatches);
  const validationRecords = airtableListAll_(DIANE_AIRTABLE_TABLES.validationQueue);
  const ticketRecords = airtableListAll_(DIANE_AIRTABLE_TABLES.tickets);
  const parserRecords = airtableListAll_(DIANE_AIRTABLE_TABLES.parserOutputs);
  const ocrRecords = airtableListAll_(DIANE_AIRTABLE_TABLES.ocrOutputs);
  const truckRecords = airtableListAll_(DIANE_AIRTABLE_TABLES.trucks);
  const driverRecords = airtableListAll_(DIANE_AIRTABLE_TABLES.drivers);
  const brokerRecords = airtableListAll_(DIANE_AIRTABLE_TABLES.brokers);
  const aliasRecords = airtableListAll_(DIANE_AIRTABLE_TABLES.aliases);
  const truckAliasMap = buildTruckAliasMap_(truckRecords, driverRecords, brokerRecords, aliasRecords);
  const parserById = {};
  const parserByValidationId = {};
  parserRecords.forEach(function(record) {
    parserById[record.id] = record;
    airtableLinkIds_(airtableField_(record, 'Validation Queue')).forEach(function(id) { parserByValidationId[id] = record; });
  });
  const ocrById = {};
  const ocrByTicketId = {};
  const ocrByTicketNumber = {};
  ocrRecords.forEach(function(record) {
    ocrById[record.id] = record;
    airtableLinkIds_(airtableField_(record, 'Tickets')).forEach(function(id) { ocrByTicketId[id] = record; });
    const extractedNumber = airtableText_(airtableField_(record, 'Extracted Ticket Number'));
    if (extractedNumber) ocrByTicketNumber[extractedNumber] = record;
  });
  const ticketById = {};
  ticketRecords.forEach(function(record) { ticketById[record.id] = record; });

  const batchById = {};
  batchRecords.forEach(function(record) {
    batchById[record.id] = record;
  });

  const validationById = {};
  validationRecords.forEach(function(record) {
    const row = mapAirtableValidation_(record, ticketById, parserById, ocrById, parserByValidationId, ocrByTicketId, ocrByTicketNumber);
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
      truckAliasMap: truckAliasMap,
      batchTitle: buildBatchDisplayTitle_({broker:value('Broker',first.broker), customerJob:value('Customer / Job',first.customerJob), poNumber:value('PO Number',first.poNumber), workOrder:value('Work Order / Order',first.workOrder), origin:value('Origin',first.origin), destination:value('Destination',first.destination), rate:value('Rate',first.rate)}, batchKey),
      sourceValidationIds: rows
        .map(function(row) { return row.validationId; })
        .filter(Boolean)
        .join(';'),
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
  }).filter(function(batch) { return batch.rows && batch.rows.length; }).filter(function(batch) {
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
  const keyCounts = {};
  (result || []).forEach(function(group) {
    const key = norm_(group.batchKey);
    keyCounts[key] = (keyCounts[key] || 0) + 1;
  });
  const duplicateBatchKeys = Object.keys(keyCounts).filter(function(key) {
    return keyCounts[key] > 1;
  });
  const summary = {
    totalGroups: (result || []).length,
    savedBatchCount: (result || []).filter(function(group) {
      return group.batchHasSavedRecord === true;
    }).length,
    unbatchedGroupCount: (result || []).filter(function(group) {
      return norm_(group.batchKey).indexOf('UNBATCHED_') === 0;
    }).length,
    totalTicketCount: (result || []).reduce(function(total, group) {
      return total + Number(group.ticketCount || 0);
    }, 0),
    duplicateBatchKeys: duplicateBatchKeys.length,
    groupsMissingSourceFileUrl: (result || []).filter(function(group) {
      return (group.rows || []).some(function(row) {
        return !norm_(row.sourceFileUrl);
      });
    }).length
  };
  console.log(JSON.stringify(summary));
}

// Production manual-batching write support. This path uses Airtable record IDs
// exclusively and is intentionally separate from the legacy Sheet handlers.
const DIANE_AIRTABLE_FIELD_IDS = {
  validationQueue: {
    validationId: 'fldbonD66c0vV8Uxf', reviewStatus: 'fldiGPZRcFaTeZJ54',
    reviewBatches: 'fldZVxPcVZ2TD9hY2', doNotBill: 'fld7Ah2mk4X9EqbZQ',
    processed: 'fldkhxHm78IUtavtg', assignmentSource: 'fldAlpzIXWQLNUXKr',
    batchLock: 'fldbPz2lqjZWAQ1xZ', finalTicketNumber: 'fldMCBbMde6gq57Cs', finalTicketDate: 'fld1uUmHyfsOh7OSO', finalDriver: 'fldFnqEgs9S5wtVlp', finalTruck: 'fldyL6QjQeHegVEkB', finalBroker: 'fld9YDUryueV7epDL', finalMaterial: 'fld48yi1U2DBMx2E7', finalQuantity: 'fldUuHnlZ9VJt4aYH', finalRate: 'fldobFUj51MIScTeM', finalTotal: 'fld5IN6BntCd4wDJM', reviewerNotes: 'fldy8MyJv4K766tpf', finalCustomerJob: 'fldmjSNoMeNIMZJdM', finalPoNumber: 'fldOXcWifpq0fkwf1', finalWorkOrder: 'fld7S1n1BkDbqMJ0Z', finalOrigin: 'fldrVBKiDR8xh76jg', finalDestination: 'fldKb9pJEskeNqwVt', reviewer: 'fldkHePHvAtGEACm1', processedAt: 'fldJtkykRgHq3aSqu'
  },
  reviewBatches: {
    batchKey: 'fldFVfnWOeuoxaT4H', batchStatus: 'fldek311IgUIjWmPz',
    validationQueue: 'fldmZkGiVoVtMmJWk', customerJob: 'fldb6LbODvJXb2pHJ',
    poNumber: 'fld9s64m8MFvmoaMJ', workOrder: 'fldfepZIzqNpI7FS4',
    origin: 'fldLEYxtwdE2YOkaO', destination: 'fld6NOGe5nSVeWaov',
    rate: 'fldWH1pIFLrQcRW05'
  }
};

function airtableSafeError_(operation, tableId, status, body) {
  let message = 'Airtable request failed.';
  try {
    const parsed = JSON.parse(body || '{}');
    message = parsed.error && (parsed.error.message || parsed.error.type) || parsed.message || message;
  } catch (e) { message = 'Airtable returned an unreadable error response.'; }
  const error = new Error(operation + ' failed for ' + tableId + ' (' + status + '): ' + message);
  error.operation = operation; error.tableId = tableId; error.httpStatus = status; error.airtableMessage = message;
  return error;
}

function airtableRequest_(operation, tableId, method, recordId, body) {
  const url = DIANE_AIRTABLE_API_ROOT + DIANE_AIRTABLE_BASE_ID + '/' + tableId + (recordId ? '/' + encodeURIComponent(recordId) : '') + (operation === 'get record' ? '?returnFieldsByFieldId=true' : '');
  const options = {method: method.toLowerCase(), headers: {Authorization: 'Bearer ' + getAirtableToken_()}, muteHttpExceptions: true};
  if (body !== undefined) { options.contentType = 'application/json'; options.payload = JSON.stringify(body); }
  const response = UrlFetchApp.fetch(url, options);
  const status = response.getResponseCode(); const text = response.getContentText();
  if (status < 200 || status >= 300) throw airtableSafeError_(operation, tableId, status, text);
  try { return text ? JSON.parse(text) : {}; } catch (e) { throw airtableSafeError_(operation, tableId, status, 'Invalid JSON response.'); }
}

function airtableGetRecord_(tableId, recordId) { return airtableRequest_('get record', tableId, 'get', recordId); }
// Airtable's create-record endpoint accepts the records array wrapper for a single record.
function airtableCreateRecord_(tableId, fields) { return airtableRequest_('create record', tableId, 'post', '', {records: [{fields: fields}]}); }
function airtableUpdateRecords_(tableId, records) {
  const output = [];
  for (let i = 0; i < records.length; i += 10) {
    const result = airtableRequest_('update records', tableId, 'patch', '', {records: records.slice(i, i + 10)});
    (result.records || []).forEach(function(record) { output.push(record); });
  }
  return {records: output};
}

function airtableRecordId_(id) { return /^rec[a-zA-Z0-9]{10,}$/.test(String(id || '').trim()); }
function airtableFieldById_(record, fieldId) { return record && record.fields ? record.fields[fieldId] : undefined; }
function airtableLinkIdsById_(record, fieldId) { return airtableLinkIds_(airtableFieldById_(record, fieldId)); }
function airtableTruthyById_(record, fieldId) { return airtableTruthy_(airtableFieldById_(record, fieldId)); }

function getManualBatchRequestCacheKey_(requestId) { return 'diane_manual_batch:' + String(requestId || '').trim(); }
function getCachedManualBatchResult_(requestId) {
  if (!requestId) return null;
  const value = CacheService.getScriptCache().get(getManualBatchRequestCacheKey_(requestId));
  return value ? JSON.parse(value) : null;
}
function cacheManualBatchResult_(requestId, result) {
  if (requestId) CacheService.getScriptCache().put(getManualBatchRequestCacheKey_(requestId), JSON.stringify(result), 600);
}
function clearManualBatchRequestCache_(requestId) {
  if (requestId) CacheService.getScriptCache().remove(getManualBatchRequestCacheKey_(requestId));
}
function manualBatchInProgressResult_() {
  return {ok: false, duplicateRequest: true, message: 'This manual batch request is already being processed.'};
}
function putManualBatchInProgress_(requestId) {
  cacheManualBatchResult_(requestId, {ok: false, inProgress: true, message: 'Manual batch request is in progress.'});
}

function manualBatchIds_(payload, minimum) {
  const ids = uniqueIds_(payload && payload.validationRecordIds || []);
  if (ids.length < minimum) throw new Error('Select at least ' + minimum + ' Airtable ticket(s).');
  const invalid = ids.filter(function(id) { return !airtableRecordId_(id); });
  if (invalid.length) throw new Error('Invalid Airtable validation record ID(s): ' + invalid.join(', '));
  if (!norm_(payload.clientRequestId)) throw new Error('Missing manual-batch client request ID.');
  return ids;
}

function validateManualBatchRows_(ids, targetBatchRecordId) {
  const rows = ids.map(function(id) { return {id: id, record: airtableGetRecord_(DIANE_AIRTABLE_TABLES.validationQueue, id)}; });
  const blocked = [];
  rows.forEach(function(item) {
    const r = item.record; const reasons = [];
    if (norm_(airtableText_(airtableFieldById_(r, DIANE_AIRTABLE_FIELD_IDS.validationQueue.reviewStatus))) !== 'Pending Review') reasons.push('not Pending Review');
    if (airtableTruthyById_(r, DIANE_AIRTABLE_FIELD_IDS.validationQueue.processed)) reasons.push('already Processed to Tickets');
    if (airtableTruthyById_(r, DIANE_AIRTABLE_FIELD_IDS.validationQueue.doNotBill)) reasons.push('Do Not Bill');
    const linked = airtableLinkIdsById_(r, DIANE_AIRTABLE_FIELD_IDS.validationQueue.reviewBatches);
    const other = linked.filter(function(id) { return id !== targetBatchRecordId; });
    if (other.length) reasons.push('already assigned to another Review Batch');
    if (reasons.length) blocked.push({validationRecordId: item.id, reasons: reasons});
    item.linkedBatchIds = linked;
  });
  if (blocked.length) { const error = new Error('Manual batching blocked: ' + blocked.map(function(x) { return x.validationRecordId + ' (' + x.reasons.join(', ') + ')'; }).join('; ')); error.blockedRecords = blocked; throw error; }
  return rows;
}

function manualBatchKey_() { return 'MANUAL_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss') + '_' + Utilities.getUuid().replace(/-/g, '').slice(0, 8); }

function validateBatchOperationRows_(ids, targetBatchRecordId, rejectProcessed, rejectApproved) {
  const rows = ids.map(function(id) { return {id: id, record: airtableGetRecord_(DIANE_AIRTABLE_TABLES.validationQueue, id)}; });
  const problems = [];
  rows.forEach(function(item) {
    const r = item.record;
    const status = norm_(airtableText_(airtableFieldById_(r, DIANE_AIRTABLE_FIELD_IDS.validationQueue.reviewStatus))).replace(/\s+/g, ' ');
    const processed = airtableTruthyById_(r, DIANE_AIRTABLE_FIELD_IDS.validationQueue.processed);
    const linked = airtableLinkIdsById_(r, DIANE_AIRTABLE_FIELD_IDS.validationQueue.reviewBatches);
    if (linked.indexOf(targetBatchRecordId) < 0) problems.push(item.id + ' is not in the selected batch');
    if (status !== 'Pending Review') problems.push(item.id + ' is not Pending Review');
    if (rejectProcessed && processed) problems.push(item.id + ' is already Processed to Tickets');
    if (rejectApproved && (status === 'Reviewed' || status === 'Approved')) problems.push(item.id + ' is already approved');
  });
  if (problems.length) throw new Error('Batch operation blocked: ' + problems.join('; '));
  return rows;
}

function saveAirtableTicketFields(payload) {
  if (!payload) throw new Error('Missing save payload.');
  const id = norm_(payload.validationRecordId);
  if (!id) throw new Error('Missing Airtable validation record ID.');
  const number = function(value, label) { const text = norm_(value); if (text === '') return null; const n = Number(text); if (!isFinite(n)) throw new Error('Invalid numeric value for ' + label + ': ' + value); return n; };
  const f = DIANE_AIRTABLE_FIELD_IDS.validationQueue;
  const fields = {};
  fields[f.finalTicketNumber] = norm_(payload.ticketNumber);
  const ticketDate = norm_(payload.ticketDate);
  fields[f.finalTicketDate] = ticketDate === '' ? null : ticketDate;
  fields[f.finalBroker] = norm_(payload.broker);
  fields[f.finalCustomerJob] = norm_(payload.customerJob);
  fields[f.finalPoNumber] = norm_(payload.poNumber);
  fields[f.finalWorkOrder] = norm_(payload.workOrder);
  fields[f.finalOrigin] = norm_(payload.origin);
  fields[f.finalDestination] = norm_(payload.destination);
  fields[f.finalTruck] = norm_(payload.truck);
  fields[f.finalDriver] = norm_(payload.driver);
  fields[f.finalMaterial] = norm_(payload.material);
  fields[f.finalQuantity] = number(payload.quantity, 'Final Quantity');
  fields[f.finalRate] = number(payload.rate, 'Final Rate');
  fields[f.finalTotal] = number(payload.lineTotal, 'Final Total');
  fields[f.reviewerNotes] = norm_(payload.reviewNotes);
  const reviewer = norm_(payload.reviewer);
  if (reviewer === '') {
    fields[f.reviewer] = null;
  } else if (reviewer === 'usroVCuQ6vu5oCeXW') {
    fields[f.reviewer] = {id: 'usroVCuQ6vu5oCeXW'};
  } else {
    throw new Error('Unknown Reviewer collaborator.');
  }
  airtableUpdateRecords_(DIANE_AIRTABLE_TABLES.validationQueue, [{id: id, fields: fields}]);
  return {ok: true, validationRecordId: id, message: 'Draft saved to Airtable.'};
}

function applySharedFieldsToAllTicketsAirtable_(payload) {
  if (!payload) throw new Error('Missing shared-field payload.');
  const batchId = norm_(payload.targetBatchRecordId); const ids = uniqueIds_(payload.validationRecordIds || []);
  if (!airtableRecordId_(batchId)) throw new Error('A valid target Review Batch record ID is required.');
  if (!ids.length) throw new Error('No tickets selected for shared-field copy.');
  validateBatchOperationRows_(ids, batchId, true, false);
  const f = DIANE_AIRTABLE_FIELD_IDS.validationQueue; const rate = norm_(payload.rate) === '' ? null : Number(payload.rate);
  if (rate !== null && !isFinite(rate)) throw new Error('Invalid numeric value for Final Rate: ' + payload.rate);
  const fields = {}; fields[f.finalBroker] = norm_(payload.broker); fields[f.finalCustomerJob] = norm_(payload.customerJob); fields[f.finalPoNumber] = norm_(payload.poNumber); fields[f.finalWorkOrder] = norm_(payload.workOrder); fields[f.finalOrigin] = norm_(payload.origin); fields[f.finalDestination] = norm_(payload.destination); fields[f.finalTruck] = norm_(payload.truck); fields[f.finalDriver] = norm_(payload.driver); fields[f.finalMaterial] = norm_(payload.material); fields[f.finalRate] = rate;
  airtableUpdateRecords_(DIANE_AIRTABLE_TABLES.validationQueue, ids.map(function(id) { return {id: id, fields: fields}; }));
  return {ok: true, batchRecordId: batchId, linkedValidationRecordIds: ids, message: 'Shared fields applied to ' + ids.length + ' ticket(s).'};
}

function removeTicketsFromBatchAirtable_(payload) {
  if (!payload) throw new Error('Missing remove-from-batch payload.');
  const batchId = norm_(payload.targetBatchRecordId); const ids = uniqueIds_(payload.validationRecordIds || []);
  if (!airtableRecordId_(batchId)) throw new Error('A valid target Review Batch record ID is required.');
  if (!ids.length) throw new Error('No tickets selected for removal.');
  validateBatchOperationRows_(ids, batchId, true, true);
  const f = DIANE_AIRTABLE_FIELD_IDS.validationQueue;
  airtableUpdateRecords_(DIANE_AIRTABLE_TABLES.validationQueue, ids.map(function(id) { const fields = {}; fields[f.reviewBatches] = []; fields[f.assignmentSource] = 'Unassigned'; fields[f.batchLock] = true; return {id: id, fields: fields}; }));
  return {ok: true, batchRecordId: batchId, removedValidationRecordIds: ids, message: 'Removed ' + ids.length + ' ticket(s) from the batch.'};
}

function uniqueManualBatchKey_() {
  let key = manualBatchKey_();
  const existing = airtableListAll_(DIANE_AIRTABLE_TABLES.reviewBatches);
  const hasKey = function(value) { return existing.some(function(record) { return norm_(airtableText_(airtableFieldById_(record, DIANE_AIRTABLE_FIELD_IDS.reviewBatches.batchKey))) === value; }); };
  if (hasKey(key)) key = manualBatchKey_();
  return key;
}
function createManualBatchRecord_(batchKey, ids) {
  const result = airtableCreateRecord_(DIANE_AIRTABLE_TABLES.reviewBatches, {
    [DIANE_AIRTABLE_FIELD_IDS.reviewBatches.batchKey]: batchKey,
    [DIANE_AIRTABLE_FIELD_IDS.reviewBatches.batchStatus]: 'Draft'
  });
  return result.records && result.records[0] ? result.records[0] : result;
}

function verifyManualBatchLinks_(ids, batchRecordId) {
  const failed = [];
  ids.forEach(function(id) {
    const record = airtableGetRecord_(DIANE_AIRTABLE_TABLES.validationQueue, id);
    const links = airtableLinkIdsById_(record, DIANE_AIRTABLE_FIELD_IDS.validationQueue.reviewBatches);
    if (links.indexOf(batchRecordId) < 0 || norm_(airtableText_(airtableFieldById_(record, DIANE_AIRTABLE_FIELD_IDS.validationQueue.assignmentSource))) !== 'Manual' || !airtableTruthyById_(record, DIANE_AIRTABLE_FIELD_IDS.validationQueue.batchLock)) failed.push(id);
  });
  const batch = airtableGetRecord_(DIANE_AIRTABLE_TABLES.reviewBatches, batchRecordId);
  const reciprocal = airtableLinkIdsById_(batch, DIANE_AIRTABLE_FIELD_IDS.reviewBatches.validationQueue);
  ids.forEach(function(id) { if (reciprocal.indexOf(id) < 0 && failed.indexOf(id) < 0) failed.push(id); });
  if (failed.length) throw new Error('Post-write verification failed for: ' + failed.join(', '));
  return true;
}

function classifyManualBatchLinks_(ids, batchRecordId) {
  const linked = [], failed = [], limitations = [];
  let batchReadSucceeded = false;
  try {
    airtableGetRecord_(DIANE_AIRTABLE_TABLES.reviewBatches, batchRecordId);
    batchReadSucceeded = true;
  } catch (e) {
    limitations.push('Could not verify that Review Batches contains the intended batch: ' + e.message);
  }
  ids.forEach(function(id) {
    if (!batchReadSucceeded) { failed.push(id); return; }
    try {
      const record = airtableGetRecord_(DIANE_AIRTABLE_TABLES.validationQueue, id);
      const hasBatch = airtableLinkIdsById_(record, DIANE_AIRTABLE_FIELD_IDS.validationQueue.reviewBatches).indexOf(batchRecordId) >= 0;
      const isManual = norm_(airtableText_(airtableFieldById_(record, DIANE_AIRTABLE_FIELD_IDS.validationQueue.assignmentSource))) === 'Manual';
      const isLocked = airtableTruthyById_(record, DIANE_AIRTABLE_FIELD_IDS.validationQueue.batchLock);
      if (hasBatch && isManual && isLocked) linked.push(id); else failed.push(id);
    } catch (e) {
      failed.push(id);
      limitations.push('Could not classify Validation Queue record ' + id + ': ' + e.message);
    }
  });
  return {successfullyLinkedValidationRecordIds: linked, failedValidationRecordIds: failed, limitation: limitations.join(' ')};
}

function createManualBatchFromSelectedAirtable_(payload) {
  const requestId = norm_(payload && payload.clientRequestId);
  const cached = getCachedManualBatchResult_(requestId); if (cached) return cached.inProgress ? manualBatchInProgressResult_() : Object.assign({duplicateRequest: true}, cached);
  const lock = LockService.getScriptLock(); if (!lock.tryLock(15000)) return {ok: false, message: 'Another manual batch operation is in progress. Please try again.'};
  let created = null; let ids;
  try {
    const lockedCached = getCachedManualBatchResult_(requestId);
    if (lockedCached) return lockedCached.inProgress ? manualBatchInProgressResult_() : Object.assign({duplicateRequest: true}, lockedCached);
    putManualBatchInProgress_(requestId);
    ids = manualBatchIds_(payload, 2);
    validateManualBatchRows_(ids);
    const batchKey = uniqueManualBatchKey_(); created = createManualBatchRecord_(batchKey, ids);
    const batchRecordId = created.id; const records = ids.map(function(id) { return {id: id, fields: {[DIANE_AIRTABLE_FIELD_IDS.validationQueue.reviewBatches]: [batchRecordId], [DIANE_AIRTABLE_FIELD_IDS.validationQueue.assignmentSource]: 'Manual', [DIANE_AIRTABLE_FIELD_IDS.validationQueue.batchLock]: true}}; });
    airtableUpdateRecords_(DIANE_AIRTABLE_TABLES.validationQueue, records); verifyManualBatchLinks_(ids, batchRecordId);
    const result = {ok: true, batchRecordId: batchRecordId, batchKey: batchKey, linkedValidationRecordIds: ids, message: 'Created manual batch with ' + ids.length + ' tickets.'}; cacheManualBatchResult_(payload.clientRequestId, result); return result;
  } catch (e) {
    if (created) { const classification = classifyManualBatchLinks_(ids || [], created.id); const result = {ok: false, batchCreated: true, batchRecordId: created.id, batchKey: airtableText_(airtableFieldById_(created, DIANE_AIRTABLE_FIELD_IDS.reviewBatches.batchKey)), successfullyLinkedValidationRecordIds: classification.successfullyLinkedValidationRecordIds, failedValidationRecordIds: classification.failedValidationRecordIds, message: e.message + (classification.limitation ? ' Classification limitation: ' + classification.limitation : '')}; cacheManualBatchResult_(requestId, result); return result; }
    clearManualBatchRequestCache_(requestId);
    throw e;
  } finally { lock.releaseLock(); }
}

function addSelectedTicketsToExistingBatchAirtable_(payload) {
  const requestId = norm_(payload && payload.clientRequestId);
  const cached = getCachedManualBatchResult_(requestId); if (cached) return cached.inProgress ? manualBatchInProgressResult_() : Object.assign({duplicateRequest: true}, cached);
  const lock = LockService.getScriptLock(); if (!lock.tryLock(15000)) return {ok: false, message: 'Another manual batch operation is in progress. Please try again.'};
  try {
    const lockedCached = getCachedManualBatchResult_(requestId);
    if (lockedCached) return lockedCached.inProgress ? manualBatchInProgressResult_() : Object.assign({duplicateRequest: true}, lockedCached);
    putManualBatchInProgress_(requestId);
    const ids = manualBatchIds_(payload, 1); const target = norm_(payload.targetBatchRecordId);
    if (!airtableRecordId_(target)) throw new Error('A valid target Airtable Review Batch record ID is required.');
    const batch = airtableGetRecord_(DIANE_AIRTABLE_TABLES.reviewBatches, target); const key = airtableText_(airtableFieldById_(batch, DIANE_AIRTABLE_FIELD_IDS.reviewBatches.batchKey));
    const rows = validateManualBatchRows_(ids, target); const toUpdate = rows.filter(function(item) { return item.linkedBatchIds.indexOf(target) < 0; }).map(function(item) { return {id: item.id, fields: {[DIANE_AIRTABLE_FIELD_IDS.validationQueue.reviewBatches]: [target], [DIANE_AIRTABLE_FIELD_IDS.validationQueue.assignmentSource]: 'Manual', [DIANE_AIRTABLE_FIELD_IDS.validationQueue.batchLock]: true}}; });
    if (toUpdate.length) airtableUpdateRecords_(DIANE_AIRTABLE_TABLES.validationQueue, toUpdate); verifyManualBatchLinks_(ids, target);
    const result = {ok: true, batchRecordId: target, batchKey: key, linkedValidationRecordIds: ids, message: 'Added ' + ids.length + ' ticket(s) to the manual batch.'}; cacheManualBatchResult_(requestId, result); return result;
  } catch (e) {
    clearManualBatchRequestCache_(requestId);
    throw e;
  } finally { lock.releaseLock(); }
}
