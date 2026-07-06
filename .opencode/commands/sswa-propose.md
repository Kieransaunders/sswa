---
description: Pull main, branch, and create a full change proposal — proposal.md, delta specs, optional design, FAILING tests (RED), and tasks. Scaffolds openspec/ on first run. (mirrors /opsx:propose, with a TDD RED step)
argument-hint: "<change-name or idea>"
allowed-tools: Bash, Read, Write, Edit, Grep, Glob
---

Create a complete SSWA change proposal for: $ARGUMENTS

This is `/opsx:propose` with one addition: **the failing tests (RED) are written here, at
propose time**, as artifacts of the change. Read three skills before doing anything:
`single-feature-flow`, `openspec-conventions`, and `test-driven-development`.

## Step 0 — Preflight (from single-feature-flow)
1. **Scaffold on first run.** If `openspec/` is missing, create it
   (`specs/`, `changes/`, `changes/archive/`, `project.md` stub). If root `AGENTS.md` has
   no `environment:` flag, create it from `${CLAUDE_PLUGIN_ROOT}/templates/AGENTS.md` set
   to `environment: development`, symlink `CLAUDE.md → AGENTS.md`, tell the user, and
   continue. (This folds OpenSpec's `openspec init` into the first propose.)
2. **Environment guard (hard block):** confirm `AGENTS.md` flags
   `environment: development` or `test` (proposing happens in **development**). If it reads
   anything else, STOP.
3. **Agent-sync guard:** confirm `CLAUDE.md` is a symlink to `AGENTS.md`. If not, warn and
   offer to fix before continuing.
4. **One-feature lock (warn only):** if another change under `openspec/changes/` is not yet
   archived, warn that SSWA is one feature at a time and let the user decide.

## Step 1 — Branch from latest main
```bash
git checkout main && git pull
git checkout -b sswa/<change-name>
```
Pick a kebab-case, verb-led `<change-name>`. If the input was a vague idea rather than a
name, confirm the name with the user first.

**If another agent/session may be active in this same repo, use a worktree instead** (see
`single-feature-flow` preflight check 4) so the two never share a mutable checkout:
```bash
git fetch origin
git worktree add ../<repo>-<change-name> -b sswa/<change-name> origin/main
```
Then run every remaining step of propose/apply/verify from inside that worktree directory.

## Step 2 — OpenSpec artifacts (see openspec-conventions)
Create `openspec/changes/<change-name>/`:
- **proposal.md** — Why · What Changes · Capabilities (kebab-case New/Modified) · Impact.
- **specs/<capability>/spec.md** — one delta file per capability in the proposal. Use
  `## ADDED/MODIFIED/REMOVED/RENAMED Requirements`, `### Requirement:` (RFC 2119 keywords),
  and `#### Scenario:` blocks (**exactly four hashtags**, GIVEN/WHEN/THEN/AND). Every
  requirement needs ≥1 scenario. Cover happy path and edge/error cases.
- **design.md** — only if the change is cross-cutting, adds dependencies, has security/perf
  concerns, or is genuinely ambiguous. Otherwise skip it.

## Step 3 — RED: write the failing tests (see test-driven-development)
**This is the SSWA addition to propose. Write NO implementation code in this step.**
1. For **each `#### Scenario:`**, write a test that encodes its GIVEN/WHEN/THEN using the
   project's test framework (infer it from the repo; if none exists, set up the minimal
   conventional one and note it in `project.md`).
2. Place the tests in the project's test location, and copy/link them under
   `openspec/changes/<change-name>/tests/` as artifacts of the change.
3. **Run the suite and confirm every new test FAILS for the right reason** — a missing
   capability, not a syntax/import error. Fix any *errored* (vs. cleanly *failed*) tests
   until you get clean assertion failures. Record the RED run output.
4. If a test passes already, that behavior exists — adjust the scenario/spec accordingly.

## Step 4 — tasks.md
Write `tasks.md` as a checklist organized to turn each failing test green, in dependency
order. Reference the scenario/test each task satisfies. Format: `- [ ] 1.1 ...`.

## Step 5 — Commit and report
- Commit the spec artifacts **and** the RED tests together on the feature branch.
- Summarize: branch name, capabilities, count of scenarios → failing tests (with the RED
  proof), and the next step: `/sswa:apply`.
