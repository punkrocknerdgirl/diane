# Diane 2.0 Checkpoint: Final Total Fix, Canfield Batch Processing, Dispatch Matcher Debugging

**Date:** 2026-08-09
**Repo/checkout:** `/Users/erniehathaway/Projects/diane`

## Purpose

Live Diane 2.0 build/test session covering three threads: (1) fixing a dead Final Total field on Validation Queue, (2) running 29 new Canfield Materials tickets through Scenarios A→E, and (3) testing the previously-built, never-used Dispatch-matching engine inside Scenario E ("Build Review Batches") — which surfaced a matcher inconsistency that stopped the session mid-investigation.

## Verified state

- **Final Total field:** `fldLfatXbIkD7V17z` on Validation Queue converted from a dead currency field to a formula field (Final Quantity × Final Rate). Old field preserved and renamed to "Final Total (Legacy)," left unused. Confirmed by Ernie live in Airtable.
- **29 Canfield Materials tickets:** ran through Scenarios A→E. 27 auto-processed cleanly. 2 required manual reconstruction of Parser Output + Validation Queue records because Document AI choked on non-numeric OCR garbage in the quantity field (e.g. "2877.11 to / 25.44 in TONS"); both fixed by reading the ticket image directly. Confirmed live.
- **Dispatch-matching engine:** confirmed to already exist inside Scenario E — tokenizes Job/Customer/Destination fields on Active Dispatches records (strips punctuation, splits on non-alphanumeric, ignores filler words like TX/LLC/INC) and requires ALL tokens from a Dispatch field to appear in a ticket's raw OCR text; first match wins and groups matched tickets into a shared Review Batch instead of one-per-ticket.
- **Dispatches table seeded:** ~12 Active records added (base `appMWvtLU0hMBqjLC`, table `tblnXClSQImZ22vCG`) covering known job aliases: "Michels Data Hubbard" (5-6 phrasings, with/without apostrophe), "Ash Grove" (3), "Sinacola" (2), "Tiseo" (2).
- **Matcher test run:** tonight's 29 solo Draft batches were deleted and Scenario E re-run. Result: only 1 of 29 tickets matched (against a Dispatch with Job = "Michel's Data"). The other 28 — confirmed via direct OCR text pull to be effectively identical text ("Michels data" / "Hillsboro S&G", all one job) — fell through to solo batches again. This is **reported but not yet root-caused** — the exact tokenizer/regex or module-batching behavior causing the inconsistency was not identified this session.
- **No old data touched:** base contains stale leftover Draft batches from prior sessions (dated 8/2–8/3) mixed in with tonight's 29. Only tonight's 29 were deleted for the retest; the stale prior-session batches were identified but deliberately left alone.

## What changed this session

- Validation Queue Final Total field converted from dead currency field to working formula field; legacy field renamed and preserved.
- 29 Canfield Materials tickets processed through Scenarios A→E (27 automatic, 2 manual Airtable reconstructions).
- ~12 new Active records added to the Dispatches table as job-alias seed data for the matcher.
- Tonight's 29 solo Draft batches deleted once, then Scenario E re-run to test matching (test-only run, not a production change).

## What was NOT changed

- No edits to Scenario E's Make.com modules (search module 18, aggregator module 23, or the tokenizer logic) — this session only tested against the existing, already-built matcher, it did not modify it.
- No changes to production Scenario A–D.
- No deletion of prior-session (8/2–8/3) stale Draft batches — identified but explicitly left alone pending confirmation with Ernie.
- Scenario F (new Invoices table + Google Sheet invoice output) not yet started — this was tonight's original goal but was deferred once the matcher inconsistency surfaced.

## Guardrails

Standing Diane guardrails (see below) plus this session's carry-forwards:

- No guessing scenario/field IDs — always pull live data first.
- Confirm before any Airtable schema change or Make scenario edit.
- Never silently assume — check.
- Ernie wants hand-holding: step-by-step, one thing at a time, watches everything happen live.
- The old "never touch Scenario E" rule has been relaxed (it was a ChatGPT-era circuit breaker) — normal judgment now applies, but confirm before any real (non-test) change.

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

Re-pull the full Scenario E blueprint fresh (don't trust memory) and diagnose why 1 of 29 near-identical Canfield tickets matched against Dispatch "Michel's Data" while the other 28 didn't — likely candidates are the JS tokenizer's exact regex behavior on apostrophes/punctuation, or a subtlety in how Airtable search module 18 or aggregator module 23 batches candidates. Fix the matcher, retest cleanly against tonight's 29 tickets, then return to building Scenario F (new scenario, does not touch production Scenario E) to create an Invoices table and a basic Google Sheet invoice output for the approved Review Batch.
