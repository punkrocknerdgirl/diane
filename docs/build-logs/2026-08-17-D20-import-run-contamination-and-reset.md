# Diane 2.0 Checkpoint: Import Run contamination — triple-execution of Scenario A, full reset, fresh clean run

**Date:** 2026-08-17
**Checkout:** `/Users/erniehathaway/Projects/diane` (origin `punkrocknerdgirl/diane`, branch `main`)
**Scenario:** A - Get Motive Tickets (Make scenario ID `5631564`)
**Severity:** Data integrity — no downstream corruption reached invoicing, but Import Run `MOTIVE_LIVE_SCENARIO_A_20260816` (`recao5VDhexjmiEhI`) was fully retired and replaced.
**Status:** Resolved. Fresh Import Run created and re-run cleanly. New anomaly-scan pattern documented for future batches.
**Related but distinct:** This is upstream of and unrelated to the module 13 write-failure bugs logged the same day (`2026-08-17-D20-scenario-d-allowredirects-bug.md`, `2026-08-17-D20-scenario-d-module13-write-failures.md`). Those were Scenario D bugs on a clean batch of 33 tickets. This log covers why the *batch itself* was contaminated before D ever got clean input to fail on.

## Purpose

Record the Scenario A triple-execution incident, the full data reset that followed, and the verification of the replacement clean run — plus the industry-specific ticket-numbering knowledge that surfaced during the anomaly review, so it isn't re-flagged as a bug by a future session.

## What happened

Import Run `MOTIVE_LIVE_SCENARIO_A_20260816` (`recao5VDhexjmiEhI`, Pull From `2026-08-16T22:00:00Z`) was picked up by Scenario A and actually executed **three times**, not once, due to stop/start clicking in the Make UI across a single Ready-status Import Run record:

- Full run #1: ~02:29–02:30 (most lineages)
- Full run #2: ~07:44–07:45 (most lineages, duplicate of #1)
- Partial run #3: ~09:12 (only the `1052472895`/`1052473314` lineage tickets)

Because Scenario A's trigger logic (module 26) matches on Import Run `Run Status = "Ready"` rather than any per-execution idempotency key, nothing in the scenario itself prevented re-pulling from Motive against the same Ready record on each manual "Run once" click.

## Downstream damage

