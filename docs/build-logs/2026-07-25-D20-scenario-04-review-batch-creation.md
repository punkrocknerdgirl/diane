# 2026-07-25: Diane 2.0 Scenario 04 Review Batch Creation

## Status

**PASSED — CONTROLLED REVIEW BATCH CREATION PROVEN FOR TWO RESOLVED TEST RECORDS**

Scenario scheduling remains off. Module [2] remains restricted to the three-record test scope. Validation Queue records and Tickets were not updated. The Existing Review Batch branch was not configured.

## Goal

Create real Airtable Review Batch records containing useful starter values for the Diane review form. Exact automated guessing is not required at this stage. Every ticket will still be manually inspected and corrected during review.

## Proven downstream sequence

```text
[24] Make Code
-> Has Review Batch Key filter
-> [27] Airtable Make an API Call: duplicate Review Batch check
-> [28] Router
-> No Existing Review Batch
-> [29] Airtable Create a Record
```

The no-candidate test record produced a blank `reviewBatchKey` and correctly stopped before downstream Review Batch processing.

## Module [29] mapping correction

The original nested expressions such as:

```text
get([24] Result -> resolvedDispatch; dispatchJob)
```

were passed to Airtable as literal text and caused Airtable 422 errors.

Module [24] was updated to expose direct top-level outputs. Module [29] now uses direct Make output pills for plain Review Batch fields:

- Review Batch Key: `[24].reviewBatchKey`
- Batch Status: `Draft`
- Customer / Job: `[24].resolvedDispatchJob`
- PO Number: `[24].resolvedDispatchPoNumber`
- Work Order / Order: `[24].resolvedDispatchWorkOrder`
- Origin: `[24].resolvedDispatchOrigin`
- Destination: `[24].resolvedDispatchDestination`
- Rate: `[24].resolvedDispatchRate`

Optional linked-record fields were intentionally left empty for this proof:

- Broker
- Truck
- Driver
- Dispatches

Driver remains blank so the review page can apply the selected truck's default-driver suggestion later.

## Validation Queue link correction

The initial `[24].validationRecordId` value traced back to the Parser Output record ID rather than the Validation Queue record ID. Airtable rejected it because the record belonged to the Parser Outputs table.

The Module [29] Validation Queue mapping was corrected to use the direct top-level Airtable record ID from Module [2]:

```text
[2] Search Validation Queue -> ID
```

This guarantees the linked record belongs to the Validation Queue table.

Empty linked-record item rows were also deleted completely. Merely clearing a linked-record pill left an empty item that Airtable received as `""`, causing `Value "" is not a valid record ID`.

## Controlled run result

Module [29] completed successfully twice and created these Review Batch records:

### DISPATCH_DSP_20260713_006

- Airtable Review Batch record: `recrTnkMo9J4Jrsl7`
- Batch Status: Draft
- Validation Queue: `recUUqPYAjiRPXmCp`
- Customer / Job: Michel's Data
- PO Number: Michel's Data
- Work Order / Order: blank
- Origin: Texas Crushed Stone
- Destination: Hubbard, TX
- Rate: 40

### DISPATCH_DSP_20260713_002

- Airtable Review Batch record: `recXqxPnsCni9BXAs`
- Batch Status: Draft
- Validation Queue: `recXRA8JTGRFLcOnq`
- Customer / Job: Mario Sinacola
- PO Number: blank
- Work Order / Order: blank
- Origin: Heidelberg Materials
- Destination: Mario Sinacola
- Rate: 13

Airtable was independently checked after the Make run. Exactly two matching Review Batch records exist, both are Draft, both contain the expected starter text, and each links to the correct Validation Queue record.

## Safety verification

- Scenario scheduling remains off.
- Module [2] remains restricted to three selected Validation Queue records.
- Two Review Batch records were created intentionally.
- The no-key record created no Review Batch.
- No Validation Queue records were updated.
- No Tickets were updated.
- No Dispatch links were written.
- Broker, Truck, Driver, and Dispatches remain blank on the created Review Batches.
- The Existing Review Batch branch remains unconfigured.
- The full 57-record production scope was not restored.
- No Apps Script source or deployment changed.
- Google Sheets was not restored.

## Current conclusion

Scenario 04 can now create a real Review Batch with useful starter data for the review form. This satisfies the immediate operating priority: get some recognizable values into review, then let the human reviewer correct and save them.

## Next step

Inspect the existing Apps Script review page against the two new Airtable Review Batch records and confirm that:

1. both batches load
2. their linked tickets appear
3. the saved Review Batch fields populate the review form
4. blank Driver allows the existing truck-default-driver suggestion behavior

Do not restore the full 57-record scope, update Validation Queue records, update Tickets, or configure the Existing Review Batch branch until the review-page read path is proven.