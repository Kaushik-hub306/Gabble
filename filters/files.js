#!/usr/bin/env node
// gabble files filter — compresses file/dir listings by 50-85%
// Strategies: tree compression, dedup, structure-only for JSON

function ls(raw, opts = {}) {
  const lines = raw.split('\n').filter(l => l.trim());
  // Build a compact tree from flat listing
  if (lines.length <= 10) return lines.join('\n');

  const dirs = [];
  const files = [];
  const hidden = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith('.')) hidden.push(t);
    else if (t.includes('/') || t.endsWith('/')) dirs.push(t);
    else files.push(t);
  }

  const out = [];
  if (dirs.length) out.push(`${dirs.length} dirs` + (opts.ultra ? '' : `: ${dirs.join(', ').slice(0, 100)}`));
  if (files.length) out.push(`${files.length} files` + (opts.ultra ? '' : `: ${files.join(', ').slice(0, 100)}`));
  if (hidden.length) out.push(`${hidden.length} hidden`);
  if (!out.length) out.push('empty');
  return out.join('\n');
}

function tree(raw, _opts = {}) {
  // Already compact — just trim trailing empty lines
  return raw.trim();
}

function cat(raw, opts = {}) {
  // Strip comments and blank lines from code files
  if (opts.ultra) {
    const lines = raw.split('\n')
      .filter(l => l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('#') && !l.trim().startsWith('/*') && !l.trim().startsWith('*'))
      .slice(0, 200);
    return lines.join('\n');
  }
  // Normal mode: strip only consecutive blank lines
  return raw.replace(/\n{4,}/g, '\n\n').trim();
}

function grepFind(raw, opts = {}) {
  // Group results by directory
  const lines = raw.split('\n').filter(l => l.trim());
  if (lines.length <= 5) return lines.join('\n');

  // Count per subdirectory
  const byDir = {};
  for (const line of lines) {
    const parts = line.split('/');
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '.';
    byDir[dir] = (byDir[dir] || 0) + 1;
  }

  const out = [`${lines.length} matches in ${Object.keys(byDir).length} dirs`];
  if (!opts.ultra) {
    const sorted = Object.entries(byDir).sort((a, b) => b[1] - a[1]).slice(0, 10);
    out.push(sorted.map(([d, c]) => `  ${d} (${c})`).join('\n'));
  }
  return out.join('\n');
}

function json(raw, _opts = {}) {
  // Structure-only: strip values, keep keys and types
  try {
    const obj = JSON.parse(raw);
    function skeleton(v, depth = 0) {
      if (depth > 5) return '...';
      if (Array.isArray(v)) {
        if (v.length === 0) return '[]';
        if (v.length === 1) return `[${skeleton(v[0], depth + 1)}]`;
        return `[${skeleton(v[0], depth + 1)}, ... ${v.length} items]`;
      }
      if (v && typeof v === 'object') {
        const keys = Object.keys(v);
        if (keys.length === 0) return '{}';
        const entries = keys.slice(0, 10).map(k => `${k}: ${skeleton(v[k], depth + 1)}`);
        if (keys.length > 10) entries.push(`... +${keys.length - 10} keys`);
        return `{ ${entries.join(', ')} }`;
      }
      return typeof v;
    }
    return JSON.stringify(skeleton(obj), null, 2);
  } catch (_) {
    return raw; // not valid JSON, passthrough
  }
}

// Route
module.exports = {
  default(raw, opts = {}) {
    const cmd = opts.cmd || '';
    if (cmd.startsWith('ls') || cmd.includes(' ls ')) return ls(raw, opts);
    if (cmd.startsWith('tree') || cmd.includes(' tree ')) return tree(raw, opts);
    if (cmd.startsWith('cat') || cmd.includes(' cat ')) return cat(raw, opts);
    if (cmd.startsWith('find') || cmd.startsWith('grep') || cmd.startsWith('rg')) return grepFind(raw, opts);
    if (cmd.match(/json|\.json/)) return json(raw, opts);
    return raw.trim();
  },
  ls,
  tree,
  cat,
  find: grepFind,
  grep: grepFind,
  json,
};
