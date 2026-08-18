# Diane 2.0 Checkpoint: A2 date fix simplified, connection divergence closed, workstream wrapped

**Date:** 2026-08-18
**Checkout:** `/Users/erniehathaway/Projects/diane` (origin `punkrocknerdgirl/diane`, branch `main`)
**Scenarios inspected:** `A2 - Get Folder Tickets` (`5984004`), `A - Get Motive Tickets` (`5631564`)
**Scenarios modified by Claude Code:** none
**Status:** A2 workstream closed except one item. Both scenarios Inactive.
**Companion logs:** `2026-08-18-D20-folder-ingest-a2-build.md` (A2 design/build),
`2026-08-18-D20-a2-runtime-verification.md` (runtime pass + all addenda from this session)

## Purpose

Close out the A2 workstream: intake the runtime-verification results, independently confirm
the date fix in both scenarios, resolve a lingering "consistency" item that turned out not to
be one, and put the one durable caveat somewhere it will actually be seen.

## Verified state

Confirmed by direct `scenarios_get` against saved blueprints this session — not from report:

| Scenario | Module 31 `Pulled At` (`fldxvij1FtxYmW82s`) | lastEdit | State |
|---|---|---|---|
| A2 `5984004` | `{{now}}` | `2026-08-18T23:28:56.595Z` | Inactive, `isinvalid: false`, folder `237340` |
| A `5631564` | `{{now}}` | `2026-08-18T23:29:29.123Z` | Inactive, `isinvalid: false` |

- **A's Motive path untouched by the date edit.** Module 1 still
  `https://api.gomotive.com/v2/documents`, `apiKeyKeychain: 164415`,
  `authenticationType: apiKey`. Module 8 still `__IMTCONN__: 8608773`.
- **Module 32 has zero consumers in A.** `run_start_time` appears 4× in A's blueprint, all
  as the bare variable name in the module definition and its metadata; **no**
  `{{32.run_start_time}}` reference remains anywhere. Same in A2 — module 31 was its only
  consumer.
- **A2's three earlier runtime fixes are present in the saved blueprint** (verified in the
  prior segment): modules 5/6/7 on `account: 10510444`; module 5
  `continueWhenNoRes: false`; module 6 filter carries the second condition `{{5.id}}` /
  `exist`.
- **A2's Drive modules declare `account:google`.** Module 5's `metadata.parameters` is
  `{"name": "account", "type": "account:google"}`, read directly from the saved blueprint.
- **Airtable field description written.** Import Runs `Pulled At` (`fldxvij1FtxYmW82s`)
  description updated, action `act6yCC4Z7BpCRfdo`, `success: true`.

### Reported but NOT verified

- **A's date fix is applied but unverified at runtime.** A has not executed since the edit.
  The original 422 was **intermittent** — the same mapping succeeded at 23:10:57 and failed
  at 23:12 — so one clean Motive run will not clear it. Confidence rests on the mechanism
  being removed, not on run count.
- **A2's current mapping is unrun.** A2's clean 23:18:58 run exercised the `formatDate`
  version, not `{{now}}`. The defect is understood and closed; this exact mapping has no
  runtime proof.
- **Module 7's `"title": ""` remains unexercised.** Present in the saved blueprint; every
  successful `_Processed` move predates it.
- The claim that `8608773` will not appear in A2's connection dropdown is a strong inference
  from the differing parameter specs, not an observed UI state.

## What changed this session

Claude Code made exactly two writes, both non-Make:

1. **Airtable — Import Runs `Pulled At` (`fldxvij1FtxYmW82s`) description set.** Records that
   the field is not homogeneous across time: rows before 2026-08-18 carry run-START times,
   rows after carry run-CLOSE times; module 26 sorts on it ascending; do not use it for
   duration or cross-boundary timing comparisons.
2. **Build logs** — addenda appended to `2026-08-18-D20-a2-runtime-verification.md` covering
   the `{{now}}` simplification, the connection-divergence resolution, the module 32 dead-code
   finding, and the closing open-item list.

Ernie's Make edits this session (verified above, not made by Claude Code): module 31 in both
A2 and A changed from the `formatDate(...)` wrapper to a direct `{{now}}`.

