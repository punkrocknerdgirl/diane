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

## Next step

Open and inspect Scenario 03 before running it. Confirm its Airtable source filter, parser mappings, linked-record mappings, duplicate prevention, Ticket status behavior, and any Validation Queue writes. Do not run Scenario 03 until the full configuration has been inspected.