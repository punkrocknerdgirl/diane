# Diane 2.0 Review Workflow, Repository, and Live-Test Checkpoint

**Date:** 2026-07-26

## Current source of truth

Diane now uses one primary repository for documentation and Apps Script source.

- Local repository: `/Users/erniehathaway/Projects/diane`
- GitHub repository: `https://github.com/punkrocknerdgirl/diane.git`
- Apps Script source: `/Users/erniehathaway/Projects/diane/apps-script`
- Branch: `main`
- Verified commit before this documentation update: `53127ca7a9a00659a9c3d3665b70a102bfddc34b`
- Working tree was clean and local `main` matched `origin/main`

The former standalone Apps Script repository history was imported beneath `apps-script/` without squashing. No nested `apps-script/.git` directory exists.

The old standalone Apps Script checkout remains untouched as a temporary safety copy:

`/Users/erniehathaway/Documents/PRNG/Work/diane-apps-script`

Recovery snapshots remain at:

`/Users/erniehathaway/Projects/diane-migration-backup-2026-07-26`

Do not delete the old checkout or recovery directory yet.

## Current Apps Script deployment

- Apps Script project ID: `1kX8RuUiYcKmXExMDg4zhOm-E-rDHMw08JPqegWiBB36sUN0XZSnsJbAZ`
- Existing deployment ID: `AKfycbzzjkCqwsiCO7vahT1BJn6S4fArwA5dTtsoVEmEz9c05i8P9RTprUOtZ0OKvp2prfc`
- Current live deployment version: **95**

No deployment change occurred during the final source commit and push.

## Review workflow already live

The following behavior is already live and must not be rebuilt:

- Airtable manual review batching
- Airtable field-ID reads using `returnFieldsByFieldId=true`
- Save Draft writes only the current Validation Queue record
- Blank Airtable dates and numeric values clear with `null`
- Rate is visible in the ticket form
- The old editable Batch Fields panel is removed
- Ticket Count appears in the ticket summary area
- Back to Overview appears in the ticket action area
- Apply Shared Fields to All Tickets appears in the ticket action area
- Remove Ticket from Batch appears in the ticket action area
- Remove selected from batch appears in the overview selection menu

## Shared-field copy contract

Apply Shared Fields to All Tickets copies only:

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

Copied shared values remain individually editable afterward.

## Remove-from-batch contract

Removing a ticket changes only:

- Review Batches = `[]`
- Assignment Source = `Unassigned`
- Batch Lock = `true`

Removal preserves:

- all ticket-entered values
- Reviewer Notes
- Review Status
- Do Not Bill
- processing state
- linked Ticket records
- linked Parser Output records
- linked OCR Output records

Removal rejects approved, processed, or nonmember records before any update occurs. Multi-record operations preflight the full selection before writing.

## Review form changes verified live

The following behavior is live and verified:

- Ticket Date uses a native date input and displays `YYYY-MM-DD`
- Edit-mode Rate remains an unformatted numeric value
- Static Rate displays as en-US currency
- Blank static Rate remains blank
- Reviewer helper instructions were removed
- Reviewer is a controlled selector with blank and Ernie Hathaway
- Reviewer saves to Airtable as a `singleCollaborator` value
- Ernie Hathaway collaborator ID: `usroVCuQ6vu5oCeXW`
- Blank Reviewer writes `null`
- Reviewer reloads correctly in edit and static views
- Compact summary row displays Status, Pay, Ticket Count, and Save as Draft
- Save as Draft is visible only in edit mode
- Scan-preview behavior remains unchanged from the existing click-to-enable implementation

Read-only reopening of previously saved draft tickets remains deferred because there is no reliable persisted draft-state marker.

## Reviewer collaborator live test

Ticket tested:

`1980051295`

Validation Queue record:

`recXRA8JTGRFLcOnq`

Verified:

- Reviewer saved as Ernie Hathaway without HTTP 422
- Raw Airtable collaborator ID matched `usroVCuQ6vu5oCeXW`
- Reviewer reloaded correctly in edit and static views
- Clearing Reviewer wrote `null`
- No Ticket, Parser Output, or OCR Output record changed
- No Review Status, approval, batch, billing, or processing field changed

## Final Total zero-preservation fix

A loader defect previously treated numeric Final Total `0` as blank because of falsy fallback logic.

For ticket `1980051295`:

- Final Quantity: `22.23`
- Final Rate: `13`
- Final Total: `0`

The old loader recalculated:

`22.23 × 13 = 288.99`

The loader now explicitly preserves `0` and any other saved numeric Final Total. Fallback calculation occurs only when Final Total is genuinely blank.

Live verification confirmed:

- Final Total `0` loaded as `0`
- Changing only Reviewer did not overwrite Final Total
- Clearing Reviewer did not overwrite Final Total
- Final Quantity remained `22.23`
- Final Rate remained `13`
- No collateral record writes occurred

## Current scan-preview decision

The click-to-enable scan-preview behavior remains unchanged.

An image-only iframe shield was rejected because the parent page cannot reliably measure the Google Drive document-image area inside the cross-origin iframe without risking blocked embedded zoom controls.

No scan-preview follow-up change is currently planned.

## Current verified source checks

The following checks passed before the current source commit:

- JavaScript syntax
- Apps Script syntax
- duplicate-function checks
- duplicate `saveButton` ID
- HTML structure
- CSS structure
- `git diff --check`
- `clasp status`

Clasp continues targeting the correct Apps Script project.

## Current source commit

The verified source changes were committed and pushed as:

`53127ca7a9a00659a9c3d3665b70a102bfddc34b Fix Reviewer collaborator save and preserve zero total`

At that point:

- Local `main` matched `origin/main`
- Working tree was clean
- Live deployment remained Version 95
- No new deployment or Apps Script version was created during the commit and push

## Next controlled test

The next review-workflow step is a controlled two-ticket live test covering:

1. Save Draft isolation
2. Apply Shared Fields to All Tickets
3. Verification that only the ten approved shared fields copy
4. Independent editing of one copied field
5. Reload and persistence verification
6. Removal of one ticket from the batch
7. Verification of the exact three-field removal contract

Guardrails:

- Do not approve tickets
- Do not process tickets
- Do not modify Make
- Do not restore Google Sheets
- Do not run the full production scope until the controlled test passes
