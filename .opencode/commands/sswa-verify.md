---
description: Validate the implementation against the change's artifacts and run the full suite — then push, open the PR, and verify the live change. (mirrors /opsx:verify, plus the PR + verification)
argument-hint: "[change-name]"
allowed-tools: Bash, Read, Write, Edit, Grep, Glob
---

Verify the SSWA change: ${1:-the active change}. This is `/opsx:verify` (validate
implementation vs. artifacts) extended with SSWA's git promotion: once it's correct, this
command pushes, opens the PR, and verifies the change is actually working live (see step 4
— don't assume a separate test-environment checkout exists; check the project's own docs).

Read `openspec-conventions`, `test-driven-development`, and `single-feature-flow` first.
Report every check as pass/fail with the offending file.

## Preflight
Run the environment + symlink preflight (expect `environment: development`).

**Hygiene glance (non-destructive).** Run `git fetch --prune` and `git worktree list`. If
you spot stale worktrees from concurrent-agent runs or a pile of merged-but-undeleted
branches, mention it and point to `/sswa:archive`'s **Repo hygiene sweep**. Do **not**
delete anything here — the feature isn't merged yet, so pruning is archive's job.

## 1. Validate against artifacts (the opsx:verify part)
- **Completeness:** every task in `tasks.md` is checked; every `### Requirement:` /
  `#### Scenario:` has corresponding implementation; no scenario left uncovered.
- **Correctness:** the implementation matches the spec's intent; edge/error scenarios are
  handled as written.
- **Coherence:** any `design.md` decisions are reflected in the code; naming/patterns
  consistent.
- **Format gate:** delta files use only `## ADDED/MODIFIED/REMOVED/RENAMED Requirements`;
  every requirement has ≥1 `#### Scenario:` with **exactly four hashtags**;
  `MODIFIED/REMOVED/RENAMED` names match existing headers in `openspec/specs/`.
- **TDD gate:** a test exists for every scenario, and the RED proof was recorded at propose
  time. Report issues as CRITICAL / WARNING / SUGGESTION (warnings don't block).

## 2. Full suite must be green
Run the full test suite. If anything is red or any task is unchecked, STOP and go back to
`/sswa:apply`.

## 3. Push + open PR
```bash
git push -u origin sswa/<change-name>
```
Open a PR into `main` (confirm before creating). Title = the change title; body = the
proposal's Why / What Changes / Impact, the capabilities list, and a note that the change
shipped failing-test-first (link the RED proof). Use `gh pr create` or the repo's GitHub
tooling.

## 4. Verify the live change
Don't assume a separate test-environment checkout exists — check the project's own docs
(`AGENTS.md`, `README`) for how it actually verifies working branches first:
- **If the project genuinely maintains a test-environment checkout** (its `AGENTS.md`
  flags `environment: test` somewhere, or docs say so explicitly): pull the branch there
  and run the full suite. The change is cleared to merge only when that's green.
- **Otherwise**, use whatever verification mechanism the project actually documents — a
  local-preview technique (e.g. a symlinked worktree that lets a branch run side-by-side
  with the main checkout), a preview-deploy script, `docker-compose up`, etc. For any
  change with observable behavior (UI, API, CLI output), start the app and click/run
  through the scenarios in `tasks.md`'s manual-verification section — don't rely on unit
  tests alone to certify a user-facing change. If a scenario needs live third-party data
  unavailable in this environment, mock the call instead of skipping the check.
- Skip this step only for changes with no observable behavior (pure refactors, doc-only
  changes).
- Report pass/fail per scenario. The change is cleared to merge only when this is green.

## 5. Next
On review approval **and** a green live verification, merge the PR to `main` (squash per
repo convention). Once merged, run `/sswa:archive` to close it out.
