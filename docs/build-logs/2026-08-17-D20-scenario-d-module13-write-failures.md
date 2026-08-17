# Scenario D — Module 13 (Create Parser Output) write failures, 33/33, two distinct error types

**Date:** 2026-08-17
**Scenario:** D - Document AI Extractor (Make scenario ID `5251400`)
**Severity:** Critical — full-batch write failure, zero Parser Output records created
**Status:** Root cause confirmed via Make execution history UI. Fix NOT yet applied — needs Claude Code / repo-level investigation into how module 13's mapper is built, since this isn't a simple missing-field toggle like the previous bug.
**Supersedes/extends:** `2026-08-17-D20-scenario-d-allowredirects-bug.md` — that fix (setting `allowRedirects: true` on module 5) is CONFIRMED WORKING. This is a second, separate bug discovered immediately after, one layer downstream.

## Context — what changed since the last incident

Following the `allowRedirects` fix, Ernie re-ran Scenario D on the same 33 tickets. Execution `9a45d9c9669d449cae9d7c6c09083360` (2026-08-17 09:36:52Z, 133 operations, status SUCCESS at the scenario level).

**Module 5 ("Send File to Document AI Bridge") is now 33/33 clean** — confirmed in History UI, every operation shows "The operation was completed," no BundleValidationError. The extractor call itself is fixed and working.

**Module 13 ("Airtable - Create a Record" — writes to Parser Outputs, `tblvgGjGiSJCNid36`) is 0/33 clean.** Every single operation threw a handled RuntimeError and routed to module 25 (the onerror:Ignore catch-all), which is why Ernie saw "a lot of yellow flags" — the amber warning triangles in the History UI — with everything flowing 13 → 25.

Note: the error-handling routing itself (13 → 25 on failure) appears to be working as designed here — it's not silently eating the error without a trace, it's diverting to a catch handler. The problem is entirely that module 13 is sending malformed data on every single one of the 33 write attempts.

## Root cause — TWO distinct error types, confirmed via bundle-level inspection

Inspected every operation's HANDLED ERROR block in Make's History UI (`https://us2.make.com/2196964/scenarios/5251400/logs/9a45d9c9669d449cae9d7c6c09083360`, module 13). Manually verified operations 1, 6, 7, 12, 13, 22, and 33 — errors alternate between the two types below across different tickets, confirming this is NOT clustered by batch position (rules out any timing/order relationship, consistent with what was already ruled out on the prior allowRedirects incident).

### Error type 1: Assignee field — malformed collaborator write

```
type: RuntimeError message: [422] Cannot parse value "{}" for field Assignee
```

- Confirmed on operations 1, 13, 33 (at minimum — likely roughly half the batch, exact count needs a full tally).
- Target field: **Assignee** (`fldxuCCq1XoqQzdg9` on Parser Outputs, `tblvgGjGiSJCNid36`) — this is a `singleCollaborator` type field.
- Module 13's mapper is sending a bare empty object `{}` into this field. Airtable's API rejects this outright — a `singleCollaborator` field requires either a valid collaborator object (with a real user `id`/`email`), or the key omitted from the write payload entirely. An empty `{}` is neither.
- **This is a NEW bug, not previously logged in the backlog.** Root cause is almost certainly in module 13's field mapping: something upstream (likely a Merge or If-else branch feeding module 13, given the scenario's routing structure — see Diagram tab, modules 19/24 If-else/Merge sit between module 5's output and module 13) is producing an empty collection/object for a field that should either map to a real value or not be included in the Create Record call at all.
- Likely fix direction: in module 13's Airtable "Create a Record" config, either (a) remove the Assignee field mapping entirely if it's not meant to be set programmatically, or (b) fix the upstream mapper so it passes `null`/omits the key instead of an empty object when no assignee value exists. Needs direct inspection of module 13's field mapping in the Make editor to confirm which.

### Error type 2: Parsed Quantity field — malformed numeric write

```
type: RuntimeError message: [422] Field "Parsed Quantity" cannot accept the provided value
```

