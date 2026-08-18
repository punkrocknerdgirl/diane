# Build Log — 2026-08-18 — Batching & Ingest Rescope

**Date:** 2026-08-18
**Source:** chat session checkpoint (Ernie + Claude), handed off to Claude Code
**Status:** Current. This session **rescoped the project** — several conclusions
below invert what earlier build logs say. Where this document and an earlier
build log disagree, this document wins.

Companion document: `2026-08-18-D20-image-preprocessing-handoff.md` (full spec
for priority 4).

---

## 1. Changes already made to live systems

**Scenario D (`5251400`) — dead code removed and pushed.**
The router (module 19) and merge (module 24) were deleted. The router's condition `{{12.id}} exist` was always true, so the `else` branch (module 20, `Source File ID` fallback) was permanently unreachable. Module 5 was repointed from the merge outputs to module 4 directly.

New flow: `12 (search) → 4 (download) → 5 (Cloud Run extract) → 27 (regex qty) → 13 (Parser Output) → 14 (Validation Queue) → 16 (mark ticket)`

Verified `isinvalid: false`, still Inactive, scheduling untouched.

**Ernie corrected the seven bad dates in Airtable manually.** Ground truth for those tickets is now in the Validation Queue.

---

## 2. Verified findings — do not re-derive

### Image pipeline
- **Scenario D reads the cleaned file.** Module 12's formula requires `{Cleaned File ID} != ""`; module 4 downloads it. Whatever B produces is what Document AI sees.
- **B does no darkening at all.** Its only image op is module 32 (`image:Resize`, `maximalHeight: 2048`), which is a **no-op** — Make's resize only shrinks, and the images are 595px tall. Cached sample confirms 1320×595 in, 1320×595 out.
- **Motive is not degrading images.** Driver 1's phone-texted ticket is 1320×595 — dimensionally identical to what Motive delivers. The compression happens at the phone/carrier, before either path.
- All 33 tickets in run `MOTIVE_LIVE_SCENARIO_A_20260817B` are ~0.79 MP (90–187 KB, tight cluster = uniform resolution). Driver 1: 1320×595. Driver 2: 1024×768. Same pixel count, different aspect → messaging-layer normalization.
- **Framing, not resolution, separates the two drivers.** Driver 2 fills the frame square-on. Driver 1's ticket is ~60% of frame, tilted, washed out, rest is truck interior.
- A control HEIC from `~/Library/Messages/Attachments` was **3024×4032 (12.19 MP)** — Messages storage does not compress. Whether driver ticket *originals* are full-res there is **still unknown**; the check in §6 was never run.

### Data / extraction
- **`Parsed Broker` (`fldj1XAQN0i4pV4Qs`) and `Parsed Driver` (`fldCBiZ6TMmE7dw1a`) are empty on all 170 Parser Output records.** Never populated. The extractor returns only `ticket_number`, `ticket_date`, `quantity_tons`, `material`, `truck`.
- `SELLER` (broker) and `BUYER` (customer/job) are **present and legible in raw OCR text on every Canfield ticket** but are never extracted.
- On non-Canfield layouts the extractor *does* grab job strings — into the wrong field. `Parsed Truck` contains values like `2452012-SR8179-02, GP WRIGHT`, `SR8742-1, GP WRIGHT CONSTRUCTION`, `01 GP Wright`.
- **Truck misread splits grouping:** `wight3` (dropped `r`) on 412600 and 411828, vs `wright2` correct on 410959.
- `BUYER` reads more reliably than `SELLER`. Across four tickets `Michels data` was clean every time; `Hillsboro S&G` degraded to `Hillsboro 586` and `Hillsboro SS6`.
- **`Invoice Batches` (`tbl7nRJsDeKwhpDDu`) is empty — zero records.** Diane has never produced an invoice. All invoicing to date has been manual.

### The "bad batch" was not a bug
The 29-record batch Ernie saw was the **previous week's** Review Batch (`DISPATCH_DSP_20260809_MICHELSDATAHUBBARD_06`, tickets 407955–410011, dates Aug 3–9) still sitting open. The new 33 have **no Review Batch assignment at all**. 29 + 33 = 62 unapproved Validation Queue records. No batching logic is broken.

**Do not add a date-range filter to batch membership.** Seven tickets had corrupted dates that would have excluded genuinely in-range tickets — under-billing via silent omission. Batch membership should key on the Import Run link (written by Scenario A, never touched by OCR).

