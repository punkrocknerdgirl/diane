# Diane 2.0 Checkpoint: Folder-based ingest — `A2 - Get Folder Tickets` built

**Date:** 2026-08-18
**Checkout:** `/Users/erniehathaway/Projects/diane` (origin `punkrocknerdgirl/diane`, branch `main`)
**Scenarios touched:** `A2 - Get Folder Tickets` (Make scenario ID `5984004`) — **created this session**
**Scenarios read but NOT modified:** `A - Get Motive Tickets` (`5631564`), `B - Clean Ticket Images` (`5097838`), `03A D1.0 Normalize Files to PDF` (`5005368`), `04 Add Ready Files to OCR Queue` (`5096641`)
**Status:** A2 built and schema-valid. **Never executed.** Two prerequisites remain before a first test run.
**Companion docs (also landing this commit):** `2026-08-18-D20-batching-and-ingest-rescope.md` (the rescope source of truth, §§1–13) and `2026-08-18-D20-image-preprocessing-handoff.md` (priority 4 spec).

## Purpose

Pick up the rescope handed over from the 2026-08-18 chat session: land the rescope
build log in the repo, do the cheap deterministic truck-alias fix, and start §5
priority 1 — replacing Motive ingest with folder-based ingest.

## Verified state

Confirmed live this session by direct inspection, not assumption:

- **`A2 - Get Folder Tickets` exists**, ID `5984004`, `isinvalid: false`, `isActive: false`,
  scheduling `on-demand`. Verified in the `scenarios_create` response.
- **Scenario A (`5631564`) unmodified.** Read only. Still `isActive: false`, `isinvalid: false`.
- **Scenario B (`5097838`) unmodified.** Read only.
- **Scenario A's image URL is `{{15.public_url}}`** (module 15 iterates
  `{{1.document.attachments}}`; module 7 downloads it). This closes the open item
  "Scenario A blueprint never reviewed — unknown which Motive field supplies the image URL."
- **Dedupe in Scenario A keys on `Import Key` (`fldMDSp68P77ZjEw5`), NOT `Ticket Key`.**
  Module 27 formula: `{Import Key} = "MOTIVE_{{1.document.id}}_{{15.id}}"`. A writes two
  keys with different prefixes. Both handoff docs stated this incorrectly.
- **Scenario B's dedupe does NOT depend on `Ticket Key`.** Module 11's search is
  state-based: `AND({Ticket Status}="Intake", NOT({Cleaned File ID}), OR({Clean Status}="",
  {Clean Status}="Needs Clean"))`. A programmatic sweep of every mapper in B found zero
  references to `Ticket Key` or `INTAKE_`. The handoff doc's claim that "B's dedupe depends
  on it" is wrong. Consequence: the key-scheme change is contained entirely within A.
- **Module 32 in B (`image:Resize`, no-op) is still live**, inside branch 1 of module 40
  (`builtin:BasicIfElse`) — not a top-level module, which is why it does not appear in a
  flat flow listing.
- **Truck aliases written to Airtable and read back.** Base `appMWvtLU0hMBqjLC`, table
  `Trucks` (`tbl34C0X7sRdpFsP5`), field `All Known Aliases` (`fldzJsyXJppGybuf3`).
  `recNskhFtjcvOR1RQ` (Internal Name `Wright 02`) gained `Wight2; Wight02; Wight 02`;
  `reckI5LZAbqiEtdDh` (`Wright 03`) gained `Wight3; Wight03; Wight 03`. Append only.
- **Drive folders created:** `00 Ticket Drop` (`1CBpYVu3axbx61LUSoHtaHpWgpzoHZZuQ`) and
  `00 Ticket Drop/_Processed` (`1wRc77mHtzeNbFX3f0BJO1MWiIc_ZwQCp`), both under
  `01 Project Diane` (`1b8c0J_igaT80myarMExBWI3Wxuafs7IV`).
- **`Invoice Batches` still empty**; unchanged this session.

### Reported but NOT verified

- **A2 has never been executed.** Its correctness rests on
  `validate_module_configuration` (all three new Drive modules returned `valid: true`,
  no warnings) and `validate_blueprint_schema` ("Blueprint is valid against the schema").
  No runtime proof of any kind.
