# 2026-07-23: Airtable Review and Batching Workflow Direction Locked

## Purpose

Record the approved Airtable-only review, batching, and status workflow before changing the current Diane review application or Airtable structure.

This entry documents workflow decisions only. No review-page redesign, Airtable schema change, Make change, or Apps Script change was made in this commit.

## Cutover and test-data plan

- Airtable cutoff date: **2026-07-01**.
- Ticket data for **July 1 through July 12** must eventually be migrated from Sheets into Airtable.
- Current **July 13 through July 18** Airtable ticket data has already been invoiced and the drivers have already been paid.
- That current data will remain temporarily for testing review batching, invoice batching, and downstream workflow.
- After the Airtable-only structure is complete, temporary test data will be wiped and production processing will restart clean from **July 1, 2026**.
- Sheets will not remain part of the final operating structure.

## Approved status flow

### Validation Queue

- Reviewed records should be `Approved`.
- Approved records should be marked `Processed to Tickets` after approved values are written to the linked Ticket.
- Approved review values must write back to the linked Ticket record.

### Tickets

`Ready for Billing` is removed from the intended workflow because it is redundant.

Approved Ticket Status flow:

```text
Intake
  -> Needs Review
  -> Ready to Invoice
  -> Invoiced
```

Rules:

- Approved tickets move directly to `Ready to Invoice`.
- Tickets move to `Invoiced` only after the actual QBO invoice is created.

## Approved review workflow

1. OCR and parser populate ticket-level review fields.
2. Diane attempts to create Review Batches before individual ticket review.
3. Reviewer opens a Review Batch.
4. Reviewer enters or corrects shared batch fields, including Broker, Customer / Job, PO, Work Order / Order, Origin, Destination, Rate, and other shared values.
5. Shared values are applied to every ticket in the batch.
6. Reviewer checks each ticket against the source image.
7. Ticket-specific fields are corrected as needed.
8. Completed tickets or the batch are approved.
9. Approved tickets move to `Ready to Invoice`.
10. Invoice Batches are created later for QBO invoicing.
11. Tickets move to `Invoiced` after the QBO invoice is created.

## Review Batch requirements

Diane may suggest or create Review Batches automatically, but manual decisions are authoritative.

Required manual controls:

- Select multiple unbatched tickets and create a new Review Batch.
- Add a ticket to an existing Review Batch.
- Choose the receiving existing batch.
- Move a ticket from one Review Batch to another.
- Remove one ticket from a batch.
- Remove several selected tickets from a batch.
- Dissolve a batch without deleting tickets.
- Manually assemble tickets when matching data is insufficient.
- Keep unbatched tickets visible in a separate queue.

Manual assignments, removals, and moves must override automatic batching. Diane must not automatically recreate a batch assignment that the reviewer manually removed or changed.

Suggested controls:

- `Batch Assignment Source`: `Auto`, `Manual`, or `Unassigned`
- `Batch Lock`: prevents automatic rebatching after manual intervention

Existing-batch choices should display:

```text
Customer / Job | PO | Work Order | Truck | Ticket Count
```

## Truck and driver rules

Truck is the stable batching and sorting field. Driver does not control batching.

Rules:

- Use truck number for sorting and batching.
- Truck 01 normally suggests driver `DC`.
- Truck 02 normally suggests driver `DC`.
- A truck's default driver may be suggested from the Truck record.
- Driver remains a ticket-level field.
- A reviewer may override the driver for one ticket only.
- A ticket-level driver override must not change the truck default, other tickets, the batch assignment, or permanent truck-driver logic.

Clean rule:

```text
Truck determines grouping.
Driver describes the individual ticket.
```

## New Broker quick setup

The review workflow needs an `Add Broker` action that does not block a live run with unnecessary configuration.

Required fields:

- Broker Name
- Broker Code
- At least one truck alias mapping

Optional fields:

- Contact Name
- Submission Email
- Special Notes

Missing contact or email data must not block review.

Saving a new broker should immediately:

1. Create the Broker record.
2. Save any provided contact details.
3. Create all entered truck aliases.
4. Map every alias to Truck 01 or Truck 02.
5. Make the new Broker immediately selectable in the active review.

Batching rules, payout settings, invoice preferences, and other extended setup are explicitly deferred.

## Truck alias structure

Truck aliases should be stored centrally, preferably in the existing `Aliases` table, with Broker context to prevent collisions.

Suggested fields:

- Alias Type
- Broker
- Alias Value
- Maps To Truck
- Status
- Notes

Multiple broker-specific aliases may map to one internal truck. Example aliases for Truck 01 include `1`, `01`, `Truck 1`, `Unit 101`, and `White Peterbilt`.

## Current implementation guardrails

- Airtable is the source of truth.
- Do not redesign the review page unless the approved workflow requires it.
- Diagnose the current structure before changing it.
- Make the smallest safe schema and application changes first.
- Do not make broad changes without first documenting the exact fields, automations, and code paths affected.
- Do not retain Sheets in the final structure.

## Next step

Inspect the current Airtable tables and fields for Tickets, Validation Queue, Review Batches, Brokers, Trucks, and Aliases. Compare the existing structure to the approved rules above and produce a smallest-safe-change list before making any schema changes.