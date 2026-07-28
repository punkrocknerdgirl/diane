# Diane 2.0 Cleaned OCR Gate and Transactional Reset Checkpoint

**Date:** 2026-07-28

## Purpose

Document the completed Make OCR routing correction, the verified Airtable transactional reset, the successful fresh July 1-forward import, and the current controlled testing state of the ticket-cleaning scenario.

## Current verified state

Diane 2.0 now contains a fresh July 1-forward production import and is partway through controlled image-cleaning tests.

The intended flow remains:

1. Create an Import Run with a July 1, 2026 pull-from date.
2. Run the Motive import into Airtable Tickets.
3. Clean each imported source image before OCR.
4. OCR the cleaned file.
5. Parse the OCR output.
6. Create Validation Queue records.
7. Perform manual review.
8. Write approved values back to Tickets.
9. Continue into batching and invoicing.

Airtable remains the operational source of truth. Google Sheets is not part of the final architecture.

## Work completed before the fresh import

### Scenario 03 cleaned-file extractor routing

Previously completed and retained:

- Added cleaned-file routing after Airtable Search Records [12].
- If a Cleaned File ID exists, Google Drive downloads the cleaned file.
- Otherwise, the fallback route downloads Source File ID.
- The selected file data is merged and passed to the existing extractor endpoint.
- Existing Parser Output, Validation Queue, and Ticket update modules were not redesigned.

Checkpoint commit already present before this work:

`e965d59e02c717f5a916412d38e58fe3db834584`

### OCR scenario gate and file mapping

Verified original Airtable Search Records [43] formula:

```text
AND(
  {Source File ID},
  {Ticket Status} = "Intake",
  NOT({OCR Runs})
)
```

This allowed OCR to pick up an Intake ticket before cleaning finished.

Verified Google Drive [5], named `Download Cleaned File`, was still mapped to:

```text
43. Source File ID
```

Completed changes:

- Airtable [43] output fields now include the cleaning fields needed downstream.
- Google Drive [5] File ID is now mapped to:

```text
43. Cleaned File ID
```

- Airtable [43] now uses the cleaned-file gate:

```text
AND(
  {Cleaned File ID},
  {Clean Status} = "Cleaned",
  {Send Cleaned File to OCR} = 1,
  {Ticket Status} = "Intake",
  NOT({OCR Runs})
)
```

- Limit remains 75.
- The scenario was saved.
- The scenario was not run after this change.
- The Make schedule was not enabled.

## Make field-mapping refresh rule

A recurring Make behavior was confirmed.

When a newly added Airtable output field does not appear in a downstream mapper, even after refreshing the module:

1. Save the module.
2. Ignore Make warnings and save the scenario anyway.
3. Exit completely out of the scenario.
4. Reopen the scenario.
5. Refresh or run the Airtable module.
6. Reopen the downstream module.
7. The new field mapping should then appear.

This exact sequence was required before `43. Cleaned File ID` appeared for Google Drive [5].

## Possible blog post note

Future blog topic:

**Why Make Won't Show Your Airtable Field Even After Refreshing**

The useful lesson is that refreshing a module may not update the downstream mapper schema until the scenario is saved, fully exited, reopened, and the source module is refreshed again.

## Transactional inventory before reset

Read-only counts were verified before deletion:

| Table | Records |
|---|---:|
| Import Runs | 2 |
| Tickets | 82 |
| OCR Runs | 82 |
| OCR Outputs | 82 |
| Parser Outputs | 82 |
| Validation Queue | 82 |
| Review Batches | 4 |
| Invoice Batches | 0 |

Total records in the approved reset scope: **416**.

The two Import Runs were:

- `MOTIVE_LIVE_RESTART_20260701`, Pull From `2026-07-01`
- `MOTIVE_HSG_20260726`, Pull From `2026-07-26`

All 82 Tickets were linked to one of those two July-forward Import Runs. Ticket Date values were not relied on because improving date extraction is part of the parsing work.

## Transactional reset completed

Ernie explicitly approved the wipe.

Deleted downstream to upstream:

| Table | Deleted |
|---|---:|
| Review Batches | 4 |
| Validation Queue | 82 |
| Parser Outputs | 82 |
| OCR Outputs | 82 |
| OCR Runs | 82 |
| Tickets | 82 |
| Import Runs | 2 |
| **Total** | **416** |

`Invoice Batches` was already empty.

All deletion calls reported success.

A final read-only check confirmed Review Batches contained 0 records after deletion.

## Fresh July import completed

A new Airtable Import Run was created and verified:

- Record ID: `rectCOPK8zNQEsFmi`
- Import Run Key: `MOTIVE_LIVE_FRESH_20260701_20260728`
- Source System: `Motive`
- Import Disposition: `Live Work`
- Run Status at creation: `Ready`
- Pull From: July 1, 2026 at 12:00 AM America/Chicago

Scenario 01 was renamed:

`A - Get Motive Tickets`

Preflight changes and verification:

- Search Import Runs [26] now filters for `Run Status = Ready` instead of `Planned`.
- Sort direction was changed to ascending.
- Limit remains 1.
- Motive `created_after` is mapped to `[26] Pull From`.
- Tools [32] retains `run_start_time = now`.
- Airtable [31] updates the same Import Run via `[26] ID`.
- Airtable [31] writes `Pulled At = [32] run_start_time`.
- Airtable [31] now writes `Run Status = Completed`.

The first live run partially completed, then Google Drive Upload [8] timed out on operation 62.

Verified after the partial run:

- 61 Tickets had been created and linked.
- The Import Run remained `Ready`.
- Pulled At remained blank.
- The failed operation did not create Ticket 62.

