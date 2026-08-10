# Diane 2.0 Checkpoint: Canfield Batch Scenarios A–D, OCR Numeric Bug, Manual Straggler Patch

**Date:** 2026-08-10
**Repo/checkout:** `/Users/erniehathaway/Projects/diane`

## Purpose

Run a fresh 29-ticket Canfield Materials batch (Import Run `MOTIVE_LIVE_SCENARIO_A_20260810`, `recXNM4qOAa1qHuWq`) through the full Scenarios A→D pipeline. The batch replaced a garbled batch deleted last session — this was a clean re-scan. Also: identify and root-cause a new silent failure mode discovered mid-session on Scenario D, and manually patch the one straggler ticket it produced.

## Verified state

- **Scenario A (Ingest):** 29 Tickets created before this session started. Motive Document IDs `1048296560`–`1048300344`. Import Run status: Completed. Confirmed on inspection.
- **Scenario B (Clean Ticket Images):** All 29/29 tickets show `Clean Status: Cleaned` with populated `Cleaned File ID`. Completed on schedule before this session; confirmed on inspection.
- **Scenario C (Raw OCR):** Run manually this session. Verified 29/29 tickets each received exactly one `OCR Runs` + one `OCR Outputs` record with sequential timestamps, no gaps or duplicates.
- **Scenario D (Document AI Extractor):** Run manually. 28/29 tickets completed before a 40-second HTTP timeout (`timeout of 40000ms exceeded` on the Cloud Run extractor call). The `builtin:Ignore` error handler on module 13 ("Create Parser Output") let the run continue — it reported `success` overall. The straggler ticket (`INTAKE_MOTIVE_1048296560_1048296563`) was left mid-pipeline with no Parser Output or Validation Queue record.
- **Root cause identified:** Two follow-up re-runs of Scenario D each reported `status: success` with only ~5 operations — looked like "nothing to do" but was actually module 13 hitting a `BundleValidationError` on the `fldoQW2Tml3UzoC7Z` (Extracted Quantity) Airtable field. Raw OCR text contained `"23.88, tn"` — a stray trailing comma after the tonnage value — which the Cloud Run extractor (`diane-ticket-extractor`) passed through unsanitized. Airtable's number cast rejected it outright. The `builtin:Ignore` handler swallowed the error silently.
- **Manual patch applied:** Parser Output record `recy0mp0kbbyDqvXl` (actionId `actta0xbplZQg4cDM`) and Validation Queue record `recbGy1ptuQ9ngYQc` (actionId `actwyRpMQnAv844Dv`) created manually for the straggler ticket with the corrected quantity value `23.88`. Ticket status updated to `Needs Review`.
- **End state:** All 29/29 tickets confirmed at `Ticket Status: Needs Review` with complete Parser Output and Validation Queue chains. A→D pipeline: complete.
- **Scenario E:** Not yet run on this batch.

## What changed this session

- Scenario C and D run manually on the 29-ticket Canfield batch (`recXNM4qOAa1qHuWq`).
- One straggler ticket (`INTAKE_MOTIVE_1048296560_1048296563`) manually patched: Parser Output and Validation Queue records created by hand with the corrected value `23.88`.
- New bug identified and documented: silent numeric-field sanitization failure in Scenario D (see bug entry below; added to `docs/build-logs/diane-2.0-bugs.md` — **reported, not yet confirmed committed**).
- Architecture direction decided: webhook-chained scenarios (Option 3) preferred for pipeline automation, but explicitly deferred — not yet built.

## What was NOT changed

- No edits to Scenario D's Make.com modules — the `builtin:Ignore` handler was observed, not modified.
- No changes to the Cloud Run extractor (`diane-ticket-extractor`) — the numeric sanitization fix is documented as a future requirement, not implemented.
- Scenarios A, B untouched — confirmed complete on inspection, not re-run.
- No other Airtable records modified beyond the two manually created for the straggler.
- Scenario E not run — next step, not this session.
- No pipeline automation built — explicitly deferred pending at least 2–3 clean A→E batches and the numeric sanitization fix.

## New bug documented

**BUG: Scenario D silently fails tickets when OCR output contains stray punctuation in numeric fields**

- **Location:** Scenario D (`5251400`), module 13 (Airtable — Create Parser Output)
- **Symptom:** `BundleValidationError` on field `fldoQW2Tml3UzoC7Z` (Extracted Quantity); the `builtin:Ignore` error handler on module 13 swallows it silently. Run reports `success` with suspiciously low operation count (~5). Ticket never reaches Validation Queue.
- **Root cause:** Google Cloud Vision OCR occasionally appends stray characters to extracted numeric values (confirmed case: trailing comma, `"23.88,"`). The Cloud Run extractor passes these through unsanitized; Airtable's number cast rejects the malformed string.
- **Fix needed (not yet built):** Sanitize numeric fields (quantity_tons, and likely rate/total once wired) in the Cloud Run extractor before returning — extractor-side is more durable, protects all numeric fields uniformly. A Make-side regex substitution in module 13's mapper is an alternative but less complete solution.
- **Pipeline automation blocker:** This bug must be fixed before any automated chaining is built — an unattended pipeline has no alert path for this failure mode, it silently drops the ticket.
- **Workaround used this session:** Manual Airtable record creation (see actionIds above).

## Guardrails

Session-specific carry-forwards:

- All Make scenarios are run manually via "Run once" — none stay activated between uses. This is a deliberate operating pattern. Do not suggest activating scenarios as a default action.
- Do not build webhook-chained pipeline automation until: (1) numeric sanitization bug is fixed in the extractor, and (2) at least 2–3 full A→E batches have run clean without manual intervention.
- Wright 1 vs. Wright 3 truck assignment is unresolved for this batch — no automated logic yet distinguishes the two beyond OCR text. Flag explicitly when Scenario E runs.
- Checkpoint and build-log system: `.md` files in `docs/build-logs/`, not ClickUp. ClickUp connector reliability was the stated reason.

### Standing Diane guardrails (carried forward every checkpoint)

- Diagnose before changing anything.
- Work one exact step at a time when interacting with Ernie during the actual build.
- Preserve existing architecture and proven behavior unless redesign is explicitly requested.
- Do not change production Make modules or logic without explicit approval.
- Do not claim code was committed, pushed, deployed, tested, or verified unless it actually occurred — verified and reported-but-unverified are different categories.
- Protect client data and credentials — never expose API keys, PATs, tokens, or secrets in chat, logs, commits, or commands that echo them.
- Airtable remains the operational source of truth.
- Do not restore Google Sheets as the final architecture.
- Local checkout and GitHub main should stay in sync — build logs are written locally first, then pushed, never edited directly on GitHub.

## Next step

Run Scenario E ("Build Review Batches") on this 29-ticket Canfield batch. Before running: surface the Wright 1 vs. Wright 3 truck-assignment split — this is the first batch to include the new Wright 3 truck, and no automated logic yet distinguishes the two trucks beyond OCR text. Review the dispatch matching logic against known Canfield job aliases and confirm which truck-dispatch pairings are expected before letting Scenario E batch them.
