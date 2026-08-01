# Diane 2.0 Production Reset — Scenario A Through D Inspection Checkpoint

Date: 2026-08-01

## Starting repository state

Previous checkpoint commit:

`8bfef184c51be4dc055ee68e8bc74881fb760915`

Previous checkpoint file:

`docs/build-logs/2026-07-31-D20-production-path-verification-complete-reset-checkpoint.md`

## Current phase

The production path has already been verified end to end through the Apps Script human review screen using one controlled synthetic ticket.

The current approved phase is a controlled production reset before a fresh July 1, 2026 Motive reimport.

No Airtable transactional data has been deleted.
No Motive reimport has been started.
No Make production edit has been made during this inspection pass.
No Cloud Run change has occurred.

## Guardrails still in force

- Work one step at a time.
- Diagnose before changing anything.
- Do not save or approve the controlled review ticket.
- Do not redeploy Cloud Run.
- Do not move Cloud Run traffic.
- Do not delete Cloud Run revisions.
- Do not rotate or reveal secrets.
- Do not change Airtable schema.
- Do not delete config/reference records.
- Do not delete Airtable data until table counts, dependencies, deletion order, and exact scope are documented and explicitly approved.
- Do not pull a new Motive run until all test overrides are restored and the reset scope is approved.
- Show the exact proposed change and obtain explicit approval before every production edit or destructive action.

## Cloud Run state remains unchanged

Google Cloud project:

`infra-window-494823-r0`

Cloud Run service:

`diane-ticket-extractor`

Region:

`us-central1`

Production revision:

`diane-ticket-extractor-00005-zs`

Traffic:

`00005-zs = 100%`

Rollback revision still available:

`diane-ticket-extractor-00003-psb`

## Controlled synthetic records still present

Tickets:

- Record ID: `recajS2WsyQQi7CoJ`
- Ticket Key: `TEST_CLOUDRUN_20260731_2027`

OCR Run:

`recvvSfGgUv2lO5vc`

OCR Output:

`recs4Ie0nNuxWAyvp`

Parser Output:

`recOaehjc6Anw2GAW`

Validation Queue:

`reclg1rAdOW9CKgy8`

Review Batch:

- Record ID: `recRMIz6IKVcWJLQA`
- Batch key: `DISPATCH_DSP_20260713_005`

All are synthetic controlled-test data and must not be billed.

# Make scenario inspection completed so far

## Scenario A — Get Motive Tickets

Schedule toggle appeared off.

### Airtable 26 — Search Import Runs

Formula:

```text
AND(
  {Source System} = "Motive",
  {Import Disposition} = "Live Work",
  {Run Status} = "Ready"
)
```

Limit: `1`

No synthetic Ticket Key, record ID, date, batch value, or test-only OR block found.

### Tools 32 — Set variable

```text
run_start_time = now
```

Normal production behavior.

### HTTP 1 — List Motive Documents

Verified:

- Method: `GET`
- `created_after` mapped from `26.Pull From`
- `document_form_id = 5`
- Items path: `documents`
- Pagination page parameter: `page_no`
- Initial page: `1`
- Page size parameter: `per_page`
- Page size: `50`
- Output format: Array of items

No hardcoded test date or test targeting found.

### Filter — Only Scale Ticket Documents

Condition:

```text
1.document.category
Contains
scale ticket
```

The token appeared visually unusual in the filter editor, but the actual HTTP run output confirmed this structure exists:

```text
document
└── category = scale ticket
```

No edit was made. Mark for first controlled real-run verification only.

### Airtable 27 — Search Existing Tickets

Formula builds the import key from live mapped values:

```text
{Import Key} = "MOTIVE_{{1.document.id}}_{{15.id}}"
```

Limit: `1`

No test override found.

### Filter — No Existing Attachment Found

```text
27.Total number of bundles
Equal to
0
```

Normal duplicate-prevention behavior.

### Airtable 31 — Update Import Run