- **The truck-alias fix changes no behavior yet.** Nothing in the OCR path currently reads
  `All Known Aliases` — `Parsed Truck` is written as raw extractor text. It only pays off
  once the resolve step (priority 3) consumes it.
- The §6 Messages-resolution check is **still unresolved** — see below.

## What changed this session

1. **Created `docs/build-logs/2026-08-18-D20-batching-and-ingest-rescope.md`** from the
   handed-over chat checkpoint, plus §§10–13 of new findings authored here.
2. **Created `docs/build-logs/2026-08-18-D20-image-preprocessing-handoff.md`** (companion
   spec referenced by §5 priority 4).
3. **Airtable:** appended dropped-`r` OCR misread aliases to two Truck records (above).
4. **Google Drive:** created `00 Ticket Drop` and `00 Ticket Drop/_Processed`.
5. **Make:** created scenario `A2 - Get Folder Tickets` (`5984004`):

```
[26] airtable:ActionSearchRecords  — Import Runs: Source System=Folder,
                                      Import Disposition=Live Work, Run Status=Ready
[32] util:SetVariable2             — run_start_time
[33] builtin:BasicRouter
  ├─ [5]  google-drive:ActionGetFileList — list 00 Ticket Drop (files only, max 200)
  │  [27] airtable:ActionSearchRecords   — {Import Key} = "FOLDER_{{5.id}}"
  │  [6]  google-drive:ActionCopyFile    — → 01 Intake, titled FOLDER_{{5.id}}
  │       filter "No Existing Ticket Found": {{27.__IMTLENGTH__}} = 0
  │  [7]  google-drive:ActionUpdateFile  — move original → _Processed
  │  [30] airtable:ActionCreateRecord    — Tickets, typecast: true
  └─ [31] airtable:ActionUpdateRecords   — mark Import Run Completed
```

Key scheme: `Import Key` = `FOLDER_{driveFileId}`, `Ticket Key` = `INTAKE_FOLDER_{driveFileId}`.
Chosen over a content hash because Make cannot hash file bytes natively; the Drive file ID
is stable and unique and delivers the property that matters — re-running A2 over the same
drop folder is idempotent.

Design choices worth carrying forward:

- **`ActionCopyFile` replaces download+upload.** Duplicates server-side, so A's
  `http:DownloadFile` → `uploadAFile` pair is gone. Fewer operations, no binary handling.
- **google-drive v3 folder pickers need a PATH, not a bare folder ID** — format
  `/<10 Projects>/<01 Project Diane>/<folder>`, where `10 Projects` =
  `12bShC9w85IaqcFRl7rC6mTo_5WVIj1Uh`. A bare ID validates with a warning; the path form
  validates clean. Scenario A's v1-era `uploadAFile` uses a bare ID and works — this is
  v3-specific.
- **`typecast: true` on module 30** makes Airtable auto-create the `Folder` choice on
  `Tickets.Source System` at first write.
- **`on-demand` scheduling** rather than A's `indefinitely/900`, so A2 cannot fire on a
  timer even if activated by accident.

### Make API IDs — record these, they cost an hour this session

| Thing | Value |
|---|---|
| Organization ID | `7406940` (`PRNG Creative`, zone `us2.make.com`) |
| Team ID | `2196964` |
| Airtable connection | `9855937` |
| Google connection (standard) | `8557388` — **required for google-drive v3** |
| Google connection (restricted) | `8608773` — rejected by v3 Drive modules |

**Passing the team ID where `organizationId` is expected makes Make return
`Insufficient rights, admin permission "organization view" is needed`.** This is a
misleading error — it is a wrong-ID problem, not a permissions problem. No token or
account change was needed. Roughly an hour was lost chasing a nonexistent permission gap.

## What was NOT changed

- **Scenario A (`5631564`) — untouched.** Deliberately left intact rather than converted.
  Per the standing guardrail, separate scenarios are the safety mechanism, and §5 notes
  Motive may be reconnected later. A2 is additive.
- **Scenario B (`5097838`) — untouched.** Needs no change for A2: its state-based search
  picks up A2's records automatically. Module 32 (the confirmed no-op) was **not** deleted;
  that belongs to the preprocessing task.
