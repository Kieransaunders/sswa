---
name: single-feature-flow
description: Use at the start of every SSWA command (propose/apply/verify/sync/archive) and whenever managing branches or environments. Defines the preflight safety checks (environment flag + CLAUDE.md↔AGENTS.md symlink) and the one-feature-at-a-time dev→test→main shipping loop.
---

# Single-Feature Flow

SSWA ships **one feature at a time** through a fixed loop. The discipline is the point:
small, reviewable, fully-tested increments that promote cleanly from development to test
to main, then repeat.

```
pull main → new branch → propose (+RED tests) → apply (GREEN)
          → verify (validate + push + PR + promote to test env)
          → merge to main → archive → repeat
```

The command names are OpenSpec's `opsx` set, renamed `sswa:`. The git/environment steps
are folded **into** those commands — SSWA does not invent extra commands for branching,
PRs, or promotion.

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
- Record which environment you are in; later steps depend on it (proposing/applying happens
  in **development**; promoting a PR happens in **test**).

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

## The loop, step by step

### Start a feature — `/sswa:propose`
1. Preflight (expect environment: **development**). Scaffold `openspec/` + `AGENTS.md` if
   this is the first run.
2. `git checkout main && git pull` — start from the latest main.
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
3. **Promote to the test environment:** pull the branch into the test-env checkout and run
   the full suite there. The PR merges to main only after test-env is green.
4. On approval, **merge to main** (you do this; `/sswa:archive` then confirms it).

### Close it — `/sswa:archive`
1. Preflight. Confirm the PR is merged to main.
2. Sync: merge the change's delta specs into `openspec/specs/` (apply order
   RENAMED → REMOVED → MODIFIED → ADDED).
3. Move `openspec/changes/<name>/` to `openspec/changes/archive/<YYYY-MM-DD>-<name>/`.
4. Delete the feature branch. Return to main, pull. **Repeat** with the next feature.

## Branch naming

`sswa/<change-name>` — same kebab-case name as the change folder, so branch, change, and
spec deltas all line up.
