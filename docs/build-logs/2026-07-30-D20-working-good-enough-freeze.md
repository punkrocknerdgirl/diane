# Diane 2.0 Working Good Enough Freeze

**Date:** 2026-07-30  
**Purpose:** Preserve a verified rollback point before continuing the Airtable template-config implementation and any future Cloud Run deployment work.

## Current verified live state

### Airtable

- Operational source of truth: `Diane 2.0`
- Live base ID: `appMWvtLU0hMBqjLC`
- Freeze duplicate created: `Diane 2.0 Working Archive`
- Freeze duplicate base ID: `app5PdGxfPYLdXTqx`
- The archive is a safety copy only.
- Do not point Make, Apps Script, Cloud Run, or any other integration at the archive unless a deliberate rollback is approved.

### Make

- Diane-related scenario blueprints were exported manually on 2026-07-30.
- The exported blueprints preserve scenario structure, modules, routes, filters, and mappings.
- Make connections are not guaranteed to be preserved by blueprint import and may require reconnection.
- No Make schedules were enabled.
- No scenarios were run as part of this freeze.

### Cloud Run

- Service: `diane-ticket-extractor`
- Region: `us-central1`
- Service URL: `https://diane-ticket-extractor-413667913571.us-central1.run.app`
- Active revision receiving traffic: `diane-ticket-extractor-00003-psb`
- Traffic allocation: `100%`
- Deployed: 2026-07-14
- Port: `8080`
- Concurrency: `80`
- Request timeout: `300 seconds`
- Maximum instances: `20`
- Startup CPU boost: enabled
- Billing: request-based
- Execution environment: default

#### Active container image

- Google Cloud project: `infra-window-494823-r0`
- Artifact Registry location: `us-central1`
- Repository: `cloud-run-source-deploy`
- Image: `diane-ticket-extractor/diane-ticket-extractor`
- Digest: `sha256:b24d413d0aabca56827601ca3e77ae77153e1f084d669fb963136debd2b67b73`
- Tag: `20260714-auth`
- Build ID: `aba55635`
- Built: 2026-07-14 1:35:43 PM
- Created: 2026-07-14 1:35:50 PM

This revision and image are the verified live rollback target for the ticket extractor.

### Apps Script review application

- Active deployment description: `Fix ticket detail layout and restore refresh state`
- Active deployed version: `96`
- Deployment date: 2026-07-26 11:43 PM
- Deployment ID: `AKfycbzzjkCqwsiCO7vahT1BJn6S4fArwA5dTtsoVEmEz9c05i8P9RTprU0tZ0OKvp2prfc`
- Executes as: `ernie@prngbooks.com`

The Apps Script GitHub repository contains newer source than the verified live deployment. Do not assume repository `main` is identical to deployed version 96.

## GitHub source state

### General Diane repository

Repository: `punkrocknerdgirl/diane`

Verified extractor source recovery commits:

- `3aa04e527b79c29233495fbd923897b1e1cc98f3` - Recover deployed Diane ticket extractor source
- `4c473c974965ab11047d34caf7a32a626b729d2d` - Recover deployed Diane ticket extractor Dockerfile
- `67dfeae888813055bc65bd8fd2e00ea1d3746cd3` - Recover deployed Diane ticket extractor dependencies

Verified pre-template-integration repository checkpoint:

- `659f865f536dabc2cec5a528868bc455de4860ea` - Revert partial template config dependency update

Approved Airtable template-config source changes now on `main`:

- `711a6b79e2442a711c2049c9b8d7dd6611b974d4` - Implement Airtable template config integration
- `185df1a89285d525012d2a1b36f94046c0330178` - Add Airtable template config dependency

Important distinction:

- The new template-config code is stored in GitHub.
- It has not been built into a new container image.
- It has not been deployed to Cloud Run.
- The live Cloud Run service still runs revision `diane-ticket-extractor-00003-psb` using the verified July 14 image digest above.

### Apps Script repository

Repository: `punkrocknerdgirl/diane-apps-script`

Current verified repository head observed during this freeze:

- `544e0626a6e4e3349ea2a6b1d316936191c976f2` - Save final destination

That source change was committed but was not verified as deployed. The verified live web app remains deployment version 96.

## Airtable template configuration state

