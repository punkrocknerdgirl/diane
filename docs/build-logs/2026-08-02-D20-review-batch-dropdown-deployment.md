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

---

## Late-session checkpoint: batching model redesign

**Checkpoint time:** 2026-08-02 22:11 Central

### Additional source commits completed

- `c5741f8f8e9a9fe13bbcd4ea80d2aa01e804d584`
  - Changed `apps-script/Code.gs` so a stored numeric zero no longer blocks the quantity × rate fallback used for review line totals.
  - No deployment or Apps Script version was created as part of that commit.

- `8bd6694cf41f1b19c480166efba287049110439d`
  - Added `getBatchDisplayLabel()` in `apps-script/JavaScript.html`.
  - Changed weekly batch display labels to `Week Ending YYYY-MM-DD` in the existing-batch dropdown and overview header.
  - No Airtable, Make, batch-key, server-side, deployment, or Apps Script version changes were made as part of that commit.

### Deployment status requiring re-verification

- The existing deployment was confirmed at version `98` before preparing a newer version.
- A new version description was proposed: `Readable weekly batch labels and zero-total fallback`.
- This checkpoint does not confirm that the new Apps Script version was created or that the deployment was updated. Re-verify before claiming either action occurred.

### Live testing observations

- A controlled ticket was successfully removed from a batch and returned to an unassigned state.
- A direct move from one existing batch to another can still produce an error.
- That cross-batch move error is currently non-blocking because ticket review can continue, but it remains an unresolved workflow defect.

### New ticket-detail UI request

The ticket detail screen should use the same four controls at both the top and bottom:

1. Previous Ticket
2. Save as Draft
3. Save and Approve
4. Next Ticket

This has not been implemented yet.

### Batch identity decision reset

The `Week Ending YYYY-MM-DD` label is not an acceptable permanent batch identity.

Reasoning:

- Jobs may continue across multiple weeks.
- Weekly grouping was useful only for seeing what was sitting in the review queue.
- Most invoice batching is expected to be manual, especially early in production use.
- The batch dropdown and overview need a stable, obvious business identity for each open invoice batch.

Do not assume that a weekly date should define membership or naming.

### Core lifecycle requirement

Once a ticket has been invoiced:

- it must be removed from every open batch;
- it must not remain selectable for another open batch;
- it must not appear as available for future open-batch assignment.

The final design must explicitly define how this is enforced and verified.

### Next planning task

Before changing UI, Airtable schema, Make, or server-side batching logic, inventory and compare all reasonable batch grouping candidates.

Do not recommend or implement a final model until the options are presented and Ernie selects the direction.

---

## Invoice batching model checkpoint

**Checkpoint time:** 2026-08-02 23:04 Central

### Rollback boundary

Ernie created freeze copies of the working Airtable database and Make modules before redesign work began. These are the known-good fallback path for producing a band-aided invoice if the redesign must stop. Do not alter or overwrite the freeze copies. The current system works well enough to get an invoice out and remains the rip cord.

### Architectural decision

The `Invoice Batches` record is the permanent business record from review through closure. Do not maintain a separate permanent Review Batch identity.

The permanent Invoice Batch links to both:

- `Validation Queue` records while review is in progress
- final `Tickets` used for invoicing and history

The existing `Review Batches` table and current review plumbing must not be removed or changed until a controlled migration path is designed, approved, and tested.

### Naming conventions

Keep the existing Airtable field name `Batch Key` to avoid breaking Make, Apps Script, formulas, or API mappings. The UI may display `Batch ID` without renaming the Airtable field.

Permanent internal batch identity:

```text
D20-Batch-YYMMDD-##
```

Rules:

- `YYMMDD` is based on Invoice Date.
- The two-digit sequence is always present.
- The first batch for an Invoice Date is `-01`, even when only one batch exists.
- Example for August 2, 2026: `D20-Batch-260802-01`.

Customer-facing Invoice Number:

```text
BrokerCodeYYMMDD-##
```

Rules:

- Uses the same date and sequence as Batch Key.
- Uses Broker Code instead of the Diane prefix.
- Example for Statewide Materials: `ST260802-01`.
- Batch Key and Invoice Number remain separate fields because they serve different internal and customer-facing purposes.
- Both should be autogenerated, not manually typed.

### Batch membership rules

- One Invoice Batch may contain multiple Dispatches.
- One Invoice Batch may contain only one Broker.
- Every linked Dispatch and Ticket must match the batch Broker.
- Broker is the hard batch boundary.
- Tickets may be added, removed, moved, or re-added freely before invoicing.
- A ticket may belong to only one active batch at a time.
- A direct move between existing batches currently can error; do not diagnose that defect yet, but the final design must support safe cross-batch moves.
- Once a ticket is invoiced, it must be removed from every open batch, must not remain selectable, and must not be available for future open-batch assignment.
- Flexible before invoicing; locked after invoicing.

