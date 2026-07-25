# 2026-07-24: Diane 2.0 Scenario 04 Dispatch Matching

## Status

**IN PROGRESS — PAUSED AFTER OPERATION-COST SNAG**

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

## Scenario 04 read path

The existing read-only path was preserved:

```text
[2] Search Validation Queue
-> [3] Get linked Ticket
-> [7] Get linked Parser Output
-> [9] Get linked OCR Output
-> [11] Router
```

The existing `Has linked Truck` route remains in place for later truck-resolution work.

The Dispatch-matching route currently is:

```text
[13] Set multiple variables
-> [18] Search active Dispatches
-> Pass all active Dispatches filter
-> [20] Set multiple variables
-> [23] Array aggregator
```

Module [22] remains disconnected and unchanged.

## Module [9]: linked OCR Output

Configuration:

- Base: Diane 2.0
- Table: OCR Outputs
- Record ID: linked OCR Output ID from Parser Output [7]

Verification:

- Module [9] returned 57 successful results.
- Raw OCR Text was populated for all 57 records.

## Module [13]: ticket-side variables

The Dispatch route carries:

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

A previous pasted formula was initially treated as literal text. It was corrected using Make's function editor. The verified output contains actual uppercase OCR text rather than formula text.

## Module [18]: active Dispatch search

Configuration:

- Base: Diane 2.0
- Table: Dispatches
- Formula: `{Dispatch Status} = "Active"`
- Limit: 10

Earlier verification:

- Module [18] executed for all 57 ticket bundles.
- Each execution returned the six active Dispatch records.
- The module bubble displayed 57 search operations.

## First-pass candidate filter results

The original filter was:

```text
[13] normalizedOcrText contains [18] Normalized Destination
OR
[13] normalizedOcrText contains [18] Normalized Job
OR
[13] normalizedOcrText contains [18] Normalized Customer
```

Verified result:

- 51 ticket-to-Dispatch candidate combinations passed.
- This was a candidate-row count, not a final matched-ticket count.
- Six of the 57 Validation Queue records produced no first-pass candidate.

## Candidate-counting redesign attempted

The Table aggregator could not expose a clean candidate array and could not represent zero-candidate tickets because those tickets were removed by the candidate filter.

The Table aggregator was therefore replaced with:

```text
[23] Array aggregator
```

Current configuration:

- Source module: Tools [20]
- Target structure: Custom
- Group by: `validationRecordId`
- Aggregated fields: full Dispatch candidate package plus `candidateMatch`
- Stop processing after an empty aggregation: unchecked

Module [20] now contains a `candidateMatch` variable intended to evaluate:

```text
1 when normalized OCR contains Dispatch destination, job, or customer
0 otherwise
```

The filter between [18] and [20] was changed from candidate-only filtering to an always-pass safety condition:

```text
[13] validationRecordId exists
```

Filter name:

```text
Pass all active Dispatches
```

This was intended to preserve all six Dispatch evaluations for each ticket so the Array aggregator could produce a zero, one, or multiple candidate count.

## Operation-cost snag

The full-run design expands the read-only comparison path to:

```text
57 tickets x 6 active Dispatches = 342 ticket-to-Dispatch evaluation bundles
```

Although there are still only 57 tickets, allowing every Dispatch through causes [20] to execute once per comparison and creates substantially more Make operations than the earlier candidate-filtered path.

A full diagnostic run was launched before the operation cost was stopped and consumed more Make credits than intended. The exact credit total has not been independently verified.

This was a design mistake for diagnostic testing. The scenario should not be run across all 57 tickets again in this form until the test scope is restricted or a lower-operation counting method is chosen.

## Required correction before another run

Do not run the full 57-record scenario.

First choose and inspect a small read-only test set containing:

1. one known single-candidate ticket
2. one known multiple-candidate ticket
3. one known no-candidate ticket

Temporarily restrict module [2] to only those records, test the candidate array and count logic, then restore the production search configuration.

Before changing the live scenario again, inspect whether candidate counts can be derived with fewer operations while preserving all three outcomes:

```text
Exactly one candidate
Multiple candidates
No candidate
```

## Matching warning

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
- Module [22] remains disconnected.

## Next step

Diagnose the current read-only Scenario 04 configuration before another run.

Confirm the safest low-operation test method, then test only three selected Validation Queue records. Do not add Airtable write modules, create Review Batches, update Validation Queue, or update Tickets.