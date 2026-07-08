---
name: openspec-conventions
description: Use whenever you create, read, or modify anything under openspec/ — change proposals, delta specs, design docs, tasks, or when archiving a change. Defines the directory layout, the delta spec format (ADDED/MODIFIED/REMOVED/RENAMED Requirements), scenario rules, artifact templates, and the change lifecycle.
---

# OpenSpec Conventions

OpenSpec is spec-driven development for AI coding assistants. You agree on **what** to
build (a change proposal with specs) before writing code, then implement against that
agreement, then merge the agreed specs into the source of truth. SSWA uses OpenSpec's
artifacts and delta format unchanged.

This skill is the format reference. The workflow commands (`/sswa:explore`,
`/sswa:propose`, `/sswa:apply`, `/sswa:verify`, `/sswa:sync`, `/sswa:archive`) drive the
process; this skill keeps the artifacts well-formed.

## Directory layout

```
openspec/
├── project.md                 # Project context: stack, test/build/lint commands (optional)
├── specs/                     # SOURCE OF TRUTH — how the system behaves today
│   └── <capability>/
│       └── spec.md
└── changes/                   # In-flight work
    ├── <change-name>/
    │   ├── proposal.md        # Why + what changes
    │   ├── design.md          # How (only when warranted)
    │   ├── tasks.md           # Implementation checklist
    │   ├── tests/             # Failing tests written at propose time (TDD — RED)
    │   └── specs/             # DELTA specs, mirroring specs/ structure
    │       └── <capability>/spec.md
    └── archive/               # Completed changes
        └── <YYYY-MM-DD>-<change-name>/
```

- A **capability** is a kebab-case slice of behavior: `user-auth`, `payments`, `dark-mode`.
- `openspec/specs/` describes the system **as it currently behaves**. Never edit it by hand
  to describe future behavior — that is what a change is for. It is only updated by
  `/sswa:sync` / `/sswa:archive`, which merge a change's deltas in.
- `openspec/changes/<name>/specs/` holds **deltas**: the difference this change makes.

## Change names

Kebab-case, verb-led, scoped: `add-dark-mode`, `fix-rate-limit`, `refactor-auth-tokens`.
Avoid generic names like `update` or `changes`.

## The delta spec format

Delta spec files (`changes/<name>/specs/<capability>/spec.md`) declare changes relative to
the current specs, grouped under operation headers. Use level-2 headers:

```markdown
## ADDED Requirements
## MODIFIED Requirements
## REMOVED Requirements
## RENAMED Requirements
```

Only include the sections you need. Under each, list requirements.

### Requirements

```markdown
### Requirement: Users can sign in with email
The system MUST authenticate a user given a valid email and password, and MUST reject
invalid credentials.

#### Scenario: Valid credentials
- GIVEN a registered user
- WHEN they submit the correct email and password
- THEN they receive a session token
- AND the token expires after 24 hours

#### Scenario: Invalid password
- GIVEN a registered user
- WHEN they submit a wrong password
- THEN authentication is rejected with "Invalid credentials"
```

Rules — these are not stylistic, they parse:

- `### Requirement:` — one per requirement. Use RFC 2119 keywords (MUST / SHALL / SHOULD /
  MAY) in the body.
- `#### Scenario:` — **exactly four hashtags.** Three hashtags or a bullet list will be
  parsed as something else and silently dropped.
- **Every requirement MUST have at least one scenario.** A requirement with no scenario is
  invalid.
- Scenarios use `GIVEN` / `WHEN` / `THEN` / `AND` bullets. Cover the happy path and the
  important edge/error cases.

### Operation semantics (applied on sync/archive)

| Section | On sync/archive |
|---------|-----------------|
| `## ADDED Requirements` | Appended to the main spec for that capability. |
| `## MODIFIED Requirements` | Replaces the existing requirement with the same name. Note prior state inline, e.g. `(Previously: 30 minutes)`. |
| `## REMOVED Requirements` | Deleted from the main spec. Include a one-line reason. |
| `## RENAMED Requirements` | Renames a requirement header. State `From:` / `To:`. |

Operations apply in a strict order so headers resolve correctly:
**RENAMED → REMOVED → MODIFIED → ADDED.**

For `MODIFIED` / `REMOVED` / `RENAMED`, the requirement name MUST exactly match a
`### Requirement:` header that exists in the current `openspec/specs/`.

## Artifact templates

### proposal.md

```markdown
# <Change title>

## Why
1–2 sentences: the problem or opportunity.

## What Changes
- Bullet list of the changes. Mark breaking changes with **BREAKING**.

## Capabilities
- New: `<capability>`, ...
- Modified: `<capability>`, ...

## Impact
Affected systems, APIs, data, or users.
```

The **Capabilities** list is the contract: there must be one delta spec file per capability
listed here, and vice versa.

### design.md (create only when warranted)

Write a design doc only for cross-cutting changes, new dependencies, security/perf
concerns, or genuine ambiguity. Otherwise skip it.

```markdown
# Design: <Change title>

## Context
## Goals / Non-Goals
## Decisions
Each decision: what was chosen, and the alternatives considered.
## Risks / Trade-offs
## Migration Plan
## Open Questions
```

### tasks.md

A checklist that drives implementation. With the TDD step in `/sswa:propose`, tasks are
organized to turn each failing test green.

```markdown
# Tasks: <Change title>

## 1. <Group>
- [ ] 1.1 <task — references a failing test where relevant>
- [ ] 1.2 <task>

## 2. <Group>
- [ ] 2.1 <task>
```

`/sswa:apply` parses the `- [ ]` / `- [x]` checkboxes to track progress.

## Change lifecycle

The git/environment side of this loop (branching, PRs, `dev → test → main` promotion, the
one-feature-at-a-time rule, and the preflight guards) lives in the `single-feature-flow`
skill. The stages below are the artifact side.

1. **Explore** (optional) — think through the idea, read the code, weigh options. No files.
2. **Propose** — create the change folder: `proposal.md`, delta `specs/`, optional
   `design.md`, **failing tests (RED)**, then `tasks.md`. See `test-driven-development`.
3. **Apply** — implement, turning each failing test green and checking off tasks.
4. **Verify** — validate the implementation against the artifacts; full suite green.
5. **Archive** — once shipped, merge the deltas into `openspec/specs/` and move the change
   folder to `archive/<date>-<name>/`.

## Validation checklist

Before considering a change proposal complete:

- [ ] `proposal.md` has Why, What Changes, Capabilities, Impact.
- [ ] One delta spec file per capability listed in the proposal.
- [ ] Every `### Requirement:` has ≥1 `#### Scenario:` (exactly four hashtags).
- [ ] `MODIFIED` / `REMOVED` / `RENAMED` names match existing requirements in `openspec/specs/`.
- [ ] Failing tests exist and were observed to fail for the right reason (RED).
- [ ] `tasks.md` covers the work and references the tests to turn green.
