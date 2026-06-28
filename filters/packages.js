#!/usr/bin/env node
// gabble package-manager filter — compresses npm/pnpm/yarn/pip output by 70-90%
// Strategies: progress strip, summary extraction, dependency tree compression

function npmInstall(raw, _opts = {}) {
  const lines = raw.split('\n').filter(l => l.trim());
  // Strip progress bars, keep summary
  const out = [];
  for (const line of lines) {
    if (line.includes('added') || line.includes('removed') || line.includes('changed') ||
        line.includes('packages') || line.includes('audited') || line.includes('vulnerabilit') ||
        line.includes('WARN') || line.includes('ERR') || line.includes('error')) {
      out.push(line.trim());
    }
  }
  return out.length ? out.join('\n') : 'install ok';
}

function pnpmList(raw, _opts = {}) {
  const lines = raw.split('\n').filter(l => l.trim());
  if (lines.length <= 3) return lines.join('\n');
  // Extract direct dependencies, skip tree
  const deps = [];
  for (const line of lines) {
    const t = line.trim();
    if (t.match(/^[@a-z]/) && !t.startsWith('├') && !t.startsWith('└') && !t.startsWith('│')) {
      deps.push(t.replace(/\s+\d+\.\d+\.\d+.*$/, ''));
    }
  }
  return `${deps.length} deps: ${deps.join(', ').slice(0, 300)}`;
}

function pipList(raw, _opts = {}) {
  const lines = raw.split('\n').filter(l => l.trim());
  if (lines.length <= 2) return lines.join('\n');
  // Package==version format
  const pkgs = [];
  for (const line of lines) {
    const m = line.match(/^(\S+)\s+(\S+)/);
    if (m) pkgs.push(`${m[1]}@${m[2]}`);
  }
  return `${pkgs.length} packages: ${pkgs.join(', ').slice(0, 400)}`;
}

function bundleInstall(raw, _opts = {}) {
  // Strip "Using ..." lines, keep summary
  const lines = raw.split('\n').filter(l => {
    const t = l.trim();
    return !t.startsWith('Using ') && !t.startsWith('Fetching ') && !t.startsWith('Installing ');
  });
  return lines.join('\n').trim() || 'bundle ok';
}

function prismaGenerate(raw, _opts = {}) {
  // Strip ASCII art, keep model info
  const lines = raw.split('\n').filter(l => {
    const t = l.trim();
    return t && !t.match(/^[├└│]/) && !t.includes('Environment variables');
  });
  return lines.join('\n').trim();
}

module.exports = {
  default(raw, opts = {}) {
    const cmd = opts.cmd || '';
    if (cmd.includes('pip ')) return pipList(raw, opts);
    if (cmd.includes('pnpm ')) return pnpmList(raw, opts);
    if (cmd.includes('bundle ')) return bundleInstall(raw, opts);
    if (cmd.includes('prisma')) return prismaGenerate(raw, opts);
    return npmInstall(raw, opts);
  },
  npm: npmInstall,
  pnpm: pnpmList,
  yarn: npmInstall,
  pip: pipList,
  bundle: bundleInstall,
  prisma: prismaGenerate,
};
