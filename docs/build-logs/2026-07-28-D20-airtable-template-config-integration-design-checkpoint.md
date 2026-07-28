# Diane 2.0 Airtable Template Config Integration Design Checkpoint

**Date:** 2026-07-28

## Purpose

Record the read-only review of the recovered `diane-ticket-extractor` service, the live Make request and response mappings, and the completed design decisions for adding Airtable-backed ticket template recognition and post-extraction validation without breaking the current pipeline.

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
- Avoid repeatedly processing old records or relying only on duplicate gates when timestamps, statuses, checkpoints, cached configuration, or stored reusable results can prevent unnecessary work and credit usage.
- Capture reusable structure when it will save real time, credits, or headaches soon enough to matter, but do not build speculative infrastructure.
- In deadline mode, prioritize completion and blockers over polish.

## Repository and starting checkpoint

Repository:

- `punkrocknerdgirl/diane`

The design review began from:

- `docs/build-logs/2026-07-28-D20-airtable-ticket-template-library-and-extractor-source-recovery-checkpoint.md`
- checkpoint commit `e1f39b9850f8641fcafb13dffb09e9b061fba206`

This checkpoint was initially committed as:

- `dbd4b6dc6635f6631e66b08995052dc0354f738d`
- `Document Airtable template config integration design checkpoint`

## Verified recovered service source

Recovered files inspected read-only:

- `services/diane-ticket-extractor/app.py`
- `services/diane-ticket-extractor/Dockerfile`
- `services/diane-ticket-extractor/requirements.txt`

### Current `POST /extract/ticket` behavior

The current endpoint:

1. Requires `X-Diane-API-Key`.
2. Accepts a multipart uploaded `file`.
3. Accepts optional form field `submission_id`.
4. Reads the uploaded file into memory.
5. Rejects an empty upload.
6. Resolves and validates MIME type.
7. Accepts PDF, JPEG, PNG, TIFF, and WebP.
8. Sends the raw document directly to the configured Document AI processor.
9. Recursively collects returned leaf entities.
10. Returns extracted fields, confidence values, and entity rows.

The service currently uses:

- `response.document.entities`

It does not currently use:

- `response.document.text`

### Current response contract

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

Repeated entity types become lists after the second value. This behavior must be preserved.

### Current service omissions

The recovered source has:

- no Airtable client
- no Airtable template lookup
- no ticket-family detection
- no linked rule loading
- no configuration cache
- no post-extraction validation layer
- no Diane normalization logic

## Verified Make state

Scenario:

- `D - Document AI Extractor`

The Make schedule was visibly off during inspection.

No Make module was changed.

### Module 5 request

Verified request:

- URL: `https://diane-ticket-extractor-413667913571.us-central1.run.app/extract/ticket`
- method: `POST`
- header: `X-Diane-API-Key`
- body: `multipart/form-data`

Multipart fields:

- `file`
  - data from Module 24 `file_data`
  - filename from Module 24 `file_name`
- `submission_id`
  - Module 12 `Ticket Key`
- `cleaned_file_id`
  - Module 24 `selected_file_id`

The recovered FastAPI endpoint formally declares only `file` and `submission_id`.

`cleaned_file_id` is currently tolerated but not read or returned. Do not change that Make field yet.

### Module 13 verified mapping

Table:

- `Parser Outputs`

Mappings:

- Name: Module 5 `submission_id`
- Parser run ID: Module 5 `submission_id`
- OCR Output: Module 12 `OCR Outputs[]`
- Ticket: Module 12 record ID
- Parser Status: `Needs Review`
- Parsed Ticket Number: Module 5 `data.data.fields.ticket_number`
- Parsed Truck: Module 5 `data.data.fields.truck`
- Parsed Material: Module 5 `data.data.fields.material`
- Parsed Quantity: Module 5 `data.data.fields.quantity_tons`

### Module 14 verified mapping

Table:

- `Validation Queue`

Mappings:

- Validation ID: `VAL_` plus Module 5 `submission_id`
- Parser Output: Module 13 record ID
- Ticket: Module 12 record ID
- Review Status: `Pending Review`
- Final Ticket Number: Module 5 `data.data.fields.ticket_number`
- Final Truck: Module 5 `data.data.fields.truck`
- Final Material: Module 5 `data.data.fields.material`
- Final Quantity: Module 5 `data.data.fields.quantity_tons`

## Compatibility requirement

The following existing response paths must remain valid:

- `data.fields.ticket_number`
- `data.fields.truck`
- `data.fields.material`
- `data.fields.quantity_tons`

Preserve:

- `ok`
- `submission_id`
- `filename`
- `mime_type`
- `data.fields`
- `data.confidence`
- `data.entities`

