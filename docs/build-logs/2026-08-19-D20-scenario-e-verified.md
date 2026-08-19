# Diane 2.0 Checkpoint: Scenario E Verified End to End, Dispatch Alias Ambiguity Root-Caused

**Date:** 2026-08-19 (overnight continuation)
**Repo / checkout:** `/Users/erniehathaway/Projects/diane` → `punkrocknerdgirl/diane`, branch `main`
**Scope:** Scenario E `5721872` ("E - Build Review Batches"); Dispatch `tblnXClSQImZ22vCG`;
Review Batches `tbl37qgQqfH1yd8Ww`; base `appMWvtLU0hMBqjLC`
**Follows:** `2026-08-19-D20-scenario-d-date-guard.md`

---

## Purpose

Run the last unproven leg of the pipeline. A2 → B → C → D → E is now verified end to end on three
real tickets, producing one correctly-linked Review Batch. Getting there root-caused the
standalone-batch problem that produced four orphaned batches on 2026-08-10 — it is structural,
not the one-off OCR misread previously assumed — and surfaced a second `""`-into-a-numeric-field
bug of exactly the same shape as the `Parsed Ticket Date` failure fixed earlier tonight.

---

## Verified state

Re-checked directly during this checkpoint — Scenario E's saved blueprint re-pulled via
`scenarios_get`, Airtable read via the MCP — not accepted from the session report.

### The Review Batch

**Review Batches `tbl37qgQqfH1yd8Ww`: exactly 1 record in the whole table** (`recNVf7t5n2g5dCw5`,
created `2026-08-19T02:36:15Z`). No standalone batches, no orphans.

| Field | Value |
|---|---|
| Review Batch Key | `DISPATCH_DSP_20260809_MICHELSDATAHUBBARD_06` |
| Job | `Michels Data` |
| Rate | `$20` |
| Status | `Draft` |
| Validation Queue | 3 links — `recWu8I52eGaAR1ST`, `recaJFT9g3VrgsZSc`, `rec5JDEHoHVACVAQc` |

Those three record IDs are exactly the three Validation Queue rows verified in the previous
checkpoint (tickets 410959, 412722, 412600). All three landed on the one batch, which means the
**append path (modules 36/37) worked** — that is the path that misfired on 2026-08-10.

Origin, Destination, PO Number and Work Order came through **empty** on the batch, because they
are empty on the matched dispatch record. See the correction below.

### Scenario E (`5721872`) — blueprint unchanged this session

`lastEdit: 2026-08-11T00:43:42.501Z`, `isActive: false`, `isPaused: false`, `isinvalid: false`.

The timestamp predates this session, which independently confirms the session report's claim that
**no blueprint change was made** — the Rate bug was worked around in data, not in code.

Confirmed by reading the blueprint:

- Module 18 pulls Dispatch on `{Dispatch Status} = "Active"`, `maxRecords: 50`.
- Module 24's JS ends with `const resolvedDispatchRate = resolvedDispatch?.dispatchRate ?? "";`
  — the `?? ""` is still there, unfixed.
- Module 29 writes that value into `fldWH1pIFLrQcRW05`, confirmed by schema to be a **currency**
  field, precision 2, symbol `$`.
- The other `?? ""` defaults (Job `fldb6LbODvJXb2pHJ`, PO `fld9s64m8MFvmoaMJ`, Work Order
  `fldfepZIzqNpI7FS4`, Origin `fldLEYxtwdE2YOkaO`, Destination `fld6NOGe5nSVeWaov`) all target
  `singleLineText` fields. **Rate is the only numeric target.** The session report's read is correct.
- `keywordMatches` requires only the first meaningful token (stemmed) of a clue; `clueMatches`
  is strict full-phrase and runs only as the origin tie-break. Both confirmed in the JS.

### Dispatch table — alias state after the interim fix

**13 Dispatch records total.** For the Michels Data Hubbard job:

| Dispatch ID | Customer/Job text | Status now |
|---|---|---|
| `..._01` | Michels Data Hubbard | Closed |
| `..._02` | Michel's Data | Closed |
| `..._03` | Hubbard | **Active** |
| `..._04` | Data Hubbard | Closed |
| `..._05` | Michel's Data Hubbard | Closed |
| `..._06` | Michels Data | **Active** |

`_06` (`recJIahzUwiSpx0q3`, created `01:18:26`, rate `$20`) is the surviving matcher. Its own note
records that it was created without the apostrophe specifically because Canfield's OCR renders the
job with no apostrophe.

Still active and carrying the same latent ambiguity: **Ash Grove** (`_01` "Ash Grove", `_02` "Ash
Grove Cement Company", `_03` "Ash Grove Co" — three sharing first token `ASH`), **Tiseo** (`_01`
"Tiseo Paving", `_02` "Tiseo"), **Sinacola** (`_01` "Mario Sinacola", `_02` "Sinacola" — note these
two do *not* share a first token, so this pair is less exposed than the other two).

