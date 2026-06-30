---
description: Implement the active change to GREEN — turn each failing test green one at a time, checking off tasks. (mirrors /opsx:apply)
argument-hint: "[change-name]"
allowed-tools: Bash, Read, Write, Edit, Grep, Glob
---

Implement the SSWA change: ${1:-the active change under openspec/changes/}.

Read `single-feature-flow`, `test-driven-development`, and `openspec-conventions` first.

## Preflight
Run the single-feature-flow preflight (environment flag + CLAUDE.md symlink). Confirm you
are on the change's `sswa/<change-name>` branch; if not, check it out.

## GREEN — one test at a time
The failing tests already exist (written at propose time). Now make them pass:

1. Read `proposal.md`, the delta `specs/`, `design.md` (if present), and `tasks.md`.
2. Confirm the change's tests currently **fail** (RED). If they unexpectedly pass, stop and
   reconcile with the spec before writing code.
3. Work the tasks in order. For each: write the **minimum** implementation to turn the
   relevant failing test green — no speculative features, no unrelated refactoring.
4. After each test goes green, run the **full suite** to confirm nothing else broke. Then
   REFACTOR if useful (keep tests green, add no behavior).
5. Check off the task in `tasks.md` (`- [x]`). Commit in logical increments.

## Done when
- Every task is checked, every scenario's test passes, the full suite is green, no warnings.
- Report status and the next step: `/sswa:verify`.

Never edit a test to make it pass — fix the implementation. If a test is genuinely wrong,
fix the spec and the test together, and re-confirm RED→GREEN.
