#!/usr/bin/env node
// gabble: Conductor integration hook
// Injects gabble rules into Conductor-managed agent sessions.
// Conductor spawns agents in git worktrees — this hook ensures every
// spawned agent gets gabble rules + role-scoped tool profiles.
//
// Usage: Place in Conductor's hook chain or run as a SubagentStart shim.
// Conductor config: add gabble as a pre-agent hook in ~/.conductor/config.yaml

const fs = require('fs');
const path = require('path');
const os = require('os');

const CONDUCTOR_DIR = path.join(os.homedir(), '.conductor');
const GABBLE_CONFIG = path.join(CONDUCTOR_DIR, 'gabble.yaml');
const AGENT_TEMPLATE = path.join(__dirname, '..', 'conductor', 'agents', 'gabble.md');
const ROLE_DIR = path.join(__dirname, '..', 'conductor', 'roles');

// ── Detect Conductor session ───────────────────────────────────────────────
function isConductorSession() {
  // Conductor sets CONDUCTOR_WORKTREE env var for spawned agents
  if (process.env.CONDUCTOR_WORKTREE) return true;
  // Also check: are we in a git worktree managed by Conductor?
  try {
    const gitDir = path.join(process.cwd(), '.git');
    if (fs.existsSync(gitDir)) {
      const content = fs.readFileSync(gitDir, 'utf-8');
      if (content.includes('gitdir:') && content.includes('.conductor')) return true;
    }
  } catch (_) {}
  return false;
}

// ── Get agent role from env ────────────────────────────────────────────────
function getAgentRole() {
  return process.env.CONDUCTOR_AGENT_ROLE || process.env.GABBLE_ROLE || 'gabble';
}

// ── Load role-based tool profile ───────────────────────────────────────────
function loadRoleProfile(role) {
  const roleFile = path.join(ROLE_DIR, `${role.replace('gabble-', '')}.json`);
  try {
    return JSON.parse(fs.readFileSync(roleFile, 'utf-8'));
  } catch (_) {
    // Fallback: minimal default profile
    return {
      role,
      tools: { allow: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'] },
      bash_restrictions: { auto_gabble_prefix: true },
      context_limits: { max_file_read: 500, prefer_line_ranges: true },
      token_budget: 100000,
    };
  }
}

// ── Generate role-scoped gabble instructions ───────────────────────────────
function getConductorInstructions(role) {
  const profile = loadRoleProfile(role);

  let template = '';
  try {
    template = fs.readFileSync(AGENT_TEMPLATE, 'utf-8');
  } catch (_) {
    template = 'Gabble conductor agent. Lazy dev + token optimizer.';
  }

  // Template variable substitution
  const vars = {
    ROLE: role,
    ROLE_DESCRIPTION: profile.description || role,
    SCOPE: profile.scope || 'complete the assigned task',
    OUTPUT_FORMAT: profile.output_format || 'code + ≤3 lines explanation',
  };

  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
  }

  // Append role-specific constraints
  result += `\n\n## Role constraints (auto-injected)\n\n`;
  result += `- Token budget: ${profile.token_budget?.toLocaleString() || 'unlimited'} tokens\n`;
  result += `- Allowed tools: ${(profile.tools?.allow || []).join(', ')}\n`;
  result += `- Blocked tools: ${(profile.tools?.deny || []).join(', ')}\n`;
  if (profile.bash_restrictions?.auto_gabble_prefix) {
    result += `- All bash commands auto-prefixed with gabble filter\n`;
  }
  if (profile.bash_restrictions?.block_write) {
    result += `- READ-ONLY mode: no file modifications allowed\n`;
  }
  if (profile.context_limits?.max_file_read) {
    result += `- Max file read: ${profile.context_limits.max_file_read} lines (use offset/limit)\n`;
  }

  return result;
}

// ── Main ────────────────────────────────────────────────────────────────────
let input = '';

process.stdin.on('data', chunk => { input += chunk; });

process.stdin.on('end', () => {
  try {
    if (!isConductorSession()) {
      process.stdout.write(JSON.stringify({}));
      return;
    }

    input = input.replace(/^﻿/, '');
    const data = JSON.parse(input);
    const role = getAgentRole();
    const instructions = getConductorInstructions(role);

    process.stderr.write(`[gabble-conductor] role: ${role}\n`);

    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SubagentStart',
        context: instructions,
      },
    }));
  } catch (_) {
    // Silent fail — never block agent start
    process.stdout.write(JSON.stringify({}));
  }
});