Template and validation output must be additive, using new sibling properties unless a later Make change is separately approved.

## Completed design decisions

The design review was completed one decision at a time. No source diff has yet been drafted or approved.

### 1. Responsibility boundary

Template logic belongs in Cloud Run, not Make.

Make remains responsible for:

- orchestration
- Airtable operational record creation

Cloud Run becomes responsible for:

- ticket-family recognition
- template rule interpretation
- post-extraction validation
- additive template and review metadata

### 2. Cache and failure behavior

Approved behavior:

1. Use fresh cached active configuration when available.
2. Refresh from Airtable only when the cache expires.
3. If refresh fails and an older cache exists, use it and mark it stale.
4. If refresh fails and no cache exists, continue normal Document AI extraction without template validation.
5. Never block extraction solely because Airtable configuration is unavailable.

Airtable remains the configuration source of truth without becoming a mandatory synchronous dependency for every ticket.

### 3. Ticket-family recognition inputs

Recognition will use:

- `response.document.text`
- extracted entity values

Only active Airtable Ticket Templates are eligible.

The service should make a best working guess when there is meaningful evidence. Weak or close matches may still proceed, but must be marked low confidence.

`no_match` is reserved for cases where every active template scores zero or there is no meaningful evidence.

### 4. Post-extraction rule timing

Document AI completes normal extraction first.

Cloud Run then applies the matched template's active field rules to:

- extracted fields
- entities
- document text

Rules may:

- validate
- normalize
- flag
- suggest values

In the first version, rules do not overwrite `data.fields`.

### 5. Additive response metadata

Add optional sibling objects under `data`:

```json
{
  "data": {
    "fields": {},
    "confidence": {},
    "entities": [],
    "template": {},
    "validation": {}
  }
}
```

`data.template` may report:

- template match status
- matched template ID or name
- ticket family
- confidence label
- configuration freshness
- deterministic configuration version

`data.validation` may report:

- overall validation status
- fields needing review
- useful suggestions
- failed rule identifiers
- safe warning categories

The payload must remain lean. It must not duplicate full document text, full entity lists, Airtable records, unchanged values, or raw internal errors.

### 6. Configuration and secret boundary

Store the Airtable access token in Google Secret Manager.

Keep only nonsecret settings in Cloud Run configuration, including:

- Airtable base ID
- Ticket Templates table ID
- Template Field Rules table ID
- cache TTL

Do not hardcode or commit the Airtable token.

Do not expose secret values in logs or responses.

If required settings are unavailable, continue ordinary extraction without template validation.

### 7. Configuration status values

Approved status values under `data.template`:

- `matched`
- `no_match`
- `config_stale`
- `config_unavailable`

These statuses distinguish template mismatch from configuration failure without exposing internal details.

### 8. Individual rule failure behavior

Each active rule runs independently.

If one rule is malformed or cannot be evaluated:

- mark that rule `error`
- continue running remaining rules
- preserve original extraction output
- return only the failed rule identifier and a safe error category
- do not return raw Airtable responses or stack traces
- do not fail the full ticket extraction

### 9. Suggestions and unnecessary data

Keep original extracted values in `data.fields`.

Return a suggestion only when it differs from the original and is useful for review.

A suggestion should contain only what is needed:

- target field
- suggested value
- rule identifier

Do not duplicate full document text, full entity data, or unchanged values inside validation metadata.

These suggestions are response metadata only. Do not create new permanent Airtable records or additional storage unless separately approved later.

### 10. First-version rule scope

Support only the rule types Diane currently needs:

1. required or expected field
2. expected text or pattern
3. allowed value or alias
4. normalization suggestion
5. Document AI confidence threshold

Do not build a generalized rule language or speculative rule engine.

### 11. Missing business fields never block processing

Very few fields should be treated as required for review purposes, and no business-data field is blocking in the first version.

Missing fields may create review flags, but extraction continues.

This includes:

- ticket number
- truck
- material
- quantity
- date
- driver
- broker
- rate
- total

Only genuine technical failures such as a missing upload, invalid API key, unsupported file type, or complete Document AI failure may stop processing.

### 12. Minimal validation payload

Return only:

- overall status
- fields needing review
- useful suggestions
- failed rule identifiers
- safe warning categories

Do not return:

- full document text
- duplicate entities
- Airtable records
- unnecessary template internals
- raw error dumps

### 13. Stable Diane field keys

Each Template Field Rule targets a stable Diane key, for example:

- `ticket_number`
- `truck`
- `material`
- `quantity_tons`
- `ticket_date`
- `driver`
- `broker`
- `rate`
- `total`

Rules must not depend on Airtable display labels, field order, Make module positions, or unstable Document AI wording.

