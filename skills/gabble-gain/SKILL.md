---
name: gabble-gain
description: Show gabble's measured impact as a compact scoreboard: less code, less cost, more speed. Also runs "gabble-gain" CLI to show per-session token savings when available. One-shot display, not a persistent mode, and not a per-repo number. Trigger: /gabble-gain, "gabble gain", "what does gabble save", "show gabble impact", "gabble scoreboard".
---

# Gabble Gain

One-shot display. Do NOT change mode, write flag files, or persist anything.

## Scoreboard (benchmark medians, n=5 tasks, 3 models)

Combined lazy-dev + token-optimizer impact vs. no-skill baseline:

```
Lines of code:  ▼ 80–94%   ████████████████████ (no-skill)
                           ████ (gabble full)

Cost (tokens):  ▼ 47–77%   ████████████████████ (no-skill)
                           ████████ (gabble full)

Speed:          ▸ 3–6× faster end-to-end
```

## Per-session savings (if gabble CLI active)

Also run `gabble-gain` from the CLI to show actual token savings from the
current session/machine:

```
gabble-gain              # summary
gabble-gain --graph      # ASCII chart
gabble-gain --daily      # day-by-day breakdown
gabble-gain --json       # machine-readable
```

## Honesty boundary

The benchmark numbers are published medians, not this repo. The only real
per-repo figures come from `/gabble-debt` and `gabble-gain` CLI output.
Never fabricate per-repo savings — point to the tools that measure them.

→ `/gabble-debt` for the shortcut ledger.
→ `gabble-gain` CLI for per-machine token tracking.
→ `/gabble-audit` for repo-wide savings opportunities.

## Boundaries

One-shot display only — edits nothing, changes no mode. "stop gabble" /
"normal mode" reverts.
