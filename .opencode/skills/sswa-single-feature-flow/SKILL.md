---
name: single-feature-flow
description: Use at the start of every SSWA command (propose/apply/verify/sync/archive) and whenever managing branches or environments. Defines the preflight safety checks (environment flag + CLAUDE.md↔AGENTS.md symlink) and the one-feature-at-a-time shipping loop.
---

# Single-Feature Flow

SSWA ships **one feature at a time** through a fixed loop. The discipline is the point:
small, reviewable, fully-tested increments that get verified working, then promote
cleanly to main, then repeat.

```
pull main → new branch → propose (+RED tests) → apply (GREEN)
          → verify (validate + push + PR + verify the live change)
          → merge to main → archive → repeat
```

The command names are OpenSpec's `opsx` set, renamed `sswa:`. The git/environment steps
are folded **into** those commands — SSWA does not invent extra commands for branching,
PRs, or promotion.

If more than one agent may be active in this repo at once, "new branch" above means a
**git worktree**, not a checkout in the shared directory — see preflight check 4 below.

## Preflight — run before any mutating command

Every mutating SSWA command (`/sswa:propose`, `/sswa:apply`, `/sswa:verify`, `/sswa:sync`,
`/sswa:archive`) MUST run these checks first and stop on a hard failure.

### 1. Environment guard (hard block)

You only ever run the SSWA workflow in a **development** or **test** environment — never
directly against production/main. The environment is declared in the repo's root
`AGENTS.md` under an `## Environment` section:

```markdown
## Environment
- environment: development   # development | test — NEVER production
```

Check it:

```bash
grep -iE '^\s*-?\s*environment:\s*(development|test)\b' AGENTS.md
```

- **Missing or not development/test** → STOP. Tell the user the environment is not flagged
  as development or test. (On the very first `/sswa:propose`, scaffold it instead — see
  that command's Step 0.) Do not run git or file mutations against an unflagged repo.
- Record which environment you are in. `development` covers the whole loop end-to-end
  for most projects, including verify's live-verification step. A separate `test`-flagged
  checkout is only relevant if the project genuinely maintains one — don't assume every
  project has one; check the project's own docs (`AGENTS.md`, `README`) for how it
  actually verifies working branches (a test-environment checkout, a preview-deploy
  script, a local-preview technique like a symlinked worktree, etc.) before looking for
  a specific mechanism.

### 2. Agent-sync guard — CLAUDE.md is a symlink to AGENTS.md (warn, offer to fix)

`AGENTS.md` is the single source of agent instructions. `CLAUDE.md` MUST be a symlink to
it so Claude Code and any other agents read the same file and stay in sync.

```bash
[ -L CLAUDE.md ] && [ "$(readlink CLAUDE.md)" = "AGENTS.md" ] && echo OK || echo "NOT SYMLINKED"
```

- **Not a symlink** (a regular file, or missing) → warn the user. Offer to fix:
  ```bash
  # fold any real CLAUDE.md content into AGENTS.md first, then:
  rm -f CLAUDE.md && ln -s AGENTS.md CLAUDE.md
  ```
  Never silently overwrite a non-symlink `CLAUDE.md` that has unique content.

### 3. One-feature lock (warn only)

Look for change folders under `openspec/changes/` (excluding `archive/`) that are not yet
archived.

- **Another change is in flight** → warn: "<name> is still active — SSWA is one feature at
  a time. Finish/ship it before starting another?" Then let the user proceed if they
  insist. Do not hard-block.

### 4. Concurrent-agent check (warn, then isolate)

A shared working directory is mutable state: if another agent (or you, in another
session) might check out a branch or commit in this same directory while this change is
in flight, one agent's `git checkout`/commit changes the files out from under the other
mid-edit and branches end up intertwined.

- **Ask or infer** whether another agent/session may touch this repo concurrently. If yes
  (or unsure and the cost of asking is low), **use a worktree instead of branching in
  place** for Step 2/3 of `/sswa:propose` below:
  ```bash
  git fetch origin
  git worktree add ../<repo>-<change-name> -b sswa/<change-name> origin/main
  ```
  Do the rest of propose/apply/verify inside that worktree directory. On archive, remove
  it (`git worktree remove ../<repo>-<change-name>`) instead of just deleting the branch.
- **Single-agent, single-session work** can keep branching in place as written below —
  worktrees are for concurrency isolation, not a mandatory replacement.

## The loop, step by step

### Start a feature — `/sswa:propose`
1. Preflight (expect environment: **development**). Scaffold `openspec/` + `AGENTS.md` if
   this is the first run.
2. `git checkout main && git pull` — start from the latest main. **If concurrent agents may
   be active (see preflight check 4), use `git worktree add` instead** and do the rest of
   this loop inside that worktree.
3. `git checkout -b sswa/<change-name>` — one branch per feature, named after the change.
4. Generate OpenSpec artifacts (proposal, delta specs, optional design) — see
   `openspec-conventions`.
5. Write the **failing tests (RED)** for every scenario — see `test-driven-development`.
   Run them, confirm they fail for the right reason.
6. Write `tasks.md` organized around turning each failing test green.
7. Commit: spec artifacts + RED tests together.

### Build it — `/sswa:apply`
1. Preflight.
2. Implement to **GREEN**, one failing test at a time; check off tasks; refactor.
3. Commit as you go. Keep the suite green.

### Prove + ship it — `/sswa:verify`
1. Preflight. Validate the implementation against the artifacts; confirm the full suite is
   green and every task is checked.
2. Push the branch and open a **PR** into main.
3. **Verify the live change:** don't assume a separate test-environment checkout exists —
   check the project's own docs first. If it genuinely maintains one (`AGENTS.md` flags
   `environment: test` somewhere), pull the branch there and run the full suite. Otherwise
   use whatever verification mechanism the project actually provides (a documented
   local-preview technique, a preview-deploy script, `docker-compose up`, etc.) — for a
   UI/browser-facing change this usually means starting the app and clicking through the
   scenarios in `tasks.md`'s manual-verification section, not just running unit tests.
   Skip this step only for changes with no observable behavior (pure refactors, doc-only
   changes). The PR merges to main only after this passes.