---

## 3. Decisions made

- **Batching key = broker + job, within the dispatch date window.** Date alone is insufficient: a truck can run a late return for a second broker on the same day.
- **Resolve against closed sets, not free text.** There are ~6 brokers and a handful of active dispatches. The extractor grabs a noisy string; a resolver picks the nearest match from the short list. `Hillsboro 586` → HSG resolves fine against 6 candidates. This makes matching robust to poor image quality *by design*. `Brokers.Broker Alias` and the `Aliases` table already exist for this.
- **Ticket Templates / Template Field Rules: shelved.** Not being wired up. Hardcode the Canfield mapping.
- **Vocabulary:** `SELLER`/`BUYER` are printed label clues on one ticket family only. Diane's terms are `broker` and `customer_job`.
- **Import Run stays manually created** before Scenario A. A does not create it.
- **Dispatch setup:** recommend an Airtable interface form on `Dispatches` over a custom UI. Few records per week; schema is already complete.
- **Preprocessing demoted** from first priority to fourth (see §4).

---

## 4. Why the priorities changed

Ernie's actual Sunday flow:

1. Download driver texts → Photos
2. **Upload to Motive in date batches — requires opening every scan and reading its date** ← ~33 manual inspections
3. Manually create Import Run in Airtable
4. Run scenarios A–E
5. Batch, review, approve
6. Manually create invoices

Step 2 is a full manual pass over every ticket *before Diane sees anything* — reading the same faint dates he'll read again in review. **Folder-based ingest deletes that step entirely.** That's a larger time saving than image preprocessing was ever going to deliver, and preprocessing only makes an existing step easier rather than removing it.

---

## 5. Priority order

### 1. Folder-based ingest (replaces Motive in Scenario A)
Ingest from a local/Drive folder instead of the Motive API. Motive can still drop files into the same folder later if reconnected.

- **Key scheme is the risk.** `Ticket Key` is currently `INTAKE_MOTIVE_{document_id}_{attachment_id}` and B's dedupe depends on it. Folder filenames (`IMG_4471.jpg`) give no stable unique ID, and iPhone filenames recycle → collisions that silently overwrite or skip. Needs a new scheme (content hash, or filename + import timestamp) touching A, B, and the dedupe formula.
- **HEIC support required.** Document AI and Vision do not accept HEIC. Needs a convert step early or those tickets fail — and given B's history of silent failures, build it deliberately with visible errors.
- Motive driver/truck attribution is lost, but this is near-zero cost: `Final Driver`, `Parsed Driver`, `Extracted Truck` are already empty. Truck identity comes from the `ID: wright3` string in OCR.

### 2. Dispatch setup
Airtable interface form on `Dispatches` (`tblnXClSQImZ22vCG`). Schema is complete — `Broker`, `Customer`, `Job`, `Origin`, `Destination`, `PO Number`, `Work Order / Order`, `Rate`, `Truck`, `Driver`, `Start Date`, `End Date`, `Dispatch Status`, `Dispatch Lock`, `Import Run` (`fldAJOIJPkwyHpCTl`).

- Multiple dispatches per week; one Import Run : many Dispatches
- Required for matching: `Start Date`, `End Date`, `Broker`, `Job`
- `Dispatch Status` should default to Active

### 3. Broker + job extraction and resolve
- Add `broker` and `customer_job` to the Cloud Run extractor output (`diane-ticket-extractor`, `/extract/ticket`)
- Map `broker` → existing `Parsed Broker` (`fldj1XAQN0i4pV4Qs`); create `Parsed Customer / Job` on Parser Outputs
- Add the resolve step in Scenario E: fuzzy-match broker against `Brokers`, job against active `Dispatches`, filter by date window
- Override plumbing already exists: `Batch Assignment Source` (`fldAlpzIXWQLNUXKr`), `Batch Lock` (`fldbPz2lqjZWAQ1xZ`), `Dispatch Lock` (`fldWIcErNtZh7Rhnj`), `Dispatch Match Notes` (`fld5k7z73HCkzHLkw`)
- **Cheap complementary fix:** add `wight2`/`wight3` to `Trucks.All Known Aliases` (`fldzJsyXJppGybuf3`). Deterministic; works regardless of image quality.