- **Scenarios C, D, E, F — untouched, not opened.**
- **No scenario was activated. No scenario was run.** MCP `scenarios_run` was not called.
- **Airtable schema — unchanged.** No fields or select choices added. The Airtable MCP
  cannot add singleSelect choices (`update_field` edits formula expressions only).
- **`Final Total (Legacy)` (`fld5IN6BntCd4wDJM`)** — not deleted, still pending clasp deploy.
- **Scenario D's `onerror: Ignore` on modules 5, 13, 25** — still live, untouched.
- **HEIC conversion** — not designed, not built.
- **No image preprocessing work** (§5 priority 4) was started.

## Guardrails

Standing:

- Diagnose before changing anything.
- Preserve existing architecture and proven behavior unless redesign is explicitly requested.
- Do not change production Make modules or logic without explicit approval.
- **All scenarios stay Inactive.** Never activate. Never use MCP `scenarios_run` — it
  force-activates. Ernie triggers everything via the Make UI "Run once."
- **Airtable record counts are the only reliable verification.** Make's green SUCCESS badge
  lies when `onerror: Ignore` is present.
- Do not claim code was committed, pushed, deployed, tested, or verified unless it actually
  occurred.
- Protect client data and credentials.
- Airtable remains the operational source of truth. Do not restore Google Sheets as the
  final architecture.
- Local checkout and GitHub main stay in sync; build logs are written locally, then pushed.

Session-specific:

- **`scenarios_update` requires the full blueprint**: fetch → patch → strip
  `metadata.designer.samples` → validate → push. The validator rejects `scheduling` and
  `interface` *inside* the blueprint object — pass them as sibling params.
- **Do not add a date-range filter to batch membership.** Seven tickets had corrupted dates
  that would have excluded genuinely in-range tickets — under-billing via silent omission.
- **Verify module names and configs before authoring a blueprint** — `app-modules_list` and
  `validate_module_configuration`, with the correct **organization** ID.

## Next step

**Add a `Folder` choice to `Import Runs.Source System` (`fldhnN6gDEt9JQOhH`) in the
Airtable UI.** Module 26 filters on it and the MCP cannot create it. Until it exists, A2
matches nothing and does nothing — a safe no-op, not a failure. The Tickets-side choice is
handled by `typecast`.

Then, in order:

1. Create an Import Run: `Source System = Folder`, `Import Disposition = Live Work`,
   `Run Status = Ready`.
2. Drop **one or two test images** into `00 Ticket Drop` — not the full batch.
3. Run A2 once from the Make UI.
4. Verify by Airtable record count, not the badge: new Tickets rows = files dropped,
   `Import Key` = `FOLDER_<driveId>`, `Source File ID` resolving into `01 Intake`,
   originals physically moved to `_Processed`.
5. **Re-run with the drop folder empty and confirm zero new records.** This is the
   idempotency check the whole key scheme exists to guarantee, and it is the failure mode
   behind the 2026-08-17 Import Run contamination.

## Still open

- **HEIC.** A2 will ingest a `.heic` and Document AI will reject it downstream. Belongs in
  B's CloudConvert step (`imagemagick 7.1.2`), with visible errors rather than
  `onerror: Ignore`. Do **not** retry darkening through CloudConvert — that is where the
  `INVALID_OPTION` failure came from.
- **§6 Messages-resolution check — unresolved.** The sweep of `~/Library/Messages/Attachments`
  (2,078 images in the last 45 days) found **neither ticket signature** — no 1320×595, no
  1024×768 in the top 20. The set is dominated by personal camera-roll photos (637 at
  4032×3024, 87 at 5712×4284). This confirms Messages storage preserves full resolution at
  scale, but does **not** establish whether driver ticket originals are full-res, because
  the sweep cannot distinguish a driver text from Ernie's own photo. Treated as a
  tiebreaker, not a blocker; priority 1 proceeded regardless.
- Scenario D `onerror: Ignore` on modules 5, 13, 25 — silent failure, still live.
- Date range guard in D (insertion point after module 5, mirrors module 27's pattern).
- Vision OCR cross-check for dates using stored `Raw OCR Text` (`fld8twN1aSHmConvn`).
- `Final Total (Legacy)` (`fld5IN6BntCd4wDJM`) deletion, pending clasp deploy.
- Scenario F (invoice generation) has no working path; `Invoice Batches` is empty.
