# Diane 2.0 Checkpoint: First End-to-End Invoice Run (A2 → F, HSG week of 08/10)

**Date:** 2026-08-19 (overnight; source file dated 2026-08-18 — see note below)
**Repo / checkout:** `/Users/erniehathaway/Projects/diane` → `punkrocknerdgirl/diane`, branch `main`
**Scope:** A2 `5984004`, B `5097838`, C `5653013`, D `5251400`, E `5721872`, F `5908565`;
base `appMWvtLU0hMBqjLC`
**Follows:** `2026-08-19-D20-dispatch-match-visibility.md`

> **Dating note.** The source inbox file is named `2026-08-18-...`, but every timestamp in the
> verified data falls on 2026-08-19 UTC (Invoice Batches created `04:22:04Z`, F's last run
> `04:31Z`). Logged under 2026-08-19 to keep the sequence readable.

---

## Headline

**Diane produced and sent its first invoices.** Two HSG invoices, 32 tickets, **$15,652.40**, plus
ticket-image packets. Before tonight the Invoice Batches table had never held a record and
Scenario F had zero executions.

The full chain was run manually, stage by stage, with Airtable record counts verified between
every stage.

| Stage | Result |
|---|---|
| A2 — Get Folder Tickets (`5984004`) | 33/33 Tickets, drop folder emptied |
| B — Clean Ticket Images (`5097838`) | 33/33 Cleaned, zero cleaning errors |
| C — OCR Workflow (`5653013`) | 33/33 OCR Outputs |
| D — Document AI Extractor (`5251400`) | 33/33 Parser Outputs + Validation Queue |
| E — Build Review Batches (`5721872`) | 33/33 batched, 32 resolved + 1 unassigned |
| Review + approve | 32 approved (1 duplicate removed) |
| F — Generate HSG Invoice (`5908565`) | 2 invoices built |

---

## Verified state

Re-checked directly during this checkpoint — Scenario E and F blueprints re-pulled via
`scenarios_get`, Airtable read via the MCP.

### The two invoices — confirmed in Invoice Batches `tbl7nRJsDeKwhpDDu`

**Exactly 2 records**, both `Invoice Built`, both created `2026-08-19T04:22:04Z`:

| Record | Invoice # | Batch Key | Driver / Truck | Tickets | Tons | Total |
|---|---|---|---|---|---|---|
| `recLo9UdG1gyNreVn` | `HS26081802` | `HSG_20260810_W02` | David Shelton / 02 | 15 | 371.38 | $7,427.60 |
| `rec8HwtvxKoe4dKoR` | `HS26081803` | `HSG_20260810_W03` | David Clifton / 03 | 17 | 411.24 | $8,224.80 |

Both carry an `Invoice Sheet URL`. Arithmetic checks: 15 + 17 = 32 tickets; 371.38 + 411.24 =
782.62 t; $7,427.60 + $8,224.80 = **$15,652.40**. Matches the headline exactly.

### Scenario F (`5908565`) — run confirmed from its own stored samples

`lastEdit: 2026-08-19T04:31:25.194Z`, `isActive: false`, scheduling `on-demand`.

F's saved `designer.samples` preserve the actual HS26081803 execution end to end — module 6
created spreadsheet `1y5sjGt22I6ThaLXrw-pYj2saTPHd-ocQIRZsXS0K2Sw` named
`2026-08-18 HSG Invoice HS26081803` in folder `1gD8RYh4LkDF6_R8wX0gGRJlRiMUE1TiX`; module 7
returned `statusCode 200`, `totalUpdatedCells: 147`, `lastDataRow: 30`, `ticketCount: 17`; module 8
returned `200` with `Batch Status: Invoice Built`. This is direct evidence of a successful run, not
a report of one.

