# Diane 2.0 Checkpoint: Final Total Fix, OCR/Dead-Field Audit, Invoice Architecture Lock, Live Run Prep

**Date:** 2026-08-09
**Repository:** `https://github.com/punkrocknerdgirl/diane.git`
**Checkout:** `/Users/erniehathaway/Projects/diane`
**Branch:** `main`

## Purpose

Close out the `Final Total` bug fully (schema + verification), audit the OCR/parser pipeline and two suspected-dead Tickets fields to separate real gaps from already-solved workflows, lock the invoicing architecture direction without building it yet, and stage the first live production run of Scenarios A–E for the night.

## Verified state

Verified directly during this checkpoint run:

- `HEAD` and `origin/main` were identical before this log was committed (`git rev-list --left-right --count origin/main...HEAD` returned `0 0`). No divergence.
- Origin confirmed as `punkrocknerdgirl/diane` (fetch and push).
- `node scripts/clickup-glossary.mjs whoami` still fails with "no API token found" — ClickUp Step 4 is unreachable this session, same as the prior two checkpoints.
- Working tree still carries the same pre-existing uncommitted/untracked state from before this session: `.claude/commands/checkpoint.md` and `apps-script/AirtableReadAdapter.gs` modified, plus untracked `diane-migration-backup-2026-07-26/`, `docs/Apps Script/`, `local-preview/`, `scripts/`, `skills/`. None of these were touched or staged by this checkpoint.

Reported by Ernie this session, not independently re-verified by this checkpoint run (carried forward from the session as reported):

- `Final Total (Legacy)` (`fld5IN6BntCd4wDJM`) and new formula field `Final Total` (`fldLfatXbIkD7V17z`) = `{Final Quantity} * {Final Rate}` exist in the Validation Queue table, and all 16 previously-broken records now recalculate correctly.
- Neither Scenario E nor Scenario D writes a value to the old `Final Total` field ID.
- `Billing Batch` and `Batch Key` (Tickets table) are unwritten by Scenarios B–E and have been annotated in Airtable as DEAD FIELD / unwired.
- Scenario D (`diane-ticket-extractor`) returns exactly 9 fields (`truck, origin, material, destination, ticket_date, ticket_time, customer_job, quantity_tons, ticket_number`) with no rate/total/driver/broker extraction, by design.
- Import Runs record `MOTIVE_LIVE_SCENARIO_A_20260809` exists, Pull From = 3:00 PM Central 2026-08-09, 29 new Motive documents queued, Run Status: Ready, not yet executed as of this checkpoint.

## What changed this session

**1. `Final Total` field fix (Validation Queue table)**
- Diagnosed root cause: `Final Total` had been a plain currency field since the Sheets→Airtable migration, never a working formula, silently defaulting to `$0` regardless of Quantity/Rate. Confirmed systemic across 16 approved records.
- Renamed old field to `Final Total (Legacy)` (`fld5IN6BntCd4wDJM`) and preserved it untouched for audit trail.
- Created new formula field `Final Total` (`fldLfatXbIkD7V17z`) = `{Final Quantity} * {Final Rate}`.
- Confirmed against Make that neither Scenario E nor Scenario D writes a value to the old field ID (Scenario D references it in its record schema but never mapped a value to it).
- Confirmed all 16 previously-broken records recalculate correctly under the new formula field.

