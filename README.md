# Diane

Diane is the trucking ticket-to-invoice system: scanned scale tickets go from raw upload to structured ticket data, validation, broker rules, and invoice packet output.

## Source of truth

Build documentation now lives in this repo.

- Current build doc: `docs/Diane-Current-Build.md`
- Current runbook: `docs/2026-07-05-diane-airtable-motive-runbook.md`

## Repo safety rule

This repo is public. Keep client-private data out of GitHub: no live ticket images, customer contacts, broker emails, API keys, tokens, paid invoices, or confidential client details.

Use GitHub for architecture, process docs, schema notes, Make scenario maps, and rebuild instructions. Store private operational data in the actual working systems: Motive, Google Drive, Airtable, Make, and the invoice/workflow tools.

## Current direction

Diane 1.1 uses Google Sheets as the fallback working layer. Diane 2.0 is the Airtable pivot: move the relational data layer into Airtable, then update the Make scenarios around that structure. OCR quality is the next major obstacle after the Airtable conversion.
