# Diane 2.0 Cloud Run Production Verification Test Checkpoint

Date: 2026-07-31

## Repository

- Repository: `punkrocknerdgirl/diane`
- Starting checkpoint commit: `6d5a2599b8a1c9817c808033a947c89cd07ad52a`
- Checkpoint file: `docs/build-logs/2026-07-31-D20-cloud-run-production-verification-test-checkpoint.md`

## Verified Cloud Run production state

- Google Cloud project: `infra-window-494823-r0`
- Cloud Run service: `diane-ticket-extractor`
- Region: `us-central1`
- Production revision: `diane-ticket-extractor-00005-zs`
- Traffic: `00005-zs = 100%`
- Previous production revision `00003-psb` remains available for rollback.
- No Cloud Run redeploy, revision creation, traffic move, revision deletion, or secret rotation occurred during this verification session.

## Controlled Airtable test ticket

A single synthetic ticket in the live `Diane 2.0` Airtable base was used to verify the production path without pulling a new Motive run.

- Base: `Diane 2.0`
- Table: `Tickets`
- Record ID: `recajS2WsyQQi7CoJ`
- Ticket Key: `TEST_CLOUDRUN_20260731_2027`
- Ticket Status: `Intake`
- Source System: `Motive`
- Import Disposition: `Closed Historical Test`
- Import Key: `TEST_MOTIVE_CLOUDRUN_20260731_2027`
- Motive Document ID: `TEST_CLOUDRUN_20260731_2027`
- Motive Ref No: `TEST-CLOUDRUN-20260731-2027`
- Source file reused from an existing Motive Drive file.
- Source / Migration Notes explicitly mark the record as a controlled Cloud Run verification test and `Do not bill`.

## Scenario C - OCR Workflow initial test

Scenario C initially returned `0` bundles because the controlled test ticket did not yet have the cleaning fields required by the Scenario C search filter.

Required conditions included:

- `Cleaned File ID` exists
- `Clean Status = Cleaned`
- `Send Cleaned File to OCR = 1`
- `Ticket Status = Intake`
- no linked `OCR Runs`

This was expected before Scenario B completed.

## Scenario B - Clean Ticket Images diagnosis

Initial verified behavior:

- Airtable search found the controlled test ticket.
- Google Drive download succeeded.
- CloudConvert `Create a Job (advanced)` succeeded.
- CloudConvert Job ID: `045fb124-1470-4a1f-8abd-ae3647a0717b`
- CloudConvert `Get a Job` returned a finished job.
- Task 1 was the conversion task:
  - Status: `finished`
  - Percent: `100`
  - Operation: `convert`
  - Engine: `imagemagick`
  - Engine version: `7.1.2`
  - Result file had filename and size but no URL.
- Task 2 was the export task:
  - Status: `finished`
  - Percent: `100`
  - Operation: `export/url`
  - `Result.Files[1].URL` was populated.

### First verified production logic break

The upstream route filter labeled `Export ready`, between Router 26 and Iterator 20, checked:

- `17. Tasks[] -> Result.Files[] -> URL`
- Operator: `Exists`

Because the first task in `Tasks[]` was the convert task and had no URL, the route passed `0` bundles even though the second task contained the valid export URL.

Iterator 20 was correctly mapped to the full:

- `17. Tasks[]`

The downstream filter labeled `Export task only` was also correct:

- `20. Operation`
- `Equal to`
- `export/url`

### First saved fix

With explicit approval, the redundant upstream `Export ready` filter was deleted and the Make scenario was saved.

No module was otherwise changed at this stage.

## Second verified production logic break

After rerunning the controlled test, execution reached HTTP 4 but failed because its required URL field was still mapped directly to the raw CloudConvert array path:

- `17. Tasks[] -> Result.Files[] -> URL`

Make reported that the mapped URL value was empty. Google Drive upload and Airtable update did not run during that failed attempt, and Make rolled back the operation.

### Second saved fix

With explicit approval, only the HTTP 4 URL mapping was changed from the raw CloudConvert output to the already-iterated export-task bundle:

- Old mapping: `17. Tasks[] -> Result.Files[] -> URL`
- New mapping: `20. Result.Files[] -> URL`

The HTTP module and scenario were saved.

No authentication setting, downstream filter, Iterator mapping, Google Drive module, Airtable module, Airtable schema, Cloud Run service, or traffic setting was changed.

## Successful controlled production-path verification

Scenario B was run again against the same controlled Airtable ticket.

Verified successful results:

- Iterator 20 processed the CloudConvert task array.
- The existing `Export task only` filter selected the `export/url` task.
- HTTP 4 downloaded the cleaned file successfully using `20. Result.Files[] -> URL`.
- Google Drive 9 uploaded the cleaned file successfully.
- Airtable 21 updated record `recajS2WsyQQi7CoJ` successfully.
- Make showed successful commit and finalization.

Verified Airtable values after the run:

- `Clean Status = Cleaned`
- `Cleaned File URL` populated
- `Cleaned File ID` populated
- `Send Cleaned File to OCR = true`
- `Cleaning Error` remained unpopulated

The controlled test ticket remains marked as historical test data and `Do not bill`.

## Current verified state

Scenario B now completes successfully for the controlled production verification ticket.

The only Make production logic changes made were:

1. Removed the redundant upstream `Export ready` filter between Router 26 and Iterator 20.
2. Remapped HTTP 4 URL from `17. Tasks[] -> Result.Files[] -> URL` to `20. Result.Files[] -> URL`.

No Cloud Run change was required.

## Next step

Run Scenario C - OCR Workflow once against the same controlled ticket now that Scenario B populated:

- `Clean Status = Cleaned`
- `Cleaned File ID`
- `Cleaned File URL`
- `Send Cleaned File to OCR = true`

Verify that Scenario C finds exactly the controlled ticket and sends the cleaned file through the production Cloud Run OCR path.

Before changing anything, inspect the Scenario C run result module by module. Do not broaden the test to other tickets.

## Guardrails

- Work one step at a time.
- Stay in chat.
- Do not switch to Work.
- Do not redeploy Cloud Run.
- Do not move Cloud Run traffic.
- Do not delete old Cloud Run revisions.
- Do not rotate or reveal secrets.
- Do not change Airtable schema.
- Do not pull a new Motive run.
- Do not broaden the test beyond the controlled ticket.
- Do not bill the synthetic test ticket.
- Do not change production modules merely to force a test to pass. Diagnose first, show the exact proposed change, and obtain explicit approval before any additional production logic change.