**Origin is empty on every Dispatch record in the table.** That is the mechanical reason the
tie-break cannot resolve anything, confirmed directly rather than inferred.

### Corrections to the session report

1. **Four aliases were closed, not three.** `_01`, `_02`, `_04` and `_05` are all `Closed`. The
   report's five-row "before" table also does not include `_06`, which is the record that actually
   survived — `_06` was created separately at `01:18` and is a sixth alias, not one of the five.
2. **`HUBBARD` (`_03`) is still Active.** It is harmless — its first token `HUBBARD` does not appear
   in our OCR — but the report reads as though only one Michels record remains active. Two do.
3. **Broker does not come from the matched dispatch.** The report states Broker, Rate, PO, Work
   Order, Origin and Destination all flow from the dispatch. Module 24 does compute
   `resolvedDispatchBrokerRecordId` (and Truck and Driver), but **module 29 never maps any of the
   three onto the Review Batch record.** The batch created tonight carries no Broker, Truck, or
   Driver link. The wider point still stands — empty `Parsed Broker` on tickets is not a blocker —
   but the Broker value is not being written at all, by anything.

### Reported but NOT independently verified this checkpoint

- The `[422] Field "Rate" cannot accept the provided value` error text from the first E run.
  Visible only in Make's History UI; `executions_get-detail` does not expose it.
- The four orphaned batches from the 2026-08-10 run — the table now holds one record, so the
  earlier state cannot be re-read.
- That the three closed aliases were closed *this session* rather than earlier; only their current
  `Closed` status is verifiable.
- The three Apps Script review-form bugs listed under Next — reported from use, not reproduced here.

---

## What changed this session

1. **Scenario E proven end to end.** One Review Batch created from three tickets, all three linked,
   including two via the append path that previously produced orphans.
2. **Four Michels Data Hubbard dispatch aliases closed** (`_01`, `_02`, `_04`, `_05`), leaving `_06`
   "Michels Data" as the single matching alias for that job. This is a **data change, not a code
   change** — it trades recall for precision. If a future ticket's OCR renders the job as
   `DATA HUBBARD` without `MICHELS`, it will no longer match and will produce a standalone batch.
3. **A real rate (`$20`) written to dispatch `recJIahzUwiSpx0q3`** to work around the Rate bug.

## What was NOT changed

- **Scenario E's blueprint was not touched** — `lastEdit` still `2026-08-11T00:43:42Z`. The Rate
  `?? ""` bug is still live in module 24.
- **No other scenario was modified.** All scenarios remain inactive and unscheduled.
- **No Airtable schema change.** The proper alias fix (multiple alias values on one dispatch record)
  requires one and was deliberately deferred.
- **Ash Grove, Tiseo and Sinacola aliases were left alone** — same latent ambiguity, not triaged.
- **The month/rolling-window date guard was deliberately deferred** — Ernie reviews every ticket and
  will catch month errors by eye. This is a decision, not an oversight.
- No Apps Script changes, no deployments.
- `docs/build-logs/terminal-and-git-glossary.md` was not modified — every command run this
  checkpoint (`pwd`, `git rev-parse --show-toplevel`, `git status --short --branch`, `git remote -v`,
  `git fetch origin main`, `git rev-list --left-right --count origin/main...HEAD`,
  `python3 - <<'PY'`) was already present.
- `docs/build-logs/build-log.md` was not touched. Pre-existing modified/untracked files at session
  start were left alone and are not staged by this checkpoint.

---

## Findings

### 1. How E actually batches — this was not documented anywhere

E does **not** batch by broker. It:

1. Pulls all Dispatch records with `Dispatch Status = "Active"` (module 18).
2. Keyword-matches the ticket's Raw OCR Text against each dispatch's Customer / Job / Origin /
   Destination (module 24 JS).
3. Batches by `DISPATCH_{dispatchId}`. If unresolved, it falls back to the Validation ID — which
   produces **one standalone batch per ticket**.

Rate, PO, Work Order, Origin, Destination and Job on the Review Batch all come **from the matched
dispatch**, not from OCR. Broker, Truck and Driver are computed but never written (see correction 3).

### 2. ROOT CAUSE of the standalone-batch problem — structural, not an OCR misread

The Dispatch table holds **alias variants as separate records**. Five active records existed for the
Michels Data Hubbard job. Four of them share the first meaningful token `MICHELS` or `DATA`, and
`keywordMatches` needs only that first token:

| Dispatch | First token | Matched our tickets? |
|---|---|---|
| `MICHEL'S DATA HUBBARD` | MICHELS | ✓ |
| `MICHELS DATA` | MICHELS | ✓ |
| `MICHELS DATA HUBBARD` | MICHELS | ✓ |
| `DATA HUBBARD` | DATA | ✓ |
| `HUBBARD` | HUBBARD | ✗ |

