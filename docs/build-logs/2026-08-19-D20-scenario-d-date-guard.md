# Diane 2.0 Checkpoint: Scenario D Date Guard, OCR Findings, MCP Push Conflict

**Date:** 2026-08-19 (overnight continuation of the 2026-08-18 sessions)
**Repo / checkout:** `/Users/erniehathaway/Projects/diane` → `punkrocknerdgirl/diane`, branch `main`
**Scope:** Scenario D `5251400` ("D - Document AI Extractor"); Airtable base `appMWvtLU0hMBqjLC`
**Follows:** `2026-08-18-D20-a2-b-verification-motive-retired.md`

---

## Purpose

Build and live-verify a date-range guard in Scenario D so implausible OCR dates are blanked
and flagged rather than written or silently dropped. Four findings came out of the build that
matter more than the guard itself — one of them **corrects the central conclusion of the
previous checkpoint**, and one is a new standing rule for how MCP pushes interact with an open
Make editor tab.

---

## Verified state

Re-checked directly during this checkpoint — Scenario D's saved blueprint re-pulled via
`scenarios_get`, Airtable read via the MCP — not accepted from the session report.

### Scenario D (`5251400`) — guard confirmed live in the saved blueprint

`lastEdit: 2026-08-19T02:21:14.729Z`, `isActive: false`, `isPaused: false`, `isinvalid: false`.

Both target mappings carry the guard verbatim, in the `null` form:

```
{{if(substring(5.data.data.fields.ticket_date; 6; 10) = formatDate(now; "YYYY"); 5.data.data.fields.ticket_date; null)}}
```

| Module | Table | Field | Field ID | Guard present |
|---|---|---|---|---|
| 13 | Parser Outputs `tblvgGjGiSJCNid36` | Parsed Ticket Date | `fldWzuawVkbfFtEH2` | ✓ |
| 14 | Validation Queue `tblbiwkOS9LDi5yaV` | Final Ticket Date | `fld1uUmHyfsOh7OSO` | ✓ |

No `designer.samples` block is present on either module in the saved blueprint — i.e. the
API-pushed version is what is stored, not a stale editor copy.

Also re-confirmed while reading the blueprint:

- Module 5 (HTTP → Cloud Run extractor) and module 13 both carry `builtin:Ignore` error
  handlers (`onerror` ids 26 and 25). This is the swallow path described in §5 below.
- Module 27 (`regexp:Parser`, "Sanitize Parsed Quantity") uses pattern
  `^-?(?<qty>\d+(?:\.\d+)?)` with `continueWhenNoRes: true`, which is why a missing quantity
  produces a blank rather than an error.
- Scenario D's blueprint carries no `expect` / `restore` / `interface` metadata, which is what
  makes `scenarios_update` safe on D specifically.

### Airtable — live run results confirmed

**Parser Outputs `tblvgGjGiSJCNid36`: exactly 3 records.**

| Ticket # | Parsed Ticket Date | Parsed Quantity | Status |
|---|---|---|---|
| 410959 | `2026-06-11` | `24.56` | Needs Review |
| 412722 | *(blank)* | *(blank)* | Needs Review |
| 412600 | *(blank)* | *(blank)* | Needs Review |

**Validation Queue `tblbiwkOS9LDi5yaV`: exactly 3 records**, one per ticket, all
`Pending Review`, dates and quantities matching the table above.

Nothing was dropped: three tickets in, three Parser Outputs, three Validation Queue rows.
That is the specified behaviour — reject the bad value, keep the record, flag for manual keying.

### Correction to the session report

The session report's §9 quantity table lists `616.53` as the extracted value for ticket 412722.
**In the saved records, 412722's quantity is blank, not `616.53`.** The `616.53` reading came
from an earlier run in the same session; the surviving record does not carry it. The underlying
point stands — quantity extraction is worse than the dates — but the specific figure is not
present in the current data.

### Reported but NOT independently verified this checkpoint

- The per-module error text `[422] Cannot parse date value ""`. Visible only in Make's History
  UI; `executions_get-detail` does not expose it, and neither does anything available here.
- The MCP-push-clobbered-by-open-tab sequence (§4). Observed live in-session via `lastEdit`
  timestamps; the evidence is gone now that the correct version is stored.
- The Cloud Vision reads in §2 and the full-resolution Document AI reads in §3 — read
  in-session from Scenario C output, not re-fetched here.
- The extractor's per-field confidence figure of `0.999998` on ticket 410959's wrong date.

---

## What changed this session

