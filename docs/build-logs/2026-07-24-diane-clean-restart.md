# 2026-07-24: Diane 2.0 Clean Restart and Scenario Validation

## Working rules

- Airtable remains the operational source of truth.
- Google Sheets is not part of the final Diane 2.0 architecture.
- Make scenarios are validated one at a time.
- This log will be updated after each Make scenario completes cleanly.
- No client-private ticket images, credentials, restricted URLs, or sensitive source data belong in this public repository.

## Airtable reset

Before the reset:

- A manual Airtable snapshot was taken.
- The full Diane 2.0 base was duplicated as an archive.

Cleared operational records from:

- Tickets
- Import Runs
- OCR Runs
- OCR Outputs
- Parser Outputs
- Validation Queue
- Review Batches
- Invoice Batches

Preserved configuration tables:

- Brokers
- Drivers
- Trucks
- Materials
- Aliases

The base schema, fields, views, interfaces, and automations were preserved.

## Fresh Import Run

Created one planned Import Run for the clean restart:

- Import Run Key: `MOTIVE_LIVE_RESTART_20260701`
- Source System: `Motive`
- Import Disposition: `Live Work`
- Run Status: `Planned`
- Pull From: `2026-07-01 00:00:00 America/Chicago`
- Pulled At: blank before the run

## Scenario 01: Ingest Motive Tickets

**Status: PASSED**

Scenario flow confirmed:

```text
[26] Search Import Runs
    -> [32] Capture run start time
    -> [33] Router
        Route 1:
        [1] List Motive Documents
            -> [15] Iterator Over Attachments
            -> [27] Search Existing Tickets
            -> [7] Download Attachment
            -> [8] Upload to Drive
            -> [30] Create Ticket Record

        Route 2:
        [31] Update Import Run
```

Verified configuration:

- `[26] Search Import Runs` selects a planned Motive / Live Work Import Run.
- `[1] List Motive Documents` maps `created_after` from `[26] Pull From`.
- `[32] Capture run start time` sets `run_start_time = now`.
- `[31] Update Import Run` writes `run_start_time` to `Pulled At`.

Clean-run result:

- Make returned 57 bundles through the ticket creation path.
- Airtable contains 57 new Ticket records.
- All 57 records have Ticket Status `Intake`.
- All 57 records have Source System `Motive`.
- All 57 records have Import Disposition `Live Work`.
- All 57 records link to `MOTIVE_LIVE_RESTART_20260701`.
- Unique Import Keys and Drive file IDs were populated.

No Scenario 01 repair is required before continuing.

## Scenario 02: OCR Workflow

**Status: PASSED**

Pre-run inspection:

- The Airtable search module targets Tickets with a Source File ID, Ticket Status `Intake`, and no linked OCR Run.
- The production search limit remains 75.
- The Google Drive download module maps the Ticket `Source File ID` from the Airtable search result.
- The existing `Has Source File ID` filter remains as a harmless second guardrail.
- Image files and PDF/TIFF files route through separate Google Cloud Vision OCR branches.
- Both branches create an `OCR Runs` record and an `OCR Outputs` record.
- OCR Run records link to the correct Ticket.
- OCR Output records link to the correct OCR Run and Ticket.
- No Google Sheets modules or stale Google Sheets mappings were found.
- Scenario 02 does not update Ticket Status; Tickets correctly remain `Intake` until a later scenario performs the next workflow transition.

Clean-run result:

- Make returned 57 bundles.
- Airtable contains 57 OCR Run records.
- All 57 OCR Runs have provider `Google Cloud Vision`.
- All 57 OCR Runs have status `Complete`.
- All 57 OCR Runs have a completion timestamp, processing file URL, linked Ticket, and linked OCR Output.
- No OCR Run error messages were populated.
- Airtable contains 57 OCR Output records.
- All 57 OCR Outputs contain raw OCR text.
- All 57 OCR Outputs link to one OCR Run and the correct Ticket.
- No duplicate OCR Run IDs or OCR Output IDs were observed.

No Scenario 02 repair is required before continuing.

## Scenario 03: Document AI Ticket Extraction

**Status: PASSED**

Pre-run inspection:

- The Airtable search module targets Tickets with a Source File ID, at least one linked OCR Output, and no linked Parser Output.
- The production search limit remains 75.
- Duplicate prevention is provided by `COUNTA({Parser Outputs}) = 0`.
- The Google Drive download module maps the Ticket `Source File ID`.
- The Document AI bridge receives the source file, Ticket Key as `submission_id`, and Source File ID as `cleaned_file_id`.
- Scenario 03 reparses the source file; Raw OCR Text is a completion gate rather than the parser input.
- Parser Outputs map ticket number, truck, material, and quantity from the Document AI response.
- Driver fields intentionally remain blank. Truck remains the review and batching anchor, and the linked Truck Default Driver logic handles the later editable driver suggestion.
- Validation Queue records are created with status `Pending Review` and linked to the Parser Output and Ticket.
- Tickets are updated from `Intake` to `Needs Review`.
- No Google Sheets modules or stale Google Sheets mappings were found.

