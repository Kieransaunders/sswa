# SSWA — So Say We All

A Claude Code plugin that takes [OpenSpec](https://github.com/Fission-AI/OpenSpec)'s
`opsx` spec-driven workflow, renames it to `sswa:`, and adds two things on top:

1. **A TDD RED step inside `/sswa:propose`.** Adapted from
   [obra/superpowers](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md).
   The twist: the **failing tests are written at propose time**, as artifacts of the
   change, before any implementation exists. The agreed spec *and* its failing tests are
   the contract. *So say we all.*
2. **A single-feature dev→test→main shipping flow.** One feature per codebase at a time,
   promoted through `development → test → main`.

It is a *fork in spirit* of OpenSpec: same command names, same delta-spec format, same
artifacts — but self-contained as a plugin (no `openspec` CLI required) and opinionated
about TDD and git flow.

## Commands — same as OpenSpec's `opsx`, renamed

This plugin deliberately mirrors OpenSpec's **`opsx` core profile** (`explore`, `propose`,
`apply`, `sync`, `archive`) plus `verify`. The OpenSpec command on the left maps 1:1 to the
SSWA command on the right.

| OpenSpec        | SSWA              | What it does (SSWA additions in **bold**) |
|-----------------|-------------------|-------------------------------------------|
| `/opsx:explore` | `/sswa:explore`   | Think through an idea, read the code, weigh options. No files written. |
| `/opsx:propose` | `/sswa:propose`   | **Pull main, branch,** write proposal + delta specs + tasks — **plus the failing tests (RED).** Auto-scaffolds `openspec/` on first run. |
| `/opsx:apply`   | `/sswa:apply`     | Implement to **GREEN**, one failing test at a time. |
| `/opsx:verify`  | `/sswa:verify`    | Validate implementation against the artifacts and run the full suite — **then push, open the PR, and promote to the test environment.** |
| `/opsx:sync`    | `/sswa:sync`      | Merge a change's delta specs into the source of truth (`openspec/specs/`). |
| `/opsx:archive` | `/sswa:archive`   | **Confirm merged to main,** sync specs, archive the change, **delete the branch, loop.** |

> The OpenSpec expanded commands (`new`, `continue`, `ff`, `bulk-archive`, `onboard`) are
> deliberately left out — they exist to juggle multiple parallel changes, which is the
> opposite of SSWA's one-feature-at-a-time rule. Add them later if you ever want them.

## The loop

```
/sswa:explore  (optional — think first, no files)
      │
      ▼
/sswa:propose  → pull main → branch sswa/<name> → proposal + delta specs
               → FAILING tests (RED, confirmed failing) → tasks
      │
      ▼
/sswa:apply    → implement to GREEN, one test at a time, check off tasks
      │
      ▼
/sswa:verify   → validate vs artifacts + full suite green
               → push → open PR → promote to TEST environment → green there
      │
      ▼   (PR reviewed + merged to main)
/sswa:archive  → sync delta specs into openspec/specs/ → archive folder
               → delete branch → back to main → repeat
```

This is exactly your stated process: *dev environment → pull main → new branch → PR →
pull to test environment → merge to main → repeat.*

## Where your git flow lives

SSWA folds the whole `dev → test → main` flow into the OpenSpec command names — no extra
commands invented:

| Flow step                       | Command             |
|---------------------------------|---------------------|
| pull main + new branch          | start of `/sswa:propose` |
| write spec + **failing tests**  | `/sswa:propose`     |
| implement to green              | `/sswa:apply`       |
| push + open PR + promote to test| `/sswa:verify`      |
| merge to main (reviewed)        | you, then `/sswa:archive` confirms it |
| sync specs + archive + delete branch | `/sswa:archive` |

## Safety guards (preflight on every mutating command)

Defined in the `single-feature-flow` skill and run by `propose`, `apply`, `verify`,
`sync`, and `archive`:

- **Environment guard (hard block).** The repo's root `AGENTS.md` must flag
  `environment: development` or `environment: test`. SSWA refuses to run otherwise — you
  never run the workflow against production.
- **Agent-sync guard.** `CLAUDE.md` must be a symlink to `AGENTS.md` so every agent reads
  the same instructions. SSWA warns and offers to fix.
- **One-feature lock (warn).** Warns if another change is still in flight — SSWA is one
  feature at a time.

## Skills

- **`openspec-conventions`** — directory layout, the delta-spec format
  (ADDED / MODIFIED / REMOVED / RENAMED Requirements), scenario rules (four-hashtag
  `#### Scenario:`), artifact templates, the change lifecycle.
- **`test-driven-development`** — RED → GREEN → REFACTOR and the Iron Law, wired so the
  RED phase happens at `propose` time.
- **`single-feature-flow`** — the preflight guards and the `dev → test → main` loop.

## Install

```text
/plugin marketplace add Kieransaunders/sswa
/plugin install sswa@sswa
```

Then, in a project repo, just start — `/sswa:propose` will scaffold `openspec/` and
`AGENTS.md` (defaulting to `environment: development`) on first run:

```text
/sswa:propose add-dark-mode
```

## Install into other tools (.claude, .agent, .codex, .opencode …)

Claude Code picks this up automatically as a plugin. To install the same skills and
commands into **other** assistants — the way `openspec init` does — use the bundled
`install.mjs`. It reuses OpenSpec's tool→folder mapping (no `openspec` CLI required):

```bash
# from the plugin folder
node install.mjs --detect                       # install for any tool already set up in the repo
node install.mjs --tools claude,opencode,codex  # or name them explicitly
node install.mjs --all                           # every supported tool
node install.mjs --tools claude --project /path/to/repo --init-agents
node install.mjs --uninstall --tools opencode    # remove SSWA files again
```

It writes skills to `<tool>/skills/sswa-*/SKILL.md` and commands to each tool's own command
path (e.g. `.claude/commands/sswa/<id>.md`, `.opencode/commands/sswa-<id>.md`, Codex's
global `$CODEX_HOME/prompts/sswa-<id>.md`). `--init-agents` also drops the `AGENTS.md`
template and symlinks `CLAUDE.md → AGENTS.md`. Tool table covers ~20 assistants and is easy
to extend at the top of `install.mjs`.

## Layout

```
sswa/
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json
├── commands/        # explore, propose, apply, verify, sync, archive
├── skills/          # openspec-conventions, test-driven-development, single-feature-flow
├── templates/       # AGENTS.md template (with the environment flag)
└── install.mjs      # cross-tool installer (reuses OpenSpec's tool→folder mapping)
```

## Credits

- Spec-driven workflow, `opsx` command set & delta format:
  [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) (MIT).
- TDD discipline: [obra/superpowers](https://github.com/obra/superpowers).

## License

MIT — see [LICENSE](./LICENSE).
