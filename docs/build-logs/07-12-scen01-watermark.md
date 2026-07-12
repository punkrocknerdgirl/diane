# 2026-07-12: Scenario 01 Watermark

## Completed

Added a moving watermark to Make Scenario 01: Ingest Motive Tickets.

New opening flow:

[26] Search Import Runs  
→ [32] Set Variable: run_start_time  
→ [33] Router

Route 1 processes Motive documents and creates ticket records.

Route 2 updates the Import Runs record:

- Record ID: [26] ID
- Pulled At: [32] run_start_time

## Safety Test

A controlled failure was introduced in [1] List Motive Documents.

Results:

- Route 1 failed at [1]
- [31] Update a Record did not run
- Pulled At remained unchanged at 2026-07-09 00:00

After restoring the correct Motive URL, the scenario completed successfully and Pulled At advanced to:

2026-07-12 16:25

## Status

Watermark logic is working and failure-safe.

Scheduling remains disabled.