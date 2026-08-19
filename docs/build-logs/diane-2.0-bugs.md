# Diane 2.0 Bugs & Known Issues

Running log of bugs, design inefficiencies, and other known issues surfaced during Diane 2.0 build/test sessions — separate from the dated build logs (which capture what happened in a session) and the Terminal & Git Glossary (which is command reference, not project issues). This file tracks the *thing itself* across sessions so it doesn't get lost in a single night's log.

Entries are listed newest first. Each entry: a title, the date it was found, a status, the description, and (if known) the fix/next action. Not every entry is a "bug" in the strict sense — some are flagged design tradeoffs or inefficiencies worth revisiting later; those are marked accordingly rather than forced into bug framing.

---

## Dispatch aliases stored as separate records make matching ambiguous by construction

**Date found:** 2026-08-19
**Status:** Open — interim data fix applied for one job, proper fix needs a schema change
**Where:** Dispatch table `tblnXClSQImZ22vCG`; Scenario E (`5721872`) modules 18 and 24

The Dispatch table holds each alias variant of a job as its **own record**. Scenario E's matcher (module 24) uses `keywordMatches`, which requires only the **first meaningful token** (stemmed) of a dispatch clue to appear in the ticket's OCR text. So every alias sharing a first token matches the same ticket, and the ticket ends up with multiple candidates.

The tie-break (`clueMatches`, strict full-phrase on Origin) then runs — but **Origin is empty on every record in the Dispatch table**, verified directly. It returns false for all candidates, `resolutionStatus` becomes `"ambiguous"`, and the batch key falls back to the Validation ID, which produces **one standalone batch per ticket**.

That is the mechanism behind the four orphaned Review Batches from the 2026-08-10 run. **It is structural, not the one-off OCR misread previously assumed.** Any job with more than one active alias sharing a first meaningful token is ambiguous by construction.

Worked example — the Michels Data Hubbard job had five active aliases; four shared `MICHELS` or `DATA`:

| Alias | First token | Matched our tickets? |
|---|---|---|
| `MICHEL'S DATA HUBBARD` | MICHELS | ✓ |
| `MICHELS DATA` | MICHELS | ✓ |
| `MICHELS DATA HUBBARD` | MICHELS | ✓ |
| `DATA HUBBARD` | DATA | ✓ |
| `HUBBARD` | HUBBARD | ✗ |

**Interim fix applied (data, not code):** four Michels aliases closed (`_01`, `_02`, `_04`, `_05`), leaving `_06` "Michels Data" (`recJIahzUwiSpx0q3`) as the single matcher — its note records that it was created without the apostrophe specifically to match Canfield's OCR rendering. `_03` "HUBBARD" is also still Active but is harmless, since its first token never appears in our OCR.

**This trades recall for precision.** If a future ticket's OCR renders the job as `DATA HUBBARD` without `MICHELS`, it will no longer match and will produce a standalone batch.

**Same latent problem still active for:** Ash Grove (3 aliases — "Ash Grove", "Ash Grove Cement Company", "Ash Grove Co", all first token `ASH`) and Tiseo (2 — "Tiseo Paving", "Tiseo"). Sinacola has 2 aliases ("Mario Sinacola", "Sinacola") but they do **not** share a first token, so that pair is less exposed.

**Proper fix (backlog):** aliases should be multiple values on **one** dispatch record, not separate records — recall without ambiguity. Requires an Airtable schema change plus a change to module 24's JS.

**Also worth deciding:** Origin cannot serve as a tie-break while it is empty on every dispatch record. Either populate it or stop relying on it.

---

## Scenario E writes `""` into the currency `Rate` field and dies mid-run

**Date found:** 2026-08-19
**Status:** Open — not fixed; worked around in data
**Where:** Scenario E (`5721872`), module 24 (JS) → module 29 (Review Batch create), field `fldWH1pIFLrQcRW05`

Module 24's JS ends with:

