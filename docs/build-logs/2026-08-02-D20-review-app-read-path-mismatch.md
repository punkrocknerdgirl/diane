# Diane 2.0 Checkpoint: Review-App Read Path and Weekly Batch Rollup

**Date:** 2026-08-02

## Purpose

Capture the verified state after Scenario D completed for the full live batch, Scenario E successfully created and linked Review Batches, the review-app overview mismatch was diagnosed through the deployed Apps Script read path, and a weekly Monday-through-Sunday batch rollup was defined and inventoried.

## Current verified live state

### Import run

- Import Run Key: `MOTIVE_LIVE_SCENARIO_A_20260802`
- Source: Motive
- Run Status: Completed
- Pull From: 2026-07-01 12:00 AM Central
- Linked live Tickets: 83

### Completed pipeline state

- Scenario A completed with 83 live Tickets.
- Scenario B completed with all 83 cleaned.
- Scenario C completed with 83 OCR Runs and 83 OCR Outputs.
- Scenario D completed with 83 Validation Queue records.
- Scenario E remains intentionally limited to one-record execution scope, but three Review Batch records were created and linked during controlled testing.

### Existing persisted Review Batch links

- Review Batch `recKXsjpDWNgaOXJP` links to Validation Queue record `rec5Gj7ZDdG9pMy4S`.
- Review Batch `rec3i6FRsC4giJmBm` links to Validation Queue record `rec7CnGt1zjRWGIN5`.
- Review Batch `recQwB4gf68jpZYfn` links to Validation Queue record `recyUCQOIrwfrfKbV`.

For all three pairs:

- Review Batch status is `Draft`.
- the reciprocal Validation Queue `Review Batches` link is populated.
- Validation Queue `Review Status` is `Pending Review`.

## Scenario E corrections already verified

### Hardcoded one-record Validation ID removed

Module `[2]` now uses:

```text
AND(
  {Review Status} = "Pending Review",
  COUNTA({Review Batches}) = 0
)
```

The one-record safety scope remains through `Limit = 1`.

### Review Batches table ID corrected

Correct live Review Batches table ID:

```text
tbl37qgQqfH1yd8Ww
```

Module `[37]` URL prefix:

```text
/v0/appMWvtLU0hMBqjLC/tbl37qgQqfH1yd8Ww/
```

### Existing Review Batch guard added and verified

The `Existing Review Batch Found` guard is between module `[27]` and modules `[36]/[37]` and requires `27.body.records[]` length greater than zero.

Verified behavior:

- when module `[27]` returned `records: []`, modules `[36]` and `[37]` did not run.
- module `[29]` created a Draft Review Batch instead.
- an empty existing-batch lookup can no longer fall through to an unsafe PATCH.

## Deployed review-app investigation

### Live deployment

- Live URL: `https://script.google.com/macros/s/AKfycbzzjkCqwsiCO7vahT1BJn6S4fArwA5dTtsoVEmEz9c05i8P9RTprUOtZ0OKvp2prfc/exec`
- Deployment ID: `AKfycbzzjkCqwsiCO7vahT1BJn6S4fArwA5dTtsoVEmEz9c05i8P9RTprUOtZ0OKvp2prfc`
- Apps Script project ID: `1kX8RuUiYcKmXExMDg4zhOm-E-rDHMw08JPqegWiBB36sUN0XZSnsJbAZ`
- Deployed version: `96`
- Version description: `Fix ticket detail layout and restore refresh state`
- Version created: 2026-07-26 11:43 PM

### Source comparison

The current repository source and deployed version 96 contain the same relevant mapping and grouping logic.

Validation mapping:

```javascript
reviewBatchRecordIds: airtableLinkIds_(airtableField_(record, 'Review Batches')),
```

Batch lookup:

```javascript
const batchById = {};
batchRecords.forEach(function(record) {
  batchById[record.id] = record;
});
```

Grouping:

```javascript
const batchIds = row.reviewBatchRecordIds || [];
const saved = batchIds.length ? batchById[batchIds[0]] : null;
const savedKey = saved ? airtableText_(airtableField_(saved, 'Review Batch Key')) : '';
row.reviewBatchKey = savedKey || 'UNBATCHED_' + (row.validationId || recordId);
```

Client call path:

```text
reloadBatches()
  -> getPendingReviewBatches(...)
  -> getPendingReviewBatchesFromAirtable(...)
```

This disproved the original stale-deployment hypothesis for these blocks.

### Server-side execution verification

`testGetPendingReviewBatchesFromAirtable` was executed in Apps Script.

Verified result:

- `totalGroups: 83`
- `savedBatchCount: 3`
- `unbatchedGroupCount: 80`
- `totalTicketCount: 83`
- `duplicateBatchKeys: 0`
- `groupsMissingSourceFileUrl: 0`

The deployed server-side loader sees all three saved Review Batches correctly.

The live overview still displayed the records as unbatched in a private/incognito browser window. Therefore the remaining display contradiction is downstream of the verified server-side payload, likely in client rendering or state interpretation. No fix was made because the user chose to move toward weekly batch rollup instead of spending more time on the current display mismatch.

## Weekly Review Batch decision

The user defined a broader batch-management direction:

- persisted Review Batches are real operational objects, not temporary visual groups.
- tickets must eventually be able to be batched, unbatched, rebatched, moved to a new batch, removed from a batch, or moved between batches.
- every batch should keep its main batch information visible.
- ticket rows inside a batch should be collapsible or expandable with a toggle.

Immediate rollup rule:

- use the printed Ticket Date.
- weeks run Monday through Sunday.
- timezone is always `America/Chicago`.
- existing saved Review Batch assignments stay intact.
- only currently unbatched Validation Queue records are candidates for the weekly rollup.
- if no usable date is available, use the final day of the inferred week rather than creating a separate missing-date workflow for this batch.

Proposed stable key format:

```text
WEEK_YYYY-MM-DD_TO_YYYY-MM-DD
```

## Ticket-date source finding

The authoritative Airtable date fields were blank before review:

- `Tickets -> Ticket Date` blank on all 83 Tickets.
- `Validation Queue -> Final Ticket Date` blank on all 83 Validation Queue records.
- `Parser Outputs -> Parsed Ticket Date` blank.
- `OCR Outputs -> Extracted Ticket Date` blank.

The review app currently reconstructs the displayed date candidate from Raw OCR Text through its runtime OCR-date candidate logic.

This means the weekly inventory is based on the same OCR-derived date candidates currently shown by the review app, not on already-persisted date fields.

## Temporary diagnostic helper added

A temporary read-only helper was added to the end of `AirtableReadAdapter.gs` in the Apps Script editor:

```text
testWeeklyReviewBatchInventory
```

Supporting helper:

```text
weeklyReviewBatchKey_
```

The helper:

- calls `getPendingReviewBatchesFromAirtable()`.
- skips records already linked to saved Review Batches.
- normalizes the displayed ticket-date candidate.
- calculates Monday-through-Sunday keys in `America/Chicago`.
- logs proposed weekly counts and missing or invalid dates.
- writes nothing to Airtable.

No Apps Script version or deployment was created after adding this helper.

## Verified weekly inventory

Initial dry-run result for the 80 unbatched records:

| Proposed week | Count |
|---|---:|
| `WEEK_2026-06-22_TO_2026-06-28` | 1 |
| `WEEK_2026-06-29_TO_2026-07-05` | 14 |
| `WEEK_2026-07-06_TO_2026-07-12` | 23 |
| `WEEK_2026-07-13_TO_2026-07-19` | 15 |
| `WEEK_2026-07-20_TO_2026-07-26` | 26 |
| `WEEK_DATE_MISSING` | 1 |

Total unbatched records: 80.

### Missing-date record resolved

The only missing-date record was:

- Validation Queue record ID: `rec3iuWAcxaR38Y1G`
- Validation ID: `VAL_INTAKE_MOTIVE_1034044490_1034044490`

Based on its sequence and the user's explicit fallback rule, `Validation Queue -> Final Ticket Date` was set to:

```text
2026-07-19
```

This places it in:

```text
WEEK_2026-07-13_TO_2026-07-19
```

Expected final weekly counts:

| Proposed week | Count |
|---|---:|
| `WEEK_2026-06-22_TO_2026-06-28` | 1 |
| `WEEK_2026-06-29_TO_2026-07-05` | 14 |
| `WEEK_2026-07-06_TO_2026-07-12` | 23 |
| `WEEK_2026-07-13_TO_2026-07-19` | 16 |
| `WEEK_2026-07-20_TO_2026-07-26` | 26 |

Total: 80. Missing date: 0.

The diagnostic was not rerun after the one-record date write, so these final counts are mathematically expected from the verified initial output plus the verified date update, not yet a second logged test result.

## What was changed

- The temporary read-only weekly inventory helper was added to Apps Script source in the editor.
- One live Validation Queue record, `rec3iuWAcxaR38Y1G`, had `Final Ticket Date` set to `2026-07-19` under the user's explicit fallback rule.
- This checkpoint build log was updated.

## What was not changed

- No weekly Review Batch records were created.
- No Validation Queue records were linked to weekly Review Batches.
- The three existing saved Review Batch assignments were not changed.
- No Apps Script version was created.
- No Apps Script deployment was changed.
- No Make scenario was changed during the review-app and weekly-rollup investigation.
- No Make schedule was activated.
- No Airtable schema was changed.
- No records were deleted.
- Google Sheets was not restored as the final architecture.

## Guardrails

- Stay in chat unless explicitly asked to switch to Work.
- Work one exact step at a time.
- Diagnose before changing anything.
- Airtable is the operational source of truth.
- Do not restore Google Sheets as the final architecture.
- Do not modify Make unless explicitly requested and justified.
- Keep Scenario E at one-record scope unless explicitly approved otherwise.
- Do not activate schedules.
- Show the exact proposed action or diff before modifying Apps Script source, deployments, or live Airtable data.
- Preserve the three existing saved Review Batch assignments.
- Do not silently overwrite linked-record arrays.
- Do not claim a deployment, commit, test, or live-data change unless verified.

## Smallest correct next step

Rerun `testWeeklyReviewBatchInventory` once to verify:

- `totalUnbatched = 80`
- no missing or invalid dates
- final counts of `1, 14, 23, 16, 26`

Then prepare, but do not execute, the exact idempotent weekly batch write plan. The plan must show:

1. the five Review Batch records to create or reuse by stable weekly key.
2. the exact Validation Queue record IDs assigned to each week.
3. preservation of all existing linked-record IDs when updating a batch.
4. reciprocal Validation Queue links or the Airtable linked-record behavior relied upon.
5. readback verification after every create/update group.
6. safe rerun behavior that does not duplicate batches or overwrite existing assignments.
7. no movement of the three records already assigned to saved Review Batches.

Do not perform the weekly batch writes until the exact plan and write payloads are shown and explicitly approved.
