#!/usr/bin/env node
// gabble: shared config resolver
// Resolution order: env GABBLE_DEFAULT_MODE → config file → 'full'

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_MODE = 'full';
const VALID_MODES = ['off', 'lite', 'full', 'ultra', 'review'];
const RUNTIME_MODES = ['off', 'lite', 'full', 'ultra'];

function normalizeMode(mode) {
  if (typeof mode !== 'string') return null;
  const m = mode.trim().toLowerCase();
  return RUNTIME_MODES.includes(m) ? m : null;
}

function normalizeConfigMode(mode) {
  if (typeof mode !== 'string') return null;
  const m = mode.trim().toLowerCase();
  return VALID_MODES.includes(m) ? m : null;
}

function normalizePersistedMode(mode) {
  return normalizeMode(mode) || normalizeConfigMode(mode);
}

function isDeactivationCommand(text) {
  const t = text.trim().toLowerCase().replace(/[.!?]+$/, '').trim();
  return t === 'stop gabble' || t === 'normal mode';
}

function isShellSafe(p) {
  return /^[A-Za-z0-9 _.\-:/\\~]+$/.test(p);
}

function getConfigDir() {
  if (process.env.GABBLE_CONFIG_DIR) return process.env.GABBLE_CONFIG_DIR;
  if (process.env.XDG_CONFIG_HOME) return path.join(process.env.XDG_CONFIG_HOME, 'gabble');
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'gabble');
  }
  return path.join(os.homedir(), '.config', 'gabble');
}

function getConfigPath() {
  return path.join(getConfigDir(), 'config.json');
}

function getClaudeDir() {
  if (process.env.CLAUDE_CONFIG_DIR) return process.env.CLAUDE_CONFIG_DIR;
  return path.join(os.homedir(), '.claude');
}

function getDefaultMode() {
  if (process.env.GABBLE_DEFAULT_MODE) {
    const m = normalizeConfigMode(process.env.GABBLE_DEFAULT_MODE);
    if (m) return m;
  }
  try {
    const raw = fs.readFileSync(getConfigPath(), 'utf-8');
    const cfg = JSON.parse(raw);
    const m = normalizeConfigMode(cfg.defaultMode);
    if (m) return m;
  } catch (_) { /* no config file — use default */ }
  return DEFAULT_MODE;
}

function writeDefaultMode(mode) {
  const m = normalizeConfigMode(mode);
  if (!m) return false;
  const dir = getConfigDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getConfigPath(), JSON.stringify({ defaultMode: m }, null, 2));
  return true;
}

module.exports = {
  DEFAULT_MODE, VALID_MODES, RUNTIME_MODES,
  normalizeMode, normalizeConfigMode, normalizePersistedMode,
  isDeactivationCommand, isShellSafe,
  getConfigDir, getConfigPath, getClaudeDir,
  getDefaultMode, writeDefaultMode,
};
