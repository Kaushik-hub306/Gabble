#!/usr/bin/env node
// gabble: PreToolUse hook — rtk-style auto-rewrite for bash commands
// Intercepts Bash tool calls and transparently rewrites them through the gabble filter.
// This achieves 100% adoption with zero context overhead — the LLM never sees raw output.
//
// Commands that match known filterable patterns get rewritten:
//   git status  →  gabble git status
//   pytest -x   →  gabble pytest -x
// Unknown commands pass through unchanged.

const { readMode } = require('./gabble-runtime');

const GABBLE_BIN = __dirname + '/../bin/gabble';

const MODE = readMode();
const IS_CONDUCTOR = !!process.env.CONDUCTOR_WORKTREE;
if (!MODE || MODE === 'off' || MODE === 'review') process.exit(0);

// Commands that benefit from filtering (high-noise, high-frequency)
const REWRITE_PATTERNS = [
  // Git — 80-95% savings
  /^git\s+(status|diff|log|show|push|pull|branch|tag)/,
  /^gh\s+(pr|issue|run|repo)/,
  // Tests — 85-95% savings
  /^(pytest|python -m pytest)\b/,
  /^(cargo test|cargo nextest)\b/,
  /^go test\b/,
  /^(npm test|pnpm test|yarn test|npx jest|npx vitest|npx playwright)\b/,
  // Lint — 80-90% savings
  /^(eslint|npx eslint|pnpm eslint)\b/,
  /^(prettier|npx prettier)\b/,
  /^ruff\b/,
  /^(golangci-lint|cargo clippy)\b/,
  // Build — 70-90% savings
  /^(tsc|npx tsc)\b/,
  /^(cargo build|cargo check)\b/,
  /^(next build|npx next build)\b/,
  // Docker/K8s — 75-85% savings
  /^docker\s+(ps|images|logs|compose ps)\b/,
  /^(kubectl|oc)\s+(get|logs|describe)\b/,
  // Files — 50-85% savings
  /^(ls|tree)\s/,
  /^(find|grep|rg)\s/,
  // Curl/wget — 60-80% savings
  /^(curl|wget)\s/,
  // AWS — 60-80% savings
  /^aws\s+(sts|ec2|lambda|logs|dynamodb|s3|iam|cloudformation)\b/,
  // Package managers — 70-90% savings
  /^(pnpm list|pip list|pip outdated|bundle install|prisma generate)\b/,
  // Ruby — 60-90% savings
  /^(rspec|rubocop|rake test)\b/,
];

let input = '';

process.stdin.on('data', chunk => { input += chunk; });

process.stdin.on('end', () => {
  try {
    input = input.replace(/^﻿/, '');
    const data = JSON.parse(input);

    // Only intercept Bash tool calls
    if (data.tool_name !== 'Bash') {
      process.stdout.write(JSON.stringify({}));
      return;
    }

    const command = String(data.tool_input?.command || '').trim();
    if (!command) {
      process.stdout.write(JSON.stringify({}));
      return;
    }

    // Don't double-wrap
    if (command.startsWith('gabble ') || command.includes('bin/gabble')) {
      process.stdout.write(JSON.stringify({}));
      return;
    }

    // Don't rewrite ultra-short commands that are already cheap
    if (command.length < 10 && !command.includes('git') && !command.includes('test')) {
      process.stdout.write(JSON.stringify({}));
      return;
    }

    // Check if command matches a rewrite pattern
    const shouldRewrite = REWRITE_PATTERNS.some(p => p.test(command));
    if (!shouldRewrite) {
      process.stdout.write(JSON.stringify({}));
      return;
    }

    // Ultra mode: rewrite everything that matches
    // Lite mode: only rewrite git and test commands (highest savings)
    if (MODE === 'lite') {
      const isHighValue = /^(git|gh|pytest|cargo test|go test|npm test|pnpm test|yarn test)/.test(command);
      if (!isHighValue) {
        process.stdout.write(JSON.stringify({}));
        return;
      }
    }

    // Rewrite: prefix with gabble binary
    const rewritten = `${GABBLE_BIN} ${command}`;

    // In Conductor: also tag the command with the agent role for per-role tracking
    if (IS_CONDUCTOR) {
      const role = process.env.CONDUCTOR_AGENT_ROLE || process.env.GABBLE_ROLE || 'unscoped';
      process.env.GABBLE_LAST_ROLE = role;
    }

    const response = {
      decision: 'modify',
      modifiedInput: {
        command: rewritten,
        ...(data.tool_input?.description ? { description: data.tool_input.description } : {}),
      },
    };

    if (process.env.GABBLE_DEBUG) {
      process.stderr.write(`[gabble] rewrite: ${command} → ${rewritten}\n`);
    }

    process.stdout.write(JSON.stringify(response));
  } catch (_) {
    // Silent fail — never block tool execution
    process.stdout.write(JSON.stringify({}));
  }
});
