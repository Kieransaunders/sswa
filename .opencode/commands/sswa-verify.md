---
description: Validate the implementation against the change's artifacts and run the full suite — then push, open the PR, and promote to the test environment. (mirrors /opsx:verify, plus the PR + test-env promotion)
---

Verify the SSWA change: ${1:-the active change}. This is `/opsx:verify` (validate
implementation vs. artifacts) extended with SSWA's git promotion: once it's correct, this
command pushes, opens the PR, and promotes to the **test** environment.

Read `openspec-conventions`, `test-driven-development`, and `single-feature-flow` first.
Report every check as pass/fail with the offending file.

## Preflight
Run the environment + symlink preflight (expect `environment: development`).

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

## 4. Promote to the test environment
- Pull the branch into the **test-environment** checkout (the one whose `AGENTS.md` flags
  `environment: test`).
- Run the **full suite there.** The change is cleared to merge only when the test
  environment is green. Report results.

## 5. Next
On review approval **and** a green test environment, merge the PR to `main` (squash per
repo convention). Once merged, run `/sswa:archive` to close it out.
