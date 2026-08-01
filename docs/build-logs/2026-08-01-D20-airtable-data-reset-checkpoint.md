# Diane 2.0 Airtable Pipeline Checkpoint

**Date:** 2026-08-01  
**Repository:** `punkrocknerdgirl/diane`  
**Purpose:** Record the verified Airtable reset, fresh production run through Scenario C, and the blank OCR output investigation handoff.

## Current authoritative state

This section supersedes earlier next-step language in this file.

Diane 2.0 has progressed through Scenario A, Scenario B, and Scenario C after the dependency-safe data-only reset.

Airtable remains the operational source of truth.

- Airtable base: `Diane 2.0`
- Base ID: `appMWvtLU0hMBqjLC`
- Tickets table: `tbloTlWdo1f4hFKXh`
- OCR Runs table: `tblsS36RpI9PN9Yia`
- OCR Outputs table: `tblVXINiOoN7hPGpa`
- Parser Outputs table: `tblvgGjGiSJCNid36`
- Validation Queue table: `tblbiwkOS9LDi5yaV`

## Scenario A — Get Motive Tickets

Scenario A was run manually and required two runs.

Verified Import Run:

- Record ID: `reckRkbjbtpmnHahi`
- Import Run Key: `MOTIVE_LIVE_FRESH_20260701_20260801`
- Source System: `Motive`
- Import Disposition: `Live Work`
- Run Status: `Completed`
- Pull From: `2026-07-01T05:00:00.000Z`
- Pulled At: `2026-08-01T17:03:52.533Z`
- Linked Tickets: `83`

All 83 Tickets were verified as Source System `Motive`, Import Disposition `Live Work`, and linked to Import Run `reckRkbjbtpmnHahi`.

The user reported resetting the Scenario A production limit from `75` to `100` for future runs. That Make change was not independently inspected through a Make connector.

## Scenario B — ticket cleaning

Airtable readback verified all `83` Tickets have:

- `Clean Status` = `Cleaned`
- `Send Cleaned File to OCR` = checked
- `Cleaned File URL` populated
- `Cleaned File ID` populated
- `Cleaned At` populated
- `Cleaning Error` blank

Verified cleaning timestamp range:

- earliest: `2026-08-01T17:09:38.445Z`
- latest: `2026-08-01T17:20:49.483Z`

Important correction retained:

- Scenario B does not create OCR Runs or OCR Outputs.
- Scenario C consumes the cleaned files and populates the OCR layer.

## Scenario C — OCR

Before the run, Airtable verified all 83 Tickets satisfied the Scenario C intake condition:

- `Clean Status = Cleaned`
- `Send Cleaned File to OCR = checked`
- `Cleaned File ID` populated

The user then manually ran Scenario C and reported a clean Make run.

### Verified structural result

Airtable post-run readbacks verified:

| Check | Result |
|---|---:|
| OCR Runs | 83 |
| OCR Runs with status `Complete` | 83 |
| OCR Runs with formal error messages | 0 |
| OCR Outputs | 83 |
| OCR Outputs linked to an OCR Run | 83 |
| OCR Outputs linked to a Ticket | 83 |
| Tickets linked back to an OCR Run | 83 |
| Tickets linked back to an OCR Output | 83 |
| Parser Outputs | 0 |
| Validation Queue | 0 |

Additional verified details:

- All OCR Runs use `Google Cloud Vision`.
- Each OCR Run links to exactly one Ticket and one OCR Output.
- Each OCR Output links back to exactly one OCR Run and one Ticket.
- Parser Outputs and Validation Queue remained unchanged, as expected before their intended later stages.

### Unresolved quality exception

Scenario C is structurally complete but is not yet approved for Scenario D.

Airtable readback found:

- OCR Outputs with populated Raw OCR Text: `67`
- OCR Outputs with blank Raw OCR Text: `16`
- OCR Runs formally marked failed: `0`

The 16 affected Ticket Keys are:

