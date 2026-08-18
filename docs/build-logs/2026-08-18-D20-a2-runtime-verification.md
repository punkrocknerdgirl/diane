# A2 Runtime Verification — 2026-08-18

Session outcome: `A2 - Get Folder Tickets` went from schema-validated-only to runtime-verified across all four execution paths. Three defects found and fixed. One defect found in Scenario A, not fixed, awaiting decision.

All verification was done against Airtable record state, not Make's success badge.

---

## Scenario under test

| | |
|---|---|
| Name | `A2 - Get Folder Tickets` |
| Scenario ID | `5984004` |
| Team ID | `2196964` |
| Organization ID | `7406940` |
| Zone | `us2.make.com` |
| Scheduling | on-demand |
| Folder | `237340` (Diane 2.0) — moved this session, was `null` |
| State at close | Inactive |

---

## Prerequisite completed

Added select choice `Folder` to two fields via Airtable UI (MCP cannot create select choices):

| Table | Field ID | New choice ID |
|---|---|---|
| Import Runs `tbl8V8VXyLIGtBu9X` | `fldhnN6gDEt9JQOhH` (Source System) | `selaU58EKKo6KO3YG` |
| Tickets `tbloTlWdo1f4hFKXh` | `fldBUCwMAfUzbYOjz` (Source System) | `selAOf8H5T2gGkUwZ` |

Note: editing choices from inside a cell deselects that cell's current value. This briefly blanked `Source System` on `rec91uk54vKXfm0QO` (`MOTIVE_LIVE_SCENARIO_A_20260817B`); restored to `Motive` and verified.

---

## Defects found and fixed

### 1. Wrong Google connection (blocking)

Modules 5, 6, 7 were pointed at connection `8557388` "My Google connection" — account type `google`, `expire: null`, token dead, referenced only by archived Diane 1.x scenarios. Failed with:

```
Couldn't read Google Drive access data ... The connected account had no accessToken field.
```

This passed blueprint validation because the module accepts that account type. It is the clearest example this session of schema-valid but runtime-wrong.

Compounding trap: `8557388`'s metadata email is `ernie@prngbooks.com`, identical to the correct connection, so the Make UI renders it as the right account. Same Google account, different Make connection record, different account type.

**Fix:** new connection created and re-authed — `10510444` "Ernie's Google connection". Modules 5, 6, 7 repointed.

Still worth noting: `10510444` is account type `google` (4 scopes). A/B/C/D all use `8608773` "ernie@prngbooks.com", type `google-restricted` (3 scopes, valid to 2027-02-18). A2 is now the only scenario on `10510444`. If Drive scope errors appear later, aligning A2 to `8608773` is the fix.

### 2. `continueWhenNoRes: true` produced an empty bundle that crashed module 6

On an empty drop folder, module 5 did not stop the route — it emitted one empty bundle. That bundle reached module 27, which searched `{Import Key} = "FOLDER_"` (no ID appended), returned length 0, which **satisfied** module 6's filter (`27.__IMTLENGTH__ = 0`). Module 6 then attempted a copy with `id: ""`:

```
BundleValidationError — Missing value of required parameter 'id'
```

The empty-folder run produced the right outcome (zero records) by erroring, not by logic. The dedupe guard was never reached.

**Fix, both applied:**
- Module 5: `continueWhenNoRes` set to `false`
- Module 6 filter `No Existing Ticket Found` extended to:
  ```
  27.__IMTLENGTH__  Equal to  0
  AND
  5. File ID        Exists
  ```

The filter is the durable protection; the setting change avoids a wasted Airtable search op per empty run.

### 3. Module 31 date serialization — intermittent 422

Module 31 mapped `fldxvij1FtxYmW82s` (Pulled At) directly from `{{32.run_start_time}}`. This succeeded once and failed once, minutes apart, same mapping:

| Run | Value sent | Result |
|---|---|---|
| 23:10:57 | `2026-08-18T23:10:57.764Z` | accepted |
| 23:12 | `August 18, 2026 7:12 PM` | `[422] Invalid request: parameter validation failed` |

Module 32 stores `{{now}}` as a template value, so the variable sometimes arrives as a Date object (Make serializes ISO) and sometimes as a display-formatted string (Airtable rejects). Intermittent, not deterministic.

**Fix (pushed via `scenarios_update` at 23:18:25):**
```
{{formatDate(32.run_start_time; "YYYY-MM-DDTHH:mm:ssZ"; "UTC")}}
```
Verified: next run wrote `2026-08-18T23:18:58.475Z`.

---

## Runtime verification results

| Path | Test | Verified outcome |
|---|---|---|
| Create | 2 images in `00 Ticket Drop` | 2 Ticket records, correct fields, both linked to run |
| Empty folder | re-run, folder empty | no error, zero new records, run closed |
| Dedupe | one original moved back into drop folder | guard held, no third record, no copy, no move |
| Run close-out | date write | ISO accepted, `Pulled At` updated |

Created records:

| Import Key | Ticket Key | Source File ID |
|---|---|---|
| `FOLDER_1LRA9o3vWnBBKGSBJJzlKEesF0uFRzlun` | `INTAKE_FOLDER_1LRA9o3v…` | `1lL4hGXBmvHsnj45Dpb_FLw4awXMQrcAY` |
| `FOLDER_1Pk9c76RfXNOpu3vLjwAn0tYo4USWGKa4` | `INTAKE_FOLDER_1Pk9c76R…` | `1jbYBLblt_xwE20IEvhFNGpu1j5ckA6kh` |

Both: Ticket Status `Intake`, Source System `Folder`, Import Disposition `Live Work`, linked to `rec4Dlebpdwkibaue`.