Four candidates → tie-break on Origin → **Origin is empty on every dispatch record** (verified) →
`clueMatches` returns false for all → `resolutionStatus = "ambiguous"` → fallback to Validation ID →
one standalone batch per ticket.

**Any job with more than one active alias sharing a first token is ambiguous by construction.** The
2026-08-10 orphans were not an OCR fluke.

**Proper fix (backlog):** aliases should be multiple values on *one* dispatch record, not separate
records. That gives recall without ambiguity. Requires an Airtable schema change plus a change to
module 24's JS.

### 3. Bug — `Rate` cannot accept an empty string

The first E run died at module 29 with `[422] Field "Rate" cannot accept the provided value`.

Module 24 ends with `const resolvedDispatchRate = resolvedDispatch?.dispatchRate ?? "";`. The
`?? ""` writes an empty string into `fldWH1pIFLrQcRW05`, a **currency** field. Airtable rejects `""`
on numeric fields — the identical failure to `Parsed Ticket Date` earlier tonight.

**Not fixed.** Worked around by writing a real rate to the dispatch record. In normal operation
dispatches are created with a rate up front, so this only fires on a dispatch missing one.

**Recommended fix:** `?? ""` → `?? null` on the Rate line. One character. The failure mode is
disproportionate to its likelihood — E dies mid-run, no batch is created, and the tickets sit in
Validation Queue looking perfectly healthy.

### 4. Batch contents, for the manual review pass

| Ticket | Final Ticket Date | Final Quantity | Rate |
|---|---|---|---|
| 410959 | `2026-06-11` | 24.56 | $20 |
| 412722 | *(blank — guard)* | *(blank)* | $20 |
| 412600 | *(blank — guard)* | *(blank)* | $20 |

Two blank dates are the year guard working as designed. The session report lists `616.53` as
412722's quantity; as in the previous checkpoint, the saved record's quantity is **blank** — the
`616.53` reading came from an earlier run and did not survive into the stored record.

---

## Guardrails

Standing Diane guardrails, unchanged: diagnose before changing anything; preserve existing
architecture and proven behaviour unless redesign is explicitly requested; no production Make module
or logic change without explicit approval; verified and reported-but-unverified stay distinct;
never expose keys, PATs, or tokens; Airtable is the operational source of truth; Google Sheets is
not coming back; local checkout and GitHub main stay in sync; all scenarios stay inactive and
unscheduled, run once only and manually.

Carried forward from the previous checkpoint and reaffirmed:

- **Close the Make scenario tab before any `scenarios_update` push**, then re-fetch, reopen,
  visually confirm, and only then run.
- **A green SUCCESS badge in Make is not evidence anything was written.** Airtable record state is
  the only reliable verification signal.
- **Per-module error text is visible only in Make's History UI.**

New, now standing:

- **Never map `?? ""` (or `emptystring`) into an Airtable numeric, currency, or date field.** Use
  `null` so Make omits the key. Two separate `422`s from this same shape in one night.
- **One active alias per job in the Dispatch table**, until the multi-alias-per-record schema change
  lands. More than one active alias sharing a first meaningful token guarantees ambiguity.
- **Origin cannot serve as a tie-break while it is empty on every dispatch record.** Either populate
  it or stop relying on it.

---

## Still open

1. **Dispatch alias schema.** Move aliases to multiple values on one record; update module 24's JS.
   Ash Grove (3 active aliases), Tiseo (2), Sinacola (2) all still carry the latent problem.
2. **Rate `?? ""` → `?? null`** in Scenario E module 24. One character, not yet applied.
3. **Broker / Truck / Driver are computed in module 24 but never written by module 29.** Decide
   whether they should be mapped onto the Review Batch or the computation dropped.
4. **Quantity plausibility guard in Scenario D** — Document AI has returned the running scale total
   instead of the net load.
5. **Month/rolling-window date guard in Scenario D** — deliberately deferred; Ernie reviews every
   ticket and will catch month errors by eye.
6. **Scenario D `onerror: Ignore` on modules 5 and 13** — demonstrated to swallow a real `422`.
7. **Scenario B retry-cap branch does not fire** — same silent-failure family.
8. **Scenario C `Processing File URL` never populated** — cosmetic.

---

## Next step

The Apps Script review form is the next surface. Three known bugs, all requiring Claude Code:

1. Ticket date never populates in the form (separate from the Scenario D mapping fix).
2. Scan image disappears when clicking into any field.
3. Zoom behaviour inconsistent — sometimes clean in/out, sometimes full pan/scroll.

Script ID: `1kX8RuUiYcKmXExMDg4zhOm-E-rDHMw08JPqegWiBB36sUN0XZSnsJbAZ`

Smallest concrete first action: reproduce bug 1 by opening the form against batch
`DISPATCH_DSP_20260809_MICHELSDATAHUBBARD_06` and confirming whether `Final Ticket Date` is absent
from the payload the server hands the client, or present and dropped by the client on render.
