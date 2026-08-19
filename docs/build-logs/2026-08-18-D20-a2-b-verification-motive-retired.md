# Diane 2.0 Checkpoint: A2 → B Verified, Motive Intake Retired, Base Reset

**Date:** 2026-08-18 (runs land 2026-08-19 UTC)
**Repo / checkout:** `/Users/erniehathaway/Projects/diane` → `punkrocknerdgirl/diane`, branch `main`
**Scope:** Airtable base `appMWvtLU0hMBqjLC`; Scenario A2 `5984004`; Scenario B `5097838`; Scenario A `5631564`
**Follows:** `2026-08-18-D20-scenario-a-cleanup.md` (same evening, earlier)

---

## Purpose

Close out the evening's second session: retire Motive intake in favour of the Drive-folder
path, purge the live base to a clean baseline, and prove A2 → B end to end on real tickets.
Three defects were found in Scenario B and fixed. A separate finding redirected the open
date work away from image preprocessing.

---

## Verified state

Everything in this section was re-checked directly this checkpoint — saved Make blueprints
re-pulled via `scenarios_get`, Airtable read via the MCP — not accepted from the session
report.

### Scenario B (`5097838`) — all four §4 fixes confirmed in the saved blueprint

`lastEdit: 2026-08-19T01:29:26.751Z`, `isActive: false`, `isPaused: false`, `isinvalid: false`.

| Claim | Verified in blueprint |
|---|---|
| Resize bypassed | module 40 branch label `Image Type (BYPASSED 2026-08-18 — full-res to CloudConvert)`, condition `b: "image/x-bypass-resize"` |
| Module 32 retained, not deleted | `image:Resize` still present as module `32` |
| Upload filename carries extension | module 8 input `filename: "{{46.Name}}.jpg"` |
| `input_format` pinned | module 8 Convert task `input_format: "jpg"`, `output_format: "pdf"`, `useInputType: "yes"` |
| Task names simplified | tasks now named `Upload` / `Convert` / `Export`; no `Convert_1038202041_…` string anywhere in the blueprint |

Module 30's retry-cap filter also confirmed verbatim as described — `Retry cap reached`,
requiring `{{17.tasks[].result.files[].url}}` `notexist` **AND** `{{22.i}} = 5`. That is the
condition that cannot fire on an errored job; see backlog item 1.

### Airtable — reset and run results confirmed

- **Import Runs `tbl8V8VXyLIGtBu9X`: exactly 1 record.** `FOLDER_LIVE_TEST_20260818B`
  (`rec59Mi0v3yI7FjEE`), Source System `Folder`, Batch Type `Live Work`, Run Status
  `Completed`, `Pulled At` = `2026-08-19T01:15:06.930Z`, three linked Tickets.
- **Tickets `tbloTlWdo1f4hFKXh`: exactly 3 records**, all Source System `Folder`, all
  `Clean Status: Cleaned`, all `Send Cleaned File to OCR: true`, all with a populated
  `Cleaned File ID`. The three IDs match the session report exactly
  (`1Lwli11CBBHe7nOpUDaZkitsNE91bh8ki`, `1kRHRUD8P-4pnvkaFt2yAVtF8ZcdeNgME`,
  `1-SvaoTlBbb8_kRvnEJ3T4ZvQcEhkbr0x`).
- **`tblvgGjGiSJCNid36` (Parser Outputs): 0 records** — purge confirmed on a spot check.

### Scenario A (`5631564`) — retired by process, not by blueprint change

`isActive: false`, `lastEdit: 2026-08-18T23:47:01.416Z` — **unchanged from the earlier
session.** "Retired" here means removed from the operating procedure and documented as
such; no module, connection, or scheduling change was made tonight. A remains fully intact
and revivable.

Two related claims re-checked in A's blueprint:

- `run_start_time` appears **0 times** — module 32's removal is still clean.
- `doc_date` appears **once**, only inside `designer.samples` as cached Motive output
  (`"doc_date": "2026-07-24"`). Confirms the §2 point: Motive supplies a document date and
  no mapper in A ever consumed it. A was discarding a second date source.

### Reported but NOT independently verified this checkpoint

- The B PDF output being ~180 KB with ticket content intact — inspected in-session, not
  re-opened here.
- The Google Drive OCR text for ticket 410959 (`DATE 08/11/2026 09:39`) — the basis of §6.
  Read in-session from Drive; not re-fetched.
- Zero-record state of the other six purged tables (OCR Outputs, OCR Runs, Validation
  Queue, Review Batches, Invoice Batches, and the Tickets/Import Runs counts are covered
  above). One table was spot-checked; the rest are reported.
- The frozen duplicate base's contents.
- The `Pulled At` field description rewrite (`actC3PMzKHOBEExAr`). The Airtable MCP's
  `get_table_schema` does not return field descriptions, so the write is inferred from its
  payload, not read back — same limitation noted in the previous checkpoint.

---

## What changed this session

1. **Motive intake retired.** Scenario A is out of the active pipeline; A2 (Drive folder) is
   the sole intake path. A stays in the account, Inactive, revivable.
2. **Live base purged to zero** across all eight data tables. A frozen duplicate holds the
   prior data as a read-only reference (its record IDs differ, so no scenario can point at
   it).
