# Diane 2.0 Bugs & Known Issues

Running log of bugs, design inefficiencies, and other known issues surfaced during Diane 2.0 build/test sessions — separate from the dated build logs (which capture what happened in a session) and the Terminal & Git Glossary (which is command reference, not project issues). This file tracks the *thing itself* across sessions so it doesn't get lost in a single night's log.

Entries are listed newest first. Each entry: a title, the date it was found, a status, the description, and (if known) the fix/next action. Not every entry is a "bug" in the strict sense — some are flagged design tradeoffs or inefficiencies worth revisiting later; those are marked accordingly rather than forced into bug framing.

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

**Next action:** Revisit once the matcher itself is fixed and validated. Consider restructuring Scenario E so the Active Dispatch list is fetched once and passed to a per-ticket iterator, rather than re-queried inside the per-ticket loop.