```text
INTAKE_MOTIVE_1024750843_1024750844
INTAKE_MOTIVE_1024750748_1024750750
INTAKE_MOTIVE_1024750934_1024750936
INTAKE_MOTIVE_1024750843_1024750846
INTAKE_MOTIVE_1024751026_1024751026
INTAKE_MOTIVE_1024750548_1024750552
INTAKE_MOTIVE_1024750843_1024750843
INTAKE_MOTIVE_1024750548_1024750551
INTAKE_MOTIVE_1024750934_1024750934
INTAKE_MOTIVE_1024750748_1024750748
INTAKE_MOTIVE_1024750548_1024750550
INTAKE_MOTIVE_1024751026_1024751027
INTAKE_MOTIVE_1024750843_1024750845
INTAKE_MOTIVE_1024750934_1024750935
INTAKE_MOTIVE_1024750548_1024750548
INTAKE_MOTIVE_1024750748_1024750751
```

These records have a complete relationship chain and OCR Runs marked `Complete`, but the Raw OCR Text field is blank. Therefore a `Complete` run status cannot by itself be treated as proof of a usable OCR payload.

## Reset history

Before the fresh production run, a dependency-safe data-only reset removed transactional and test records while preserving configuration and operational setup.

| Table | Deleted |
|---|---:|
| Review Batches | 1 |
| Validation Queue | 2 |
| Parser Outputs | 2 |
| OCR Outputs | 84 |
| OCR Runs | 84 |
| Tickets | 84 |
| Import Runs | 1 |

**Total deleted:** 258 records.

Configuration/reference data preserved included Brokers, Drivers, Trucks, Materials, Aliases, Ticket Templates, Template Field Rules, six Dispatches, and zero Invoice Batches.

## Make restoration context

Previously verified:

- Scenarios A, B, and C had no restoration items.
- Scenario D Airtable module `[12]` has the synthetic Ticket Key condition removed.
- Scenario D limit remains `1` unless an older verified production blueprint proves otherwise.
- Scenario E Airtable module `[2]` had the synthetic `RECORD_ID` removed.
- Scenario E limit was restored from `1` to `3`.
- `OLD VALIDATION to TICKETS_CLEAN` remains legacy and excluded.
- Relevant scenarios were manual with no schedules enabled when last verified.

## Decisions

- Do not proceed to Scenario D until the 16 blank OCR Outputs are diagnosed.
- Treat Scenario C as structurally successful but quality-incomplete.
- Diagnose the blank-output cohort before changing Make, Airtable, source files, or downstream parsing.
- Compare blank and populated records at each available stage rather than assuming Google Cloud Vision failed.
- Preserve all current production records for investigation.

## What was not changed

- No Airtable records, schema, formulas, views, or automations were modified during verification or this checkpoint.
- No Make scenario was modified by ChatGPT.
- No Scenario D run occurred.
- No Parser Output or Validation Queue record was created.
- No application source changes.
- No deployment or Apps Script version.
- No Google Sheets restoration.
- No reset or rerun of Scenarios A or B.

## Active guardrails

- Stay in chat unless the user explicitly asks to switch to Work.
- Work one step at a time.
- Diagnose before changing anything.
- Airtable is the operational source of truth.
- Do not restore Google Sheets as the final architecture.
- Do not modify Make unless explicitly requested.
- Show the exact proposed live action before modifying live code or data.
- Do not claim a deployment, commit, test, scenario run, or live-data change happened unless verified.
- Verify every pipeline stage with Airtable readbacks.
- Do not revisit or rebuild `OLD VALIDATION to TICKETS_CLEAN`.
- Do not repeat the Airtable reset.
- Do not reset the Motive cursor.
- Do not rerun Scenarios A, B, or C during initial diagnosis.
- Do not recreate the Import Run.
- Do not proceed to Scenario D until the blank OCR cohort is understood.

## Smallest correct next step

Perform a read-only diagnosis of the 16 blank OCR Outputs.

Begin by comparing the blank-output Tickets against populated-output Tickets using Airtable fields and available source metadata. Establish whether the blank cohort shares a common source-file property, including file type, cleaned file identifier or URL pattern, original attachment form, ticket grouping, or another observable attribute.

Then inspect the Scenario C execution path or source files only as needed to determine where the payload became blank:

1. Cleaned source file exists and is retrievable.
2. Scenario C downloaded the intended file.
3. Google Cloud Vision returned text, an empty response, or an unhandled response shape.
4. Make mapped the returned text into the OCR Output record.
5. OCR Run status logic incorrectly marked an empty payload `Complete`, if applicable.

Do not modify Make or live data during diagnosis. Stop after identifying the first verified break and present the exact proposed next action before any change.
