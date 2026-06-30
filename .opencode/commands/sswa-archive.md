---
description: Close out a merged change — sync its specs into the source of truth, move it to archive, delete the branch, ready the next feature. (mirrors /opsx:archive)
---

Archive the SSWA change: ${1:-the active change}. Read `single-feature-flow` and
`openspec-conventions` first.

## Preflight
- Run the environment + symlink preflight.
- **Confirm the change's PR is merged to `main`.** If it isn't, stop — the change must be
  shipped first (`/sswa:verify`, then merge).

## Steps
1. **Sync specs:** run the `/sswa:sync` logic — merge the change's delta specs into
   `openspec/specs/` (apply order RENAMED → REMOVED → MODIFIED → ADDED).
2. **Move the change folder:**
   ```bash
   git checkout main && git pull
   mkdir -p openspec/changes/archive
   git mv openspec/changes/<change-name> openspec/changes/archive/<YYYY-MM-DD>-<change-name>
   ```
   Use today's date (DD/MM/YYYY in prose, but the folder prefix is ISO `YYYY-MM-DD`).
3. **Commit** the spec merge + archived folder on `main` (or via a small follow-up PR if
   your repo protects `main`).
4. **Clean up the branch:**
   ```bash
   git branch -d sswa/<change-name>
   git push origin --delete sswa/<change-name>
   ```
5. **Report and loop:** confirm the source-of-truth specs now reflect the shipped behavior,
   then prompt the next feature: `/sswa:propose <next idea>`. One feature at a time —
   *so say we all.*