**Module 6 is now correctly configured** — `file: 10apbUjqPwmdP7qEHxD0b4u1yUwtPz9glrWXdP3XsF_k`,
`folderId: 1gD8RYh4LkDF6_R8wX0gGRJlRiMUE1TiX`, name template as described. Its metadata still
carries `restore.expect.select.label: "Enter manually"`, consistent with the diagnosis.

### Scenario E (`5721872`) — Rate fix confirmed live

`lastEdit: 2026-08-19T03:40:45.488Z`. Module 24 now ends:

```js
// NOTE: must be null, not "". The Review Batch Rate field is currency and
// Airtable rejects an empty string outright ([422] Field "Rate" cannot accept
// the provided value). Null clears the field cleanly. This fires on any
// unresolved or ambiguous ticket, which is when resolvedDispatch is null.
const resolvedDispatchRate =
  resolvedDispatch?.dispatchRate ?? null;
```

The comment is present verbatim, so the "don't tidy this back" guard is real. Router 39 and modules
40/41/42 from the previous checkpoint are intact and unchanged.

### Tickets `tbloTlWdo1f4hFKXh` — write-back confirmed

**Exactly 32 records** (33 minus the removed duplicate). All 32 carry `Ticket Number`,
`Ticket Date`, `Quantity`, `Rate` (`20` on every row), `Line Total` and `Truck Billing Name`, and
all 32 are linked to one of the two Invoice Batches. The W02/W03 split is 15/17, matching the
invoices.

`411264` appears **once** (`recRFSCB1TjSgg62l`, W02) — the duplicate is genuinely gone, not merely
unlinked.

### Corrections / nuances found while verifying

1. **The Tickets table holds 32 records, not 33.** The duplicate was deleted, not just excluded.
   Worth stating plainly: 33 was the intake count; 32 is the surviving record count.
2. **Ticket `410416` — the one E could not match — is linked to the W03 Invoice Batch and was
   invoiced.** The report describes it as "correctly isolated into its own `VAL_...` batch," which
   was E's behaviour, but it was then manually moved onto the HSG W03 batch during the manual
   Invoice Batch creation. Both statements are true; the log records the end state so it isn't
   later read as "410416 was excluded."
3. **A field literally named `Processed to Tickets` does not exist on the Tickets table** — the
   Airtable API rejects it by that name. The point stands (nothing was written back automatically),
   but the exact field name in the report is not the one in the schema.
4. **Module 29 still does not write the Review Batch `Broker` link** — re-confirmed, unchanged from
   the previous checkpoint. Correctly listed as open item 9.

### Reported but NOT independently verified this checkpoint

- The per-stage 33/33 counts for A2, B, C and D. Only the end state (32 Tickets, 2 invoices) was
  re-read; the intermediate tables were not re-counted.
- The `[422] Field "Rate" cannot accept the provided value` error text — Make History only.
- That module 6's field showed **empty in the editor** while the blueprint held the ID. The stored
  blueprint now holds the ID either way, so the pre-fix editor state cannot be re-observed.
- The manual Airtable write-back (2 batched calls, 32 records, 11 fields each) — the resulting data
  is verified; the mechanism is reported.
- The ticket packet PDFs, their page counts, page-1 spot check, and the `wright2`/`wright3` truck-ID
  confirmation.
- The clue-breakdown distribution (~20 customer/job/origin, ~7 customer/job, ~4 origin-only) — read
  from match notes in-session; those notes were not re-read here.
- The template row-20 formatting fix and the resulting `$20.00` rendering.
- That the invoices were **sent**.

---

## What changed this session

1. **Scenario E module 24 — Rate empty-string bug FIXED.** `?? ""` → `?? null`, with an inline
   comment explaining why. **This bug predated tonight's work** and had been latent since module 24
   was written; it only fires when an unresolved or ambiguous ticket reaches module 29's
   batch-create, which had never happened until a 33-ticket batch contained one non-matching ticket.
   It would equally have fired on the first ambiguous Ash Grove ticket.

   Diagnosis came straight from the new Dispatch Match Notes — five records showed
   `resolved ... first_pass_single` and the failing one showed nothing, pointing at the
   null-resolution path in one step. **The diagnostics layer built hours earlier paid for itself
   the same night.**

