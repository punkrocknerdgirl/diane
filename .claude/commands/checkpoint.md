---
name: checkpoint
description: End-of-session Diane 2.0 checkpoint. Writes a local build log, commits and pushes it to GitHub, then updates the local Terminal & Git Glossary (docs/build-logs/terminal-and-git-glossary.md) with any new commands from the session. Runs fully unattended once invoked.
---

# Diane 2.0 Checkpoint

This command closes out a Diane 2.0 build session in one pass. Run it when Ernie says "checkpoint," "wrap it up," "let's stop here," or similar. Do not ask for confirmation between steps unless something below tells you to stop. Ernie does not want to babysit this — do all of it, in order, and report back once at the end.

## Step 0 — Verify environment before writing anything

1. Confirm local checkout path: `/Users/erniehathaway/Projects/diane`
2. Run `pwd` and `git rev-parse --show-toplevel` to confirm you are actually inside that repo, not a similarly named folder.
3. Run `git status --short --branch` to see current branch, staged/unstaged/untracked state.
4. Run `git remote -v` to confirm origin is `punkrocknerdgirl/diane`.
5. Run `git fetch origin main` then `git rev-list --left-right --count origin/main...HEAD` to check for divergence from remote before doing anything else.

**Stop and flag Ernie only if:**
- The repo root doesn't match the expected path
- Origin doesn't match `punkrocknerdgirl/diane`
- Local is behind origin/main (someone/something else pushed since last session)

Otherwise, proceed without asking.

## Step 1 — Write the local build log

Build log location: `docs/build-logs/`

Filename pattern: `YYYY-MM-DD-D20-<slug>.md` where `<slug>` is a short kebab-case description of the session's main work (e.g. `checkpoint-skill-clickup-sync-rework`).

Content structure (match the pattern already established in prior checkpoints — see examples in `docs/build-logs/`):

- `# Diane 2.0 Checkpoint: <title>`
- `**Date:**` and repo/checkout path
- `## Purpose` — one or two sentences, what this session was actually for
- `## Verified state` — what's actually confirmed true right now (commits, deployments, test results, table/record states) — never something assumed or reported-but-unverified. Use the "reported vs. verified" distinction the existing logs already use.
- `## What changed this session` — concrete, itemized
- `## What was NOT changed` — explicit exclusions, matching the existing guardrail habit of saying what was deliberately left alone
- `## Guardrails` — carry forward the standing Diane guardrails (see below) plus anything session-specific
- `## Next step` — the smallest next concrete action, not a wishlist

Do not overwrite or delete other build log files. Do not touch `docs/build-logs/build-log.md` (the running master log) unless explicitly asked — new sessions get their own dated file.

## Step 2 — Scan the session for new terminal/git commands

Review the current session's tool calls and any commands Ernie or Claude Code ran. Build a list of commands that:
- Are terminal, git, clasp, or related CLI commands
- Were actually run this session (not hypothetical/discussed-but-not-run)
- Are reusable/general (not one-off values like a specific commit hash or file path unique to this session — the *pattern* of the command, generalized, is what belongs in the glossary)

**Important:** also scan *prior* build logs for any previously-deferred glossary commands that were never actually confirmed added, and include those in this run's glossary pass too. Don't let deferred items get silently dropped a second time.

## Step 3 — Update the local Terminal & Git Glossary

File: `docs/build-logs/terminal-and-git-glossary.md`. This file is the system of record for the glossary — the ClickUp connector was unreliable and is no longer used for this step. No external API, no token, no network call.

1. Read the current file in full.
2. Parse existing entries. Each entry is a fenced code block (command) immediately followed by a plain-text description paragraph.
3. For each candidate command from Step 2: check if it (or a clear equivalent) already exists in the file. **Do not add duplicates.** Matching is on the command itself, not the description wording.
4. For genuinely new commands: write a description in the same voice/format as existing entries — plain, direct, states what the command does and any notable flag behavior. Match the terseness of the existing entries; don't over-explain.
5. Re-sort the **entire glossary section** alphabetically by command text.
6. If existing entries are already out of alphabetical order, fix that too as part of this same update — the instruction is "reorder it if commands have gotten out of order," not just "insert new ones correctly."
7. This is an **append-and-reorder** edit to existing content, not a wipe. Preserve every existing entry and its description exactly as written, just relocated to the correct alphabetical position. Leave the file's intro paragraph at the top as-is.
8. Write the file with `Edit`/`Write` directly. Before saving, diff the new content against what you read in step 1 and confirm no existing entry was dropped.

If there's nothing new to add, leave the file untouched (don't stage/commit it just to churn it).

## Step 4 — Commit and push

1. `git add docs/build-logs/<new-file>` and, if Step 3 changed it, `docs/build-logs/terminal-and-git-glossary.md` — stage **only** these files, nothing else, unless Ernie explicitly approved other changes for this checkpoint.
2. `git diff --cached --stat` — confirm only the intended file(s) are staged.
3. `git commit -m "Checkpoint: <short description>"`
4. `git push origin main`
5. `git log --oneline --decorate -5` to confirm the push landed and show the new HEAD.

If push is rejected because origin has moved: stop, do not force-push, flag Ernie with the exact error.

## Step 5 — Report back once, at the end

One summary message. Not a play-by-play. Include:
- Build log filename created
- Commit hash and confirmation it's pushed
- List of any new glossary entries actually added to `docs/build-logs/terminal-and-git-glossary.md` (or confirmation none were needed)
- Anything that got flagged/stopped and needs Ernie's input

## Standing Diane guardrails (carry forward every checkpoint)

- Diagnose before changing anything.
- Work one exact step at a time when interacting with Ernie during the actual build (this checkpoint process itself is the exception — it runs straight through).
- Preserve existing architecture and proven behavior unless redesign is explicitly requested.
- Do not change production Make modules or logic without explicit approval.
- Do not claim code was committed, pushed, deployed, tested, or verified unless it actually occurred — verified and reported-but-unverified are different categories and the build log must distinguish them.
- Protect client data and credentials — never expose API keys, PATs, tokens, or secrets in chat, logs, commits, or commands that echo them.
- Airtable remains the operational source of truth.
- Do not restore Google Sheets as the final architecture.
- Local checkout and GitHub main should stay in sync — the local folder is the working copy, GitHub is the record. Build logs are written locally first, then pushed, never edited directly on GitHub.
