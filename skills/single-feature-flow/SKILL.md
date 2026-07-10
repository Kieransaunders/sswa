---
name: single-feature-flow
description: Use at the start of every SSWA command (propose/apply/verify/sync/archive) and whenever managing branches or environments. Defines the preflight safety checks (environment flag + CLAUDE.md↔AGENTS.md symlink) and the parallel-develop / serial-ship loop — many features in flight via worktrees, one merged to main at a time.
---

# Single-Feature Flow

SSWA **ships one feature to main at a time** — but you may **develop several in parallel**,
each in its own git worktree. The discipline is at the finish line, not the workbench:
small, reviewable, fully-tested increments that get verified working, then promote cleanly
to main, **one merge at a time**.

```
pull main → worktree per feature → propose (+RED tests) → apply (GREEN)   ┐ parallel
          → verify (validate + push + PR + verify the live change)        ┘ (disjoint)
          → merge to main → archive                                        · serial
```

Parallel is safe **only for disjoint features** — ones touching different spec capabilities
and different source files. Overlapping features get sequenced, not parallelised (preflight
check 3).

The command names are OpenSpec's `opsx` set, renamed `sswa:`. The git/environment steps
are folded **into** those commands — SSWA does not invent extra commands for branching,
PRs, or promotion.

Each feature gets its own **git worktree** branched from `origin/main`, not a checkout in a
shared directory (see preflight check 4). Worktrees make the *working directory* safe to
parallelise; the serialisation that remains is at *merge/promote* time (preflight check 3) —
one `main`, one `openspec/specs/`, and one test environment if the project keeps one.

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

### 3. Shipping-lane lock + disjointness (warn only)

Multiple changes may be in flight at once — that is fine when they are **disjoint**. What
must stay serial is the **finish line** (`/sswa:verify` → merge → `/sswa:archive`), because
all changes share one `main` and one `openspec/specs/` (plus one test environment, if the
project keeps one). Worktrees (check 4) removed the working-directory danger; they did
**not** remove this one.

Look for other change folders under `openspec/changes/` (excluding `archive/`). For each,
compare it to the change you are starting:

- **Overlapping** — it declares a delta for the same capability (`specs/<capability>/`) or
  edits the same source files → warn: "<name> touches the same specs/files — sequence these
  or expect merge/sync conflicts." Recommend finishing one before proposing the other.
- **Disjoint** — different capabilities and different files → fine to develop in parallel.
- **Any change currently mid-verify/merge** (it owns the ship lane) → warn: finish
  shipping it before you promote this one. The ship lane is single-file.

Never hard-block — warn and let the user decide.

### 4. Isolate each feature in a worktree (default when work runs in parallel)

A shared working directory is mutable state: if another agent (or you, in another session)
checks out a branch or commits in the same directory while this change is in flight, one
agent's `git checkout`/commit changes the files out from under the other mid-edit and
branches intertwine. A worktree removes this entirely — its own checkout, own HEAD, own
index.

- **Default for any parallel work: one worktree per feature**, branched from `origin/main`:
  ```bash
  git fetch origin
  git worktree add ../<repo>-<change-name> -b sswa/<change-name> origin/main
  ```
  Do the rest of propose/apply/verify inside that worktree. On archive, `git worktree
  remove ../<repo>-<change-name>` instead of just deleting the branch.
- **Branch each worktree from `origin/main`, never from another feature's branch** — that
  independence is what lets disjoint features merge back in any order.
- Worktrees fix the *working-directory* danger only. The *finish-line* danger (shared main,
  specs, and any test env) is governed by check 3 — parallelise development, serialise shipping.
- **A single quick change with nothing else in flight** can branch in place — worktrees are
  the tool for isolation, not a mandatory replacement.

## The loop, step by step

### Start a feature — `/sswa:propose`
1. Preflight (expect environment: **development**). Scaffold `openspec/` + `AGENTS.md` if
   this is the first run.
2. Start from the latest main. **Default: `git worktree add ../<repo>-<change-name> -b
   sswa/<change-name> origin/main`** (see preflight check 4) and do the rest of this loop
   inside that worktree. A lone quick change with nothing else in flight may instead
   `git checkout main && git pull`.
3. One branch per feature, named after the change (`sswa/<change-name>`) — created by the
   worktree add above, or `git checkout -b` if branching in place.
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
   worktrees, and orphaned stashes — survey, confirm, then prune.
6. **Repeat** — or, if disjoint features were developed in parallel, promote the next one
   through verify → merge → archive (the ship lane is serial; see preflight check 3).

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
