#!/usr/bin/env node
// gabble: runtime state management — flag files, hook output, mode persistence

const fs = require('fs');
const path = require('path');
const { getClaudeDir } = require('./gabble-config');

const STATE_FILE = '.gabble-active';

const isCopilot = !!process.env.COPILOT_PLUGIN_DATA;
const isCodex = !isCopilot && !!process.env.PLUGIN_DATA;

let stateDir = getClaudeDir();
if (isCodex) stateDir = process.env.PLUGIN_DATA;
if (isCopilot) stateDir = process.env.COPILOT_PLUGIN_DATA;

const statePath = path.join(stateDir, STATE_FILE);

function setMode(mode) {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(statePath, String(mode).trim());
}

function clearMode() {
  try { fs.unlinkSync(statePath); } catch (_) { /* already gone */ }
}

function readMode() {
  try { return fs.readFileSync(statePath, 'utf-8').trim(); } catch (_) { return null; }
}

function writeHookOutput(event, mode, context = '') {
  if (isCopilot) {
    const payload = event === 'SessionStart' && context
      ? { additionalContext: context }
      : {};
    process.stdout.write(JSON.stringify(payload));
    return;
  }

  if (isCodex) {
    process.stdout.write(JSON.stringify({
      systemMessage: `GABBLE:ACTIVE:${mode}`,
      ...(context ? { hookSpecificOutput: { hookEventName: event, context } } : {}),
    }));
    return;
  }

  // native Claude Code
  if (event === 'SubagentStart') {
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: event, context } }));
  } else {
    process.stdout.write(context);
  }
}

module.exports = { setMode, clearMode, readMode, writeHookOutput, isCodex, isCopilot, statePath };