### 14. Single-template matching

Use one template's rule set per ticket.

When multiple templates are plausible:

- select the highest-scoring template as the working guess
- do not merge rules from multiple templates
- mark close or weak matches low confidence
- keep processing

### 15. Confidence labels

Use only:

- `high`
- `low`

A low-confidence match still:

- applies the selected template's rules
- continues through the pipeline
- reports the template guess
- adds one review warning

It does not trigger a rerun, separate scenario, historical Airtable lookup, or additional paid processing.

### 16. Cache scope

Each Cloud Run instance caches only:

- active Ticket Templates
- active Template Field Rules
- load time
- freshness or staleness state
- deterministic configuration version

Do not cache:

- ticket records
- OCR Outputs
- Parser Outputs
- Validation Queue records
- uploaded files
- prior extraction responses

### 17. Cache refresh timing

Default cache TTL:

- five minutes

This is not a scenario or extraction timeout.

A Make scenario may run much longer than five minutes. Each ticket uses the configuration available when that extraction request begins.

Approved refresh behavior:

- first request after expiration initiates refresh
- the last good cache may continue serving active requests during refresh
- other requests may also use the last good cache
- later requests use the refreshed configuration after a successful refresh
- no ticket changes configuration halfway through processing
- no scheduled background polling
- no separate Make refresh job

### 18. Deterministic configuration version

Return a short `data.template.config_version` based on normalized active configuration contents.

Inputs include only configuration that can affect processing:

- active Ticket Template record IDs
- active Template Field Rule record IDs
- relevant recognition values
- rule values and thresholds
- links between templates and rules

Do not include:

- cache load time
- modified timestamps by themselves
- inactive records
- ticket data
- OCR text
- credentials

The same active configuration must produce the same version across refreshes and Cloud Run instances.

### 19. First-version Airtable bundle shape

Cloud Run reads only the active fields needed for recognition and validation.

Ticket Templates:

- Airtable record ID
- active status
- template name
- ticket family key
- recognition phrases or identifiers
- optional priority
- linked Template Field Rules

Template Field Rules:

- Airtable record ID
- active status
- linked template
- target Diane field key
- rule type
- rule value or pattern
- required or expected flag
- minimum confidence when used
- normalization suggestion when used

Ignore display-only notes, historical fields, and unrelated metadata.

### 20. First-version ticket-family scoring

Use transparent weighted scoring:

- add points for configured recognition phrases found in document text
- add points for configured identifiers found in extracted entities
- give highly specific identifiers stronger weight than broad words
- use the highest-scoring active template as the working guess
- mark the result `high` when the score clears the selected threshold
- otherwise mark it `low`
- return `no_match` only when every template scores zero

Do not add a machine-learning layer or opaque fuzzy-scoring system in the first version.

### 21. Controlled single-ticket test plan

Use one existing ticket that already has:

- completed cleaning
- completed OCR
- a known source file
- a recognizable ticket family
- no need to rerun earlier paid steps

Run the Make scenario manually once with the schedule still off.

Verify:

1. Existing response paths remain valid.
2. A template is selected as `high` or `low`.
3. Expected rules run.
4. Suggestions and review flags appear only in additive metadata.
5. Parser Outputs and Validation Queue continue receiving the same current fields.
6. No duplicate records, extra OCR work, or repeated cleaning occurs.
7. No broader batch runs until the single ticket is inspected end to end.

## Broader operating doctrine

Agreed principle:

> Capture reusable structure, not reusable clutter.

Decision filter:

> Will this save real time, credits, or headaches soon enough to matter?

For Diane:

- avoid repeatedly scanning or processing old records when a timestamp, status, checkpoint, cache, or stored result can narrow the work
- avoid rerunning known data through paid steps and relying only on duplicate gates
- store durable reusable information such as template rules, aliases, normalized values, and proven mappings
- prefer one capable reusable component over several disconnected weaker copies when there is a real current use
- do not generalize early merely because future reuse is technically possible
- when invoices or another real deadline are active, stay narrow and prioritize completion

## What was not changed

- No application source was edited.
- No source diff was drafted or applied.
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

Draft the exact proposed source diff for the recovered Cloud Run service without applying it.

The diff should be limited to the smallest first implementation of the approved design and should identify any required dependency-file changes.

Before editing source, building an image, changing Cloud Run configuration, creating or modifying a secret, changing Airtable, changing Make, or running a ticket:

1. inspect the current recovered service files from GitHub
2. inspect the active Airtable Ticket Templates and Template Field Rules field names and IDs read-only if needed to make the diff accurate
3. draft and show the exact proposed diff
4. stop for Ernie's approval

Do not implement, deploy, configure, or test anything in the same step as drafting the diff.
