# Terminal & Git Glossary

Local, running reference for terminal/git/clasp commands used on Diane 2.0. This
replaced the ClickUp "Terminal & Git Glossary" doc as the system of record — the
ClickUp API connector was unreliable, so the `/checkpoint` skill now reads and
writes this file directly instead.

Entries are sorted alphabetically by command text. Each entry is a fenced code
block (the command) immediately followed by a plain-text description. When
adding a new entry, insert it in alphabetical order rather than appending to
the bottom.

```bash
cd /Users/erniehathaway/Projects/diane
```
Moves Terminal into the Diane repository folder.

```bash
clasp deploy -i <deployment-id> -V <version-number>
```
Updates a specific existing Apps Script deployment to an explicit version. The deployment ID and version number must be verified first; this is a live deployment change and should remain a separate approval from source sync and version creation.

```bash
clasp login
```
Authenticates the local clasp CLI with Google. Required when the session has expired (`invalid_grant` / `invalid_rapt` error on push). Opens a browser OAuth flow; after approval, credentials are stored locally so subsequent `clasp push` and `clasp deploy` calls work without re-auth.

```bash
clasp push
```
Syncs the connected local Apps Script project files to Apps Script. This is a live-source write and requires valid Google authentication; it does not itself create a version or update a deployment.

```bash
clasp version "Show Previous Batches as expandable batch summaries"
```
Creates a numbered Apps Script version from the currently synced project source with a descriptive release note. Creating a version does not update a web-app deployment by itself.

```bash
cp <file>.gs /tmp/<file>.js && node --check /tmp/<file>.js
```
Syntax-checks a Google Apps Script .gs file by copying it to a .js extension first. `node --check` rejects `.gs` outright with `ERR_UNKNOWN_FILE_EXTENSION`, so the copy is required.

```bash
gh auth status
```
Shows whether the gh CLI has an active, persistent GitHub login, which account, token scopes, and storage backend (keyring vs. plaintext).

```bash
git branch --show-current
```
Prints the name of the branch currently checked out.

```bash
git branch backup/pre-reconcile-2026-08-06
```
Creates a safety branch pointing at the current commit without switching branches.

```bash
git cherry-pick <commit>
```
Copies one specific commit onto the current branch.

```bash
git commit -m "message"
```
Records staged changes as a new commit with a descriptive message. Confirm `git diff --cached --stat` shows only the intended files before running this.

```bash
git diff --cached --check
```
Checks the currently staged changes for whitespace errors and conflict-marker problems before committing. No output means it passed.

```bash
git diff --cached --stat
```
Shows a compact summary of exactly what is staged for the next commit. Use it to confirm that only the approved checkpoint file is staged before committing.

```bash
git diff --check
```
Checks the current diff for whitespace errors and conflict-marker problems. No output means it passed.

```bash
git diff --stat
```
Shows a compact summary of changed files and line counts.

```bash
git diff -- <file>
```
Shows uncommitted changes in one file compared with the current local commit.

```bash
git diff origin/main -- <file>
```
Compares the current working copy of one file directly with GitHub's origin/main version.

```bash
git fetch origin main
```
Downloads the latest origin/main reference so local divergence can be inspected before integrating changes. It does not merge or change tracked working files.

```bash
git log --all --oneline --diff-filter=A --name-only
```
Lists every commit across all refs that *added* a file, with the added filenames. Useful for finding whether a file ever existed in history — including on branches that were never merged.

```bash
git log --oneline --decorate -8
```
Shows the last 8 commits in compact form with branch/tag labels. Useful right after a push to confirm the new HEAD landed.

```bash
git log --oneline --left-right --graph HEAD...origin/main
```
Compares local main with origin/main. `<` marks local-only commits and `>` marks remote-only commits.

```bash
git log -1 --format='%H %ci %s'
```
Prints the most recent commit as a single line: full hash, committer date in ISO format, and subject.

```bash
git ls-remote origin
```
Lists every ref on the remote with its commit hash, including branches that have never been fetched locally. Read-only; touches nothing in the working tree.

```bash
git ls-remote origin refs/heads/main
```
Reads the current remote commit for main without changing the local working tree; useful when a push is rejected and the remote has advanced.

```bash
git ls-tree --name-only <ref> <path>
```
Lists the files a given ref actually contains at a path, e.g. `git ls-tree --name-only origin/main docs/build-logs/`. Reads the remote-tracking tree directly, so it confirms what is really on origin without checking anything out.

```bash
git push origin main
```
Pushes committed local main history to the remote main branch. Do not force-push; if rejected because remote has advanced, fetch and reconcile first.

```bash
git rebase origin/main
```
Replays local commits on top of the latest remote branch to produce a linear history. Stop immediately if a conflict occurs; do not force-push as a workaround.

```bash
git remote -v
```
Shows the fetch and push URLs configured for the current checkout, which confirms the actual GitHub repository before a checkpoint or release.

```bash
git reset --hard origin/main
```
Moves local main to exactly match origin/main. Only use after protecting local work with a backup branch and stash.

```bash
git rev-list --left-right --count origin/main...HEAD
```
Reports the number of commits that exist only on the remote and only locally, respectively. Use this as a compact divergence check before a checkpoint push; it does not modify the working tree.

```bash
git rev-parse --show-toplevel
```
Prints the exact Git repository root, useful when similarly named Diane checkouts may exist.

```bash
git show --format= --no-ext-diff --unified=8 <commit> -- <file>
```
Shows the actual diff for one file in one commit, with eight lines of surrounding context.

```bash
git show --stat --oneline <commit>
```
Shows a commit summary and which files changed, without dumping the full patch.

```bash
git stash apply
```
Reapplies the newest stash but keeps the stash saved until you confirm the files restored correctly.

```bash
git stash list
```
Lists saved stashes.

```bash
git stash push -u -m "message"
```
Temporarily stores tracked and untracked local work. `-u` includes untracked files and folders; `-m` adds a readable label.

```bash
git status
```
Shows the current branch, modified files, untracked files, staged files, and whether local and remote history differ.

```bash
git status --short --branch
```
Compact one-line-per-file status plus current branch and ahead/behind tracking info against the remote, in a single glance.

```bash
grep -nE "pattern1|pattern2" <file>
```
Searches a file for either pattern and prints matching line numbers.

```bash
node --check < apps-script/Code.gs
```
Checks Apps Script JavaScript syntax by sending the .gs source through standard input, avoiding Node's unknown .gs file-extension error.

```bash
pwd
```
Prints the full path of the folder you are currently in.

```bash
security add-generic-password -s <service> -a "$USER" -w
```
Stores a secret in the macOS keychain under the given service name, prompting interactively for the value so it never lands in shell history. Retrieve it later with `security find-generic-password -s <service> -w`.

```bash
wc -l <file>
```
Prints the line count of a file. Accepts multiple files and prints a total, which makes it a fast way to gauge whether a doc is short enough to read in full.
