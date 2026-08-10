# Diane 2.0 Checkpoint: Scenario F — Invoice Generator Build

**Date:** 2026-08-10  
**Repo/checkout:** `/Users/erniehathaway/Projects/diane`

## Purpose

Build Make.com Scenario F — the invoice generator for Diane 2.0. Scenario F takes an approved Invoice Batch from Airtable, clones the HSG Invoice Template Google Sheet, populates it with batch and ticket data via a single batchUpdate API call, and writes the resulting invoice URL back to the Invoice Batch record.

## Verified state

- **Scenario F created:** Make scenario ID **5908565**, name "F - Generate HSG Invoice", folder 237340 (same as A–E), scheduling: on-demand, status: **inactive**. Confirmed via `scenarios_create` response — `isinvalid: false`, `isActive: false`.
- **8 modules accepted:** `usedPackages` confirms airtable × 3, builtin × 2, code × 1, google-drive × 1, google-sheets × 1 — all registered without error.
- **`google-drive:copyAFile` v4 confirmed valid** — scenario accepted without "module not found" error, proving the module name exists.
- **Airtable field names confirmed** via `list_tables_for_base` this session: `Ticket Number`, `Ticket Date`, `Truck Billing Name`, `Origin`, `Destination`, `Quantity`, `Rate`, `Line Total` (Tickets table); `Invoice Number`, `Invoice Date`, `Driver / Truck`, `Tickets`, `Batch Status`, `Invoice Sheet URL` (Invoice Batches table).
- **`airtable:makeApiCall` version 3 confirmed** via Scenario E blueprint inspection (modules 27 and 37 both at v3).
- **Invoice Batches table has zero records** — a test record must be created manually before the scenario can be tested.

## What changed this session

**1. Make Scenario F created (ID 5908565)**

8-module linear pipeline:

| # | Module | Version | Role |
|---|--------|---------|------|
| 1 | `airtable:ActionSearchRecords` | 3 | Find Invoice Batches with `{Batch Status} = "Ready for Invoice"` |
| 2 | `builtin:BasicFeeder` | 1 | Iterate over `{{1.Tickets}}` linked record array |
| 3 | `airtable:ActionGetRecord` | 3 | Get each ticket from Tickets table; filter guards `{{2.value}}` must exist |
| 4 | `builtin:BasicAggregator` | 1 | Collect ticket fields: ticketDate, ticketNumber, truckBillingName, origin, destination, quantity, rate, lineTotal |
| 5 | `code:ExecuteCode` | 1 | Build Google Sheets batchUpdate body JSON; handles ≤9 and >9 ticket batches |
| 6 | `google-drive:copyAFile` | 4 | Clone HSG Invoice Template (`10apbUjqPwmdP7qEHxD0b4u1yUwtPz9glrWXdP3XsF_k`) into Diane 2.0 Invoices folder (`1gD8RYh4LkDF6_R8wX0gGRJlRiMUE1TiX`) |
| 7 | `google-sheets:makeAPICall` | 2 | POST `spreadsheets/{{6.id}}/values:batchUpdate` — writes header cells + all line items in one call |
| 8 | `airtable:makeApiCall` | 3 | PATCH Invoice Batch: set `Batch Status = "Invoice Built"`, write `Invoice Sheet URL` |

**2. Key design decisions locked in**

- **Aggregation-first:** All ticket data is collected via BasicFeeder → GetRecord → BasicAggregator (modules 2–4) before the Drive copy (module 6). This means the JS code module (5) builds the full batchUpdate body before we even have a sheet ID — which is correct, since the body contains only cell ranges/values, not the sheet ID.
- **Single batchUpdate:** One POST writes all cells (header block + all line items) in one API call rather than one `addRow` per ticket. Avoids hitting rate limits on large batches.
- **No sheet name prefix:** Cell ranges use bare references like `H4`, `A14`, etc. (not `Sheet1!H4`). The Google Sheets API defaults to the first sheet, making the scenario sheet-name-agnostic.
- **≤9 ticket path:** Template formulas (D7, H6, H7, F23, H23) are correct as-is — blank rows return 0, don't affect sums or COUNTA. No formula updates needed.
- **>9 ticket path:** The data overwrites the template footer at row 23. The code module updates D7/H6/H7 to cover the extended range and writes a new footer row below the data.
- **lineTotal fallback:** `parseFloat(t.lineTotal) || (qty * rate)` — uses the stored Line Total from Airtable (already reviewed/approved) and only falls back to computed value if missing.
- **Single-ticket edge case:** `Array.isArray(tickets) ? tickets : (tickets ? [tickets] : [])` handles Make potentially passing a single object instead of a one-element array when the batch has only one ticket.

**3. Connection IDs in use**

