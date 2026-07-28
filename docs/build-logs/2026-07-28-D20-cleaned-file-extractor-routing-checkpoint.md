# Diane 2.0 Cleaned-File Extractor Routing Checkpoint

**Date:** 2026-07-28
**Status:** Cleaned-file routing added in Make; controlled full run not yet completed

## Guardrails

- Stay in chat unless Ernie explicitly asks to switch to Work.
- Work one step at a time.
- Diagnose before changing anything.
- Airtable is the operational source of truth.
- Do not restore Google Sheets.
- Show the exact proposed action before modifying live code or data.
- Use one-record controlled tests.
- Do not enable the Make schedule.
- Protect existing OCR, Parser Output, and Validation Queue history.
- Current priority is useful extracted data, not perfect extraction quality.

## Source state reviewed

Reviewed:

- `docs/build-logs/2026-07-27-D20-ticket-cleaning-end-to-end-controlled-test.md`
- `docs/build-logs/2026-07-27-D20-ticket-cleaning-cloudconvert-http-url-checkpoint.md`

Verified prior checkpoint commit:

`377b0d3cbde4bdc279f5e96f34eaf6f34f134cb0`

## Scenario inspected

Make scenario:

`03 Document AI Ticket Extractor`

Original Airtable Search Records [12] formula:

```text
AND(
  {Source File ID} != "",
  COUNTA({OCR Outputs}) > 0,
  COUNTA({Parser Outputs}) = 0
)
```

Original file path:

```text
Airtable [12] Source File ID
-> Google Drive Download [4]
-> HTTP Document AI bridge [5]
```

The scenario originally ignored:

- Send Cleaned File to OCR
- Cleaned File ID
- Cleaned File URL
- Clean Status

The HTTP request already worked and was preserved. It used the downloaded file plus Ticket Key, but its `cleaned_file_id` field was mapped to Source File ID.

Downstream behavior was documented:

- Airtable [13] creates one Parser Outputs record.
- Airtable [14] creates one Validation Queue record.
- Airtable [16] updates the Ticket to Needs Review.
- Airtable [16] also appears capable of clearing cleaning-state fields and must be reviewed before a full controlled run.

## Implemented routing change

Inline formulas in ordinary Make mapping fields were deliberately avoided.

Added Flow Control If-else [19] after Airtable [12].

First route:

```text
Label: Cleaned file exists
Condition: Airtable [12] Cleaned File ID exists
```

Cleaned route:

```text
Google Drive [4] File ID = Airtable [12] Cleaned File ID
```

Else route:

```text
Google Drive [20] File ID = Airtable [12] Source File ID
```

Added Merge [24] with these outputs:

```text
selected_file_id
  first route = Cleaned File ID
  else = Source File ID

file_name
  first route = Google Drive [4] Name
  else = Google Drive [20] Name

file_data
  first route = Google Drive [4] Data
  else = Google Drive [20] Data
```

HTTP [5] was changed only to consume the Merge outputs:

```text
file Data = Merge [24] file_data
file name = Merge [24] file_name
cleaned_file_id = Merge [24] selected_file_id
```

The endpoint, method, request type, submission ID, response parsing, Parser Output creation, Validation Queue creation, and Ticket update path were left unchanged.

## Airtable output fields

Airtable Search Records [12] now explicitly returns:

```text
Ticket Key
Source File ID
Cleaned File ID
OCR Outputs
```

This was required so Cleaned File ID appeared in Make while preserving downstream mappings.

## Controlled test state

Temporary search formula:

```text
AND(
  {Ticket Key} = "INTAKE_MOTIVE_1038202041_1038202043",
  {Cleaned File ID} != "",
  COUNTA({OCR Outputs}) > 0,
  COUNTA({Parser Outputs}) = 0
)
```

Temporary limit:

```text
1
```

Only Airtable Search Records [12] was run.

Result:

```text
0 bundles
```

No downstream modules ran and no live records were created or updated by the test.

Direct Airtable verification showed the controlled ticket currently has:

```text
Clean Status = Cleaned
Send Cleaned File to OCR = true
Cleaned File ID = populated
Source File ID = populated
OCR Outputs = 1 linked record
Parser Outputs = 1 linked record
```

The zero-bundle result is therefore explained by:

```text
COUNTA({Parser Outputs}) = 0
```

That condition is false.

## Current verified state

- Cleaned-file preference routing is saved in the extractor scenario.
- Cleaned tickets use Cleaned File ID.
- Tickets without a cleaned file fall back to Source File ID.
- Merge provides one consistent file payload to the existing HTTP bridge.
- The Make schedule remains disabled.
- No full scenario run occurred after the routing change.
- No new Parser Output or Validation Queue record was created.
- No Airtable live data was changed during the module-only test.

## Things not done

- Duplicate protection was not removed.
- Existing Parser Output or Validation Queue history was not deleted or detached.
- No additional ticket was marked for cleaning.
- No production search formula was finalized.
- Airtable [16] cleaning-field behavior was not corrected or tested.
- No full cleaned-file extraction test was completed.
- Parser and OCR mappings were not redesigned.

## Exact next step

Do not force the existing controlled ticket through the scenario because it already has a Parser Output.

Next:

1. Inspect its linked Parser Output and Validation Queue history only if needed.
2. Find or prepare exactly one safe ticket with:

```text
Cleaned File ID populated
OCR Outputs count greater than zero
Parser Outputs count equal to zero
```

3. Do not mark another ticket for cleaning until the candidate action is shown and approved.
4. Use a temporary Ticket Key formula and limit 1.
5. Run the full scenario once.
6. Verify the cleaned file was downloaded, the bridge returned data, exactly one Parser Output and one Validation Queue record were created, and no unrelated Ticket fields changed.
