# Diane 2.0 Ticket Cleaning / CloudConvert HTTP URL Checkpoint

**Date:** 2026-07-27  
**Project:** Diane 2.0  
**Status:** In progress, controlled single-ticket test paused at HTTP URL mapping after CloudConvert export task was added

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

## Current goal

Rebuild the old Make scenario **Clean Ticket Images** so it uses the Diane 2.0 Airtable `Tickets` table instead of the Diane 1.0 Google Sheet.

Current intended flow:

```text
Airtable Search Records
→ Google Drive Download a File
→ CloudConvert Create a Job
→ Tools Sleep
→ CloudConvert Get a Job
→ HTTP Download a file
→ Google Drive Upload a File
→ Airtable Update Record
```

## Controlled test ticket

Exactly one live Airtable Tickets record remains selected for testing:

```text
Ticket Key: INTAKE_MOTIVE_1038202041_1038202043
Airtable record ID: rec0IJcmtzmmd4eck
Source File ID: 1Pwjx-x046VAV1vRZY8U_niuplxXWqMCf
Source filename: MOTIVE_1038202041_1038202043.jpg
Source MIME type: image/jpeg
```

Only these ticket fields were changed for the controlled test:

```text
Clean Status = Needs Clean
Send Cleaned File to OCR = checked
```

## Verified Make modules

### Airtable Search Records

Formula:

```text
AND(
  {Clean Status} = "Needs Clean",
  {Send Cleaned File to OCR} = 1
)
```

Verified:

- Returns exactly one bundle.
- Returns the correct controlled test ticket.
- Includes Source File ID and Source File URL.

### Google Drive Download a File

Mapped:

```text
File ID = Airtable Source File ID
```

Verified:

- Downloads the correct JPG.
- Returns filename, MIME type, and binary Data.

### CloudConvert Create a Job (advanced)

Input file task:

```text
Input file = upload a file
Input file task name = Upload
File = Google Drive Download a File bundle
```

Conversion task:

```text
Operation = Convert a File
Task name = Convert_1038202041_1038202043
Input task = Upload
Input format = jpg
Output format = pdf
File name = Google Drive Name + _cleaned.pdf
Tag = Diane 2.0 Clean Ticket Images
```

Export task added and saved:

```text
Operation = Export a file to a temporary URL
Task name = Export_1038202041_1038202043
Input task = Convert_1038202041_1038202043
```

The old quoted JSON block under Conversion and engine specific options remains removed. Cleaning options such as auto_rotate, deskew, enhance, trim, and quality are still not rebuilt.

### Tools Sleep

Inserted between Create a Job and Get a Job:

```text
Delay = 10 seconds
```

This was added because Get a Job was checking before CloudConvert had finished and before the export URL existed.

### CloudConvert Get a Job

Replaced the old incorrect Get a Task module.

Mapped:

```text
Job ID = CloudConvert Create a Job [8] → Job ID
```

Verified on a completed job:

- Top-level job status can return `finished`.
- Convert task can return `finished`.
- Export task is included in the job after the new export task was added.

### HTTP Download a file

Authentication:

```text
No authentication
```

The URL field is currently mapped from CloudConvert Get a Job using a generic array path resembling:

```text
17.Tasks[].Result.Files[].URL
```

A successful earlier controlled run, after adding the export task and 10-second Sleep, returned:

```text
Status code: 200
Content-Type: application/pdf
File name: MOTIVE10382020411038202043.jpgcleaned.pdf
File size: 114498 bytes
```

This proved the export task, temporary URL, HTTP download, and PDF binary path can work.

## Current blocker

A later full scenario run failed at HTTP with:

```text
Couldn't find a URL in HTTP > Download a file this module.
The mapped URL field from CloudConvert came through empty.
```

Make reported:

```text
Required field "url" uses 17.URL, but that value is empty.
```

This means the current generic array mapping is not reliably selecting the export task's file URL. The task array contains multiple tasks, including Upload, Convert, and Export. A broad `Tasks[].Result.Files[].URL` path can resolve against the wrong task or an empty task result.

The failure is not yet proven to be a CloudConvert conversion failure. The first thing to diagnose is the exact Get a Job output from the failed run and identify the specific Export task result path.

## Google Drive output folder

The Drive structure was cleaned up during this session.

Current active structure:

```text
01 Project Diane
├── 01 Intake
├── 02 Processing
│   └── Diane 2.0 Cleaned Images
├── 03 Exports
└── 04 Diane Archive
```

Legacy Diane 1.0 image folders were moved under:

```text
04 Diane Archive
└── Diane 1.0 Image Folders
    ├── Original Uploads
    ├── Ticket Images
    ├── Cleaned Files
    └── Corrected Images
```

The old `Code & Scripts` folder was moved into the archive by Ernie. The empty `Data` folder was deleted by Ernie.

New Diane 2.0 cleaned-image folder:

```text
Folder name: Diane 2.0 Cleaned Images
Folder ID: 1UONL7l6idP2e8PPuVT3dpNsq4RgF_qSa
Parent: 02 Processing
```

### Google Drive Upload a File

Current saved configuration:

```text
Folder ID = 1UONL7l6idP2e8PPuVT3dpNsq4RgF_qSa
File = HTTP - Download a file
Convert a File = No
New File Name = blank
```

This module has not yet successfully uploaded the controlled cleaned PDF because the latest run stopped at the HTTP URL error.

## Exact next step

Do not rerun the whole scenario immediately.

1. Open the output bubble for **CloudConvert Get a Job [17]** from the failed run.
2. Inspect all tasks in `Tasks[]`.
3. Find the task named:

```text
Export_1038202041_1038202043
```

4. Expand:

```text
Result
→ Files[]
```

5. Verify whether that specific export task contains a populated `URL`.
6. If populated, remap the HTTP URL field specifically to the Export task's file URL rather than the generic task-array URL.
7. If the export task is still processing or its URL is absent after 10 seconds, do not guess. Increase the wait or use a more reliable job-completion check before HTTP.
8. After the HTTP URL mapping is corrected, run exactly one controlled test and verify:
   - HTTP status 200
   - content type application/pdf
   - Google Drive Upload succeeds into `Diane 2.0 Cleaned Images`
9. Do not configure Airtable Update Record until the cleaned file upload succeeds and its returned Drive File ID and URL are inspected.

## Things not done

- No Make schedule was enabled.
- No additional Airtable tickets were marked for cleaning.
- No cleaned file has been successfully uploaded to Drive yet.
- No Airtable cleaned-file fields were populated yet.
- No OCR scenario was changed.
- No image-cleaning options were rebuilt yet.
- The 10-second delay has not been tuned down yet.
- The scenario is not ready for multi-record scope.
