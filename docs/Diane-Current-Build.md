# Diane Current Build Doc

_Last updated: 2026-07-14_

## Purpose

Diane is the trucking ticket-to-invoice pipeline. Her job is to take messy scale tickets and move them through intake, OCR, validation, broker-specific rules, and invoice packet generation without turning the operator into a crispy little invoice goblin.

## Current build boundary

### Diane 1.1 fallback

The current production fallback is the existing Google Sheets Diane workflow. When the Airtable build is not ready, weekly tickets should still be run through the existing Diane Google Sheets path so invoices can be completed on time.

### Diane 2.0 direction

Diane 2.0 moves the working relational data layer from Google Sheets into Airtable. Airtable should become the structured system of record for batches, tickets, broker rules, validation status, invoice runs, OCR jobs, and QA/errors.

Google Drive and Motive still hold source documents. Airtable holds the operational data and relationships. Make moves records and files between systems.

## Non-negotiable first step

Before Diane runs, weekly tickets need to be split into individual image files and uploaded to Motive. Motive is the front door for ticket images in the operational workflow.

Basic flow:

1. Receive weekly ticket PDF.
2. Split PDF into one image per ticket.
3. Upload those images to Motive.
4. Run Diane.
5. Use the existing Google Sheets workflow as fallback until Airtable is fully operational.

## Current known Make scenario map

This is the known Diane 1.1 scenario chain from the rebuild notes:

1. `01 Motive Scale Ticket Import`
2. `02 Stage Uploads`
3. `03 Preserve Original Uploads`
4. `04 Add Ready Files to OCR Queue`
5. `05 OCR Workflow`
6. `06 Document AI Ticket Extractor`
7. `07 PARSER_OUTPUT to VALIDATION`
8. `08 D1.0 Backfill Review File URLs`
9. `09 VALIDATION to TICKETS_CLEAN`
10. `10 Generate Broker Invoice`

Known status: scenario 10 was started but not fully completed/tested in the prior rebuild notes.

## Airtable pivot target

Airtable should replace the messy spreadsheet-as-database layer, not the full workflow.

### Core tables

- `Batches`
- `Tickets`
- `Brokers`
- `Broker Rules`
- `Materials`
- `Trucks`
- `Drivers`
- `OCR Jobs`
- `Invoice Runs`
- `Documents`
- `QA / Errors`

### Minimum Ticket fields for v1

- Ticket number
- Ticket date
- Source file / document link
- Motive upload status
- Broker / customer
- Job / destination
- Product / material
- Truck
- Driver
- Gross weight
- Tare weight
- Net weight
- Tons
- PO
- Order / dispatch number
- Validation status
- Validation notes
- Invoice run link
- OCR confidence / extraction notes

### Suggested ticket statuses

- `New`
- `Uploaded to Motive`
- `OCR Pending`
- `Needs Review`
- `Validated`
- `Ready to Invoice`
- `Invoiced`
- `Blocked`

## OCR next obstacle

### Document AI bridge status (2026-07-14)

The missing old Document AI bridge was not found in the recovered `diane-tools-api` Cloud Run artifact. That artifact is the separate TNB PDF/image stamping service at `https://diane-tools-api-baxx73vdnq-uc.a.run.app` (revision `diane-tools-api-00030-stl`). Its source and endpoints are documented in [`docs/build-logs/build-log.md`](build-logs/build-log.md).

The existing Google Document AI custom extractor remains enabled, so Diane now has a separate bridge service: `diane-ticket-extractor`, at `https://diane-ticket-extractor-413667913571.us-central1.run.app`, revision `diane-ticket-extractor-00002-vzn`. The service accepts a source PDF/image, calls the existing processor, and returns dynamic entity values plus confidence data for Make to write into Airtable `Parser Outputs`.

The intended v2 path is:

```text
Tickets.Source File ID
  -> Scenario 05 OCR
  -> OCR Outputs / OCR Runs
  -> Scenario 06
  -> diane-ticket-extractor /extract/ticket
  -> Parser Outputs
```

The current service requires an `X-Diane-API-Key` header. The key is not documented here or committed to GitHub. The next validation is one real ticket through extraction, followed by precise Scenario 06 mappings based on the processor's observed entity names.

After the Airtable conversion and Make scenario updates, OCR quality becomes the next dragon in the hallway.

Known OCR pain points:

- Faded thermal ticket text
- Crooked/rotated images
- Mixed vendor ticket layouts
- Tiny weights/tons fields
- Field labels that shift by ticket vendor
- Need for confidence scoring instead of silent guessing

Target OCR upgrade path:

1. Pre-process images before OCR: crop, deskew, improve contrast, normalize orientation.
2. Extract into a strict schema.
3. Validate extracted fields against Airtable reference tables.
4. Flag low-confidence fields for review.
5. Never silently guess values that drive invoices or driver pay.

## Repo rules

This repo is public. Keep client-private data out of GitHub.

Safe here:

- Build docs
- Workflow diagrams in text form
- Table schemas
- Make scenario maps
- Non-sensitive test schemas
- Generic runbooks

Not safe here:

- Live ticket images
- Client names/details beyond generic examples
- Broker contact emails
- API keys or tokens
- Invoices or source packets
- Private Drive/Motive links