Updates:

- Table: Import Runs
- Record ID: `26.ID`
- Run Status: `Completed`
- Pulled At: `32.run_start_time`

Does not change `Pull From`.

### Scenario A conclusion

No restoration item found.

One observation only:

- Reconfirm the scale-ticket category filter during the first controlled real intake run because its token appearance looked unusual, although its path and prior behavior were verified.

## Scenario B — Clean Ticket Images

Schedule toggle appeared off.

Previously verified production fixes remain present:

1. The redundant upstream Export-ready filter between Router 26 and Iterator 20 is absent.
2. HTTP 4 URL remains mapped to `20.Result.Files[] → URL`.

### Airtable 11 — Search Tickets

Formula:

```text
AND(
  {Ticket Status} = "Intake",
  NOT({Cleaned File ID}),
  OR(
    {Clean Status} = "",
    {Clean Status} = "Needs Clean"
  )
)
```

Limit: `75`

No test override found.

### Retry filter

Conditions:

```text
17.Tasks[] → Result.Files[] → URL
Does not exist
```

and

```text
22.i
Equal to
5
```

Normal failure/retry handling.

### Export-ready path

Verified actual path:

- Router 26
- Tools 29 sets `cleaning_poll_complete = true`
- Iterator 20 iterates `17.Tasks[]`
- Filter `Export task only` checks `20.Operation = export/url`
- HTTP 4 downloads from `20.Result.Files[] → URL`

### Airtable 21 — Success update

Updates Ticket record `11.ID` with:

- Clean Status: `Cleaned`
- Send Cleaned File to OCR: `Yes`
- Cleaned File URL: `9.Web View Link`
- Cleaned File ID: `9.File ID`
- Cleaned At: `now`

No test values found.

### Airtable 30 — Retry/failure update

Updates Ticket record `11.ID` with:

- Clean Status: `Needs Clean`
- Send Cleaned File to OCR: `No`
- Cleaning Error: `CloudConvert export URL was still empty after 5 checks.`

No test values found.

### Scenario B conclusion

No restoration item found.

## Scenario C — OCR Workflow

Schedule toggle appeared off.

### Airtable 43 — Search Tickets

Formula:

```text
AND(
  {Cleaned File ID},
  {Clean Status} = "Cleaned",
  {Send Cleaned File to OCR} = 1,
  {Ticket Status} = "Intake",
  NOT({OCR Runs})
)
```

Limit: `75`

No test override found.

### File-type filters

Image branch:

```text
5.Mime Type
Contains
image/
```

PDF/TIFF branch:

```text
5.Mime Type Contains pdf
OR
5.Mime Type = image/tif
OR
5.Mime Type = image/tiff
```

No test values found.

### Airtable 45 — Image OCR Run

Creates OCR Runs record with dynamic production mappings:

- OCR Run ID: `OCR_` + `43.Ticket Key` + `_` + `now`
- Ticket: `43.ID`
- OCR Provider: `Google Cloud Vision`
- OCR Status: `Complete`
- Completed At: `now`
- Processing File URL: `43.Source File URL`

No hardcoded record IDs or test values found.

### Airtable 47 — PDF/TIFF OCR Run

Uses the same production pattern as Airtable 45.

No hardcoded record IDs or test values found.

### Scenario C conclusion

No restoration item found.

## Scenario D — Document AI Extraction

Schedule toggle appeared off.

### Confirmed restoration item: Airtable 12

Current temporary test formula:

```text
AND(
  {Ticket Key} = "TEST_CLOUDRUN_20260731_2027",
  {Cleaned File ID} != "",
  COUNTA({OCR Outputs}) > 0,
  COUNTA({Parser Outputs}) = 0
)
```

Current limit:

`1`

Confirmed test-only pieces:

- Hardcoded Ticket Key: `TEST_CLOUDRUN_20260731_2027`
- Temporary limit: `1`

Likely production eligibility conditions retained inside the formula:

```text
{Cleaned File ID} != ""
COUNTA({OCR Outputs}) > 0
COUNTA({Parser Outputs}) = 0
```

Do not restore yet until the exact production formula and intended production limit are established in the final restoration list.

### HTTP 5 — Send File to Document AI Bridge

Verified:

- Live Cloud Run extractor endpoint
- Method: `POST`
- Header name: `X-Diane-API-Key`
- Secret exists but was not exposed
- Body type: `multipart/form-data`

Mapped body fields:

```text
file.data = 24.file_data
file.name = 24.file_name
submission_id = 12.Ticket Key
cleaned_file_id = 24.selected_file_id
```

No hardcoded test payload values found.

### Airtable 13 — Create Parser Output

Dynamic production mappings include:

- Name: `5.data.submission_id`
- Parser Run ID: `5.data.submission_id`
- OCR Output: `12.OCR Outputs[]`
- Ticket: `12.ID`
- Parser Status: `Needs Review`
- Parsed Ticket Number: `5.data.data.fields.ticket_number`
- Parsed Truck: `5.data.data.fields.truck`
- Parsed Material: `5.data.data.fields.material`
- Parsed Quantity: `5.data.data.fields.quantity_tons`

No test override found.

### Airtable 14 — Create Validation Queue record

Dynamic production mappings include:

- Validation ID: `VAL_` + `5.data.submission_id`
- Parser Output: `13.ID`
- Ticket: `12.ID`
- Review Status: `Pending Review`
- Final Ticket Number: `5.data.data.fields.ticket_number`
- Final Truck: `5.data.data.fields.truck`
- Final Material: `5.data.data.fields.material`
- Final Quantity: `5.data.data.fields.quantity_tons`

No test override found.

### Airtable 16 — Update Ticket

Updates Ticket record `12.ID`.

Confirmed populated value:

- Ticket Status: `Needs Review`

No hardcoded test record ID or other synthetic value found.

### Scenario D conclusion

One confirmed restoration item only:

- Airtable 12 hardcoded test Ticket Key and temporary limit.

No edit has been made.

# Restoration list currently established

## Scenario D — Airtable 12

Current test targeting:

```text
{Ticket Key} = "TEST_CLOUDRUN_20260731_2027"
```

Current temporary limit:

`1`

Required future action, not yet approved or performed:

- Remove the hardcoded test Ticket Key condition.
- Restore the exact verified production formula.
- Restore the exact verified production limit.

## Scenario E — Airtable 2

Already documented earlier in this inspection phase.

Current temporary formula:

```text
AND(
  {Review Status} = "Pending Review",
  COUNTA({Review Batches}) = 0,
  RECORD_ID() = "reclg1rAdOW9CKgy8"
)
```

Current temporary limit:

`1`

Known prior production limit from the handoff:

`3`

Required future action, not yet approved or performed:

- Remove hardcoded Validation Queue record ID `reclg1rAdOW9CKgy8`.
- Restore the exact verified production formula.
- Restore limit from `1` to the verified production value, expected to be `3` pending final confirmation.

# Immediate next step

Return to Scenario E — Build Review Batch.

Inspect the full canvas and then inspect only high-risk modules for:

- hardcoded Validation Queue record IDs
- test Ticket Keys
- test-only OR blocks
- temporary limits
- hardcoded batch keys
- hardcoded dispatch IDs
- test dates
- file IDs or URLs
- disabled or altered filters
- synthetic values

Do not edit anything.

After Scenario E, inspect any remaining Diane scenarios using the same targeted method. Then build one exact restoration list before making any production change.

# Still not started

- No exact restoration edits have been proposed for approval.
- No Make production settings have been changed.
- No Airtable table inventory or record counts have been completed.
- No table classification has been finalized.
- No dependency-safe deletion order has been finalized.
- No Airtable data has been deleted.
- No Import Run cursor has been reset to July 1, 2026.
- No real Motive ticket pull has been started.
