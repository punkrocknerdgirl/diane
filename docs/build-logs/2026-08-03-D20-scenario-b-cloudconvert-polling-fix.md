# Diane 2.0 Checkpoint: Scenario B CloudConvert Polling Fix

**Date:** 2026-08-03

## Purpose

Record the diagnosis, smallest targeted repair, and verified one-ticket test for the Scenario B image-cleaning failure.

This public build log intentionally omits client-identifying ticket numbers, Airtable record IDs, Google Drive file IDs, CloudConvert job IDs, credentials, and private financial data.

## Repository state before this checkpoint

- Repository: `punkrocknerdgirl/diane`
- Branch: `main`
- Starting checkpoint: `09a1ee7d68df87b1727ae8e9d2fefa2c25c538d5`
- Starting checkpoint file: `docs/build-logs/2026-08-03-D20-airtable-review-remap-and-july-invoice-closeout.md`

## Protected production scope

Diane 2.0 production Scenarios A-E remain protected working assets.

This investigation was limited to the verified failure path in:

- Scenario B: `B - Clean Ticket Images`

Scenarios A, C, D, and E were not modified.

## Reported symptom

A production run appeared to fail at the HTTP file-download module after CloudConvert processing. The HTTP module reported that it could not build its URL because the mapped CloudConvert export file URL was empty.

The failure initially resembled an HTTP timeout or external-service delay, but inspection proved that HTTP was only the first downstream module to reject incomplete data.

## Exact current failure behavior

The inspected failed execution showed:

- the CloudConvert job was still `processing`;
- the conversion task was still `processing`;
- the export task was still `waiting`;
- the export task therefore had no completed `result.files[].url` value;
- the export-task iterator still emitted the waiting export task;
- the existing `Export task only` filter checked only that the task operation equaled `export/url`;
- HTTP then received an empty mapped URL and failed.

The relevant mapped HTTP input was the export task file URL from the iterator output.

## Root cause

The scenario already contained a polling flag and retry loop:

- `Tools 23` initialized `cleaning_poll_complete` to `false`;
- the repeater and sleep path continued while that flag remained false;
- `Tools 29` set `cleaning_poll_complete` to `true`.

However, the router path into `Tools 29` had no filter.

As a result, every CloudConvert job response reached `Tools 29`, including responses where the job status was still `processing`. The scenario therefore marked polling complete too early and allowed the unfinished export task to proceed toward HTTP.

The defect was a missing completion gate in the existing polling logic. It was not an HTTP timeout.

## Smallest approved change

A single route filter was added immediately before `Tools 29 - Set variable`.

Filter name:

`CloudConvert job finished`

Condition:

```text
17. Status = finished
```

This prevents the scenario from setting `cleaning_poll_complete` to `true` until `CloudConvert 17 - Get a Job` reports the whole job as finished.

No other module, mapping, route, retry cap, Airtable field, or scenario was changed.

## Existing logic preserved

The repair deliberately preserved the existing architecture:

- CloudConvert job creation remains unchanged.
- The repeater remains unchanged.
- The sleep module remains unchanged.
- The `Continue polling` filter remains unchanged.
- The export-task iterator remains unchanged.
- The `Export task only` filter remains unchanged.
- HTTP download remains unchanged.
- Google Drive upload remains unchanged.
- Airtable update remains unchanged.
- The existing retry-cap route remains unchanged.

The fix adds only the missing condition required for the current polling design to behave as intended.

## Verified one-ticket test

A single existing Airtable ticket was temporarily targeted through the Scenario B search formula.

The test run completed successfully:

- CloudConvert reached a completed state before the success route opened;
- the HTTP download module completed successfully;
- the Google Drive upload module completed successfully;
- the Airtable update module completed successfully;
- the existing Airtable ticket was updated with cleaned-file output fields;
- no duplicate Airtable ticket record was created;
- no red execution errors remained.

After the test, the temporary single-ticket Airtable formula was removed and the production formula was restored.

## Restored production search formula

Scenario B was returned to its normal Airtable search behavior:

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

The Airtable module and the overall scenario were saved after restoration.

## Current verified state

- Scenario B contains the saved `CloudConvert job finished` filter.
- The filter requires `CloudConvert 17` status to equal `finished` before polling is marked complete.
- A one-ticket execution completed successfully through HTTP, Google Drive, and Airtable.
- No duplicate Airtable ticket was created during the verified test.
- The production Airtable search formula is restored.
- Scenarios A, C, D, and E remain untouched.

## What was not verified or changed

This checkpoint does not claim that:

- all possible CloudConvert delays are eliminated;
- the current retry count or sleep duration is optimal;
- Make incomplete executions are enabled or configured correctly;
- a failed bundle can yet be retried manually from Make run history;
- automatic timeout retry behavior has been tested;
- every possible CloudConvert terminal error is routed cleanly;
- the freeze-copy Make or Airtable assets were modified.

No Airtable schema, Apps Script source, GitHub application source, or downstream invoice logic was changed as part of this repair.

## Next reliability investigation

The next narrow step is to inspect Scenario B's Make recovery behavior without changing it.

Verify:

1. whether `Store incomplete executions` is enabled;
2. what Make records when CloudConvert, HTTP, Google Drive, or Airtable fails after retry exhaustion;
3. whether a single failed bundle can be retried from run history or Incomplete Executions;
4. where a retried bundle resumes;
5. whether any downstream action can be repeated during retry;
6. whether the current Airtable update path remains duplicate-safe;
7. whether the retry-cap route clearly records the affected ticket and stopping point.

Do not add error handlers, change retry counts, modify Airtable, or alter Scenario B again until the current recovery behavior is inspected and an exact smallest change is approved.

## Guardrails

- Stay in chat unless Ernie explicitly asks to switch to Work.
- Work one exact step at a time.
- Diagnose before changing anything.
- Treat Scenarios A-E as protected production assets.
- Do not redesign or chain the scenarios.
- Preserve completed production work.
- Prevent duplicate records and duplicate downstream processing.
- Show the exact proposed Make or Airtable change before applying it.
- Keep private identifiers and client data out of public build logs.
- Do not claim a retry, test, deployment, or live-data change unless it actually occurred and was verified.