### Why `{{now}}` supersedes `formatDate`

The defect was never formatting — it was the variable round-trip. Module 32 stores `{{now}}`
as a *template value*, and the stored variable deserialized inconsistently: sometimes a Date
(serialized ISO, accepted), sometimes a display string (`August 18, 2026 7:12 PM`, rejected
422). `formatDate` coerced whatever emerged. `{{now}}` in the mapper skips variable storage
entirely, eliminating the ambiguity rather than correcting for it.

### Connection-type divergence — RESOLVED, NOT ACTIONABLE

Previously listed as an open consistency item ("align A2 onto `8608773`"). It is not drift
and should not resurface:

| Scenario | Drive modules | Parameter spec | Connection |
|---|---|---|---|
| A2 | v3 `ActionGetFileList` / `ActionCopyFile` / `ActionUpdateFile` | `account:google` | `10510444` (`google`) |
| A / B / C / D | older `uploadAFile` / `getAFile` | `account:google-restricted,google-drive` | `8608773` (`google-restricted`) |

Different module generations, different contracts. Same root cause as the `account` vs
`__IMTCONN__` parameter-key difference: v3 Drive modules and the older ones are not
interchangeable in shape.

## What was NOT changed

- **No Make scenario was modified by Claude Code this session.** Read-only `scenarios_get`
  only.
- **No scenario activated, none run.** MCP `scenarios_run` not called.
- **Module 32 not removed** from either scenario — see guardrail below.
- **Module 7's `"title": ""` not touched** — left to be judged against a real file.
- **A not moved onto `10510444`**; A/B/C/D remain on `8608773`.
- **No Airtable records created, updated, or deleted.** The only Airtable write was a field
  *description*.
- Scenarios B, C, D, E, F untouched and unopened.
- HEIC conversion still not designed or built.

## Guardrails

Standing:

- Diagnose before changing anything.
- Preserve existing architecture and proven behavior unless redesign is explicitly requested.
- Do not change production Make modules or logic without explicit approval.
- **All scenarios stay Inactive.** Never activate; never use MCP `scenarios_run`. Ernie
  triggers via Make UI "Run once."
- **Airtable record state is the only reliable verification.** Make reports SUCCESS on
  silently dropped bundles.
- Do not claim anything was committed, pushed, deployed, tested, or verified unless it
  actually occurred.
- Protect client data and credentials.
- Airtable remains the operational source of truth; do not restore Google Sheets.
- Local checkout and GitHub main stay in sync; logs written locally, then pushed.

Session-specific:

- **Module 32 removal must be a Make UI delete, not an API push.** `scenarios_update`
  reserializes the whole blueprint including the `metadata.expect` / `metadata.restore`
  surface. That exposure is not worth removing a no-op module from a load-bearing scenario.
  Fold the deletion into the next edit either scenario needs anyway.
- **Do not re-open the A2 connection-type item.** Resolved above as a module-generation
  consequence.
- **Schema validation is not runtime validation.** `validate_module_configuration` returning
  `valid: true` says the shape is right, not that it works — the dead-connection defect
  passed validation cleanly.

## Next step

**Watch the next real file through `_Processed`.** Module 7 carries `"title": ""` and has
never been exercised with it. If the file lands with a blank filename, remove the `title`
key entirely rather than setting a value — an `ActionUpdateFile` used purely as a move needs
no title.

That is the only open item in the A2 workstream.

## Still open elsewhere (unchanged, not A2)

- **HEIC.** A2 will ingest a `.heic` and Document AI will reject it downstream. Belongs in
  Scenario B's CloudConvert step with visible errors. Do not retry darkening through
  CloudConvert — source of the `INVALID_OPTION` failure.
- Scenario D `onerror: Ignore` on modules 5, 13, 25 — silent failure, still live.
- Date range guard in D (after module 5, mirroring module 27's pattern).
- Vision OCR cross-check for dates using `Raw OCR Text` (`fld8twN1aSHmConvn`).
- `Final Total (Legacy)` (`fld5IN6BntCd4wDJM`) deletion, pending clasp deploy.
- Scenario F has no working path; `Invoice Batches` is empty.
- Truck aliases are written but inert until a resolve step consumes
  `All Known Aliases` (priority 3).
