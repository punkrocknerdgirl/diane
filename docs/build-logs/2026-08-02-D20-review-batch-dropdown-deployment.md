# Diane 2.0 Checkpoint: Review Batch Dropdown Deployment

**Date:** 2026-08-02

## Purpose

Record the completed review-app batch dropdown fix, source commits, Apps Script deployment state, live UI verification, guardrails, and the smallest correct next step.

## Current verified state

The Diane 2.0 Google Apps Script review app now has the updated batch assignment controls live.

Verified live UI:

- Batch action button text: `Confirm`
- Batch dropdown placeholder: `Add / Remove`
- Existing web-app deployment was updated in place.
- Deployment ID and live URL were preserved.
- No live review record was selected or modified during verification.

Google Apps Script deployment:

- Script ID: `1kX8RuUiYcKmXExMDg4zhOm-E-rDHMw08JPqegWiBB36sUN0XZSnsJbAZ`
- Deployment ID: `AKfycbzzjkCqwsiCO7vahT1BJn6S4fArwA5dTtsoVEmEz9c05i8P9RTprUOtZ0OKvp2prfc`
- Deployed Apps Script version: `98`

Git source state:

- Repository: `punkrocknerdgirl/diane`
- Branch: `main`
- Final UI-label commit: `9198a7ecfe29ba7745b4d6e83c8e4fa644cfe9fe`
- Earlier batch dropdown behavior commit after rebase: `c2babfc7d149d9ec763dfc340ba17a1d8b9b8cb7`

## Work completed

### Batch dropdown behavior

`apps-script/JavaScript.html` was changed so `getExistingManualBatches()` no longer requires a `MANUAL_` batch-key prefix.

Eligible destination batches now must:

- have `batchRecordId`
- have non-empty `rows`
- not have status code `APPROVED`
- not have status code `PROCESSED`
- not have status code `DO_NOT_BILL`
- not have status code `EMPTY`

The existing function name was preserved to avoid changing unrelated callers.

The dropdown placeholder was changed from:

```text
Add selected to batch...
```

to:

```text
Add / Remove
```

### Server-side restriction

`apps-script/AirtableReadAdapter.gs` no longer rejects a target Review Batch solely because its key does not begin with `MANUAL_`.

Only this restriction was removed:

```javascript
if (key.indexOf('MANUAL_') !== 0) throw new Error('Target Review Batch is not a manual batch.');
```

All surrounding protections and current add/remove behavior were left unchanged.

### Button label

`apps-script/Index.html` changed the batch action button label from:

```text
Add to Batch
```

to:

```text
Confirm
```

No button IDs, handlers, functions, variables, server methods, or batch logic were renamed.

## Verification completed

- The source diff was verified to contain only the approved batch-dropdown changes before commit.
- Only `apps-script/JavaScript.html` and `apps-script/AirtableReadAdapter.gs` were included in the batch behavior commit.
- Only `apps-script/Index.html` was included in the button-label commit.
- The commits were pushed to `origin/main`.
- The Apps Script deployment was updated in place to version `98`.
- The live UI displayed `Confirm` and `Add / Remove` as expected.
- No live records were selected or modified during visual verification.

## Important findings and decisions

- Old backup copies under `diane-migration-backup-2026-07-26/source-copy/` differ substantially from the tracked source and must not be treated as the active application source.
- The active tracked source is under `apps-script/` in `/Users/erniehathaway/Projects/diane`.
- Untracked directories observed during the work were intentionally excluded:
  - `diane-migration-backup-2026-07-26/`
  - `docs/Apps Script/`
- The existing Apps Script project and deployment were reused. No new project or parallel live deployment was created.
- The live deployment URL, deployment ID, permissions, and execution settings were preserved.

## What was not changed

- No Airtable schema changes.
- No Airtable record changes.
- No Make scenario changes.
- No Scenario A, B, C, D, or E run was performed as part of this fix.
- No unrelated application source was changed.
- No backup directories were added, staged, cleaned, moved, or modified.

## Guardrails

- Stay in chat unless Ernie explicitly asks to switch to Work.
- Work one exact step at a time.
- Diagnose before changing anything.
- Airtable remains the operational source of truth.
- Do not restore Google Sheets as the final architecture.
- Do not modify Make unless explicitly requested.
- Show the exact proposed action or diff before modifying live code or data.
- Do not claim a deployment, commit, test, or live-data change unless verified.
- Do not touch the old migration backup or other untracked directories.
- Do not change Apps Script deployment identity, URL, permissions, or execution settings without explicit approval.

## Unresolved item

The UI has been visually verified, but the actual add/remove behavior has not yet been tested against a controlled live review record after deployment.

## Smallest correct next step

Perform one controlled live functional test in the Diane review app:

1. Identify one safe Validation Queue record and its current Review Batch.
2. Identify one eligible destination Review Batch that is not approved, processed, do-not-bill, or empty.
3. Record the starting Airtable links before changing anything.
4. Use the live UI to add or move the selected record with the `Add / Remove` dropdown and `Confirm` button.
5. Verify Airtable links and UI state after the action.
6. If removal is part of the test, return the record to its original state and verify the final links.

Do not choose or modify a live record until the exact test record, destination batch, expected result, and rollback path have been inspected and approved.