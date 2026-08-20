# Diane 2.0 Checkpoint: Motive Backfill Unblocked + Image Darkening Pass

**Date:** 2026-08-20
**Repo / checkout:** `/Users/erniehathaway/Projects/diane` → `punkrocknerdgirl/diane`, branch `main`
**Scope:** A `5631564`, B `5097838`, D `5251400`, F `5908565`; base `appMWvtLU0hMBqjLC`,
Import Runs `tbl8V8VXyLIGtBu9X`
**Follows:** `2026-08-19-D20-first-end-to-end-invoice-run.md`

> **Sourcing note.** This log is written from the session checkpoint notes. Blueprints and Airtable
> were **not** re-pulled while writing it, so everything below is "verified in session" rather than
> "re-verified at checkpoint time." The distinction matters for the June backfill counts and the
> `lastEdit` timestamps, which are quoted as recorded.

---

## Headline

**The Motive backfill is unblocked.** Every pre-August Motive document is **archived**, and
`/v2/documents` omits archived docs unless `status=archived` is passed. Scenario A never sent that
parameter, so every historical pull came back empty and was misread as "there is nothing there."

With the parameter wired through, the June window returned **149 Ticket records** — Airtable count
matching Make's counter exactly, no silent drops.

Alongside that: Scenario D's two remaining `onerror: Ignore` handlers are gone, and Scenario B now
has a real darkening pass in front of the OCR conversion.

| Scenario | Change | `lastEdit` |
|---|---|---|
| D — Document AI Extractor (`5251400`) | removed `onerror: Ignore` from modules 5 and 13 | `2026-08-20T15:43:07Z` |
| A — Get Motive Tickets (`5631564`) | archived-status params, interface cache, `toString()` fixes | `2026-08-20T16:16:49Z` |
| B — Clean Ticket Images (`5097838`) | new ImageMagick "Darken" task before Convert | `2026-08-20T17:15:28Z` |

---

## What changed this session

### D — Document AI Extractor (`5251400`)

- **Removed `onerror: [builtin:Ignore]` from module 5** (the extractor HTTP call) **and module 13**
  (Create Parser Output). Failures now halt the run and surface in History instead of being
  swallowed while the scenario reports SUCCESS.
- Verified by inspection: `usedPackages` no longer contains `"builtin"`.
- **`continueWhenNoRes: true` on module 27 was left in place deliberately.** An unreadable quantity
  should land in the Validation Queue as Pending Review, not halt the batch. That is a different
  failure mode from a `422` and wants different handling.

**Correction to earlier notes:** module 27 "Sanitize Parsed Quantity" — regex
`^-?(?<qty>\d+(?:\.\d+)?)` with `continueWhenNoRes: true` — **already existed**. The `quantity_tons`
sanitizer backlog item was closed in a prior session; the notes carrying it as open were stale.
(The *plausibility-bound* item is separate and still open — see findings.)

### A — Get Motive Tickets (`5631564`)

- **Module 1 query params** are now:
  `created_after={{26.Pull From}}`, `created_before={{26.Pull To}}`, `status={{26.Motive Status}}`,
  `document_form_id=5`.
- **Module 26 `metadata.interface` extended** with `Pull To` and `Motive Status`. This is the part
  worth remembering: **the cached Airtable field list is stored inside the blueprint**, which is why
  refreshing the module in the UI never surfaced the two new fields.
- **Module 30 (edited in the UI by Ernie):** `Motive Document ID` and `Motive Ref No` are now
  wrapped in `toString()`. Both target `singleLineText` with `typecast: false`, and raw numeric
  values were 422-ing. **Latent bug** — it only fires when `ref_no` is non-null.
- Stripped `metadata.designer.samples` and the `expect`/`interface` blocks on modules 27/30/31.
  Mappings were re-checked in the UI afterwards and are intact.

### B — Clean Ticket Images (`5097838`)

- **New "Darken" task inserted into module 8**, between Upload and Convert:
  `operation=command`, `engine=imagemagick`, `command=convert`, arguments:

  ```
  /input/Upload/{{46.Name}}.jpg -auto-orient -colorspace Gray -normalize
    -background white -deskew 40% +repage -brightness-contrast -12x30
    -unsharp 0x1+1+0.05 /output/out.jpg
  ```

