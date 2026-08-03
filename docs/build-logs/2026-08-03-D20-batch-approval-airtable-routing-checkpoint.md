# Diane 2.0: Airtable Batch Approval Routing Checkpoint

Date: 2026-08-03

## Goal

Resolve the live Diane Ticket Review batch approval failure for Airtable-backed manual review batches.

Current live error:

```text
Batch approval failed: Error: No Source Validation IDs found for batch: MANUAL_20260803_000153_c32486e5
```

## Repository

- Repository: `punkrocknerdgirl/diane`
- Branch: `main`
- GitHub main already contains the approved `sourceValidationIds` property in `apps-script/AirtableReadAdapter.gs`.
- Previous known GitHub main commit before this checkpoint: `1568725552b6b555d3116c3fbc1ee5fc292a4b63`

## Live Apps Script project

- Script ID: `1kX8RuUiYcKmXExMDg4zhOm-E-rDHMw08JPqegWiBB36sUN0XZSnsJbAZ`
- Established production deployment ID: `AKfycbzzjkCqwsiCO7vahT1BJn6S4fArwA5dTtsoVEmEz9c05i8P9RTprUOtZ0OKvp2prfc`
- Production deployment is now version `102`.
- Deployment URL remains unchanged.

## Work completed and verified

1. Confirmed the local `apps-script` directory is connected to the correct Apps Script project through `.clasp.json`.
2. Cloned the live Apps Script project into a temporary directory for inspection.
3. Found an accidental malformed fragment saved at the end of the live `AirtableReadAdapter` source:

   ```javascript
   batchTitle: buildBatchDisplayTitle_
   ```

4. Patched a temporary live clone only after explicit approval:
   - removed the accidental EOF fragment;
   - preserved the existing live `rows.sort(...)` logic;
   - added the approved property:

   ```javascript
   sourceValidationIds: rows
     .map(function(row) { return row.validationId; })
     .filter(Boolean)
     .join(';'),
   ```

5. Pushed the verified six-file temporary clone to Apps Script HEAD with `clasp push`.
6. Cloned the project again and confirmed the remote saved source exactly matched the verified temporary source.
7. Confirmed deployed version 101 did not contain the new property.
8. Created Apps Script version 102.
9. Updated the established production deployment to version 102.
10. Retested the target batch. Approval still failed with the same class of error, now for batch `MANUAL_20260803_000153_c32486e5`.

## Important result

The original approved property addition is live, but it does not solve the complete approval path.

The browser currently calls:

```javascript
approveBatch({
  batchKey: batchKey,
  reviewer: rev,
  rowNumbers: rowNumbers || []
});
```

The current server `approveBatch(payload)` implementation is Sheets-based:

- it expects Google Sheets row numbers;
- if row numbers are absent, it calls `getValidationIdsForBatch_(batchKey)` and converts validation IDs back into sheet rows;
- it reads and writes approval fields through `SpreadsheetApp`;
- the thrown error is produced by `getValidationIdsForBatch_()` when neither the review-batch lookup nor the validation-sheet fallback returns IDs.

Therefore, simply passing `sourceValidationIds` from the browser is not yet proven sufficient. Airtable-backed batch approval likely requires routing to an existing Airtable-specific approval function or implementing the missing Airtable approval path.

## Current diagnosis boundary

No further edit has been approved.

Before changing code, inspect:

1. The beginning and full routing logic of `approveBatch(payload)` in `apps-script/Code.gs`.
2. All existing Apps Script functions that approve Airtable validation records or update Airtable approval fields.
3. The Airtable field IDs and helper functions already used by single-ticket approval.
4. Whether an Airtable batch approval implementation already exists and merely lacks frontend/server routing.

## Exact next read-only inspection

```bash
cd /Users/erniehathaway/projects/diane

sed -n '640,710p' apps-script/Code.gs

printf '\n--- Airtable approval functions ---\n'
grep -RIn \
  --exclude-dir=.git \
  -E "approve.*Airtable|Airtable.*approve|approveAirtable|Reviewed At|Ready for TICKETS_CLEAN" \
  apps-script/*.gs
```

## Guardrails

- Work one exact step at a time.
- Diagnose before changing anything.
- Do not modify Airtable schema, Airtable records, Make, Apps Script source, versions, or deployments until the exact proposed change is shown and explicitly approved.
- Preserve the current sort behavior and all existing live behavior.
- Do not use the browser Apps Script editor for source edits. Use a controlled local or temporary clone, exact diff, and `clasp` verification.
- Do not create another Apps Script version or deployment until a new source change is approved, pushed, and verified.
- Do not retry batch approval repeatedly while diagnosing.
- The freeze copies of Airtable and Make remain protected rollback boundaries and must not be changed.

## Current production state

- Version 102 is live.
- The `sourceValidationIds` property is present in the live Airtable batch object.
- The accidental EOF fragment is removed.
- Existing live ticket-date sort behavior is preserved.
- Airtable batch approval remains broken.
- No Airtable or Make changes were made during this work session.
