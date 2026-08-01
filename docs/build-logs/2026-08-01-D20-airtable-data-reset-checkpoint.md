# Diane 2.0 Airtable Data Reset Checkpoint

**Date:** 2026-08-01  
**Repository:** `punkrocknerdgirl/diane`  
**Purpose:** Record the verified data-only reset of the Diane 2.0 Airtable operational pipeline to the state immediately before Scenario A — Get Motive Tickets.

## Current verified state

The Diane 2.0 Airtable base was inventoried before deletion. All relevant Make scenarios A through E were confirmed to be set to manual with no schedules enabled.

A dependency-safe data-only reset was then approved and completed. The reset removed only transactional/test records. No Airtable schema, fields, views, formulas, configuration/reference records, Make scenario configuration, GitHub application source, Apps Script deployment, or Cloud Run resource was changed.

The Motive cursor has not been reset. No Make scenario has been rerun after the deletion.

## Airtable base

- Base name: `Diane 2.0`
- Base ID: `appMWvtLU0hMBqjLC`

## Configuration and reference data preserved

The following tables and all existing records were classified as configuration/reference or pre-import operational setup and were preserved unchanged:

| Table | Table ID | Verified count before reset |
|---|---|---:|
| Brokers | `tblqyPewObvpgrHmY` | 7 |
| Drivers | `tblrAWk0omo16cx6x` | 2 |
| Trucks | `tbl34C0X7sRdpFsP5` | 2 |
| Materials | `tbliyk8kA12qDZMzi` | 6 |
| Aliases | `tblFdkclbZCaaI8Ly` | 17 |
| Ticket Templates | `tblAVz20h5VEsaF5u` | 1 |
| Template Field Rules | `tblGnGiSwhbBhnywH` | 9 |
| Dispatches | `tblnXClSQImZ22vCG` | 6 |
| Invoice Batches | `tbl7nRJsDeKwhpDDu` | 0 |

The six Dispatch records were preserved, including `DSP_20260713_005`. The reciprocal link from that Dispatch to the deleted synthetic Review Batch was allowed to clear naturally through linked-record deletion.

## Transactional/test data deleted

The deletion was explicitly approved by the user and executed in dependency-safe order.

| Order | Table | Table ID | Deleted | Verified after |
|---:|---|---|---:|---:|
| 1 | Review Batches | `tbl37qgQqfH1yd8Ww` | 1 | 0 |
| 2 | Validation Queue | `tblbiwkOS9LDi5yaV` | 2 | 0 |
| 3 | Parser Outputs | `tblvgGjGiSJCNid36` | 2 | 0 |
| 4 | OCR Outputs | `tblVXINiOoN7hPGpa` | 84 | 0 |
| 5 | OCR Runs | `tblsS36RpI9PN9Yia` | 84 | 0 |
| 6 | Tickets | `tbloTlWdo1f4hFKXh` | 84 | 0 |
| 7 | Import Runs | `tbl8V8VXyLIGtBu9X` | 1 | 0 |

**Total deleted:** 258 records.

Readbacks after deletion verified all seven affected tables at zero records. Dispatches were read back at six records.

## Important records included in the reset

### Existing July Motive import

- Import Run record: `rectCOPK8zNQEsFmi`
- Import Run key: `MOTIVE_LIVE_FRESH_20260701_20260728`
- Pull From: `2026-07-01T05:00:00.000Z`
- Pulled At: `2026-07-28T16:25:49.648Z`
- Linked Tickets: 83

All 83 linked Tickets and their 83 OCR Runs and 83 OCR Outputs were deleted. One of those July Tickets had proceeded to Parser Output and Validation Queue; those downstream records were also deleted.

July downstream record chain that had progressed furthest:

- Ticket: `rec9j5C9qx0qGXola`
- Ticket key: `INTAKE_MOTIVE_1038202041_1038202043`
- OCR Run: `receB5FTOF2eCir5O`
- OCR Output: `recx3EA7Kmpj0KUBx`
- Parser Output: `receIGeeFBn7AJegj`
- Validation Queue: `recguFPDbIjzFZCIg`

### Synthetic Cloud Run verification chain

- Ticket: `recajS2WsyQQi7CoJ`
- Ticket key: `TEST_CLOUDRUN_20260731_2027`
- OCR Run: `recvvSfGgUv2lO5vc`
- OCR Output: `recs4Ie0nNuxWAyvp`
- Parser Output: `recOaehjc6Anw2GAW`
- Validation Queue: `reclg1rAdOW9CKgy8`
- Review Batch: `recRMIz6IKVcWJLQA`
- Review Batch key: `DISPATCH_DSP_20260713_005`

The linked Dispatch record itself was preserved.

## Make restoration state before reset

No new Make changes were made during this reset.

Previously verified restoration state remains:

- Scenarios A, B, and C: no restoration items.
- Scenario D Airtable module `[12]`: synthetic Ticket Key condition removed; limit remains `1` unless a pre-test blueprint/version proves a different production value.
- Scenario E Airtable module `[2]`: synthetic `RECORD_ID` removed; limit restored from `1` to `3`.
- `OLD VALIDATION to TICKETS_CLEAN` remains legacy/excluded and was not rebuilt or included in this reset.

All relevant scenarios are manual. Nothing is scheduled.

## What was not changed

- No Airtable schema changes.
- No Airtable field, formula, view, automation, or configuration/reference record changes.
- No Make scenario configuration changes.
- No Make scenario run after the reset.
- No Motive cursor reset yet.
- No Motive reimport yet.
- No Google Sheets restoration.
- No Cloud Run deployment, revision, traffic, secret, or resource changes.
- No application source changes.

## Active guardrails

- Stay in chat unless the user explicitly asks to switch to Work.
- Work one step at a time.
- Diagnose before changing anything.
- Airtable is the operational source of truth.
- Do not restore Google Sheets as the final architecture.
- Do not modify Make unless explicitly requested.
- Show the exact proposed live action before modifying live code or data.
- Do not claim a deployment, commit, test, or live-data change happened unless verified.
- Verify each pipeline stage with Airtable readbacks, not source configuration alone.
- Do not revisit or rebuild `OLD VALIDATION to TICKETS_CLEAN`.

## Smallest correct next step

Before running Scenario A, inspect the current Scenario A cursor mechanism and identify the exact live value or record that must be reset so the Motive import window is `2026-07-01` through `2026-08-01`.

Do not change the cursor until the exact proposed reset action is shown and approved. After approval, reset only the cursor value, run Scenario A manually, and verify the newly created Import Run and Ticket counts by Airtable readback before proceeding to Scenario B or any later stage.