- **Convert task input changed** from `["Upload"]` to `["Darken"]`.
- **The fix vs. the earlier `INVALID_OPTION` failure:** CloudConvert command tasks require input at
  `/input/{taskName}/` and output written to `/output/`. Ref:
  <https://cloudconvert.com/docs/operations/execute-commands>

> ### MUST DO BEFORE THE BATCH RUN
> **Module 11 `maxRecords` is temporarily set to `1`** for visual testing of the darken pass.
> **Restore it to `100` before the batch run.**

### Airtable schema — Import Runs (`tbl8V8VXyLIGtBu9X`)

| Field | ID | Type |
|---|---|---|
| `Pull To` | `fldc1zo5JhsxFwkZu` | dateTime |
| `Motive Status` | `fld1gupPfyK25G50h` | singleSelect — one option, `archived` |

**Note:** API-created fields are hidden by default in existing views. They exist even when the grid
does not show them.

---

## Verified state — June backfill

Import Run **`MOTIVE_BACKFILL_202606`** (`recBW8sAtMZQBPMsM`), Completed `16:52:48Z`.

| | |
|---|---|
| Pull From | 2026-05-29 |
| Pull To | 2026-07-03 |
| Motive Status | `archived` |
| Result | **149 Ticket records** |
| Ticket Status | `Intake` on all 149 |
| Source System | `Motive` on all 149 |

**The Airtable record count matches Make's counter exactly** — no silent drops. This is the check
that was skipped on earlier runs and is why the empty results were believed.

---

## Findings

### 1. `status=archived` is a binary switch, not an include-flag (root cause)

All pre-August Motive documents are archived. `/v2/documents` **omits** archived documents unless
`status=archived` is passed, and per the Motive docs the parameter is binary — it selects archived
documents *instead of* live ones, it does not add them to the live set.

Consequences, both of which are now standing operating rules:

- **Backfill runs must set `Motive Status = archived`.**
- **Live (non-archived) runs must leave `Motive Status` blank.**

**UNVERIFIED:** whether sending an *empty* `status=` parameter errors, or is treated as absent.
Scenario A maps the field straight through, so a blank Import Run field produces `status=`. **Test
this before Sunday** — it is the difference between the live path working and the live path 400-ing.

### 2. The May backfill result on record is invalid

The earlier "May is empty" conclusion came from a run made **without** `status=archived` and must be
discarded. Old PD 1.1 holds roughly **1,567 May date strings**, so May is emphatically not empty.

**Re-run with:** Pull From `2026-04-28`, Pull To `2026-06-03`, Motive Status `archived`.

### 3. The June backfill makes Scenario F's missing broker filter urgent

Carried from the previous checkpoint as open item 1, now with a live trigger: **the June backfill
contains Canfield tickets.** Scenario F module 1 still triggers on *any* Invoice Batch with
`Batch Status = "Ready for Invoice"` and builds it against the hardcoded HSG template. There is no
broker condition.

**The broker filter must be added before F is cloned per broker, and before any non-HSG batch is
marked Ready for Invoice.**

### 4. `-deskew` cannot fix perspective — new tooling needed

ImageMagick's `-deskew` corrects **rotation only**. It cannot correct **perspective** — a ticket
photographed at an angle, far edge narrower than near. Driver dashboard photos have the perspective
problem routinely, and **no step in the Make pipeline can fix it.** This is the new backlog item
recorded in the bugs log (see below).

---

## What was NOT changed

- **Scenario F** — the broker filter was **not** added. Still the top-ranked open item.
- **The May backfill was not run.**
- **The VQ → Tickets write-back** — still missing, still unowned. The Apps Script writes Validation
  Queue correctly (all 32 August records Approved with Final Qty + Rate); Tickets does not mirror.
  Retroactive: one sweep fixes all accumulated records.
- **Module 27's `continueWhenNoRes: true`** — deliberately left as-is (see above).
- **Module 11's `maxRecords`** — still `1`. Must be restored.
- **`onerror: Ignore` on Scenario D module 25** — modules 5 and 13 were cleared this session;
  module 25 was not part of this change.
- No duplicate-guard layers built. No Scenario G. No deployments.

---

## Reported but NOT independently verified

- All three `lastEdit` timestamps and the `usedPackages` check — recorded in session, not re-pulled
  while writing this log.
