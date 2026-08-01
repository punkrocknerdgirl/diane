# Diane 2.0 Cloud Run Production Verification Test Checkpoint

Date: 2026-07-31

## Repository

- Repository: `punkrocknerdgirl/diane`
- Previous checkpoint commit: `e57d0b7fbd4838fb3890c7c9558a3dce825dea3a`
- Previous checkpoint file: `docs/build-logs/2026-07-31-D20-cloud-run-secret-access-and-production-promotion-checkpoint.md`

## Verified Cloud Run production state

- Google Cloud project: `infra-window-494823-r0`
- Project name: `Project Diane`
- Cloud Run service: `diane-ticket-extractor`
- Region: `us-central1`
- Production revision: `diane-ticket-extractor-00005-zs`
- Traffic: `00005-zs = 100%`
- Previous production revision `00003-psb` remains available for rollback.
- Candidate health check previously passed at `GET /health` with `ok: true`.

## Controlled Airtable test ticket

A single synthetic ticket was created in the live `Diane 2.0` Airtable base to imitate a Motive-ingested ticket without pulling a new Motive run.

- Base: `Diane 2.0`
- Base ID: `appMWvtLU0hMBqjLC`
- Table: `Tickets`
- Table ID: `tbloTlWdo1f4hFKXh`
- Record ID: `recajS2WsyQQi7CoJ`
- Ticket Key: `TEST_CLOUDRUN_20260731_2027`
- Ticket ID: `TEST-CLOUDRUN-20260731-2027`
- Ticket Status: `Intake`
- Source System: `Motive`
- Import Disposition: `Closed Historical Test`
- Import Key: `TEST_MOTIVE_CLOUDRUN_20260731_2027`
- Motive Document ID: `TEST_CLOUDRUN_20260731_2027`
- Motive Ref No: `TEST-CLOUDRUN-20260731-2027`
- Source file reused from an existing Motive ticket:
  - Drive file ID: `1Agn7A55VULotdGmqgRjf2YfYtLixTzIB`
  - Drive URL: `https://drive.google.com/file/d/1Agn7A55VULotdGmqgRjf2YfYtLixTzIB/view?usp=drivesdk`
- Source / Migration Notes explicitly mark the record as a controlled Cloud Run verification test and `Do not bill`.

## Scenario test sequence

### Scenario C - OCR Workflow

Scenario C was run first, but the Airtable search returned `0` bundles because its filter requires all of the following:

- `Cleaned File ID` exists
- `Clean Status = Cleaned`
- `Send Cleaned File to OCR = 1`
- `Ticket Status = Intake`
- no linked `OCR Runs`

The test ticket did not yet have cleaning fields, so Scenario C correctly did not pick it up.

### Scenario B - Clean Ticket Images

Scenario B was then run once.

Verified behavior:

- Airtable search found the test ticket.
- Google Drive download succeeded.
- CloudConvert `Create a Job (advanced)` succeeded.
- CloudConvert Job ID: `045fb124-1470-4a1f-8abd-ae3647a0717b`
- CloudConvert `Get a Job` returned:
  - Job status: `finished`
  - Convert task status: `finished`
  - Percent: `100`
  - Operation: `convert`
  - Engine: `imagemagick`
  - Engine version: `7.1.2`
  - One converted result file was present.

## Current blocker

The scenario did not advance from CloudConvert `Get a Job` to the Iterator/export branch.

Observed run indicators:

- `Get a Job` ran successfully.
- The route labeled `Export ready` toward the Iterator showed `0` bundles.
- The Iterator did not execute.
- Google Drive upload did not execute.
- Airtable update did not execute.
- The test ticket still has no values in:
  - `Clean Status`
  - `Cleaned File URL`
  - `Cleaned File ID`
  - `Send Cleaned File to OCR`
  - `Cleaning Error`

The likely failure point is the filter on the connection labeled `Export ready` between `Get a Job` and the Iterator. The next step is to inspect that filter's conditions without changing them.

## Next step

In Make, open Scenario `B - Clean Ticket Images` and click the filter/wrench on the connection labeled `Export ready` between CloudConvert `Get a Job` and the Iterator.

Capture the exact filter conditions. Do not edit or save changes yet.

## Guardrails

- Work one step at a time.
- Stay in chat.
- Do not switch to Work.
- Do not redeploy Cloud Run unless a verified failure requires it.
- Do not move Cloud Run traffic unless explicitly approved.
- Do not delete old Cloud Run revisions.
- Do not rotate or reveal secrets.
- Do not change Airtable schema.
- Do not change Make scenario logic until the filter mismatch is verified.
- Do not pull a new Motive run for this test.
- Keep the synthetic test ticket marked as closed historical test data and do not bill it.
