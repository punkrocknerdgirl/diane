---
name: scale-ticket-processor
description: Process a zip file of Canfield Materials scale ticket images or PDFs — sort by ticket number, darken faded text (color-preserving), merge into one PDF, and return the result. Invoke when the user provides a zip of scale tickets and says something like "process these", "darken and merge", or "make a ticket packet".
---

# Scale Ticket Processor

Turn a zip of faded scale-ticket scans into a clean, merged, legible color PDF.

## What this skill does

1. Accepts a zip file containing scale ticket images (JPG/PNG) or PDFs (one ticket per file).
2. Extracts and sorts tickets by ticket number (natural filename sort, with optional OCR fallback).
3. Applies a color-preserving darkening pipeline to each page (contrast + brightness + sharpness).
4. Merges all pages into a single output PDF.
5. Returns the output PDF to the user.

## Workflow

### Step 1 — Locate the zip

The user will have either:
- Attached a zip file directly in chat (it will appear in the conversation or be referenced by path), or
- Given a path to the zip on disk.

If no path is clear, ask: "What's the path to the zip file?"

### Step 2 — Run the processing script

Call the script with the zip path and an output path:

```bash
python3 /path/to/diane/skills/scale-ticket-processor/scripts/process_tickets.py \
  --zip "/path/to/tickets.zip" \
  --output "/path/to/output/Tickets_Darkened.pdf" \
  --dpi 150
```

**DPI guidance:**
- `150` (default) — good quality, reasonable file size (~3–5 MB per page)
- `96` — smaller files, still legible for sharing/email
- `300` — archival quality, large files

The script prints a summary of what it found, sort order, and final file size.

### Step 3 — Inspect the sort order

The script outputs a numbered list of files in the order they were processed. **Read it** and flag anything that looks wrong (e.g. a ticket out of sequence, a non-ticket file included). If the sort looks off, re-run with `--sort name` or `--sort ocr` to switch strategies.

Sort strategies:
- `name` (default) — natural alphanumeric sort of filenames. Works when files are named `ticket_01`, `ticket_02`, etc. or by ticket number.
- `ocr` — extracts the 6-digit ticket number from each image using PyMuPDF text extraction and sorts numerically. Use when filenames are arbitrary (e.g. IMG_4521.jpg).

### Step 4 — Return the PDF

Send the output PDF to the user with `SendUserFile`. State:
- How many tickets are in the packet
- The ticket number range (first → last) if OCR sort was used
- File size

If the file exceeds ~25 MB, offer to re-run at 96 DPI.

## Error handling

| Problem | Fix |
|---|---|
| Non-image files in zip (`.DS_Store`, `.txt`, etc.) | Script skips them automatically — just note any skipped files |
| A page is blank or all-white after darkening | Usually a blank back-of-ticket page; note it but don't fail |
| `pymupdf` not installed | Run `pip3 install --break-system-packages pymupdf` |
| `Pillow` not installed | Run `pip3 install --break-system-packages Pillow` |
| Zip contains nested folders | Script flattens the tree — all image/PDF files regardless of subfolder depth are included |

## Output naming convention

Default output name: `{ZIP_BASENAME}_Darkened.pdf`
Example: `Stumpy.zip` → `Stumpy_Darkened.pdf`

Save to the same directory as the input zip unless the user specifies otherwise.
