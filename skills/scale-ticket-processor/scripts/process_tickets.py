#!/usr/bin/env python3
"""
Scale Ticket Processor
======================
Extract a zip of scale ticket images/PDFs, sort by ticket number,
darken faded text (color-preserving), and merge into one PDF.

Usage:
    python3 process_tickets.py --zip tickets.zip --output out.pdf [--dpi 150] [--sort name|ocr]
"""

import argparse
import io
import os
import re
import sys
import tempfile
import zipfile

try:
    import pymupdf
except ImportError:
    sys.exit("pymupdf not found. Run: pip3 install --break-system-packages pymupdf")

try:
    from PIL import Image, ImageEnhance
except ImportError:
    sys.exit("Pillow not found. Run: pip3 install --break-system-packages Pillow")


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp", ".webp"}
PDF_EXT = ".pdf"

# Darkening pipeline parameters (tuned for Canfield Materials tickets)
CONTRAST   = 2.2
BRIGHTNESS = 0.80
SHARPNESS  = 2.0
JPEG_Q     = 88


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def natural_sort_key(path: str):
    """Sort key: splits filename into text/number chunks for natural ordering."""
    name = os.path.basename(path).lower()
    return [int(c) if c.isdigit() else c for c in re.split(r"(\d+)", name)]


def extract_ticket_number(pdf_path: str) -> int | None:
    """Try to read the 6-digit ticket # from a PDF page via text extraction."""
    try:
        doc = pymupdf.open(pdf_path)
        text = doc[0].get_text()
        doc.close()
        # Canfield ticket numbers are 6 digits, often preceded by "#" or alone on a line
        m = re.search(r"\b(4\d{5})\b", text)
        if m:
            return int(m.group(1))
    except Exception:
        pass
    return None


def darken_image(img: Image.Image) -> Image.Image:
    """Apply color-preserving contrast/brightness/sharpness pass."""
    img = ImageEnhance.Contrast(img).enhance(CONTRAST)
    img = ImageEnhance.Brightness(img).enhance(BRIGHTNESS)
    img = ImageEnhance.Sharpness(img).enhance(SHARPNESS)
    return img


def pdf_page_to_darkened_jpeg(page, dpi: int) -> bytes:
    """Render a PDF page, darken it, return JPEG bytes."""
    scale = dpi / 72
    mat = pymupdf.Matrix(scale, scale)
    pix = page.get_pixmap(matrix=mat, colorspace=pymupdf.csRGB, alpha=False)
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    img = darken_image(img)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=JPEG_Q, optimize=True)
    return buf.getvalue()


def image_to_darkened_jpeg(path: str, dpi: int) -> bytes:
    """Open an image file, darken it, return JPEG bytes."""
    img = Image.open(path).convert("RGB")
    img = darken_image(img)
    # Resize if the image's effective DPI would exceed target (keeps file size sane)
    max_px = int(dpi * 11)  # ~11-inch wide page at target DPI
    if max(img.width, img.height) > max_px * 1.5:
        ratio = (max_px * 1.5) / max(img.width, img.height)
        img = img.resize((int(img.width * ratio), int(img.height * ratio)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=JPEG_Q, optimize=True)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Core pipeline
# ---------------------------------------------------------------------------

def collect_files(zip_path: str, extract_dir: str) -> list[str]:
    """Extract zip and return all image/PDF paths (flattened)."""
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(extract_dir)

    collected = []
    for root, _, files in os.walk(extract_dir):
        for fname in files:
            if fname.startswith(".") or fname.startswith("__"):
                continue
            ext = os.path.splitext(fname)[1].lower()
            if ext in IMAGE_EXTS or ext == PDF_EXT:
                collected.append(os.path.join(root, fname))
    return collected


def sort_files(files: list[str], strategy: str) -> list[str]:
    """Sort files by strategy: 'name' (natural) or 'ocr' (ticket number)."""
    if strategy == "name":
        return sorted(files, key=natural_sort_key)

    if strategy == "ocr":
        pairs = []
        unresolved = []
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext == PDF_EXT:
                num = extract_ticket_number(f)
            else:
                # Convert image to temp PDF to attempt text extraction
                num = None  # images rarely have extractable text; fall back to name
            if num is not None:
                pairs.append((num, f))
            else:
                unresolved.append(f)

        pairs.sort(key=lambda x: x[0])

        if unresolved:
            print(f"  ⚠  OCR could not resolve ticket # for {len(unresolved)} file(s); "
                  f"appending them in name order:")
            for u in sorted(unresolved, key=natural_sort_key):
                print(f"       {os.path.basename(u)}")

        return [f for _, f in pairs] + sorted(unresolved, key=natural_sort_key)

    raise ValueError(f"Unknown sort strategy: {strategy!r}")


def build_pdf(files: list[str], output_path: str, dpi: int) -> int:
    """Process each file, darken, append to merged PDF. Returns page count."""
    merged = pymupdf.open()
    page_count = 0

    for idx, fpath in enumerate(files, 1):
        fname = os.path.basename(fpath)
        ext = os.path.splitext(fpath)[1].lower()
        print(f"  [{idx:02d}/{len(files)}] {fname}", end=" ... ", flush=True)

        if ext == PDF_EXT:
            src = pymupdf.open(fpath)
            for p in range(len(src)):
                jpeg_bytes = pdf_page_to_darkened_jpeg(src[p], dpi)
                rect = src[p].rect
                new_page = merged.new_page(width=rect.width, height=rect.height)
                new_page.insert_image(rect, stream=jpeg_bytes)
                page_count += 1
            src.close()

        elif ext in IMAGE_EXTS:
            jpeg_bytes = image_to_darkened_jpeg(fpath, dpi)
            # Standard landscape weight-ticket proportions (approx 8.5 × 5.5 in at 72pt/in)
            new_page = merged.new_page(width=612, height=396)
            new_page.insert_image(new_page.rect, stream=jpeg_bytes)
            page_count += 1

        print("done")

    merged.save(output_path, garbage=4, deflate=True)
    merged.close()
    return page_count


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Darken and merge scale tickets from a zip.")
    parser.add_argument("--zip",    required=True, help="Path to the input zip file")
    parser.add_argument("--output", required=True, help="Path for the output PDF")
    parser.add_argument("--dpi",    type=int, default=150, help="Render DPI (default 150)")
    parser.add_argument("--sort",   choices=["name", "ocr"], default="name",
                        help="Sort strategy: 'name' (filename) or 'ocr' (ticket number from text)")
    args = parser.parse_args()

    if not os.path.exists(args.zip):
        sys.exit(f"Zip not found: {args.zip}")

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)

    with tempfile.TemporaryDirectory() as tmpdir:
        print(f"Extracting: {os.path.basename(args.zip)}")
        files = collect_files(args.zip, tmpdir)
        print(f"Found {len(files)} ticket file(s)")

        if not files:
            sys.exit("No image or PDF files found in zip.")

        files = sort_files(files, args.sort)

        print(f"\nSort order ({args.sort}):")
        for i, f in enumerate(files, 1):
            print(f"  {i:02d}. {os.path.basename(f)}")

        print(f"\nDarkening at {args.dpi} DPI:")
        pages = build_pdf(files, args.output, args.dpi)

    size_mb = os.path.getsize(args.output) / 1_048_576
    print(f"\n✓ Done — {pages} page(s), {size_mb:.1f} MB")
    print(f"  Output: {args.output}")


if __name__ == "__main__":
    main()
