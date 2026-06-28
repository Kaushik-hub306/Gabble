#!/usr/bin/env node
// gabble generic filter — fallback for unknown commands
// Strategies: errors-only, dedup, truncation

function generic(raw, opts = {}) {
  let output = raw;

  // Always strip ANSI escape codes
  output = output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');

  // Strip common progress indicators
  output = output.replace(/\r/g, '\n');
  output = output.replace(/[#=]{10,}/g, '');
  output = output.replace(/\[={1,20}\]/g, '');

  const lines = output.split('\n').filter(l => l.trim() !== '');

  // Strategy: errors only (if stderr-like patterns present)
  const errorLines = lines.filter(l =>
    l.toLowerCase().includes('error') ||
    l.toLowerCase().includes('fail') ||
    l.toLowerCase().includes('panic') ||
    l.toLowerCase().includes('exception') ||
    l.startsWith('E ') ||
    l.startsWith('ERR')
  );

  if (errorLines.length > 0 && errorLines.length < lines.length * 0.5) {
    // Errors are a minority — show just errors + last 3 lines (often summary)
    const deduped = dedup(errorLines);
    const tail = lines.slice(-3);
    return [...deduped.slice(0, 20), '---', ...tail].join('\n');
  }

  // Strategy: dedup repeated lines
  const deduped = dedup(lines);

  // Strategy: truncate long output
  const maxLen = opts.ultra ? 1000 : 5000;
  if (deduped.join('\n').length > maxLen) {
    const truncated = deduped.slice(0, opts.ultra ? 30 : 80);
    return truncated.join('\n') + `\n... [${lines.length} lines, truncated to ${truncated.length}]`;
  }

  return deduped.join('\n');
}

function dedup(lines) {
  const counts = {};
  const order = [];
  for (const line of lines) {
    const t = line.trim();
    if (counts[t]) { counts[t]++; }
    else { counts[t] = 1; order.push(t); }
  }
  return order.map(l => counts[l] > 1 ? `${l} (×${counts[l]})` : l);
}

// Special: errors-only extraction
function errorsOnly(raw, _opts = {}) {
  const lines = raw.split('\n');
  const errors = lines.filter(l =>
    l.toLowerCase().includes('error') ||
    l.toLowerCase().includes('fail') ||
    l.toLowerCase().includes('exception') ||
    l.match(/^\s*at\s/) // stack trace
  );
  return errors.length ? errors.join('\n') : 'no errors found';
}

module.exports = { default: generic, filter: generic, errors: errorsOnly, generic, dedup };
