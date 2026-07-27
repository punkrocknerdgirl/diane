# Diane 2.0 Ticket Detail Layout and Refresh-State Checkpoint

**Date:** 2026-07-26

## Checkpoint purpose

This checkpoint captures the current Diane 2.0 review-page state immediately before the next Work session applies the approved ticket-detail compaction and refresh-state restoration changes.

## Repository and deployment state

- Repository: `/Users/erniehathaway/Projects/diane`
- GitHub: `https://github.com/punkrocknerdgirl/diane.git`
- Apps Script source: `/Users/erniehathaway/Projects/diane/apps-script`
- Branch: `main`
- Current committed baseline before this documentation commit: `ebb308fe7a6acb30f68a57ec7f512273c805f9c4`
- Current live Apps Script deployment: Version 95
- Live deployment ID: `AKfycbzzjkCqwsiCO7vahT1BJn6S4fArwA5dTtsoVEmEz9c05i8P9RTprUOtZ0OKvp2prfc`
- HEAD test deployment ID: `AKfycbz5Di8x3S2mmosx7mzprFge11p-EYv_LCxZq_9M5kM`
- Apps Script project ID: `1kX8RuUiYcKmXExMDg4zhOm-E-rDHMw08JPqegWiBB36sUN0XZSnsJbAZ`

The local repository is expected to have uncommitted Apps Script source changes. Do not assume it is clean.

## Current uncommitted source state

The approved ticket-detail action-layout change has been applied locally to:

`apps-script/Index.html`

Verified changes:

- removed the old ticket summary panel
- removed Pay from ticket detail
- removed Ticket Count from ticket detail
- moved Status beside Remove Ticket from Batch
- moved Save as Draft beside Save and Approve
- preserved `summaryStatus`
- preserved `saveButton`
- preserved existing save and approval handlers

The HEAD `/dev` test page confirmed the new layout is rendering correctly.

The scan preview returned HTTP 403 only in an Incognito window because the Google account was not signed in. That is not a Diane defect.

No commit, push, Apps Script version, deployment update, Airtable write, or Make change has been made for this layout refinement.

## Current controlled-test batch

Safest identified two-ticket test batch:

- Review Batch key: `MANUAL_20260726_142002_e9f5b563`
- Review Batch record: `recyJZgAlYes5HQAj`
- Batch status: Draft

Ticket 1:

- Ticket Number: `0825536`
- Validation Queue record: `rec2NSd63jLIECVZa`

Ticket 2:

- Ticket Number: `1052089985`
- Validation Queue record: `rec0uwH3KaCPOqmHG`

Both records were verified as Pending Review, manually assigned, batch locked, unapproved, and unprocessed before any new live write.

No controlled Save Draft write has yet been performed in this continuation because the missing button placement exposed the layout issue first.

## Current review workflow contracts

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

Copied values must remain individually editable afterward.

### Remove from batch

Removing a ticket changes only:

- Review Batches = `[]`
- Batch Assignment Source = `Unassigned`
- Batch Lock = `true`

It preserves entered values, Reviewer Notes, Review Status, Do Not Bill, processing state, and linked Ticket, Parser Output, and OCR Output records.

Approved, processed, or nonmember records must be rejected before any write. Multi-record operations preflight the full selection before writing.

## Current verified review-page behavior

Live Version 95 already has:

- Ticket Date displayed as `YYYY-MM-DD`
- numeric edit Rate
- currency-formatted static Rate
- blank static Rate preserved as blank
- controlled Reviewer collaborator selector
- Ernie Hathaway collaborator ID `usroVCuQ6vu5oCeXW`
- blank Reviewer writes `null`
- Reviewer reloads correctly
- Final Total numeric zero preserved during unrelated saves
- click-to-enable scan preview behavior

Read-only reopening of previously saved draft tickets remains deferred.

## Newly confirmed navigation defect

Refreshing while viewing a ticket detail returns the user to the overview page.

The next approved source change will add narrow browser-local detail restoration using `sessionStorage` or an equivalent local mechanism.

Persist only:

- current batch identity
- current ticket identity
- whether the user was in detail view

Do not persist:

- unsaved form values
- scan state or rotation
- selection state
- Reviewer values
- approval state

Required behavior:

- opening a ticket stores batch and ticket identity
- a fresh successful batch load restores the same ticket if it still exists
- Back to Overview clears restore state
- a removed or missing ticket safely falls back to overview
- restoration runs only once per fresh batch-load cycle, not on every ordinary `renderBatches()` rerender

## Approved ticket-detail compaction

The next source change may narrowly:

- reduce `.form-grid` gap from 9px to 7px
- reduce input and textarea vertical padding from 7px to 6px
- reduce textarea minimum height from 42px to 36px
- reduce Reviewer row top spacing

Must preserve:

- two-column layout
- field order
- comfortable desktop font size
- prominent Ticket Number, Customer / Job, and Quantity
- readable full values
- usable Review Notes
- fully visible Reviewer
- Save as Draft beside Save and Approve

Do not redesign the page.

## Tonight's practical milestone

The immediate business goal is not to finish the automated invoicing pipeline.

The required milestone is:

`Review page -> correct final values in Airtable`

Once reviewed values reliably write back to Airtable and approved values correctly update linked Tickets, the cleaned ticket data can be exported to CSV, Excel, or Google Sheets for manual invoicing tonight.

The next proof point after the UI refinement is:

1. Save Draft isolation
2. shared-field copy contract
3. independent second-ticket edit
4. reload and persistence
5. remove-from-batch contract
6. approve one safe ticket
7. verify the linked Tickets record contains the correct invoicing fields

Do not run all 57 tickets until the controlled path passes.

## Mandatory next-session first step

Before changing anything:

1. Read this checkpoint.
2. Review newer or directly related build logs.
3. Inspect `/Users/erniehathaway/Projects/diane`.
4. Verify branch, commit, working tree, exact uncommitted diff, origin sync, Apps Script source, clasp target, highest Apps Script version, and deployment version.
5. Preserve the existing uncommitted ticket-detail action-layout change.
6. If local `main` is behind only by this documentation commit, do not pull until the uncommitted source state is safely accounted for. Show the exact safe sync action before performing it.

Do not modify Airtable, Make, Apps Script deployment, or production data until the current source state is fully verified.