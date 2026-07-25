# 2026-07-25: Diane 2.0 Scenario 04 Dispatch Candidate Resolution

## Status

**PASSED — THREE-RECORD CANDIDATE RESOLUTION, ORIGIN TIE-BREAK, AND ORIGIN SUGGESTION PROVEN**

Scenario 04 remains read-only. No Review Batch records, Validation Queue assignments, Ticket updates, Dispatch links, Apps Script changes, deployments, scheduling changes, or Google Sheets changes were made during this work.

## Goal

Replace the failed native Make `candidateMatch` formula with a reliable Dispatch resolver that can:

1. distinguish no candidate, one candidate, and multiple candidates
2. use Origin only as a tie-break after first-pass candidate resolution
3. return a practical OCR-based Origin suggestion for review without falsely resolving a Dispatch

The first-pass resolver uses ticket OCR evidence against active Dispatch values for:

- Customer
- Job
- Destination

PO Number and Work Order are not primary clues because they are frequently blank. Rate is supporting data only.

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

The lower Router [11] branch through Modules [8] and [5] was inspected but left unchanged. It is not part of the proven Dispatch resolver path.

## Module [20]: comparison bundle fields

Module [20] carries the Dispatch comparison package:

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
- `normalizedOcrText` from `[13].normalizedOcrText`

The earlier native Make `candidateMatch` field is non-authoritative and is not used by the final resolver.

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

Verified result:

- Module [23] produced 3 operations.
- Each operation contained all 6 active Dispatch records for one Validation Queue record.

## Module [24]: Make Code resolver

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
5. returns numeric `candidateMatch` values for every Dispatch comparison
6. returns `candidateCount`
7. returns `candidateStatus` as `none`, `one`, or `multiple`
8. preserves surviving `candidateDispatches`
9. preserves all `comparisons` for inspection
10. applies Origin only after the first pass when multiple candidates survive
11. returns an independent OCR Origin suggestion for review

## Origin tie-break

Origin does not create a candidate and cannot revive a Dispatch that failed the first pass.

Resolution rules:

```text
0 first-pass candidates
-> resolutionStatus: none
-> resolvedDispatch: empty
-> tieBreakMethod: none

1 first-pass candidate
-> resolutionStatus: resolved
-> resolvedDispatch: the single candidate
-> tieBreakMethod: first_pass_single

2+ first-pass candidates
-> compare OCR only against the surviving candidates' origins
-> exactly one origin match: resolved by origin
-> zero or multiple origin matches: ambiguous
```

Additional output fields:

- `resolutionStatus`
- `resolvedDispatch`
- `tieBreakMethod`
- `originMatchCount`
- `originMatchedDispatches`

## OCR Origin suggestion

A separate, minimal review suggestion was added without weakening Dispatch resolution.

The code compares OCR against all active Dispatch origins. If exactly one active origin matches, it returns:

- `suggestedOrigin`
- `suggestedOriginDispatchRecordId`
- `suggestedOriginMethod: ocr_origin`

If no origin or multiple origins match, the suggestion remains blank and the method is `none`.

This suggestion does not change:

- `candidateCount`
- `candidateStatus`
- `resolutionStatus`
- `resolvedDispatch`

It is intended only to prefill a useful Origin value for Ernie's mandatory manual review.

No broader generic field classifier, OCR preview packet, material suggestion system, or speculative scoring layer was added.

## Verified three-record results

### No candidate with useful Origin suggestion

Ticket:

```text
400646
```

Result:

```text
candidateCount: 0
candidateStatus: none
resolutionStatus: none
resolvedDispatch: empty
tieBreakMethod: none
originMatchCount: 0
suggestedOrigin: Canfield Materials
suggestedOriginMethod: ocr_origin
```

The OCR contains `CANFIELD MATERIALS`, but Customer, Job, and Destination do not establish a valid Dispatch candidate. The resolver correctly leaves the Dispatch unresolved while returning a useful review suggestion.

### Multiple candidates resolved by Origin

Ticket:

```text
0825278
```

First-pass result:

```text
candidateCount: 2
candidateStatus: multiple
```

Surviving Dispatches:

- `DSP_20260713_005` — Canfield Materials
- `DSP_20260713_006` — Texas Crushed Stone

Both remain preserved in `candidateDispatches` with `candidateMatch: 1`.

Final result:

```text
resolutionStatus: resolved
resolvedDispatch: DSP_20260713_006
tieBreakMethod: origin
originMatchCount: 1
suggestedOrigin: Texas Crushed Stone
suggestedOriginMethod: ocr_origin
```

The OCR contains `TEXAS CRUSHED STONE COMPANY`. The tie-break correctly selected `DSP_20260713_006` while preserving both first-pass candidates for inspection.

### One candidate without invented Origin suggestion

Ticket:

```text
1980051295
```

Result:

```text
candidateCount: 1
candidateStatus: one
resolutionStatus: resolved
resolvedDispatch: DSP_20260713_002
tieBreakMethod: first_pass_single
originMatchCount: 0
suggestedOrigin: empty
suggestedOriginMethod: none
```

The OCR did not contain a unique recognizable active Dispatch origin. The resolver correctly did not invent an Origin suggestion merely because the Dispatch was resolved through the first pass.

## Operation count

For the three-record proof:

- Module [18]: 3 searches returning 6 active Dispatches each
- Module [20]: 18 comparison bundles
- Module [23]: 3 grouped arrays
- Module [24]: 3 code executions

The code module executes once per ticket after aggregation, not once per Dispatch comparison.

The Origin tie-break and Origin suggestion reuse the OCR and Dispatch data already present in Module [24]. They add no Airtable search, router, aggregator, or write operation.

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
- Router [11] and Modules [8] and [5] remain unchanged.

## Current conclusion

Scenario 04's read-only Dispatch resolver is proven for the current three-record scope:

```text
0 candidates -> unresolved, with a unique OCR Origin suggestion when available
1 candidate  -> resolved by first_pass_single
2 candidates -> resolved by Origin when exactly one surviving origin matches
```

The resolver remains conservative about Dispatch assignment while providing the practical Origin prefill needed for a one-reviewer, 20-to-60-ticket-per-week workflow.

## Next step

Continue Scenario 04 from the proven resolver output.

Before adding Airtable writes or restoring the 57-record production scope:

1. define the exact downstream fields that will consume `resolvedDispatch` and `suggestedOrigin`
2. inspect the intended Review Batch creation and Validation Queue update sequence
3. show the exact proposed module sequence and mappings before changing the live scenario
4. preserve manual review for every ticket
5. keep scheduling off and Module [22] disconnected
6. keep the three-record scope until downstream routing and mappings are proven