4. On approval, **merge to main** (you do this; `/sswa:archive` then confirms it).

### Close it — `/sswa:archive`
1. Preflight. Confirm the PR is merged to main.
2. Sync: merge the change's delta specs into `openspec/specs/` (apply order
   RENAMED → REMOVED → MODIFIED → ADDED).
3. Move `openspec/changes/<name>/` to `openspec/changes/archive/<YYYY-MM-DD>-<name>/`.
4. Delete the feature branch. If the feature was built in a worktree, `git worktree
   remove ../<repo>-<change-name>` instead of a plain branch delete. Return to main, pull.
5. Optionally run the **Repo hygiene sweep** (above) to prune *other* merged branches, dead
   worktrees, and orphaned stashes — survey, confirm, then prune. **Repeat** with the next
   feature.

## Branch naming

`sswa/<change-name>` — same kebab-case name as the change folder, so branch, change, and
spec deltas all line up.

## Repo hygiene sweep (tidy-up)

Over many features a repo accumulates cruft: merged feature branches (local **and**
remote), leftover worktrees from concurrent-agent runs, and orphaned stashes from branches
that no longer exist. `/sswa:archive` cleans up the *current* feature; this is the
periodic *repo-wide* version, invoked from `/sswa:archive` (destructive prune) and flagged
by `/sswa:verify` (warning only). It is **destructive and opt-in — always survey and
confirm before deleting anything.**

**1. Survey (read-only).**
```bash
git fetch origin --prune
git worktree list
git branch -vv          # local, with tracking + ahead/behind
git branch -r           # remote
git stash list
gh pr list --state open   --json number,headRefName   # what is still live
gh pr list --state merged --json number,headRefName --limit 60
```

**2. Classify each branch / worktree / stash as _shipped_ or _live_.**
- **Shipped → prunable:** git-merged into `origin/main`, OR its `headRefName` maps to a
  **merged** PR. Squash-merges show as "unmerged / ahead 1" — trust the PR state, not
  `git branch --merged`. A worktree whose branch is shipped is prunable; a stash whose
  `On <branch>` no longer exists is orphaned.
- **Live → keep:** an **open** PR; a branch with unique un-PR'd commits you can't account
  for; the checkout/worktree the current session is running in; and `main`.
- A branch that is "ahead" but has no PR: read the commit (`git log origin/main..<branch>`)
  before judging — it is often a stale rebased duplicate of something already shipped, not
  new work.

**3. Present the classified list and get explicit sign-off** before any deletion. Never
bulk-delete on the `git branch --merged` signal alone (it misses squash-merges).

**4. Prune — only what was confirmed.**
```bash
# worktrees FIRST — a branch checked out in a worktree can't be deleted until it's removed
git worktree remove <path>          # add --force only for throwaway cruft, never over real work
git branch -D <branch>              # -D: squash-merged branches aren't fast-forward-merged
git push origin --delete <branch>   # ONE ref per call — batching refspecs is fragile
git stash drop 'stash@{n}'          # or `git stash clear` if all are orphaned
git worktree prune
```
Never remove the worktree the current session runs in, and never `--force` past uncommitted
work in another worktree. Auto-generated per-session branches (e.g. tool codename branches)
are the usual source of sprawl — a periodic sweep keeps them in check.
