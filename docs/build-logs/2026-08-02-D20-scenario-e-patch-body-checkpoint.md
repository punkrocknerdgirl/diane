# Diane 2.0 Scenario E Existing-Batch PATCH Body Checkpoint

**Checkpoint time:** 2026-08-02 10:42 AM Central  
**Repository:** `punkrocknerdgirl/diane`  
**Live Airtable base:** Diane 2.0 (`appMWvtLU0hMBqjLC`)  
**Make scenario:** `E - Build Review Batches`

## Working rules

- Stay in chat unless Ernie explicitly asks to switch to Work.
- Work one exact step at a time.
- Diagnose before changing anything.
- Do not use fragile inline Make formulas in Airtable linked-record fields when a visible module/API path is available.
- Do not activate the schedule.
- Do not remove the one-record test scope yet.
- Do not modify unrelated Make modules, filters, routes, Airtable schema, or live records.
- Good enough for government work: preserve existing links, add the current record, avoid duplicates, and keep the linked ticket image reachable.

## Current verified test record

Validation Queue record:

- Validation ID: `VAL_INTAKE_MOTIVE_1034044815_1034044815`
- Validation Queue record ID: `rec0R7nKwIVKQXap2`
- Linked Ticket: `INTAKE_MOTIVE_1034044815_1034044815`
- Ticket record ID: `rec68FYBIEU9OJPI6`
- Review Status: `Pending Review`
- Review Batches: empty before the scoped test
- Clean Status: `Cleaned`
- Original and cleaned file URL/ID values are present
- Linked ticket image was previously verified reachable

Existing Review Batch involved in the test:

- Review Batch record ID: `recqoQDOhaCgcOdYi`
- Existing linked Validation Queue record ID: `recDMS71BebYdwinQ`

Expected final linked-record array:

```json
[
  "recDMS71BebYdwinQ",
  "rec0R7nKwIVKQXap2"
]
```

## Scenario E current structure

Relevant modules:

- `[2]` Airtable Search Records
- `[23]` Array aggregator
- `[24]` Make Code
- `[27]` Airtable Make an API Call, GET existing Review Batch
- `[28]` Router
- `[29]` Airtable Create a Record on `No Existing Review Batch`
- `[36]` Make Code, assembles the complete PATCH body
- `[37]` Airtable Make an API Call, intended PATCH of existing Review Batch

Visible routes include:

- Pass all active Dispatches
- Has Review Batch Key
- No Existing Review Batch
- Existing Review Batch
- Has linked Truck

## Module [2] scoped test

Module `[2]` remains deliberately restricted to one record:

```text
AND(
  {Review Status} = "Pending Review",
  COUNTA({Review Batches}) = 0,
  {Validation ID} = "VAL_INTAKE_MOTIVE_1034044815_1034044815"
)
```

Limit remains `1`.

Do not remove this scope until the existing-batch path is proven and reread.

## Existing-batch strategy selected

The chosen method is:

1. Read the existing Review Batch with module `[27]`.
2. Read all currently linked Validation Queue record IDs from `[27]` output.
3. Add the current Validation Queue record ID from `[2]`.
4. Deduplicate in module `[36]`.
5. Serialize a complete Airtable PATCH body in module `[36]`.
6. Send that body through module `[37]` using Airtable `Make an API Call`.

This avoids replacing existing links with only the current record and avoids fragile inline Make formulas.

## Module [36] configuration

Inputs:

- `existingValidationQueue` mapped from `[27] Body -> records[] -> fields -> Validation Queue[]`
- `currentValidationRecordId` mapped from `[2] ID`

Current code:

```javascript
const {
  existingValidationQueue,
  currentValidationRecordId
} = input;

function extractRecordIds(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") return item;

      if (item && typeof item === "object") {
        return Object.values(item).find(
          (entry) =>
            typeof entry === "string" &&
            entry.startsWith("rec")
        );
      }

      return null;
    })
    .filter(Boolean);
}

const validationQueueIds = [
  ...new Set([
    ...extractRecordIds(existingValidationQueue),
    currentValidationRecordId
  ].filter(Boolean))
];

return {
  patchBody: JSON.stringify({
    fields: {
      "Validation Queue": validationQueueIds
    }
  })
};
```

