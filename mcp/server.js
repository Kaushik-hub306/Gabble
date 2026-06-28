#!/usr/bin/env node
// gabble MCP server — exposes gabble filters as MCP tools
// Agents connect via MCP to use gabble filters without shell rewriting.
// Start: node mcp/server.js
// Configure in Claude Code: add to mcpServers in settings.json

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ── MCP protocol handlers ──────────────────────────────────────────────────
function send(method, params = {}, id = null) {
  const msg = { jsonrpc: '2.0', ...(id !== null ? { id } : {}), ...params };
  if (method) msg.method = method;
  process.stdout.write(JSON.stringify(msg) + '\n');
}

// ── Filter tool implementations ────────────────────────────────────────────
const FILTERS = {};
function loadFilter(name) {
  if (!FILTERS[name]) {
    try { FILTERS[name] = require(`../filters/${name}`); }
    catch (_) { FILTERS[name] = require('../filters/generic'); }
  }
  return FILTERS[name];
}

function runFilter(cmd, args = []) {
  const start = Date.now();
  let result;
  try {
    result = spawnSync(cmd, args, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120000,
    });
  } catch (e) {
    return { error: e.message, exitCode: 1 };
  }
  const raw = (result.stdout || '') + (result.stderr || '');
  const exitCode = result.status ?? 1;

  // Route to filter
  let filtered = raw;
  const cmdStr = [cmd, ...args].join(' ');
  let filterUsed = 'none';

  const ROUTES = {
    git: 'git', gh: 'git',
    pytest: ['test', 'pytest'], jest: ['test', 'jest'],
    'cargo test': ['test', 'cargo'], 'go test': ['test', 'go'],
    eslint: 'lint', ruff: 'lint', prettier: 'lint', tsc: 'build',
    'cargo build': 'build', 'next build': 'build',
    docker: 'docker', kubectl: 'docker',
    ls: 'files', tree: 'files', cat: 'files', find: 'files', grep: 'files',
    aws: 'aws', pip: 'packages', pnpm: 'packages', bundle: 'ruby', rspec: 'ruby', rubocop: 'ruby',
  };

  let filterMod = null, filterFn = null;
  for (const [key, val] of Object.entries(ROUTES)) {
    if (cmdStr.startsWith(key)) {
      if (Array.isArray(val)) {
        filterMod = val[0];
        filterFn = val[1];
      } else {
        filterMod = val;
      }
      break;
    }
  }

  if (filterMod && raw) {
    try {
      const mod = loadFilter(filterMod);
      const fn = filterFn ? mod[filterFn] : mod.default || mod.filter || mod;
      if (typeof fn === 'function') {
        filtered = fn(raw, { verbose: 0, ultra: false, exitCode, cmd: cmdStr });
        filterUsed = filterMod;
      }
    } catch (_) { /* fallthrough */ }
  }

  const execTimeMs = Date.now() - start;
  const rawTokens = Math.ceil(raw.length / 4);
  const outTokens = Math.ceil(filtered.length / 4);
  const saved = rawTokens - outTokens;
  const pct = rawTokens ? Math.round((saved / rawTokens) * 100) : 0;

  // Track
  try {
    const DATA_DIR = path.join(os.homedir(), '.gabble');
    const HIST = path.join(DATA_DIR, 'history.json');
    fs.mkdirSync(DATA_DIR, { recursive: true });
    let history = [];
    try { history = JSON.parse(fs.readFileSync(HIST, 'utf-8')); } catch (_) {}
    history.push({ ts: Date.now(), cmd: cmdStr.slice(0, 200), filter: filterUsed, rawTokens, outTokens, saved, pct, ms: execTimeMs, exit: exitCode });
    fs.writeFileSync(HIST, JSON.stringify(history.slice(-5000)));
  } catch (_) {}

  return { filtered, rawTokens, outTokens, saved, pct, ms: execTimeMs, exitCode, filter: filterUsed };
}

// ── Tool definitions ───────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'gabble_run',
    description: 'Run a shell command through the gabble token filter. Returns compressed output instead of raw. Supports git, pytest, cargo, go, npm, eslint, ruff, tsc, docker, kubectl, ls, grep, and more.',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The command to run (e.g., "git status", "pytest -x")' },
        args: { type: 'array', items: { type: 'string' }, description: 'Command arguments as array (alternative to inline)' },
        ultra: { type: 'boolean', description: 'Ultra-compact mode for max token savings' },
      },
      required: ['command'],
    },
  },
  {
    name: 'gabble_filter',
    description: 'Filter already-captured command output through gabble compression. Use when you already have raw output and want to compress it.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Raw command output to filter' },
        command: { type: 'string', description: 'The original command (for routing, e.g. "git status")' },
        ultra: { type: 'boolean', description: 'Ultra-compact mode' },
      },
      required: ['text', 'command'],
    },
  },
  {
    name: 'gabble_gain',
    description: 'Show gabble token savings statistics from local history.',
    inputSchema: {
      type: 'object',
      properties: {
        since: { type: 'number', description: 'Days to look back (default 30)' },
        json: { type: 'boolean', description: 'Output as JSON' },
      },
    },
  },
  {
    name: 'gabble_discover',
    description: 'Find commands that could benefit from gabble filtering but are not using it.',
    inputSchema: {
      type: 'object',
      properties: {
        since: { type: 'number', description: 'Days to look back (default 7)' },
      },
    },
  },
  {
    name: 'gabble_help',
    description: 'Show gabble usage reference — modes, commands, and filter coverage.',
    inputSchema: { type: 'object', properties: {} },
  },
];

