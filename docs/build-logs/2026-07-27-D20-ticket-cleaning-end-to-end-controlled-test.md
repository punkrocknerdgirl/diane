# Diane 2.0 Ticket Cleaning End-to-End Controlled Test

**Date:** 2026-07-27  
**Project:** Diane 2.0  
**Status:** Controlled single-ticket cleaning path passed end to end

## Working rules

- Stay in chat unless Ernie explicitly asks to switch to Work.
- Work one step at a time.
- Do not redesign Diane broadly.
- Diagnose before changing live systems.
- Airtable is the operational source of truth.
- Do not restore Google Sheets as part of the final architecture.
- Show the exact proposed action before modifying live code or data.
- Use controlled single-record tests before expanding scope.
- Do not enable the Make schedule.
- Do not mark additional Airtable tickets for cleaning.

## Goal completed in this checkpoint

Rebuild and verify the Diane 2.0 single-ticket cleaning path in the Make scenario **Clean Ticket Images**:

```text
Airtable Search Records
→ Google Drive Download a File
→ CloudConvert Create a Job
→ Tools Sleep
→ CloudConvert Get a Job
→ Iterator
→ Filter: export/url
→ HTTP Download a file
→ Google Drive Upload a File
→ Airtable Update a Record
```

## Controlled test ticket

```text
Ticket Key: INTAKE_MOTIVE_1038202041_1038202043
Airtable record ID: rec0IJcmtzmmd4eck
Source File ID: 1Pwjx-x046VAV1vRZY8U_niuplxXWqMCf
Source filename: MOTIVE_1038202041_1038202043.jpg
```

The ticket was already the only record selected for cleaning:

```text
Clean Status = Needs Clean
Send Cleaned File to OCR = checked
```

## CloudConvert task-array diagnosis

CloudConvert Get a Job returned three tasks:

- Upload
- Convert_1038202041_1038202043
- Export_1038202041_1038202043

The generic HTTP mapping from:

```text
Tasks[].Result.Files[].URL
```

was unreliable because Make exposed the first task structure and could resolve the Upload task URL instead of the Export task URL.

The Export task itself was verified as:

```text
name = Export_1038202041_1038202043
status = finished
operation = export/url
Result → Files[] → URL = populated
```

## Implemented Make fix

Inserted a Flow Control Iterator after CloudConvert Get a Job:

```text
Iterator array = CloudConvert Get a Job [17] → Tasks[]
```

Added a filter between Iterator [20] and HTTP [4]:

```text
Label: Export task only
Condition:
Iterator [20] → Operation
Equal to
export/url
```

HTTP Download a file now maps:

```text
Iterator [20]
→ Result
→ Files[]
→ 1: URL
```

This ensures HTTP receives only the CloudConvert Export task bundle.

## Controlled full scenario test result

A single controlled run completed cleanly.

Verified Google Drive Upload a File [9] output:

```text
File ID: 1uYF3ViZqTsjL4g6TGmHpncYOHV4OZMBY
Name: MOTIVE10382020411038202043.jpgcleaned.pdf
Mime Type: application/pdf
Folder ID: 1UONL7l6idP2e8PPuVT3dpNsq4RgF_qSa
```

The file uploaded successfully into:

```text
02 Processing
└── Diane 2.0 Cleaned Images
```

Google Drive returned both a Web Content Link and Web View Link.

## Airtable Update a Record configuration

Airtable Update a Record [21] was added after Google Drive Upload a File [9].

Configured:

```text
Base = Diane 2.0
Table = Tickets
Record ID = Airtable Search Records [11] → ID
Clean Status = Cleaned
Send Cleaned File to OCR = Yes
Cleaned File URL = Google Drive Upload a File [9] → Web View Link
Cleaned File ID = Google Drive Upload a File [9] → File ID
Cleaning Error = blank
Cleaned At = Make now token
```

No unrelated ticket fields were mapped.

## Controlled Airtable module-only test

To avoid creating a duplicate cleaned PDF, Airtable Update a Record [21] was run by itself.

The required upstream values were supplied manually:

```text
Google Drive Web View Link = https://drive.google.com/file/d/1uYF3ViZqTsjL4g6TGmHpncYOHV4OZMBY/view?usp=drivesdk
Google Drive File ID = 1uYF3ViZqTsjL4g6TGmHpncYOHV4OZMBY
Airtable Search Records ID = rec0IJcmtzmmd4eck
```

Verified Airtable result:

```text
ID: rec0IJcmtzmmd4eck
Ticket Key: INTAKE_MOTIVE_1038202041_1038202043
Clean Status: Cleaned
Cleaned File ID: 1uYF3ViZqTsjL4g6TGmHpncYOHV4OZMBY
Cleaned File URL: populated
Cleaned At: July 27, 2026 10:13 PM
Send Cleaned File to OCR: true
```

## Current verified state

The Diane 2.0 single-ticket cleaning path now works end to end for the controlled test record:

```text
Airtable selection
→ source JPG download
→ CloudConvert JPG-to-PDF conversion
→ CloudConvert export URL selection
→ HTTP PDF download
→ cleaned PDF upload to Drive
→ Airtable cleaned-file metadata update
```

## Things not done

- Make schedule was not enabled.
- No additional Airtable tickets were marked for cleaning.
- No multi-record test was run.
- No OCR scenario was changed.
- No image-cleaning options such as auto_rotate, deskew, enhance, trim, or quality were rebuilt.
- The 10-second Sleep delay was not tuned.
- Error-routing behavior was not built.
- Cleaning Error behavior was not tested.
- The old Diane 1.0 Google Sheets path remains in the scenario and has not yet been removed.
- The old CloudConvert Get a Task module remains visible and has not yet been removed.
- The scenario is not ready for scheduled production use.

## Exact next diagnostic

Before expanding scope or enabling the schedule:

1. Inspect the current OCR scenario.
2. Verify exactly how it selects tickets for OCR.
3. Confirm whether it should use `Send Cleaned File to OCR`, `Cleaned File ID`, `Cleaned File URL`, or another field.
4. Confirm whether the OCR scenario already prefers the cleaned file over the original Source File ID.
5. Do not modify the OCR scenario until the current selection and file-mapping behavior are documented.
6. After OCR behavior is understood, run one controlled cleaned-file OCR test using the same ticket before expanding to additional records.
