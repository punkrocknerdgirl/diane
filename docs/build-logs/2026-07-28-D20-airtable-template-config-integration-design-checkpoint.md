# Diane 2.0 Airtable Template Config Integration Design Checkpoint

**Date:** 2026-07-28

## Purpose

Record the read-only review of the recovered `diane-ticket-extractor` service, the live Scenario 03 Make request and response mappings, the resulting smallest safe Airtable configuration architecture, and the operating principles agreed during the design review.

## Guardrails

- Stay in chat unless Ernie explicitly asks to switch to Work.
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
- Do not expose or commit API keys, Airtable tokens, secrets, or credentials.
- Avoid repeatedly processing old records or relying on duplicate gates when timestamps, statuses, checkpoints, cached configuration, or stored reusable results can prevent unnecessary work and credit usage.
- Capture reusable structure when it will save real time, credits, or headaches soon enough to matter, but do not generalize or build speculative infrastructure that is not currently needed.
- In deadline mode, prioritize completion and blockers over polish. Meticulous cleanup and optional refinement belong in low-pressure maintenance time.

## Starting checkpoint

The session began from:

- `docs/build-logs/2026-07-28-D20-airtable-ticket-template-library-and-extractor-source-recovery-checkpoint.md`
- checkpoint commit `e1f39b9850f8641fcafb13dffb09e9b061fba206`

The repository used throughout was:

- `punkrocknerdgirl/diane`

## Verified recovered service source

The following recovered files were inspected read-only:

- `services/diane-ticket-extractor/app.py`
- `services/diane-ticket-extractor/Dockerfile`
- `services/diane-ticket-extractor/requirements.txt`

### Current `POST /extract/ticket` request path

The current endpoint:

1. Requires the `X-Diane-API-Key` header.
2. Accepts a multipart uploaded `file`.
3. Accepts optional form field `submission_id`.
4. Reads the entire upload into memory.
5. Rejects an empty upload.
6. Resolves MIME type from the supplied content type or filename extension.
7. Accepts PDF, JPEG, PNG, TIFF, and WebP.
8. Sends the raw document directly to the configured Document AI processor.
9. Recursively collects returned leaf entities.
10. Returns extracted fields, confidence values, and entity rows.

The service currently processes `response.document.entities` but does not use `response.document.text`.

### Current response contract

Successful responses currently preserve this shape:

```json
{
  "ok": true,
  "submission_id": "...",
  "filename": "...",
  "mime_type": "...",
  "data": {
    "fields": {},
    "confidence": {},
    "entities": []
  }
}
```

Repeated entity types become lists after the second value. This is current effective behavior and must be preserved.

### Current service failure paths

- Missing configured `DIANE_API_KEY`: HTTP 500.
- Missing or incorrect request key: HTTP 401.
- Missing multipart file: FastAPI validation failure, normally HTTP 422.
- Empty upload: HTTP 400.
- Unsupported MIME type: HTTP 400.
- Document AI `GoogleAPICallError`: HTTP 502.
- No returned entities: successful response with empty field, confidence, and entity collections.
- Unexpected exceptions are not explicitly handled and become generic server errors.

### Current service omissions

The recovered source has:

- no Airtable client
- no Airtable template lookup
- no ticket-family detection
- no template field-rule loading
- no configuration cache
- no post-extraction validation layer
- no Diane normalization logic

The dependency file currently contains FastAPI, Uvicorn, multipart handling, and Google Document AI only.

## Verified live Scenario 03 Make mapping

The live scenario inspected was:

- `D - Document AI Extractor`

The schedule was visibly off during inspection.

No Make module was changed.

### Module 5: HTTP request to Cloud Run

Verified settings:

- URL: `https://diane-ticket-extractor-413667913571.us-central1.run.app/extract/ticket`
- Method: `POST`
- Header name: `X-Diane-API-Key`
- Body type: `multipart/form-data`
- Parse response: enabled
- Return error if request fails: enabled

Verified multipart fields:

- `file`
  - file data from Module 24 `file_data`
  - filename from Module 24 `file_name`
- `submission_id`
  - mapped from Module 12 `Ticket Key`
- `cleaned_file_id`
  - mapped from Module 24 `selected_file_id`

The recovered FastAPI endpoint formally declares only `file` and `submission_id`. The extra `cleaned_file_id` is currently not read or returned by the service. Because the live scenario has used this request successfully, the field is presently tolerated, but no Make change was approved or made.

### Module 13: create Parser Outputs record

Verified table:

- `Parser Outputs`

Verified mappings:

- Name: Module 5 `submission_id`
- Parser run ID: Module 5 `submission_id`
- OCR Output: Module 12 `OCR Outputs[]`
- Ticket: Module 12 record ID
- Parser Status: static `Needs Review`
- Parsed Ticket Number: Module 5 `data.data.fields.ticket_number`
- Parsed Truck: Module 5 `data.data.fields.truck`
- Parsed Material: Module 5 `data.data.fields.material`
- Parsed Quantity: Module 5 `data.data.fields.quantity_tons`

Currently blank in this module:

- Parsed Ticket Date
- Parsed Driver
- Parsed Broker
- Parsed Rate
- Parsed Total
- Parser Confidence Score
- Needs Human Review?
- Validation Queue

### Module 14: create Validation Queue record

Verified table:

