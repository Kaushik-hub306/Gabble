#!/usr/bin/env node
// gabble ruby filter — compresses Ruby/Rails tool output by 60-90%
// Strategies: JSON parsing, state machine, noise stripping

function rspec(raw, _opts = {}) {
  const lines = raw.split('\n');
  const out = [];
  let examples = 0, failures = 0, pending = 0;

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    // Summary
    if (t.match(/^\d+ examples?/)) {
      const m1 = t.match(/(\d+) examples?/);
      if (m1) examples = parseInt(m1[1]);
      const m2 = t.match(/(\d+) failures?/);
      if (m2) failures = parseInt(m2[1]);
      const m3 = t.match(/(\d+) pending/);
      if (m3) pending = parseInt(m3[1]);
      out.push(t);
    }

    // Failures
    if (t.startsWith('Failures:') || t.includes('Failure/Error:')) {
      out.push(t);
    }

    // Finished
    if (t.includes('Finished in')) out.push(t);
  }

  if (!out.length) {
    return `${examples - failures}/${examples} passed` + (failures ? `, ${failures} FAILED` : '');
  }
  return out.join('\n');
}

function rubocop(raw, _opts = {}) {
  const lines = raw.split('\n');
  const offenses = [];
  let inspected = 0, totalOffenses = 0;

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.match(/^\d+ files? inspected/)) {
      const m = t.match(/(\d+) files? inspected/);
      if (m) inspected = parseInt(m[1]);
      const m2 = t.match(/(\d+) offenses? detected/);
      if (m2) totalOffenses = parseInt(m2[1]);
    }
    // file.rb:line:col: C: message
    if (t.match(/^[^:]+:\d+:\d+:\s+[A-Z]:/)) {
      offenses.push(t.slice(0, 200));
    }
  }

  if (totalOffenses === 0) return `${inspected} files, clean`;
  return `${inspected} files, ${totalOffenses} offenses:\n` + offenses.slice(0, 20).join('\n');
}

// Route
module.exports = {
  default(raw, opts = {}) {
    const cmd = opts.cmd || '';
    if (cmd.includes('rspec')) return rspec(raw, opts);
    if (cmd.includes('rubocop')) return rubocop(raw, opts);
    return raw;
  },
  rspec,
  rubocop,
};
