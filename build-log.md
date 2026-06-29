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
