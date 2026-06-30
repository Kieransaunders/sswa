---
description: "Full-flow automation: propose + implement + verify in one command. After user accepts the proposal, runs apply and verify automatically without stopping for approval at each step."
---

Run the complete SSWA feature flow end-to-end: propose → apply → verify.

After you accept the proposal (with spec + failing tests), this command automates
implementation and testing without requiring approval at each intermediate step. Once
complete, the PR is ready for review and merge.

Read three skills before doing anything: `single-feature-flow`, `openspec-conventions`,
and `test-driven-development`.

## Step 0 — Preflight (from single-feature-flow)
1. **Scaffold on first run.** If `openspec/` is missing, create it with complete structure:
   - `openspec/specs/` — source of truth for merged delta specs
   - `openspec/changes/` — active feature folders
   - `openspec/changes/archive/` — shipped features
   - `openspec/project.md` — project overview (stub)
   
   If root `AGENTS.md` has no `environment:` flag, create it from template set to
   `environment: development`, symlink `CLAUDE.md → AGENTS.md`.

2. **Environment guard (hard block):** confirm `AGENTS.md` flags `environment: development`
   or `environment: test`. If it reads anything else, STOP.

3. **Agent-sync guard (hard block):** confirm `CLAUDE.md` is a symlink to `AGENTS.md`. If not,
   STOP and offer to fix before continuing (never silently overwrite a non-symlink CLAUDE.md).

4. **One-feature lock (warn only):** warn if another change is still in flight, but proceed
   if the user insists.

## Step 1 — Propose (create spec + failing tests)
Run the `/sswa:propose` logic:
1. Detect the repository's default branch (e.g., via `git symbolic-ref refs/remotes/origin/HEAD`)
   and pull from it: `git checkout <default-branch> && git pull`
2. `git checkout -b sswa/<change-name>`
3. Create OpenSpec artifacts under `openspec/changes/<change-name>/`:
   - `proposal.md` — Why · What Changes · Capabilities · Impact
   - `specs/<capability>/spec.md` — delta specs (one per capability) with ADDED/MODIFIED/REMOVED/RENAMED Requirements and ≥1 Scenario per requirement
   - `design.md` — only if cross-cutting, adds dependencies, has security/perf concerns, or is genuinely ambiguous
4. Write **failing tests (RED)** for every scenario, placed in the project's test location
   and copied or linked to `openspec/changes/<change-name>/tests/`
5. Run the suite and confirm every new test **fails for the right reason**
6. Write `openspec/changes/<change-name>/tasks.md` checklist to turn each failing test green
7. **Commit the spec artifacts + RED tests together**
8. **Summarize:** branch name, capabilities, count of scenarios → failing tests (with RED proof),
   and the next step (`/sswa:apply` will auto-run after user approval).

**STOP HERE and wait for user feedback.** The proposal, specs, and failing tests are the
contract. The user reviews them and confirms before moving forward.

## Step 2 — Apply (implement to GREEN) — *auto-run after user approval*
Only proceed if the user confirms the proposal is acceptable.

Run the `/sswa:apply` logic:
1. Confirm you're on the `sswa/<change-name>` branch
2. Read `openspec/changes/<change-name>/proposal.md`, delta specs, `design.md` (if present), `tasks.md`
3. Confirm tests currently **fail (RED)**
4. **Implement to GREEN** one failing test at a time, no speculative features
5. After each test passes, run the full suite to ensure nothing broke, then refactor if useful
6. Check off tasks in `tasks.md` as they're completed
7. Commit in logical increments
8. **Done when:** every task is checked, every scenario's test passes, full suite is green

Report status: every task checked, all tests passing, and the next step (`/sswa:verify` will
auto-run immediately).

## Step 3 — Verify (validate + push + open PR) — *auto-run*
Run the `/sswa:verify` logic:
1. Validate against artifacts (completeness, correctness, coherence, format)
2. Confirm the full suite is green and every task is checked
3. Detect the repository's default branch (e.g., via `git symbolic-ref refs/remotes/origin/HEAD`)
4. Push the branch: `git push -u origin sswa/<change-name>`
5. **Open a PR into the default branch.** Title = change title. Body = proposal's Why/What Changes/Impact,
   capabilities list, note that it shipped failing-test-first (link the RED proof)
6. **Promote to the test environment (if configured):** 
   - Check if a `test-environment` checkout exists and has `AGENTS.md` flagged `environment: test`
   - If yes: pull the branch into test-env and run the full suite there. Report results.
   - If no: skip promotion and note that test environment is not configured for this repo

## Result
- Feature branch is pushed and PR is opened
- Test environment confirms the change is green (if configured)
- PR is ready for review and merge (manual steps: review, approval, merge to default branch)
- Next step (manual): reviewer approves → you merge to default branch → run `/sswa:archive` to close out

## Key differences from running steps separately
- **Single approval gate** — after propose creates the spec and failing tests, you review and
  confirm once. Then apply and verify run automatically (no approval prompt between them).
- **Faster iteration** — propose (with review pause), implement, test, and push in one session
- **Same safety gates** — all preflight checks still apply; environment guard protects against
  wrong branches; tests still guide implementation; full suite must be green before pushing
