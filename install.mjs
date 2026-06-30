#!/usr/bin/env node
/**
 * SSWA installer — reuses OpenSpec's tool→folder mapping to install the SSWA
 * skills and commands into one or more AI coding assistants in a project.
 *
 * Skills  → <toolDir>/skills/sswa-<name>/SKILL.md
 * Commands→ tool-specific path (see TOOLS below), files named sswa-<id> / sswa/<id>
 *
 * Zero dependencies. Node 18+.
 *
 *   node install.mjs --tools claude,opencode,codex      # install for named tools
 *   node install.mjs --detect                            # only tools already present in the project
 *   node install.mjs --all                               # every tool in the table
 *   node install.mjs --tools claude --project /path/to/repo
 *   node install.mjs --tools claude --init-agents        # also drop AGENTS.md + CLAUDE.md symlink
 *   node install.mjs --uninstall --tools claude          # remove SSWA files for those tools
 *
 * The OpenSpec equivalent is `openspec init` / `openspec update`. This is the
 * lifted, plugin-sized version of that mechanism.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const PLUGIN_ROOT = path.dirname(fileURLToPath(import.meta.url));
const NS = 'sswa';

// Tool table — skillsDir + how each tool wants its command files laid out.
// Lifted from OpenSpec's AI_TOOLS registry + docs/supported-tools.md.
//   cmd.dir     — directory (relative to project, or absolute for global)
//   cmd.style   — 'flat'   → <dir>/sswa-<id>.<ext>
//                 'subdir' → <dir>/sswa/<id>.<ext>
//   cmd.ext     — file extension (default 'md')
//   cmd.global  — resolve dir against $CODEX_HOME / home, not the project
//   cmd: null   — tool has no command adapter; skills only
const TOOLS = {
  claude:         { skillsDir: '.claude',      cmd: { dir: '.claude/commands',    style: 'subdir' } },
  antigravity:    { skillsDir: '.agent',       cmd: { dir: '.agent/workflows',    style: 'flat'   } },
  codex:          { skillsDir: '.codex',       cmd: { dir: 'prompts', style: 'flat', global: 'codex' } },
  opencode:       { skillsDir: '.opencode',    cmd: { dir: '.opencode/commands',  style: 'flat'   } },
  cursor:         { skillsDir: '.cursor',      cmd: { dir: '.cursor/commands',    style: 'flat'   } },
  windsurf:       { skillsDir: '.windsurf',    cmd: { dir: '.windsurf/workflows', style: 'flat'   } },
  cline:          { skillsDir: '.cline',       cmd: { dir: '.clinerules/workflows', style: 'flat' } },
  kilocode:       { skillsDir: '.kilocode',    cmd: { dir: '.kilocode/workflows', style: 'flat'   } },
  roocode:        { skillsDir: '.roo',         cmd: { dir: '.roo/commands',       style: 'flat'   } },
  crush:          { skillsDir: '.crush',       cmd: { dir: '.crush/commands',     style: 'subdir' } },
  'github-copilot': { skillsDir: '.github',    cmd: { dir: '.github/prompts',     style: 'flat', ext: 'prompt.md' } },
  'amazon-q':     { skillsDir: '.amazonq',     cmd: { dir: '.amazonq/prompts',    style: 'flat'   } },
  auggie:         { skillsDir: '.augment',     cmd: { dir: '.augment/commands',   style: 'flat'   } },
  factory:        { skillsDir: '.factory',     cmd: { dir: '.factory/commands',   style: 'flat'   } },
  junie:          { skillsDir: '.junie',       cmd: { dir: '.junie/commands',     style: 'flat'   } },
  iflow:          { skillsDir: '.iflow',       cmd: { dir: '.iflow/commands',     style: 'flat'   } },
  qoder:          { skillsDir: '.qoder',       cmd: { dir: '.qoder/commands',     style: 'subdir' } },
  // Skills-only tools (no command adapter in OpenSpec):
  kimi:           { skillsDir: '.kimi',        cmd: null },
  trae:           { skillsDir: '.trae',        cmd: null },
  vibe:           { skillsDir: '.vibe',        cmd: null },
  forgecode:      { skillsDir: '.forge',       cmd: null },
};

// ---- args -------------------------------------------------------------
const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : undefined;
};
const project = path.resolve(typeof opt('project') === 'string' ? opt('project') : process.cwd());
const wantUninstall = !!opt('uninstall');
const initAgents = !!opt('init-agents');

let selected = [];
if (opt('all')) selected = Object.keys(TOOLS);
else if (opt('detect')) selected = Object.keys(TOOLS).filter((t) => fs.existsSync(path.join(project, TOOLS[t].skillsDir)));
else if (typeof opt('tools') === 'string') selected = opt('tools').split(',').map((s) => s.trim()).filter(Boolean);

if (!selected.length) {
  console.log(`SSWA installer\n\nUsage:\n  node install.mjs --tools claude,opencode,codex\n  node install.mjs --detect        # tools already present in the project\n  node install.mjs --all\n  add --project <path>, --init-agents, or --uninstall\n\nKnown tools: ${Object.keys(TOOLS).join(', ')}`);
  process.exit(1);
}
const unknown = selected.filter((t) => !TOOLS[t]);
if (unknown.length) { console.error(`Unknown tool(s): ${unknown.join(', ')}`); process.exit(1); }

// ---- read source artifacts -------------------------------------------
const skills = fs.readdirSync(path.join(PLUGIN_ROOT, 'skills'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => ({ name: d.name, body: fs.readFileSync(path.join(PLUGIN_ROOT, 'skills', d.name, 'SKILL.md'), 'utf8') }));
const commands = fs.readdirSync(path.join(PLUGIN_ROOT, 'commands'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => ({ id: f.replace(/\.md$/, ''), body: fs.readFileSync(path.join(PLUGIN_ROOT, 'commands', f), 'utf8') }));

const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
const writes = [];
const removed = [];

function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }
function write(file, body) { mkdirp(path.dirname(file)); fs.writeFileSync(file, body); writes.push(file); }
function rmrf(p) { if (fs.existsSync(p)) { fs.rmSync(p, { recursive: true, force: true }); removed.push(p); } }

for (const tool of selected) {
  const t = TOOLS[tool];
  // Skills: <skillsDir>/skills/sswa-<name>/SKILL.md
  for (const s of skills) {
    const dir = path.join(project, t.skillsDir, 'skills', `${NS}-${s.name}`);
    if (wantUninstall) { rmrf(dir); continue; }
    write(path.join(dir, 'SKILL.md'), s.body);
  }
  // Commands
  if (t.cmd) {
    const ext = t.cmd.ext || 'md';
    const base = t.cmd.global === 'codex' ? path.join(codexHome, t.cmd.dir) : path.join(project, t.cmd.dir);
    for (const c of commands) {
      const file = t.cmd.style === 'subdir'
        ? path.join(base, NS, `${c.id}.${ext}`)
        : path.join(base, `${NS}-${c.id}.${ext}`);
      if (wantUninstall) { rmrf(file); continue; }
      write(file, c.body);
    }
  }
}

// ---- optional: AGENTS.md + CLAUDE.md symlink -------------------------
if (initAgents && !wantUninstall) {
  const agents = path.join(project, 'AGENTS.md');
  if (!fs.existsSync(agents)) {
    write(agents, fs.readFileSync(path.join(PLUGIN_ROOT, 'templates', 'AGENTS.md'), 'utf8'));
  } else { console.log('AGENTS.md already exists — left untouched.'); }
  const claude = path.join(project, 'CLAUDE.md');
  if (!fs.existsSync(claude)) {
    try { fs.symlinkSync('AGENTS.md', claude); writes.push(claude + ' (symlink → AGENTS.md)'); }
    catch (e) { console.log('Could not symlink CLAUDE.md → AGENTS.md:', e.message); }
  }
}

// ---- report ----------------------------------------------------------
const verb = wantUninstall ? 'Removed' : 'Installed';
const list = wantUninstall ? removed : writes;
console.log(`\nSSWA ${verb.toLowerCase()} for: ${selected.join(', ')}`);
console.log(`Project: ${project}`);
console.log(`${verb} ${list.length} file(s):`);
for (const f of list) console.log('  ' + path.relative(project, f).replace(/^\.\.\//, f.startsWith(codexHome) ? '' : '../') || f);
if (!wantUninstall) console.log(`\nNext: open your assistant in this project and run /${NS}:propose (Claude Code), or the ${NS}-propose command for other tools.`);
