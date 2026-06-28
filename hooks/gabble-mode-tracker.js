#!/usr/bin/env node
// gabble: UserPromptSubmit hook — detects /gabble commands and mode switches

const { getDefaultMode, isDeactivationCommand } = require('./gabble-config');
const { setMode, clearMode, writeHookOutput } = require('./gabble-runtime');

let input = '';

process.stdin.on('data', chunk => { input += chunk; });

process.stdin.on('end', () => {
  try {
    input = input.replace(/^﻿/, ''); // strip BOM
    const data = JSON.parse(input);
    const prompt = String(data.prompt || '').trim().toLowerCase();

    let mode = null;

    // /gabble commands
    if (/^[/@$]gabble/.test(prompt)) {
      const parts = prompt.split(/\s+/);
      const cmd = parts[0].replace('@', '/').replace('$', '/');
      const arg = parts[1];

      // One-shot skills: don't change mode, just pass through
      if (cmd === '/gabble-review' || cmd === '/gabble:gabble-review') mode = 'review';
      else if (cmd === '/gabble-audit' || cmd === '/gabble:gabble-audit') mode = 'review';
      else if (cmd === '/gabble-debt' || cmd === '/gabble:gabble-debt') mode = null; // one-shot, no mode change
      else if (cmd === '/gabble-gain' || cmd === '/gabble:gabble-gain') mode = null; // one-shot display
      else if (cmd === '/gabble-help' || cmd === '/gabble:gabble-help') mode = null; // one-shot reference
      else if (cmd === '/gabble' || cmd === '/gabble:gabble') {
        if (arg === 'lite') mode = 'lite';
        else if (arg === 'full') mode = 'full';
        else if (arg === 'ultra') mode = 'ultra';
        else if (arg === 'off') mode = 'off';
        else mode = getDefaultMode();
      }
    }

    if (mode && mode !== 'off') {
      setMode(mode);
      writeHookOutput('UserPromptSubmit', mode, `GABBLE MODE ACTIVE — level: ${mode}`);
    } else if (mode === 'off') {
      clearMode();
      writeHookOutput('UserPromptSubmit', 'off', 'GABBLE MODE OFF');
    } else if (isDeactivationCommand(prompt)) {
      clearMode();
      writeHookOutput('UserPromptSubmit', 'off', 'GABBLE MODE OFF');
    }
  } catch (_) { /* silent fail — never block prompt submission */ }
});
