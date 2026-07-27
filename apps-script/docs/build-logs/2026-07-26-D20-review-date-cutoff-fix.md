# Diane 2.0 Review Date Cutoff Fix

Date: 2026-07-26

## Summary

The Diane Apps Script review overview omitted ticket `1052089985` even though its Airtable Validation Queue and Ticket records were otherwise eligible for review.

The issue was traced to a stale hard-coded review-date cutoff in `AirtableReadAdapter.gs`.

## Verified Symptoms

- Ticket `0825536` appeared in the review overview.
- Ticket `1052089985` did not appear anywhere on the page.
- Browser Command-F could not find `1052089985` because the record was never rendered.
- The page reported `Loaded 18 review group(s)`.
- Airtable showed both records as `Pending Review` with linked Tickets in `Needs Review` status and `Live Work` import disposition.

## Airtable Records Compared

### Missing record

- Ticket number: `1052089985`
- Validation Queue record: `rec0uwH3KaCPOqmHG`
- Validation ID: `VAL_INTAKE_MOTIVE_1024750548_1024750552`
- Linked Ticket: `recCVauUgZfHOU2jX`
- Final Truck: `WRIGHT`
- Final Material: `1/2" X 0 KILN FEED`
- Final Quantity: `25.43`

### Visible comparison record

- Ticket number: `0825536`
- Validation Queue record: `rec2NSd63jLIECVZa`
- Validation ID: `VAL_INTAKE_MOTIVE_1034043804_1034043807`
- Linked Ticket: `recjjGouH4B8Z2UoT`
- Final Truck: `2886`
- Final Material: `11/2"SUPER BASE TEST`
- Final Quantity: `21.65`

No legitimate Airtable eligibility difference was found between the two records.

## Root Cause

`getPendingReviewBatchesFromAirtable()` mapped each Validation Queue record and then silently excluded records whose derived ticket date was before July 13, 2026:

```js
const triageDateKey = reviewDateKey_(row.ticketDateCandidate || row.ticketDate);
if (triageDateKey && triageDateKey < '20260713') return;
```

This cutoff existed in `AirtableReadAdapter.gs` around lines 272-273 in the inspected source.

The missing record's derived date fell before `2026-07-13`, causing the record to be dropped before grouping and rendering.

## Confirmed Non-Causes

- No Airtable `maxRecords` or page-size cap was present.
- Airtable pagination followed all returned offsets.
- Grouping appended records and did not overwrite them.
- Missing linked Ticket, Parser, or OCR records were not the cause.
- Client-side filtering was not the cause.
- Browser Command-F was functioning correctly and only searched already-rendered text.

## Source Change

Removed only the stale cutoff:

```diff
-    const triageDateKey = reviewDateKey_(row.ticketDateCandidate || row.ticketDate);
-    if (triageDateKey && triageDateKey < '20260713') return;
```

All other review eligibility rules remained intact.

## Validation and Deployment

Initial deployment attempt:

- Apps Script version `83` was created and deployed before the local source change had been pushed.
- Version `83` therefore still contained the cutoff and did not fix the issue.

Correct deployment sequence:

```bash
clasp push
clasp version "Remove stale review-date cutoff"
clasp deploy -i AKfycbzzjkCqwsiCO7vahT1BJn6S4fArwA5dTtsoVEmEz9c05i8P9RTprUOtZ0OKvp2prfc -V 84
```

Verified final state:

- Six Apps Script files pushed.
- Apps Script version `84` created.
- Existing Diane deployment updated to version `84`.
- Ticket `1052089985` appeared after reloading the review page.
- No Airtable data or Make scenario changes were required.

## Future Feature: Review Queue Search

Add a search field to the Diane review overview in a future update.

Required behavior:

- Search the full Airtable review queue, not only records already rendered in the browser.
- Support ticket number.
- Support Validation ID.
- Support broker.
- Support customer/job.
- Support truck.
- Support driver.
- Preserve existing grouping, batching, and review behavior.
- Treat this as a separate scoped improvement, not part of the cutoff fix.