- **Tickets table:** 33 total Ticket (Intake) records existed, but represented duplicated Drive uploads for most of the batch — the `1052395xxx` and `1052394661` lineages existed twice (once per full run), while the `1052472895`/`1052473314` lineage existed once (only hit by the partial run).
- **Google Drive:** 58 files total under folder `1Di0ie_rE0m6f_DMvJfePTI_RyyD4Gpb0` for what should have been 33 unique tickets — 33 unique + 25 duplicates, matching the two full-run pattern.
- **Parser Outputs / Validation Queue:** Only 10 of the 33 Tickets had actually made it through Scenario D before this was caught — those 10 were corrupted (missing `Parsed Quantity`, at least one badly corrupted date — `2001-06-01` instead of a 2026 date). The other 23 never reached D at all (silently stuck at Intake — consistent with the known Bug #1 pattern: `onerror: Ignore` on modules 5/13/25 in D means Make reports scenario-level SUCCESS even when writes silently fail or never happen).

## Decision: full reset rather than salvage

Given the compounding stop/start history and partial corruption already found in the 10 processed records, decided against trying to identify and repair only the bad subset. Full reset chosen instead — cleaner to guarantee a known-good starting state than to trust partial data that had already been through multiple inconsistent pipeline passes.

## What changed this session (reset actions taken, in order)

1. **Deleted all 33 Tickets (Intake) records** linked to Import Run `recao5VDhexjmiEhI`.
2. **Deleted all 10 Parser Outputs** that had been written from this batch (`tblvgGjGiSJCNid36`).
3. **Deleted all 10 linked Validation Queue records** (`tblbiwkOS9LDi5yaV`).
4. **Trashed all 58 Google Drive files** tied to this batch's ticket lineages (33 unique + 25 duplicates from the double/triple-run). Files matched by filename pattern `MOTIVE_{document.id}_{attachment.id}` per Scenario A module 8's title-field convention, cross-referenced against the four ticket lineage prefixes in the batch (`1052394661`, `1052395xxx`, `1052472895`, `1052473314`).
5. **Left the original Import Run record (`recao5VDhexjmiEhI`) untouched** as historical record — not deleted, not archived, just superseded. It still shows `Run Status = Completed`, `Import Disposition = Live Work`, 33 linked Tickets in its own history (those links now point to deleted records — acceptable since the record itself is being kept only as an audit trail of what happened, not as live data).
6. **Created a fresh Import Run record**: `MOTIVE_LIVE_SCENARIO_A_20260817B` (`rec91uk54vKXfm0QO`), `Pull From = 2026-08-17T00:00:00Z`, `Run Status = Ready`, `Import Disposition = Live Work`. Notes field documents the reset reason and scope directly on the record for future reference.
7. **Ernie ran Scenario A once, cleanly, from the Make UI** against the new Import Run.

## Verified state — fresh run is clean

Result: 33 bundles returned, 33 unique Tickets (Intake) records created, all linked correctly to `rec91uk54vKXfm0QO`.

Checks performed:

- **Duplicate check** — all 33 `Import Key` values (format `MOTIVE_{doc}_{attachment}`) confirmed unique. No repeated lineages, unlike the prior batch.
- **Timing check** — all 33 records created within a single ~90-second window (22:31:54–22:33:21 UTC), consistent with one clean execution burst. No multi-hour gap pattern like the 02:29/07:44/09:12 split seen previously.
- **Field completeness** — all 33 records have `Source File ID` populated, all sitting at `Ticket Status = Intake` (correct pre-Scenario-B/D state), all `Import Disposition = Live Work`.
- **Non-sequential ticket numbers within lineages** — e.g., `1052472895_1052472900` jumps straight from `_898` to `_900` (no `_899`), and `1052473314_1052474772` is a large jump from the `_314`/`_315` pair within the same lineage. **Confirmed this is expected, not an anomaly** — see industry-quirks note below. Not flagged as a data issue.

**Verdict: clean batch, ready to advance to Scenario B.**

Also verified as part of this checkpoint: the local checkout and `origin/main` were in sync (`0	0`) before any writes, and the chat-authored version of this log was **not** present on `origin/main` or on any remote branch (`git ls-tree` against `origin/main` and `origin/claude/diane-build-log-updates-ihax2t`, plus `git log --all --diff-filter=A` history search, all found nothing). This checkpoint is the first time this content actually lands in the repository — see the log-sync note below.

## Industry-specific data quirk — ticket numbering (new, needs to be standing knowledge)

Surfaced directly by Ernie during this session's anomaly review. Documented here and in `diane-2.0-bugs.md` so it doesn't get re-flagged as a bug in a future review or by a different agent/session:

- **Non-sequential ticket numbers are normal, not an anomaly.** Quarries assign ticket numbers sequentially across *all* trucks passing through their scale that day/shift — not per-truck, not per-hauler. With only 1–2 of our trucks running a given job, there will routinely be large gaps between our tickets, because other haulers' trucks fill the numbers in between. **Do not treat gap size as a data quality signal** in OCR/parser validation, code review, or future anomaly-scan logic.
- **Ticket number format/digit-length varies by quarry and is not standardizable.** Some quarries use short 4–5 digit ticket numbers (e.g., `41236`, `112458`); others use numbers in the millions (e.g., `1000008`, `1052395125`). **No global validation rule should assume a fixed digit-length range** for `Ticket Number` / `Parsed Ticket Number` / `Final Ticket Number`. Any future sanity-check or anomaly-flagging logic touching these fields needs to be broker/quarry-aware, not global.
- **Suggested long-term home for this**: the `Ticket Templates` table (`tblAVz20h5VEsaF5u`) already has per-broker `Recognition Rules` and `Fallback Rules` fields. Ticket-number-format expectations per broker/quarry could reasonably get their own note in each relevant template's Recognition Rules, in addition to living here in the build log. Not yet done — flagged as a possible follow-up, not required immediately.

## What was NOT changed

- Scenario A's blueprint/logic — untouched. The triple-execution was purely a UI/process issue (multiple manual "Run once" clicks against the same Ready record), not a scenario bug. No code or config fix needed here, though it's worth noting Scenario A has no built-in idempotency guard against this — now logged in `diane-2.0-bugs.md` as a known gap; future consideration, not urgent given it's a known human-process risk now that it's been seen once.
- Scenarios B/C/D/E — untouched.
- The original contaminated Import Run record (`recao5VDhexjmiEhI`) — kept as-is as an audit trail, not deleted.
- `docs/build-logs/build-log.md` — untouched, per checkpoint convention.

## Guardrails

Standing Diane guardrails carried forward:

- Diagnose before changing anything.
- Work one exact step at a time during the build (the checkpoint process itself is the exception).
- Preserve existing architecture and proven behavior unless redesign is explicitly requested.
- Do not change production Make modules or logic without explicit approval.
- Do not claim code was committed, pushed, deployed, tested, or verified unless it actually occurred — verified and reported-but-unverified are different categories.
- Protect client data and credentials — no keys, PATs, or tokens in chat, logs, commits, or commands.
- Airtable remains the operational source of truth.
- Do not restore Google Sheets as the final architecture.
- Local checkout and GitHub main stay in sync; build logs are written locally first, then pushed, never edited directly on GitHub.

Session-specific:

- One manual "Run once" per Ready Import Run record, full stop. If a run looks stalled, inspect Make History rather than re-clicking — Scenario A will happily re-pull the whole batch against the same Ready record.
- Before advancing any batch past Intake, run the anomaly scan established here: unique `Import Key` check, creation-timestamp clustering check, and Drive file count vs. expected ticket count.

## Next step

Advance the fresh 33-ticket batch (Import Run `rec91uk54vKXfm0QO`) through Scenario B (image cleaning), then C (OCR), then D — watching specifically for whether the module 13 write-failure bugs (Assignee `{}` write, `Parsed Quantity` malformed string) documented in `2026-08-17-D20-scenario-d-module13-write-failures.md` are still present, since that fix was applied but not yet runtime-verified as of `2026-08-17-D20-scenario-d-module13-fix-applied.md`.

## Note on log sync across surfaces

The original of this log was authored in Claude.ai chat and reported as written directly to GitHub (`punkrocknerdgirl/diane`, `main`, via the project-level GitHub context connection). **That write did not land** — verified this session against `origin/main` and all remote branches; no such file or commit exists. The content was pasted into Claude Code and committed from the local checkout instead, which is the documented-correct path anyway (local first, then push, never edited directly on GitHub).

Takeaway for future sessions: a chat-surface claim of "written to GitHub" is *reported*, not *verified*, until a Claude Code run confirms the file on `origin/main`. Treat the local checkout + push as the only trusted write path for build logs.

## Files/locations for context

- Original (retired) Import Run: `recao5VDhexjmiEhI` (`MOTIVE_LIVE_SCENARIO_A_20260816`)
- New Import Run: `rec91uk54vKXfm0QO` (`MOTIVE_LIVE_SCENARIO_A_20260817B`)
- Import Runs table: `tbl8V8VXyLIGtBu9X` (base `appMWvtLU0hMBqjLC`)
- Tickets table: `tbloTlWdo1f4hFKXh`
- Parser Outputs: `tblvgGjGiSJCNid36`
- Validation Queue: `tblbiwkOS9LDi5yaV`
- Ticket Templates: `tblAVz20h5VEsaF5u`
- Drive folder (source ticket images): `1Di0ie_rE0m6f_DMvJfePTI_RyyD4Gpb0`
- Scenario A: Make scenario ID `5631564`
