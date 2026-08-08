# Diane 2.0: Invoice Architecture Direction Checkpoint

**Date:** 2026-08-08  
**Purpose:** Record the transition from Review Form completion into broker-neutral invoice architecture planning.

## Current verified state

- Repository: `https://github.com/punkrocknerdgirl/diane.git`
- Checkout: `/Users/erniehathaway/Projects/diane`
- Branch: `main`
- Latest deployed checkpoint commit: `919df789aa863eafb4a1819b6541a2252d945b5f`
- Apps Script version 116 is deployed successfully.
- The Diane review workflow is considered complete for now.
- Previous Batches automatically load when the active review queue is empty.
- Previous Batches display batch summaries with expandable ticket details.
- Future Sunday ticket testing may expose normal workflow bugs; those should be handled as separate diagnosis/fix work.

No source files, deployments, Airtable records, Make scenarios, or schemas were modified for this checkpoint.

## Architectural decision

Do not build broker-specific invoice generators first.

The approved direction is:

```text
Approved Diane Batch
        ↓
Universal Invoice Data Object
        ↓
Invoice Output
        ↓
Broker-Specific Invoice Package Skills
        ↓
Final submission package
```

The invoice engine should be broker-neutral. Broker-specific behavior belongs in the later invoice-package skill layer.

## Universal Invoice Object concept

The universal object should carry these core fields:

- Broker
- Customer / Job
- Billing period or date range
- PO
- Work Order
- Origin
- Destination

Invoice lines should carry:

- Ticket number
- Ticket date
- Truck
- Driver
- Material
- Quantity
- Rate
- Line total
- Ticket image or source file

## Source-of-truth finding

Approved Validation Queue records are the invoice source of truth.

Invoice generation must not be built directly from linked Ticket records. The recent Statewide inspection showed that the approved Validation Queue records contained the complete approved invoice values while the linked Ticket records exposed only the source-file URL for the inspected records.

## Statewide discovery result

A recent approved Statewide Materials batch was invoice-ready at the Validation Queue level:

- All required invoice fields were populated.
- All ticket source files were available.
- Line totals were populated and calculated correctly.
- The inspected batch contained four approved tickets dated 2026-07-30.

This confirms that the universal invoice object can be assembled from approved Validation Queue data without making broker-specific generation the first architectural step.

## Future phases

### Phase 1 — Define Universal Invoice Object

Specify the broker-neutral object, field meanings, requiredness, normalization, and source mappings from approved Diane batches.

### Phase 2 — Create generic invoice output

Build a generic invoice output using only the universal object.

### Phase 3 — Create broker-specific packet skills

Add invoice-package skills for:

- Statewide
- HSG
- TNB
- Other brokers as needed

Each skill may define formatting, required attachments, naming, routing, and submission-package rules without changing the universal invoice engine.

### Phase 4 — QBO integration later

Defer QuickBooks Online integration until the universal object, generic output, and broker-specific submission packages are stable.

## Guardrails

- Stay in chat unless explicitly asked to switch to Work.
- Work one step at a time and diagnose before changing anything.
- Airtable remains the operational source of truth.
- Do not restore Google Sheets as the final architecture.
- Do not modify Make unless explicitly requested.
- Show the exact proposed action or diff before modifying source or live systems.
- Keep source edits, commits, pushes, Apps Script sync, version creation, deployment, and live verification as separate states.
- Preserve unrelated untracked files.
- Do not change Airtable, Make, schemas, or deployed Apps Script as part of this architecture checkpoint.

## Next step

Begin Phase 1 by defining the Universal Invoice Data Object from approved Diane batch data. Start with a read-only field contract and source mapping; do not implement code or alter live systems until that contract is reviewed and approved.
