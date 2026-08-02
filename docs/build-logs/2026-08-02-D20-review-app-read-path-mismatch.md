# Diane 2.0 Checkpoint: Scenario E Review-App Read-Path Mismatch

**Date:** 2026-08-02

## Purpose

Capture the verified state after Scenario D completed for the full live batch, Scenario E successfully created and linked Review Batches, and the remaining issue was isolated to the deployed review application's overview read/display path.

## Current verified live state

### Import run

- Import Run Key: `MOTIVE_LIVE_SCENARIO_A_20260802`
- Source: Motive
- Run Status: Completed
- Pull From: 2026-07-01 12:00 AM Central
- Linked live Tickets: 83

### Scenario D cleaning verification

Airtable was checked directly before moving into Scenario E.

All 83 linked Tickets have:

- `Clean Status = Cleaned`
- `Send Cleaned File to OCR = checked`
- `Cleaned File URL` populated
- `Cleaned File ID` populated
- `Cleaned At` populated
- no `Cleaning Error`

Scenario D is complete for the batch.

## Scenario E work completed

### Hardcoded one-record test value removed

Module `[2]` previously filtered on a specific hardcoded Validation ID:

```text
VAL_INTAKE_MOTIVE_1034044815_1034044815
```

That record no longer matched the full eligibility filter, so module `[2]` returned zero bundles and downstream module `[3]` received an empty linked Ticket value.

The hardcoded Validation ID condition was removed. The one-record safety scope remains through `Limit = 1`.

Current module `[2]` formula:

```text
AND(
  {Review Status} = "Pending Review",
  COUNTA({Review Batches}) = 0
)
```

### Review Batches table ID corrected

The existing-batch PATCH path previously used a transposed Review Batches table ID.

Wrong:

```text
tbl37gqQqfH1yd8Ww
```

Correct live Review Batches table ID:

```text
tbl37qgQqfH1yd8Ww
```

The module `[37]` URL prefix was corrected to:

```text
/v0/appMWvtLU0hMBqjLC/tbl37qgQqfH1yd8Ww/
```

### Existing-batch guard behavior verified

The existing-batch route was inspected during testing.

When its lookup returned no existing Review Batch, the route did not have a Review Batch record ID to append to the PATCH URL. The empty lookup prevented a valid PATCH. This behavior is now understood as the intended guard condition, not evidence that links were lost.

No fallback record ID was added. No `ifempty()` workaround was used to conceal a missing lookup result.

## Verified Airtable state after Scenario E

The live Airtable state is correct.

Review Batch links:

- Review Batch `recKXsjpDWNgaOXJP` links to Validation Queue record `rec5Gj7ZDdG9pMy4S`
- Review Batch `rec3i6FRsC4giJmBm` links to Validation Queue record `rec7CnGt1zjRWGIN5`
- Review Batch `recQwB4gf68jpZYfn` links to Validation Queue record `recyUCQOIrwfrfKbV`

For all three pairs:

- Review Batch status is `Draft`
- the reciprocal Validation Queue `Review Batches` link is populated
- Validation Queue `Review Status` is `Pending Review`

This proves Scenario E created the Review Batch records and persisted the links correctly.

## Current issue: deployed review-app display mismatch

The remaining contradiction is inside the review application, not Make and not Airtable.

### Manual batching path

The manual batching handler reads the Validation Queue `Review Batches` field by Airtable field ID.

It sees the existing assignment and correctly blocks rebatching.

### Overview path

The overview loader groups records through:

```text
getPendingReviewBatchesFromAirtable()
```

In the checkpoint source, this path should:

1. read each Validation Queue record's saved `Review Batches` links
2. resolve the linked Review Batch
3. assign the saved Review Batch key
4. create an `UNBATCHED_...` key only when no Review Batch link exists

The live records have valid Review Batch links, but the overview UI displays them as `UNBATCHED`.

### Conclusion

The deployed review application is not using the same effective read/display logic or source state as the manual batching path.

Most likely explanations to verify:

1. the live web app deployment is pinned to an older Apps Script version containing stale overview-loader logic
2. the deployed overview loader reads a mismatched field ID, table shape, or older implementation even though the manual batching handler is newer

This is a **deployed review-app read-path mismatch**.

Airtable and the manual-batching guard agree with each other. Only the overview grouping disagrees.

## Architectural decision

Freeze Make and Airtable for this issue.

Do not alter Scenario E, remove links, recreate Review Batches, or change Airtable records to make the UI agree. The stored state is already correct.

The next investigation belongs in the review-app source/deployment path.

## What was not changed

- No application source code was changed.
- No Apps Script version was created.
- No Apps Script deployment was changed.
- No Make schedule was activated.
- No Make scenario logic was changed after the verified corrections above.
- No Airtable schema was changed.
- No live Airtable record was manually edited or deleted.
- No Review Batch or Validation Queue link was removed or rebuilt.

## Guardrails

- Stay in chat unless explicitly asked to switch to Work.
- Work one exact step at a time.
- Diagnose before changing anything.
- Airtable is the operational source of truth.
- Do not restore Google Sheets as the final architecture.
- Do not modify Make for this issue unless new evidence proves Make is involved.
- Do not modify Airtable schema or live records for this issue.
- Do not deploy or create an Apps Script version without explicit approval.
- Show the exact proposed diff or deployment action before making a source or live deployment change.
- Do not claim a deployment, test, commit, or live-data change unless verified.

## Smallest correct next step

Identify the Apps Script deployment currently serving the live review-app URL and compare its deployed version/source against the repository implementation of:

```text
getPendingReviewBatchesFromAirtable()
```

First determine whether the live web app is pinned to an older version. Do not edit or deploy anything during this inspection.

Report:

- live review-app URL or deployment ID
- currently deployed Apps Script version number, if versioned
- deployment update time, if available
- the effective deployed implementation of `getPendingReviewBatchesFromAirtable()`
- whether it reads the current Validation Queue `Review Batches` field ID
- the exact difference from current repository source

Only after the mismatch is proven should a minimal proposed diff or deployment correction be prepared.