```js
const resolvedDispatchRate = resolvedDispatch?.dispatchRate ?? "";
```

The `?? ""` default writes an empty string into `fldWH1pIFLrQcRW05`, confirmed by schema to be a **currency** field (precision 2, symbol `$`). Airtable rejects `""` on numeric fields, and E dies at module 29 with:

```
[422] Field "Rate" cannot accept the provided value
```

This is the identical failure shape to the `Parsed Ticket Date` `422` found the same night in Scenario D — see the entry below on empty strings and date fields.

The other `?? ""` defaults in the same block (Job, PO, Work Order, Origin, Destination) all target `singleLineText` fields and are safe. **Rate is the only numeric target.**

**Consequence:** the failure mode is disproportionate to its likelihood. E dies mid-run, no Review Batch is created, and the affected tickets sit in Validation Queue looking perfectly healthy — nothing marks them as stranded.

**Fix (not applied):** change `?? ""` to `?? null` on the Rate line. One character.

**Workaround (current):** ensure every dispatch record carries a real rate before running E. In normal operation dispatches are created with a rate up front, so this only fires on a dispatch missing one.

---

## Scenario E computes Broker, Truck and Driver but never writes them to the Review Batch

**Date found:** 2026-08-19
**Status:** Open — needs a decision, not obviously a bug
**Where:** Scenario E (`5721872`), module 24 (JS) → module 29 (Review Batch create)

Module 24 resolves and returns `resolvedDispatchBrokerRecordId`, `resolvedDispatchTruckRecordId` and `resolvedDispatchDriverRecordId` from the matched dispatch. **Module 29's record mapping references none of them** — it writes Review Batch Key, Job, Rate, PO Number, Work Order, Origin, Destination, Status and the Validation Queue link, and nothing else.

So the Review Batch created on 2026-08-19 carries no Broker, Truck, or Driver link, and no batch ever has. Session notes have described Broker as flowing from the matched dispatch; it does not.

**Decision needed:** either map the three onto the Review Batch record in module 29, or drop the computation from module 24 so the JS stops implying a linkage that doesn't exist.

---

## Open Make editor tab silently clobbers an MCP blueprint push

**Date found:** 2026-08-19
**Status:** Open hazard — no technical fix, procedural workaround in force
**Where:** Any `scenarios_update` push via the Make MCP connector; observed on Scenario D (`5251400`)

An open Make scenario tab holds its own in-memory copy of the blueprint. Running the scenario from that tab writes the stale in-memory version back over anything that was pushed via the API in the meantime — silently, with no conflict warning.

Observed directly: MCP push at `02:04:03`, confirmed landed by an immediate re-fetch; then a "Run once" from an already-open editor tab; `lastEdit` moved to `02:06:18`, the pushed mappings had reverted to their pre-push state, and a `designer.samples` block reappeared. The guard existed for roughly two minutes and was destroyed by the run that was meant to test it. A hard refresh of the tab did not show the pushed value either.

**Workaround (required procedure for every API push to Make):**
1. Close the scenario tab entirely.
2. Push via `scenarios_update`.
3. Re-fetch to confirm it landed.
4. Reopen the scenario and visually confirm the mapping renders correctly.
5. Only then run.

Related: pushing rather than pasting is itself the correct move, because Make's UI token editor mangles pasted IML expressions (the July `get(split(...))` incident, where `; 6)` was stranded outside the `}}`). The API push renders correctly every time.

**Note on scope:** `scenarios_update` is safe on Scenario D specifically because D's blueprint carries no `expect` / `restore` / `interface` metadata. Scenarios A and B carry heavy per-module metadata; UI edits remain the correct route for those.

---

## Airtable rejects `""` on a date field, and `onerror: Ignore` turns that into a silent record drop

