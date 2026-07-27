---

## description: Update the Diane 2.0 build log and generate a starter-text handoff for the next chat

# /checkpoint

Repo: `punkrocknerdgirl/diane` Build logs live at: `docs/build-logs/`

Run these steps in order. Do not skip the "read existing format" step — never invent a build-log structure from scratch.

## 1\. Read the most recent build log to match format exactly

- List files in `docs/build-logs/`, sorted by filename (they're date-prefixed, so this is chronological).  
- Open the most recent file and use it as the structural template: heading style, section order, level of detail, how module/scenario state is documented, how status labels are written.  
- Do not assume a fixed schema beyond this. The most recent file IS the schema.

## 2\. Determine what changed this session

Review the current conversation/session for:

- Which scenario, module, sheet, table, or script was worked on  
- What was diagnosed, confirmed, changed, or explicitly left unchanged  
- Any exact values confirmed (module IDs, field mappings, filters, record counts, status codes, output shapes)  
- Current status of each item touched: MAPPED / RUN TESTED / VALIDATED / PRODUCTION SAFE — only assign a status if it was actually confirmed this session, never inferred  
- What is explicitly NOT done yet / where the restart point is

If something is unknown or wasn't verified this session, write "unknown" or "not verified this session" — do not fill gaps with assumptions.

## 3\. Generate the filename

Format: `YYYY-MM-DD-D20-<slug>.md`

- Date \= today's date  
- Slug \= short kebab-case description of this session's main topic, generated from the actual session content (match the tone/length of existing filenames in `docs/build-logs/`, e.g. `ticket-detail-layout-and-refresh-state`, `scenario-04-dispatch-matching`)  
- Do not overwrite an existing file. If a file with today's date \+ a very similar slug already exists, ask before proceeding — do not silently append or overwrite.

## 4\. Write the build log file

- Follow the structure identified in step 1\.  
- Content must be exact and specific: real module numbers/IDs, real field names, real filter values, real status — not summarized or paraphrased into vagueness.  
- Distinguish production values from test values explicitly wherever both exist.  
- Do not include anything about Make, Airtable schema, or Google Sheets changes that did not actually happen — this is a record of truth, not a plan.

## 5\. Commit and push

- Stage only the new build-log file (and any other files actually changed this session, if applicable and already approved).  
- Commit message: short, descriptive, matches the tone of existing commit messages in this repo's history (e.g. "Document scenario 04 origin resolution").  
- Push to `main`.  
- Do NOT commit or push anything that wasn't explicitly part of this session's confirmed work. If unsure whether a file should be included, ask first.

## 6\. Generate the starter-text handoff (chat output only — never written to repo)

Produce a block of text the user can paste into a new claude.ai chat to resume work. This is NOT a fixed template — vary the sections based on what's actually relevant, but always include, where applicable:

- **Title** — one line, what this session/task is  
- **Repo** (if code work) — exact repo name  
- **Hard guardrails** — explicit "do not X" list for anything that must not happen without separate approval (e.g. do not modify Make, do not modify Airtable schema, do not deploy/commit/push without approval)  
- **Verified state** — exact current state as confirmed this session: file/function/ module names, confirmed data flow, exact values (counts, IDs, statuses) — never vague summaries  
- **What's NOT done / restart point** — the precise next unblocking action  
- **Immediate task** — what the next chat should do first, as concretely as possible (include a proposed diff/snippet if one was already scoped but not applied)  
- **Approval checkpoints** — if the next step requires showing a diff before editing, or requires explicit approval before commit/push/deploy, state that explicitly

Output this as a single copy-pasteable markdown block at the end of your response. Do not write this to any file in the repo.

## Notes

- This command is Claude Code only. In claude.ai chat mode, "checkpoint" only produces the starter-text handoff (step 6\) and tells the user to run `/checkpoint` in Claude Code to actually persist the build log.  
- If the session touched Diane 1.0 instead of 2.0, ask the user for the correct prefix before writing the filename — do not assume D20.

