# Agent Instructions

> Canonical instructions for all AI agents working in this repo.
> `CLAUDE.md` is a **symlink** to this file so Claude Code and other agents stay in sync.
> Do not edit `CLAUDE.md` directly — edit this file.

## Environment
- environment: development   # development | test — NEVER set to production. SSWA refuses to run otherwise.

## Workflow — SSWA (So Say We All)

This repo uses the **sswa** plugin: OpenSpec's `opsx` commands, renamed, with a TDD RED
step in `/propose` and a single-feature `dev → test → main` flow. One feature at a time.

- `/sswa:explore`  — think through an idea, read the code, no files written.
- `/sswa:propose`  — pull main, branch, write proposal + delta specs + **failing tests (RED)** + tasks.
- `/sswa:apply`    — implement to **GREEN**, one failing test at a time.
- `/sswa:verify`   — validate vs. artifacts, full suite green, push, open PR, promote to the test environment.
- `/sswa:sync`     — merge a change's delta specs into `openspec/specs/`.
- `/sswa:archive`  — confirm merged to main, sync specs, archive the change, delete the branch, next feature.

### Rules
- **One feature at a time.** Finish/ship the active change before proposing another.
- **No production code without a failing test first** (see the `test-driven-development` skill).
- Specs in `openspec/specs/` describe how the system behaves **today**; future behavior lives in
  a change under `openspec/changes/`.
- Branch per feature: `sswa/<change-name>`.
- **Concurrent agents → use a worktree, not a shared checkout.** If more than one agent
  session may be active in this repo at once, each gets its own
  `git worktree add ../<repo>-<change-name> -b sswa/<change-name> origin/main` instead of
  checking out branches in the same working directory. A shared checkout is mutable state
  one agent's branch switch/commit can corrupt under another mid-edit.

## Project context
<!-- Stack, key commands (test/build/lint), conventions, constraints. Fill this in. -->
- Test command: `<e.g. npm test>`
- Build command: `<e.g. npm run build>`
- Lint command: `<e.g. npm run lint>`
