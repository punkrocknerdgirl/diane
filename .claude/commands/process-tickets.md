---
name: process-tickets
description: Process a zip file of scale tickets — sort by ticket number, darken faded text (color-preserving), merge into one PDF, and return the result. Invoke when Ernie says "process these tickets", "darken and merge", or drops a zip of scale ticket images/PDFs.
---

# Process Scale Tickets

Run the scale ticket processor skill. Load and follow it now:

1. Load the skill: invoke `scale-ticket-processor` via the Skill tool.
2. Ask for the zip path if Ernie hasn't provided one yet.
3. Determine output path: same directory as the zip, named `{ZipBasename}_Darkened.pdf`.
4. Run the script:

```bash
python3 skills/scale-ticket-processor/scripts/process_tickets.py \
  --zip "PATH_TO_ZIP" \
  --output "OUTPUT_PATH" \
  --dpi 150
```

5. If output exceeds 25 MB, re-run at `--dpi 96` and note the size tradeoff.
6. Send the output PDF with `SendUserFile`.
7. Report: ticket count, sort order used, file size.