## Module [36] controlled verification

An isolated module test was performed with:

- existing linked record: `recDMS71BebYdwinQ`
- current Validation Queue record: `rec0R7nKwIVKQXap2`

Verified output:

```json
{"fields":{"Validation Queue":["recDMS71BebYdwinQ","rec0R7nKwIVKQXap2"]}}
```

This proves the code can preserve the existing link, append the current record, and deduplicate the array.

The isolated module test did not alter Airtable.

## Module [37] intended configuration

Module `[37]` is Airtable `Make an API Call`.

Intended values:

- URL: `/v0/appMWvtLU0hMBqjLC/tbl37gqQqfH1yd8Ww/` plus mapped `[27] Body -> records[] -> id`
- Resolved test target: `/v0/appMWvtLU0hMBqjLC/tbl37gqQqfH1yd8Ww/recqoQDOhaCgcOdYi`
- Method: `PATCH`
- Header: `Content-Type: application/json`
- Body: mapped live output `[36] Result -> patchBody`

Only the `Validation Queue` field should be included in the PATCH body. Every other Review Batch field must remain untouched.

## Scoped run failure and verified diagnosis

A scoped Scenario E run reached module `[37]` and failed with:

```text
The request body missed the required fields field.
```

Runtime inspection verified:

- the URL was present and correct
- the method was `PATCH`
- the `Content-Type: application/json` header was present
- the Body was absent from module `[37]` runtime input

No Airtable record was changed by the failed PATCH.

The problem is not module `[36]` JSON generation. The problem is that module `[37]` has a blank Body field and therefore sends no PATCH payload.

## Work-tab inspection

Work successfully loaded the existing Make scenario and confirmed read access.

Work then inspected module `[37]` and verified:

- URL is mapped to `[27] Body -> records[] -> id`
- Method is `PATCH`
- `Content-Type: application/json` is present
- Body is completely blank

Work closed the module without saving. Nothing was changed during that inspection.

## What was changed during this session

- Added Make Code module `[36]` on the Existing Review Batch route.
- Configured `[36]` to normalize existing linked-record output, append the current record ID, deduplicate, and serialize a complete Airtable PATCH body.
- Added Airtable API module `[37]` for the existing-batch PATCH path.
- Configured `[37]` URL, method, and header.
- Saved the Make scenario after those changes.
- Ran one scoped test, which failed safely because `[37]` Body was blank.

## What was not changed

- Module `[37]` Body is still blank.
- No Airtable linked records were updated by the failed PATCH.
- No Review Batch was created or duplicated by the failed PATCH.
- Module `[2]` test scope was not removed.
- The schedule was not intentionally activated.
- No Airtable schema changes occurred.
- No unrelated Make modules or routes were changed.
- No source code, deployment, or Apps Script changes occurred.

## Exact next step

In Work, open module `[37]` and map this live output into the Body field:

```text
[36] Result -> patchBody
```

Then:

1. Save module `[37]`.
2. Save the scenario.
3. Do not run yet until the Body mapping is visibly confirmed.

After visible confirmation, perform one scoped run and verify module `[37]` runtime input contains:

```json
{"fields":{"Validation Queue":["recDMS71BebYdwinQ","rec0R7nKwIVKQXap2"]}}
```

Then verify:

- HTTP 200 from `[37]`
- the existing Review Batch still exists as one record
- both Validation Queue links are present
- no other Review Batch fields changed
- no duplicate Review Batch was created
- linked ticket image remains reachable

Because module `[2]` excludes records after the Review Batch link is populated, a second full scoped run may produce no eligible record rather than reaching `[37]`. Treat that as expected only after a direct Airtable readback confirms the first run succeeded. Do not broaden the scope merely to force a second execution.