| Connection | ID | Used by |
|---|---|---|
| Airtable | 9855937 | Modules 1, 3, 8 |
| Google Drive | 8608773 | Module 6 |
| Google Sheets | 8557388 | Module 7 |

**4. Key Airtable field IDs (for reference)**

| Field | Table | ID |
|---|---|---|
| Batch Status | Invoice Batches | fldvHuOPMZnPuGSGV |
| Invoice Sheet URL | Invoice Batches | fldtdSaz4K8IN1UR8 |
| Tickets (linked) | Invoice Batches | fldKpWhbM4IMSI2XT |
| Invoice Number | Invoice Batches | fldpWNDRD9Xw1LKu7 |
| Invoice Date | Invoice Batches | fldniWxsvknMcPpW8 |
| Driver / Truck | Invoice Batches | fldB2FzSy50dfnhWK |

## What was NOT changed

- No existing Make scenarios (A–E) were modified.
- No Airtable schema changes.
- No Apps Script changes.
- The HSG Invoice Template file was NOT cloned — Scenario F will clone it on each run.
- Scenario F was NOT test-run — zero Invoice Batch records exist, so a test record must be created first.
- The scenario was created inactive (on-demand) and stays that way. It must be run manually via "Run once."

## Guardrails

Standing Diane guardrails (carried forward):

- Diagnose before changing anything.
- Work one exact step at a time when interacting with Ernie during the actual build.
- Preserve existing architecture and proven behavior unless redesign is explicitly requested.
- Do not change production Make modules or logic without explicit approval.
- Do not claim code was committed, pushed, deployed, tested, or verified unless it actually occurred.
- Protect client data and credentials — never expose API keys, PATs, tokens, or secrets in chat, logs, commits, or commands that echo them.
- Airtable remains the operational source of truth.
- Do not restore Google Sheets as the final architecture.
- Local checkout and GitHub main should stay in sync.

Session-specific carry-forwards:

- All Make scenarios are run manually via "Run once" — none stay activated between uses.
- Do not build webhook-chained pipeline automation until: (1) numeric sanitization bug is fixed in the extractor, and (2) at least 2–3 full A→E batches have run clean without manual intervention.
- `Final Total (Legacy)` (`fld5IN6BntCd4wDJM`) must remain untouched as the audit-trail record.
- **Drive org rule:** Nothing Diane-related lives in client folders. All project files go in `01 Project Diane` in Drive OR `~/Projects/diane` locally.
- **Stale folder ID:** Old `Generated Invoices` ID `1rbYhx0sv-tPFdy_h_oEOHg5g7gGEWxd9` is dead. Use `1gD8RYh4LkDF6_R8wX0gGRJlRiMUE1TiX` (`Diane 2.0 Invoices` in `03 Exports`).

## Flags for human review (carried forward)

- **Invoice Batches table has zero records** — must create a test record manually before Scenario F can be tested.
- **Manual trash needed:** Stray `Templates` folder (`1zxt_1beoe5JX0QmiMLTinRYwIPtIAy_K`) and HSG Invoice Template copy (`1RoSvpIFw-DC8vOZOcyrCb98ezlz35PEG9yXxK5fNrMs`) in WC Trucking Invoices — Drive MCP cannot delete, Ernie must trash manually.
- **Canfield 8/10 flags (carried forward):** Ticket 409076 blank quantity, 408957 quantity mismatch, 408602 garbled OCR date.

## Next step — test Scenario F

**Before running**, create a test Invoice Batch record in Airtable:

1. Go to the **Invoice Batches** table in the Diane base
2. Create a new record with:
   - `Batch Key`: any value (e.g. `TEST_HSG_20260810`)
   - `Invoice Number`: e.g. `HSG26081001`
   - `Invoice Date`: today's date (2026-08-10)
   - `Driver / Truck`: e.g. `Wright 01 - David Clifton`
   - `Tickets`: link 2–3 approved tickets from a completed batch (e.g. from the Canfield 8/10 batch if approved)
   - `Batch Status`: **Ready for Invoice**
3. Open Scenario F in Make → **Run once**
4. Verify:
   - A new Google Sheet named `2026-08-10 HSG Invoice HSG26081001` (or similar) appears in `Diane 2.0 Invoices` in Drive
   - The sheet is populated with header cells (H4=date, D8=driver, H8=truck, H9=invoice#) and ticket line items in rows 14+
   - The Invoice Batch record in Airtable shows:
     - `Batch Status` = `Invoice Built`
     - `Invoice Sheet URL` = the new spreadsheet URL

### Known first-run risk

If the HSG Invoice Template's first sheet tab is NOT named "Sheet1" and the batchUpdate fails with an "Unable to parse range" error — the fix is to open the template, note the actual tab name, and update the range prefixes in the code module (module 5) from `'H4'` to `'TabName!H4'`, etc. The cell references without a sheet prefix default to the first sheet, so if the tab is named anything other than the default, this may not apply.
