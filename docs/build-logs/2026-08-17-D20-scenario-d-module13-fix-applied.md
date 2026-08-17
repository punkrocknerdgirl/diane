# Scenario D — Module 13 Assignee/Parsed Quantity fix APPLIED (not yet verified)

**Date:** 2026-08-17
**Scenario:** D - Document AI Extractor (Make scenario ID `5251400`, team `2196964`)
**Status:** Fix pushed to the live blueprint via Make MCP `scenarios_update`. **NOT YET VERIFIED** — no re-run has happened yet in this session. Per Ernie's own instruction, he will re-run Scenario D and cross-check module 13's bundle-level detail in History plus real record counts in Airtable Parser Outputs before this is considered done.
**Extends:** `2026-08-17-D20-scenario-d-module13-write-failures.md` (root cause) and `2026-08-17-D20-scenario-d-module13-checkpoint.md` (prior diagnosis-only checkpoint).

## What was changed

Fetched the current blueprint via `scenarios_get` and confirmed both root causes directly in module 13's mapper:

- `fldxuCCq1XoqQzdg9` (Assignee, singleCollaborator) was hardcoded to a literal `{}` — not a formula, a stray empty object baked into the blueprint.
- `fldoQW2Tml3UzoC7Z` (Parsed Quantity, number) was a direct, unsanitized pass-through: `{{5.data.data.fields.quantity_tons}}`.

Applied via a single `scenarios_update` blueprint replacement:

1. **Assignee fix** — removed the `fldxuCCq1XoqQzdg9` key entirely from module 13's `record` object. Airtable will now omit the field on create (leaves it blank) instead of receiving `{}`, which it rejected outright.
2. **Parsed Quantity fix** — inserted a new module (id `27`, `regexp:Parser` — Make's built-in "Match pattern" transformer) between module 5 (extractor response) and module 13 (create record):
   - `mapper.text`: `{{5.data.data.fields.quantity_tons}}`
   - `parameters.pattern`: `^-?(?<qty>\d+(?:\.\d+)?)` (named capture group `qty`)
   - `parameters.global`: `false`, `continueWhenNoRes`: `true` (so a missing/empty quantity doesn't error the route — same effective behavior as before when the value was blank)
   - Module 13's `fldoQW2Tml3UzoC7Z` now maps to `{{27.qty}}` instead of the raw extractor field.
   - Regex behavior verified by hand against the documented cases: `"23.88.tn"` → `qty="23.88"`; `"23.88.99"` (double-decimal case) → `qty="23.88"`; clean `"23.88"` → `qty="23.88"`; integer `"24"` → `qty="24"`.

Chose a real inline transformer module (`regexp:Parser`) over stuffing regex into module 13's mapper directly, so the sanitization step is visible and independently inspectable in the Make editor between 5 and 13 — this was one of the open questions in the original write-failures log (whether 19/24 was the right spot, or a new inline module was needed). Went with a new inline module; 19/24 (If-else/Merge for file source selection) are unrelated to the quantity data path and weren't touched.

## What was explicitly NOT touched

- The `onerror: Ignore` handlers on modules 5 (→26) and 13 (→25) — left exactly as-is, per instruction. That remains a separate, lower-priority backlog item.
- Module 5's `allowRedirects: true` fix from the prior incident — untouched, still in place.
- Modules 12, 19, 4, 20, 24, 14, 16 — untouched.
- Scenario scheduling, active/inactive state — untouched (scenario remains inactive/paused as it was before this edit).

## Verification performed this session

- Confirmed via a follow-up `scenarios_get` call (not a live run) that the blueprint now reflects both changes exactly as intended: module 13's record object has no `fldxuCCq1XoqQzdg9` key, module 27 exists with the expected mapper/parameters, and module 13's Parsed Quantity field reads `{{27.qty}}`.
- **This is blueprint-level confirmation only.** No scenario execution has been triggered in this session. Whether the regex pattern behaves correctly against real extractor output, and whether Airtable accepts both fields cleanly at runtime, is unverified.

## Next step (per Ernie, not done here)

Ernie will re-run Scenario D on the same 33-ticket batch and check:
1. Module 13's bundle-level detail in Make History — confirm "operation was completed" on all 33, not just scenario-level SUCCESS.
2. Airtable Parser Outputs (`tblvgGjGiSJCNid36`) — confirm real new records exist with `createdTime` matching the run, `Parsed Quantity` holds a real number, and `Assignee` is either blank or a valid collaborator (not erroring).

## Files/locations for context
- Scenario D editor: `https://us2.make.com/2196964/scenarios/5251400/edit`
- Parser Outputs table: `tblvgGjGiSJCNid36` (base `appMWvtLU0hMBqjLC`)
  - Assignee field: `fldxuCCq1XoqQzdg9` (singleCollaborator)
  - Parsed Quantity field: `fldoQW2Tml3UzoC7Z` (number)
- New module: id `27`, `regexp:Parser` ("Sanitize Parsed Quantity"), sits between module 5 and module 13 in the flow
