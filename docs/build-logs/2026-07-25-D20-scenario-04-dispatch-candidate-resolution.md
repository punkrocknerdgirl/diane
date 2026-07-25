# 2026-07-25: Diane 2.0 Scenario 04 Dispatch Candidate Resolution

## Status

**PASSED — THREE-RECORD CANDIDATE RESOLUTION PROVEN**

Scenario 04 remains read-only. No Review Batch records, Validation Queue assignments, Ticket updates, Dispatch links, Apps Script changes, deployments, scheduling changes, or Google Sheets changes were made during this work.

## Goal

Replace the failed Make `candidateMatch` formula with a reliable first-pass Dispatch candidate resolver that can distinguish:

1. no candidate
2. one candidate
3. multiple candidates

The resolver must use ticket OCR evidence against active Dispatch values for:

- Customer
- Job
- Destination

Origin remains reserved for later tie-breaking. PO Number and Work Order are not primary clues because they are frequently blank. Rate is supporting data only.

## Starting safety state

- Scenario scheduling remained off.
- Module [2] remained restricted to three selected Validation Queue records.
- Module [22] remained disconnected.
- No Airtable write modules were connected.
- No Review Batch records were created.
- No Validation Queue records were updated.
- No Tickets were updated.

Temporary test records:

- single candidate: `recXRA8JTGRFLcOnq`
- multiple candidates: `recUUqPYAjiRPXmCp`
- no candidate: `rec594ju7pOsjpHjs`

## Failed native Make formula

A nested tokenized Make formula using `if()`, `contains()`, and `ifempty()` was successfully saved as an evaluated expression rather than a Long String.

However, the exact-string `contains()` approach returned `0` for known matches because OCR punctuation and spacing did not reliably match the normalized Dispatch strings.

The formula approach was abandoned in favor of a code-based resolver.

## Final read-only module sequence

```text
[13] Set multiple variables
-> [18] Search active Dispatches
-> Pass all active Dispatches filter
-> [20] Set multiple variables
-> [23] Array aggregator
-> [24] Make Code: Run code
```

## Module [20]: comparison bundle fields

Module [20] continues to carry the Dispatch comparison package, including:

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

The following ticket-side field was added so it remains attached to the correct grouped record:

- `normalizedOcrText` from `[13].normalizedOcrText`

The earlier native Make `candidateMatch` field remains non-authoritative and is not used by the final resolver.

## Module [23]: Array aggregator correction

The aggregator originally used Module [20] as its source module. That caused 18 one-item arrays instead of three six-item arrays.

The source module was corrected to:

```text
[18] Airtable - Search Records
```

The grouping key remains:

```text
[20].validationRecordId
```

Target structure remains Custom.

Aggregated fields include the full Dispatch package plus:

- `normalizedOcrText`

Verified result:

- Module [23] produced 3 operations.
- Each operation contained all 6 active Dispatch records for one Validation Queue record.

## Module [24]: Make Code resolver

A Make Code `Run code` module was added after Module [23].

Language:

```text
JavaScript
```

Inputs:

- `validationRecordId` = `[23].Key`
- `dispatches` = `[23].Array`

The OCR text is read from the first item in the correctly grouped Dispatch array:

```javascript
const normalizedOcrText =
  dispatchArray[0]?.normalizedOcrText ?? "";
```

The resolver:

1. normalizes case, accents, punctuation, apostrophes, and repeated whitespace
2. ignores blank clues
3. ignores generic tokens such as `TX`, `THE`, `AND`, `OF`, `TO`, `AT`, `IN`, `CO`, `LLC`, `INC`, and `COMPANY`
4. checks meaningful Customer, Job, and Destination tokens against OCR text
5. returns `candidateMatch` as numeric `1` or `0` for every Dispatch comparison
6. returns `candidateCount`
7. returns `candidateStatus` as `none`, `one`, or `multiple`
8. returns the surviving `candidateDispatches`
9. returns all comparison records for inspection

Origin is intentionally excluded from first-pass matching and will be used later as a tie-break for overlapping candidates.

## Verified test results

### No candidate

Ticket:

```text
400646
```

Result:

```text
candidateCount: 0
candidateStatus: none
candidateDispatches: empty
```

This matches the expected result.

### Multiple candidates

Ticket:

```text
0825278
```

Result:

```text
candidateCount: 2
candidateStatus: multiple
```

Surviving Dispatches:

- `DSP_20260713_005`
- `DSP_20260713_006`

Both returned:

```text
candidateMatch: 1
```

This matches the expected first-pass result. The later origin tie-break remains:

- Canfield Materials -> `DSP_20260713_005`
- Texas Crushed Stone -> `DSP_20260713_006`

### One candidate

Ticket:

```text
1980051295
```

Result:

```text
candidateCount: 1
candidateStatus: one
```

Surviving Dispatch:

- `DSP_20260713_002`

The surviving comparison returned:

```text
candidateMatch: 1
```

This matches the expected result.

## Operation count

For the three-record proof:

- Module [18]: 3 searches returning 6 active Dispatches each
- Module [20]: 18 comparison bundles
- Module [23]: 3 grouped arrays
- Module [24]: 3 code executions

The code module executes once per ticket after aggregation, not once per Dispatch comparison.

## Final safety verification

- No Airtable records changed.
- No Review Batch records created.
- No Validation Queue records updated.
- No Tickets updated.
- No Dispatch links written.
- No Apps Script code changed.
- No Apps Script deployment changed.
- No Google Sheets scenario changed.
- Scheduling remains off.
- Module [22] remains disconnected.
- Module [2] remains restricted to the three-record test scope.

## Current conclusion

Scenario 04 first-pass Dispatch candidate resolution is proven for all three required cases:

```text
0 candidates -> none
1 candidate  -> one
2 candidates -> multiple
```

The Make Code resolver replaces the failed native Make formula approach.

## Next step

Continue Scenario 04 from the proven candidate-resolution output.

Before adding any Airtable write modules:

1. inspect and define the origin tie-break for `multiple` results
2. decide the exact output fields required for one, multiple, and no-candidate routes
3. preserve manual review for every ticket
4. show the exact proposed module sequence before changing the live scenario
5. keep the three-record test scope until routing behavior is proven
6. do not restore the 57-record production scope yet
