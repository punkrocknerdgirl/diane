# Diane 2.0 Bugs & Known Issues

Running log of bugs, design inefficiencies, and other known issues surfaced during Diane 2.0 build/test sessions — separate from the dated build logs (which capture what happened in a session) and the Terminal & Git Glossary (which is command reference, not project issues). This file tracks the *thing itself* across sessions so it doesn't get lost in a single night's log.

Entries are listed newest first. Each entry: a title, the date it was found, a status, the description, and (if known) the fix/next action. Not every entry is a "bug" in the strict sense — some are flagged design tradeoffs or inefficiencies worth revisiting later; those are marked accordingly rather than forced into bug framing.

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
