# Diane 2.0 Checkpoint: Airtable Review Remap and July Invoice Closeout

**Date:** 2026-08-03

## Purpose

Record the major Diane 2.0 milestone completed over the last several days:

- the Review Form workflow was remapped from Google Sheets to Airtable;
- the July invoice workload was run through Diane 2.0 through final review;
- the reviewed data was invoiced using the established Google Sheets invoice workflow;
- the remaining architectural gap is the invoice-production stage after final review.

This public build log intentionally omits client-identifying ticket details, live Airtable record IDs, private invoice data, credentials, and deployment identifiers.

## Repository state at checkpoint start

- Repository: `punkrocknerdgirl/diane`
- Branch: `main`
- GitHub head before this checkpoint: `1a62f6aa015d9b7f3ad6c3e1636cba885a88c0c2`
- Most recent source commit: `Fix Airtable approval review status`
- Earlier operational handoff: `docs/build-logs/2026-08-03-D20-post-batching-audit-and-approval-handoff.md`

Relevant source commits in the completed approval and batching sequence:

- `75a424535ecea540402cad8ffbf4ba6bf78a95d8` — allow regrouping tickets from Draft review batches
- `89420b529626fdd860b30421b5097238bab00d6b` — enable Airtable whole-batch approval
- `c6001c04ab37e5820db113cb952ab54262ec445d` — fix weekly batch label regex
- `1a62f6aa015d9b7f3ad6c3e1636cba885a88c0c2` — save and verify Airtable ticket Review Status as `Approved`

## Major milestone completed

The Diane 2.0 Review Form is no longer dependent on Google Sheets as its operational review datastore.

Airtable is now the operational source of truth for:

- Validation Queue records
- review-ready ticket data
- manual batch assignment
- batch membership and locking
- review status
- reviewer and approval timestamp
- current versus previous batch lifecycle

The browser Review Form now reads and acts on Airtable-backed records instead of treating Google Sheets row numbers as the primary identity for the review workflow.

Google Sheets remains in the process only as the current invoice-production tool after review is finalized. It is not the intended final architecture for Diane review.

## Work completed

### 1. Airtable-backed review and batching

The active review workflow was moved from the legacy Google Sheets path to Airtable-backed records and batch IDs.

Completed behavior includes:

- Airtable Validation Queue records appear in the Review Form.
- Tickets can be manually regrouped while their linked Review Batch is still Draft.
- Manual regrouping preserves the intended batch assignment and lock behavior.
- Existing protection remains in place for records belonging to non-Draft batches.
- Weekly and manually created batch labels are handled correctly after the regex correction.

### 2. Whole-batch Airtable approval

Whole-batch approval was implemented for Airtable-backed batches.

The approval path now:

- receives Airtable Review Batch and Validation Queue record identities rather than relying on Sheet row numbers;
- prevalidates the intended batch and ticket records before writing;
- writes the reviewer collaborator and approval timestamp;
- writes ticket Review Status as `Approved`;
- verifies that the saved ticket Review Status is `Approved`;
- preserves the boundary between approval and downstream invoice processing.

The approval work was kept narrow. It did not add automatic invoice creation, automatic submission, or unrelated workflow redesign.

### 3. July operational run

All July invoices in the current working set were run through Diane 2.0 through finalizing review.

This operational run exercised the rebuilt path across:

- ticket import and OCR processing;
- parser and validation output;
- Airtable Validation Queue review;
- manual correction where source data required human judgment;
- manual batch organization;
- final review and approval readiness.

Manual review remained an intentional control. Duplicate-looking records, date issues, quantities, rates, totals, truck assignments, and other exceptions were resolved or handled before invoice completion rather than silently guessed.

### 4. Invoice completion using the established workflow

The July invoices were produced using the existing Google Sheets invoicing workflow after Diane review was finalized.

Current invoice-production workflow remains:

1. use finalized Diane review data;
2. copy the appropriate existing invoice template rather than overwrite it;
3. organize invoice rows by the required customer and truck grouping;
4. manually assemble and order ticket images;
5. attach dispatch instructions and supporting documents;
6. complete the broker-facing invoice package.

This workflow successfully closed the immediate July invoicing requirement.

## Architectural decision

The successful July run validates the new boundary:

- **Airtable owns operational review and batch state.**
- **Diane 2.0 carries tickets through finalized review.**
- **Google Sheets is presently a downstream invoice-production bridge.**

The Sheets invoice workflow should be replaced or integrated later, but it is not an emergency defect. It is a known next-phase architecture item.

Do not restore Google Sheets as the Review Form source of truth merely because Sheets is still used to prepare invoices.

## Current verified state

Verified from the completed operational work and GitHub source history:

- Airtable-backed Review Form operation is working for the July workload.
- Manual Draft-batch regrouping is working.
- Whole-batch Airtable approval source changes are committed on `main`.
- Ticket Review Status is written and verified as `Approved` in the approval path.
- The July working set reached finalized review.
- The July invoices were completed using the established Sheets-based invoice process.

Not re-verified during this checkpoint:

- the exact live Apps Script deployment version number;
- a complete automated regression suite for all legacy and Airtable review actions;
- automated invoice generation from approved Airtable batches;
- automated ticket-image ordering and invoice-package assembly.

Do not infer those items as complete.

## What was not changed

This checkpoint does not authorize or record changes to:

- Make scenarios beyond work already completed and separately approved;
- Airtable schema unrelated to the review remap;
- automatic downstream processing after approval;
- invoice-template architecture;
- automatic invoice creation or sending;
- ticket-image packet generation;
- accounting system posting;
- freeze-copy Airtable or Make assets.

The checkpoint itself changes documentation only.

## Known remaining work

The next major Diane phase is the post-review invoice-production workflow.

That future work should determine how an Approved Airtable Review Batch becomes a complete invoice package without reintroducing Sheets as the core system. The design must account for:

- invoice grouping rules by customer, truck, job, and billing period;
- approved field selection and export shape;
- invoice numbering and template rules;
- ticket-image retrieval, ordering, and attachment;
- dispatch instructions and other supporting documents;
- exception handling and deliberate human review;
- final invoice approval before sending;
- auditability between source tickets, approved review data, invoice rows, and the finished package.

The old Sheets process is currently the proven operational reference and should be studied before replacement. Do not redesign it from assumptions.

## Smallest correct next step

Document the existing invoice-production workflow exactly as it is performed today, using one completed July invoice as the reference case.

The first investigation should map:

1. the Approved Airtable batch fields used to build invoice rows;
2. the customer and truck grouping rules;
3. the exact Google Sheets template-copy and population steps;
4. the ticket-image ordering and attachment rules;
5. every manual decision that must remain a human review point.

Do not automate or modify the live invoicing workflow until that current-state map is complete and Ernie has approved the proposed boundary.

## Guardrails

- Stay in chat unless Ernie explicitly asks to switch to Work.
- Work one exact step at a time.
- Diagnose and map the current workflow before changing anything.
- Airtable is the operational source of truth for review and batching.
- Do not restore Google Sheets as the final Review Form architecture.
- Treat the current Sheets invoicing process as a proven bridge and reference implementation, not disposable clutter.
- Do not modify Make unless explicitly requested.
- Do not modify Airtable schema or records without an exact proposed action and explicit approval.
- Show the exact proposed source diff or data action before modifying live code or data.
- Preserve manual review for incomplete, fuzzy, duplicate, contradictory, or uncertain ticket data.
- Do not claim a commit, deployment, test, invoice, or live-data change unless it was actually verified.
- Keep client and financial details out of public build logs.