- Ticket Templates table ID: `tblAVz20h5VEsaF5u`
- Template Field Rules table ID: `tblGnGiSwhbBhnywH`
- The current Canfield Materials template record is `Draft`.
- All nine linked template field-rule records are `Draft`.
- The new extractor code filters to `Active` templates and `Active` rules only.
- Therefore the current draft configuration would not activate template matching even after a future deployment unless the records are separately changed to `Active`.

No template or rule statuses were changed during this work.

## Work completed before this freeze

- Recovered the deployed ticket-extractor source, Dockerfile, and dependencies into GitHub.
- Designed the Airtable template-config integration.
- Verified Airtable base, table, and field IDs used by the design.
- Added the approved template-config implementation to GitHub source.
- Added `httpx` to the extractor requirements.
- Exported Make scenario blueprints.
- Duplicated the Airtable base with records.
- Captured the exact live Cloud Run revision and image digest.
- Captured the exact live Apps Script deployment ID and version.

## What was not changed

- No new Cloud Run image was built.
- No new Cloud Run revision was deployed.
- Cloud Run traffic was not changed.
- Cloud Run environment variables were not changed.
- Secret Manager was not changed.
- Airtable schema was not changed during the freeze.
- Airtable template or rule statuses were not changed.
- No Airtable operational records were modified as part of the freeze.
- No Make scenario was modified during the freeze.
- No Make schedule was enabled.
- No Make scenario was run.
- No Apps Script version or deployment was created or changed.
- No tickets were processed, reprocessed, cleaned, or OCRed during the freeze.

## Rollback plan

Use this only if the new implementation must be abandoned and the existing working path restored.

### Cloud Run rollback

1. Open Cloud Run service `diane-ticket-extractor` in region `us-central1`.
2. Open **Manage traffic**.
3. Route `100%` traffic to revision `diane-ticket-extractor-00003-psb`.
4. Verify the revision uses image digest:
   `sha256:b24d413d0aabca56827601ca3e77ae77153e1f084d669fb963136debd2b67b73`
5. Confirm the service URL responds successfully before running any Make scenario.

### Apps Script rollback

1. Open the Diane Apps Script project.
2. Open **Deploy -> Manage deployments**.
3. Select deployment ID:
   `AKfycbzzjkCqwsiCO7vahT1BJn6S4fArwA5dTtsoVEmEz9c05i8P9RTprU0tZ0OKvp2prfc`
4. Confirm the active web app is version `96`.
5. Do not create a new deployment unless a code rollback is deliberately required.

### Make rollback

1. Keep all schedules off.
2. Import the exported blueprint for the required scenario only if the live scenario has been changed and cannot be safely repaired in place.
3. Reconnect services carefully because blueprint imports may not preserve connections.
4. Verify every connection, filter, mapped field, and scenario schedule before any run.
5. Run one controlled ticket only.

### Airtable rollback

1. Do not redirect integrations to the archive casually.
2. Use `Diane 2.0 Working Archive` only as a reference or emergency restoration source.
3. If live operational records must be restored, compare the archive and live base first and define the exact record scope.
4. Do not replace configuration tables, schema, views, interfaces, formulas, or automations under the phrase "wipe the base."
5. Make only an explicitly approved, controlled restoration.

## Guardrails

- Stay in chat unless the user explicitly asks to switch to Work.
- Work one step at a time.
- Diagnose before changing anything.
- Airtable is the operational source of truth.
- Do not restore Google Sheets as the final architecture.
- Do not modify Make unless explicitly requested.
- Show the exact proposed action or diff before modifying live code or data.
- Do not claim a deployment, commit, test, scenario run, or live-data change unless verified.
- Keep all Make schedules off unless explicitly approved.
- Use a controlled single-ticket test before expanding scope.
- Do not rerun completed cleaning or OCR work.
- Do not expose or commit credentials, API keys, Airtable tokens, or other secrets.
- Preserve the verified live rollback targets recorded in this document until the replacement path has passed controlled testing.

## Smallest correct next step

Before deploying the Airtable template-config source:

1. Inspect the current Cloud Run environment-variable and secret mappings read-only.
2. Show the exact proposed additions for Airtable configuration and secret mapping.
3. Do not change Cloud Run yet.
4. After approval, build and deploy a new revision without immediately moving production traffic if the deployment method allows it.
5. Verify startup and health.
6. Run one controlled ticket with all Airtable template and rule records still `Draft` to prove the existing extraction response remains compatible.
7. Only after that compatibility test should template activation be considered separately.
