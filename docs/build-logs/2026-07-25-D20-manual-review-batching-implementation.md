# 2026-07-25: Diane 2.0 Manual Review Batching Implementation

## Status

**LOCAL IMPLEMENTATION COMPLETE — STATIC AND MOCK CHECKS PASSED — NOT COMMITTED, PUSHED, DEPLOYED, OR LIVE-TESTED**

The Diane Apps Script review page now has a production-oriented Airtable manual-batching implementation in the local `diane-apps-script` checkout. The source changes remain uncommitted and have not been pushed to Apps Script or deployed.

## Objective

Support this review workflow:

1. Tickets arrive with OCR/parser values already available.
2. The reviewer manually selects tickets that belong together.
3. Diane creates one Airtable Review Batch.
4. Selected Validation Queue records link to that batch.
5. The overview reloads and groups the tickets together.
6. Batch-level corrections remain separate from ticket-level values.
7. Creating a batch does not silently overwrite ticket fields.

Manual batching does not use Make or Google Sheets.

## Source state

Private source repository:

```text
punkrocknerdgirl/diane-apps-script
```

Local checkout:

```text
/Users/erniehathaway/Documents/PRNG/Work/diane-apps-script
```

Starting source commit:

```text
b9e43a5a206300f00c87093859b55be5c3d2ffff
Align overview rows and style ticket number
```

Current local modified files:

```text
AirtableReadAdapter.gs
Code.gs
Index.html
```

No commit or push has occurred.

## Implemented manual-batching behavior

### Airtable identity model

- Ticket selection uses `validationRecordId`.
- Selected Airtable IDs are sent as `validationRecordIds`.
- Existing Review Batches are targeted by `batchRecordId` / `targetBatchRecordId`.
- Airtable record IDs are not passed through `rowNumber`, `rowNumbers`, or `targetBatchKey`.
- Legacy Sheet handlers remain isolated behind explicit routing.

### Manual batch creation

The Airtable-native path:

1. validates all selected Validation Queue records before writing
2. requires `Pending Review`
3. blocks `Processed to Tickets`
4. blocks `Do Not Bill`
5. blocks records already linked to another Review Batch
6. creates one Review Batch with:
   - Review Batch Key beginning `MANUAL_`
   - Batch Status = `Draft`
7. updates selected Validation Queue records with:
   - Review Batches = the new Review Batch record ID
   - Batch Assignment Source = `Manual`
   - Batch Lock = checked
8. re-reads and verifies both direct and reciprocal links

The authoritative relationship write is:

```text
Validation Queue -> Review Batches
```

The reciprocal Review Batches -> Validation Queue field is not written separately.

### Add to existing manual batch

The implementation can add selected eligible Validation Queue records to an existing `MANUAL_` Review Batch using the target Airtable batch record ID.

Records already linked to the target batch are treated as idempotent no-ops. Records linked to a different batch are rejected.

### Safety behavior

- `LockService` protects validation, mutation, and verification.
- Cache-based request IDs prevent duplicate submissions.
- The cache lifecycle includes an in-progress marker.
- Cache is checked before and after the script lock is acquired.
- Pre-write failures clear the marker and may be retried.
- Post-create failures cache an honest partial-failure result.
- Partial failures classify successfully linked and failed Validation Queue records where possible.
- No automatic rollback or deletion is attempted.
- Airtable bulk approval remains disabled.

### Batch starter fields

The implementation intentionally does not write linked starter fields because the current read adapter does not preserve canonical linked IDs for:

- Broker
- Truck
- Driver
- Dispatches

No display text is written into Airtable linked-record fields.

The current batch create path writes Batch Key and Batch Status only. Shared starter-field consensus can be added later as a separate audited improvement.

## UI changes

- Airtable ticket selection now works with string Validation Queue record IDs.
- The Create Batch button receives a stable `createBatchButton` ID and disables while processing.
- Duplicate submissions are blocked during processing.
- Airtable bulk approval displays a clear not-yet-supported message instead of entering the Sheet path.
- Ticket numbers are right-aligned in both:
  - overview ticket-number badges
  - ticket detail prominent ticket-number display

The larger and bold ticket-number styling remains unchanged.

## Checks completed

Passed locally:

- Apps Script / JavaScript syntax checks through Node
- embedded `Index.html` JavaScript syntax check
- `git diff --check`
- mocked Airtable selection tests
- mocked create/add payload tests
- mocked eligibility failures
- mocked duplicate-request lifecycle tests
- mocked partial-failure classification tests
- create-button busy-state test
- legacy numeric row fallback check

No live Apps Script execution or live Airtable mutation was performed.

## Airtable verification after implementation

Airtable was checked independently after the local implementation work.

Current Review Batches table state:

- exactly 2 Review Batch records exist
- both are the expected controlled Dispatch batches
- both remain `Draft`
- each links to its expected Validation Queue record
- no `MANUAL_` Review Batch exists

Verified Review Batches:

```text
DISPATCH_DSP_20260713_006
recrTnkMo9J4Jrsl7
Validation Queue: recUUqPYAjiRPXmCp
```

```text
DISPATCH_DSP_20260713_002
recXqxPnsCni9BXAs
Validation Queue: recXRA8JTGRFLcOnq
```

Both linked Validation Queue records remain `Pending Review`.

No accidental manual batch, Batch Assignment Source, Batch Lock, Ticket update, or other live-write residue was observed.

## Confirmed unchanged systems

- Make scenarios were not modified.
- Google Sheets was not restored or modified.
- Airtable schema was not modified.
- No live Airtable write occurred.
- No source commit occurred in `diane-apps-script`.
- No source push occurred.
- No `clasp push` occurred.
- No Apps Script version was created.
- No deployment was changed.

## Next step

Run a controlled live test with exactly two selected Validation Queue records after the local source patch is reviewed and intentionally moved into the Apps Script test path.

The live test must verify:

1. both tickets can be selected
2. one `MANUAL_` Review Batch is created
3. both Validation Queue records link to it
4. Batch Assignment Source = `Manual`
5. Batch Lock is checked
6. the overview reloads and groups them together
7. no Ticket fields change
8. Apply Batch Fields is not triggered
9. no broader production scope is enabled

Do not restore the full 57-record scope until this test passes and Airtable is independently verified.