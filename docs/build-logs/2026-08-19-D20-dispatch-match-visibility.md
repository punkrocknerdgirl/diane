# Diane 2.0 Checkpoint: Dispatch Match Visibility Wired into Scenario E

**Date:** 2026-08-19 (overnight continuation — see note on dating below)
**Repo / checkout:** `/Users/erniehathaway/Projects/diane` → `punkrocknerdgirl/diane`, branch `main`
**Scope:** Scenario E `5721872`; Validation Queue `tblbiwkOS9LDi5yaV`; Dispatches `tblnXClSQImZ22vCG`
**Follows:** `2026-08-19-D20-scenario-e-verified.md`

> **Dating note.** The source inbox file is named `2026-08-18-D20-dispatch-match-visibility.md`,
> but the work it describes lands *after* the Scenario E verification session — Scenario E's
> `lastEdit` for this change is `2026-08-19T02:48:56Z`, twelve minutes after the Review Batch this
> session smoke-tested against was created. Logged under 2026-08-19 to keep the sequence readable.

---

## Purpose

Make automatic dispatch resolution visible. Until now it succeeded or failed silently — an
ambiguous match produced a singleton Draft batch with blank fields, no error, and nothing written
anywhere explaining why. Scenario E now writes a diagnostic note, an assignment source, and a
dispatch link onto the Validation Queue record on every pass.

The matching itself is **not** fixed. This is the surfacing layer only.

---

## Verified state

Re-checked directly during this checkpoint — Scenario E's blueprint re-pulled via `scenarios_get`,
Airtable read via the MCP.

### Scenario E (`5721872`) — router 39 and modules 40/41/42 confirmed live

`lastEdit: 2026-08-19T02:48:56.515Z`, `isActive: false`, `isPaused: false`, `isinvalid: false`.
No `designer.samples` residue in the saved blueprint.

Router `39` sits directly after module 24 inside route 1 of router 11, with two routes:

| Route | Modules | Confirmed |
|---|---|---|
| A | `27` → `28` → (`29` \| `36`+`37`) | Unchanged, byte-for-byte the prior chain, now nested under 39 |
| B | `40` → `41` → `42` | New |

- **`40`** `code:ExecuteCode` "Build Dispatch Match Note" — composes `matchNote`,
  `assignmentSource`, `dispatchLinkId`, `isResolved` from module 24's output. Confirmed it handles
  all three branches (`resolved` / `ambiguous` / neither) and carries an `originCluesMissing` check
  that reports the tie-break as unavailable rather than as a failed comparison.
- **`41`** `airtable:ActionUpdateRecords` "Write Dispatch Match Notes" — writes
  `fld5k7z73HCkzHLkw` and `fldIRLWXvqnkz04fE` on `{{2.id}}`, filtered
  `{{2.`Dispatch Lock`}} boolean:notequal true`.
- **`42`** `airtable:ActionUpdateRecords` "Link Resolved Dispatch" — writes `fldmPBUAOCkHl2e79`,
  filtered `{{40.result.isResolved}} number:equal 1`.

Module 24's two regex literals are confirmed rewritten as escapes in the saved blueprint:
`/[̀-ͯ]/g` and `/[’']/g`. The rest of 24 is unchanged — including
`const resolvedDispatchRate = resolvedDispatch?.dispatchRate ?? "";`, so **the Rate currency bug
from the previous checkpoint is still live.**

### Airtable — smoke test result confirmed

`recWu8I52eGaAR1ST` (ticket 410959):

```
Dispatch Match Notes:       AUTO - resolved to DSP_20260809_MICHELSDATAHUBBARD_06 via
                            first_pass_single. Candidates (1): MICHELSDATAHUBBARD_06 [job].
Dispatch Assignment Source: Automatic   (selSTTe1BzOwovDtE)
Dispatches:                 recJIahzUwiSpx0q3  (DSP_20260809_MICHELSDATAHUBBARD_06)
```

Verbatim match to the session report. Review Batch `recNVf7t5n2g5dCw5` is back to **3** linked
Validation Queue records and remains the only record in the Review Batches table — so route A
self-healed the unlink via 36/37 and the new branch did not interfere with batch creation.

**Worth noting:** the other two Validation Queue records (412722 `recaJFT9g3VrgsZSc`, 412600
`rec5JDEHoHVACVAQc`) carry **no** Dispatch Match Notes and no Assignment Source. That is expected,
not a defect — module 2's formula requires `COUNTA({Review Batches}) = 0`, so only the record whose
batch link was cleared for the smoke test passed through E after the change. Existing records are
not backfilled. Anything already batched will stay diagnostic-free until it is re-run.