### 4. Image preprocessing
Full spec in `2026-08-18-D20-image-preprocessing-handoff.md`. Summary: `POST /clean/ticket` on the existing Cloud Run service, modes `review` (formerly `ocr`) and `human`. Chain: format normalize (incl. HEIC) → **auto-crop to document (primary goal)** → deskew → 2× upscale → adaptive local contrast. Crop must fail safe to uncropped. Do **not** retry darkening through CloudConvert — that's where the `INVALID_OPTION` error came from. Test set is the seven tickets with Drive file IDs listed in that doc; capture a baseline before changing anything.

---

## 6. Unrun check

Determines whether driver ticket originals in Messages are full-resolution:

```bash
find ~/Library/Messages/Attachments -type f \
  \( -iname '*.heic' -o -iname '*.jpg' -o -iname '*.jpeg' \) -mtime -45 \
  -exec sips -g pixelWidth -g pixelHeight {} \; 2>/dev/null \
  | grep pixel | paste - - | sort | uniq -c | sort -rn | head -15
```

- All ~0.79 MP → carrier ceiling, nothing to recover
- A cluster at 3024×4032 → Photos round-trip is destroying 90% of the image; folder ingest becomes a major quality win too

---

## 7. Constraints — read before touching Make

- **All scenarios stay Inactive.** Never activate. Never use the MCP `scenarios_run` tool (it force-activates). Ernie triggers everything via UI "Run once."
- `scenarios_update` requires the full blueprint: fetch → patch → strip `metadata.designer.samples` → validate → push. The validator rejects `scheduling` and `interface` *inside* the blueprint object — pass them as sibling params.
- **Airtable record counts are the only reliable verification.** Make's green SUCCESS badge lies when `onerror: Ignore` is present.
- Make org domain is `us2.make.com`, org/team `2196964`. `us1` links 404.
- Separate scenarios are the safety mechanism — a broken one gets pulled from the flow rather than blocking the pipeline.

---

## 8. Resolved — remove from backlog

- Review form ticket date now populates correctly
- Review form scan-persistence and zoom behavior fixed to acceptable standard

## 9. Still open