**2. OCR/parser pipeline audit (Scenarios B–E)**
- Traced the full pipeline: Scenario B (CloudConvert image cleaning only) → Scenario C (raw Google Cloud Vision text detection only, never populates OCR Outputs' structured "Extracted" fields) → Scenario D (custom Cloud Run extractor `diane-ticket-extractor`, 9 fields only, no rate/total/driver/broker by design, since those are dispatch-only knowledge never printed on tickets).
- Concluded with Ernie that the missing dispatch-field extraction is not a bug — it's already solved by the Review Batch "enter once, batch-apply to all tickets in batch" workflow.
- Confirmed Ticket # and Quantity extraction reliable (~90%+); Ticket Date flagged as a known soft issue (sometimes blank, sometimes off by a day) — not urgent.
- Confirmed the `Ticket Templates` / `Template Field Rules` tables exist in schema (one draft record, Canfield Materials) but are fully unwired — no scenario reads from them. Not pursued further; would only help printed-field accuracy, not the already-solved dispatch-field gap.

**3. Dead-field audit — `Billing Batch` and `Batch Key` (Tickets table)**
- Checked Scenarios B, C, D, E: none write to these fields; no auto-batching logic exists anywhere in the current pipeline.
- Flagged both fields directly in Airtable with descriptions marking them DEAD FIELD / unwired.
- Identified broker/job/week auto-batching as a legitimate future feature, intentionally deferred.

**4. Invoicing architecture — direction locked, no build**
- Confirmed broker-neutral design: Universal Invoice Data Object → generic invoice output → broker-specific skills (Statewide, HSG, TNB, etc.) layered on later. QBO deferred.
- Locked invoice numbering rule: `BBYYMMDD##` (broker code + invoice date + daily per-broker sequence, e.g. `ST26080901`).
- Clarified batching model: Review Batches (data-entry convenience) ≠ Invoice Batches (billing groupings) ≠ invoice documents (can span multiple Invoice Batches; one Invoice Batch can split into multiple invoices by truck/driver/job). Every ticket carries every field regardless of what a given broker's invoice displays.
- Confirmed reusable skill split: Invoice Builder (data) → PDF/Doc Renderer (fully reusable, non-trucking-specific) → thin broker-specific skills.
- Proposed (not created) a new `Invoices` table between Invoice Batches and Tickets, needed because the current schema can't represent one batch → many invoices.
- Reset tonight's actual build target smaller: get approved tickets into a basic/ugly generic Google Sheet invoice output — not PDF, not broker-formatted, not QBO — via a new Make Scenario F, so production Scenario E stays untouched.

**5. Live run prep**
- Confirmed Import Runs record `MOTIVE_LIVE_SCENARIO_A_20260809` (created by Ernie via ChatGPT before this session) is staged: Pull From 3:00 PM Central 2026-08-09, 29 new Motive documents, Run Status: Ready.
- Session ended before Scenarios A→E were run live; that run had not started as of this checkpoint.

## What was NOT changed

- No Make scenario logic was modified. Scenario E (production) was not touched.
- No Apps Script sync, version creation, or deployment occurred this session.
- The `Invoices` table was not created.
- New Make Scenario F for generic invoice output was not built.
- Scenarios A–E were not executed live during this session; the live run was staged but not started.
- Ticket Templates system was not wired into any scenario.
- `docs/build-logs/build-log.md` was not touched.
- Untracked directories `diane-migration-backup-2026-07-26/`, `docs/Apps Script/`, `local-preview/`, `scripts/`, `skills/` and the pre-existing uncommitted diffs in `.claude/commands/checkpoint.md` / `apps-script/AirtableReadAdapter.gs` were left alone.
- Only this build log was staged and committed this session.

## Guardrails

Standing (carried forward from prior checkpoints):

- Diagnose before changing anything.
- Work one exact step at a time when interacting with Ernie during the actual build (checkpoint itself runs straight through).
- Preserve existing architecture and proven behavior unless redesign is explicitly requested.
- Do not change production Make modules or logic without explicit approval.
- Do not claim code was committed, pushed, deployed, tested, or verified unless it actually occurred — verified and reported-but-unverified are distinct categories.
- Protect client data and credentials — never expose API keys, PATs, tokens, or secrets in chat, logs, commits, or commands that echo them.
- Airtable remains the operational source of truth.
- Do not restore Google Sheets as the final architecture.
- Local checkout and GitHub main should stay in sync.

Session-specific:

- Scenario E is production and must never be touched directly; the new generic-invoice-output work must go into a separate Scenario F.
- `Final Total (Legacy)` (`fld5IN6BntCd4wDJM`) must remain untouched as the audit-trail record; all new reads/writes should target `Final Total` (`fldLfatXbIkD7V17z`).
- Do not build auto-batching for `Billing Batch`/`Batch Key` without explicit request — confirmed dead for now, deferred as a future feature.
- Do not pursue Ticket Templates wiring as a fix for the dispatch-field gap — that gap is already solved via Review Batch batch-apply; Templates would only affect printed-field accuracy.

## Next step

Run Scenarios A→E live against Import Runs record `MOTIVE_LIVE_SCENARIO_A_20260809` (29 Motive documents, Pull From 3:00 PM Central 2026-08-09), watching for errors at each stage before touching anything else.

### Deferred ClickUp glossary updates

ClickUp remains unreachable (no token stored in the keychain under service `clickup-api-token`), so Step 4 could not run this session. All candidates below are carried forward unchanged from the prior two checkpoints — no new terminal/git commands were run this session — and must be checked against the live page (doc `8chynfx-8591`, page `8chynfx-13531`) once the token is in place:

```bash
cp <file>.gs /tmp/<file>.js && node --check /tmp/<file>.js
```
Syntax-checks a Google Apps Script `.gs` file by copying it to a `.js` extension first. `node --check` rejects `.gs` outright with `ERR_UNKNOWN_FILE_EXTENSION`, so the copy is required.

```bash
git diff --check
```
Reports whitespace errors and conflict markers in unstaged changes. Silent output means clean.

```bash
git fetch origin main
```
Downloads the latest `main` from origin without merging it into the working branch.

```bash
git log -1 --format='%H %ci %s'
```
Prints the most recent commit as a single line: full hash, committer date in ISO format, and subject.

```bash
git remote -v
```
Lists configured remotes with their fetch and push URLs.

```bash
git rev-list --left-right --count origin/main...HEAD
```
Prints two numbers — commits on origin/main not in HEAD, then commits in HEAD not on origin/main. `0 0` means fully in sync.

```bash
git rev-parse --show-toplevel
```
Prints the absolute path of the repository root, which confirms which repo the current directory actually belongs to.

```bash
git status --short --branch
```
Compact status: branch and upstream tracking on the first line, then one line per changed file with two-letter staged/unstaged status codes.

```bash
gh auth status
```
Shows whether the `gh` CLI has an active, persistent GitHub login, which account, token scopes, and storage backend (keyring vs. plaintext).

```bash
security add-generic-password -s <service> -a "$USER" -w
```
Stores a secret in the macOS keychain under the given service name, prompting interactively for the value so it never lands in shell history. Retrieve it later with `security find-generic-password -s <service> -w`.
