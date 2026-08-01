# Diane Build Log

## 2026-08-01 — Make Scenarios A–E production-override inspection and restoration checkpoint

### Scope

Completed inspection of the temporary test overrides in Make Scenarios A through E and recorded the restoration state before any Diane data reset or rerun.

### Restoration state

- **Scenario A — Get Motive Tickets:** No restoration items flagged.
- **Scenario B — Clean Ticket Images:** No test-value restoration items flagged. Existing changes were treated as production logic.
- **Scenario C — OCR Workflow:** No restoration items flagged.
- **Scenario D — Document AI Extractor**
  - Airtable **[12] Search Records**: synthetic `Ticket Key` targeting condition was removed.
  - The Airtable [12] limit remains **1** unless the pre-test Make blueprint or version history proves that a different production limit was in effect.
- **Scenario E — Build Review Batches**
  - Airtable **[2] Search Validation Queue**: synthetic `RECORD_ID()` targeting condition was removed.
  - The Airtable [2] limit was restored from **1** to **3**.
- **Legacy exclusion:** `OLD VALIDATION` to `TICKETS_CLEAN` is legacy and excluded from the current production-restoration scope.

The user reports that all flagged changes have been made. This checkpoint records the reported source/configuration state; it is not a live verification result.

### Not yet performed

- No live end-to-end verification run.
- No Airtable deletion.
- No Motive cursor reset.
- No reimport or rerun of the July 1–August 1 batch.

### Reset guardrails for the next task

The next reset must be **data-only**:

- Do not delete or alter schema, fields, views, formulas, Make scenario configuration, Cloud Run configuration, or other reference/configuration data.
- Inventory exact record counts and classify configuration/reference tables separately from transactional data before any deletion.
- Determine and document dependency-safe deletion order and exact record scope before deletion.
- Obtain explicit approval immediately before any destructive action.
- Keep all schedules off during the reset and test.
- Do not make Cloud Run changes.

### Next planned workflow

1. Inventory Airtable counts and record relationships.
2. Classify configuration/reference tables versus transactional tables.
3. Define and review dependency-safe deletion order and exact keep/delete sets.
4. Reset data to the pre-Scenario-A state after explicit approval.
5. Rerun Motive for **2026-07-01 through 2026-08-01** and verify each stage with readbacks.
