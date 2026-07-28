# Diane 2.0 Ticket Cleaning / CloudConvert Rebuild Checkpoint

**Date:** 2026-07-27  
**Project:** Diane 2.0  
**Status:** In progress, controlled test paused at first CloudConvert Create a Job module

## Working rules

- Stay in chat unless Ernie explicitly asks to switch to Work.
- Work one step at a time.
- Do not redesign Diane broadly.
- Diagnose before changing live systems.
- Airtable is the operational source of truth.
- Do not restore Google Sheets as part of the final architecture.
- Show the exact proposed action before modifying live code or data.
- Use controlled single-record tests before expanding scope.

## Current goal

Rebuild the old Make scenario **Clean Ticket Images** so it uses the Diane 2.0 Airtable `Tickets` table instead of the Diane 1.0 Google Sheet, while retaining the existing Google Drive and CloudConvert cleaning flow.

The intended pipeline is:

```text
Airtable Search Records
→ Google Drive Download a File
→ CloudConvert Create a Job
→ CloudConvert Get a Task
→ Google Drive Upload a File
→ Airtable Update Record
```

The downstream OCR scenario should eventually use the cleaned file when available, otherwise the original source file.

## Airtable schema changes completed

Base: `Diane 2.0`  
Table: `Tickets`

The following fields were created:

1. `Clean Status` — single select
   - Not Evaluated
   - Needs Clean
   - Cleaning
   - Cleaned
   - Failed
   - Not Needed
2. `Send Cleaned File to OCR` — checkbox
3. `Cleaned File URL` — URL
4. `Cleaned File ID` — single line text
5. `Cleaning Error` — multiline text
6. `Cleaned At` — date/time, America/Chicago

No existing ticket fields were altered when these fields were created.

## Controlled test ticket

Exactly one live Tickets record was selected for the controlled test:

```text
Ticket Key: INTAKE_MOTIVE_1038202041_1038202043
Airtable record ID: rec0IJcmtzmmd4eck
Source File ID: 1Pwjx-x046VAV1vRZY8U_niuplxXWqMCf
Source filename: MOTIVE_1038202041_1038202043.jpg
Source MIME type: image/jpeg
```

Only these two fields were changed on that record:

```text
Clean Status = Needs Clean
Send Cleaned File to OCR = checked
```

## Make module 1: Airtable Search Records

Configured against:

```text
Base: Diane 2.0
Table: Tickets
```

Formula:

```text
AND(
  {Clean Status} = "Needs Clean",
  {Send Cleaned File to OCR} = 1
)
```

Verification:

- Initial run returned 0 bundles before a test ticket was marked.
- After marking the controlled test ticket, the module returned exactly 1 bundle.
- The returned bundle included the correct Ticket record, `Source File ID`, and `Source File URL`.

## Make module 2: Google Drive Download a File

Configured with:

```text
File ID = Airtable module Source File ID
```

Verification:

- Successfully downloaded the controlled test file.
- Returned filename `MOTIVE_1038202041_1038202043.jpg`.
- Returned MIME type `image/jpeg`.
- Returned binary `Data` for CloudConvert.

## Make module 3: CloudConvert Create a Job (advanced)

The old module was inherited from the Google Sheets version and contained stale mappings and an obsolete option structure.

### Updated mappings

Input file configuration now uses the structured Input files section:

```text
Input file = upload a file
Input file task name = Upload
File = Google Drive - Download a File bundle
```

The conversion task remains:

```text
Operation = Convert a File
Input task = Upload
Input format = jpg
Output format = pdf
File name = [Google Drive Name]_cleaned.pdf
Tag = Diane 2.0 Clean Ticket Images
```

### Old JSON removed

The obsolete mapped JSON under `Conversion and engine specific options` was deleted. The section is currently empty with Map turned off.

The removed block was:

```json
[
  {
    "importType": "upload",
    "options": {
      "auto_rotate": true,
      "deskew": true,
      "enhance": true,
      "trim": true,
      "quality": 90
    }
  }
]
```

Image-cleaning options have not yet been rebuilt in the new Name/Value option-object structure.

## Verified CloudConvert errors and fixes already completed

### Error 1

CloudConvert reported that the tasks field lacked `importType` and the options field had the wrong shape.

Fix completed:

- Turned off Map for Input files.
- Added a structured input file.
- Set input task name to `Upload`.
- Pointed the conversion task's input task to `Upload`.

### Error 2

CloudConvert reported that `opts` received a string instead of option objects.

Fix completed:

- Deleted the old quoted JSON block.
- Turned off Map for Conversion and engine specific options.
- Left options empty for a plain JPG-to-PDF baseline test.

## Current blocker at checkpoint

The latest controlled run reached CloudConvert and failed because the **conversion task name contains spaces and extra text**.

The current task name is constructed from:

```text
12.Name - now - Convert
```

This produces a value containing a filename extension, spaces, a timestamp, and extra text. CloudConvert rejects it.

The error specifically recommends using only letters, numbers, dashes, and underscores and suggests a short name such as:

```text
MOTIVE_1038202041_1038202043
```

## Exact next step

Reopen the first CloudConvert module and replace the conversion **Task name** with a short CloudConvert-safe value containing no spaces, timestamp, or extension.

Recommended controlled-test value:

```text
Convert_1038202041_1038202043
```

Do not change the Input files task name `Upload`.

Then:

1. Save the module.
2. Keep the second CloudConvert module disconnected.
3. Run the scenario from the beginning.
4. Verify whether the first CloudConvert module successfully creates the baseline JPG-to-PDF job.
5. Do not rebuild `auto_rotate`, `deskew`, `enhance`, `trim`, or `quality` until the baseline conversion succeeds.

## Scenario connection state

The second CloudConvert module is intentionally disconnected so the controlled test stops after the first CloudConvert Create a Job module.

Do not reconnect it until the Create a Job module succeeds and its output is inspected.

## Source-code checkpoint from earlier in the session

A separate Diane Apps Script source fix was committed directly to `punkrocknerdgirl/diane-apps-script`:

```text
Commit: 544e0626a6e4e3349ea2a6b1d316936191c976f2
Change: add Final Destination to saveAirtableTicketFields(payload)
```

That source commit was not deployed and no Apps Script version was created during this work.

## Things not done

- No Make schedule was enabled.
- No bulk Tickets records were marked for cleaning.
- No cleaned file was created yet.
- No cleaned file was uploaded to Drive yet.
- No Airtable cleaned-file fields were populated yet.
- No OCR scenario was changed.
- No CloudConvert image-cleaning options were rebuilt yet.
- The second CloudConvert module remains disconnected.
