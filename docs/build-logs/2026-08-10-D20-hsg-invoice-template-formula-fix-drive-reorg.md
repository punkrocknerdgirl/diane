# Diane 2.0 Checkpoint: HSG Invoice Template Formula Fixes and Drive Reorganization

**Date:** 2026-08-10
**Repo/checkout:** `/Users/erniehathaway/Projects/diane`

## Purpose

Two threads this session, both prerequisite work for Scenario F (invoice generator): (1) reorganize Google Drive so all Diane project files live under `01 Project Diane` (not in client folders), and (2) fix formula cells in the `HSG Invoice Template` Google Sheet, which had hardcoded values copied from a live invoice instead of proper formulas.

## Verified state

- **HSG Invoice Template formula view confirmed:** All formula fixes were entered and verified via formula view (Ctrl+`) in the live Google Sheet (`10apbUjqPwmdP7qEHxD0b4u1yUwtPz9glrWXdP3XsF_k`). Formulas are present and returning correct values.
  - H6 = `=SUM(F14:F22)` → 173.67 ✓
  - H7 = `=SUM(H14:H22)` → $3,473.40 ✓
  - D7 = `=COUNTA(A14:A22)` → 7 ✓
  - F23 = `=SUM(F14:F22)` → 173.67 ✓
  - H23 = `=SUM(H14:H22)` → $3,473.40 ✓
  - H21 = `=F21*G21` → 0 (blank row, correct) ✓
  - H22 = `=F22*G22` → 0 (blank row, correct) ✓
- **HSG Invoice Template location:** Confirmed in `04 Templates` (`107ySomBvr-dluGMiNK2zTMRCawyNYJRh`) inside `01 Project Diane`.
- **Diane 2.0 Invoices folder:** Confirmed user moved this to `03 Exports` (`1nfzlyg-_6E29M0mwAmVz-ylHYTLyFiM0`) with ID `1gD8RYh4LkDF6_R8wX0gGRJlRiMUE1TiX`. This is the Scenario F output target.
- **Diane 2.0 Cleaned Images NOT moved:** Confirmed ID `1UONL7l6idP2e8PPuVT3dpNsq4RgF_qSa` is actively referenced as `folderId` in Scenario B (`B - Clean Ticket Images`, ID 5097838) blueprint. Folder stays in `02 Processing`. Do not move.
- **Drive folder taxonomy established:** `01 Project Diane` (`1b8c0J_igaT80myarMExBWI3Wxuafs7IV`) now has five numbered subfolders — Intake, Processing, Exports, Templates, Archive — documented in session memory (`drive-folder-structure.md`).

## What changed this session

**1. Google Drive reorganization (all performed by Ernie manually in Drive UI — MCP cannot move or delete)**
- `04 Templates` folder created inside `01 Project Diane`.
- `HSG Invoice Template` created (cloned from `2026-08-10 HSG Invoice 01A`) and placed in `04 Templates`.
- `Generated Invoices` folder renamed to `Diane 2.0 Invoices` and moved from `WC Trucking Invoices` to `03 Exports`. Old folder ID from prior handoff spec (`1rbYhx0sv-tPFdy_h_oEOHg5g7gGEWxd9`) is now stale — new ID is `1gD8RYh4LkDF6_R8wX0gGRJlRiMUE1TiX`.
- `05 Archive` folder renamed (was named differently).
- Organization rule established: **nothing Diane-related lives in client folders** (e.g., `WC Trucking Invoices`). All Diane files go in `01 Project Diane` in Drive or `~/Projects/diane` locally.

**2. Make scenario safety check for Diane 2.0 Cleaned Images**
- Fetched full blueprints for all 16 Google Drive–touching Make scenarios.
- Confirmed `1UONL7l6idP2e8PPuVT3dpNsq4RgF_qSa` is hardcoded as `folderId` in Scenario B's `google-drive:uploadAFile` module.
- Decision: folder must NOT be moved. Left in `02 Processing`.

**3. HSG Invoice Template formula fixes (all entered via claude-in-chrome MCP, verified in formula view)**

| Cell | Was | Now |
|------|-----|-----|
| H6 (Tons header) | `=F23` (wrong — referenced footer) | `=SUM(F14:F22)` |
| H7 (Total header) | `=H23` (wrong — referenced footer) | `=SUM(H14:H22)` |
| D7 (Total Tickets) | `7` (hardcoded from live invoice) | `=COUNTA(A14:A22)` |
| F23 (footer Total Tonage) | `=sum(F14:F20)` (range too short) | `=SUM(F14:F22)` |
| H23 (footer Grand Total) | `=sum(H14:H20)` (range too short) | `=SUM(H14:H22)` |
| H21 | *(blank — no formula)* | `=F21*G21` |
| H22 | *(blank — no formula)* | `=F22*G22` |

**4. Session memory updated**
- `drive-folder-structure.md` written to project memory — canonical folder IDs for all `01 Project Diane` subfolders, Scenario F output target, key org rules.
- HSG Invoice Template memory entry updated from "formulas need to be fixed" to "formulas fixed 2026-08-10; ready for Scenario F cloning."

## What was NOT changed

- No Make scenarios modified this session.
- `Diane 2.0 Cleaned Images` folder NOT moved (confirmed active use in Scenario B).
- Per-line H column formulas (H14:H20) were entered in a prior context as `=sum(Fn*Gn)` — these are mathematically equivalent to `=Fn*Gn` and were not changed this session. They return `0` for blank input rows rather than blank; this is cosmetic and does not affect totals.
- The stray `Templates` folder and HSG Invoice Template copy in `WC Trucking Invoices` (created early in the session in the wrong location) were NOT deleted — Drive MCP cannot delete. Ernie must trash them manually.
  - Stray Templates folder in WC: `1zxt_1beoe5JX0QmiMLTinRYwIPtIAy_K`
  - Stray HSG Invoice Template copy in WC: `1RoSvpIFw-DC8vOZOcyrCb98ezlz35PEG9yXxK5fNrMs`
- Scenario F was NOT built this session — this was prerequisite work only.
- Untracked directories (`diane-migration-backup-2026-07-26/`, `docs/Apps Script/`, `local-preview/`, `scripts/`, `skills/`) and pre-existing uncommitted diffs in `.claude/commands/checkpoint.md` and `apps-script/AirtableReadAdapter.gs` left untouched.

## Guardrails

Standing Diane guardrails (carried forward):

- Diagnose before changing anything.
- Work one exact step at a time when interacting with Ernie during the actual build.
- Preserve existing architecture and proven behavior unless redesign is explicitly requested.
- Do not change production Make modules or logic without explicit approval.
- Do not claim code was committed, pushed, deployed, tested, or verified unless it actually occurred — verified and reported-but-unverified are different categories.
- Protect client data and credentials — never expose API keys, PATs, tokens, or secrets in chat, logs, commits, or commands that echo them.
- Airtable remains the operational source of truth.
- Do not restore Google Sheets as the final architecture.
- Local checkout and GitHub main should stay in sync — build logs are written locally first, then pushed, never edited directly on GitHub.

Session-specific carry-forwards:

- All Make scenarios are run manually via "Run once" — none stay activated between uses.
- **Drive org rule:** Nothing Diane-related lives in client folders. All project files go in `01 Project Diane` in Drive OR `~/Projects/diane` locally.
- **Diane 2.0 Cleaned Images** (`1UONL7l6idP2e8PPuVT3dpNsq4RgF_qSa`) must stay in `02 Processing`. Moving it breaks Scenario B.
- **Stale folder ID:** The old `Generated Invoices` / `Scenario F output` ID `1rbYhx0sv-tPFdy_h_oEOHg5g7gGEWxd9` is dead. Use `1gD8RYh4LkDF6_R8wX0gGRJlRiMUE1TiX` (`Diane 2.0 Invoices` in `03 Exports`).
- `Final Total (Legacy)` (`fld5IN6BntCd4wDJM`) must remain untouched as the audit-trail record.
- Do not build webhook-chained pipeline automation until: (1) numeric sanitization bug is fixed in the extractor, and (2) at least 2–3 full A→E batches have run clean without manual intervention.

## Flags for human review (carried forward)

- **Manual trash needed:** Stray `Templates` folder and HSG Invoice Template copy in `WC Trucking Invoices` — IDs above. Drive MCP cannot delete; Ernie must do this.
- Canfield 8/10 flags (from prior session): Ticket 409076 blank quantity, Ticket 408957 quantity mismatch, Ticket 408602 garbled OCR date.

## Next step

Build Scenario F in Make.com — the invoice generator. Key IDs:
- Template: `10apbUjqPwmdP7qEHxD0b4u1yUwtPz9glrWXdP3XsF_k` (HSG Invoice Template in 04 Templates)
- Output folder: `1gD8RYh4LkDF6_R8wX0gGRJlRiMUE1TiX` (Diane 2.0 Invoices in 03 Exports)
- Airtable base: `appMWvtLU0hMBqjLC`
- Invoice Batches table: `tbl7nRJsDeKwhpDDu`
- Validation Queue table: `tblbiwkOS9LDi5yaV`