2. **Scenario F module 6 (Drive copy) — FIXED in the UI.** `copyAFile` was 404ing because the
   module's **Original File ID field was empty** — it was copying file ID `""`. Both the template
   ID and the destination folder were valid and accessible; the stored blueprint *did* contain the
   ID, but the editor showed the field blank, apparently orphaned when "Select the Method" was set
   to "Enter manually". Re-entered manually.

3. **New dispatch record** `DSP_20260810_MICHELSDATAHUBBARD_01` (`recclWWJfR4LiurbD`): Job +
   Customer `Michel's Data Hubbard`, Origin `Canfield`, Destination `Hubbard, TX`, Broker → HSG
   (`rec4It14Oku2LyXmX`), Rate $20, period 08/10–08/16. **`_03` (Job "Hubbard") and `_06` (Job
   "Michels Data") were closed first** — both were migration stubs whose first tokens would have
   collided with the new record and made every ticket this week ambiguous. Reason recorded in the
   new record's Dispatch Notes so they don't get reopened.

4. **Two Invoice Batch records created manually**, and the approval → Tickets write-back performed
   by hand via the Airtable API.

5. **Invoice template fixed** — formatting only extended to row 20, so rows 21+ rendered raw (`20`
   instead of `$20.00`). Row 14's format was painted down.

## What was NOT changed

- **The matching logic in module 24** beyond the one Rate line. `keywordMatches` / `clueMatches` /
  the candidate loop are untouched.
- **Ash Grove ×3, Tiseo ×2, Sinacola ×2** — left Active and still mutually ambiguous. Deliberate:
  they are Sunday's real test of the ambiguous branch.
- **F's broker filter** — not added. See finding 2; this is the top-ranked open item.
- **The approval → Tickets write-back** — no automation built. Done by hand this once.
- **Invoice Batch creation** — no automation built.
- **Duplicate guards** — none of the three layers built.
- **`Ticket Status` / `Ready for Billing`** were not written during the manual write-back — locked
  selects, valid option names unknown, and F ignores both.
- No Apps Script changes, no deployments, no Airtable schema changes.
- `docs/build-logs/terminal-and-git-glossary.md` was not modified — every command run this
  checkpoint was already present. `docs/build-logs/build-log.md` was not touched. Pre-existing
  modified/untracked files at session start were left alone and are not staged.

---

## Findings — architecture

### 1. F-HSG reads Tickets, not Validation Queue

Module 1 searches **Invoice Batches** (`tbl7nRJsDeKwhpDDu`) for `Batch Status = "Ready for Invoice"`,
feeds that record's `Tickets` link through a `BasicFeeder`, then pulls each **Ticket** record for
`Ticket Date`, `Ticket Number`, `Truck Billing Name`, `Origin`, `Destination`, `Quantity`, `Rate`,
`Line Total`.

`Invoice Number`, `Invoice Date` and `Driver / Truck` are **read** from the Invoice Batch — F does
not generate them.

### 2. F-HSG has NO broker filter — landmine

Its only filter is `{Batch Status} = "Ready for Invoice"`. Nothing about HSG. The "HSG-ness" is
entirely the hardcoded template file ID, the hardcoded output folder, and the literal string "HSG"
in the filename template. Confirmed in the blueprint.

**Once Statewide batches exist, running F-HSG will pull an ST batch onto the HSG template.** This
contradicts the per-broker-filter architecture described in older notes — **the notes were wrong,
the blueprint is right.** Fix before Sunday.

### 3. The approval → Tickets write-back DOES NOT EXIST

**This corrects an earlier claim in this project's notes.** A past session asserted that approving
in the Apps Script review form writes final values through to Tickets and sets a processed flag.
Observed behaviour tonight: approval flipped `Review Status` to Approved and **nothing else**. All
32 Ticket records remained completely empty.

