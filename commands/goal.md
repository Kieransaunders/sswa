---
description: "Full-flow automation: propose + implement + verify in one command. After user accepts the proposal, runs apply and verify automatically without stopping for approval at each step."
argument-hint: "<change-name or idea>"
allowed-tools: Bash, Read, Write, Edit, Grep, Glob
---

Run the complete SSWA feature flow end-to-end: propose → apply → verify.

After you accept the proposal (with spec + failing tests), this command automates
implementation and testing without requiring approval at each intermediate step. Once
complete, the PR is ready for review and merge.

Read three skills before doing anything: `single-feature-flow`, `openspec-conventions`,
and `test-driven-development`.

## Step 0 — Preflight (from single-feature-flow)
1. **Scaffold on first run.** If `openspec/` is missing, create it. If root `AGENTS.md` has
   no `environment:` flag, create it from template set to `environment: development`,
   symlink `CLAUDE.md → AGENTS.md`.
2. **Environment guard (hard block):** confirm `AGENTS.md` flags `environment: development`.
3. **Agent-sync guard:** confirm `CLAUDE.md` is a symlink to `AGENTS.md`. Warn and fix if not.
4. **One-feature lock (warn only):** warn if another change is still in flight, but proceed
   if the user insists.

## Step 1 — Propose (create spec + failing tests)
Run the `/sswa:propose` logic:
1. `git checkout main && git pull`
2. `git checkout -b sswa/<change-name>`
3. Create OpenSpec artifacts: `proposal.md`, delta specs under `specs/`, optional `design.md`
4. Write **failing tests (RED)** for every scenario, placed in the project's test location
   and copied to `openspec/changes/<change-name>/tests/`
5. Run the suite and confirm every new test **fails for the right reason**
6. Write `tasks.md` checklist to turn each failing test green
7. **Commit the spec artifacts + RED tests together**

**STOP HERE and wait for user feedback.** The proposal, specs, and failing tests are the
contract. The user reviews them and confirms before moving forward.

## Step 2 — Apply (implement to GREEN) — *auto-run after user approval*
Only proceed if the user confirms the proposal is acceptable.

Run the `/sswa:apply` logic:
1. Confirm you're on the `sswa/<change-name>` branch
2. Read proposal.md, delta specs, design.md (if present), tasks.md
3. Confirm tests currently **fail (RED)**
4. **Implement to GREEN** one failing test at a time, no speculative features
5. After each test passes, run the full suite to ensure nothing broke, then refactor if useful
6. Check off tasks in `tasks.md` as they're completed
7. Commit in logical increments
8. **Done when:** every task is checked, every scenario's test passes, full suite is green

## Step 3 — Verify (validate + push + open PR) — *auto-run*
Run the `/sswa:verify` logic:
1. Validate against artifacts (completeness, correctness, coherence, format)
2. Confirm the full suite is green and every task is checked
3. Push the branch: `git push -u origin sswa/<change-name>`
4. **Open a PR into main.** Title = change title. Body = proposal's Why/What Changes/Impact,
   capabilities list, note that it shipped failing-test-first (link the RED proof)
5. **Promote to the test environment:** pull the branch into test-env and run the full suite
   there. Report results.

## Result
- Feature branch is pushed and PR is opened
- Test environment confirms the change is green
- PR is ready for review and merge
- Next step: reviewer approves → you merge to main → run `/sswa:archive`

## Key differences from running steps separately
- **No approval prompt between steps** — once you confirm the proposal, apply and verify
  run automatically
- **Faster iteration** — propose, implement, test, and push in one session
- **Same safety gates** — all preflight checks still apply; tests still guide implementation