- Confirmed on operations 6, 7, 22 (at minimum).
- Target field: **Parsed Quantity** (`fldoQW2Tml3UzoC7Z` on Parser Outputs) — numeric type.
- **This is the ALREADY-KNOWN backlog bug**, now confirmed hitting at full-batch scale rather than the single previously-documented instance. Original finding (per existing project memory): `diane-ticket-extractor` can return `quantity_tons` as a malformed string with unit suffix and double decimal (e.g., `"23.88.tn"`), which Airtable's numeric field rejects.
- Fix already scoped in backlog: add a sanitization/regex step in Scenario D before the Parser Output create step (module 13) to strip non-numeric suffixes from `quantity_tons` before it's mapped into `Parsed Quantity`. This incident confirms that fix is now higher priority — it's blocking roughly half of a real 33-ticket production batch, not a single edge case.

## What needs to happen next

1. **Open Scenario D in the Make editor and inspect module 13's field mapping directly** (`https://us2.make.com/2196964/scenarios/5251400/edit`, double-click the "Airtable - Create a Record" module labeled `13`). Look specifically at:
   - What's mapped into the `Assignee` field — trace it back to its source (likely coming from a prior module's output, possibly the extractor response body from module 5, or a static/default value that's misconfigured).
   - What's mapped into `Parsed Quantity` — confirm it's a direct pass-through of the extractor's `quantity_tons` value with no sanitization, matching the known bug.
2. **For the Assignee bug**: determine whether Assignee is even supposed to be set by this scenario. If not, remove the mapping. If it is (e.g., meant to default to a specific reviewer), fix the mapping to either supply a valid collaborator object or omit the field when no value is available — never send `{}`.
3. **For the Parsed Quantity bug**: add a regex/sanitization step (a Set Variable, Text Parser, or similar module) before module 13, converting values like `"23.88.tn"` to a clean numeric `23.88`. Should be placed in the flow between module 5 (extractor response) and module 13 (create record) — check the existing modules 19/24 (If-else/Merge) to see if this can be added there or if it needs a new inline module.
4. Once both are fixed, do NOT trust a green scenario-level "Success" as proof of correctness (same caution as the last incident) — after any fix, click into module 13's bundle detail in History and confirm actual "operation was completed" status on every operation, not just absence of a scenario-level error.
5. Cross-check Airtable Parser Outputs (`tblvgGjGiSJCNid36`) after the next test run — confirm new records actually appear with `createdTime` matching the run, and spot-check that `Parsed Quantity` holds a real number and `Assignee` either holds a valid collaborator or is blank (not erroring).

## Current state of the 33 tickets (as of this incident)

- All 33 tickets: Ticket Status = "Intake" (unchanged, D has never successfully written for these)
- All 33 tickets: OCR Runs + OCR Outputs complete and clean (Scenario C succeeded, unaffected by this)
- All 33 tickets: Parser Outputs = **zero records exist** — module 13 has failed on literally every attempt across two consecutive full-batch runs (the allowRedirects-blocked run and this one)
- No Airtable-side reset is needed before the next attempt — nothing has been written yet, so there's nothing to clean up. Once module 13 is actually fixed, the next run should just create fresh records normally.

## Ticket keys involved (same 33 as prior incident, unchanged)
See `2026-08-17-D20-scenario-d-allowredirects-bug.md` for the full list of 33 `INTAKE_MOTIVE_...` ticket keys — identical set, no change.

## Files/locations for context
- Scenario D blueprint: Make scenario ID `5251400`, team ID `2196964`
- Scenario D editor: `https://us2.make.com/2196964/scenarios/5251400/edit`
- This execution's History detail: `https://us2.make.com/2196964/scenarios/5251400/logs/9a45d9c9669d449cae9d7c6c09083360`
- Parser Outputs table: `tblvgGjGiSJCNid36` (base `appMWvtLU0hMBqjLC`)
  - Assignee field: `fldxuCCq1XoqQzdg9` (singleCollaborator)
  - Parsed Quantity field: `fldoQW2Tml3UzoC7Z` (number)
