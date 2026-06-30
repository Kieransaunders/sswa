---
description: Merge a change's delta specs into the source of truth (openspec/specs/) without archiving yet. (mirrors /opsx:sync)
---

Merge the delta specs for change: ${1:-the active change} into `openspec/specs/`. Read
`openspec-conventions` first.

For each `openspec/changes/<change-name>/specs/<capability>/spec.md`, apply its delta
operations into `openspec/specs/<capability>/spec.md` in this **strict order**:

1. **RENAMED Requirements** — rename the matching `### Requirement:` header.
2. **REMOVED Requirements** — delete the matching requirement.
3. **MODIFIED Requirements** — replace the matching requirement with the new version.
4. **ADDED Requirements** — append the new requirement(s).

Rules:
- `MODIFIED` / `REMOVED` / `RENAMED` names MUST match an existing requirement header in
  `openspec/specs/`. If one doesn't match, stop and report it rather than guessing.
- Preserve scenario formatting exactly (`#### Scenario:` with four hashtags).
- After merging, the source-of-truth spec should read as the system's behavior **today**.

This command only updates specs — it does not move the change folder or touch git. Most of
the time you won't call it directly; `/sswa:archive` runs this logic as its first step.
Report what was merged.