- Scenario D `onerror: Ignore` on modules 5, 13, 25 — silent failure, still live
- Date range guard in D (insertion point after module 5, mirrors module 27's pattern)
- Vision OCR cross-check for dates using stored `Raw OCR Text` (`fld8twN1aSHmConvn`)
- `Final Total (Legacy)` (`fld5IN6BntCd4wDJM`) deletion, pending clasp deploy
- Scenario A blueprint never reviewed this session — unknown which Motive field supplies the image URL
- Scenario F (invoice generation) does not exist as a working path; Invoice Batches is empty

---

## 10. Addendum — Scenario A blueprint reviewed (Claude Code, 2026-08-18)

Resolves the §9 open item "Scenario A blueprint never reviewed this session —
unknown which Motive field supplies the image URL."

**Scenario A = `A - Get Motive Tickets`, ID `5631564`.** Verified `isActive: false`,
`isinvalid: false`, scheduling `indefinitely / 900s` (irrelevant while inactive).
Nothing was modified.

Module tree:

```
[26] airtable:ActionSearchRecords   — Search Import Runs
[32] util:SetVariable2              — run_start_time
[33] builtin:BasicRouter
  ├─ route 1
  │   [1]  http:MakeRequest         — List Motive Documents
  │   [15] builtin:BasicFeeder      — Iterator Over Attachments
  │   [27] airtable:ActionSearchRecords — Search Existing Tickets
  │   [7]  http:DownloadFile        — Download Attachment
  │   [8]  google-drive:uploadAFile — Upload to Drive
  │   [30] airtable:ActionCreateRecord — Create Ticket Record
  └─ route 2
      [31] airtable:ActionUpdateRecords
```

**The image URL comes from `{{15.public_url}}`** — module 7 (`Download Attachment`)
downloads that URL. Module 15 iterates `{{1.document.attachments}}` from the
Motive API response (`GET https://api.gomotive.com/v2/documents`).

**Ticket Key is written at module 30**, field `fldcYMcSgCUK6L3vA`:

```
INTAKE_MOTIVE_{{1.document.id}}_{{15.id}}
```

Both halves come from the Motive API payload — `document.id` and the attachment's
`id`. Neither has any folder-ingest equivalent, which confirms §5's assessment
that the key scheme is the primary risk in priority 1.

### Implications for folder-based ingest

The Motive-specific surface in A is narrow — three modules (1, 15, 7) and the
Ticket Key formula. Replacing it means:

- **Modules 1 + 15** → a Drive/local folder list + iterate. Module 7's HTTP
  download is replaced by a Drive download (or dropped entirely if the file is
  already in Drive and only needs a copy to the working folder).
- **Module 8** (upload to Drive) and **module 30** (create Ticket Record) are
  source-agnostic and should survive unchanged apart from the key.
- **Module 27** (`Search Existing Tickets`) is the dedupe check and reads the
  same key — it must change in lockstep with the formula at module 30.

Recommended key scheme: **content hash**, e.g. `INTAKE_FOLDER_{sha256[:16]}`.
It is the only option that is stable across re-uploads, immune to iPhone
filename recycling (`IMG_4471.jpg`), and idempotent if Ernie re-runs an import.
Filename + import timestamp is *not* idempotent — a re-run creates duplicates.

Not yet reviewed: Scenario B's dedupe formula, which §5 notes also depends on
`Ticket Key`.

---

## 11. Addendum — Scenario B reviewed + truck aliases added (Claude Code, 2026-08-18)

### 11.1 CORRECTION: Scenario B's dedupe does *not* depend on `Ticket Key`

§5 states: *"`Ticket Key` is currently `INTAKE_MOTIVE_{document_id}_{attachment_id}`
and B's dedupe depends on it."* **The second half is wrong.**

Scenario B = `B - Clean Ticket Images`, ID `5097838`. Verified `isActive: false`,
`isinvalid: false`. Nothing modified.

Module 11's search formula is **state-based, not key-based**:

```
AND(
  {Ticket Status} = "Intake",
  NOT({Cleaned File ID}),
  OR(
    {Clean Status} = "",
    {Clean Status} = "Needs Clean"
  )
)
```

A programmatic sweep of every mapper in B confirms **no module references
`Ticket Key` or `INTAKE_` at all**. `Ticket Key` appears in B only as an
output-field declaration and in cached designer sample data.

**Consequence for priority 1:** the key-scheme change is contained entirely
within Scenario A — the formula at module 30 and the dedupe search at module 27.
B picks up whatever A produces via `Ticket Status` / `Clean Status` /
`Cleaned File ID` and is indifferent to the key format. This makes folder-based
ingest materially cheaper than §5 assumed. It does **not** reduce the need for a
stable key: A's own module 27 dedupe still depends on it, as does any re-run
being idempotent.

### 11.2 Module 32 confirmed still live

The no-op `image:Resize` (`maximalHeight: 2048`, mapper `{{12.data}}`) is still
present, inside **branch 1 of module 40** (`builtin:BasicIfElse`) — not a
top-level module, which is why it does not appear in a flat flow listing. The
preprocessing handoff's instruction to delete it remains valid and unactioned.

Confirmed B module tree:

```
[11] airtable:ActionSearchRecords   — state-based search (formula above)
[12] google-drive:getAFile
[40] builtin:BasicIfElse
  └─ branch 1: [32] image:Resize     ← confirmed no-op, slated for deletion
[46] builtin:BasicMerge
[8]  cloudconvert:CreateJob          — CloudConvert - Diane Build
[23] util:SetVariable2
[22] builtin:BasicRepeater
[25] util:GetVariable2
[19] util:FunctionSleep
[17] cloudconvert:GetJob
[26] builtin:BasicRouter
  ├─ route 1: [29] SetVariable2 → [20] BasicFeeder → [4] http:DownloadFile
  │           → [9] google-drive:uploadAFile → [21] airtable:ActionUpdateRecords
  └─ route 2: [30] airtable:ActionUpdateRecords
```

### 11.3 Truck aliases added (live Airtable write)

Applied the "cheap complementary fix" from §5 / handoff §7. Base
`appMWvtLU0hMBqjLC`, table `Trucks` (`tbl34C0X7sRdpFsP5`), field
`All Known Aliases` (`fldzJsyXJppGybuf3`). The field is a semicolon-delimited
string; values were appended, nothing removed.

| Record | Truck | Appended |
|---|---|---|
| `recNskhFtjcvOR1RQ` | Wright 02 | `Wight2; Wight02; Wight 02` |
| `reckI5LZAbqiEtdDh` | Wright 03 | `Wight3; Wight03; Wight 03` |

The observed OCR misread is the dropped `r` (`wright3` → `wight3`). The
zero-padded and spaced forms were added alongside the bare ones to mirror the
existing alias pattern, since the same glyph loss applies to those spellings.

Write confirmed by read-back against the primary field (`Internal Name` =
`Wright 02` / `Wright 03`). This fix is deterministic and holds regardless of
whether image preprocessing ever ships.

**Note:** nothing currently *consumes* `All Known Aliases` in the OCR path —
`Parsed Truck` is written as raw extractor text. The alias map only pays off
once a resolve step reads it (priority 3). This was worth doing now because it
is cheap and captures the knowledge while it is fresh, but it is not yet a
behavioral fix.

### 11.4 Still unrun

The §6 Messages resolution check has not produced a result. Attempted here and
blocked by the Claude Code permission classifier (reads
`~/Library/Messages/Attachments`). Ernie ran it manually in Terminal and it
returned no output — most likely Terminal lacking Full Disk Access rather than
an absence of matching files. Unresolved.

---

## 12. Priority 1 — folder-based ingest: design + partial build (Claude Code, 2026-08-18)

### 12.1 Infrastructure created (done)

Google Drive, under `01 Project Diane` (`1b8c0J_igaT80myarMExBWI3Wxuafs7IV`):

| Folder | ID | Purpose |
|---|---|---|
| `00 Ticket Drop` | `1CBpYVu3axbx61LUSoHtaHpWgpzoHZZuQ` | Ernie drops driver photos here |
| `00 Ticket Drop/_Processed` | `1wRc77mHtzeNbFX3f0BJO1MWiIc_ZwQCp` | A2 moves originals here after ingest |

A separate drop folder is **required**, not cosmetic: Scenario A's module 8 already
uploads *into* `01 Intake` (`1Di0ie_rE0m6f_DMvJfePTI_RyyD4Gpb0`). Ingesting from
`01 Intake` would make the scenario re-consume its own output every run.

### 12.2 Correction to §10 — dedupe keys on `Import Key`, not `Ticket Key`

§10 and §5 both point at `Ticket Key`. Module 27's actual dedupe formula is:

```
{Import Key} = "MOTIVE_{{1.document.id}}_{{15.id}}"
```

Scenario A writes **two** keys, and they differ by prefix:

| Field | ID | Value |
|---|---|---|
| `Import Key` | `fldMDSp68P77ZjEw5` | `MOTIVE_{document.id}_{attachment.id}` ← **dedupe reads this** |
| `Ticket Key` | `fldcYMcSgCUK6L3vA` | `INTAKE_MOTIVE_{document.id}_{attachment.id}` |

Any key-scheme change must update **both**, and the dedupe formula must track
`Import Key` specifically.

### 12.3 Key scheme decision

**`Import Key` = `FOLDER_{driveFileId}`**, `Ticket Key` = `INTAKE_FOLDER_{driveFileId}`.

Rationale over the content-hash proposal in §10: Make cannot hash file bytes
natively, so a true content hash would require a Cloud Run round-trip. The Drive
file ID is stable, guaranteed unique, and free. It delivers the property that
actually matters — **re-running A2 over the same drop folder is idempotent**.

Trade-off, accepted: it does *not* dedupe the same photo uploaded twice as two
Drive files. The `_Processed` move (12.4) covers most of that case in practice,
since a processed file leaves the search scope entirely.

### 12.4 Target flow for `A2 - Get Folder Tickets`

Build as a **new scenario, leaving Scenario A intact.** Per §7, separate
scenarios are the safety mechanism; Motive may also be reconnected later. A2
starts Inactive like everything else.

```
[26] airtable:ActionSearchRecords  — Import Runs, Run Status = Ready
[32] util:SetVariable2             — run_start_time            (unchanged)
[33] builtin:BasicRouter                                       (unchanged)
  ├─ route 1
  │   [NEW-A] google-drive: list files in 00 Ticket Drop       ← replaces [1] + [15]
  │   [27]    airtable:ActionSearchRecords
  │             formula: {Import Key} = "FOLDER_{{NEW-A.id}}"
  │   [NEW-B] google-drive:getAFile — download by file ID      ← replaces [7] http:DownloadFile
  │   [8]     google-drive:uploadAFile → 01 Intake             (retarget title only)
  │   [NEW-C] google-drive: move original → _Processed
  │   [30]    airtable:ActionCreateRecord                      (key + source fields change)
  └─ route 2
      [31] airtable:ActionUpdateRecords — mark run Completed   (unchanged)
```

Module 30 field changes, everything else carried over as-is:

| Field | ID | Motive (A) | Folder (A2) |
|---|---|---|---|
| `Import Key` | `fldMDSp68P77ZjEw5` | `MOTIVE_{doc}_{att}` | `FOLDER_{{driveFileId}}` |
| `Ticket Key` | `fldcYMcSgCUK6L3vA` | `INTAKE_MOTIVE_...` | `INTAKE_FOLDER_{{driveFileId}}` |
| `Motive Document ID` | `fldnHSHujSYqzPTxb` | `{{1.document.id}}` | drop |
| `Motive Ref No` | `fldCmhjR7ppc36S6t` | `{{1.document.ref_no}}` | drop |
| `Source System` | `fldBUCwMAfUzbYOjz` | `Motive` | see 12.5 |
| `Source / Migration Notes` | `fldWpDzAFiaCte7R5` | `Initial Motive intake` | `Initial folder intake` |

### 12.5 Blocker: `Source System` has no `Folder` choice

`Source System` choices are `Motive / Diane 1.1 / Manual / Make` on Tickets
(`fldBUCwMAfUzbYOjz`) and `Motive / Make / Diane 1.1 / Manual` on Import Runs
(`fldhnN6gDEt9JQOhH`). Neither has `Folder`.

The Airtable MCP's `update_field` only supports editing **formula** expressions —
it cannot add singleSelect choices. Two options:

- **Add `Folder` to both fields in the Airtable UI** (~30 seconds), then module 26
  filters `{Source System} = "Folder"` and module 30 writes `Folder`. Cleanest.
- **Reuse `Manual`** — semantically defensible and needs no schema change, but
  becomes ambiguous if a Motive run and a folder run are both `Ready` at once.

Recommended: add the choice.

### 12.6 Blocker: cannot verify Google Drive module schemas

Two modules in 12.4 (`NEW-A` list-folder, `NEW-C` move-file) have no existing
example anywhere in the Diane scenario set to copy from. Scenarios A, B, `03A`,
and `04` were all checked — they use only `google-drive:getAFile` and
`google-drive:uploadAFile`, whose mapper shapes are known:

```json
// google-drive:getAFile
{"file": "<fileId>", "select": "map",
 "formatDrawings": "image/jpeg", "formatDocuments": "...", ...}

// google-drive:uploadAFile
{"data": "{{N.data}}", "select": "map", "convert": false,
 "filename": "{{N.name}}", "folderId": "<folderId>", "title": "<optional>"}
```

Both `app-modules_list` and `validate_module_configuration` fail with:

```
MakeApiError: Insufficient rights, admin permission "organization view" is needed.
```

So the exact module names and mapper schemas for list-folder and move-file cannot
be confirmed, and authoring them from guesswork risks pushing an invalid blueprint.

**Unblock — either path works:**

1. **Grant the Make MCP token `organization view`**, after which the schemas can be
   introspected and A2 authored end to end programmatically.
2. **Seed the modules by hand (no admin change needed):** in the Make UI, clone
   Scenario A → rename `A2 - Get Folder Tickets` → add the two Drive modules
   (list files in folder, move file) anywhere in the flow → save. Their blueprint
   then carries the exact schemas, and the remaining wiring in 12.4 can be applied
   via `scenarios_update`, which is not blocked by the permission gap.

Path 2 is likely faster and touches nothing live — A2 is a clone and stays Inactive.

### 12.7 Not yet addressed — HEIC

§5 flags HEIC support as required. Neither Document AI nor Vision accepts it.
Scenario B's CloudConvert step (module 8, `imagemagick 7.1.2`) already does
JPG→PDF and is the natural place to add HEIC→JPG, but this has not been designed
or tested. Per §5's warning about B's history of silent failures, it needs
explicit error surfacing rather than an `onerror: Ignore`. Open.

---

## 13. Priority 1 — `A2 - Get Folder Tickets` BUILT (Claude Code, 2026-08-18)

**Supersedes 12.6.** The "insufficient rights" wall was not a permissions problem —
`organizationId` was being passed the **team** ID (`2196964`). The real org ID is
**`7406940`** (`PRNG Creative`, zone `us2.make.com`). Make reports a wrong org ID as
`Insufficient rights, admin permission "organization view" is needed`, which is
misleading. **No account or token change was required.**

Record for future sessions:

| Thing | Value |
|---|---|
| Organization ID | `7406940` |
| Team ID | `2196964` |
| Airtable connection | `9855937` |
| Google connection (standard) | `8557388` — **use this for google-drive v3** |
| Google connection (restricted) | `8608773` — rejected by v3 Drive modules |

### 13.1 Scenario created

**`A2 - Get Folder Tickets`, ID `5984004`.** `isinvalid: false`, `isActive: false`,
scheduling `on-demand`. Scenario A (`5631564`) untouched and intact.

`on-demand` was chosen over A's `indefinitely/900` so A2 cannot fire on a timer even
if activated by accident.

```
[26] airtable:ActionSearchRecords   — Import Runs: Source System=Folder,
                                       Import Disposition=Live Work, Run Status=Ready
[32] util:SetVariable2              — run_start_time
[33] builtin:BasicRouter
  ├─ route 1
  │   [5]  google-drive:ActionGetFileList  — list 00 Ticket Drop (max 200, files only)
  │   [27] airtable:ActionSearchRecords    — {Import Key} = "FOLDER_{{5.id}}"
  │   [6]  google-drive:ActionCopyFile     — → 01 Intake, titled FOLDER_{{5.id}}
  │        filter "No Existing Ticket Found": {{27.__IMTLENGTH__}} = 0
  │   [7]  google-drive:ActionUpdateFile   — move original → _Processed
  │   [30] airtable:ActionCreateRecord     — Tickets, typecast: true
  └─ route 2
      [31] airtable:ActionUpdateRecords    — mark Import Run Completed
```

### 13.2 Design notes

- **Copy, not download+upload.** `ActionCopyFile` duplicates server-side, so A's
  `http:DownloadFile` → `uploadAFile` pair is gone. Fewer operations, no binary
  handling, nothing to time out.
- **Drive folder pickers need a PATH, not a bare ID** in google-drive v3 — format
  `/<10 Projects>/<01 Project Diane>/<folder>`, with `10 Projects` =
  `12bShC9w85IaqcFRl7rC6mTo_5WVIj1Uh`. A bare ID validates with a warning but the
  path form validates clean. (Scenario A's v1-era `uploadAFile` uses a bare ID and
  works — this applies to v3 modules.)
- **`typecast: true` on module 30** makes Airtable auto-create the `Folder` choice on
  `Tickets.Source System` on first write, which is why 12.5 is no longer blocking on
  that table.
- All three new module configs were verified with `validate_module_configuration`
  before the blueprint was assembled; the blueprint passed `validate_blueprint_schema`.

### 13.3 Before the first run — required

1. **Add a `Folder` choice to `Import Runs.Source System`** (`fldhnN6gDEt9JQOhH`) in
   the Airtable UI. Module 26 filters on it, and the Airtable MCP cannot add
   singleSelect choices (`update_field` edits formulas only). Until this exists,
   module 26 matches nothing and A2 does nothing — a safe no-op, not a failure.
   The Tickets-side choice is handled by `typecast`.
2. **Create an Import Run** with `Source System = Folder`,
   `Import Disposition = Live Work`, `Run Status = Ready`.
3. **Drop one or two test images** into `00 Ticket Drop`, not the full batch.
4. **Run once from the Make UI.** Never activate; never use MCP `scenarios_run`.

### 13.4 Verify by record count, not the green badge

Per §7, Make's SUCCESS badge is unreliable. After the test run, confirm in Airtable:

- new `Tickets` rows = number of files dropped, with `Import Key` = `FOLDER_<driveId>`
- `Source File ID` populated and resolving to a file inside `01 Intake`
- originals physically moved to `00 Ticket Drop/_Processed`
- **re-run with the drop folder empty and confirm zero new records** — this is the
  idempotency check that the whole key scheme exists to guarantee

### 13.5 Still open

- **HEIC** (12.7) — unaddressed. A2 will happily ingest a `.heic` and Document AI will
  reject it downstream. Needs the CloudConvert step in B extended, with visible errors.
- **Scenario B** needs no change for A2: its search is state-based
  (`Ticket Status = Intake`, `Cleaned File ID` empty), so it picks up A2's records
  automatically. See 11.1.
- A2 has never been executed. Everything above is verified by schema validation and
  blueprint inspection only.