This was caught only because F reads Tickets — otherwise it would have produced two invoices with
32 blank line rows.

Fields written by hand: Ticket Number, Ticket Date, Quantity, Rate, Line Total, Truck Billing Name,
Customer / Job, Origin, Destination, PO Number, Work Order / Order.

**This is an unowned gap in the pipeline, not a one-off glitch.** It needs either the Apps Script
or a new Make scenario, and it blocks every future invoice.

### 4. Invoice Batch creation has no automated owner

No Make scenario creates Invoice Batch records. Created manually tonight. Permanent manual step
until built.

---

## Findings — duplicate tickets (NEW CLASS OF BUG)

Ticket **411264** appeared twice, from two different source images. **Caught in review by eye, not
by any system check.**

**Root cause: the dedupe layer was lost when Scenario A retired.** Motive assigned a stable
document/attachment ID, so the same ticket submitted twice hit the same ID and A's Import Key check
caught it for free. A2 keys on **Drive file ID**, and every drag out of Photos mints a new one.

Two distinct duplicate cases needing different defences:

1. **Same photo exported twice** — byte-identical. Catchable at A2 *before* OCR cost, if a content
   hash is available. Drive API exposes `md5Checksum`; **unverified whether Make's
   `ActionGetFileList` surfaces it.** `fileSize` is definitely available as a weaker signal.
2. **Same ticket photographed twice** — different bytes. No file-level check can catch it. The only
   real identity is the ticket number, which doesn't exist until D has run. **D is the only
   possible place.**

Agreed three-layer defence (**none built yet**):

| Layer | Where | Purpose |
|---|---|---|
| 1 | A2 | checksum match — kill byte-identical re-exports pre-OCR |
| 2 | D | ticket-number match → set `Needs Human Review?` (`fld9ykl7QdHeZox4b`, exists, unwritten) |
| 3 | **F module 5** | **hard-fail if any ticket number appears twice — the money guard** |

**Layer 3 is the important one and the cheapest** — module 5 already has the entire ticket array in
JavaScript before it writes anything to the sheet.

Note: duplicate ticket numbers across *different quarries* can be legitimate (numbering is
per-scale). Within one broker + one week it is not.

---

## Findings — Scenario E matching on live data

All 32 resolved tickets matched via `first_pass_single` against the new dispatch. Clue breakdown
from the match notes:

| Clues matched | Count |
|---|---|
| customer/job/origin | ~20 |
| customer/job | ~7 |
| **origin only** | **~4** |

**Four tickets matched on `Canfield` alone** — OCR lost "Michels" entirely on those. Had Origin not
been populated on the dispatch record earlier that evening, those four would have gone unassigned.
**Populating Origin is load-bearing, not cosmetic.** This also settles the Stage 3 question from the
previous checkpoint in favour of populating Origin.

One ticket (`410416`) matched nothing:
`AUTO - no dispatch matched. 8 active dispatches evaluated.` It was correctly isolated into its own
`VAL_...` batch with blank Rate rather than silently joining the main batch, then moved onto the W03
invoice batch by hand.

---

## Ticket packets

Built `HS26081802 Tickets.pdf` (15 pages) and `HS26081803 Tickets.pdf` (17 pages), split by truck
and sorted date-then-ticket-number to match invoice line order exactly. Page 1 of each was verified
against the source ticket image — the truck ID printed on the ticket (`wright2` / `wright3`)
confirms the split independently.

**Built locally from an uploaded zip of the original drop-folder images.** Claude cannot do this
from Drive directly: `download_file_content` returns base64 into context (~90k tokens per 282 KB
file), and the sandbox network allowlist excludes Google domains. **Not a scaling path.**

