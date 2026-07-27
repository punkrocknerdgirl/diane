# Diane 2.0 Manual Batching Live Test

Date: 2026-07-26

## Summary

The first controlled live test of Diane's manual Airtable review batching completed successfully.

Two previously verified unbatched Validation Queue records were selected from the Diane review overview and grouped into one Review Batch.

The initial live attempt exposed a field-key mismatch in the new manual-batching write path. The issue was diagnosed, corrected, validated without live writes, and deployed as Apps Script version 85.

## Test Records

### Ticket 0825536

- Validation Queue record: `rec2NSd63jLIECVZa`
- Validation ID: `VAL_INTAKE_MOTIVE_1034043804_1034043807`
- Review Status before batching: `Pending Review`
- Review Batch before test: none

### Ticket 1052089985

- Validation Queue record: `rec0uwH3KaCPOqmHG`
- Validation ID: `VAL_INTAKE_MOTIVE_1024750548_1024750552`
- Review Status before batching: `Pending Review`
- Review Batch before test: none

## Initial Live Failure

Both records were selected and the manual Create Batch action was run.

No Review Batch was created.

The review page returned:

```text
Manual batch create failed: Error: Manual batching blocked:
rec2NSd63jLIECVZa (not Pending Review);
rec0uwH3KaCPOqmHG (not Pending Review)
```

Direct Airtable verification confirmed both records actually had:

- `Review Status = Pending Review`
- `Review Batches = empty`
- `Processed to Tickets = false`
- `Do Not Bill = false`

The Airtable data was correct.

## Root Cause

The manual-batching write path fetched individual Airtable records through `airtableGetRecord_()`.

The request did not include:

```text
returnFieldsByFieldId=true
```

Airtable therefore returned fields keyed by field name, such as:

```js
record.fields['Review Status']
```

The manual-batching validation and verification functions expected fields keyed by Airtable field ID, such as:

```js
record.fields['fldiGPZRcFaTeZJ54']
```

This caused `airtableFieldById_()` to return `undefined`. The missing Review Status value became an empty string, causing both records to be incorrectly blocked as not Pending Review.

The mismatch also affected other field-ID reads in the manual-batching path, including:

- Processed to Tickets checks
- Do Not Bill checks
- existing Review Batch checks
- reciprocal link verification
- assignment-source verification
- Batch Lock verification
- existing-batch key reads

The older read-only Airtable list path uses field names and was not affected.

## Source Fix

The single-record GET request was updated to request fields by field ID:

```diff
-  const url = DIANE_AIRTABLE_API_ROOT + DIANE_AIRTABLE_BASE_ID + '/' + tableId + (recordId ? '/' + encodeURIComponent(recordId) : '');
+  const url = DIANE_AIRTABLE_API_ROOT + DIANE_AIRTABLE_BASE_ID + '/' + tableId + (recordId ? '/' + encodeURIComponent(recordId) : '') + (operation === 'get record' ? '?returnFieldsByFieldId=true' : '');
```

File:

```text
AirtableReadAdapter.gs
```

The change affects only single-record GET requests. The existing name-keyed Airtable list/read path remains unchanged.

## Focused No-Write Validation

The fix was tested locally using mocked `UrlFetchApp` responses.

Confirmed:

- single-record GET included `returnFieldsByFieldId=true`
- synthetic response fields were keyed by Airtable field ID
- both selected Pending Review records passed validation
- `Processed to Tickets = true` still blocked
- `Do Not Bill = true` still blocked
- assignment to another Review Batch still blocked
- Airtable create calls: `0`
- Airtable update calls: `0`
- no live Airtable request occurred during tests

## Deployment

Apps Script project ID:

```text
1kX8RuUiYcKmXExMDg4zhOm-E-rDHMw08JPqegWiBB36sUN0XZSnsJbAZ
```

Existing deployment ID:

```text
AKfycbzzjkCqwsiCO7vahT1BJn6S4fArwA5dTtsoVEmEz9c05i8P9RTprUOtZ0OKvp2prfc
```

Deployment completed:

- source pushed with `clasp push`
- Apps Script version `85` created
- existing Diane deployment updated to version `85`

Version description:

```text
Fix manual batching Airtable field-ID reads
```

## Successful Controlled Live Test

After version 85 was deployed:

1. The Diane review overview was reloaded.
2. Only tickets `0825536` and `1052089985` were selected.
3. Create Batch from Selected was run once.
4. The action completed successfully.
5. Both tickets moved into one Review Batch.

No Make changes were required.

No ticket or batch approval occurred during this test.

No batch-level fields were intentionally edited during the creation test.

## Current Local Repository State

Last verified local state before this checkpoint:

- branch: `main`
- last verified local commit: `b9e43a5a206300f00c87093859b55be5c3d2ffff`
- working tree intentionally modified:

```text
 M AirtableReadAdapter.gs
 M Code.gs
 M Index.html
 A JavaScript.html
 A Stylesheet.html
```

The deployed Apps Script source is ahead of the committed GitHub application source. Do not discard, reset, overwrite, or broadly reformat the existing local changes.

This build log is committed separately so the successful live test and deployed fix are documented.

## Separate UI Requirement

The overview currently includes:

```text
Add selected to existing manual batch...
```

Required future label:

```text
Add selected to batch...
```

The dropdown should allow selected Validation Queue records to be added to any eligible existing Review Batch, including:

- manually created batches
- automatically grouped batches

A manual assignment must preserve the established assignment-source and Batch Lock behavior so automation cannot silently move the manually assigned records later.

This was not implemented during the controlled batching test.

## Next Step

Inspect and verify the newly created Review Batch and its reciprocal Validation Queue links before editing batch fields or approving tickets.

Do not restore the full 57-record production workflow yet.
