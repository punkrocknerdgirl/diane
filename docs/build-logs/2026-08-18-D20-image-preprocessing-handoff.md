# Handoff: Ticket Image Preprocessing (`/clean/ticket`)

**Date:** 2026-08-18
**Author:** chat session (Ernie + Claude)
**For:** Claude Code
**Goal:** Cut manual image fiddling, make light tickets legible in the review form, and improve OCR/Document AI extraction accuracy.

---

## 1. Problem statement

Scale ticket images arrive at ~0.79 MP with poor framing and washed-out thermal print. This causes:

1. Ernie manually straightening/rotating/darkening images before they reach Diane (he's stopped — too slow)
2. Squinting + zooming in the Apps Script review form to read every light ticket
3. Document AI misreading dates and ticket numbers, which degrades auto-batching

The fix is automated preprocessing: **auto-crop to document → deskew → adaptive local contrast**, in two passes with different tuning.

---

## 2. Verified facts — do not re-derive these

Confirmed live this session. Trust them.

### Image characteristics
- All 33 tickets in run `MOTIVE_LIVE_SCENARIO_A_20260817B` are JPEG, **~0.79 MP**, file sizes 90 KB–187 KB (tight cluster = uniform resolution)
- Driver 1 (Galaxy Note20 5G): **1320×595**
- Driver 2: **1024×768**
- Both = 0.79 MP despite different aspect ratios → messaging-layer compression normalizing to ~0.8 MP
- **Driver 1's texted image is dimensionally identical to what Motive delivers** → Motive is NOT degrading the image; the phone/carrier is
- A control HEIC pulled from `~/Library/Messages/Attachments` was **3024×4032 (12.19 MP)**, iPhone 13 → Messages storage does not compress. Unresolved whether driver-2 ticket originals are full-res there.

### The real differentiator is framing, not resolution
Driver 2 fills the frame with the ticket, square-on. Driver 1's ticket occupies ~60% of frame, tilted a few degrees, washed out, rest is truck interior. **Same pixel budget, very different effective resolution on the text.** Auto-crop is the single biggest win available.

### Pipeline facts
- **Scenario D reads the cleaned file.** Module 12's search formula requires `{Cleaned File ID} != ""`; module 4 downloads `{{12.`Cleaned File ID`}}`. Anything B produces is what Document AI sees. (Dead router/merge removed from D this session — D is now `12 → 4 → 5 → 27 → 13 → 14 → 16`.)
- **B currently does no darkening at all.** Flow: `11 search → 12 download → 40 router → 32 resize → 46 merge → 8 CloudConvert (JPG→PDF) → poll loop → 9 upload → 21 mark Cleaned`
- **Module 32 (`image:Resize`) is a no-op.** Set to `maximalHeight: 2048`; Make's resize only shrinks. Cached sample confirms 1320×595 in, 1320×595 out.
- CloudConvert engine is `imagemagick 7.1.2`. **The previous `INVALID_OPTION` failure came from here.** Do not retry darkening through CloudConvert.

### Existing infrastructure
- Cloud Run service: `diane-ticket-extractor`
  `https://diane-ticket-extractor-413667913571.us-central1.run.app`
- Existing endpoint: `POST /extract/ticket`, auth header `X-Diane-API-Key`, multipart with `file`, `submission_id`, `cleaned_file_id`
- Preserved working params: `skills/scale-ticket-processor/scripts/process_tickets.py:70` — `CONTRAST=2.2`, `BRIGHTNESS=0.80`, plus unsharp params

---

## 3. What to build

Add `POST /clean/ticket` to the existing `diane-ticket-extractor` Cloud Run service. Same auth header pattern.

### Request
Multipart: `file` (image bytes), `mode` (`ocr` | `human`), `submission_id` (for logging).

### Processing chain (order matters)

1. **Format normalize** — accept JPEG/PNG/HEIC/PDF, emit JPEG or PDF.
   HEIC support is required if folder-based ingest lands (see §6). Document AI and Vision do not accept HEIC. Use `pillow-heif`.
2. **Auto-crop to document — THIS IS THE PRIMARY GOAL.** Detect the ticket quadrilateral (largest 4-sided contour / edge detection) and crop.
   Driver 1's tickets occupy ~60% of the frame with truck interior around them, so they render small in the review form's embedded preview — that is the main reason Ernie zooms. Cropping makes the ticket fill the preview and may remove the need to zoom on many tickets *regardless* of contrast.
   **Must fail safe: if no confident quad is found, return the original uncropped rather than a bad crop.** A wrong crop that cuts off the ticket number is worse than no crop.
3. **Deskew** — perspective-correct to the detected quad, or rotate by dominant text-line angle if the quad is low-confidence.
4. **Upscale** — 2× with Lanczos, *after* crop. Won't create detail but gives the thresholding step more to work with and makes the review-form zoom usable.
5. **Contrast** — adaptive local (CLAHE or adaptive threshold), **not** a global brightness shift.

### Why adaptive, not global
Driver 1's images are washed out; driver 2's already have decent contrast. A fixed darken tuned for driver 1 will crush driver 2's tickets. Also: global `BRIGHTNESS=0.80` pushes paper and ink down equally, narrowing the gap — the opposite of what light tickets need. Widen the ink-to-paper gap, don't dim the whole frame.

### Two modes
| Mode | Purpose | Tuning |
|---|---|---|
| `ocr` | Review form display **first**, Document AI input second | Moderate; maximize glyph edge contrast. **Tune for Ernie's eyes.** He reviews all 33 tickets against this image every batch — it is the single highest-leverage output in the system. Where human legibility and DocAI preference conflict, favor human. |
| `human` | Broker-facing invoice attachments | Heavier. Start from preserved `CONTRAST=2.2` / unsharp. Optimize for a clean printed page. |

**Note on naming:** `ocr` is now a misnomer — this mode's primary consumer is the reviewer, not the extractor. Consider `review` instead.

---

## 4. Test set

Seven tickets with known extraction failures. Ernie has since corrected the dates in Airtable, but these remain the image test set — we know ground truth for all of them.

| Ticket | Source File ID (Drive) |
|---|---|
| 412600 | `1-RpbgdZWSInIk-vh7pBoRM2dCyqII8IW` |
| 412722 | `1DQfH9rrXbPKytgwrc3BSBl9hLVKS-Aby` |
| 411828 | `190eFH2tNJFTC1kZBrAcClJwvKWYJ4WF5` |
| 410959 | `1c__7hzORvpRr38cLYqh0UUBRz51nPenR` |
| 411142 | `1xps_qVy6dxdxMXVhJYVJOmDCA1VqFgkI` |
| 411539 | `1bMt9taf262JphT4WujGSwq-3rJjFoeFA` |
| 412078 | `1iPnFx_2shBOs-pN5YiaXvBjDTnJe8MTN` |

Ground truth (from Vision OCR + ticket-number sequencing):
- 412600 → `08/14/2026`, qty 24.76, truck wright3, tan base
- 412722 → `08/14/2026`, qty 24.66, truck wright3
- 411828 → `08/12/2026`, qty 24.68, truck wright3
- 410959 → `08/11/2026`, qty 24.56, truck wright2, tan base

**Baseline first.** Capture current Document AI output for all seven *before* changing anything. Without a baseline there's no way to tell whether a param change helped, hurt, or did nothing.

### Acceptance
- **Ernie eyeballs 3–4 `ocr`-mode outputs and confirms they're readable without zooming.** This is the primary success criterion — it's the time sink the whole task exists to remove.
- ≥5 of 7 return a correct date through `/extract/ticket` after preprocessing
- **`Parsed Truck` returns a consistent string across the batch.** Currently misreading `wright3` → `wight3` (dropped `r`) on at least 412600 and 411828, while 410959 reads `wright2` correctly. This directly breaks truck-based batch grouping — see §7.
- No regression: re-run the other 26 tickets, confirm no field that was correct becomes wrong

---

## 5. Integration into Scenario B

Once the endpoint is validated:

1. Insert an HTTP call to `/clean/ticket?mode=ocr` in B, after module 12 (download) and before module 8 (CloudConvert)
2. Feed the returned bytes into module 8's `{{46.Data}}` position
3. **Delete module 32** — it's a confirmed no-op, and upscaling now happens server-side
4. Leave CloudConvert doing only the JPG→PDF convert it currently does

`human` mode gets called later, in the invoice builder, not in B.

**Make constraints — read before touching any scenario:**
- All scenarios stay **Inactive**. Never activate. Never use the MCP `scenarios_run` tool (it force-activates). Ernie triggers everything via UI "Run once."
- `scenarios_update` requires the full blueprint. Pattern: fetch → patch → strip `metadata.designer.samples` → validate → push. The validator rejects `scheduling` and `interface` *inside* the blueprint object; pass them as sibling params.
- Airtable record counts are the only reliable verification. Make's green SUCCESS badge lies when `onerror: Ignore` is present.

---

## 6. Open item (may reorder priorities)

Run this to find out whether full-resolution driver photos exist in Messages:

```bash
find ~/Library/Messages/Attachments -type f \
  \( -iname '*.heic' -o -iname '*.jpg' -o -iname '*.jpeg' \) -mtime -45 \
  -exec sips -g pixelWidth -g pixelHeight {} \; 2>/dev/null \
  | grep pixel | paste - - | sort | uniq -c | sort -rn | head -15
```

- **Everything ~0.79 MP** → carrier ceiling, nothing to recover, proceed as specced
- **A cluster at 3024×4032** → driver-2 originals are full-res and the Photos round-trip is destroying them. Folder-based ingest becomes a genuine quality fix, not just a workflow one, and should jump ahead of preprocessing work.

Preprocessing is worth building either way — framing is the dominant variable and it's fixable at any resolution.

---

## 7. How this connects to auto-batching

Most batch dimensions are **not** extracted from the ticket — broker, customer/job, PO, work order, destination, and rate are dispatch/contract knowledge entered by Ernie in the review form. Image quality cannot help those.

The batch fields that **do** come from OCR are **truck ID** and **ticket date**. Both are currently degraded:

- `Parsed Truck` reads `wight3` on 412600 and 411828, but `wright2` on 410959. The dropped `r` is low-contrast glyph loss. If grouping keys on this string, one truck's tickets split across two batches.
- Dates drive period boundaries; the seven known-bad dates are documented in §4.

So the OCR → batching chain is real, but it runs specifically through truck and date. Improving those is the measurable batching win.

**Complementary fix worth doing regardless (deterministic, unlike image processing):**
Add `wight2` / `wight3` to the Trucks table `All Known Aliases` (`fldzJsyXJppGybuf3`) or the `Aliases` table (`tblFdkclbZCaaI8Ly`, which has `Maps To Truck` `fldAYovqiA8M5pvrL`). The alias infrastructure already exists and is unused for this. An alias map catches misreads even when preprocessing doesn't.

---

## 8. Related backlog (not this task)

- Scenario D `onerror: Ignore` on modules 5, 13, 25 — silent failure, still live
- Date range guard in D (clean insertion point after module 5, mirrors module 27's pattern)
- Vision OCR cross-check for dates using stored `Raw OCR Text` (`fld8twN1aSHmConvn`, OCR Outputs `tblVXINiOoN7hPGpa`)
- `Final Total (Legacy)` (`fld5IN6BntCd4wDJM`) deletion, pending clasp deploy
- `Extracted Truck` (`fldeNGlduy18CAFGX`) and `Parsed Driver` (`fldCBiZ6TMmE7dw1a`) are empty across processed tickets despite truck ID being present in raw OCR text — possible unmapped field, same class of omission as the earlier `ticket_date` mapping gap

**Resolved as of 2026-08-18 — do not re-investigate:**
- Review form ticket date now populates correctly
- Review form scan-persistence and zoom behavior fixed to acceptable standard
