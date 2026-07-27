# Diane 2.0 Review Workflow and Scan Preview Checkpoint

Date: 2026-07-26

## Purpose

This checkpoint records the current live Diane 2.0 review-page state after the manual batching workflow, ticket-detail workflow, removal controls, detail-page compaction, and scan-preview interaction work.

## Operating rules

- Stay in chat unless Ernie explicitly asks to switch to Work.
- Work one step at a time.
- Do not redesign Diane broadly.
- Do not add broad automation.
- Diagnose before changing anything.
- Airtable is the operational source of truth.
- Do not restore Google Sheets.
- Do not modify Make unless explicitly requested.
- Show the exact proposed action or diff before modifying live code or data.

## Source locations

Diane project/build-log repository:

```text
/Users/erniehathaway/Projects/diane
```

Build logs:

```text
docs/build-logs/
```

Apps Script source checkout:

```text
/Users/erniehathaway/Documents/PRNG/Work/diane-apps-script
```

Apps Script repository:

```text
punkrocknerdgirl/diane-apps-script
```

## Current Apps Script state

Apps Script project ID:

```text
1kX8RuUiYcKmXExMDg4zhOm-E-rDHMw08JPqegWiBB36sUN0XZSnsJbAZ
```

Existing Diane deployment ID:

```text
AKfycbzzjkCqwsiCO7vahT1BJn6S4fArwA5dTtsoVEmEz9c05i8P9RTprUOtZ0OKvp2prfc
```

Current live version:

```text
88
```

Version 88 description:

```text
Require click before scan zoom
```

The Apps Script checkout remains uncommitted and contains the accumulated review-app work. Do not discard, reset, or overwrite the existing working tree.

## Live review workflow completed

The following behavior is live:

- Airtable manual review batching.
- Airtable field-ID reads using `returnFieldsByFieldId=true`.
- Ticket-detail Save Draft writes only the current Validation Queue record.
- Ticket-detail Save Draft no longer mutates the local batch object.
- Blank Airtable date and numeric values clear with `null`.
- Rate is visible in the ticket form.
- The old editable Batch Fields panel is removed.
- Ticket Count and In Review are displayed in the ticket summary area.
- Back to Overview remains available in the ticket action area.
- Apply Shared Fields to All Tickets is available in the ticket action area.
- Remove Ticket from Batch is available in the ticket action area.
- Remove selected from batch is available from the overview selection dropdown.

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

It does not copy or alter:

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

Removing a ticket changes only batching membership/protection fields:

```text
Review Batches = []
Assignment Source = Unassigned
Batch Lock = true
```

Removal preserves all ticket-entered values, Reviewer Notes, Review Status, Do Not Bill, processing state, and linked Ticket, Parser Output, and OCR Output records.

Removal rejects approved, processed, or nonmember records before any update occurs. Multi-record operations preflight the full selection before writing.

## Verified technical behavior

- Airtable update helper chunks writes in groups of 10.
- Save Draft isolation checks passed.
- Shared-copy exact ten-field payload checks passed.
- Blank date and numeric clearing checks passed.
- Removal three-field payload checks passed.
- Mixed-selection preflight produced zero updates.
- Eleven-record update chunking passed as `[10, 1]`.
- No Ticket, Parser Output, or OCR Output writes occur in Save Draft, shared copy, or removal actions.
- Duplicate client-function checks passed during implementation.

## Current scan-preview issue

Version 88 added a click-to-enable overlay over the embedded Google Drive preview iframe.

Observed live behavior:

- The overlay makes the preview appear gray until clicked.
- Clicking activates the iframe and reveals the scan.
- Clicking outside disables interaction and the gray overlay returns.

Ernie changed the desired behavior:

- Do not allow mouse-wheel or trackpad zoom at all.
- Keep the scan visible at all times.
- Remove click-to-enable behavior.
- Use only the embedded Google Drive `+` and `-` buttons for zoom.
- Preserve rotation, reset rotation, replacement scan, Open Scan Review Window, and Open Scan in New Tab.

## Current blocker

A fully transparent shield over the entire cross-origin Google Drive iframe would block the embedded `+` and `-` buttons along with the image area.

Work could not inspect the deployed preview toolbar because enterprise browser policy blocked access.

No follow-up scan-preview source change has been applied after Version 88.

## Exact next step

1. Open a ticket in the live review page.
2. Activate the Google Drive preview so the embedded `+` and `-` controls are visible.
3. Capture a screenshot showing the full preview area and toolbar controls.
4. Use that screenshot to determine whether a stable image-only shield can block mouse interaction while leaving the embedded zoom controls clickable.
5. Show the exact smallest HTML/CSS/JavaScript diff before applying anything.

Do not guess toolbar bounds or apply a full-frame shield.

## Do not redo

- Do not rebuild Save Draft isolation.
- Do not restore the old editable Batch Fields panel.
- Do not remove Truck from shared fields.
- Do not recreate remove-from-batch logic.
- Do not change the established Airtable field-ID mappings.
- Do not add Airtable approval or batch-close behavior as part of the scan-preview fix.
- Do not restore Google Sheets.
- Do not modify Make.

## Checkpoint convention

When Ernie says `checkpoint` or `new chat`:

1. Actually update the Diane build log in the GitHub repository.
2. Commit and push that documentation update.
3. Paste the complete restart text into chat.
4. Stop unless Ernie asks for something else.

Do not merely suggest a build-log entry for Ernie to copy manually.
