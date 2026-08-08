# Diane 2.0: Post-v115 Approval Fix Verification and UX Backlog Checkpoint

**Date:** 2026-08-08
**Repository:** `punkrocknerdgirl/diane`
**Checkout:** `/Users/erniehathaway/Projects/diane`
**Branch:** `main`
**Checkpoint purpose:** Record the verified post-v115 approval-fix state and hand off the next UX-cleanup phase.

## Source-control state

- Active remote was verified as `https://github.com/punkrocknerdgirl/diane.git`.
- Local `HEAD` and `origin/main` are synchronized at `eaa46141ff3de8feb9334b86d317e4703c636867` (`Checkpoint Approve Batch deployment blocker`).
- No tracked source changes are present in the worktree.
- Existing untracked paths remain preserved and were not staged:
  - `diane-migration-backup-2026-07-26/`
  - `docs/Apps Script/`
  - `local-preview/`
  - `skills/`

## Apps Script release state

The following deployment and live-verification results are recorded from the supplied post-v115 verification report:

- Apps Script project folder: `apps-script/`
- Existing project binding: `apps-script/.clasp.json`
- Script ID: `1kX8RuUiYcKmXExMDg4zhOm-E-rDHMw08JPqegWiBB36sUN0XZSnsJbAZ`
- Files pushed: `AirtableReadAdapter.gs`, `appsscript.json`, `Code.gs`, `Index.html`, `JavaScript.html`, and `Stylesheet.html`.
- Apps Script version: **115**
- Version description: `Approve Batch Review Status fix`
- Existing web-app deployment was updated manually through the Apps Script UI.

The user-reported live verification confirmed:

- Airtable `Review Status = Approved` is recognized correctly.
- Approved batches display correctly and leave the active review queue.
- Previous Batches loads when selected manually.
- Approved status remains visible.
- Previous batches can be reopened.
- Ticket fields can be edited.
- Save updates successfully.

These live results are recorded as the supplied verification report for this checkpoint; no additional live mutation was performed during checkpoint creation.

## Authentication repair

The earlier `invalid_grant` / `invalid_rapt` clasp failure was resolved by reauthenticating with `clasp logout` followed by `clasp login`. The authorized account was reported as `ernie@prngbooks.com`.

## Current workflow decision

Approved batches remain editable during stabilization. Approval currently means:

- the batch is removed from the active review queue;
- the batch moves into Previous Batches;
- the ticket remains editable for manual corrections.

Do not add locking, approval rollback, modified-after-approval status, audit history, reapproval, or version tracking yet.

## UX backlog

1. Automatically display Previous Batches when the active queue is empty.
2. Replace expanded Previous Batches ticket rows with batch-level summary rows that expand into ticket details.
3. Make Previous Batches actions context-aware instead of showing active-workflow actions such as Select Group and Approve Batch.

The third item must not remove editing permissions. Approved-batch edits remaining Approved after Save are accepted temporarily and are not to be changed in this phase.

## Guardrails

- Stay in chat unless explicitly asked to switch to Work.
- Work one step at a time; diagnose before changing anything.
- Airtable remains the operational source of truth.
- Do not restore Google Sheets as the final architecture.
- Do not modify Make unless explicitly requested.
- Do not modify Airtable schema or data, OCR/parser logic, invoice workflow, or freeze-copy assets.
- Show the exact proposed diff before changing source or live systems.
- Keep local source edits, commits, pushes, Apps Script sync, version creation, deployment, and live verification as separate states.
- Preserve unrelated untracked files.

## Next phase

Begin Diane 2.0 post-v115 UX cleanup with the smallest read-only diagnostic for **Previous Batches auto-load when the active queue is empty**. First inspect the current `apps-script/` source and the v115-related build logs, then show the exact proposed change and wait for approval before editing or deploying.