### Billing period rules

- `Period Start` is required and always Monday.
- `Period End` is required and always the paired Sunday.
- The billing period is not calculated from the first or last Ticket Date.
- A week can begin Monday even when the first haul occurred Tuesday.
- `Ticket Date` remains ticket-level and must populate some visible value in the overview and ticket screen.

### Batch status lifecycle

Use these exact status labels:

```text
Open -> Approved -> Ready -> Invoiced -> Closed
```

- `Open`: batch is being assembled or reviewed.
- `Approved`: review is complete.
- `Ready`: final invoice preparation is complete.
- `Invoiced`: the invoice has been created.
- `Closed`: no further work remains.

Do not maintain separate `Ready to Send?` or `Send Status` fields in the active model.

### Batch-level fields to keep

- `Batch Key`
- `Invoice Number`
- `Invoice Date`
- `Batch Status`
- `Broker`
- `Dispatches`
- `Customer / Job`
- `Period Start`
- `Period End`
- `Reviewer`
- `Approved At`
- `Notes`
- `Tickets`
- `Validation Queue`
- `Created At`

Additional rules:

- `Reviewer` is intentionally simple and low-friction because Ernie is the only reviewer for now.
- `Approved At` is an automatic approval timestamp and does not affect batching.
- `Created At` is an automatic creation timestamp.
- `Customer / Job` remains batch-level.
- `Dispatches` is a batch-level linked-record field and may contain multiple Dispatches.

### Calculated fields

These are calculated from linked Tickets, not manually entered:

- `Ticket Count`
- `Total Quantity`
- `Invoice Total`

### Ticket-level only

These fields do not determine batch membership and should remain ticket-level:

- `PO Number`
- `Work Order / Order`
- `Origin`
- `Destination`
- `Truck`
- `Driver`
- `Rate`
- `Do Not Bill`
- `Ticket Date`

Truck-based invoice splitting remains a manual end-of-invoicing step for now. It is ugly but functional and may become a later automation layer. Driver follows the same treatment as Truck.

### Fields to retire from the active Invoice Batch model

- `Driver / Truck`
- `Ready to Send?`
- `Send Status`
- `Send To`
- `CC`
- `Source / Migration Notes`

`Send To` and `CC` belong only in Broker configuration.

Do not rename or delete existing fields yet. Retirement means excluded from the target model until dependencies are inspected.

### Explicitly skipped fields

- `Created By`
- `Closed At`

These are not needed for the current workflow.

### Known non-blocking issues and later requests

- Direct existing-batch-to-existing-batch moves can still error.
- Do not diagnose that error yet.
- Ticket detail should eventually have the same controls at top and bottom: Previous Ticket, Save as Draft, Save and Approve, Next Ticket.
- Do not implement that UI request yet.
- Ticket Date extraction/display still needs repair so some Ticket Date value appears in the overview and ticket screen.

### What was not changed during this planning session

- No Airtable schema changes.
- No Airtable record changes.
- No Make changes.
- No Apps Script source changes.
- No deployment or Apps Script version changes.
- No live batch or ticket changes.
- No application implementation was performed.

### Guardrails for implementation planning

- Stay in chat until Work is genuinely required; return to chat after Work is complete.
- Work one exact step at a time.
- Diagnose and inspect dependencies before changing anything.
- Preserve the freeze copies as the known-good fallback.
- Do not alter the current working system merely to make the redesign cleaner.
- Show exact proposed schema, code, mapping, or data changes before applying them.
- Use short field names whenever safely possible, but do not rename dependency-sensitive existing fields for cosmetics.
- Do not remove current Review Batch plumbing until the replacement path is proven with a controlled test.

### Smallest correct next step

Compare the approved target model against the live `Invoice Batches`, `Review Batches`, `Validation Queue`, `Tickets`, `Dispatches`, and Broker configuration schemas. Produce the smallest proposed migration plan with:

1. fields already present and reusable;
2. fields that must be added, including exact Airtable field types;
3. fields to leave in place but stop using;
4. fields that might be retired only after dependency inspection;
5. required links between Invoice Batches, Validation Queue, Tickets, Dispatches, and Broker;
6. dependency risks in Make and Apps Script;
7. a controlled one-batch migration and rollback test.

Do not modify Airtable, Make, Apps Script, deployments, records, or GitHub source while producing that comparison. Present the exact proposed plan for approval first.
