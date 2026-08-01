# Diane 2.0 Production Path Verification Complete / Reset Checkpoint

Date: 2026-07-31

## Repository

- Repository: `punkrocknerdgirl/diane`
- Prior checkpoint commit: `7cef7c2743891e55ae13cab9aacbf892e24b1857`
- Prior checkpoint file: `docs/build-logs/2026-07-31-D20-cloud-run-production-verification-test-checkpoint.md`
- This checkpoint file: `docs/build-logs/2026-07-31-D20-production-path-verification-complete-reset-checkpoint.md`

## Verified Cloud Run production state

- Google Cloud project: `infra-window-494823-r0`
- Cloud Run service: `diane-ticket-extractor`
- Region: `us-central1`
- Production revision: `diane-ticket-extractor-00005-zs`
- Traffic: `00005-zs = 100%`
- Previous production revision `00003-psb` remains available for rollback.
- No Cloud Run redeploy, revision creation, traffic move, revision deletion, or secret rotation occurred during this verification session.

## Controlled test ticket

- Airtable base: `Diane 2.0`
- Tickets record ID: `recajS2WsyQQi7CoJ`
- Ticket Key: `TEST_CLOUDRUN_20260731_2027`
- Ticket Status: `Intake`
- Source System: `Motive`
- Import Disposition: `Closed Historical Test`
- Import Key: `TEST_MOTIVE_CLOUDRUN_20260731_2027`
- Motive Document ID: `TEST_CLOUDRUN_20260731_2027`
- Motive Ref No: `TEST-CLOUDRUN-20260731-2027`
- Explicitly marked controlled test, closed historical test, and `Do not bill`.

## Scenario B - Clean Ticket Images

Scenario B was successfully verified after two approved Make changes:

1. Removed the redundant upstream `Export ready` filter between Router 26 and Iterator 20.
2. Remapped HTTP 4 URL from `17. Tasks[] -> Result.Files[] -> URL` to `20. Result.Files[] -> URL`.

Verified result:

- `Clean Status = Cleaned`
- `Cleaned File URL` populated
- `Cleaned File ID` populated
- `Send Cleaned File to OCR = true`
- `Cleaning Error` empty

No Cloud Run change was required.

## Scenario C - OCR Workflow

Scenario C was run once against the controlled ticket.

Verified path:

- Airtable 43 found exactly the controlled ticket.
- Download Cleaned File 5 downloaded the cleaned file.
- Route by File Type 25 selected the PDF/TIFF branch.
- OCR PDF or TIFF File 27 completed.
- Combine OCR Text 36 completed.
- Airtable 47 created an OCR Run.
- Airtable 48 created an OCR Output.

Verified Airtable results:

### OCR Run

- Record ID: `recvvSfGgUv2lO5vc`
- OCR Run ID: `OCR_TEST_CLOUDRUN_20260731_2027_2026-08-01T02:00:38.506Z`
- Provider: `Google Cloud Vision`
- Status: `Complete`
- Completed At populated
- Error Message empty

### OCR Output

- Record ID: `recs4Ie0nNuxWAyvp`
- OCR Output ID: `OUT_OCR_TEST_CLOUDRUN_20260731_2027_2026-08-01T02:00:38.506Z`
- Raw OCR Text populated
- Linked to the controlled ticket and OCR Run

Scenario C production verification passed.

## Scenario D - Document AI Extraction

The Airtable 12 search module was temporarily retargeted from an older hardcoded ticket key to:

- `TEST_CLOUDRUN_20260731_2027`

The scenario was then run once.

Verified path:

- Airtable 12 found the controlled ticket.
- Download Cleaned Ticket File 4 downloaded the cleaned file.
- Send File to Document AI Bridge 5 completed.
- Airtable 13 created a Parser Output.
- Airtable 14 created a Validation Queue record.
- Airtable 16 updated the ticket.

### Parser Output

- Record ID: `recOaehjc6Anw2GAW`
- Parser Run ID: `TEST_CLOUDRUN_20260731_2027`
- Parser Status: `Needs Review`
- Parsed Ticket Number: `405721`
- Parsed Truck: `wright2`
- Parsed Material: `tan base`
- Parsed Quantity: `24.72`

### Validation Queue

