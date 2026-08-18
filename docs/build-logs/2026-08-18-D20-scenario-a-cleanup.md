# 2026-08-18 — D20 — Scenario A Cleanup & `Pulled At` Semantics

**Scope:** Scenario A (`5631564`), Airtable base `appMWvtLU0hMBqjLC`
**Session type:** Cleanup / documentation. No pipeline runs.
**Follows:** `2026-08-18-D20-a2-runtime-verification.md`

---

## 1. Summary

Closed both remaining Scenario A items carried over from the A2 runtime verification
session. Scenario A now has no dead modules, and the `Pulled At` field carries an
in-Airtable description recording the semantic change introduced last night.

One item from the prior session's open list was closed as **resolved-not-actionable**
rather than fixed — see §4.

---

## 2. Scenario A — module 31 date mapping (already applied)

The prior session flagged Scenario A's module 31 as carrying the same unformatted date
mapping that broke A2:

```
fldxvij1FtxYmW82s: {{32.run_start_time}}
```

A live pull this session showed the mapping had **already been changed** in the Make UI
at `2026-08-18T23:29:29Z`, at the end of the previous session:

```
fldxvij1FtxYmW82s: {{now}}
```

This is a different fix than A2 received (A2 uses `formatDate(32.run_start_time; ...)`),
and a cleaner one — `{{now}}` resolves to a native Make date, so there is no
string-serialization step for Airtable to reject.

**Status: applied, UNVERIFIED.** Scenario A has 26 runs and 8 errors on record, and this
mapping has not executed once since the change. It stays unverified until A's next real run.

---

## 3. Scenario A — module 32 removed

Module 32 was a `util:SetVariable2` setting `run_start_time` = `{{now}}`, sitting between
module 26 (Search Import Runs) and module 33 (Router).

When module 31 switched to `{{now}}` (§2), module 32 lost its only consumer. A full
blueprint scan confirmed `run_start_time` appeared nowhere except module 32's own
definition and the stale `designer.samples` cache — no mapper referenced it.

Deleted via the Make UI (not `scenarios_update`), per the standing rule that Scenario A's
blueprint carries heavy per-module `metadata.expect` / `restore` / `interface` blocks that
a wholesale reserialization would put at risk.

**Verified against the saved blueprint**, not the canvas:

| Check | Result |
|---|---|
| Module 32 in `flow` | absent |
| `util` in `usedPackages` | dropped |
| `designer.samples["32"]` | cleared |
| `designer.orphans` | `[]` |
| `isinvalid` | `false` |
| Flow shape | 26 → 33, both routes intact |

`lastEdit` after save: `2026-08-18T23:47:01.416Z`.

---

## 4. Closed as resolved-not-actionable: A2 connection alignment

The prior session left open whether to align A2's Google connection (`10510444`, type
`google`) onto `8608773` (type `google-restricted`) to match A/B/C/D.

**This is not drift and should not be corrected.** A2's Drive modules are v3 `Action*`
types (`ActionGetFileList`, `ActionCopyFile`, `ActionUpdateFile`) whose parameter spec is
`account:google`. `8608773` is `google-restricted` and almost certainly will not appear in
A2's connection dropdown at all. A/B/C/D use the older `uploadAFile` / `getAFile` modules,
whose spec is `account:google-restricted,google-drive` — a different contract entirely.

Same root cause as the `account` vs `__IMTCONN__` catch: two module generations coexisting,
with different connection contracts. Recorded here so it does not resurface as a cleanup
item in a later session.

---

## 5. `Pulled At` — semantic boundary documented in Airtable

`Pulled At` (`fldxvij1FtxYmW82s`, Import Runs `tbl8V8VXyLIGtBu9X`, `dateTime`, ISO / 24h /
America/Chicago) changed meaning as a side effect of §2:

- **Before 2026-08-18** — run **start** time, captured by module 32 at the top of the flow.
- **From 2026-08-18** — run **close** time, `{{now}}` evaluated in the close-out route.

Rows on either side of that boundary are not homogeneous. This matters beyond trivia
because **module 26 sorts Import Runs by this field ascending** — Scenario A's own trigger
reads a field whose meaning is not uniform across its rows. Inert under the standing
one-Ready-run-at-a-time pattern; not inert if anything downstream ever reasons about run
duration or cross-boundary ordering.

Written to the field's Airtable description (rather than only to a build log) since that is
where someone would actually look. Airtable `actionId`: `acttf3jPGxsO2R6gG`.

---

## 6. Open watch items

Neither is work. Both are things to observe on the next real run.

