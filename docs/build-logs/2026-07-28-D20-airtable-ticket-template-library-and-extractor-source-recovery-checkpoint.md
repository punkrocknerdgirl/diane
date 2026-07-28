# Diane 2.0 Airtable Ticket Template Library and Extractor Source Recovery Checkpoint

**Date:** 2026-07-28

## Purpose

Record the verified creation of an Airtable-based ticket-template configuration library, the initial Canfield Materials draft configuration, and recovery of the exact deployed `diane-ticket-extractor` Cloud Run source from its Cloud Build source archive.

## Guardrails

- Stay in chat unless Ernie explicitly asks to switch to Work.
- Work one step at a time.
- Diagnose before changing anything.
- Airtable is the operational source of truth.
- Do not restore Google Sheets as the final architecture.
- Do not modify Make unless explicitly requested.
- Show the exact proposed action or diff before modifying live code or data.
- Do not claim a deployment, commit, test, scenario run, or live-data change unless verified.
- Keep Make schedules off unless explicitly approved.
- Use controlled single-record tests before expanding scope.
- Do not rerun completed cleaning or OCR work.
- Do not expose or commit API keys, secrets, or credentials.

## Verified Airtable state

Live base:

- Base: `Diane 2.0`
- Base ID: `appMWvtLU0hMBqjLC`

Two new configuration tables were created:

### Ticket Templates

- Table ID: `tblAVz20h5VEsaF5u`
- Purpose: ticket-family recognition, extraction guidance, fallback behavior, sample evidence, and configuration history.

Fields created:

- Template Name
- Template Code
- Template Status
- Recognition Rules
- General Extraction Rules
- Fallback Rules
- Priority
- Sample Notes
- Sample Files
- Source / Change Notes

### Template Field Rules

- Table ID: `tblGnGiSwhbBhnywH`
- Purpose: field-level extraction rules linked to a ticket-family template.

Fields created:

- Rule Name
- Ticket Template
- Output Field
- Field Label Clues
- Location Guidance
- Extraction Rule
- Exclusion Rule
- Usually Present?
- Required for Review?
- Rule Status
- Notes

The linked relationship between the two tables was created successfully.

## Canfield Materials draft configuration

One draft template record was created:

- Template Name: `Canfield Materials`
- Template Code: `CANFIELD`
- Template Status: `Draft`
- Priority: `100`
- Record ID: `recq6Le7nE8wAvSIn`

The template records the following verified layout clues from two inspected Canfield samples:

- Canfield Materials name or logo identifies the family.
- GROSS, TARE, NET, and TONS appear on the right.
- Ticket ID and material appear near the center.
- Date and time appear upper-right beneath DATE.
- Ticket number appears near ID.
- Material appears above ID.
- Quantity appears beside TONS.
- Truck appears lower-center.
- Origin appears in the lower-left seller block.
- Customer/job may appear upper-center when present.
- Destination was absent in both inspected samples.

Fallback rules were recorded to prevent inference from handwriting, prior tickets, filenames, or neighboring fields. Uncertain values should remain blank and route to human review.

Nine linked draft field-rule records were created for:

- `customer_job`
- `destination`
- `material`
- `origin`
- `quantity_tons`
- `ticket_date`
- `ticket_number`
- `ticket_time`
- `truck`

Each rule includes label clues, expected location, extraction instructions, exclusions, expected presence, and review requirements.

No template or rule was activated.

## Verified Document AI and Cloud Run state

Document AI processor:

- Name: `Diane Ticket Extractor`
- Processor ID: `61c933f67dba23a3`
- Type: Custom Extractor
- Region: `us`
- Enabled

Current Google-managed version shown in the console:

- `pretrained-foundation-model-v1.5-pro-2025-06-20`

Separate custom deployed version:

- Version ID: `1b0b24d53f7472d3`
- Name: `diane_ticket_extractor_v1`

The custom version must not be described as the processor default unless independently verified.

Cloud Run service:

- Service: `diane-ticket-extractor`
- Region: `us-central1`
- Active revision: `diane-ticket-extractor-00003-psb`
- Traffic: 100% to active revision
- Deployed: 2026-07-14
- Cloud Run UI reported no build information and no source information for the revision.

Artifact Registry image:

- Repository: `cloud-run-source-deploy`
- Image: `diane-ticket-extractor/diane-ticket-extractor`
- Tag: `20260714-auth`
- Digest: `sha256:b24d413d0aabc56827601ca3e77ae77153e1f084d669fb963136debd2b67b73`
- Virtual size: 72.7 MB
- Built: 2026-07-14 1:35:43 PM
- Created: 2026-07-14 1:35:50 PM

Cloud Build:

- Build ID: `aba55635-8f9e-44e4-9078-15b83a6a54c8`
- Source archive:
  `gs://infra-window-494823-r0_cloudbuild/source/1784054120.073818-ff3f2e2920054b1d93178d6d080e650d.tgz`
- Build log showed a source bundle of approximately 6 KiB.
- Docker base image: `python:3.12-slim`

## Recovered source

The exact Cloud Build source archive was downloaded and inspected read-only. It contained:

- `app.py`
- `Dockerfile`
- `requirements.txt`
- compiled Python cache

The compiled cache was not committed.

Recovered source was saved in:

- `services/diane-ticket-extractor/app.py`
- `services/diane-ticket-extractor/Dockerfile`
- `services/diane-ticket-extractor/requirements.txt`

Recovery commits:

- `3aa04e527b79c29233495fbd923897b1e1cc98f3` — recover `app.py`
- `4c473c974965ab11047d34caf7a32a626b729d2d` — recover `Dockerfile`
- `67dfeae888813055bc65bd8fd2e00ea1d3746cd3` — recover `requirements.txt`

No API key or secret was added to GitHub.

## Exact recovered service behavior

The current bridge is a small FastAPI service.

Environment-driven settings:

- `DOCUMENT_AI_PROJECT_ID`, default `413667913571`
- `DOCUMENT_AI_LOCATION`, default `us`
- `DOCUMENT_AI_PROCESSOR_ID`, default `61c933f67dba23a3`
- `DIANE_API_KEY`, no default secret value

Endpoints:

- `GET /health`
- `POST /extract/ticket`
- `GET /`

Current extraction flow:

1. Require the `X-Diane-API-Key` header.
2. Accept an uploaded file and optional `submission_id`.
3. Validate supported MIME type.
4. Send the raw document directly to the configured Document AI processor.
5. Recursively collect returned leaf entities.
6. Return field values, confidence values, and entity rows as JSON.

The current service has:

- no Airtable client
- no Airtable template lookup
- no ticket-family detection
- no template rule loading
- no configuration cache
- no rule-based validation layer
- no normalization against Diane configuration tables

## Architectural decision

The maintainable ticket-template library will live in Airtable rather than being forced into Document AI's limited prompt boxes.

The configuration model is split into:

1. `Ticket Templates` for family recognition and shared behavior.
2. `Template Field Rules` for field-specific instructions and exclusions.

Document AI remains the extraction engine. The exact integration point is not yet approved. The next phase must inspect and propose the smallest safe source diff for reading Airtable configuration without changing live behavior prematurely.

## What was not changed

- No Cloud Run deployment occurred.
- No new Cloud Run revision was created.
- No container image was built or pushed.
- No Cloud Build was retried.
- No Document AI prompt was saved.
- No Document AI field description was saved.
- No processor version was created, fine-tuned, or deployed.
- No Make scenario or mapping was changed.
- No Make schedule was enabled.
- No ticket, OCR run, OCR output, parser output, validation record, review batch, or dispatch record was changed.
- No cleaning or OCR job was rerun.
- No Airtable template or field rule was activated.

## Unresolved design questions

- Whether family recognition should use Document AI output text, returned entities, raw OCR text already stored in Airtable, or a conservative combination.
- Whether the bridge should read Airtable directly or receive a resolved template code from the caller.
- How configuration should be cached to avoid an Airtable request for every ticket.
- How credentials for Airtable should be supplied through Secret Manager or environment variables without entering source control.
- Whether template rules should influence pre-extraction prompting, post-extraction validation, or both.
- How review-routing decisions should be represented in the bridge response without breaking existing Make mappings.

## Smallest correct next step

Perform a read-only source review of the recovered service and the existing Scenario 03 request/response mapping, then propose one exact integration design and diff.

The first proposal must:

- preserve current endpoint compatibility
- preserve current response fields
- add no deployment yet
- use Airtable as configuration truth
- avoid per-ticket broad redesign
- define how a template is selected
- define how active template and field rules are fetched
- define safe failure behavior when Airtable is unavailable or no template matches
- define required environment variables and secret handling
- include a controlled single-ticket test plan before any deployment