- Record ID: `reclg1rAdOW9CKgy8`
- Validation ID: `VAL_TEST_CLOUDRUN_20260731_2027`
- Review Status: `Pending Review`
- Final Ticket Number: `405721`
- Final Truck: `wright2`
- Final Material: `tan base`
- Linked to the controlled ticket and Parser Output

Scenario D production verification passed.

## Scenario E - Build Review Batch

The Airtable 2 search module was temporarily narrowed to the controlled Validation Queue record:

- `RECORD_ID() = "reclg1rAdOW9CKgy8"`
- Limit changed from `3` to `1`

The scenario was then run once.

Verified path:

- Airtable 2 found exactly the controlled Validation Queue record.
- Linked-record lookups and variable modules completed.
- Existing batch search completed.
- Make Code and Array Aggregator completed.
- Router selected the `No Existing Review Batch` route.
- Airtable 29 created a Review Batch.

### Review Batch

- Record ID: `recRMIz6IKVcWJLQA`
- Review Batch Key: `DISPATCH_DSP_20260713_005`
- Batch Status: `Draft`
- Linked Validation Queue record: `VAL_TEST_CLOUDRUN_20260731_2027`

Scenario E production verification passed.

## Review interface verification

The Diane Ticket Review Apps Script interface loaded the controlled review batch and ticket successfully.

Verified usable review-screen behavior:

- Cleaned ticket scan displayed correctly.
- Ticket number populated: `405721`
- Truck populated: `wright2`
- Material populated: `tan base`
- Quantity populated: `24.72`
- Save as Draft and Save and Approve controls were present.

Known imperfect or unverified review-form values:

- Ticket Date remained blank even though the scan shows `07/24/2026 10:46`.
- Driver displayed `DS`, which was not yet proven from the scan.
- Broker and Customer / Job were blank.
- Batch-level values visible in overview were not yet fully proven as correct mappings for this ticket.

No ticket was saved or approved.

## Milestone conclusion

The production path is now verified end to end to a usable human review screen:

`Motive-style ticket record -> cleaning -> OCR -> parser -> validation queue -> review batch -> Apps Script review form`

This is accepted as a successful milestone even though field extraction and mapping still require improvement.

## User-approved next phase

Move from synthetic verification to a controlled production reset:

1. Restore all temporary test targeting values to real production logic.
2. Inventory every Diane Make scenario for hardcoded ticket keys, record IDs, limits, dates, batch values, and other test overrides.
3. Turn off Diane Make schedules before destructive cleanup.
4. Preserve all Airtable schema, views, formulas, automations, interfaces, and configuration/reference tables.
5. Delete transactional data only, in dependency-safe order.
6. Preserve config/reference tables such as Brokers, Drivers, Trucks, Materials, Aliases, and other setup data.
7. Reset the Motive import cursor to July 1, 2026.
8. Pull Motive tickets again beginning July 1, 2026.
9. Inspect the first real intake batch before allowing downstream scenarios to continue.
10. Walk real data through Scenarios B, C, D, and E and verify the review interface again.

Likely transactional tables to evaluate for clearing include:

- Review Batches
- Validation Queue
- Parser Outputs
- OCR Outputs
- OCR Runs
- Tickets
- Import Runs or applicable import-run history records
- Invoice Batches only if they contain test/generated operational data

No deletion scope is yet approved. Exact record counts and dependency order must be verified first.

## Immediate next step

Before deleting any Airtable record or pulling Motive data:

- Return to Make.
- Turn off Diane scenario schedules if any are active.
- Inspect every scenario for temporary test values.
- Build an exact restoration list.
- Show every proposed change and obtain explicit approval before editing production logic.

## Guardrails

- Work one step at a time.
- Stay in chat.
- Do not switch to Work.
- Do not save or approve the controlled review ticket.
- Do not redeploy Cloud Run.
- Do not move Cloud Run traffic.
- Do not delete Cloud Run revisions.
- Do not rotate or reveal secrets.
- Do not change Airtable schema.
- Do not delete config/reference records.
- Do not wipe Airtable data until table-by-table counts, dependencies, and exact scope are documented and explicitly approved.
- Do not pull a new Motive run until test overrides are restored and the reset scope is approved.
- Diagnose first, show exact proposed changes, and obtain explicit approval before every production logic change or destructive action.
