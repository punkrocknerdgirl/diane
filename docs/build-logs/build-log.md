# Project Diane Build Log

## 2026-06-28: Scenario 10 Invoice Builder

Tonight was supposed to be a quick check of the Statewide Materials invoice flow. Instead, it became a repair-and-build session, which is usually how automation tells you where the real work lives.

We confirmed the weekly Statewide batch had **28 billable tickets** in `TICKETS_CLEAN`, split by driver:

- **DC:** 16 tickets
- **DS:** 12 tickets

The key rule stayed intact: **ticket dates belong to the tickets, not the invoice window.** The invoice period can cover the billing week, but every ticket keeps its real source date.

Scenario 10 already existed, but it was still a test skeleton. It searched old Statewide rows, set hardcoded invoice values, cleared a test invoice sheet, and stopped. It did not actually stage or generate invoice lines.

We finished the missing middle:

- created a new `INVOICE_LINES` staging tab in Diane 1.1
- updated Scenario 10 to stage weekly Statewide invoice lines there
- added a safety filter for `Status = Ready for Billing` and `Ready for Billing = Yes`
- ran Scenario 10 cleanly with all 28 expected rows
- split the final invoices by driver
- created separate invoice files outside Diane
- cleaned up the invoice formatting to match the existing Statewide layout

Final outputs:

- **Statewide Materials Invoice - DC - 2026-06-22 to 2026-06-28**
- **Statewide Materials Invoice - DS - 2026-06-22 to 2026-06-28**

Both invoices were reviewed, cleaned up, and sent to the broker.

The important design decision: **Diane stays the engine room. Final invoices should be separate files.** That keeps the automation workbook clean while still producing broker-ready documents that can be attached to QBO invoices and emailed for payment.

Next step: turn the final invoice builder into a repeatable flow that reads from `INVOICE_LINES`, splits by broker/driver, creates standalone invoice files, exports PDFs, and queues the broker delivery packet.

## 2026-07-13: Scenario 05 Airtable Migration - Corrected Checkpoint

Scenario 05 is a **migration, not a rebuild**. The existing OCR workflow is valuable and remains in place. The goal is to replace Google Sheets storage with Airtable while preserving the working downstream Make modules.

The original working sequence at the front of Scenario 05 was:

```
[1] Google Sheets Search Rows
        ↓
[5] Download Cleaned File
        ↓
[25] Route by File Type
        ├── Image → [21] OCR Image File
        └── PDF/TIFF → existing PDF OCR path
```

The intended migrated sequence is:

```
[43] Airtable Search Records (Tickets)
        ↓
[5] Download Cleaned File
        ↓
[25] Route by File Type
        ├── Image → [21] OCR Image File
        └── PDF/TIFF → existing PDF OCR path
```

### Debugging correction

`[43]` was originally created against the **Tickets** table, which was correct. During troubleshooting it was incorrectly changed to **OCR Runs**. OCR Runs currently contains three blank placeholder records, so Make returned only record IDs and created times. That change produced roughly 30 minutes of avoidable rework and was reversed.

`[5] Download Cleaned File` is still required. Replacing Google Sheets with Airtable does not remove the file-download step.

### Current status

- `[43]` is back on **Tickets**.
- `[43] → [5] → [25]` is the correct front-end sequence.
- The existing OCR branches remain unchanged.
- `[43]` has not yet been fully validated as a replacement for `[1]`.
- Next step: configure and test `[43]` against real Ticket records, verify its output, then inspect and test `[5]`.
- Scheduling remains disabled until the migrated path is verified module by module.
