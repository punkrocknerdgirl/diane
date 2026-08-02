# Diane 2.0 Scenario E Existing-Batch Checkpoint

**Checkpoint time:** 2026-08-01 9:16 PM Central  
**Repository:** `punkrocknerdgirl/diane`  
**Live Airtable base:** Diane 2.0 (`appMWvtLU0hMBqjLC`)  
**Make scenario:** `E - Build Review Batches`  

## Working rule

Good enough for government work:

- A Validation Queue record needs to get from point A to point B.
- Blank extracted/review fields are acceptable.
- The linked ticket image must remain reachable.
- One input record must not create duplicate Review Batches.
- Do not overengineer Make field formulas when a simpler module/API path is safer.

## Current verified Airtable state

The accidental fallback Review Batch records from the prior bad run were removed.

The Review Batches table is back to the six original dispatch-resolved records, plus no fallback record for the current test Validation Queue record.

Current test Validation Queue record:

- Validation ID: `VAL_INTAKE_MOTIVE_1034044815_1034044815`
- Airtable record ID: `rec0R7nKwIVKQXap2`
- Review Status: `Pending Review`
- Review Batches: empty
- Linked Ticket: `INTAKE_MOTIVE_1034044815_1034044815`
- Ticket record ID: `rec68FYBIEU9OJPI6`
- Clean Status: `Cleaned`
- Original source file URL and ID are present
- Cleaned file URL and ID are present

The test record therefore has a reachable image and is eligible for Scenario E.

## Scenario E current structure

Relevant modules:

- `[2]` Airtable Search Records
- `[23]` Array aggregator
- `[24]` Make Code
- `[27]` Airtable Make an API Call
- `[28]` Router
- `[29]` Airtable Create a Record on the `No Existing Review Batch` route
- `[32]` Airtable Update a Record on the new `Existing Review Batch` route

## Changes completed in Make

### Module [24] input

Added:

- `validationId = 2. Validation ID`

Current input variables are:

- `validationRecordId = 23.Key`
- `dispatches = 23.Array[]`
- `validationId = 2.Validation ID`

### Module [24] code

The code now destructures `validationId`:

```js
const {
  validationRecordId,
  validationId,
  dispatches
} = input;
```

The intended Review Batch key logic was changed so unresolved/ambiguous records use the existing Validation ID directly rather than adding another `VAL_` prefix:

```js
let reviewBatchKey = "";

if (
  resolutionStatus === "resolved" &&
  resolvedDispatch?.dispatchId
) {
  reviewBatchKey =
    `DISPATCH_${resolvedDispatch.dispatchId}`;
} else {
  reviewBatchKey =
    validationId ?? "";
}
```

### Module [2] test scope

Module `[2]` is still deliberately restricted to one test record:

```text
AND(
  {Review Status} = "Pending Review",
  COUNTA({Review Batches}) = 0,
  {Validation ID} = "VAL_INTAKE_MOTIVE_1034044815_1034044815"
)
```

Limit remains `1`.

Do not remove this scope until the existing-batch and no-existing-batch paths are both proven.

### Router [28]

Two routes now exist:

1. `No Existing Review Batch`
   - condition: `[27].body.records[]` array length equals `0`
   - leads to module `[29]` Create a Record

2. `Existing Review Batch`
   - condition: `[27].body.records[]` array length greater than `0`
   - leads to module `[32]` Update a Record

### Module [29]

Module `[29]` creates a Review Batch when none exists.

Key mappings include:

- Review Batch Key = `[24].result.reviewBatchKey`
- Batch Status = `Draft`
- Validation Queue = `[2].ID`
- Customer / Job, PO, Work Order, Origin, Destination, and Rate from resolved dispatch outputs

No changes are currently needed in `[29]`.

### Module [32]

Module `[32]` was added as Airtable `Update a Record` against the `Review Batches` table.

Current intended mappings:

- Record ID = `[27].Body.records[]: id`
- Validation Queue must preserve existing linked Validation Queue records and add `[2].ID`
- Every other field must remain untouched

Important current uncertainty:

- A simple linked-record update containing only `[2].ID` may replace the batch's existing Validation Queue links.
- The current Make field UI was being explored with existing links plus `[2].ID` as separate pills.
- No formula should be added blindly.
- The exact safest non-formula method for preserving existing linked records and appending the new record still needs fresh research/inspection.

## Test run result

The scoped test run returned HTTP 200 through module `[27]`.

It did not create a fallback Review Batch because `[24]` resolved the record to an existing dispatch batch. Module `[27]` found an existing Review Batch with dispatch data including Ash Grove, rate 12, and Draft status.

Before the new route existed, the scenario had no action for an existing Review Batch. Therefore the test Validation Queue record remained unlinked.

This diagnosed the actual missing behavior:

> Existing Review Batch found -> add the current Validation Queue record to that existing batch without removing prior linked records.

## Critical stop point

- Do not run Scenario E again yet.
- Do not activate the 15-minute schedule.
- Do not remove the one-record test scope.
- Do not use a Make formula in the linked-record field until the safest supported method is verified.
- No Airtable schema changes are needed.
- No live Airtable data was changed by module `[32]` because the scenario was not rerun after adding it.

## Fresh-start research task

Determine the safest, simplest Make-native way to append one Airtable linked-record ID to an existing linked-record array without replacing existing links and without relying on a fragile inline formula in a field that does not reliably accept formulas.

Preferred options to investigate in this order:

1. Use an Airtable API PATCH module with a complete JSON array assembled from module `[27]` output plus `[2].ID`.
2. Use a dedicated Make array module before `[32]` to produce the complete array, then map that array directly.
3. Use another Airtable read/update pattern that preserves links automatically.

Avoid clever one-line expressions if a transparent module-based approach is available.

## Definition of done for the next test

For `VAL_INTAKE_MOTIVE_1034044815_1034044815`:

- the existing Review Batch remains one record
- its previous Validation Queue links remain intact
- the test Validation Queue record is added
- no duplicate Review Batch is created
- the linked ticket image remains reachable
- rerunning the same scoped test produces no duplicate or destructive change
