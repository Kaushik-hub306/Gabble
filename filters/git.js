#!/usr/bin/env node
// gabble git filter — compresses git output by 80-95%
// Strategies: stats extraction, one-line summaries, strip noise

function gitStatus(raw, opts = {}) {
  const lines = raw.split('\n');
  if (lines.length <= 5) return raw.trim(); // already compact

  const sections = { staged: [], unstaged: [], untracked: [], other: [] };
  let current = 'other';

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    // Section headers
    if (t.includes('to be committed')) { current = 'staged'; continue; }
    if (t.includes('not staged')) { current = 'unstaged'; continue; }
    if (t.includes('Untracked files') || t.includes('Untracked')) { current = 'untracked'; continue; }

    // Skip: branch info, usage hints
    if (t.startsWith('On branch') || t.startsWith('Your branch')) continue;
    if (t.startsWith('(use')) continue;

    // Staged/unstaged file markers: "modified: path", "new file: path", etc.
    if (t.startsWith('modified:')) { sections[current].push('M ' + t.replace('modified:', '').trim()); continue; }
    if (t.startsWith('new file:')) { sections[current].push('A ' + t.replace('new file:', '').trim()); continue; }
    if (t.startsWith('deleted:')) { sections[current].push('D ' + t.replace('deleted:', '').trim()); continue; }
    if (t.startsWith('renamed:')) { sections[current].push('R ' + t.replace('renamed:', '').trim()); continue; }
    if (t.match(/^\?\?/)) { sections[current].push(t); continue; }

    // Summary lines — check before file catch-all
    if (t.startsWith('no changes') || t.startsWith('nothing to commit') || t.startsWith('nothing added')) {
      sections.other.push(t);
      continue;
    }

    // Files listed under current section
    if (current !== 'other' && t) {
      sections[current].push(t);
      continue;
    }
  }

  const out = [];
  if (sections.staged.length) out.push(`staged(${sections.staged.length}): ${sections.staged.join(', ')}`);
  if (sections.unstaged.length) out.push(`unstaged(${sections.unstaged.length}): ${sections.unstaged.join(', ')}`);
  if (sections.untracked.length) out.push(`untracked(${sections.untracked.length})`);
  if (sections.other.length) out.push(sections.other[0]);
  if (!out.length) out.push('clean');

  return opts.ultra ? out.join(' | ') : out.join('\n');
}

function gitDiff(raw, opts = {}) {
  const lines = raw.split('\n');
  const files = [];
  let stats = '';
  let ins = 0, dels = 0;

  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      const m = line.match(/diff --git a\/(.+) b\/(.+)/);
      if (m) files.push(m[1]);
    }
    if (line.startsWith('+') && !line.startsWith('+++')) ins++;
    if (line.startsWith('-') && !line.startsWith('---')) dels++;
    if (line.match(/^\d+ files? changed/) || line.match(/insertion|deletion/)) {
      stats = line.trim();
    }
  }

  if (files.length === 0) return 'no changes';
  const parts = [`${files.length} files (+${ins}/-${dels})`];
  if (stats) parts.push(stats);
  if (files.length <= 10) parts.push(files.join(', '));
  else parts.push(`${files.slice(0, 7).join(', ')}... +${files.length - 7} more`);

  return opts.ultra ? parts.join(' | ') : parts.join('\n');
}

function gitLog(raw, opts = {}) {
  const commits = [];
  const lines = raw.split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    // commit hash lines or one-liners
    if (t.match(/^[a-f0-9]{7,40}/) || t.match(/^commit /)) {
      commits.push(t.replace(/^commit /, '').slice(0, opts.ultra ? 140 : 200));
    }
  }
  if (!commits.length) return raw.trim();
  return `${commits.length} commits:\n${commits.join('\n')}`;
}

function ghPR(raw, opts = {}) {
  const lines = raw.split('\n').filter(l => l.trim());
  // Keep header + one line per PR, strip verbose metadata
  const out = [];
  for (const line of lines) {
    if (line.match(/^\d+\s/)) {
      out.push(line.slice(0, opts.ultra ? 100 : 160));
    } else if (line.match(/^#|^Showing|^Created|^Label/)) {
      out.push(line.trim());
    }
  }
  return out.length ? out.join('\n') : raw.trim();
}

function gitPushPull(raw, _opts = {}) {
  // Strip down to essential: branch name, counts
  const t = raw.trim();
  const branch = t.match(/To .+|From .+/) || [];
  const counts = t.match(/\d+ files? changed/) || [];
  const summary = t.match(/\[.+\]/) || [];
  if (branch.length || counts.length || summary.length) {
    return [branch[0], counts[0], summary[0]].filter(Boolean).join(' ');
  }
  // Shorter: just extract key stats
  const short = t.replace(/\n\s+/g, ' ').slice(0, 200);
  return short;
}

// Route by subcommand
module.exports = {
  default(raw, opts = {}) {
    const cmd = opts.cmd || '';
    if (cmd.includes('status')) return gitStatus(raw, opts);
    if (cmd.includes('diff')) return gitDiff(raw, opts);
    if (cmd.includes('log')) return gitLog(raw, opts);
    if (cmd.includes('push') || cmd.includes('pull')) return gitPushPull(raw, opts);
    if (cmd.includes('pr list') || cmd.includes('pr view') || cmd.includes('issue list')) return ghPR(raw, opts);
    // git add/commit → just "ok"
    if (cmd.match(/git (add|commit|branch|checkout|switch|merge|rebase|stash|tag|remote)/)) {
      const lines = raw.trim().split('\n');
      return lines[lines.length - 1] || 'ok';
    }
    return raw.trim();
  },
  status: gitStatus,
  diff: gitDiff,
  log: gitLog,
  pr: ghPR,
  push: gitPushPull,
  pull: gitPushPull,
};