**Date found:** 2026-08-19
**Status:** Fixed for the date guard (`null` instead of `emptystring`) — the underlying `onerror: Ignore` hazard remains open
**Where:** Scenario D (`5251400`), module 13 (Parser Outputs create) and module 14 (Validation Queue create)

The first working version of the Scenario D date guard wrote `emptystring` when it rejected a date. Airtable refused it: `[422] Cannot parse date value "" for field Parsed Ticket Date`. A date field wants `null` or a valid date, never an empty string.

Because module 13 carries `onerror: Ignore`, the rejection was swallowed and the **entire bundle was dropped** — taking module 14 with it, since 14 maps `{{13.id}}`. Two tickets produced no records at all and the scenario reported SUCCESS. That is reject-and-block, silently — the exact opposite of the specified reject-and-flag behaviour.

**Fix applied:** use `null`, not `emptystring`. Make then omits the key entirely and the record is created with a blank date. Module 27's quantity mapping already behaves this way when its regex finds nothing, which is what suggested the fix.

**Standing rule:** never map `emptystring` (or a JS `?? ""` default) into an Airtable date, number, or currency field. Use `null` so Make omits the key. The same shape bit again the same night in Scenario E's `Rate` mapping — see that entry above.

**Still open underneath this:** `onerror: Ignore` on Scenario D modules 5 and 13 is now *demonstrated* — not just suspected — to swallow a real `422` and drop records while reporting SUCCESS. Same silent-failure family as Scenario B's retry-cap branch and the Import Runs that close `Completed` having produced zero tickets.

---

## Document AI extracts the wrong quantity value entirely (not a sanitization problem)

**Date found:** 2026-08-19
**Status:** Open — no guard built
**Where:** Document AI `quantity_tons` extraction feeding Scenario D module 27, then `Parsed Quantity` / `Final Quantity`

On the same three-ticket batch as the date guard work, Document AI returned `616.53` for one ticket whose actual net load was `24.66` — that figure is the **running scale total** printed on the ticket, not the net load. Another ticket returned nothing at all.

Module 27's regex sanitizer (`^-?(?<qty>\d+(?:\.\d+)?)`, `continueWhenNoRes: true`) works correctly — it strips unit suffixes and passes a blank through rather than erroring. It cannot help when the wrong number is picked off the page in the first place.

**Possible fix (not applied):** a plausibility-range guard on the same shape as the date guard — a load is realistically 20–30 tons, so anything outside that band is blanked and flagged for manual keying rather than written.

---

## Scenario C `Processing File URL` is never populated

**Date found:** 2026-08-19
**Status:** Open — cosmetic, deliberately not fixed
**Where:** Scenario C, modules 45 and 47 (mapped from `` {{43.`Source File URL`}} ``), module 43 (Airtable search)

Modules 45 and 47 map `Processing File URL` from module 43's `Source File URL`, but module 43's output-fields list never requests that field, so the mapping resolves to nothing and the column stays empty on every run.

Nothing downstream reads the field. Logged so it isn't rediscovered as a mystery later; fixing it means adding `Source File URL` to module 43's field list.

---

## Scenario B cannot report its own cleaning failures (retry-cap branch never fires)

**Date found:** 2026-08-18
**Status:** Open bug — not fixed
**Where:** Scenario B ("B - Clean Ticket Images", Make scenario ID `5097838`), module 30 (Airtable update, filter "Retry cap reached")

Module 30 is the only path by which B writes a `Cleaning Error` and flips a ticket back to `Needs Clean`. Its filter requires **both** `{{17.tasks[].result.files[].url}}` to not exist **and** `{{22.i}}` to equal `5` — i.e. the export URL is still empty after five polling passes.

That condition only describes a job that *ran and stayed empty*. When the CloudConvert job **errors outright**, the flow never reaches module 30 at all, so nothing is written: no `Cleaning Error`, no `Needs Clean`, and Make still shows a green SUCCESS badge. Surfaced on 2026-08-18 when B's first run against A2-produced files returned SUCCESS with **zero Airtable writes** — module 11 had returned 3 bundles, so the search was fine; the whole batch was silently dropped downstream by an `INVALID_FILENAME` on upload.

