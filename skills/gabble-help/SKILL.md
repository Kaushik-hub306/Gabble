---
name: gabble-help
description: Quick-reference card for all gabble modes, skills, and commands. One-shot display, not a persistent mode. Trigger: /gabble-help, "gabble help", "what gabble commands", "how do I use gabble".
---

# Gabble Help

## Levels

| Command | What it does |
|---------|-------------|
| `/gabble lite` | Build what's asked, name lazier alternative. Token rules advisory. |
| `/gabble` or `/gabble full` | Combined ladder enforced. Stdlib + native first. Token rules mandatory. Default. |
| `/gabble ultra` | YAGNI extremist. Deletion before addition. Max compression. |
| `/gabble off` | Revert to normal. Same as "stop gabble" / "normal mode". |

Level persists until changed or session ends.

## Skills

| Skill | Trigger | What it does |
|-------|---------|-------------|
| **gabble** | (auto on session start) | Lazy dev + token optimizer. The combined ladder. |
| **gabble-review** | `/gabble-review` | Over-engineering + token waste review of current diff. |
| **gabble-audit** | `/gabble-audit` | Repo-wide audit: ranked list of what to delete. |
| **gabble-debt** | `/gabble-debt` | Harvest `gabble:` comments into a debt ledger. |
| **gabble-gain** | `/gabble-gain` | Impact scoreboard + CLI savings stats. |
| **gabble-help** | `/gabble-help` | This reference card. |

## CLI tools

| Command | What it does |
|---------|-------------|
| `gabble <cmd>` | Run any command through the token filter (rtk-style). |
| `gabble gain` | Show token savings stats. |
| `gabble gain --graph` | ASCII chart of daily savings. |
| `gabble discover` | Find missed optimization opportunities. |
| `gabble discover --all` | Show full command examples. |

## Auto-rewrite hook

When enabled via plugin, gabble transparently intercepts bash commands and
rewrites them through the filter. No manual `gabble` prefix needed. Supports:
git, pytest, cargo test, go test, jest, eslint, ruff, tsc, docker, kubectl,
ls, grep, curl, and more.

Hook install: `gabble init -g` (when CLI is on PATH).

## Deactivation

"stop gabble", "normal mode", or `/gabble off` — all equivalent.

## Configure default mode

Env var: `GABBLE_DEFAULT_MODE=lite|full|ultra|off`
Config file: `~/.config/gabble/config.json` → `{ "defaultMode": "full" }`
Resolution order: env var > config file > `full`.

## More

Full docs: `GABBLE.md` in the project root.
