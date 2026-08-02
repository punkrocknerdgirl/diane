# Diane 2.0 Build Checkpoint

## 2026-08-02 — Scenario A–E pipeline and Review Batches/UI mismatch

### Status

Scenario A through Scenario D completed for the full 83-ticket run. Scenario E is intentionally limited to one-record testing. The review screen and ticket scans are available, but Review Batch assignment and the review app's displayed batching state are inconsistent. Do not continue debugging in this checkpoint.

### Verified pipeline evidence

- **Scenario A — Get Motive Tickets:** completed with **83 tickets**.
- **Scenario B — Clean Ticket Images:** completed with **all 83 tickets cleaned**.
- **Scenario C — OCR Workflow:** completed with **83 OCR Runs** and **83 OCR Outputs**.
- **Scenario D — Document AI Extractor:** completed with **83 Validation Queue records**.
- **Scenario E — Build Review Batches:** limited to a **one-record test scope**.

### Existing-batch PATCH diagnosis and guard

The unsafe existing-batch PATCH failure was diagnosed:

- Make module **[27]** returned `records: []` for a new `reviewBatchKey`.
- Because the Existing Review Batch filter was positioned after **[37]**, modules **[36]** and **[37]** still ran despite no existing batch being found.
- A new guard filter was added between **[27]** and **[36]**:
  - **Label:** `Existing Review Batch Found`
  - **Condition:** `27.body.records[]` array length greater than 0
- The guard was saved and verified:
  - When **[27]** returned `records: []`, **[36]** and **[37]** had no operation bubbles.
  - **[29]** successfully created a **Draft Review Batch**.

This diagnosis and guard are recorded as evidence only. No further Make changes are part of this checkpoint.

### Live Review Batch records observed

The live Review Batches table currently includes:

- `recKXsjpDWNgaOXJP` linked to `rec5Gj7ZDdG9pMy4S`
- `rec3i6FRsC4giJmBm` linked to `rec7CnGt1zjRWGIN5`
- `recQwB4gf68jpZYfn` linked to `recyUCQOIrwfrfKbV`

### Current blocker

The Diane Ticket Review web app loads all **83 review groups and ticket scans**, but presents them as **UNBATCHED** groups.

Manual batching is blocked with:

> Manual batching blocked: recyUCQOIrwfrfKbV (already assigned to another Review Batch)

Therefore:

- The review screen works.
- The ticket scans are available.
- Some Validation Queue records are already linked to Draft Review Batches.
- The UI presents those same groups as unbatched.
- Manual rebatching refuses because it detects an existing assignment.

Batching behavior remains broken or inconsistent because the UI state and stored Review Batch assignment disagree.

### Exact next step for the next chat

Diagnose, before changing anything:

1. Why the review app labels linked Validation Queue records as **UNBATCHED**.
2. Why manual batching sees an existing Review Batch assignment for those records.

Do not change Make, Airtable schema, Apps Script, or live Airtable records until that UI/read-state mismatch is explained.

### Guardrails

- Keep all schedules **off**.
- Keep Scenario E at **one-record test scope**.
- Do not run Scenario E across the 83 records.
- Do not modify production code.
- Do not modify Make scenarios.
- Do not modify Airtable schema.
- Do not delete, relink, or otherwise modify live Airtable records.
- Do not treat the existence of Draft Review Batches as proof that the review app's batch read path is correct.
- Separate stored Airtable state, Make behavior, and review-app display state during diagnosis.

### Live identifiers

- **Airtable base:** `appMWvtLU0hMBqjLC`
- **Review Batches:** `tbl37qgQqfH1yd8Ww`
- **Validation Queue:** `tblbiwkOS9LDi5yaV`