1. **A2 module 7 `"title": ""`** — a stray UI artifact on a *move* operation, which needs no
   title. May blank the filename. Watch the next real file that moves to `_Processed`. If it
   comes out unnamed, **delete the key** rather than set it to a value.
2. **Scenario A module 31 `{{now}}`** — see §2. Unverified until A's next real run.

---

## 7. Method notes

- Make's API returns the **saved** blueprint only. An editor draft is invisible to
  `scenarios_get`; a canvas that looks right proves nothing until Save is pressed and the
  blueprint re-pulled. Both checks were done here in that order.
- Scenario A remains **Inactive**, per standing pattern.

---

## 8. Independent verification (Claude Code) — §3 confirmed, §2 contains a stale claim

Re-pulled both saved blueprints via `scenarios_get` rather than accepting the report.

### §3 module 32 removal — CONFIRMED, all six checks reproduce

Scenario A (`5631564`), `lastEdit: 2026-08-18T23:47:01.416Z`:

| Check | Verified |
|---|---|
| Module 32 in `flow` | absent — all module ids now `[1, 7, 8, 15, 26, 27, 30, 31, 33]` |
| Top-level flow | `[26, 33]` — module 32 no longer between them |
| `util` in `usedPackages` | dropped |
| `designer.samples` | keys `['1','15','26','27','30','31','7','8']` — no `'32'` |
| `designer.orphans` | `[]` |
| `isinvalid` / `isActive` | `false` / `false` |

Additionally: `run_start_time` now appears **0 times** anywhere in A's blueprint, and
module 31 reads `{"fldxccVE9y8Ofa80v": "Completed", "fldxvij1FtxYmW82s": "{{now}}"}`.
Clean removal, no residue.

### §2 — CORRECTION: A2 does not use `formatDate`

§2 states A2 "uses `formatDate(32.run_start_time; ...)`" and frames `{{now}}` as "a
different fix than A2 received." **That is stale.** Verified in A2's saved blueprint:

```
A2 (5984004) module 31 → fldxvij1FtxYmW82s: "{{now}}"   lastEdit 2026-08-18T23:28:56.595Z
A  (5631564) module 31 → fldxvij1FtxYmW82s: "{{now}}"   lastEdit 2026-08-18T23:29:29.123Z
```

A2 carried `formatDate` for roughly ten minutes (pushed 23:18:25, one clean run at
23:18:58) and was simplified to `{{now}}` at 23:28:56 — **before** A's edit at 23:29:29.
Both scenarios now use the identical mapping. There is no divergence to reconcile.

§2's reasoning about *why* `{{now}}` is cleaner is correct and worth keeping; only the
claim about A2's current state is wrong.

### NEW open item: A2 still carries module 32

§1 says "Scenario A now has no dead modules." True for A. **A2 was not cleaned.**
Confirmed present in A2's saved blueprint:

- Module 32 `util:SetVariable2` still in `flow`, still setting `run_start_time` = `{{now}}`
- `util` still in `usedPackages`
- `designer.samples["32"]` still cached with `run_start_time: 2026-08-18T23:18:58.475Z`

It is dead there for the same reason it was dead in A — module 31 was its only consumer
and now reads `{{now}}` directly. The §6 watch list does not mention it.

**This one may be removed via `scenarios_update`, unlike A's.** The UI-delete constraint
in §3 exists because A's blueprint carries heavy per-module `metadata.expect` / `restore` /
`interface` blocks. A2 was authored through the API and its metadata surface is far
lighter — most modules carry only a `designer` block. The risk calculus that made a UI
delete mandatory for A does not transfer automatically to A2. Either route is defensible;
UI remains the lower-risk default.

### §5 `Pulled At` description — written twice

Two writes landed on `fldxvij1FtxYmW82s` this evening: Claude Code's
(`act6yCC4Z7BpCRfdo`) and this session's (`acttf3jPGxsO2R6gG`). The later write is
authoritative. Both record the same substance — the pre/post-2026-08-18 start-vs-close
boundary, module 26's ascending sort on the field, and the warning against duration or
cross-boundary comparisons.

Not re-read to confirm final wording: the Airtable MCP's `get_table_schema` returns field
IDs, types, and config but **not** descriptions, and `list_tables_for_base` (which does)
returns the entire base schema. Content equivalence is inferred from both write payloads,
not from reading the live value.

### Method note confirmed

§7's point held in practice: `scenarios_get` returns the saved blueprint only. Every check
above was made against a fresh pull after save, never against a reported canvas state.
