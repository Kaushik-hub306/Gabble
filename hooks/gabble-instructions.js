#!/usr/bin/env node
// gabble: instruction generator — reads SKILL.md and filters for active mode

const fs = require('fs');
const path = require('path');
const { DEFAULT_MODE, normalizeMode, normalizePersistedMode } = require('./gabble-config');

const REVIEW_MODE = 'review';
const SKILL_PATH = path.join(__dirname, '..', 'skills', 'gabble', 'SKILL.md');

function filterSkillBodyForMode(body, mode) {
  const lines = body.split('\n');
  const out = [];
  let inFrontmatter = false;
  let frontmatterDone = false;

  for (const line of lines) {
    if (!frontmatterDone && line.trim() === '---') {
      inFrontmatter = !inFrontmatter;
      frontmatterDone = !inFrontmatter;
      continue;
    }
    if (!frontmatterDone) continue;

    // mode-labeled rows: keep if matching current mode or unlabeled
    const modeLabel = line.match(/^\|\s*\*{0,2}(\w+)\*{0,2}\s*\|/);
    if (modeLabel && ['lite', 'full', 'ultra'].includes(modeLabel[1])) {
      if (modeLabel[1] === mode) out.push(line);
      continue;
    }

    // mode-tagged bullets: "- **full**: ..."
    const bulletLabel = line.match(/^-\s+\*{0,2}(lite|full|ultra)\*{0,2}\s*:/);
    if (bulletLabel) {
      if (bulletLabel[1] === mode) out.push(line);
      continue;
    }

    out.push(line);
  }
  return out.join('\n');
}

function getFallbackInstructions(mode) {
  if (mode === REVIEW_MODE) {
    return 'Gabble review mode: audit this codebase for over-engineering and token waste. One finding per line: location, what to cut, what replaces it.';
  }
  return `Gabble ${mode} mode active. Lazy dev + token optimizer. Combine YAGNI with precision retrieval.`;
}

function getGabbleInstructions(mode) {
  const m = normalizePersistedMode(mode) || DEFAULT_MODE;

  if (m === REVIEW_MODE) return getFallbackInstructions(REVIEW_MODE);

  try {
    const raw = fs.readFileSync(SKILL_PATH, 'utf-8');
    const filtered = filterSkillBodyForMode(raw, m);
    if (filtered.trim()) return filtered;
  } catch (_) { /* SKILL.md missing — use fallback */ }

  return getFallbackInstructions(m);
}

module.exports = { filterSkillBodyForMode, getFallbackInstructions, getGabbleInstructions, SKILL_PATH, REVIEW_MODE };
