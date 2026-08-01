# Diane 2.0 Airtable Pipeline Checkpoint

**Date:** 2026-08-01  
**Repository:** `punkrocknerdgirl/diane`  
**Purpose:** Record the verified Airtable reset, fresh Motive import, Scenario B cleaning pass, and handoff to Scenario C.

## Current authoritative state

This section supersedes the earlier pre-run next-step language in this file.

Diane 2.0 has progressed through Scenario A and Scenario B after the data-only reset.

### Scenario A — Get Motive Tickets

Scenario A was run manually and required two runs. Its Make limit was set to `75`, but the completed Airtable import contains `83` Ticket records.

Verified Import Run:

- Base: `Diane 2.0`
- Base ID: `appMWvtLU0hMBqjLC`
- Import Run table: `tbl8V8VXyLIGtBu9X`
- Import Run record: `reckRkbjbtpmnHahi`
- Import Run key: `MOTIVE_LIVE_FRESH_20260701_20260801`
- Source System: `Motive`
- Import Disposition: `Live Work`
- Run Status: `Completed`
- Pull From: `2026-07-01T05:00:00.000Z`
- Pulled At: `2026-08-01T17:03:52.533Z`
- Linked Tickets: `83`

All 83 Tickets were verified as:

- Source System: `Motive`
- Import Disposition: `Live Work`
- linked to Import Run `reckRkbjbtpmnHahi`

Production decision reported by the user:

- Scenario A production limit was reset from `75` to `100` for future runs.
- The limit change was user-reported and was not independently inspected through a Make connector in this chat.

### Scenario B — ticket cleaning

Scenario B was run manually after Scenario A.

Airtable readback verified all `83` Tickets have:

- `Clean Status` = `Cleaned`
- `Send Cleaned File to OCR` = checked
- `Cleaned File URL` populated
- `Cleaned File ID` populated
- `Cleaned At` populated
- `Cleaning Error` blank

The verified cleaning timestamps span approximately:

- earliest: `2026-08-01T17:09:38.445Z`
- latest: `2026-08-01T17:20:49.483Z`

This confirms Scenario B completed the cleaning handoff for all 83 imported Tickets.

Important correction:

- Scenario B does **not** create OCR Runs or OCR Outputs.
- The earlier assumption that Scenario B should populate the OCR tables was incorrect.
- Scenario C is the next stage expected to consume the cleaned files and populate the OCR layer.

## Downstream Airtable state before Scenario C

Verified before Scenario C:

- Tickets: `83`
- Tickets cleaned and marked to send to OCR: `83`
- OCR Runs: `0`
- OCR Outputs: `0`
- Parser Outputs: `0`
- Validation Queue: `0`
- Review Batches: `0`

## Reset history

Before the fresh production run, a dependency-safe data-only reset removed transactional and test records while preserving configuration and operational setup.

Deleted and verified at zero:

| Table | Table ID | Deleted |
|---|---|---:|
| Review Batches | `tbl37qgQqfH1yd8Ww` | 1 |
| Validation Queue | `tblbiwkOS9LDi5yaV` | 2 |
| Parser Outputs | `tblvgGjGiSJCNid36` | 2 |
| OCR Outputs | `tblVXINiOoN7hPGpa` | 84 |
| OCR Runs | `tblsS36RpI9PN9Yia` | 84 |
| Tickets | `tbloTlWdo1f4hFKXh` | 84 |
| Import Runs | `tbl8V8VXyLIGtBu9X` | 1 |

**Total deleted:** 258 records.

Configuration/reference data preserved included Brokers, Drivers, Trucks, Materials, Aliases, Ticket Templates, Template Field Rules, six Dispatches, and zero Invoice Batches.

## Make restoration context

Previously verified restoration state:

- Scenarios A, B, and C had no restoration items.
- Scenario D Airtable module `[12]`: synthetic Ticket Key condition removed; limit remains `1` unless a pre-test blueprint/version proves another production value.
- Scenario E Airtable module `[2]`: synthetic `RECORD_ID` removed; limit restored from `1` to `3`.
- `OLD VALIDATION to TICKETS_CLEAN` remains legacy and excluded.
- Relevant scenarios were manual with no schedules enabled at the time of reset verification.

## What was not changed in this checkpoint

- No Airtable schema, field, formula, view, or automation changes.
- No Airtable records were manually modified as part of the checkpoint write.
- No application source changes.
- No Apps Script version or deployment.
- No Cloud Run deployment, revision, traffic, secret, or resource changes.
- No Google Sheets restoration.
- No Make scenario was run or modified by ChatGPT.
- No Scenario C execution has been verified yet.

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
- Do not infer scenario completion solely from Make bundle counts when Airtable fields provide the authoritative handoff state.

## Smallest correct next step

Proceed to Scenario C only.

Before the run, inspect or restate the expected Scenario C input condition using the verified Ticket fields:

- `Clean Status = Cleaned`
- `Send Cleaned File to OCR = checked`
- `Cleaned File ID` populated

Then the user may run Scenario C manually. After it finishes, perform Airtable readbacks before moving to Scenario D:

1. OCR Runs count and statuses.
2. OCR Outputs count and linkage to OCR Runs and Tickets.
3. Ticket-to-OCR Run linkage count.
4. Any failed OCR status or error messages.
5. Confirm Parser Outputs and Validation Queue remain unchanged until their intended later stages.

Stop after the Scenario C verification. Do not run or advance to Scenario D without reviewing the Airtable result.
