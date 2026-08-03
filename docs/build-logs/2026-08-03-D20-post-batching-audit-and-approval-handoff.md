# Diane 2.0 Checkpoint: Post-Batching Audit and Approval Handoff

**Date:** 2026-08-03

## Purpose

Checkpoint the verified Diane 2.0 state after manual ticket entry and batching for the current invoice cycle, and hand off the smallest next task: implement and prove whole-batch Airtable approval before invoice preparation.

This public build log intentionally omits live Airtable record identifiers, ticket numbers, client/job names, and deployment identifiers.

## Repository and prior source state

- Repository: `punkrocknerdgirl/diane`
- Branch: `main`
- Earlier approval-error checkpoint: `docs/build-logs/2026-08-03-D20-invoice-closeout-and-batch-approval-error.md`
- Approved source-validation mapping commit: `1568725552b6b555d3116c3fbc1ee5fc292a4b63`
- Approved Draft-batch reassignment source commit: `75a424535ecea540402cad8ffbf4ba6bf78a95d8`

The exact Apps Script version currently assigned to production was not re-read during this checkpoint. Do not infer or claim a version number from the fact that batching worked.

## Work completed before this checkpoint

The current import completed through Make Scenarios A-E:

- 25 Tickets
- 25 cleaned files
- 25 OCR results
- 25 Parser Outputs
- 25 Validation Queue records
- Scenario E initially created one-ticket Draft Review Batches

The approved manual-reassignment change allows Pending Review records to be moved out of Scenario E's one-ticket Draft batches while preserving protection for non-Draft batches.

Ernie subsequently completed manual ticket entry and batching in Diane. Successful manual batching is observable in live Airtable.

## Live Airtable audit

A read-only audit of the production Diane 2.0 base confirmed that the 25 new Validation Queue records are grouped into four manual Review Batches with counts:

- 7
- 6
- 7
- 5

Structural checks passed for all 25 records:

- exactly one linked manual Review Batch
- `Batch Assignment Source = Manual`
- `Batch Lock = checked`
- `Review Status = Pending Review`
- linked Ticket present
- core final review fields populated

All four Review Batches remain `Draft`, as expected before approval.

No Airtable record or schema was changed during the audit.

## Data exceptions found

The batching structure is good, but the 25-record set is not ready for blind whole-batch approval.

- One record contains an invalid four-digit year in Final Ticket Date.
- Four records have a zero Final Total despite nonzero quantity and rate.
- Two pairs share the same final ticket number and require source-image confirmation to determine whether they are duplicates or legitimate repeated numbers.

Exact private record identifiers and arithmetic checks were returned to Ernie in the checkpoint chat and must be carried into the next private work session without being published here.

## Approval lifecycle goal

Required behavior:

1. Marking a whole batch **Approved** safely updates the linked Airtable Validation Queue records.
2. The approved batch leaves the current batching window and appears in **Previous Batches**.
3. Approved means ready for invoice preparation; it does not itself create or send an invoice.
4. For now, invoice preparation remains:
   - export finalized Diane data to a Google Sheet;
   - gather and sort ticket images;
   - attach dispatch instructions;
   - prepare the broker invoice and submission package.

## Approval implementation state

Whole-batch Airtable approval is not yet proven live.

A three-file implementation was previously proposed but not verified as applied or deployed:

- `apps-script/Code.gs`: route Airtable source payloads to a dedicated Airtable approval function while preserving legacy Sheets approval.
- `apps-script/AirtableReadAdapter.gs`: prevalidate every supplied Validation Queue record, resolve the reviewer collaborator, then update only the intended review fields.
- `apps-script/JavaScript.html`: send the Airtable batch record ID and Validation Queue record IDs instead of Sheet row numbers.

Proposed boundary:

- whole-batch Airtable approval only
- no single-ticket Airtable approval
- no selected-ticket Airtable bulk approval
- no return-to-draft implementation
- no automatic downstream processed-state update
- no partial approval: prevalidate the entire batch before any write

The proposed approval diff must be re-inspected against current `main` before any edit. Do not assume it still applies cleanly.

## Smallest correct next step

1. Read this checkpoint and the earlier approval-error checkpoint.
2. Inspect current GitHub `main` for the existing `approveBatch` routes and browser payload.
3. Reconcile the previously proposed three-file whole-batch Airtable approval diff against current source.
4. Show Ernie the exact current diff, test plan, and rollback plan.
5. Do not edit or deploy until Ernie explicitly approves.
6. After approval implementation is proven, correct or confirm the private data exceptions before approving the four current batches.
7. Prove one small batch first, including movement from the batching window to Previous Batches.
8. Then complete the invoices due in the current cycle.

## Guardrails

- Stay in chat unless Ernie explicitly asks to switch to Work.
- Work one exact step at a time.
- Diagnose before changing anything.
- Airtable is the operational source of truth.
- Do not restore Google Sheets as the final architecture; Sheets is only the current invoice-preparation export step.
- Do not modify Make unless explicitly requested.
- Do not modify Airtable schema or records without an exact proposed action and explicit approval.
- Show the exact proposed source diff before modifying source or live code.
- Do not claim a commit, deployment, version, test, or live-data change unless verified.
- Preserve the existing ticket-date sort.
- Preserve the working manual Draft-batch reassignment behavior.
- Do not modify freeze-copy Airtable or Make assets.
- Keep the approval repair narrow so current-cycle invoicing can be completed promptly.
