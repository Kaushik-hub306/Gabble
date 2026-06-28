#!/usr/bin/env node
// gabble test filter — compresses test output by 85-95%
// Strategies: failure focus, summary extraction, dedup

function pytest(raw, opts = {}) {
  const lines = raw.split('\n');
  const out = [];
  const failures = [];
  let summary = '';
  let total = 0, passed = 0, failed = 0, skipped = 0;

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    // Track test counts
    if (t.includes('passed') || t.includes('failed')) {
      const m = t.match(/(\d+)\s+passed/);
      if (m) passed = parseInt(m[1]);
      const m2 = t.match(/(\d+)\s+failed/);
      if (m2) failed = parseInt(m2[1]);
      const m3 = t.match(/(\d+)\s+skipped/);
      if (m3) skipped = parseInt(m3[1]);
      summary = t;
    }

    // Capture failure blocks
    if (t.startsWith('FAILED') || t.startsWith('ERRORS') || t.startsWith('_') || t.startsWith('=')) {
      if (failures.length > 0 || t.includes('FAILURES')) {
        failures.push(t);
      }
    }
    if (t.startsWith('>') || t.includes('assert') || t.includes('Error')) {
      failures.push(t.slice(0, opts.ultra ? 120 : 200));
    }
  }

  total = passed + failed + skipped;
  out.push(`${passed || 0}/${total || '?'} passed` + (failed ? `, ${failed} FAILED` : ''));

  if (failures.length && !opts.ultra) {
    // Dedup similar assertions
    const deduped = failures.filter((f, i) => failures.indexOf(f) === i).slice(0, 15);
    out.push('', 'Failures:', ...deduped);
  }

  return out.join('\n');
}

function cargo(raw, opts = {}) {
  const lines = raw.split('\n');
  const out = [];
  const failures = [];
  let passed = 0, failed = 0;

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith('test ') && t.includes('... ok')) passed++;
    if (t.startsWith('test ') && t.includes('... FAILED')) {
      failed++;
      failures.push(t.replace('... FAILED', '').replace('test ', '').trim());
    }
    if (t.startsWith('test result:')) {
      const m = t.match(/(\d+) passed/);
      if (m) passed = parseInt(m[1]);
    }
    if (t.includes('failures:')) out.push(t);
  }

  out.unshift(`${passed} passed, ${failed} failed`);
  if (failures.length) {
    out.push('Failing:', ...failures.slice(0, 20));
  }
  return out.join('\n');
}

function go(raw, opts = {}) {
  // go test -json NDJSON output or plain text
  const lines = raw.split('\n');
  const out = [];
  const failures = [];
  let passed = 0, failed = 0;

  // Try NDJSON first
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith('{')) {
      try {
        const ev = JSON.parse(t);
        if (ev.Action === 'pass' && ev.Test) passed++;
        if (ev.Action === 'fail' && ev.Test) {
          failed++;
          failures.push(`${ev.Package || ''}:${ev.Test}`);
        }
        if (ev.Action === 'output' && ev.Output && ev.Output.includes('FAIL')) {
          failures.push(ev.Output.trim().slice(0, 200));
        }
      } catch (_) { /* not JSON line, fall through */ }
    } else if (t.includes('--- PASS:') || t.includes('--- FAIL:')) {
      if (t.includes('PASS:')) passed++;
      if (t.includes('FAIL:')) { failed++; failures.push(t.slice(0, 200)); }
    }
  }

  out.push(`${passed} passed, ${failed} failed`);
  if (failures.length) {
    const deduped = failures.filter((f, i) => failures.indexOf(f) === i).slice(0, 15);
    out.push('Failures:', ...deduped);
  }
  return out.join('\n');
}

function jsTest(raw, opts = {}) {
  // Generic JS/TS test runner (jest, vitest, npm test, etc.)
  const lines = raw.split('\n');
  const out = [];
  const failures = [];
  let suites = 0, passed = 0, failed = 0;

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.match(/Tests?:\s+(\d+)\s+(passed|total)/)) {
      const m1 = t.match(/(\d+)\s+passed/);
      if (m1) passed = parseInt(m1[1]);
      const m2 = t.match(/(\d+)\s+failed/);
      if (m2) failed = parseInt(m2[1]);
      out.push(t);
    }
    if (t.match(/✓|✔|✅/) && !t.includes('FAIL')) passed++;
    if (t.match(/✗|✘|❌|FAIL/) || t.includes('●')) {
      failed++;
      failures.push(t.slice(0, 200));
    }
    if (t.includes('Test Suites:') || t.includes('Tests:')) out.push(t);
    if (t.includes('Snapshots:')) out.push(t);
  }

  if (!out.length) {
    out.push(`${passed} passed, ${failed} failed`);
  }
  if (failures.length && !opts.ultra) {
    const deduped = failures.filter((f, i) => failures.indexOf(f) === i).slice(0, 10);
    out.push('', 'Failures:', ...deduped);
  }
  return out.join('\n');
}

// Route
module.exports = {
  default(raw, opts = {}) {
    const cmd = opts.cmd || '';
    if (cmd.includes('pytest')) return pytest(raw, opts);
    if (cmd.includes('cargo test')) return cargo(raw, opts);
    if (cmd.includes('go test')) return go(raw, opts);
    return jsTest(raw, opts);
  },
  pytest,
  cargo,
  go,
  jest: jsTest,
  vitest: jsTest,
  npm: jsTest,
  pnpm: jsTest,
  yarn: jsTest,
};
