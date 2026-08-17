# Scenario D — Module 5 `allowRedirects` missing, all 33 tickets silently failing extractor call

**Date:** 2026-08-17
**Scenario:** D - Document AI Extractor (Make scenario ID `5251400`)
**Severity:** Critical — full-batch failure, masked by `onerror: Ignore` as a scenario-level SUCCESS
**Status:** FIXED and CONFIRMED WORKING via Make execution history UI.
**Superseded/extended by:** `2026-08-17-D20-scenario-d-module13-write-failures.md` — the re-run that confirmed this fix surfaced a second, separate, downstream bug at module 13. That is a different incident; this module 5 fix is solid and does not need to be revisited as part of that follow-up work.

## Root cause

Verified operations 1, 2, 3, 16, 17, 18, 32, and 33 individually — same error on every single one, first to last. This was **not** related to the midnight split, batch size, specific ticket content, or OCR quality. It was a static configuration gap in the HTTP module itself: the `allowRedirects` field (a standard Make HTTP-module setting controlling whether to follow HTTP redirects) had no value set.

Because module 5 has `onerror: Ignore` (per the existing known backlog item on Scenario D — see below), Make swallowed all 33 validation failures and let the scenario report a clean SUCCESS. The HTTP request never actually reached the Cloud Run extractor for any of the 33 tickets — it failed Make's own parameter validation before the call was made.

## Fix applied

1. Opened Scenario D (`5251400`) in the Make editor directly (live production edit, done in-browser).
2. Opened module 5 ("Send File to Document AI Bridge" — HTTP: Make an API call, POST to `https://diane-ticket-extractor-413667913571.us-central1.run.app/extract/ticket`).
3. Toggled "Advanced settings" on the HTTP module — this revealed a hidden "Allow redirects" Yes/No field that had neither option selected.
4. Set "Allow redirects" to **Yes**.
5. Saved the module and the scenario. Confirmed via "The scenario was saved" toast.
6. Did NOT touch the onerror:Ignore handlers on modules 5, 13, or 25 — that remains a separate open backlog item.

## Verification — CONFIRMED WORKING

Re-ran Scenario D on the same 33 tickets. Execution `9a45d9c9669d449cae9d7c6c09083360` (2026-08-17 09:36:52Z, 133 operations, status SUCCESS).

Checked module 5's bundle detail in Make History: **all 33/33 operations now show "The operation was completed"** — no BundleValidationError, no allowRedirects issue. The extractor call itself is fully fixed.

However, this re-run surfaced a second, separate, previously-undiscovered problem downstream at module 13 (Create Parser Output) — see `2026-08-17-D20-scenario-d-module13-write-failures.md` for that incident. Module 5 fix is solid and should not be revisited as part of that follow-up work.

## Related existing backlog items (unchanged by this incident, still open)

1. **onerror:Ignore silent failure pattern** — modules 5, 13, 25 on Scenario D all use `onerror: Ignore`. This incident was a live demonstration of exactly this risk at full-batch scale. Backlog fix (replace Ignore with proper error handling/visibility) remains open.
2. **Quantity string sanitization** — `diane-ticket-extractor` can return `quantity_tons` as malformed string with unit suffix (e.g. `"23.88.tn"`), causing Airtable numeric field rejection. Now confirmed as part of the module-13 incident (see that log) — this was previously scoped to a single known instance, now confirmed hitting at batch scale.

## Ticket keys involved

Not captured in the pasted session content for this log. The module-13 write-failures log references this file for "the full list of 33 `INTAKE_MOTIVE_...` ticket keys" — that list still needs to be added here if/when available. All 33 tickets are otherwise identified consistently across both incidents as the same batch (Ticket Status = "Intake", OCR complete, zero Parser Output records).

## Files/locations for context
- Scenario D blueprint: Make scenario ID `5251400`, team ID `2196964`
- Scenario D editor: `https://us2.make.com/2196964/scenarios/5251400/edit`
- Tickets table: `tbloTlWdo1f4hFKXh` (base `appMWvtLU0hMBqjLC`)
- Parser Outputs table: `tblvgGjGiSJCNid36`
- OCR Outputs table: `tblVXINiOoN7hPGpa`
