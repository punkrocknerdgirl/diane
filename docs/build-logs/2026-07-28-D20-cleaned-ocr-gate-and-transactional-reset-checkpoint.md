# Diane 2.0 Cleaned OCR Gate and Transactional Reset Checkpoint

**Date:** 2026-07-28

## Purpose

Document the completed Make OCR routing correction, the verified Airtable transactional reset, and the exact starting point for a fresh July 1-forward production run.

## Current verified state

Diane 2.0 is ready to begin a fresh controlled pipeline run from an Airtable Import Run record.

The intended flow is now:

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

## Work completed

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
- No full Make scenario was run after the OCR gate change.
- No Apps Script source, deployment, or version was changed.
- No Google Sheets architecture was restored.

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
- Later, after the cleaned-image pipeline is working, map each quarry ticket layout for quarry-specific parsing improvements.

## Exact next step

Create a new Airtable Import Run record for the fresh July 1-forward run before running Scenario 01.

The new chat should first inspect the current Import Runs field requirements and propose the exact values for the new record, including:

- Import Run Key
- Source System
- Import Disposition
- Run Status
- Pull From = July 1, 2026
- Notes, if useful

Do not run Scenario 01 until the Import Run record has been created and verified.