- `Validation Queue`

Verified mappings:

- Validation ID: `VAL_` plus Module 5 `submission_id`
- Parser Output: Module 13 record ID
- Ticket: Module 12 record ID
- Review Status: static `Pending Review`
- Final Ticket Number: Module 5 `data.data.fields.ticket_number`
- Final Truck: Module 5 `data.data.fields.truck`
- Final Material: Module 5 `data.data.fields.material`
- Final Quantity: Module 5 `data.data.fields.quantity_tons`

Currently blank in this module:

- Final Ticket Date
- Final Driver
- Final Broker
- Final Rate
- Final Total
- Reviewer Notes
- Approved At

### Compatibility finding

Both downstream Airtable modules depend directly on the existing response paths under:

```text
Module 5
→ data
→ data
→ fields
```

The current field paths that must remain valid are:

- `ticket_number`
- `truck`
- `material`
- `quantity_tons`

Any Airtable-template integration must preserve:

- top-level `ok`
- top-level `submission_id`
- top-level `filename`
- top-level `mime_type`
- `data.fields`
- `data.confidence`
- `data.entities`

Template and validation metadata may only be added as new sibling properties unless a later Make change is explicitly approved.

## External architecture review

The proposed direction was checked against current Make, Airtable, and Cloud Run guidance before source design proceeded.

The resulting architecture was found sound with one important boundary:

- Cloud Run should read Airtable configuration directly.
- Airtable should not become a mandatory synchronous dependency for every extraction request.

The design should avoid querying Airtable multiple times for every ticket. Active template configuration should be loaded as a small reusable bundle and cached for a short period.

## Approved design direction so far

The design was intentionally reviewed one idea at a time.

### Decision 1: template logic belongs in Cloud Run

Keep Make responsible for orchestration and Airtable record creation.

Keep Cloud Run responsible for:

- ticket-family recognition
- template rule interpretation
- post-extraction validation
- additive template and review metadata

Do not move template recognition or rule processing into a maze of Make modules and formulas.

### Decision 2: cache reusable active configuration

Cloud Run should not call Airtable repeatedly for every ticket when a short-lived reusable configuration bundle is sufficient.

Initial direction:

- fetch active Ticket Templates and active Template Field Rules
- cache the bundle in each Cloud Run instance
- use a short initial TTL, approximately five minutes
- refresh after expiration
- avoid scanning historical operational records

Airtable remains the configuration source of truth while the cache reduces delay, API usage, repeated work, and unnecessary credits.

### Broader operating doctrine

Agreed principle:

> Capture reusable structure, not reusable clutter.

For Diane and related systems:

- avoid repeatedly scanning or processing old records when a timestamp, status, checkpoint, or stored result can narrow the work
- avoid rerunning known data through the same paid steps and relying only on duplicate gates
- store durable reusable information such as template rules, aliases, normalized values, and proven mappings
- prefer one capable reusable component over several disconnected weaker copies when there is a real current use
- do not generalize early merely because future reuse is technically possible

Decision filter:

> Will this save real time, credits, or headaches soon enough to matter?

Caveat:

- when invoices or another real deadline are active, stay narrow and prioritize completion
- when there is no urgent deadline and Ernie is intentionally doing low-brain maintenance or exploratory work, meticulous cleanup and small reusable refinements are acceptable

## Proposed but not yet approved in detail

The following direction was discussed but no exact source diff has yet been produced or approved:

- recognize ticket family conservatively from Document AI text plus returned entities
- do not fetch historical OCR text from operational Airtable records during each extraction
- initially apply template rules after Document AI extraction rather than attempting dynamic pre-extraction prompting
- add optional `data.template` and `data.validation` response objects while leaving existing response fields untouched
- fail open for Airtable configuration problems:
  - use cached configuration when available
  - continue ordinary Document AI extraction when no cache is available
  - record no-match or configuration-unavailable metadata rather than blocking extraction
- supply the Airtable access token through Secret Manager
- keep nonsecret Airtable table and cache settings in service configuration

These are design directions only. They have not been implemented, committed as application source, deployed, or tested.

## What was not changed

- No application source was edited.
- No source diff was applied.
- No container image was built or pushed.
- No Cloud Run revision was created.
- No Cloud Run traffic was changed.
- No live service configuration was changed.
- No Secret Manager secret was created or changed.
- No Airtable schema or record was changed.
- No Ticket Template or Template Field Rule was activated.
- No Make module or mapping was changed.
- No Make schedule was enabled.
- No scenario was run.
- No ticket was processed or reprocessed.
- No completed cleaning or OCR work was rerun.
- No API key, Airtable token, credential, or secret was exposed or committed.

## Smallest correct next step

Continue the architecture review one decision at a time before drafting code.

The next single decision is:

**Define safe behavior when Cloud Run needs template configuration.**

Specifically decide whether this behavior is correct:

1. Use fresh cached active configuration when available.
2. Refresh from Airtable only when the cache expires.
3. If Airtable refresh fails and an older cache exists, use the older cache and mark it stale.
4. If Airtable refresh fails and no cache exists, continue normal Document AI extraction without template validation.
5. Never block extraction solely because Airtable configuration is unavailable.

After Ernie approves that behavior, continue to the next single design decision. Do not produce the full source diff until the design has been reviewed at Ernie's requested pace.
