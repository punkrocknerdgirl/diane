# Diane Build Log

## 2026-08-01 — Make Scenarios A–E production-override inspection and restoration checkpoint

### Scope

Completed inspection of the temporary test overrides in Make Scenarios A through E and recorded the restoration state before any Diane data reset or rerun.

### Restoration state

- **Scenario A — Get Motive Tickets:** No restoration items flagged.
- **Scenario B — Clean Ticket Images:** No test-value restoration items flagged. Existing changes were treated as production logic.
- **Scenario C — OCR Workflow:** No restoration items flagged.
- **Scenario D — Document AI Extractor**
  - Airtable **[12] Search Records**: synthetic `Ticket Key` targeting condition was removed.
  - The Airtable [12] limit remains **1** unless the pre-test Make blueprint or version history proves that a different production limit was in effect.
- **Scenario E — Build Review Batches**
  - Airtable **[2] Search Validation Queue**: synthetic `RECORD_ID()` targeting condition was removed.
  - The Airtable [2] limit was restored from **1** to **3**.
- **Legacy exclusion:** `OLD VALIDATION` to `TICKETS_CLEAN` is legacy and excluded from the current production-restoration scope.

The user reports that all flagged changes have been made. This checkpoint records the reported source/configuration state; it is not a live verification result.

### Not yet performed

- No live end-to-end verification run.
- No Airtable deletion.
- No Motive cursor reset.
- No reimport or rerun of the July 1–August 1 batch.

### Reset guardrails for the next task

The next reset must be **data-only**:

- Do not delete or alter schema, fields, views, formulas, Make scenario configuration, Cloud Run configuration, or other reference/configuration data.
- Inventory exact record counts and classify configuration/reference tables separately from transactional data before any deletion.
- Determine and document dependency-safe deletion order and exact record scope before deletion.
- Obtain explicit approval immediately before any destructive action.
- Keep all schedules off during the reset and test.
- Do not make Cloud Run changes.

### Next planned workflow

1. Inventory Airtable counts and record relationships.
2. Classify configuration/reference tables versus transactional tables.
3. Define and review dependency-safe deletion order and exact keep/delete sets.
4. Reset data to the pre-Scenario-A state after explicit approval.
5. Rerun Motive for **2026-07-01 through 2026-08-01** and verify each stage with readbacks.

## 2026-08-08 — Diane 2.0 review-form redesign / Version 114 checkpoint

### Purpose

Record the completed Version 114 review-form redesign deployment and establish the exact next task for the approval workflow.

### Current verified state

- **Deployment:** Review-form redesign deployed as **Apps Script Version 114**.
- **Live verification:** The Version 114 deployment was verified live during the current session.
- **Scope boundary:** No Airtable, Make, OCR, or parser changes were made or included in this work.
- **Application logic:** This checkpoint changes documentation only; no application logic is modified here.

### Post-deployment findings

The review-form redesign is live and the deployment verification passed. The remaining workflow question is the behavior and wiring of the **Approve Batch** button. The button workflow has not yet been accepted as verified, so it is the next diagnostic/fix task.

### Approve Batch contract

For the current Diane architecture, **Approve Batch** means:

> The reviewer has edited, reviewed, and validated the batch data; it is usable and ready to move to the next invoicing process.

It does **not** mean generating an invoice, writing broker-specific invoice output, sending an invoice, or changing the Google Sheets invoicing process.

### Desired approval behavior

When the reviewer clicks **Approve Batch**:

1. The approved batch leaves the active review queue.
2. It appears in **Previous Batches**.
3. Its tickets roll up into one expandable/collapsible batch line item.
4. **Previous Batches** displays the most recent approved batches first.
5. Expanding the batch preserves access to the ticket data.

### Next task

Diagnose and then verify or fix the **Approve Batch** button workflow, one step at a time. Begin by locating the UI handler and server-side status/update path, then verify the smallest acceptance flow:

1. Load a batch.
2. Edit one field.
3. Save.
4. Click **Approve Batch**.
5. Confirm it leaves active review.
6. Confirm it appears first in **Previous Batches**.
7. Expand it and confirm ticket data remains intact.

### Guardrails

- Stay in chat and work one step at a time.
- Diagnose before changing anything.
- Preserve existing architecture and proven behavior.
- Do not modify Airtable, Make, OCR, parser, Cloud Run, or invoice-generation behavior unless explicitly requested.
- Do not infer live state from source-control state; distinguish proposed, committed, pushed, deployed, and live-verified facts.
- Do not claim approval behavior is verified until the live acceptance flow is directly confirmed.
- Preserve the current Google Sheets final-invoice boundary; calculated invoice values must remain spreadsheet formulas rather than hardcoded derived values.
