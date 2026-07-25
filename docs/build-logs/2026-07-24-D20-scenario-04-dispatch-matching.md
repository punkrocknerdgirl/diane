# 2026-07-24: Diane 2.0 Scenario 04 Dispatch Matching

## Status

**IN PROGRESS — LOW-OPERATION TEST COMPLETED; CANDIDATE LOGIC INVALID**

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

Module [20] contains a `candidateMatch` variable intended to evaluate:

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

## Temporary three-record test scope

Module [2] was temporarily restricted to three Validation Queue records:

```text
recXRA8JTGRFLcOnq
recUUqPYAjiRPXmCp
rec594ju7pOsjpHjs
```

Temporary formula:

```text
AND(
  {Review Status} = "Pending Review",
  COUNTA({Review Batches}) = 0,
  OR(
    RECORD_ID() = "recXRA8JTGRFLcOnq",
    RECORD_ID() = "recUUqPYAjiRPXmCp",
    RECORD_ID() = "rec594ju7pOsjpHjs"
  )
)
```

Temporary limit:

```text
3
```

Original production formula to restore later:

```text
AND(
  {Review Status} = "Pending Review",
  COUNTA({Review Batches}) = 0
)
```

Original production limit:

```text
75
```

### Expected single-candidate record

- Validation record: `recXRA8JTGRFLcOnq`
- Validation ID: `VAL_INTAKE_MOTIVE_1034043996_1034043997`
- Ticket: `1980051295`
- Expected Dispatch: `DSP_20260713_002`
- OCR contains Mario Sinacola clues.

### Expected multiple-candidate record

- Validation record: `recUUqPYAjiRPXmCp`
- Validation ID: `VAL_INTAKE_MOTIVE_1034043804_1034043804`
- Ticket: `0825278`
- Expected first-pass Dispatches: `DSP_20260713_005` and `DSP_20260713_006`
- Both share Michels Data / Hubbard clues.
- Later tie-break should use origin:
  - Canfield Materials -> `DSP_20260713_005`
  - Texas Crushed Stone -> `DSP_20260713_006`

### Expected no-candidate record

- Validation record: `rec594ju7pOsjpHjs`
- Validation ID: `VAL_INTAKE_MOTIVE_1024751026_1024751026`
- Ticket: `400646`
- OCR contains Canfield Materials and W4 Transports but no configured Dispatch destination, customer, or job clue.
- Expected candidate count: 0.

## Low-operation test result

The temporary scope worked as intended:

- [2] returned 3 Validation Queue records.
- [18] searched the six active Dispatches for each selected ticket.
- [20] evaluated 18 ticket-to-Dispatch comparison bundles.
- [23] received the comparison stream without any Airtable writes.
- Scheduling remained off.
- Module [22] remained disconnected.

## candidateMatch implementation failure

The first `candidateMatch` expression was entered as plain text and passed through the Array aggregator as a Long String rather than an evaluated value.

The expression was then rebuilt manually with Make's function picker and mapped tokens. The tokenized form survived save and produced numeric output, but Make normalized the intended Boolean `or()` into green `+` operators:

```text
if(
  contains(...) + contains(...) + contains(...);
  1;
  0
)
```

The three-record test proved this logic is invalid:

- `candidateMatch` now evaluates as a number rather than text.
- The first Mario Sinacola comparison correctly returned 1.
- Inspection of the remaining comparison bundles showed every Dispatch evaluation also returned 1.
- Nonmatching Dispatches therefore cannot be distinguished from matching Dispatches.

Conclusion:

```text
candidateMatch is currently invalid and must not be used for counting or assignment.
```

Do not run another candidate-count test with the current `candidateMatch` implementation.

## Important implementation guardrail

Do not ask Ernie to build another long nested Make formula manually with the token picker. The process was fragile, extremely time-consuming, and Make's saved normalization changed the intended Boolean behavior.

Do not rely on Work or pasted text to build this formula because pasted expressions repeatedly saved as plain text instead of tokenized Make functions.

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
- Module [2] remains restricted to the three-record test scope.

## Next step

Stop formula work and diagnose a safer low-operation replacement for `candidateMatch`.

Before changing anything:

1. Inspect the current read-only module sequence.
2. Decide whether candidate evaluation should be removed from [20], replaced, or moved after aggregation.
3. Show the exact proposed module sequence and operation count.
4. Do not require another long manually tokenized Make formula.
5. Do not add Airtable write modules.
6. Do not run until the replacement is approved.
