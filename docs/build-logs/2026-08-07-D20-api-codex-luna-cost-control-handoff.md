# Diane 2.0 — API Codex / Luna Cost-Control Handoff

**Date:** 2026-08-07

## Purpose

Establish a lower-cost coding lane for Diane 2.0 so routine repository implementation does not depend on ChatGPT Work/Codex plan credits or reset windows.

## Verified repository state before checkpoint

Repository:

`punkrocknerdgirl/diane`

Latest verified GitHub `main` before this checkpoint commit:

`b4e396300038c657edf03df2ee935adb0911a593`

Message:

`Refine driver review controls and field order`

A local read-only Codex API test also reported:

- branch: `main`
- tracking: `origin/main`
- HEAD: `b4e396300038c657edf03df2ee935adb0911a593`
- local working tree contained modified and untracked files/directories
- no files were changed by the test

Do not assume the local working tree is clean.

## API-backed Codex setup completed

Codex CLI version observed before update:

`codex-cli 0.139.0`

Codex CLI supports API-key login using:

`codex login --with-api-key`

A previously existing OpenAI project API key was located and reused. The secret itself was never pasted into ChatGPT.

API-key authentication was verified successfully with:

`codex login status`

Result confirmed Codex was logged in using an API key.

## API billing state

OpenAI Platform API billing is separate from ChatGPT / Codex plan credits.

Initial API balance was:

`$0.00`

A small prepaid API balance was added for testing:

`$5.00`

Auto-reload was left OFF intentionally so API spending can be calibrated before enabling automatic purchases.

## Luna default configuration

Current Codex config file:

`~/.codex/config.toml`

Verified relevant settings:

```toml
model = "gpt-5.6-luna"
model_reasoning_effort = "low"
service_tier = "default"
```

Therefore the intended default cheap coding lane is:

- model: `gpt-5.6-luna`
- reasoning effort: `low`
- service tier: `default`

No config change was required because these values were already present.

Codex was updated after this inspection. Treat the update as successful unless a later version check shows otherwise.

## Controlled API test

A read-only Codex request was run against the Diane repository using Luna:

```bash
codex -m gpt-5.6-luna -s read-only -C /Users/erniehathaway/Projects/diane "Read the repository status and tell me the current branch and latest commit hash. Do not modify anything."
```

Verified result:

- API request completed successfully after API billing was funded
- branch: `main`
- HEAD: `b4e396300038c657edf03df2ee935adb0911a593`
- no files were modified
- OpenAI Platform Usage later showed approximately `$0.01` total usage for the test

This establishes that API-backed Luna is functioning as a practical low-cost Diane coding lane.

## Non-blocking warnings observed during test

Codex reported these warnings:

1. One Claude Cowork skill had invalid YAML and was skipped:
   - `anthropic-skills/.../skills/schedule/SKILL.md`
2. GitHub MCP failed to start because `GITHUB_PAT_TOKEN` was not set.
3. Codex reported that model metadata for `gpt-5.6-luna` was not found and fallback metadata was used.
4. WebSocket transport fell back to HTTPS.
5. Git emitted macOS sandbox-related `/tmp/xcrun_db` cache warnings during read-only inspection.

None of these prevented the local Git read or the API-backed Luna response.

Do not repair these warnings unless one becomes relevant to an actual task.

## New operating model for Diane

### ChatGPT Chat

Use for:

- project memory and continuity
- architecture discussions
- bookkeeping and business logic
- deciding what should change
- diagnosing across systems
- reviewing proposed approaches
- preparing exact implementation instructions

Prefer normal Chat over Work for discussion and decision-making when Work-specific agentic capabilities are not required.

### Local Codex CLI + OpenAI API + Luna

Use by default for:

- repository inspection
- narrow code changes
- Apps Script edits
- HTML / CSS / JavaScript changes
- Airtable adapters and field mappings
- tests
- diffs
- Git operations
- implementation from already-decided specifications
- build-log drafting when appropriate

Default model:

`gpt-5.6-luna`

### Escalation model

Use Luna first for routine work.

Escalate only when needed:

- Terra: harder debugging, multi-file reasoning, new subsystem design, unclear cross-system bugs
- Sol: major architecture, migration decisions, high-risk design choices, or cases where cheaper models cannot reliably resolve the problem

The exact escalation model IDs / pricing should be rechecked against current OpenAI Platform docs before changing configuration.

## Cost-control doctrine

- Do not top up ChatGPT coding credits merely to perform routine repository implementation if API-backed Luna can do the work.
- Keep API auto-reload OFF while calibrating real Diane usage.
- Check OpenAI Platform Usage periodically during the first several coding sessions.
- Use read-only sandbox mode for inspection-only tasks.
- Use workspace-write only when an implementation change is actually approved.
- Do not use expensive reasoning/model tiers for mechanical edits.
- Preserve stable prompt/context prefixes where practical so prompt caching can reduce repeated input cost.
- Keep changing task-specific instructions later in the prompt/context rather than rewriting stable Diane guardrails every request.

## Diane guardrails remain unchanged

- Diagnose before changing anything.
- Work one exact step at a time when interacting with Ernie.
- Preserve existing architecture and proven behavior unless redesign is requested.
- Do not change production Make modules or logic merely to make a synthetic test pass.
- Show exact proposed changes before modifying live systems when approval is required.
- Do not claim code was committed, pushed, deployed, tested, or verified unless it actually occurred.
- Protect client data and credentials.
- Do not expose API keys, PATs, tokens, or other secrets in chat, logs, repos, or commands that echo them.

## What was NOT changed in this setup session

- No Diane source file was intentionally edited.
- No Apps Script sync occurred.
- No Apps Script deployment occurred.
- No Make scenario was changed.
- No Airtable schema or record was changed.
- No Cloud Run deployment or configuration was changed.
- No API key secret was committed or pasted into chat.

## Smallest next move

Use normal ChatGPT Chat for the next Diane decision, then hand the exact implementation task to local Codex running Luna against:

`/Users/erniehathaway/Projects/diane`

Before allowing writes, inspect the current local Git status because the working tree was already modified/untracked before this cost-control setup.
