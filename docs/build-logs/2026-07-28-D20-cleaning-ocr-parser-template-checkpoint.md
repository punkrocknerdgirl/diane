# Diane 2.0 Cleaning, OCR, and Parser Template Checkpoint

**Date:** 2026-07-28

## Purpose

Record the verified completion of the fresh July ticket cleaning and OCR backlog, the controlled one-record parser test, and the decision to add ticket-family templates before expanding parser processing.

## Current verified state

Airtable remains the operational source of truth.

The fresh July import contains **83 Tickets**.

### Ticket cleaning

Verified directly in Airtable after repeated manual runs of the cleaning scenario:

- 83 total Tickets
- 83 have Source File ID
- 83 have Cleaned File ID
- 83 have Cleaned File URL
- all 83 are marked Cleaned
- all 83 have Send Cleaned File to OCR checked
- all 83 remain linked to the fresh Import Run

The cleaning scenario was operated manually with a practical limit of 75. The backlog was cleared by rerunning until the Airtable search returned no remaining eligible records. The Make schedule remains off.

### C - OCR Workflow

A controlled one-record test was run first and verified directly in Airtable.

The remaining OCR backlog was then processed in two manual runs:

- first run: 75 bundles
- second run: 7 bundles

Together with the original one-record controlled test, Airtable now contains:

- 83 OCR Runs
- 83 OCR Runs marked Complete
- 83 OCR Runs linked to Tickets
- 83 OCR Runs linked to OCR Outputs
- 83 OCR Outputs
- 83 OCR Outputs with Raw OCR Text populated
- no OCR error messages found during verification

The OCR workflow limit is intentionally left at 75 because ordinary weekly volume is expected to remain below 75 for now. A second manual run can catch any overflow. The present 83-ticket backlog existed because the transactional database was wiped and repopulated from the July 1 cutoff.

### D - Document AI Extractor

A controlled one-record parser test was run and verified directly in Airtable.

Parser Output created:

- Parser Run ID / Name: `INTAKE_MOTIVE_1038202041_1038202043`
- linked Ticket: `INTAKE_MOTIVE_1038202041_1038202043`
- linked OCR Output: `OUT_OCR_INTAKE_MOTIVE_1038202041_1038202043_2026-07-28T18:46:15.591Z`
- Parser Status: Needs Review
- Parsed Ticket Number: `405258`
- Parsed Truck: `wright1`
- Parsed Material: `tan base`
- Parsed Quantity: `25.68`
- linked Validation Queue record: `VAL_INTAKE_MOTIVE_1038202041_1038202043`

Fields not confidently extracted, including broker, driver, date, rate, and total, were left blank rather than invented.

## Technical findings

The parser scenario takes noticeably longer than the cleaning or OCR scenarios. The current evidence supports that the external AI or Document AI extraction call is the primary runtime cost.

Adding more Airtable output mappings should have little effect on runtime. Adding modest template-specific instructions may add a small amount of prompt overhead, but the expected primary benefit is improved extraction consistency. A recognized ticket-family path may later reduce ambiguity, retries, review cleanup, and possibly runtime or cost, but no speed improvement has yet been measured.

## Ticket families visible in the current OCR corpus

The current 83-ticket corpus includes recognizable active ticket families suitable for initial templates:

- Canfield Materials
- CEMEX
- Texas Crushed Stone
- Heidelberg Materials
- Nemo Aggregates
- GP Wright / Michels haul sheets

These current, active formats should be used first. Additional or returning brokers can be added or re-added as they come online.

## Decision and architectural direction

The next parser improvement will be **ticket-family templates** rather than a single broad generic extraction prompt.

Each template should define, at minimum:

- how the ticket family is recognized
- expected labels or locations for ticket number
- ticket date
- truck
- driver
- broker or customer
- material
- quantity
- origin
- destination
- PO number
- work order or order number
- rate and total when present
- fields normally absent from that format
- fallback behavior when confidence is insufficient

Unknown or uncertain values must remain blank and route to Needs Review. Templates must not invent data.

The immediate goal is not to support every historical broker. Start with the active formats represented in the current corpus, then extend the template set as more brokers come online.

## What was not changed

- No Make scenario configuration was changed during this checkpoint.
- No Airtable schema was changed.
- No Airtable records were manually edited by ChatGPT.
- No Apps Script source, version, or deployment was changed.
- No Google Sheets architecture was restored.
- No Make schedule was enabled.
- No application source changes were made.

## Guardrails

- Stay in chat unless Ernie explicitly asks to switch to Work.
- Work one step at a time.
- Diagnose before changing anything.
- Airtable is the operational source of truth.
- Do not restore Google Sheets as the final architecture.
- Do not modify Make unless explicitly requested.
- Show the exact proposed action or mapping change before modifying live code or data.
- Do not claim a deployment, commit, test, scenario run, or live-data change unless verified.
- Keep Make schedules off unless explicitly approved.
- Use controlled single-record tests before expanding parser scope.
- Do not rerun completed cleaning or OCR work.

## Smallest correct next step

Open and inspect the current **D - Document AI Extractor** scenario in read-only mode and document its existing modules, routing, prompt, and Airtable writes.

Then propose the smallest template-selection design for the active ticket families without changing the scenario yet. The first implementation should use one known family and one controlled ticket before expanding to the remaining formats.
