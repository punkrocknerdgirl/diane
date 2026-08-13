# Diane 2.0: Final Total Formula Conversion and Invoice Integrity Checks

**Date:** 2026-08-13
**Repository:** `https://github.com/punkrocknerdgirl/diane.git`
**Branch:** `main`

## Purpose

Complete the Final Total architectural repair approved in the prior session:
convert `Final Total` from a writable Currency field to an Airtable formula field,
remove the hardcoded write from the review-app save path, and add row- and
batch-level invoice calculation integrity checks.

## Airtable changes (live)

### `Final Total` field — Validation Queue (`tblbiwkOS9LDi5yaV`)

- New formula field: `Final Total` (`fldLfatXbIkD7V17z`)
  - Formula updated from `{fldUuHnlZ9VJt4aYH} * {fldobFUj51MIScTeM}` to
    `ROUND({fldUuHnlZ9VJt4aYH} * {fldobFUj51MIScTeM}, 2)` via Airtable MCP.
  - References `Final Quantity` (`fldUuHnlZ9VJt4aYH`) × `Final Rate` (`fldobFUj51MIScTeM`).
  - Precision confirmed at 2 decimal places (the prior 0-decimal-place bug is fixed).
  - Verified calculating correctly on live records.

- Legacy field: `Final Total (Legacy)` (`fld5IN6BntCd4wDJM`)
  - Still present, type Currency, confirmed $0.00 on all visible rows (dead — not being written to).
  - Safe to delete per prior build log; deletion deferred to a future cleanup step.

## Source changes — `apps-script/AirtableReadAdapter.gs`

### 1. Field ID map updated

`DIANE_AIRTABLE_FIELD_IDS.validationQueue.finalTotal` corrected from the legacy
Currency field ID (`fld5IN6BntCd4wDJM`) to the live formula field ID
(`fldLfatXbIkD7V17z`).

### 2. Hardcoded Final Total write removed

Removed from `saveAirtableTicketFields()`:
```javascript
fields[f.finalTotal] = number(payload.lineTotal, 'Final Total');
```
The review app no longer writes `Final Total`. Airtable now owns the calculation.

### 3. `hasSavedFinalTotal` guard added in `mapAirtableValidation_()`

```javascript
const hasSavedFinalTotal = savedFinalTotal !== null && savedFinalTotal !== undefined && savedFinalTotal !== '';
const lineTotal = hasSavedFinalTotal
    ? savedFinalTotal
    : final('Line Total') || (ticket && airtableField_(ticket, 'Line Total')) || getReviewLineTotal_('', quantity, rate);
```

The fallback chain (Line Total → calculated) is preserved for records where the
formula yields null (e.g. blank Quantity or Rate).

### 4. Row-level invoice calculation integrity fields added

Added to each `rowObj` in `mapAirtableValidation_()`:

| Field | Type | Meaning |
|---|---|---|
| `hasSavedFinalTotal` | boolean | Whether Airtable returned a non-empty Final Total |
| `expectedLineTotal` | number\|null | `ROUND(quantity × rate, 2)` if both are valid numbers; null otherwise |
| `totalVariance` | number\|null | `savedFinalTotal − expectedLineTotal`; null when unverifiable |
| `totalIntegrityStatus` | string | See statuses below |

**`totalIntegrityStatus` values:**

| Status | Condition |
|---|---|
| `MATCH` | Airtable value equals calculated expected (variance = 0) |
| `MISMATCH` | Airtable value differs from calculated expected |
| `UNVERIFIED` | Airtable value present but quantity/rate unavailable to verify |
| `CALCULATED_FALLBACK` | No Airtable value — lineTotal derived from fallback chain |

### 5. Batch-level invoice calculation integrity added

Added to each batch in `getPendingReviewBatchesFromAirtable()`:

| Field | Type | Meaning |
|---|---|---|
| `totalIntegrity` | object | `{mismatchCount, unverifiedCount, calculatedFallbackCount}` |
| `invoiceCalculationStatus` | string | `READY` or `BLOCKED` |

`invoiceCalculationStatus` is `READY` only when `mismatchCount === 0` and
`calculatedFallbackCount === 0`. Unverified rows do not block (no qty/rate to
compare against). A `BLOCKED` batch must not proceed to invoice generation.

### 6. `assertInvoiceCalculationIntegrity_(batch)` added

Defined but **not yet wired into any call path**. Throws when a batch is not
`READY`. Wire in once the invoice-generation flow is built and approved.

```javascript
function assertInvoiceCalculationIntegrity_(batch) {
  if (!batch || !batch.totalIntegrity) throw new Error('Invoice calculation integrity data missing from batch.');
  if (batch.invoiceCalculationStatus !== 'READY') {
    var ti = batch.totalIntegrity;
    throw new Error(
      'Invoice calculation integrity check failed for batch ' + (batch.batchKey || '(unknown)') +
      '. Status: ' + batch.invoiceCalculationStatus +
      ' — Mismatches: ' + ti.mismatchCount +
      ', Unverified: ' + ti.unverifiedCount +
      ', Fallbacks: ' + ti.calculatedFallbackCount + '.'
    );
  }
}
```

## Verification

- JavaScript syntax check via `cp AirtableReadAdapter.gs /tmp/AirtableReadAdapter.js && node --check`: clean.
- `git diff --check`: clean.
- No remaining `fields[f.finalTotal]` write references in `apps-script/`.
- `assertInvoiceCalculationIntegrity_` defined once (in function body); no call sites.

## What was NOT changed

- No Apps Script sync, version creation, or deployment in this session.
  The `.gs` changes are committed to `main`; deploy via Apps Script UI as a
  separate approved step.
- `Final Total (Legacy)` (`fld5IN6BntCd4wDJM`) was not deleted.
- No Make scenarios inspected or modified.
- No Airtable records written.
- No invoice-generation logic wired in.

## Guardrails

- Diagnose before changing anything.
- Work one exact step at a time; the checkpoint run itself is the exception.
- Airtable remains the operational source of truth.
- Do not restore Google Sheets as the final architecture.
- Do not modify Make unless explicitly requested.
- Show the exact proposed action or diff before modifying source or live systems.
- Keep source edits, commits, pushes, Apps Script sync, version creation, deployment, and live verification as separate approval gates.
- Preserve unrelated untracked files.

## Next steps

1. **Apps Script deployment** — sync the updated `apps-script/` to Apps Script,
   create a new version, and update the deployment. Requires clasp login and
   explicit approval before sync.
2. **Live verification** — confirm the review app save path no longer writes
   `Final Total`, and that displayed totals match Airtable formula values.
3. **Delete legacy field** — remove `Final Total (Legacy)` (`fld5IN6BntCd4wDJM`)
   from the Validation Queue once the deployment is verified stable.
4. **Invoice generation Phase 1** — begin defining the Universal Invoice Data
   Object per the architecture checkpoint.