**Automation target — Scenario G, Build Invoice Packet.** The pattern already exists in the
archive: `07 DP TNB Packet Builder` (`5146729`) used `cloudconvert:MergeFiles` fed by a
`BasicAggregator`. The cleaned files are already PDFs, so it is concatenation only.

**Open question first:** the cleaned PDFs are the *OCR-optimized* pass. Are they legible enough for
a broker, or does a heavier human-facing darken pass need to exist before packet assembly is
automated?

---

## Guardrails

Standing Diane guardrails, unchanged: diagnose before changing anything; preserve existing
architecture and proven behaviour unless redesign is explicitly requested; no production Make module
or logic change without explicit approval; verified and reported-but-unverified stay distinct; never
expose keys, PATs, or tokens; Airtable is the operational source of truth; Google Sheets is not
coming back as the architecture; local checkout and GitHub main stay in sync; all scenarios stay
inactive and unscheduled, run once only and manually.

New, now standing:

- **`Do Not Bill` blocks the WHOLE batch approval**, not just the flagged record. The correct
  pattern for excluding one ticket is to unlink it from the Review Batch and set `Batch Lock` (so E
  doesn't re-batch it), rather than flagging it in place.
- **A Make module can show empty in the editor while the stored blueprint holds a value.** Verify
  config in the UI, not only via `scenarios_get`. Same family as the editor-tab overwrite: the API
  view and the editor view can disagree about what is actually configured. **Do not treat a fetched
  blueprint as proof a module is correctly set up.**
- **Invoice number convention is `BBYYMMDD##` with a TWO-letter broker code** — `HS`, not `HSG`.
  The Brokers table `Broker Code` field stores `HSG` (three letters); these are different things.
- **The Sheets API writes values, not formats.** Template formatting must already extend far enough
  down to cover the largest expected line count.
- **Never trust a stage count without reading Airtable.** Every stage this session was verified by
  record count before the next was run — that discipline is what caught the empty Tickets table
  before two blank invoices went out.
- Carried forward: never map `?? ""` or `emptystring` into an Airtable numeric, currency, or date
  field; branch before filtering in Make; check the option list before writing to a locked select;
  close the Make scenario tab before any `scenarios_update` push.

---

## Open items, ranked

1. **F-HSG broker filter** — will grab Statewide batches onto the HSG template. **Fix before
   Sunday.**
2. **Approval → Tickets write-back** — no owner. Blocks every future invoice.
3. **Duplicate guard, layer 3** (F module 5 hard-fail) — cheapest, highest value.
4. **Invoice Batch creation** — manual; automate eventually.
5. **Module 5 fixes:** always write the footer plus D7/H6/H7 (not only when `ticketCount > 9`), and
   split `Driver / Truck` so D8 gets the name and H8 gets the truck — currently both get the full
   string.
6. **Duplicate guard layers 1 & 2** (A2 checksum, D ticket-number check).
7. **Scenario G — packet builder.**
8. **Ash Grove / Tiseo / Sinacola ambiguity** — still live, fires Sunday.
9. **Module 29 doesn't write the Review Batch `Broker` link** even though module 24 computes
   `resolvedDispatchBrokerRecordId`. Two-line fix, no current impact.
10. **HSG Broker record is `Needs Config`** — all batching rules `Unknown`, Submission/CC emails
    empty. Now known: **HSG bills per truck.**
11. **Scenario D `onerror: Ignore` on modules 5/13/25** — still silent-failing.
12. Carried from earlier logs: quantity plausibility guard in D; month/rolling-window date guard in
    D (deliberately deferred); Scenario B retry-cap branch; Scenario C `Processing File URL`.

---

## Next step

Add the broker filter to Scenario F module 1 — change the formula from
`{Batch Status} = "Ready for Invoice"` to also require the batch's Broker be HSG
(`rec4It14Oku2LyXmX`), so a Statewide batch can never be pulled onto the HSG template. This is item
1 because it is the only open item that can silently produce a **wrong invoice to a real customer**,
and Statewide batches arrive Sunday.
