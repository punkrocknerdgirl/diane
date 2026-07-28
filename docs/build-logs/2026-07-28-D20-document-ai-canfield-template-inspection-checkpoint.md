# Diane 2.0 Document AI Canfield Template Inspection Checkpoint

**Date:** 2026-07-28

## Purpose

Record the read-only inspection of the current **D - Document AI Extractor** path, the verified Google Cloud infrastructure behind it, the current Document AI processor configuration and evaluation results, and the first evidence-backed Canfield Materials ticket-family template proposal.

This checkpoint stops before any Make, Document AI, Cloud Run, Airtable, or parser configuration change.

## Current verified operational state

Airtable remains the operational source of truth.

The fresh July import and completed upstream work remain unchanged:

- 83 Tickets in the fresh July import
- all 83 cleaned
- all 83 sent through OCR
- 83 completed OCR Runs
- 83 OCR Outputs with Raw OCR Text
- one controlled parser test completed previously
- Make schedules remain off

Do not rerun completed cleaning or OCR work.

## D - Document AI Extractor scenario inspection

The scenario was inspected in Make without running or changing it.

### Relevant modules

The ticket-template work directly touches or feeds these modules:

- Module 12: Airtable Search Records
- Module 5: HTTP, `Send File to Document AI Bridge`
- Module 13: Airtable Create a Record in `Parser Outputs`
- Module 14: Airtable Create a Record in `Validation Queue`
- Module 16: Airtable Update a Record, not yet inspected in this session

The file-download and merge route was not treated as part of the template design unless later evidence shows it must change.

### Module 5 verified configuration

Method:

`POST`

Endpoint:

`https://diane-ticket-extractor-413667913571.us-central1.run.app/extract/ticket`

Authentication header:

`X-Diane-API-Key`

The key value was not recorded.

Body type:

`multipart/form-data`

Fields sent:

- `file`
  - data from Module 24 `file_data`
  - filename from Module 24 `file_name`
- `submission_id`
  - Module 12 `Ticket Key`
- `cleaned_file_id`
  - Module 24 `selected_file_id`

Other verified settings:

- parse response: Yes
- return error when HTTP request fails: Yes
- allow redirects: Yes
- no explicit Make timeout value entered

No extraction prompt, ticket-family value, model selection, or schema is configured in Make Module 5.

### Module 13 verified Parser Outputs mappings

Module 13 creates a record in `Parser Outputs`.

Verified mappings:

- Name -> Module 5 `data.submission_id`
- Parser Run ID -> Module 5 `data.submission_id`
- OCR Output -> Module 12 linked OCR Output
- Ticket -> Module 12 record ID
- Parser Status -> hard-coded `Needs Review`
- Parsed Ticket Number -> Module 5 `data.data.fields.ticket_number`
- Parsed Truck -> Module 5 `data.data.fields.truck`
- Parsed Material -> Module 5 `data.data.fields.material`
- Parsed Quantity -> Module 5 `data.data.fields.quantity_tons`

Currently unmapped in Module 13:

- Parsed Ticket Date
- Parsed Driver
- Parsed Broker
- Parsed Rate
- Parsed Total
- Parser Confidence Score
- Needs Human Review?
- Validation Queue

### Module 14 verified Validation Queue mappings

Module 14 creates a record in `Validation Queue`.

Verified mappings:

- Validation ID -> `VAL_` plus Module 5 `data.submission_id`
- Parser Output -> Module 13 record ID
- Ticket -> Module 12 record ID
- Review Status -> hard-coded `Pending Review`
- Final Ticket Number -> Module 5 `data.data.fields.ticket_number`
- Final Truck -> Module 5 `data.data.fields.truck`
- Final Material -> Module 5 `data.data.fields.material`
- Final Quantity -> Module 5 `data.data.fields.quantity_tons`

Currently blank in Module 14:

- Final Ticket Date
- Final Driver
- Final Broker
- Final Rate
- Final Total
- Reviewer Notes
- Approved At

The Validation Queue receives parser values directly from Module 5 rather than reading them back from Module 13.

## Cloud Run bridge location and source trail

A separate infrastructure-location build log was created earlier in this session:

`docs/build-logs/2026-07-28-D20-ticket-extractor-source-location.md`

Commit:

`2df3512d6f30ce4335ac99022af371c0aec0be72`

Verified Cloud Run service:

- Google Cloud project name: `Project Diane`
- Google Cloud project ID: `infra-window-494823-r0`
- service: `diane-ticket-extractor`
- region: `us-central1`
- active revision: `diane-ticket-extractor-00003-psb`
- active revision traffic: 100%

Verified Artifact Registry and build trail:

- repository: `cloud-run-source-deploy`
- image: `diane-ticket-extractor/diane-ticket-extractor`
- image tag: `20260714-auth`
- Cloud Build ID: `aba55635-8f9e-44e4-9078-15b83a6a54c8`
- source archive:
  `gs://infra-window-494823-r0_cloudbuild/source/1784054120.073818-ff3f2e2920054b1d93178d6d080e650d.tgz`

The Cloud Run service was deployed from a container image. The Cloud Run Source tab has no editable source attached.

The downloaded source archive contained:

- `app.py`
- `Dockerfile`
- `requirements.txt`
- `__pycache__/app.cpython-312.pyc`

The bridge source contains no ticket-family prompt or template map. It sends the uploaded document to one Google Document AI processor and returns the processor entities in a structured response.

The source inspection also found that Make sends `cleaned_file_id`, while the current endpoint does not define or use that form field.

## Google Document AI processor inspection

Verified processor:

- name: `Diane Ticket Extractor`
- processor ID: `61c933f67dba23a3`
- status: Enabled
- processor type: Custom Extractor
- region: `us`
- created: 2026-05-31
- dataset storage: Google-managed
- total documents: 37

### Current schema

The Document prompt is currently blank.

Enabled schema fields:

- `customer_job`
- `destination`
- `material`
- `origin`
- `quantity_tons`
- `ticket_date`
- `ticket_number`
- `ticket_time`
- `truck`

All current fields are:

- Plain text
- Extract
- Required once
- Enabled

### Dataset state

Verified dataset totals:

- 37 total documents
- 37 labeled
- 19 training
- 18 test
- 0 unassigned
- 0 unlabeled
- 0 auto-labeled
- 0 suggested

Verified labeled-document counts:

| Field | Total labeled documents | Training | Test |
|---|---:|---:|---:|
| `customer_job` | 30 | 14 | 16 |
| `destination` | 29 | 15 | 14 |
| `material` | 37 | 19 | 18 |
| `origin` | 36 | 19 | 17 |
| `quantity_tons` | 36 | 18 | 18 |
| `ticket_date` | 37 | 19 | 18 |
| `ticket_number` | 37 | 19 | 18 |
| `ticket_time` | 37 | 19 | 18 |
| `truck` | 34 | 17 | 17 |

Google flags that the dataset does not meet the recommended 50 training and 50 test documents per label. The displayed minimum is 10 documents per split, which the current labels meet.

### Processor versions

The processor-level default displayed in `Deploy & use` is:

`pretrained-foundation-model-v1.5-pro-2025-06-20`

Google manages and auto-upgrades that default version.

A separate custom version exists:

- version ID: `1b0b24d53f7472d3`
- name: `diane_ticket_extractor_v1`
- status: Deployed
- type: Custom
- created: 2026-05-31 at 9:34:08 PM
- last evaluated: 2026-05-31 at 11:02:39 PM

Do not claim from this inspection alone that the custom version is the processor-level default. The displayed processor default was the Google-managed foundation model.

### Custom version evaluation

Evaluation for `diane_ticket_extractor_v1`:

- overall F1: 0.555
- precision: 69.6%
- recall: 46.1%
- test documents: 18
- evaluated documents: 18
- invalid documents: 0
- failed documents: 0

Field-level F1 scores:

| Field | F1 score |
|---|---:|
| `ticket_time` | 0.971 |
| `ticket_date` | 0.824 |
| `ticket_number` | 0.667 |
| `quantity_tons` | 0.552 |
| `material` | 0.519 |
| `truck` | 0.438 |
| `origin` | 0.414 |
| `customer_job` | 0.000 |
| `destination` | 0.000 |

The zero scores for `customer_job` and `destination` are not explained by complete absence of labels. They have 30 and 29 labeled documents respectively. No cause has yet been proven.

## Canfield Materials sample inspection

Two separate labeled Canfield Materials tickets of the same layout were inspected.

### Canfield sample 1

Verified labels:

- `customer_job`: `Cash and Carry`
- `destination`: blank
- `material`: `blue base`
- `origin`: `Canfield Materials LLC`
- `quantity_tons`: `25.09`
- `ticket_date`: `05/07/2026`
- `ticket_number`: `392014`
- `ticket_time`: `04:32`
- `truck`: `wright2`

### Canfield sample 2

Verified labels:

- `customer_job`: blank
- `destination`: blank
- `material`: `tan base`
- `origin`: `Canfield Materials`
- `quantity_tons`: `26.08`
- `ticket_date`: `05/05/2026`
- `ticket_number`: `394329`
- `ticket_time`: `06:01`
- `truck`: `Wright1`

### Consistent field locations across both Canfield samples

- date and time: upper-right beneath `DATE`
- ticket number: center near `ID`
- material: center above the ticket number
- quantity: right side beside `TONS`
- truck: lower-center
- origin: lower-left company block
- buyer/customer job: upper center when populated
- destination: not present on either inspected sample

## Proposed first-family template design

This design was proposed but not implemented:

### Ticket family

`Canfield Materials`

### Recognition

- Canfield Materials logo or company name appears on the ticket.
- Layout contains `GROSS`, `TARE`, `NET`, and `TONS` on the right.
- Ticket ID and material appear near the center.

### Extraction guidance

- `ticket_number`: value beside or immediately below `ID`
- `ticket_date`: date beneath `DATE` in the upper-right
- `ticket_time`: time immediately beside the ticket date
- `truck`: truck identifier near the lower-center
- `material`: product or material immediately above the ticket ID
- `quantity_tons`: numeric value beside `TONS`; do not use GROSS, TARE, or NET pound values
- `origin`: Canfield Materials company name from the lower-left seller block
- `customer_job`: buyer/customer value only when clearly populated; otherwise blank
- `destination`: normally absent on this format; leave blank unless explicitly printed

### Fallback behavior

- Never infer missing values from handwriting, prior tickets, filenames, or neighboring fields.
- Leave uncertain values blank.
- Route the record to Needs Review.

This proposal is supported by two inspected Canfield samples, but no processor prompt or schema change has been made.

## Decisions and architectural direction

- Continue using ticket-family guidance rather than one broad generic extraction instruction.
- Start with one known family and one controlled ticket before expanding.
- The first evidence-backed family is Canfield Materials.
- Do not build family-specific Make routers unless later evidence proves they are needed.
- Do not choose between prompt guidance, dataset changes, fine tuning, custom retraining, or version changes until the current Document prompt behavior and processor-version targeting are understood.
- Unknown or uncertain values must remain blank and route to review.

## What was not changed

- No Make scenario configuration was changed.
- No Make scenario was run.
- No Make schedule was enabled.
- No Airtable schema or records were changed.
- No Document AI schema field was added, renamed, disabled, or deleted.
- No Document prompt was edited.
- No dataset document was imported, relabeled, reassigned, or deleted.
- No evaluation was rerun.
- No processor version was created, fine-tuned, trained, deployed, undeployed, upgraded, or marked as default.
- No Cloud Run revision was created.
- No container image was changed.
- No Cloud Build was retried.
- No source code was edited or deployed.
- No Apps Script source, version, or deployment was changed.
- No Google Sheets architecture was restored.

## Guardrails

- Stay in chat unless Ernie explicitly asks to switch to Work.
- Work one step at a time.
- Diagnose before changing anything.
- Airtable is the operational source of truth.
- Do not restore Google Sheets as the final architecture.
- Do not modify Make unless explicitly requested.
- Show the exact proposed action, prompt, schema edit, version action, or mapping change before modifying live code or data.
- Do not claim a deployment, commit, test, scenario run, processor build, or live-data change unless verified.
- Keep all Make schedules off unless explicitly approved.
- Use one controlled ticket before expanding scope.
- Do not rerun completed cleaning or OCR work.
- Do not expose API keys, credentials, or secret environment-variable values.

## Smallest correct next step

Before editing the blank Document prompt, determine exactly how prompt changes apply to processor versions and predictions in this Custom Extractor interface.

The next session should inspect the `Edit` flow for the Document prompt in read-only fashion as far as possible without saving, and identify:

- whether the prompt is processor-wide or version-specific
- whether editing it changes the current default prediction behavior immediately or only affects a new version
- whether the Canfield family guidance can be added without changing the schema
- what explicit save, build, deploy, or version action would be required

After that inspection, show the exact proposed Canfield prompt text and exact affected processor/version behavior before making any change.