### Resolves an ambiguity from the previous checkpoint

The previous checkpoint could not tell whether Dispatch field `fldn200kJNSM0hdo1` was `Customer` or
`Job`, because Airtable's name resolution returned one field for two requested names and the other
was empty. **It is `Job`.** Only `Job` is populated across the 13 Dispatch rows; `Customer`,
`Origin`, `Destination`, `PO Number` and `Work Order` are all empty, and `Rate` is set on exactly
one row (`Michels Data`, `$20`).

### Reported but NOT independently verified this checkpoint

- The pre-change state of `recWu8I52eGaAR1ST` (that the batch went 3 → 2 when the link was cleared,
  and that both sides of the two-way link dropped). Observed in-session; the batch is back to 3 now.
- That the locked select accepted `Automatic` with `typecast: false` — the stored value is
  `Automatic`, which is consistent, but the write itself was not re-executed here.
- The expected shape of the ambiguous note. It is **untested** — see Open items.
- The claim that module 36's em dashes survived a prior `scenarios_update` round-trip intact.

---

## What changed this session

1. **Router `39` inserted** after module 24 in route 1 of router 11, splitting the existing
   batch-creation chain (route A) from the new diagnostics chain (route B).
2. **Module `40`** added — builds the match note, assignment source, dispatch link ID and an
   `isResolved` flag from module 24's output.
3. **Module `41`** added — writes `Dispatch Match Notes` and `Dispatch Assignment Source` to the
   Validation Queue record, skipping records where `Dispatch Lock` is checked.
4. **Module `42`** added — writes the `Dispatches` link, resolved matches only.
5. **Two regex literals in module 24 rewritten as `\u` escapes.** Logic unchanged; normalization
   verified still working post-change (`MICHELS` still tokenizes and matches).

**No new Airtable fields were created.** All four target fields already existed and had no writer.
`Dispatch Match Notes` is described in schema as *"Explains automatic dispatch matching, ambiguity,
conflicts, or the reason a record remains unassigned"* — the surfacing layer had been designed and
never wired.

## What was NOT changed

- **The matching logic itself.** `keywordMatches`, `clueMatches`, the candidate loop and the
  fallback to `validationId` are all untouched. This session makes the failure visible; it does not
  make it stop happening.
- **The Rate `?? ""` bug** in module 24 — still live, still unfixed.
- **Route A's chain** — `27`, `28`, `29`, `36`, `37` are byte-identical, only re-nested under 39.
- **The Dispatch table** — no rows added, closed, or edited. Adding rows would make matching
  *worse*, not better (see finding 2).
- **No Apps Script changes, no deployments, no Airtable schema changes.**
- `docs/build-logs/terminal-and-git-glossary.md` was not modified — every command run this
  checkpoint (`pwd`, `git rev-parse --show-toplevel`, `git status --short --branch`, `git remote -v`,
  `git fetch origin main`, `git rev-list --left-right --count origin/main...HEAD`,
  `python3 - <<'PY'`) was already present.
- `docs/build-logs/build-log.md` was not touched. Pre-existing modified/untracked files at session
  start were left alone and are not staged by this checkpoint.

---

## Findings

### 1. There is no alias table — matching runs against Dispatches directly

The "multi-alias ambiguity" is not a data problem in a separate alias table; no such table exists in
this path. Matching happens in Scenario E module 24 against the **Dispatches** table
(`tblnXClSQImZ22vCG`), row by row. Each "alias" is simply another Dispatch row.

Only `Job` is populated across the 13 rows. First-token collisions among Active rows:

| Token | Colliding rows |
|---|---|
| `ASH` | ASHGROVE_01, _02, _03 |
| `TISEO` | TISEO_01, _02 |
| `MARIO` / `SINACOLA` | SINACOLA_01, _02 — collide only when OCR carries both words |

**Consequence: adding rows to Dispatches makes this worse.** More rows sharing a first token means
more collisions. This inverts the intuitive fix.

### 2. The origin tie-break is dead code

`clueMatches` is called on `dispatchOrigin`, and Origin is empty on every row. `getMeaningfulTokens`
therefore returns `[]`, `clueMatches` returns `false` unconditionally, and
`originMatchedDispatches.length` is always `0` — never `1`.

**Any multi-candidate case is therefore unconditionally ambiguous.** The tie-break has never fired
and cannot fire in the current data state. The previous checkpoint recorded Origin as empty; this
session establishes the stronger conclusion that the tie-break is not merely unhelpful but
structurally incapable of resolving anything.

On ambiguity, `reviewBatchKey` falls back to `validationId`, producing a singleton Draft Review
Batch with blank Origin / Job / Rate / PO / Work Order, no error, and — until this session — no
status recorded anywhere.

