#!/usr/bin/env node
// gabble docker filter — compresses docker/k8s output by 75-85%
// Strategies: column extraction, dedup, compact listing

function dockerPs(raw, _opts = {}) {
  const lines = raw.split('\n').filter(l => l.trim());
  if (lines.length <= 1) return lines.join('\n');

  const header = lines[0];
  const containers = lines.slice(1).map(l => {
    // Extract: CONTAINER ID, IMAGE, STATUS, NAMES
    const parts = l.split(/\s{2,}/);
    return parts.slice(0, 2).join(' ') + ' ' + (parts[4] || parts[parts.length - 1] || '');
  });

  return `${containers.length} containers\n` + (containers.length <= 10
    ? containers.join('\n')
    : containers.slice(0, 7).join('\n') + `\n... +${containers.length - 7} more`);
}

function dockerImages(raw, _opts = {}) {
  const lines = raw.split('\n').filter(l => l.trim());
  if (lines.length <= 1) return lines.join('\n');
  const images = lines.slice(1).map(l => {
    const parts = l.split(/\s{2,}/);
    return `${parts[0]} ${parts[1] || ''} ${parts[3] || ''}`; // REPOSITORY TAG SIZE
  });
  return `${images.length} images\n` + images.slice(0, 10).join('\n');
}

function dockerLogs(raw, _opts = {}) {
  // Deduplicate repeated log lines
  const lines = raw.split('\n');
  const counts = {};
  const order = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (counts[t]) { counts[t]++; }
    else { counts[t] = 1; order.push(t); }
  }

  const out = order.map(l => counts[l] > 1 ? `${l} (×${counts[l]})` : l);
  if (out.length > 50) return out.slice(0, 50).join('\n') + `\n... ${out.length - 50} more unique lines`;
  return out.join('\n');
}

function kubectlPods(raw, _opts = {}) {
  const lines = raw.split('\n').filter(l => l.trim());
  if (lines.length <= 1) return lines.join('\n');
  const pods = lines.slice(1).map(l => {
    const parts = l.split(/\s{2,}/);
    return `${parts[0]} ${parts[1] || ''} ${parts[2] || ''}`; // NAME READY STATUS
  });
  return `${pods.length} pods\n` + pods.join('\n');
}

// Route
module.exports = {
  default(raw, opts = {}) {
    const cmd = opts.cmd || '';
    if (cmd.includes('ps') || cmd.includes('compose ps') || cmd.includes('get pods')) {
      if (cmd.includes('kubectl') || cmd.includes('oc ')) return kubectlPods(raw, opts);
      return dockerPs(raw, opts);
    }
    if (cmd.includes('images')) return dockerImages(raw, opts);
    if (cmd.includes('logs')) return dockerLogs(raw, opts);
    if (cmd.includes('services') || cmd.includes('get services')) return dockerPs(raw, opts); // same pattern
    return raw.trim();
  },
  ps: dockerPs,
  images: dockerImages,
  logs: dockerLogs,
  pods: kubectlPods,
  services: dockerPs,
};
