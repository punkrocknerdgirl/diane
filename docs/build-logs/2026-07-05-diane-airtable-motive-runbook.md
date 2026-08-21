# Diane Runbook: Motive First, Airtable Pivot

_Date: 2026-07-05_

## Tonight's operating plan

The goal is to keep invoices moving while building the better Diane architecture.

## Order of operations

### 1. Update build docs

Build docs live in GitHub now. The repo should hold the current source of truth for Diane architecture, schema notes, Make scenario maps, runbooks, and rebuild instructions.

### 2. Split ticket PDF into individual images

The weekly ticket PDF gets split into one image file per ticket.

Image naming pattern:

```text
01_<ticket-id>.jpg
02_<ticket-id>.jpg
03_<ticket-id>.jpg
```

Use ticket IDs when visible. Use a vendor prefix when the ticket number is not the same style as the main ticket sequence.

### 3. Upload image files to Motive

Motive upload is the first operational step before running Diane. Diane should not assume tickets exist downstream until Motive has the image/source record.

### 4. Run the existing Diane Google Sheets fallback

Until Airtable is fully converted and Make scenarios are updated, run the weekly tickets through the existing Diane Google Sheets process so invoices can still be completed.

This is the fallback path, not the future architecture.

### 5. Connect Airtable and run Diane through it

Airtable becomes the structured relational layer for tickets, batches, brokers, rules, validation status, OCR jobs, invoice runs, and QA/errors.

Do not overbuild the first pass. The minimum useful Airtable build should support:

- Importing or creating ticket records
- Linking tickets to a weekly batch
- Tracking Motive upload status
- Capturing OCR output
- Supporting validation/review
- Feeding invoice generation

### 6. Upgrade OCR after Airtable + Make updates

The OCR upgrade comes after the Airtable conversion and Make scenario updates, because the OCR needs a clean destination schema and validation rules before it can be improved properly.

## Current fallback decision rule

If the Airtable build runs long, stop the build work and run tickets through the existing Diane Google Sheets workflow. Invoices come first. Architecture goblins can wait their turn.

## Next build checkpoint

After the ticket images are uploaded and the fallback path is safe, inspect Airtable access and create/confirm the base schema.

Minimum next schema check:

- Base exists
- Tables exist or can be created
- Ticket table has required fields
- Batch table can group this week's tickets
- OCR/QA status fields exist
- Make can create/update Airtable records