### 3. Why a router and not an inline filter

In Make, **a rejected filter halts the bundle for the remainder of the chain**, not just for the
filtered module. Placing 41 and 42 inline between 24 and 27 would have stopped locked or unresolved
tickets from ever reaching 27/28 — silently denying them a Review Batch. That is a worse bug than
the one being fixed. The router isolates the new filters from the batch-creation path.

This is a general Make rule worth carrying forward: **branch before filtering when later modules
must still run.**

### 4. Adjacent locked selects with near-identical option sets

`Dispatch Assignment Source` options are `Automatic` / `Manual` / `Unassigned`.
`Batch Assignment Source` options are `Auto` / `Manual` / `Unassigned`.

Different first option, adjacent fields, and locked selects fail **silently** on a bad value with
`typecast: false`. Easy to write `Auto` into the wrong one and see nothing happen.

---

## Guardrails

Standing Diane guardrails, unchanged: diagnose before changing anything; preserve existing
architecture and proven behaviour unless redesign is explicitly requested; no production Make module
or logic change without explicit approval; verified and reported-but-unverified stay distinct;
never expose keys, PATs, or tokens; Airtable is the operational source of truth; Google Sheets is
not coming back; local checkout and GitHub main stay in sync; all scenarios stay inactive and
unscheduled, run once only and manually.

Carried forward and reaffirmed this session:

- **Close the Make scenario tab before any `scenarios_update` push**, then re-fetch, reopen,
  visually confirm, and only then run. Reconfirmed as a gotcha in this session's own notes.
- **Never map `?? ""` or `emptystring` into an Airtable numeric, currency, or date field.**
- **A green SUCCESS badge in Make is not evidence anything was written.**

New, now standing:

- **Branch before filtering in Make.** A rejected filter halts the bundle for the whole downstream
  chain. If later modules must still run for the filtered-out cases, split with a router first.
- **Check the option list before writing to a locked single select**, especially
  `Dispatch Assignment Source` (`Automatic`) vs `Batch Assignment Source` (`Auto`). With
  `typecast: false` a wrong value fails silently.
- **Do not add rows to the Dispatches table as a way to improve matching.** Every additional row
  sharing a first meaningful token increases ambiguity.
- **Diagnostics are written on pass-through only.** Records already carrying a Review Batch link
  are skipped by module 2's formula and will never be backfilled by a re-run.

---

## Still open

1. **Ambiguous branch is untested.** Needs a real non-Michels ticket; Statewide tickets expected
   Sunday. Expected output shape:

   ```
   AUTO - AMBIGUOUS, no dispatch assigned. Candidates (3):
   ASHGROVE_01 [job], ASHGROVE_02 [job], ASHGROVE_03 [job].
   Origin tie-break unavailable - no Origin set on candidates.
   ```

   with `Dispatch Assignment Source` = `Unassigned`, no `Dispatches` link, and a singleton batch
   keyed `VAL_...` rather than `DISPATCH_...`.

2. **Stage 3 — fix the matching itself (deferred).** Two candidate approaches, to be decided after
   observing a real ambiguous note:
   - populate `Origin` on Dispatch rows so the existing tie-break goes live; or
   - change selection so candidates sharing a Dispatch ID group prefix (ASHGROVE / TISEO /
     SINACOLA) are treated as **redundancy rather than ambiguity**, with the most specific alias
     winning.

   Note this supersedes the "move aliases onto one record" framing from the previous checkpoint —
   both options above avoid a schema change.

3. **The `Hubbard` row.** `MICHELSDATAHUBBARD_03` (Job = `Hubbard`) is Active with first token
   `HUBBARD`, distinct from `MICHELS`. A Michels ticket whose OCR carries "HUBBARD" yields 2
   candidates for the same job. Has not fired yet.

4. **Rate `?? ""` → `?? null`** in module 24. One character, still not applied.

5. **Broker / Truck / Driver computed in module 24 but never written by module 29.** Unchanged.

6. Carried from earlier logs: quantity plausibility guard in Scenario D; month/rolling-window date
   guard in D (deliberately deferred); Scenario D `onerror: Ignore` on modules 5 and 13; Scenario B
   retry-cap branch; Scenario C `Processing File URL`.

---

## Next step

Wait for a real non-Michels ticket (Statewide, expected Sunday), run E once, and read the
`Dispatch Match Notes` on the resulting Validation Queue record. That single observed note is the
input needed to choose between the two Stage 3 approaches — whether populating `Origin` is
sufficient, or whether group-prefix redundancy handling is the right model.