- The 149-record June count — verified in session against Make's counter; not re-read here.
- The ~1,567 May date strings in PD 1.1.
- Whether an empty `status=` parameter errors (explicitly untested — see finding 1).
- That the darken pass actually improves OCR yield. Module 11 is capped at 1 record for *visual*
  inspection; no OCR-accuracy comparison has been run.

---

## Guardrails

Standing Diane guardrails, unchanged: diagnose before changing anything; preserve existing
architecture and proven behaviour unless redesign is explicitly requested; no production Make module
or logic change without explicit approval; verified and reported-but-unverified stay distinct; never
expose keys, PATs, or tokens; Airtable is the operational source of truth; local checkout and GitHub
main stay in sync; **all scenarios stay inactive and unscheduled, run once only and manually.**

New, now standing:

- **A Make module's Airtable field list is cached inside the blueprint.** Adding a field in Airtable
  and refreshing the module in the UI does not necessarily surface it — `metadata.interface` may
  have to be extended in the blueprint directly.
- **Wrap numerics in `toString()` when the Airtable target is `singleLineText` and
  `typecast: false`.** Airtable 422s on a raw number. Same family as the `""`-into-a-numeric-field
  rule, from the other direction.
- **CloudConvert command tasks read from `/input/{taskName}/` and write to `/output/`.** Anything
  else is `INVALID_OPTION`.
- **A "nothing found" API result is a hypothesis, not a fact,** until the query parameters have been
  checked against the API's own semantics. Earlier sessions treated empty Motive pulls as an absence
  of data; the data was there the whole time behind one parameter.
- **Restore any test-scoped limit (`maxRecords`, filters, date windows) in the same session it was
  set,** or it silently caps the next real run.
- Carried forward: never map `?? ""` or `emptystring` into an Airtable numeric, currency, or date
  field; branch before filtering in Make; check the option list before writing to a locked select;
  close the Make scenario tab before any `scenarios_update` push; a module can show empty in the
  editor while the blueprint holds a value.

---

## Open items, ranked

1. **Restore Scenario B module 11 `maxRecords` to 100.** Blocks the batch run; one field.
2. **Scenario F broker filter** — the only open item that can silently produce a wrong invoice to a
   real customer. Now has a live trigger: June backfill contains Canfield tickets.
3. **Test whether an empty `status=` parameter errors** — gates the live (non-archived) Motive path.
   Before Sunday.
4. **Run the May backfill** — Pull From 4/28, Pull To 6/3, Motive Status `archived`.
5. **VQ → Tickets write-back** — unowned; retroactive sweep fixes all accumulated records.
6. **`quantity_tons` plausibility bound.** Module 27's regex takes the **first** number in the
   string. Observed on Canfield ticket `395682`: the OCR text contains `1905.78 tn` adjacent to the
   true value `24.11`. The sanitizer returns `1905.78`, and it passes validation as plausible —
   **silent, ~80x wrong.** Needs a sanity bound, not a better regex.
7. **Duplicate guard layer 3** (F module 5 hard-fail) — cheapest, highest value.
8. **CloudConvert `INVALID_FILENAME` on extensionless `FOLDER_` files.** Seen in B's stored samples
   from the 08/19 01:20 three-ticket A2 test
   (`FOLDER_1rnk7I7zFjKE8JbpBobcZ2kSFzr-5ssII`). The later 33-ticket run succeeded and **the
   difference is unexplained.** The A2 folder path runs live Sunday.
9. **A2 module 7 `title: ""`** — untested against a real file move.
10. **Orphan files in `01 Intake`** from A runs that uploaded before module 30 failed. Cleanup.
11. **Local perspective-correction tool** — new backlog item, own session (see bugs log).
12. Carried: duplicate guard layers 1 & 2; Scenario G packet builder; Ash Grove / Tiseo / Sinacola
    ambiguity; module 29's missing Broker link; HSG Broker record `Needs Config`; Scenario D module
    25 `onerror: Ignore`; Scenario B retry-cap branch; Scenario C `Processing File URL`.

---

## Next step

**Restore module 11's `maxRecords` to 100**, then add the broker filter to Scenario F module 1
before any non-HSG batch reaches `Ready for Invoice`. The June backfill has put 149 tickets into
the pipeline, Canfield among them, so F's missing filter is no longer a hypothetical.
