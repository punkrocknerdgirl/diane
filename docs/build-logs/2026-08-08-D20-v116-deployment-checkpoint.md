# Diane 2.0: Apps Script Version 116 Deployment Checkpoint

**Date:** 2026-08-08  
**Purpose:** Record the verified deployment of the approved Previous Batches UX changes as Apps Script version 116.

## Repository and source state

- Repository: `https://github.com/punkrocknerdgirl/diane.git`
- Checkout: `/Users/erniehathaway/Projects/diane`
- Branch: `main`
- Source HEAD at deployment: `315dcafc417b49efeb27133735aeba832a43d448`
- `HEAD` matched `origin/main` before deployment.
- No uncommitted tracked changes were present before deployment.
- Existing unrelated untracked paths were preserved and not staged.

## Approved commits deployed

- `e9711ef` — `Auto-load Previous Batches when review queue empty`
- `315dcaf` — `Show Previous Batches as expandable batch summaries`

The approved frontend changes are in `apps-script/JavaScript.html`. No source changes were made during deployment or checkpoint creation.

## Apps Script deployment

- Apps Script project ID: `1kX8RuUiYcKmXExMDg4zhOm-E-rDHMw08JPqegWiBB36sUN0XZSnsJbAZ`
- Apps Script source was synced successfully from the repository checkout.
- Apps Script version: **116**
- Version description: `Show Previous Batches as expandable batch summaries`
- Existing Diane web-app deployment was updated to version 116.
- Deployment ID: `AKfycbzzjkCqwsiCO7vahT1BJn6S4fArwA5dTtsoVEmEz9c05i8P9RTprUOtZ0OKvp2prfc`

## Live verification

Read-only browser verification passed:

- Diane loaded normally.
- An empty active review queue automatically loaded Previous Batches.
- Previous Batches displayed collapsed batch summaries.
- Each batch received one Expand control.
- Expanding a batch displayed its ticket rows.
- Collapsing the batch hid its ticket rows.
- Switching away from Previous Batches and back worked correctly; the returned view showed collapsed summaries.
- The active review queue path remained unchanged when Previous Batches mode was off.

## Scope and exclusions

Not modified:

- Airtable data or fields
- Make scenarios
- approval logic
- batching logic
- Apps Script backend logic
- deployment architecture

The current stabilization decision remains that Approved batches are editable and remain Approved after Save. No locking, rollback, reapproval, audit history, or version tracking was added.

## Guardrails

- Stay in chat unless explicitly asked to switch to Work.
- Work one step at a time and diagnose before changing anything.
- Airtable remains the operational source of truth.
- Do not restore Google Sheets as the final architecture.
- Do not modify Make unless explicitly requested.
- Keep local edits, commits, pushes, Apps Script sync, version creation, deployment, and live verification as separate states.
- Preserve unrelated untracked files.

## Next step

Begin the next approved Diane UX diagnosis from this deployed v116 state. Read this checkpoint first, verify the exact checkout and live target, and wait for approval before any further source or deployment change.
