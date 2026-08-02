# Diane 2.0 Scenario E — Review-First Fallback Router Fix

**Date:** 2026-08-01 / 2026-08-02

## Summary

Diagnosed and partially fixed the silent failure in the duplicate of Scenario E (scenario ID `5830164`) where the review-first fallback branch was not creating Review Batch records despite scenario-level SUCCESS status. Root cause identified as Make's router treating a conditional "not equal to" filter as a skip when the upstream value is null or empty. Fix applied: Route B changed from a conditional filter to a true fallback route. Full validation is not yet complete.

## Scenario Context

- **Production Scenario E:** `5721872` — "E - Build Review Batches", folder "Diane 2.0" — **untouched this session**
- **Working duplicate:** `5830164` — "2026-08-01 E - Build Review Batches Archive", folder "Archive" — all edits applied here

## What Was Investigated

### Router 31 — New split added last session

A new router (module `31`) was added after Make Code module `24` (Run code / Dispatch-matching) during the previous session. This session confirmed via Make UI screenshots that both routes were saved correctly:

- **Route A** — Label: "Dispatch Resolved" — Condition: `24.result.resolutionStatus` / Text operators: Equal to / `resolved` — Fallback: No
- **Route B** — Label: "No Dispatch Resolved - Create Unassigned Batch" — Condition: `24.result.resolutionStatus` / Text operators: Not equal to / `resolved` — Fallback: No

### Module 30 — Fallback Create Record (confirmed via UI)

Full field mapping confirmed via Make UI screenshots:

| Field | Value |
|---|---|
| Review Batch Key | `VAL_` + `2. Validation ID` |
| Batch Status | `Draft` |
| Validation Queue | `2.Id` |
| Customer / Job | `2. Final Customer / Job` |
| PO Number | `2. Final PO Number` |
| Work Order / Order | `2. Final Work Order / Order` |
| Origin | `2. Final Origin` |
| Destination | `2. Final Destination` |
| Broker | empty |
| Truck | empty |
| Driver | empty |
| Rate | empty |
| Batch Notes | empty |
| Reviewer ID | empty |
| Reviewer Email | empty |
| Approved At | empty |
| Ticket Count | empty |
| Total Quantity | empty |
| Invoice Total | empty |
| Apply Batch Fields | Empty |
| Do Not Bill | Empty |
| Dispatches | empty |
| Smart links | Yes |

## Root Cause Identified

Make's "Text operators: Not equal to" filter silently skips a bundle when the evaluated field is null or undefined. If module 24's code outputs `resolutionStatus` as null/empty for an unresolved record, Route A correctly fails (null ≠ "resolved"). But Route B also fails — Make does not treat `null != "resolved"` as true; it drops the bundle. The scenario reports SUCCESS with zero writes.

## Fix Applied

Route B on router `31` changed from conditional to **fallback route**:

- "Set the route as a fallback" toggled from **No → Yes**
- Condition removed entirely

A fallback route fires unconditionally when no other route in the router matched. This guarantees module 30 fires whenever Route A's condition is not met, regardless of the actual value of `resolutionStatus`.

## Test Runs This Session

### Run 1 — limit 1, test record `rec9hirXQGwhJSN9j`
- Module 2 scoped to single record `VAL_INTAKE_MOTIVE_1034044377_1034044377`
- Result: Route A fired — module 24 resolved this record to `DISPATCH_DSP_20260713_005` (Michel's Data)
- Module 27 found existing Review Batch `recZpBCVHV3v4qb8G` (created 2026-08-01 6:28 PM)
- Dedup filter blocked module 29 — no new record created
- Route B / module 30 never reached — this record was not a valid fallback test case
- **This is correct behavior**, not a bug

### Run 2 — limit 100, production formula
- Module 2 formula reset to: `AND({Review Status} = "Pending Review", COUNTA({Review Batches}) = 0)` / maxRecords: 100
- Result: **only 1 bundle returned** — same record as Run 1, same outcome
- Fallback route still not exercised
- **Open question:** Why does module 2 only find 1 matching record? Expected ~77. Hypothesis: most Validation Queue records either have a non-"Pending Review" status or are already linked to one of the 6 existing Review Batches.

## What Is NOT Done

- Fallback route (module 30) has never successfully created a `VAL_...` Review Batch record — not yet verified
- Root cause of module 2 returning only 1 record under limit 100 is unknown — Validation Queue filter behavior not yet investigated
- Module 2's formula is currently set to production version (limit 100, unscoped) — confirmed as of end of session
- Scenario `5830164` is currently **deactivated**

## Known Operational Notes

- Make plan: ~33,000 / 40,000 operations used, resets in 30 days
- Scenario E at ~15 ops/record; weekly cadence cost depends on new record volume per week
- Modules 3, 7, 8, 9 are all separate `Get a Record` calls per Validation Queue record — efficiency audit flagged for later

## Current Status

| Item | Status |
|---|---|
| Router 31 Route A (Dispatch Resolved) | CONFIRMED WORKING |
| Router 31 Route B (Fallback) | FIX APPLIED — NOT YET VERIFIED |
| Module 30 field mapping | CONFIRMED VIA UI — NOT RUN TESTED |
| Module 2 formula (production) | RESET — BEHAVIOR UNEXPECTED |
| Scenario 5830164 | DEACTIVATED |
| Scenario 5721872 (production) | UNTOUCHED |
