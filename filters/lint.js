#!/usr/bin/env node
// gabble lint filter — compresses linter output by 80-90%
// Strategies: group by rule, count per rule, errors-only

function eslint(raw, opts = {}) {
  const lines = raw.split('\n');
  const byRule = {};
  const byFile = {};
  let currentFile = '';

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    // File path detection
    if (t.match(/^\/.*\.(js|ts|jsx|tsx|mjs|cjs)$/) || t.match(/^\.?\/.*\.(js|ts|jsx|tsx|mjs|cjs)$/)) {
      currentFile = t;
      if (!byFile[currentFile]) byFile[currentFile] = 0;
    }

    // Rule detection: "  rule-name  message"
    const ruleMatch = t.match(/^\s{2,}([\w/-]+)\s+(.+)/);
    if (ruleMatch) {
      const rule = ruleMatch[1];
      byRule[rule] = (byRule[rule] || 0) + 1;
      byFile[currentFile] = (byFile[currentFile] || 0) + 1;
    }

    // Summary line
    if (t.match(/^\d+ problems?/) || t.match(/^\d+ errors?/) || t.match(/^\d+ warnings?/)) {
      byRule['__summary'] = t;
    }
  }

  const out = [];
  if (byRule['__summary']) out.push(byRule['__summary']);
  delete byRule['__summary'];

  // Group by rule
  const rules = Object.entries(byRule).sort((a, b) => b[1] - a[1]);
  if (rules.length) {
    out.push(rules.map(([r, c]) => `${r}: ${c}`).join(', '));
  }

  if (!out.length) out.push('clean');
  return out.join('\n');
}

function ruff(raw, _opts = {}) {
  // ruff check --output-format=json → parse and group
  const lines = raw.split('\n');
  const out = [];
  const byRule = {};
  let total = 0;

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    // Try JSON
    if (t.startsWith('[') || t.startsWith('{')) {
      try {
        const issues = JSON.parse(t.startsWith('[') ? t : `[${t}]`);
        if (Array.isArray(issues)) {
          for (const issue of issues) {
            const code = issue.code || 'unknown';
            byRule[code] = (byRule[code] || 0) + 1;
            total++;
          }
        }
      } catch (_) { /* text mode */ }
    }
    // Text mode: file:line:col: code message
    const textMatch = t.match(/([A-Z]+\d{3,4})\s/);
    if (textMatch) {
      byRule[textMatch[1]] = (byRule[textMatch[1]] || 0) + 1;
      total++;
    }
    if (t.includes('Found') && t.includes('error')) out.push(t);
  }

  if (total === 0) out.push('clean');
  else {
    const rules = Object.entries(byRule).sort((a, b) => b[1] - a[1]);
    out.push(`${total} issues: ` + rules.map(([r, c]) => `${r}×${c}`).join(', '));
  }

  return out.join('\n');
}

function golangciLint(raw, _opts = {}) {
  const lines = raw.split('\n');
  const byLinter = {};
  let total = 0;

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    // Format: file.go:line:col: message (linter)
    const m = t.match(/\((\w+)\)$/);
    if (m) {
      byLinter[m[1]] = (byLinter[m[1]] || 0) + 1;
      total++;
    }
  }

  if (total === 0) return 'clean';
  const linters = Object.entries(byLinter).sort((a, b) => b[1] - a[1]);
  return `${total} issues: ` + linters.map(([l, c]) => `${l}×${c}`).join(', ');
}

function prettier(raw, _opts = {}) {
  const lines = raw.split('\n').filter(l => l.trim());
  const unformatted = lines.filter(l => !l.includes('unchanged') && !l.includes('already') && l.match(/\.[a-z]+$/));
  if (!unformatted.length) return 'all formatted';
  return `${unformatted.length} files need formatting: ${unformatted.join(', ').slice(0, 200)}`;
}

// Route
module.exports = {
  default(raw, opts = {}) {
    const cmd = opts.cmd || '';
    if (cmd.includes('eslint')) return eslint(raw, opts);
    if (cmd.includes('ruff')) return ruff(raw, opts);
    if (cmd.includes('golangci-lint')) return golangciLint(raw, opts);
    if (cmd.includes('prettier')) return prettier(raw, opts);
    if (cmd.includes('clippy')) return eslint(raw, opts); // similar grouping pattern
    return eslint(raw, opts);
  },
  eslint,
  ruff,
  golangci: golangciLint,
  prettier,
  clippy: eslint,
};
