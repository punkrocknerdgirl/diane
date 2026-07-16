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

## 2026-07-15: Scenario 03 — Document AI Ticket Extractor — COMPLETE

Scenario 03 is **COMPLETE**. The final production Make flow is:

```
[12] Airtable Search Records
    →
[4] Google Drive Download a File
    →
[5] HTTP POST to Cloud Run
    →
Airtable Create Record: Parser Outputs
    →
[14] Airtable Create Record: Validation Queue
    →
[16] Airtable Update Record: Tickets
```

Cloud Run endpoint:

`https://diane-ticket-extractor-413667913571.us-central1.run.app/extract/ticket`

### HTTP [5]

- **Method:** POST
- **Header:** `X-Diane-API-Key`
- **Body type:** `multipart/form-data`
- **file:** `[4] Data`
- **filename:** `[4] Name`
- **submission_id:** `[12] Ticket Key`
- **cleaned_file_id:** `[12] Source File ID`
- **Parse response:** Yes

### [12] Airtable Search Records

- **Table:** Tickets
- **Formula:**

```
AND(
  {Source File ID} != "",
  COUNTA({OCR Outputs}) > 0,
  COUNTA({Parser Outputs}) = 0
)
```

- **Production limit:** 75

### Parser Outputs mappings

- **Name:** `[5] submission_id`
- **Parser Run ID:** `[5] submission_id`
- **Ticket:** `[12] Airtable Record ID`
- **Parser Status:** `Needs Review`
- **Parsed Ticket Number:** `[5] ticket_number`
- **Parsed Ticket Date:** `[5] ticket_date`
- **Parsed Truck:** `[5] truck`
- **Parsed Material:** `[5] material`
- **Parsed Quantity:** `[5] quantity_tons`

### Validation Queue mappings

- **Validation ID:** `VAL_` + `[5] submission_id`
- **Parser Output:** Airtable Record ID from the Parser Outputs Create Record module
- **Ticket:** `[12] Airtable Record ID`
- **Review Status:** `Pending Review`
- **Final Ticket Number:** `[5] ticket_number`
- **Final Ticket Date:** `[5] ticket_date`
- **Final Truck:** `[5] truck`
- **Final Material:** `[5] material`
- **Final Quantity:** `[5] quantity_tons`
- **Final Driver, Final Broker, Final Rate, Final Total, Reviewer Notes, Approved At:** blank

### [16] Ticket update

- **Record ID:** `[12] Airtable Record ID`
- **Ticket Status:** `Needs Review`

### Validation completed

- single-record Parser Outputs test passed
- Validation Queue link test passed
- duplicate gate confirmed
- 5-bundle batch passed
- final 4-bundle remaining backlog run passed
- Tickets correctly updated to `Needs Review`
- no duplicate Parser Outputs created

**Overall status:** Scenario 03 is complete and the production backlog run is validated. Scenario 05 remains in migration validation; scheduling stays disabled until that path is verified module by module.


## 2026-07-15: Human Review Layer / Airtable — COMPLETE

The Airtable human review layer was built and tested successfully. Review remains batch-based: shared values are entered once on a Review Batch, then applied to its linked Validation Queue records before approved values are eventually processed downstream to Tickets.

### Review Batches table

Created the new **Review Batches** table to support batch-based human review before approved values are written to Tickets.

Key fields:

- Review Batch Key
- Batch Status
- Validation Queue link
- Broker
- Customer / Job
- PO Number
- Work Order / Order
- Origin
- Destination
- Truck
- Driver
- Rate
- Batch Notes
- Reviewer
- Approved At
- Ticket Count
- Total Quantity
- Invoice Total
- Apply Batch Fields
- Do Not Bill

### Validation Queue schema additions

Added:

- Final Customer / Job
- Final PO Number
- Final Work Order / Order
- Final Origin
- Final Destination
- Reviewer
- Do Not Bill
- Processed to Tickets
- Processed At

### Airtable automation: Apply Review Batch Fields

Built and enabled the Airtable automation **Apply Review Batch Fields**.

**Trigger:** When a Review Batches record matches `Apply Batch Fields` is checked.

**Action:** Run a script.

Behavior:

- reads the Review Batch
- reads all linked Validation Queue records
- copies shared batch values into each linked validation record
- maps Broker → Final Broker
- maps Customer / Job → Final Customer / Job
- maps PO Number → Final PO Number
- maps Work Order / Order → Final Work Order / Order
- maps Origin → Final Origin
- maps Destination → Final Destination
- maps Truck → Final Truck
- maps Driver → Final Driver
- maps Rate → Final Rate
- updates up to 50 records per batch operation
- unchecks `Apply Batch Fields` after completion
- sets `Batch Status` to `In Review`
- outputs `updatedCount`

### Test result

Tested successfully with temporary batch `TEST_APPLY_BATCH_FIELDS_20260715`.

The linked Validation Queue record received:

- **Final Customer / Job:** Automation Test Job
- **Final PO Number:** TEST-PO
- **Final Work Order / Order:** TEST-WO
- **Final Origin:** Automation Test Origin
- **Final Destination:** Automation Test Destination
- **Final Rate:** 1.00

Broker, Truck, and Driver remained blank because the test batch did not contain values for those fields. The automation was renamed **Apply Review Batch Fields** and is **ON**.

### Current next step

Build the Airtable interface **Diane Ticket Review** with this behavior:

- open a Review Batch
- edit shared batch fields at the top
- view linked Validation Queue tickets below
- open individual tickets for ticket-level corrections
- use Apply Batch Fields from the interface
- later add batch approval logic and downstream approved Validation Queue → Tickets processing

### Architecture notes

- Old Apps Script review behavior is being migrated into Airtable.
- Review remains batch-based.
- Invoice Batches remain separate and downstream from Review Batches.
- Scenario 03 already creates Parser Outputs and Validation Queue records, so old Scenario 07 is not being rebuilt separately.
- The future downstream automation replaces old Scenario 09 VALIDATION → TICKETS_CLEAN.

**Overall status:** Scenario 03 remains complete. The Airtable human review layer is built and tested; the next build item is the Diane Ticket Review interface, followed by batch approval and downstream approved Validation Queue → Tickets processing.