`Source File ID` differs from the ID embedded in `Import Key` on both records — correct. Import Key carries the original file ID (`5.id`), Source File ID carries the copy (`6.id`). Matches Scenario A's pattern.

Import Run `rec4Dlebpdwkibaue` (`FOLDER_LIVE_TEST_20260818`): `Completed`, `Pulled At` `2026-08-18T23:18:58.475Z`, both tickets linked.

---

## Corrections to the earlier handoff

The 2026-08-18 A2 handoff contained two claims that live data disproved. Both should be struck.

**Work item 1 — destination folder / field mismatch: WITHDRAWN.** A2 is correct as built.
- `fldNgcAqfpEBBq3Od` is `Source File ID`, not some other field. Scenario A writes its uploaded Drive file ID to exactly this field.
- `1Di0ie_rE0m6f_DMvJfePTI_RyyD4Gpb0` is the **intake** folder, not the cleaned-images folder. Scenario A's module 8 uploads raw Motive downloads straight into it; A's stored sample confirms `parents: ["1Di0ie_..."]` on a fresh `.jpg`. Correct any note that describes this folder as "cleaned images."
- Empty `Cleaned File ID` at intake is normal. B fills it.

**Work item 2 — `Pulled At` sort field: VERIFIED, no action.** `Pulled At` = `fldxvij1FtxYmW82s`, confirmed by label in A's module 31 metadata. `flddQcpWCkI12rf6z` is `Pull From`.

Also withdrawn: an in-session claim that the router's route 2 marks a run `Completed` even when route 1 errors. Not what happened — a module error halts the whole execution and route 2 never runs. That path remains untested; do not record it as a known design flaw.

Field *names* are not returned by `get_table_schema` (IDs and types only). They are available in a scenario blueprint's `metadata.expect` / `metadata.restore` when a module has been configured through the UI. That is how both items above were resolved.

---

## Open items

### 1. Scenario A carries the same date bug — decision needed

`A - Get Motive Tickets` (`5631564`) module 31 uses the identical unformatted `{{32.run_start_time}}` mapping. A has 26 executions and 8 recorded errors; some may be this. Not touched this session — A is load-bearing and the fix should be a deliberate call, not a mid-session patch. Same one-line change applies.

### 2. Module 7 `"title": ""` — untested

A UI edit added `"title": ""` to module 7 (`ActionUpdateFile`, Move Original to `_Processed`). Every successful move so far predates that field. An empty title may blank the filename on move. Watch the next real file through `_Processed`; if it lands unnamed, remove the key.

### 3. Connection type divergence

A2 on `10510444` (type `google`); A/B/C/D on `8608773` (type `google-restricted`). Working now. Noted for consistency, not urgent.

---

## Standing constraints (unchanged)

- Airtable record state is the only reliable verification signal. Make reports SUCCESS on silently dropped bundles.
- Scenarios stay Inactive between runs. `scenarios_run` requires Active and is therefore unusable — all triggering is Make UI "Run once."
- `scenarios_update` requires the full blueprint. Pattern used: fetch fresh → patch target fields → strip `metadata.designer.samples` → push. Fetching fresh matters — this session's push had to preserve UI edits made minutes earlier.
- `executions_get-detail` returns status and operation counts only. Per-module input payloads require the Make History UI. Expanding the `record` collection under **Input** in the module error panel is what identified defect 3.
- Org ID `7406940`, Team ID `2196964`. Passing the team ID where the organization ID is expected returns `Insufficient rights, admin permission "organization view" is needed` — a misleading error for a wrong-ID-type problem.

---

## Independent re-verification (Claude Code, post-session)

The three fixes above were re-checked against the **saved blueprint** via
`scenarios_get` on `5984004`, not taken from this report. All three are present:

| Fix | Confirmed in saved blueprint |
|---|---|
| Connection | Modules 5, 6, 7 all carry `"account": 10510444` |
| Empty-bundle guard | Module 5 `"continueWhenNoRes": false`; module 6 filter has a **second** condition `{{5.id}}` / `exist` alongside `{{27.__IMTLENGTH__}} = 0` |
| Date serialization | Module 31 writes `{{formatDate(32.run_start_time; "YYYY-MM-DDTHH:mm:ssZ"; "UTC")}}` |

Scenario state at re-check: `folderId: 237340`, `isActive: false`, `isinvalid: false`,
`scheduling: on-demand`, `lastEdit: 2026-08-18T23:18:25.970Z`. Consistent with the report.

**Open item 1 confirmed real.** `A - Get Motive Tickets` (`5631564`) module 31 still maps
`fldxvij1FtxYmW82s: "{{32.run_start_time}}"` unformatted — byte-identical to A2's
pre-fix state. A's `lastEdit` is `2026-08-17T22:31:45.523Z`, i.e. untouched by this
session. The one-line `formatDate` fix applies unchanged. **Not applied — awaiting
Ernie's decision**, per the standing guardrail against unapproved production Make edits.

**Open item 2 confirmed real.** Module 7's mapper does contain `"title": ""`. It is in
the saved blueprint, so the next move through `_Processed` will exercise it. Worth
noting the asymmetry: module 6 (`ActionCopyFile`) sets `"title": "FOLDER_{{5.id}}"`
deliberately, while module 7 (`ActionUpdateFile`) is a *move* and needs no title at all —
the empty string is more likely a stray UI artifact than an intended value. Removing the
key entirely is the safer correction if a filename comes through blank.

### Note on connection parameter shape

The google-drive v3 modules store the connection as `"account": <id>` in `parameters`,
**not** `"__IMTCONN__": <id>` as the Airtable modules do. Both forms appear in this one
blueprint. Worth knowing before hand-editing a blueprint — writing `__IMTCONN__` on a
Drive v3 module would not repoint it.