Same silent-failure family as Scenario D's `onerror: Ignore` and as the Import Runs that close `Completed` having produced zero tickets.

**Consequence:** a green badge on Scenario B is not evidence that anything was cleaned. Airtable record state is the only reliable signal.

**Possible fix (not applied):** add an error handler on the CloudConvert module (or a route that fires when the job returns an error rather than an empty result) that writes `Cleaning Error` and `Needs Clean`, so failures land in Airtable rather than only in Make History.

**Workaround (current):** after every B run, check Tickets for `Clean Status: Cleaned` and a populated `Cleaned File ID` on the expected count. Do not trust the run status.

---

## Document AI corrupts ticket dates at the year — OCR itself is the weak link

**Date found:** 2026-08-18
**Status:** Partially mitigated 2026-08-19 (year guard live in Scenario D) — month misreads still pass
**Corrected 2026-08-19:** the original conclusion below ("images are not the cause", "Document AI corrupts") was overstated. See the correction at the end of this entry.
**Where:** Document AI date extraction feeding `Parsed Ticket Date`; downstream guard belongs in Scenario D

Established this session that the recurring bad-date problem is **not** an image-quality or resolution problem. Google Drive's own OCR reads the date correctly off the exact same files Document AI misparses. For ticket 410959, both the A2-copied source image and the B-produced PDF read `DATE 08/11/2026 09:39`; Document AI parsed it as `2026-06-11`.

The full set of seven bad dates from the retired `20260817B` batch:

| Ticket # | Parsed | Actual (likely) |
|---|---|---|
| 412078 | `2001-06-01` | ? |
| 411142 | `2001-08-11` | 2026-08-11 |
| 412600 | `2001-08-14` | 2026-08-14 |
| 412722 | `2004-08-14` | 2026-08-14 |
| 411828 | `2006-06-12` | 2026-08-12 |
| 411539 | `2020-08-12` | 2026-08-12 |
| 410959 | `2026-06-11` | 2026-08-11 |

Six of seven are **year** corruption — `2001`, `2004`, `2006`, `2020` — always a plausible-looking year, always wrong. Genuine pixel-level degradation would scatter errors across all four digits rather than consistently producing well-formed but incorrect years.

Two prior hypotheses are now closed: the 32%-downscale theory did not survive (the Motive copies were 1320 × 595, well under the 2048 resize cap, so Resize never touched them), and no higher-resolution original exists — the Photos images are ~160 KB because Messages compressed them on the sending device before they ever reached Ernie.

Also visible in the same OCR snippet: `3224.58 tn` / `24.56 tn` — the known `quantity_tons` sanitization problem, same root.

**Fix needed:** a date-range guard in Scenario D (reject any parsed date outside a sane window around the run date) plus a Vision OCR cross-check using the Raw OCR Text already stored on each ticket. Both were already on the backlog; this finding confirms they are the right path.

**Explicitly not the fix:** image darkening or other preprocessing. The B resize bypass applied this session is correct on its own merits but does nothing for dates.

### Correction — 2026-08-19

The conclusion above rested on Google Drive's `contentSnippet` OCR reading `08/11/2026` correctly off ticket 410959. That was one data point, and it did not hold up.

When Scenario C ran **Google Cloud Vision** over the same files at full resolution, Vision misread 2 of 3: `410959` came back `06/11/2026` (month wrong) and `412722` came back `08/14/2006` (year wrong); only `412600` was right. Document AI's `2026-06-11` for 410959 **matches Vision's `06/11/2026` exactly** — Document AI was faithfully parsing what OCR handed it, not corrupting anything on that ticket.

