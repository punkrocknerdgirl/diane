# Diane 2.0: Final Total Formula Pre-Fix Checkpoint

**Date:** 2026-08-08  
**Purpose:** Preserve the exact state before correcting the Validation Queue `Final Total` architecture.

## Repository state

- Repository: `https://github.com/punkrocknerdgirl/diane.git`
- Checkout: `/Users/erniehathaway/Projects/diane`
- Branch: `main`
- Starting `HEAD` and local `origin/main`: `1a209ab151f8c86a8f883ed27a5aafe13295f6a7`
- The only tracked source change present before this checkpoint is an uncommitted local diff in `apps-script/AirtableReadAdapter.gs`.
- Unrelated untracked directories remain untouched: `diane-migration-backup-2026-07-26/`, `docs/Apps Script/`, `local-preview/`, and `skills/`.

## Universal Invoice Object direction

Approved Validation Queue records remain the invoice source of truth.

The broker-neutral Universal Invoice Data Object direction is:

```text
Approved Validation Queue records
        ↓
Universal Invoice Data Object
        ↓
Generic invoice output
        ↓
Broker-specific package rules
```

Confirmed contract decisions:

- Billing period is always Monday through Sunday.
- Normal processing target is Sunday night.
- Monday-morning catch-up uses the immediately previous Monday-through-Sunday period.
- Header fields appear once per invoice.
- Ticket images remain linked where they are for now; PDF assembly is deferred.
- Final invoice calculation cells must remain calculations/formulas, not hardcoded totals.

## Local-only source work completed

`apps-script/AirtableReadAdapter.gs` has an uncommitted local calculation-integrity diff.

It adds row-level fields:

- `expectedLineTotal`
- `totalVariance`
- `totalIntegrityStatus`

Supported statuses are:

- `MATCH`
- `MISMATCH`
- `UNVERIFIED`
- `CALCULATED_FALLBACK`

It also adds batch-level fields:

- `invoiceCalculationStatus` with `READY` or `BLOCKED`
- mismatch, unverified, and fallback counts
- `assertInvoiceCalculationIntegrity_(batch)`

The intended gate is that invoice generation must stop when any approved line has unresolved total integrity.

The local file passed a JavaScript syntax check and `git diff --check`. This source diff is not staged, committed, pushed, synced to Apps Script, versioned, deployed, or live-verified.

## Live Airtable findings and changes

The live Diane 2.0 base is `appMWvtLU0hMBqjLC`.

Validation Queue `Final Total` is currently a writable Currency field, not a Formula field. The review-app save path also explicitly writes a hardcoded payload value:

```javascript
fields[f.finalTotal] = number(payload.lineTotal, 'Final Total');
```

That architecture is the root issue. `Final Total` should be calculated from `Final Quantity × Final Rate`, not manually entered or written by the app.

Live inspection confirmed an approved record with:

- Validation ID: `VAL_INTAKE_MOTIVE_1026965469_1026965471`
- Final Quantity: `24.20`
- Final Rate: `$20.00`
- Original Final Total: `$0.00`
- Expected total: `$484.00`

With explicit approval, that one record's `Final Total` was manually changed from `$0.00` to `$484.00` and read back successfully. This was later recognized as the wrong architectural repair because the field should calculate automatically. No other record totals were changed.

A filter was applied to the shared Validation Queue Grid view:

- `Final Total = $0.00`
- `Review Status = Approved`

The live filtered view showed 16 records after the one manual repair. A browser-based bulk inspection timed out before those records could be classified. No additional ticket records were changed during those attempts.

## Correct architectural repair

Do not manually hardcode the remaining zero totals.

The intended repair is:

1. Convert Validation Queue `Final Total` to an Airtable Formula field using:

   ```text
   ROUND({Final Quantity} * {Final Rate}, 2)
   ```

2. Format the formula result as currency.
3. Remove the Apps Script write to `Final Total` from `saveAirtableTicketFields()`.
4. Inspect other Make, Apps Script, or API mappings that may write `Final Total`; do not change them without first showing the exact proposed change.
5. Verify live readback across approved records after the field conversion.
6. Confirm the formula automatically supersedes the one manually entered `$484.00` value.
7. Preserve the invoice-integrity comparison and blocking behavior as a validation layer, while ensuring it compares calculated values correctly after the formula conversion.

## Explicitly not completed

- `Final Total` has not been converted to a formula.
- The hardcoded Apps Script write has not been removed.
- No Make scenario has been inspected or changed for this formula repair.
- No Airtable schema change has been made.
- The 16 filtered zero-total records have not been manually updated.
- The local calculation-integrity source diff has not been committed or deployed.
- No new Apps Script version or deployment has been created.

## Guardrails

- Diagnose before changing anything.
- Show the exact Airtable formula/schema action before applying it.
- Show the exact source diff before removing any write path.
- Treat Airtable schema change, local source edit, commit/push, Apps Script sync, version creation, deployment, and live verification as separate approval gates.
- Do not change Make unless explicitly approved.
- Do not restore Google Sheets as the invoice architecture.
- Preserve unrelated local and untracked work.
- Do not manually hardcode invoice totals.

## Next step

Begin with a read-only dependency inspection for Validation Queue `Final Total`:

- confirm the current Airtable field type and field ID
- inventory every Apps Script and Make write into that field
- show the exact proposed Airtable formula conversion and exact source diff
- stop for approval before changing the schema or code

