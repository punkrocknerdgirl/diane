# Diane 2.0: Approve Batch Deployment Checkpoint

Date: 2026-08-08

## Purpose

Checkpoint the approved Diane 2.0 Approve Batch classification fix and the attempted production release.

## Repository and source state

- Repository: `punkrocknerdgirl/diane`
- Local checkout: `/Users/erniehathaway/Projects/diane`
- Branch: `main`
- Remote: `https://github.com/punkrocknerdgirl/diane.git`
- Approved source commit: `7a10015 Fix Airtable approved batch classification`
- The local `HEAD` and `origin/main` are synchronized at `7a10015`.

Existing untracked paths were preserved and were not staged:

- `diane-migration-backup-2026-07-26/`
- `docs/Apps Script/`
- `local-preview/`
- `skills/`

## Approved source change

`apps-script/Code.gs`, function `getTicketStatus_(row)`:

```diff
- if (norm_(row.reviewStatus) === 'Reviewed' || norm_(row.readyForClean) === 'Yes')
+ if (norm_(row.reviewStatus) === 'Reviewed' || norm_(row.reviewStatus) === 'Approved' || norm_(row.readyForClean) === 'Yes')
```

This is a one-line classification change. It makes Airtable `Review Status = Approved` classify as `APPROVED`, allowing the approved batch to leave the active review queue and appear under Previous Batches. Existing Google Sheets classifications for `Reviewed` and `Ready for TICKETS_CLEAN = Yes` remain unchanged.

## Verification completed

- Current repository, branch, remote, worktree, and source diff were verified before release.
- The source change was syntax-checked locally.
- The approved change was committed and pushed to GitHub.
- Only `apps-script/Code.gs` was staged for the source commit.
- Apps Script sync was attempted with the connected project.

## Deployment blocker

Apps Script sync failed before save/version/deployment with Google authentication error:

```text
invalid_grant
invalid_rapt
```

Therefore:

- no Apps Script save was verified;
- no new Apps Script version was created;
- the existing web app deployment was not updated;
- no live Approve Batch test was run;
- no live Airtable readback was claimed.

## Scope preserved

No Airtable schema or records, Make scenarios, OCR/parser logic, or invoice workflow were modified.

Approval remains defined as moving reviewed data into Previous Batches. It does not generate or send invoices.

## Guardrails

- Stay in chat unless explicitly asked to switch to Work.
- Work one exact step at a time and diagnose before changing anything.
- Airtable remains the operational source of truth.
- Do not restore Google Sheets as the final architecture.
- Show exact diffs before source or live-data changes.
- Do not claim sync, deployment, version creation, or live verification unless directly verified.
- Preserve unrelated untracked files and freeze-copy assets.
- Do not modify Make, Airtable schema/data, OCR/parser logic, or invoice workflow for this issue.

## Smallest next step

Reauthenticate the connected Apps Script/clasp account, then sync the already-pushed `main` source to the established Diane Apps Script project. Save, create a new Apps Script version, update the existing web app deployment, and verify the live Approve Batch workflow with a safe batch:

1. Approve Batch.
2. Confirm the batch leaves the active review queue.
3. Confirm it appears in Previous Batches.
4. Confirm newest batches appear first.
5. Expand batch details.
6. Confirm ticket data is unchanged.

Do not repeat the source diagnosis or modify the approved one-line patch unless new evidence contradicts it.