3. **Scenario B, three defects fixed:**
   - Resize bypassed (module 40 condition set to an unmatchable mime prefix) so images reach
     CloudConvert at native resolution. Module 32 kept because merge 46 maps `{{32.fileName}}`
     and `{{32.data}}` — reversible in seconds.
   - `INVALID_FILENAME` on CloudConvert upload fixed: A2's Drive copies carry no extension,
     so module 8 now uploads as `{{46.Name}}.jpg`.
   - Convert task switched from format-inference to explicit `input_format: jpg`.
   - Task names simplified to `Convert` / `Export`, dropping a stale Motive document ID.
4. **A2 → B verified end to end** on three real tickets (410959, 412722, 412600) under Import
   Run `FOLDER_LIVE_TEST_20260818B`.
5. **`Pulled At` field description rewritten** to reflect A's retirement — all current rows
   are run *start* times; the close-time caveat is retained as a conditional.

## Finding: the date corruption is downstream of OCR, not an image-quality problem

Google Drive's own OCR reads `DATE 08/11/2026 09:39` off the same file Document AI parsed as
`2026-06-11`. Six of the seven known-bad dates are **year** corruption (`2001`, `2004`,
`2006`, `2020`) — always well-formed, always wrong. Pixel degradation would scatter errors
across all four digits instead.

The 32%-downscale hypothesis did not survive either: the Motive copies were 1320 × 595, well
under the 2048 cap, so Resize never touched them. The full-resolution images pulled from
Photos were ~160 KB — comparable — because Messages had already compressed them on the
sending device. No higher-resolution original exists.

**Consequence:** the fix is the **date range guard in Scenario D** plus the **Vision OCR
cross-check** against already-stored Raw OCR Text. Image darkening/preprocessing is not the
path to fixing dates. The resize bypass stays in — it is correct, just not a date fix.

---

## What was NOT changed

- No Make scenario was activated or scheduled. A, A2, and B all remain **Inactive**.
- Scenario A's blueprint was not touched tonight — no modules removed, no connections
  repointed, no scheduling change. Retirement is a documented process decision only.
- Module 32 in Scenario B (`image:Resize`) was **not** deleted, only bypassed.
- Both B edits were made in the Make UI, not via `scenarios_update`, per the standing rule
  about heavy per-module `metadata.expect` / `restore` / `interface` blocks.
- Scenarios C, D, E, F were not opened or modified.
- The frozen duplicate base was not repointed at, edited, or wired into anything.
- No date-guard or Vision cross-check work was started — §6 redirects it, it does not do it.

---

## Guardrails

Standing:

- Diagnose before changing anything.
- One exact step at a time when building with Ernie.
- Preserve existing architecture and proven behavior unless redesign is explicitly requested.
- Do not change production Make modules or logic without explicit approval.
- Never claim committed / pushed / deployed / tested / verified unless it actually occurred —
  this log keeps verified and reported-but-unverified in separate sections.
- Protect client data and credentials; never expose keys, PATs, or tokens.
- Airtable remains the operational source of truth.
- Do not restore Google Sheets as the final architecture.
- Local checkout and GitHub main stay in sync; build logs written locally, then pushed.

Session-specific:

- **Make's API exposes only bare execution status and operation counts.** The
  `INVALID_FILENAME` code and message that solved the blocker are visible **only** in Make's
  History UI. Per-module bundle detail cannot be retrieved through the MCP.
- **`SUCCESS` with zero Airtable writes happened twice tonight.** Make's green badge is not
  evidence. Airtable record state is the only reliable verification signal.
- **Airtable UI: clearing cell contents ≠ deleting rows.** Select all, then right-click →
  *Delete all selected records*; there is no toolbar button. A view with an active filter can
  only select what it shows — that is how Validation Queue got skipped on the first pass.
- **B cannot currently be trusted to report its own failures** (see backlog 1). Treat any B
  run as unverified until Airtable is checked.

---

## Backlog — new / confirmed

1. **B's retry-cap branch does not fire.** A genuine CloudConvert failure produced no
   `Cleaning Error`, no `Needs Clean`, and a green badge. Module 30's filter requires the
   export URL to not exist **AND** `{{22.i}} = 5`; on an errored job the flow never reaches
   it. Same silent-failure family as Scenario D's `onerror: Ignore`.
2. **A2 module 7 `"title": ""`** — still unresolved. Three files moved to `_Processed` this
   session; filenames not yet inspected. If a moved file comes through unnamed, **delete the
   key** rather than set it to a value.
3. **HEIC input path unverified** — every driver ticket arrived as JPEG.
4. **OCR Runs / Tickets parity** — OCR Runs stood at 199 against 170 Tickets before the
   purge, 29 more than there were tickets, cause never established. Now zeroed. If parity
   fails on the next full run, that is a live bug rather than legacy noise.
5. **Motive `doc_date` unused** — confirmed present in A's cached Motive output and consumed
   by nothing. If A is ever revived, consider mapping it as a second date source.
6. **Three Import Runs (`20260809`, `20260810`, `20260816`) produced zero tickets and still
   closed `Completed`** — a failed run marking itself successful. Same family as 1.

---

## Next step

Inspect the three files now sitting in `_Processed` and confirm whether module 7's empty
`title` blanked their filenames. If it did, delete the `title` key from module 7 rather than
assigning it a value.
