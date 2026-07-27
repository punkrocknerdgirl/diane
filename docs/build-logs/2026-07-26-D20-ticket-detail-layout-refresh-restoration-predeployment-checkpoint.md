# Diane 2.0 Ticket Detail Layout and Refresh Restoration Predeployment Checkpoint

**Date:** 2026-07-26

## Checkpoint purpose

This checkpoint captures the verified state immediately before creating a new Apps Script version and updating the existing live Diane deployment.

## Repository state

- Repository: `/Users/erniehathaway/Projects/diane`
- GitHub: `https://github.com/punkrocknerdgirl/diane.git`
- Apps Script source: `/Users/erniehathaway/Projects/diane/apps-script`
- Branch: `main`
- Current source commit: `b0b6a69c5a2a5c0e31e0486c2ab2bfae326fb1f3`
- Commit message: `Fix ticket detail layout and restore refresh state`
- Local `main` matched `origin/main`
- Working tree was clean

Only these three Apps Script files were included in the source commit:

- `apps-script/Index.html`
- `apps-script/JavaScript.html`
- `apps-script/Stylesheet.html`

No Airtable or Make changes occurred.

## Current Apps Script deployment state

- Apps Script project ID: `1kX8RuUiYcKmXExMDg4zhOm-E-rDHMw08JPqegWiBB36sUN0XZSnsJbAZ`
- Existing live deployment ID: `AKfycbzzjkCqwsiCO7vahT1BJn6S4fArwA5dTtsoVEmEz9c05i8P9RTprUOtZ0OKvp2prfc`
- Last verified live deployment version: **95**
- No new Apps Script version has been created for commit `b0b6a69...`
- No live deployment update has been performed for commit `b0b6a69...`

The Apps Script live-state lookup was unavailable during the commit verification because of a network resolution failure. No version or deployment command was executed, so the last verified live state remains Version 95.

## Verified ticket-detail layout changes

The previous full-width summary panel above the scan and form columns has been removed.

The ticket detail page now has:

- no full-width Status / Pay / Ticket Count / Save as Draft header
- Status beside the ticket action controls
- Save as Draft beside Save and Approve
- Pay removed from ticket detail
- Ticket Count removed from ticket detail
- `summaryStatus` preserved exactly once
- `saveButton` preserved exactly once
- existing save and approval handlers preserved

The two-column scan and ticket-field layout remains intact.

## Verified refresh restoration behavior

The Apps Script HEAD `/dev` page was tested successfully after `clasp push`.

Verified behavior:

1. Open a ticket detail.
2. Refresh the browser.
3. The same ticket detail reopens.
4. Click Back to Overview.
5. Open ticket detail again.
6. Refresh again.
7. The ticket detail remains open.

The restore logic persists only:

- current batch identity
- current ticket identity
- detail-view state

It does not persist:

- unsaved form values
- Reviewer values
- scan state or rotation
- selection state
- approval state

Back to Overview clears the restore state.

## Source verification completed

Before commit, the following checks passed:

- JavaScript syntax
- Apps Script syntax
- duplicate-function checks
- duplicate-ID checks
- HTML structure
- CSS structure
- `git diff --check`
- `clasp status`

No unintended Airtable, save, approval, batching, or scan logic changes were detected.

## Current review workflow state

The controlled two-ticket test batch remains:

- Review Batch key: `MANUAL_20260726_142002_e9f5b563`
- Review Batch record: `recyJZgAlYes5HQAj`
- Status: Draft

Ticket 1:

- Ticket Number: `0825536`
- Validation Queue record: `rec2NSd63jLIECVZa`

Ticket 2:

- Ticket Number: `1052089985`
- Validation Queue record: `rec0uwH3KaCPOqmHG`

A Save Draft isolation write was performed on ticket `0825536` using Reviewer Notes:

`CONTROLLED TEST — draft isolation`

The broader shared-field copy and remove-from-batch live tests have not yet been completed.

## Existing review workflow contracts

### Shared-field copy

Apply Shared Fields to All Tickets may copy only:

- Broker
- Customer / Job
- PO Number
- Work Order / Order
- Origin
- Destination
- Truck
- Driver
- Material
- Rate

It must not copy or alter:

- Ticket Number
- Ticket Date
- Quantity
- Line Total
- Reviewer Notes
- scan information
- Review Status
- Reviewer
- Approved At
- Do Not Bill
- Processed to Tickets
- Processed At

Copied values must remain independently editable afterward.

### Remove from batch

Removing a ticket changes only:

- Review Batches = `[]`
- Batch Assignment Source = `Unassigned`
- Batch Lock = `true`

Removal preserves all entered values, Reviewer Notes, Review Status, Do Not Bill, processing state, and linked Ticket, Parser Output, and OCR Output records.

Approved, processed, or nonmember records must be rejected before any write. Multi-record operations must preflight the full selection before writing.

## Next authorized step

Create exactly one new Apps Script version from the current source and update the existing live deployment ID to that version.

Required deployment guardrails:

- verify branch, commit, working tree, origin sync, and clasp project first
- do not modify source
- do not create a second deployment
- update only the existing deployment ID
- do not modify Airtable or Make
- verify the new version number and unchanged deployment ID
- verify Git remains clean

After deployment, test the live `/exec` page for:

- no full-width ticket summary header
- Status in the ticket action area
- Save as Draft beside Save and Approve
- ticket-detail refresh restoration
- Back to Overview clearing restoration state

Do not resume the shared-field copy or remove-from-batch test until the live `/exec` verification passes.
