# 2026-07-20: Scenario 01 Ingest Motive Tickets — LIVE RUN PASSED

## Purpose

Validate the current Airtable-based Scenario 01 against live Motive data before continuing the production ticket batch through OCR, extraction, review, and invoicing.

## Scenario

**01 Ingest Motive Tickets**

Current flow:

```text
[26] Search Import Runs
    → [32] Capture run start time
    → [33] Router
        Route 1:
        [1] List Motive Documents
            → [15] Iterator Over Attachments
            → [27] Search Existing Tickets
            → [7] Download Attachment
            → [8] Upload to Drive
            → [30] Create Ticket Record

        Route 2:
        [31] Update Import Run
```

## Import Run selection

Module `[26] Search Import Runs` was confirmed against the **Diane 2.0 / Import Runs** table with this filter:

```text
AND(
  {Source System} = "Motive",
  {Import Disposition} = "Live Work",
  {Run Status} = "Planned"
)
```

Because two live planned Import Run records existed, `[26]` was corrected to sort by **Pulled At descending** with **Limit = 1**. This ensures the scenario always selects the most recent live Motive cutoff instead of an arbitrary matching record.

Selected Import Run:

- **Import Run Key:** `MOTIVE_LIVE_20260709_FIRST_IMPORT`
- **Disposition:** Live Work
- **Source:** Motive

## Test configuration

- Scenario remained manually run and inactive.
- Module `[26]` limit remained at **1** for the controlled live validation.
- Original Motive files were not modified.
- Airtable was treated as disposable staging because the source images remain recoverable from Motive.

## Result

Scenario 01 completed cleanly and created Airtable Ticket records with:

- Ticket Status = `Intake`
- Source System = `Motive`
- Import Disposition = `Live Work`
- Source File URL populated
- Source File ID populated
- Import Run link populated
- Motive Document ID populated
- stable Ticket Key and Import Key values

Example records created from Motive document `1034043804`:

- `INTAKE_MOTIVE_1034043804_1034043807`
- `INTAKE_MOTIVE_1034043804_1034043804`

## Multi-attachment behavior verified

The two records above were **not duplicates**. Motive document `1034043804` contained two PDF attachments, and module `[15] Iterator Over Attachments` correctly emitted two bundles:

1. Attachment ID `1034043807`
2. Attachment ID `1034043804`

Scenario 01 correctly follows this rule:

```text
1 Motive document
    → 1 or more attachments
    → 1 Airtable Ticket record per attachment
```

This is expected production behavior because a Motive document may contain one or multiple ticket images/files.

## Validation status

**SCENARIO 01 PASSED — 2026-07-20**

The live run confirmed:

- current Import Run selection works after adding the Pulled At descending sort
- Motive documents are retrieved
- attachments are iterated independently
- existing-ticket checking does not block valid new attachments
- files download from Motive
- files upload to Google Drive
- Airtable Ticket records are created and linked correctly
- multi-attachment Motive documents are handled correctly

No Scenario 01 repair is required before the next live batch.

## Production note for future batches

Before the next batch:

1. Confirm there is one intended **Motive / Live Work / Planned** Import Run.
2. Confirm module `[26]` still sorts **Pulled At descending**.
3. Use a low limit only when testing.
4. Return the production document limit to **75** after testing is complete.
5. Do not mistake multiple Ticket records sharing one Motive Document ID for duplicates when their attachment IDs and Import Keys differ.

## Next step

Continue with **02 OCR Workflow** using the newly created `Intake` Ticket records. Do not rerun Scenario 01 unless additional Motive documents need to be imported or Airtable staging is intentionally reset.