1. **Date range guard added to Scenario D**, pushed via `scenarios_update` (not pasted through
   the Make UI), applied identically to module 13 → `Parsed Ticket Date` and module 14 →
   `Final Ticket Date`. Rejects any `ticket_date` whose year does not match the current year and
   writes `null` in its place.
2. **`emptystring` → `null` fix.** The first working version wrote `emptystring`, which Airtable
   rejects on a date field with `[422] Cannot parse date value ""`. Because module 13 carries
   `onerror: Ignore`, that rejection was swallowed and the **entire bundle was dropped**, taking
   module 14 with it — two tickets produced no records at all while the scenario reported
   SUCCESS. With `null`, Make omits the key and the record is created with a blank date. (Module
   27's quantity mapping already behaves this way; that is what suggested the fix.)
3. **Backlog item removed: the Vision OCR cross-check is dead as designed** — see §2 below.

## What was NOT changed

- **No Make module, connection, or scheduling change outside the two guard mappings.** Scenario
  D remains `isActive: false` and unscheduled, as do all scenarios.
- **`onerror: Ignore` on modules 5 and 13 was left in place.** It is now demonstrated to swallow
  a real `422`; removing it is a separate, approved change, not a drive-by.
- **Module 27's quantity sanitizer was not touched.** It works correctly; the problem is upstream.
- **No image preprocessing work.** Ruled out — see §2 and §3.
- **Scenario C's unpopulated `Processing File URL` was left alone** — cosmetic, nothing
  downstream reads it.
- No Airtable schema, field, or view changes. No Apps Script changes. No deployments.
- `docs/build-logs/terminal-and-git-glossary.md` was not modified — every command run this
  checkpoint (`pwd`, `git rev-parse --show-toplevel`, `git status --short --branch`,
  `git remote -v`, `git fetch origin main`, `git rev-list --left-right --count origin/main...HEAD`,
  `python3 - <<'PY'`) was already present.
- `docs/build-logs/build-log.md` was not touched.
- The pre-existing modified/untracked files present at session start (`.claude/commands/`,
  `diane-migration-backup-2026-07-26/`, `docs/Apps Script/`, `local-preview/`, `scripts/`,
  `skills/`, `.vscode/`, the moved `2026-07-05` runbook) were left untouched and are not staged
  by this checkpoint.

---

## Findings

### 1. Confidence scores are useless as a guard signal

The extractor returns per-field confidence. Ticket 410959 came back with `"ticket_date":
"06/11/2026"` at `"confidence": { "ticket_date": 0.999998 }` — 99.9998% confidence on a date
known to be wrong. Any guard keyed on confidence would pass it straight through. That approach
is ruled out entirely.

### 2. CORRECTION — the previous checkpoint's OCR conclusion was overstated

The prior log concluded the date corruption was Document AI's fault and the images were fine,
on the strength of Google Drive's `contentSnippet` OCR reading `08/11/2026` correctly off
ticket 410959. When Scenario C ran Google Cloud Vision over the same files:

| Ticket | Vision read | Correct? |
|---|---|---|
| 412600 | `08/14/2026 11:03` | ✓ |
| 410959 | `06/11/2026 09:39` | ✗ month |
| 412722 | `08/14/2006 09:21` | ✗ year |

Vision misreads 2 of 3 at full resolution. Document AI's `2026-06-11` for 410959 **matches
Vision's `06/11/2026` exactly** — Document AI was faithfully parsing what OCR handed it.

Drive's `contentSnippet` and Cloud Vision are different Google OCR products and they disagree on
the same file. One correct read was treated as proof the image was clean; it was really evidence
that the date region is marginal enough for two engines to land differently.

**Revised conclusion:** the date field on these thermal-printed tickets is genuinely hard to OCR.
`8`→`6` and the `2` in `2026`→`0` are the observed confusions. Not a parser bug, not fixable by
improving the image pipeline.

**Consequence:** the planned Vision OCR cross-check **cannot** validate Document AI when it
shares the same failure mode. Removed from the backlog.

### 3. Resolution hypothesis definitively closed

Document AI run against the full-resolution images produced byte-identical wrong dates to the
compressed Motive copies:

| Ticket | Motive image (1320×595) | Full-res image |
|---|---|---|
| 410959 | `2026-06-11` | `2026-06-11` |
| 412722 | `2004-08-14` | `2004-08-14` |
| 412600 | `2001-08-14` | *(blank)* |

Resolution is not the variable. The Scenario B resize bypass remains correct on its own merits
but has no bearing on date accuracy.

### 4. `ticket_date` is a `MM/DD/YYYY` string, not ISO

The extractor returns `"fields": { "ticket_date": "06/11/2026", ... }` — a string in
`MM/DD/YYYY`, so the year lives at offset 6–10. An earlier attempt used `substring(...; 0; 4)`
on an ISO assumption; that would have returned `"06/1"`, never matched, and **blanked every
date including the good ones.** It was never executed, which is the only reason it didn't
produce a misleading clean-looking result.

### 5. New operational rule — an open Make editor tab clobbers an MCP push

**An open Make scenario tab holds its own in-memory blueprint. Running from that tab writes the
stale version back over anything pushed via the API in the meantime.**

Observed directly: MCP push at `02:04:03`, verified landed by re-fetch → run once from an
already-open editor tab → `lastEdit` becomes `02:06:18`, mappings reverted to pre-push state,
`designer.samples` reappears. The guard existed for ~2 minutes and was silently overwritten by
the run itself. A hard refresh of the tab did not show the pushed value either.

**Required procedure for API pushes to Make:**

1. Close the scenario tab entirely
2. Push via `scenarios_update`
3. Re-fetch to confirm it landed
4. Reopen the scenario and visually confirm the mapping renders correctly
5. Only then run

This is also the reason to push rather than paste: Make's UI token editor mangles pasted IML
expressions (the July `get(split(...))` incident, where `; 6)` was stranded outside the `}}`).
The API push renders correctly every time — confirmed visually this session.

---

## Guardrails

Standing Diane guardrails, unchanged:

- Diagnose before changing anything.
- Preserve existing architecture and proven behaviour unless redesign is explicitly requested.
- Do not change production Make modules or logic without explicit approval.
- Verified and reported-but-unverified are different categories and this log distinguishes them.
- Never expose API keys, PATs, tokens, or secrets in chat, logs, commits, or commands.
- Airtable remains the operational source of truth. Google Sheets is not coming back.
- Local checkout and GitHub main stay in sync; build logs are written locally, then pushed.
- All Make scenarios stay unscheduled and inactive; run once only, manually.

Session-specific, now standing:

- **Close the Make scenario tab before any `scenarios_update` push**, then re-fetch, reopen,
  visually confirm, and only then run. See finding 5.
- **`scenarios_update` is safe on Scenario D specifically** because D's blueprint carries no
  `expect` / `restore` / `interface` metadata. Scenarios A and B carry heavy per-module metadata;
  UI edits remain correct for those.
- **Never write `emptystring` to an Airtable date field.** Use `null` so Make omits the key.
- **A green SUCCESS badge in Make is not evidence anything was written.** Airtable record state
  is the only reliable verification signal — Make reported SUCCESS on runs that wrote nothing,
  twice this session.
- **Per-module error text is visible only in Make's History UI.** `executions_get-detail` does
  not expose it, and neither does Claude Code. This class of diagnosis requires a human reading
  History.

---

## Still open

1. **Month misreads pass the guard.** `2026-06-11` has a valid year and is wrong by two months.
   Planned approach: widen to a rolling window (~60 days back, ~7 forward) keyed on proximity to
   the Import Run rather than year-only. Catches all seven known-bad dates including the month
   case. Tradeoff: rejects genuine backfill older than the window.
2. **Quantity extraction is worse than the dates.** Document AI has grabbed the running scale
   total instead of the net load, and has returned nothing at all. Module 27's regex sanitizer
   works correctly but cannot help when the wrong value is extracted upstream. A plausibility
   range guard (a load is realistically 20–30 tons) would catch it — same shape as the date guard.
3. **Scenario D `onerror: Ignore` on modules 5 and 13** — now demonstrated live to swallow a real
   `422` and drop records while reporting SUCCESS. Previously suspected; now confirmed with an
   error message.
4. **Scenario B retry-cap branch does not fire** (carried from the previous log) — same
   silent-failure family.
5. **Scenario C `Processing File URL` is never populated.** Modules 45 and 47 map it from
   ``{{43.`Source File URL`}}``, but module 43's output-fields list doesn't request that field.
   Cosmetic; nothing downstream reads it.

---

## Next step

Widen the Scenario D guard from year-only to a rolling window anchored on the Import Run date
(~60 days back, ~7 days forward), applied to the same two mappings. Push it with the tab closed,
re-fetch to confirm, then re-run against the same three tickets and check that 410959's
`2026-06-11` is now rejected and blanked while a correctly-read current date still passes.