Drive's `contentSnippet` and Cloud Vision are different Google OCR products and they disagree on the same file. One correct read was treated as proof the image was clean; it was really evidence that the date region is marginal enough for two engines to land differently. The observed confusions are `8`→`6` and the `2` in `2026`→`0`.

Two consequences:

- **The Vision OCR cross-check is dead as designed.** It cannot validate Document AI when it shares the same failure mode. Removed from the backlog.
- **Resolution is definitively not the variable.** Document AI run against the full-resolution originals produced byte-identical wrong dates to the compressed Motive copies (`2026-06-11`, `2004-08-14`, and a blank). The Scenario B resize bypass remains correct on its own merits but has no bearing on date accuracy.

Also ruled out: **confidence scores are useless as a guard signal.** The extractor returned `"confidence": { "ticket_date": 0.999998 }` on 410959's wrong date. Any guard keyed on confidence would pass it straight through.

**What was built instead (2026-08-19):** a year-only range guard on Scenario D modules 13 and 14, verified live against three tickets — rejects the value, writes `null`, keeps the record, flags it for manual keying. Month misreads such as `2026-06-11` still pass; widening to a rolling window anchored on the Import Run date is the next step. Full account in `2026-08-19-D20-scenario-d-date-guard.md`.

---

## Scenario A has no idempotency guard against repeated manual runs

**Date found:** 2026-08-17
**Status:** Known gap — no fix applied, human-process risk now documented
**Where:** Scenario A ("Get Motive Tickets", Make scenario ID `5631564`), module 26 (Import Run trigger/search)

Module 26 selects Import Run records on `Run Status = "Ready"` and nothing else — there is no per-execution idempotency key, no claim/lock write, and no check for already-imported `Import Key` values. Every manual "Run once" click against the same still-Ready Import Run record re-pulls the entire window from Motive and re-uploads every attachment to Drive as new files.

Surfaced on 2026-08-17 when Import Run `MOTIVE_LIVE_SCENARIO_A_20260816` (`recao5VDhexjmiEhI`) was executed three times via stop/start clicking in the Make UI (two full runs ~02:29 and ~07:44, one partial ~09:12). Result: 58 Drive files for 33 unique tickets, duplicated Ticket (Intake) records across most lineages, and 10 corrupted Parser Outputs downstream. The whole batch had to be deleted and re-run against a fresh Import Run record. Full account in `2026-08-17-D20-import-run-contamination-and-reset.md`.

This is not a blueprint bug — the scenario does exactly what it's configured to do. It's a missing guardrail against an easy human mistake.

**Possible fix (not applied):** have module 26 flip `Run Status` off `Ready` (e.g. to `Running`) as its first action so a second click finds nothing to claim; or dedupe on `Import Key` before the Drive upload so re-runs are no-ops instead of duplications.

**Workaround (current):** one manual run per Ready Import Run record, full stop. If a run looks stalled, inspect Make History rather than re-clicking. Before advancing a batch past Intake, run the anomaly scan: unique `Import Key` check, creation-timestamp clustering check, and Drive file count vs. expected ticket count.

---

## Ticket numbers are non-sequential and variable-length by design (not a data-quality signal)

**Date found:** 2026-08-17
**Status:** Standing domain knowledge — must not be "fixed"
**Where:** Anywhere ticket numbers are validated or anomaly-scanned — `Ticket Number`, `Parsed Ticket Number`, `Final Ticket Number`; OCR/parser validation, review-form checks, future anomaly-scan logic

Recorded here because it looks like a bug and isn't, and has already come close to being flagged as one during an anomaly review.

- **Gaps between our ticket numbers are normal.** Quarries number tickets sequentially across *every* truck through their scale that day/shift — not per-truck, not per-hauler. With 1–2 of our trucks on a job, other haulers' trucks fill the numbers in between, so large gaps are expected. **Gap size carries no data-quality information.**
- **Digit length varies by quarry and cannot be standardized.** Some quarries issue 4–5 digit numbers (`41236`, `112458`); others issue numbers in the millions (`1000008`, `1052395125`). **No global rule may assume a digit-length range or numeric magnitude** for any ticket-number field.

