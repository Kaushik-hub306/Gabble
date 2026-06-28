#!/usr/bin/env node
// gabble: SubagentStart hook — injects gabble rules into subagents
// SessionStart context is parent-thread only; subagents need their own injection.

const { readMode, writeHookOutput } = require('./gabble-runtime');
const { getGabbleInstructions } = require('./gabble-instructions');

const mode = readMode();
if (!mode || mode === 'off') process.exit(0);

try {
  writeHookOutput('SubagentStart', mode, getGabbleInstructions(mode));
} catch (_) { /* silent fail */ }
