#!/usr/bin/env node
// gabble build filter — compresses build output by 70-90%
// Strategies: errors-only, progress strip, summary extraction

function cargoBuild(raw, opts = {}) {
  const lines = raw.split('\n');
  const out = [];
  const errors = [];
  let warnings = 0;

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    // Collect errors
    if (t.startsWith('error') || t.startsWith('error[') || t.includes('error:')) {
      errors.push(t.slice(0, opts.ultra ? 150 : 250));
    }
    // Count warnings
    if (t.startsWith('warning:') || t.startsWith('warning[')) warnings++;
    // Summary
    if (t.includes('Finished') || t.includes('error: could not compile')) {
      out.push(t);
    }
  }

  if (errors.length) {
    out.push(`${errors.length} errors, ${warnings} warnings`);
    out.push(...errors.slice(0, 10));
  }
  if (!out.length) out.push('build ok');
  return out.join('\n');
}

function tsc(raw, opts = {}) {
  const lines = raw.split('\n');
  const byFile = {};
  let total = 0;

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    // TypeScript errors: file(line,col): error TS1234: message
    const m = t.match(/^(.+?)\(\d+,\d+\):\s+error\s+(TS\d+):/);
    if (m) {
      const file = m[1];
      const code = m[2];
      if (!byFile[file]) byFile[file] = {};
      byFile[file][code] = (byFile[file][code] || 0) + 1;
      total++;
    }
  }

  if (total === 0) return 'typecheck ok';
  const files = Object.entries(byFile);
  const out = [`${total} type errors in ${files.length} files:`];
  for (const [file, codes] of files) {
    const summary = Object.entries(codes).map(([c, n]) => `${c}×${n}`).join(', ');
    out.push(`  ${file}: ${summary}`);
  }
  return out.join('\n');
}

function nextBuild(raw, _opts = {}) {
  const lines = raw.split('\n');
  const out = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    // Keep route info, page info, errors, and final summary
    if (t.startsWith('✓') || t.startsWith('▲') || t.startsWith('✗') ||
        t.includes('Compiled') || t.includes('error') || t.includes('Error') ||
        t.match(/^[├└│]/) || t.includes('Route') || t.includes('pages') ||
        t.includes('KB') || t.includes('ms')) {
      out.push(t);
    }
  }
  return out.length ? out.join('\n') : 'build ok';
}

function curlWget(raw, _opts = {}) {
  // Strip progress bars, keep status + body (truncated)
  const cleaned = raw
    .replace(/\r/g, '')
    .split('\n')
    .filter(l => !l.includes('%') && !l.includes('==>') && !l.includes('----'))
    .join('\n');
  // Truncate long responses
  if (cleaned.length > 3000) return cleaned.slice(0, 3000) + '\n... [truncated]';
  return cleaned;
}

// Route
module.exports = {
  default(raw, opts = {}) {
    const cmd = opts.cmd || '';
    if (cmd.includes('cargo build') || cmd.includes('cargo check')) return cargoBuild(raw, opts);
    if (cmd.includes('tsc')) return tsc(raw, opts);
    if (cmd.includes('next build')) return nextBuild(raw, opts);
    if (cmd.includes('curl') || cmd.includes('wget')) return curlWget(raw, opts);
    return raw; // passthrough
  },
  cargo: cargoBuild,
  tsc,
  next: nextBuild,
  curl: curlWget,
  wget: curlWget,
};
