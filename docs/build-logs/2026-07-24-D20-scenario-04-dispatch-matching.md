# 2026-07-24: Diane 2.0 Scenario 04 Dispatch Matching

## Status

**IN PROGRESS**

Scenario 04 remains read-only. No Review Batch records, Validation Queue assignments, Ticket updates, Apps Script changes, deployment changes, or Google Sheets changes were made during this work.

## Goal

Use the Dispatch-first operating layer to give every ticket the best available Broker, Truck, Driver, customer/job, origin, destination, PO, work order, and rate suggestions before human review.

Every ticket will still be opened and reviewed manually. Automatic matching is intended to prefill useful values, not bypass review.

## Approved operating model

```text
Dispatch = what was supposed to happen
Ticket = what actually happened
Review = reconcile the two
```

Primary matching direction:

1. Use ticket or OCR evidence to identify plausible active Dispatch records.
2. Customer, destination, and job provide the first candidate match.
3. Origin, PO, rate, truck, and driver distinguish overlapping candidates.
4. Exactly one safe candidate may be used as a suggested Dispatch.
5. Ambiguous or missing matches remain available for human correction.
6. Review Batch identity remains Broker + Truck. Driver is not part of batch identity.

## Verified source data

- 57 Validation Queue records are eligible for Scenario 04.
- All 57 link correctly to a Ticket and Parser Output.
- All 57 Parser Outputs link to an OCR Output.
- Structured Parser Output and Validation Queue fields do not currently contain enough customer, destination, origin, or rate data for useful Dispatch matching.
- Raw OCR Text contains the ticket clues needed to create useful starting suggestions.
- The six active Dispatch records are available in Airtable.

## Scenario 04 read-path changes

The existing read-only path was preserved:

```text
[2] Search Validation Queue
-> [3] Get linked Ticket
-> [7] Get linked Parser Output
```

Added:

```text
[9] Get linked OCR Output
-> [11] Router
```

The existing `Has linked Truck` route remains in place for later truck-resolution work.

A new Dispatch-matching route was added from the router:

```text
[13] Set multiple variables
-> [18] Search active Dispatches
-> Candidate matches OCR filter
-> [20] Set multiple variables
-> [21] Table aggregator
```

## Module [9]: linked OCR Output

Configuration:

- Base: Diane 2.0
- Table: OCR Outputs
- Record ID: linked OCR Output ID from Parser Output [7]

Verification:

- Module [9] returned 57 successful results.
- Raw OCR Text was populated for all 57 records.

## Module [13]: ticket-side variables

The Dispatch route now carries:

- `rawOcrText`
- `normalizedOcrText`
- `parsedTicketDate`
- `parsedTruck`
- `parsedBroker`
- `parsedRate`
- `validationId`
- `validationRecordId`
- `ticketRecordId`
- `parserOutputRecordId`
- `ocrOutputRecordId`

`normalizedOcrText` is evaluated with Make's text function as uppercase Raw OCR Text.

A previous pasted formula was initially treated as literal text. It was corrected using Make's function editor. The verified output now contains actual uppercase OCR text rather than formula text.

## Module [18]: active Dispatch search

Configuration:

- Base: Diane 2.0
- Table: Dispatches
- Formula: `{Dispatch Status} = "Active"`
- Limit: 10

Verification:

- Module [18] executed for all 57 ticket bundles.
- Each execution returned the six active Dispatch records.
- The module bubble correctly displayed 57 operations rather than 342 individual candidate rows.

## Candidate filter

Filter name:

```text
Candidate matches OCR
```

Current candidate rule:

```text
[13] normalizedOcrText contains [18] Normalized Destination
OR
[13] normalizedOcrText contains [18] Normalized Job
OR
[13] normalizedOcrText contains [18] Normalized Customer
```

Both sides use mapped values. Typed formula strings were removed after diagnostics showed they were being compared literally.

Verification:

- 51 ticket-to-Dispatch candidate combinations passed the filter.
- This is a candidate-row count, not a final matched-ticket count.
- Some tickets can produce more than one candidate and still require an origin or other tie-break.

## Module [20]: candidate package

Each passing candidate now carries:

- `validationRecordId`
- `dispatchRecordId`
- `dispatchId`
- `dispatchOrigin`
- `dispatchDestination`
- `dispatchCustomer`
- `dispatchJob`
- `dispatchPoNumber`
- `dispatchWorkOrder`
- `dispatchRate`
- `dispatchBrokerRecordId`
- `dispatchTruckRecordId`
- `dispatchDriverRecordId`

The Broker, Truck, and Driver values were verified as Airtable `rec...` linked-record IDs.

## Module [21]: grouped candidate results

A Table aggregator was added with:

- Source module: Tools [20]
- Group by: `validationRecordId`
- Aggregated fields: the full Dispatch candidate package from [20]

Verification:

- The aggregator produced 51 grouped outputs.
- Each grouped output has a Key equal to the Validation Queue record ID.
- Six of the 57 Validation Queue records produced no first-pass Dispatch candidate.
- The aggregated output is currently text-based and concatenates selected candidate fields.

## Current blocker

The grouped output must now distinguish:

```text
1 candidate  = usable suggested Dispatch
2+ candidates = apply Origin or another supporting clue
0 candidates = retain for human review without a Dispatch suggestion
```

The two Michels Data / Hubbard Dispatches intentionally overlap on destination, broker, dates, truck, and driver. They must be separated by origin, rate, or human review:

- Canfield Materials -> DSP_20260713_005
- Texas Crushed Stone -> DSP_20260713_006

No write module should be added until candidate counting and tie-breaking are verified.

## Safety state

- No Review Batch records created.
- No Validation Queue records updated.
- No Dispatch links written.
- No Tickets updated.
- No Apps Script code or deployment changed.
- No Google Sheets scenario touched.
- Scenario scheduling remains off.

## Next step

Open the downstream module after Table aggregator [21] and determine the safest Make-native way to expose or count the candidate rows inside each group.

Then route grouped results into:

```text
Single candidate
Multiple candidates
No candidate
```

Use Origin to resolve overlapping candidates before proposing any Airtable write modules.