The scenario was rerun without changing the pipeline. Duplicate protection skipped the 61 existing tickets and created the remaining 22.

Final verified import state:

- Motive documents returned: 32
- Attachment checks: 83
- Existing Tickets skipped on rerun: 61
- New Tickets created on rerun: 22
- Total Tickets: 83
- Import Run status: `Completed`
- Pulled At populated: July 28, 2026 at 11:25:49 AM America/Chicago
- Pull From remained July 1, 2026
- Linked Tickets: 83
- Tickets table total: 83
- All 83 Tickets are linked to the fresh Import Run.
- All 83 Tickets are in `Intake`.
- All 83 have Import Key, Source File ID, and Source File URL.
- Import Run `Ticket Count` remains blank; the linked Tickets and table count independently verify 83.

The Google Drive upload timeout appears to have been transient because the same missing work completed successfully on rerun.

## Scenario naming cleanup

Make had been reordering scenarios that began with numbers. The scenarios were renamed alphabetically:

- `A - Get Motive Tickets`
- `B - Clean Ticket Images`
- `C - OCR Workflow`
- `D - Document AI Extractor`
- `E - Build Review Batches`

All visible Make schedules remained disabled.

## Ticket-cleaning scenario current state

The active cleaning scenario is:

`B - Clean Ticket Images`

The Airtable Search Records [11] filter was corrected from the backward gate:

```text
AND(
  {Clean Status} = "Needs Clean",
  {Send Cleaned File to OCR} = 1
)
```

to:

```text
AND(
  {Ticket Status} = "Intake",
  NOT({Cleaned File ID}),
  OR(
    {Clean Status} = "",
    {Clean Status} = "Needs Clean"
  )
)
```

This correctly selects fresh Intake tickets that do not yet have a cleaned file. `Send Cleaned File to OCR` is set only after cleaning succeeds.

The final Airtable success update [21] was inspected and verified to write:

- Record ID = `[11] ID`
- Clean Status = `Cleaned`
- Send Cleaned File to OCR = `Yes`
- Cleaned File URL = `[9] Web View Link`
- Cleaned File ID = `[9] File ID`
- Cleaning Error = blank
- Cleaned At = `now`
- Smart links = `No`

Controlled tests completed:

1. Limit 1 completed successfully and wrote the full cleaned-file success state.
2. Limit 5 completed successfully for all five operations.
3. A larger test with a 5-second fixed sleep completed two operations, then the third reached HTTP [4] before CloudConvert Get a Job [17] had produced the export URL.
4. Increasing the fixed sleep to 12 seconds did not eliminate the failure; a later job still returned an empty `[17] URL`.

The failure is specifically:

```text
HTTP Download a file [4]
Required URL uses 17. URL, but 17. URL is empty.
```

This is not evidence of a bad source file. It is a timing race: CloudConvert job completion time varies, especially after the scenario has been processing for a while.

### Fixed-sleep decision

A long fixed sleep is rejected as the final design because it penalizes every fast file and still cannot guarantee that every slower job is complete.

Agreed architectural direction:

1. Use a short initial sleep, approximately 3 to 5 seconds.
2. Check CloudConvert job status.
3. If the export URL exists, continue immediately.
4. If the export URL is empty, wait briefly and retry the status check.
5. Cap retry attempts.
6. If the cap is reached, write a real Cleaning Error instead of crashing or silently ignoring the ticket.

This is adaptive polling, not a larger fixed delay.

### Unused modules

- Google Sheets [1] is an unconnected legacy module from the old Sheets architecture and can be removed.
- CloudConvert Get a Task [10] was inspected. It has no Task ID mapped and is unused. It can be removed.
- No adaptive polling route has been built yet.

## What was not changed

No configuration or reference data was deleted or modified, including:

- Brokers
- Drivers
- Trucks
- Materials
- Aliases
- Dispatches
- Airtable schema
- fields
- formulas
- views
- interfaces
- Airtable automations

Also unchanged:

- Make schedules remain disabled.
- Scenario C OCR Workflow has not been run against the fresh cleaned records in this checkpoint.
- No Apps Script source, deployment, or version was changed.
- No Google Sheets architecture was restored.
- No error handler, fallback URL, or ignore-error path was added to hide unfinished CloudConvert jobs.
- No adaptive retry loop was implemented yet.

## Decisions and guardrails

- Stay in chat unless Ernie explicitly asks to switch to Work.
- Work one step at a time.
- Diagnose before changing anything.
- Airtable is the operational source of truth.
- Do not restore Google Sheets as the final architecture.
- Do not enable any Make schedule.
- Show the exact proposed action before modifying live code or data.
- Use controlled tests before expanding scope.
- Do not claim a deployment, commit, test, scenario run, or live-data change unless verified.
- `Wipe the base` means transactional or operational records only. It never means configuration tables, schema, fields, views, formulas, interfaces, or automations.
- Do not solve the CloudConvert race with an ever-longer fixed sleep.
- Do not add a fake fallback URL or ignore-error handler that conceals an unfinished job.
- Later, after the cleaned-image pipeline is working, map each quarry ticket layout for quarry-specific parsing improvements.

## Exact next step

Design the smallest safe adaptive polling route for `B - Clean Ticket Images` around the existing:

```text
Tools Sleep [19] -> CloudConvert Get a Job [17] -> HTTP Download a file [4]
```

The first action should be read-only inspection of the current route and Make's available routing/repeater controls. Determine the smallest implementation that:

- starts with a short sleep
- retries only when `[17] URL` is empty
- exits immediately when the URL exists
- prevents duplicate downstream bundles
- caps retry attempts
- writes Cleaning Error when the retry cap is reached

Do not run more tickets until the retry design is shown exactly and approved.