Repair applied before the run:

- Added the missing direct `Parser Outputs -> OCR Output` linked-record mapping using the Ticket's existing linked OCR Output record ID.
- No other mappings, schema, or live records were changed before the run.

Clean-run result:

- Make processed 57 records through every module without errors.
- Airtable contains 57 Parser Output records.
- All 57 Parser Outputs have status `Needs Review`.
- All 57 Parser Outputs link to exactly one Ticket, one OCR Output, and one Validation Queue record.
- All 57 Parser Run IDs are unique.
- Parsed truck, material, and quantity values were populated where returned by Document AI.
- Parsed ticket numbers were populated for 56 of 57 records; one record remains blank for human review.
- Parsed quantities were populated for 55 of 57 records; two records remain blank for human review.
- Parsed Driver remains blank on all records by design.
- Airtable contains 57 Validation Queue records.
- All 57 Validation Queue records have status `Pending Review` and link to the correct Parser Output and Ticket.
- All 57 Tickets now have status `Needs Review` and link to one OCR Output, one Parser Output, and one Validation Queue record.
- No duplicate Parser Outputs or Validation Queue records were observed.

The parser produced several imperfect truck strings and one malformed ticket number. These are expected review-stage extraction results, not scenario execution failures. Scenario 03 correctly routes them to `Needs Review` / `Pending Review` rather than writing them into final Ticket fields.

No further Scenario 03 repair is required before continuing.

## Scenario 04: Build Review Batches

**Status: IN PROGRESS**

Current scenario state:

- Scenario 04 currently contains one Airtable Search Records module.
- The module searches `Validation Queue` for records where `Review Status = Pending Review` and `Review Batches` is empty.
- Records are sorted by Validation ID ascending.
- The production search limit is 75.
- A Run once test returned 57 bundles, matching the 57 clean-restart Validation Queue records.
- No modules currently create Review Batch records or link Validation Queue records to them.

Review-page behavior confirmed:

- The Apps Script review page still supports saved Review Batch records and shared batch fields.
- When a Validation Queue record has no linked Review Batch, the Airtable adapter generates a temporary display-only key in the form `UNBATCHED_<Validation ID>`.
- This fallback explains why earlier review-page testing could display tickets without saved Review Batch records.
- The fallback does not create Review Batch records or links in Airtable.

Documentation and archive review:

- No completed Scenario 04 implementation or production Review Batch Key formula was found in the GitHub documentation.
- The archived Airtable base contained only one manual automation-test Review Batch, which did not establish a production grouping pattern.
- The existing Broker records contain older broker-specific grouping flags, but those rules are being superseded by the simplified truck-based invoice and review workflow below.

Approved batching direction:

- Use one Review Batch per Broker + Truck for all brokers.
- Stable Review Batch Key format: `<Broker Code>_<Truck Code>`.
- Examples: `TNB_W01`, `ST_W02`, `NR_W03`.
- Driver is not part of batch identity.
- Customer / Job, PO Number, Work Order / Order, Origin, Destination, Driver, and Rate remain reviewable values but do not split the Review Batch.
- This aligns Review Batches with the intended downstream rule of one invoice per truck.
- Brokers that accept combined submissions can still have truck-specific PDFs or invoices combined manually before sending.

Blank or unknown truck guardrail:

- Records without a confirmed truck must not be grouped together.
- Use a validation-specific safe key such as `<Broker Code>_UNASSIGNED_<Validation ID>`.
- This prevents unrelated unknown-truck records from being combined into one batch.

Manual assignment guardrails:

- Scenario 04 must respect `Batch Lock`.
- `Batch Assignment Source = Manual` must override automatic batching.
- `Batch Assignment Source = Unassigned` must override automatic batching.
- Automatic batching must not move, recreate, or overwrite manually controlled assignments.

Required Scenario 04 behavior:

1. Start from the existing eligible Validation Queue search.
2. Resolve the linked Ticket and the normalized Broker and Truck values needed for batching.
3. Build the stable Review Batch Key.
4. Search Review Batches for that exact key.
5. Create the Review Batch only when no matching record exists.
6. Link the Validation Queue record to the matching Review Batch.
7. Set `Batch Assignment Source` to `Automatic` for records assigned by the scenario.
8. Preserve locked, manual, and intentionally unassigned records.
9. Allow safe reruns without duplicate Review Batch records or duplicate assignments.

No Scenario 04 modules beyond the initial search have been added yet. No Airtable records, schema, Apps Script code, or deployment were changed during this investigation.

## Next step

Design the exact Scenario 04 Make module sequence and field mappings for the approved Broker + Truck batch identity. Show the complete proposed module sequence before modifying the live Make scenario. Then build, run, and verify Scenario 04 against all 57 Validation Queue records before moving to any later scenario.