// ── Main ────────────────────────────────────────────────────────────────────
let buffer = '';
process.stdin.setEncoding('utf-8');

process.stdin.on('data', chunk => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop(); // incomplete last line

  for (const line of lines) {
    if (!line.trim()) continue;
    let msg;
    try { msg = JSON.parse(line); } catch (_) { continue; }

    if (msg.method === 'initialize') {
      send(null, {
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'gabble', version: '1.0.0' },
          capabilities: { tools: {} },
        },
      }, msg.id);
    } else if (msg.method === 'tools/list') {
      send(null, { result: { tools: TOOLS } }, msg.id);
    } else if (msg.method === 'tools/call') {
      const { name, arguments: args } = msg.params;
      let result;

      try {
        switch (name) {
          case 'gabble_run': {
            const cmd = args.command;
            const cmdArgs = args.args || [];
            // Parse command into parts
            const parts = cmd.split(/\s+/);
            result = runFilter(parts[0], [...parts.slice(1), ...cmdArgs]);
            break;
          }
          case 'gabble_filter': {
            const cmdParts = args.command.split(/\s+/);
            const mod = Object.entries({
              git: 'git', gh: 'git', pytest: 'test', jest: 'test',
              eslint: 'lint', ruff: 'lint', tsc: 'build', docker: 'docker',
              ls: 'files', cat: 'files', grep: 'files',
            }).find(([k]) => args.command.startsWith(k));
            const filterMod = mod ? loadFilter(mod[1]) : loadFilter('generic');
            const fn = filterMod.default || filterMod.filter || filterMod;
            const filtered = fn(args.text, { ultra: args.ultra || false, cmd: args.command });
            result = { filtered, rawTokens: Math.ceil(args.text.length / 4), outTokens: Math.ceil(filtered.length / 4) };
            break;
          }
          case 'gabble_gain': {
            const HIST = path.join(os.homedir(), '.gabble', 'history.json');
            let history = [];
            try { history = JSON.parse(fs.readFileSync(HIST, 'utf-8')); } catch (_) {}
            const cutoff = Date.now() - (args.since || 30) * 86400000;
            const recent = history.filter(e => e.ts > cutoff);
            const total = recent.length;
            const saved = recent.reduce((s, e) => s + (e.saved || 0), 0);
            result = { commands: total, tokensSaved: saved, avgPct: total ? Math.round(recent.reduce((s, e) => s + (e.pct || 0), 0) / total) : 0 };
            break;
          }
          case 'gabble_discover': {
            const HIST = path.join(os.homedir(), '.gabble', 'history.json');
            let history = [];
            try { history = JSON.parse(fs.readFileSync(HIST, 'utf-8')); } catch (_) {}
            const cutoff = Date.now() - (args.since || 7) * 86400000;
            const missed = history.filter(e => e.ts > cutoff && (e.filter === 'none' || e.pct < 20));
            result = { missedOpportunities: missed.length, estimatedTokensWasted: missed.reduce((s, e) => s + (e.rawTokens || 0), 0) };
            break;
          }
          case 'gabble_help': {
            result = {
              modes: { lite: 'Advisory token rules', full: 'Combined ladder enforced (default)', ultra: 'YAGNI extremist, max compression' },
              filters: ['git', 'test (pytest/cargo/go/jest)', 'lint (eslint/ruff/golangci)', 'build (tsc/cargo/next)', 'files (ls/cat/grep)', 'docker (ps/images/logs)', 'generic (errors-only, dedup)'],
              commands: ['/gabble lite|full|ultra|off', '/gabble-review', '/gabble-audit', '/gabble-debt', '/gabble-gain', '/gabble-help'],
            };
            break;
          }
          default:
            result = { error: `Unknown tool: ${name}` };
        }
      } catch (e) {
        result = { error: e.message };
      }

      send(null, {
        result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] },
      }, msg.id);
    } else if (msg.method === 'notifications/initialized') {
      // no response needed
    }
  }
});

process.stdin.on('end', () => { process.exit(0); });

// Log startup
process.stderr.write('[gabble-mcp] server started\n');
