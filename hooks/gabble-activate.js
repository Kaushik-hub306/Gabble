#!/usr/bin/env node
// gabble: SessionStart hook — activates on startup/resume/clear/compact

const { getDefaultMode, isShellSafe } = require('./gabble-config');
const { setMode, clearMode, writeHookOutput } = require('./gabble-runtime');
const { getGabbleInstructions } = require('./gabble-instructions');

const mode = getDefaultMode();

if (mode === 'off') {
  clearMode();
  process.exit(0);
}

setMode(mode);
const output = getGabbleInstructions(mode);
writeHookOutput('SessionStart', mode, output);

// statusline: emit config snippet if not already set
try {
  const fs = require('fs');
  const path = require('path');
  const { getClaudeDir } = require('./gabble-config');
  const settingsPath = path.join(getClaudeDir(), 'settings.json');

  let hasStatusline = false;
  try {
    const raw = fs.readFileSync(settingsPath, 'utf-8');
    hasStatusline = raw.includes('gabble-statusline');
  } catch (_) { /* no settings file */ }

  if (!hasStatusline) {
    const scriptPath = path.join(__dirname, 'gabble-statusline.sh');
    if (isShellSafe(scriptPath)) {
      const cmd = `bash "${scriptPath}"`;
      process.stderr.write(`\n[gabble] Statusline not configured. Add to ~/.claude/settings.json:\n  "statusLine": { "type": "command", "command": ${JSON.stringify(cmd)} }\n`);
    } else {
      process.stderr.write(`\n[gabble] Statusline script path unsafe for shell embedding. Configure manually:\n  "statusLine": { "type": "command", "command": "bash /path/to/gabble-statusline.sh" }\n`);
    }
  }
} catch (_) { /* best-effort — never block session start */ }
