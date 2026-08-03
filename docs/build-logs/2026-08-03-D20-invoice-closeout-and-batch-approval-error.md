# Diane 2.0 Checkpoint: Invoice Closeout and Batch Approval Error

**Date:** 2026-08-03

## Starting checkpoint

- Prior build log: `docs/build-logs/2026-08-02-D20-review-batch-dropdown-deployment.md`
- Prior checkpoint commit: `59975a86264aa70ac8f5857e7dc78a521c4fb954`

## Production ticket-date sort

The overview page previously rendered each `batch.rows` array in Airtable receive order.

Approved local change in `apps-script/AirtableReadAdapter.gs`:

```javascript
const rows = batches[batchKey].rows;
rows.sort(function(a, b) {
  const aDate = String(a.ticketDate || '');
  const bDate = String(b.ticketDate || '');
  if (!aDate) return bDate ? 1 : 0;
  if (!bDate) return -1;
  return aDate.localeCompare(bDate);
});
const status = airtableText_(f['Batch Status']);
```

Behavior:

- earliest ticket date first
- missing dates last
- equal-date tickets retain relative order

Airtable inspection confirmed the relevant ticket dates are stored as ISO `YYYY-MM-DD`, so lexical sorting is chronologically correct.

### Deployment

- Apps Script version: **100**
- Existing production deployment updated to version 100
- Deployment description: **Ticket-date sort approved deployment**
- Git commit/push for the source change: **not performed during this session**

### Live verification

Verified the lower 11-ticket Ash Grove batch, not the similar 4-ticket group:

`ST · Ash Grove · MD017660 · 41432144 · Cemex - Blum, TX · Ash Grove - Midlothian, TX · 12`

Live order:

- `2026-06-29` × 2
- `2026-06-30` × 3
- `2026-07-01` × 3
- `2026-07-02` × 3

Confirmed:

- Visible tickets: **11**
- Invoice Total: **$2,978.64**

## Airtable lifecycle inspection

Read-only inspection of the live **Diane 2.0** base found:

- `Invoice Batches` contains **0 records**.
- `Review Batches` contains **14 records**, all still `Draft`.
- `Tickets` contains **83 records**, all still `Needs Review`.
- Several Review Batch stored ticket counts are stale after manual record movement.
  - `WEEK_2026-06-29_TO_2026-07-05`: stored count 14, currently linked 11.
  - `WEEK_2026-07-13_TO_2026-07-19`: stored count 16, currently linked 4.
- Review Batch business fields and totals are not consistently stored; the application calculates much of the overview dynamically from Validation Queue records.
- The intended permanent invoice closeout has not yet been performed.

No Airtable records or schema were changed.

## Intended closeout direction

The agreed direction is to preserve `Invoice Batches` as the permanent business record from invoicing through closure.

Proposed lifecycle, not yet implemented:

1. Final reviewed values are written to Tickets.
2. Create one Invoice Batch per actual invoice.
3. Link the invoiced Tickets to that Invoice Batch.
4. Record invoice number, invoice date, date period, ticket count, quantity, total, customer/job, broker, truck/driver, and send status.
5. Mark the Invoice Batch invoiced/closed only after metadata and totals are verified.
6. Mark the related Review Batch complete.
7. Mark related Tickets invoiced.

Historical conversion should be tested on one known invoice before expanding.

## Current blocker: Approve Batch error

The user attempted to approve manual Review Batch:

`MANUAL_20260802_170550_e02c141f`

The UI displayed:

```text
Batch approval failed: Error: No Source Validation IDs found for batch: MANUAL_20260802_170550_e02c141f
```

The batch is linked to four Validation Queue records, each with a populated `Validation ID`:

- `VAL_INTAKE_MOTIVE_1024750548_1024750548`
- `VAL_INTAKE_MOTIVE_1024750548_1024750550`
- `VAL_INTAKE_MOTIVE_1034044815_1034044815`
- `VAL_INTAKE_MOTIVE_1024750843_1024750845`

Therefore, the Airtable data is not missing the IDs. The defect is in the application approval path or adapter mapping. The likely issue is a property-name mismatch between the row object returned by `getPendingReviewBatchesFromAirtable()` and the property expected by the batch approval function.

## Next exact step

Inspect only:

1. Locate the function that throws `No Source Validation IDs found for batch`.
2. Identify the exact property it reads from each batch row.
3. Compare that property with the row object produced by `getPendingReviewBatchesFromAirtable()` in `AirtableReadAdapter.gs`.
4. Show the smallest exact proposed code change.

Do not modify Airtable, Make, Apps Script, deployments, source, or data until the exact proposed change is shown and explicitly approved.

## Guardrails

- Stay in chat until Work is genuinely required.
- Work one exact step at a time.
- Diagnose before changing anything.
- Do not modify Airtable schema, Airtable records, Make, Apps Script, deployments, or source without explicit approval.
- Do not select or use the similar 4-ticket Ash Grove group when validating the 11-ticket invoice.
- Freeze copies of the prior working Airtable database and Make modules remain the known-good fallback and must not be modified.