Any sanity-check or anomaly-flagging logic touching these fields must be broker/quarry-aware, never global.

**Possible long-term home:** the `Ticket Templates` table (`tblAVz20h5VEsaF5u`) already carries per-broker `Recognition Rules` and `Fallback Rules`; per-quarry ticket-number-format expectations could live there too. Not done — optional follow-up.

---

## Review form truck/driver dropdown is hardcoded in Apps Script (not Airtable-driven)

**Date found:** 2026-08-10
**Status:** Known design gap — deferred, low urgency while fleet is stable
**Where:** `apps-script/JavaScript.html`, lines defining `DRIVER_TRUCK_OPTIONS`, `TRUCK_MAP`, `TRUCK_DEFAULT_DRIVER_MAP`, and the keyboard alias map inside `populateDriverTruckOptions_`

The Driver/Truck selector in the review form is statically hardcoded in the client-side JavaScript. Any time a new truck or driver is added to (or removed from) the Airtable Trucks table, the Apps Script file must be manually updated in four places and re-pushed via `clasp push`. This was discovered when Truck 3 (W03 / Wright 03 / Clifton, David) was added to Airtable on 2026-08-10 and the dropdown still showed only Trucks 1 and 2 until a manual code edit was made.

The four places that must be kept in sync with Airtable:
1. `DRIVER_TRUCK_OPTIONS` — the rendered dropdown option list
2. `TRUCK_MAP` — code → display name mapping used in batch/ticket summary views
3. `TRUCK_DEFAULT_DRIVER_MAP` — truck code → default driver code
4. The `aliases` object inside `populateDriverTruckOptions_` — keyboard shortcuts on the dropdown

**Fix needed:** Replace the hardcoded arrays with a dynamic load from Airtable at form startup — the same pattern already used for `BROKER_OPTIONS` (loaded via `getBrokerOptionsFromAirtable()` on page load). A `getTruckOptionsFromAirtable()` server-side function would query the Trucks table for Active records and return code + driver + label; the client would call it at startup and populate the dropdown dynamically, just as brokers are handled. This would eliminate all four hardcoded lists and make truck/driver adds automatic.

**Workaround (current):** Manual edit of `JavaScript.html` + `clasp push` each time a truck or driver changes.

**Next action:** Build `getTruckOptionsFromAirtable()` in `Code.gs` and refactor the client-side dropdown initialization to use it, following the broker options pattern.

---

## Scenario E Dispatch-matching pulls all Active Dispatches per ticket (expensive, not a bug)

**Date found:** 2026-08-09
**Status:** Known inefficiency — deferred, not urgent
**Where:** Scenario E ("Build Review Batches"), module 18 (Airtable search) → modules 20/23 (iterate + aggregate)

Module 18 pulls back every Active Dispatch record (up to 10) for every single ticket run, then modules 20 and 23 iterate and aggregate over all of them per ticket. With ~12 Active Dispatches × 29 tickets in one run, that's real repeated work on every execution — the same Active Dispatch list gets re-fetched and re-processed once per ticket instead of once per run.

This is a design cost, not a functional bug — the matcher still produces correct behavior when it works. Flagged for later optimization: cache the Active Dispatch list once per scenario run instead of re-pulling it per ticket, or reduce how many Active Dispatches exist at once. Not the priority while the matcher inconsistency (see below, once logged) is unresolved.

**Update 2026-08-19:** the matcher inconsistency referenced below is now root-caused — see "Dispatch aliases stored as separate records make matching ambiguous by construction" above. This efficiency item remains deferred.

**Next action:** Revisit once the matcher itself is fixed and validated. Consider restructuring Scenario E so the Active Dispatch list is fetched once and passed to a per-ticket iterator, rather than re-queried inside the per-ticket loop.
