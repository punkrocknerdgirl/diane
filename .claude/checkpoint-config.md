# Checkpoint config

- **Display name:** Diane 2.0
- **Slug:** diane
- **Expected origin:** punkrocknerdgirl/diane
- **Expected checkout:** /Users/erniehathaway/Projects/diane
- **Log directory:** docs/build-logs/
- **Filename prefix:** D20-
- **Glossary:** docs/build-logs/terminal-and-git-glossary.md
- **Bugs log:** docs/build-logs/diane-2.0-bugs.md

## Standing guardrails

- Diagnose before changing anything.
- Work one exact step at a time when interacting with Ernie during the build.
  The checkpoint process itself is the exception — it runs straight through.
- Preserve existing architecture and proven behavior unless redesign is
  explicitly requested.
- Do not change production Make modules or logic without explicit approval.
- Do not claim code was committed, pushed, deployed, tested, or verified unless
  it actually occurred. Verified and reported-but-unverified are different
  categories and the build log must distinguish them.
- Protect client data and credentials — never expose API keys, PATs, tokens, or
  secrets in chat, logs, commits, or commands that echo them.
- Airtable remains the operational source of truth.
- Do not restore Google Sheets as the final architecture.
- Local checkout and GitHub main stay in sync — the local folder is the working
  copy, GitHub is the record. Build logs are written locally first, then pushed,
  never edited directly on GitHub.
