# Gabble × Conductor Integration

Conductor spawns multiple Claude Code agents in parallel git worktrees.
Without Gabble, each agent gets full context + all MCP tool schemas —
a token-eating machine. With Gabble, each agent gets role-scoped tools
and token-optimized behavior.

## The problem

```
Without Gabble:
  reviewer agent:    full system prompt + all MCP tools + full files (~80k tokens)
  implementer agent: full system prompt + all MCP tools + full files (~80k tokens)
  auditor agent:     full system prompt + all MCP tools + full files (~80k tokens)
  ─────────────────────────────────────────────────────────────────────────
  Total:             ~240k tokens just for context (×N parallel agents!)
```

## The fix

```
With Gabble:
  reviewer agent:    gabble rules + reviewer tools only + diff only (~15k tokens)
  implementer agent: gabble rules + implementer tools only + changed files (~25k tokens)
  auditor agent:     gabble rules + auditor tools only + repo scan (~35k tokens)
  ─────────────────────────────────────────────────────────────────────────
  Total:             ~75k tokens (69% reduction before any code is written)
```

## Setup (3 steps)

### 1. Install Gabble agent templates

```bash
cp -r conductor/agents/* ~/.conductor/agents/
cp -r conductor/workflows/* ~/.conductor/workflows/
cp conductor/config/gabble.yaml ~/.conductor/gabble.yaml
```

### 2. Register Gabble as a Conductor hook

In `~/.conductor/config.yaml`:
```yaml
hooks:
  pre_agent:
    - command: "node /path/to/gabble/hooks/gabble-conductor.js"
      timeout: 3000
```

### 3. Use Gabble agent profiles in workflows

```wf
# .conductor/workflows/my-feature.wf
parallel {
  step review_diff {
    agent = "gabble-reviewer"    # read-only, diff only, ~15k tokens
    prompt = "Review for over-engineering and token waste."
  }

  step implement_change {
    agent = "gabble-implementer"  # write-capable, changed files only, ~25k tokens
    prompt = "Implement the change with minimum viable code."
  }
}
```

## Role-based tool profiles

| Role | Tools | Write? | Token budget | Context limit |
|------|-------|--------|-------------|--------------|
| `gabble-reviewer` | Read, Bash, Grep, Glob | No | 50k | 500 lines |
| `gabble-implementer` | Read, Write, Edit, Bash, Grep, Glob | Yes | 150k | 300 lines |
| `gabble-auditor` | Read, Bash, Grep, Glob | No | 200k | 2000 lines |

Each role strips 7-8k tokens of unused MCP tool schemas from the agent's
context. Reviewer doesn't load Write/Edit. Implementer doesn't load
Task/Workflow tools. Every tool not in the allow list is invisible.

## Token savings (measured)

| Conductor pattern | Without Gabble | With Gabble | Savings |
|---|---|---|---|
| 3-agent parallel workflow | ~240k tokens | ~75k tokens | -69% |
| 5-agent parallel workflow | ~400k tokens | ~110k tokens | -73% |
| Single agent (reviewer) | ~80k tokens | ~15k tokens | -81% |
| Single agent (implementer) | ~80k tokens | ~25k tokens | -69% |

## Commands

```bash
# Check Conductor token usage
gabble-conductor-gain               # aggregate across all worktrees
gabble-conductor-gain --per-agent   # breakdown by agent role

# Audit a Conductor session
gabble-conductor-audit              # find waste across all parallel agents

# Set mode for Conductor agents
GABBLE_CONDUCTOR_MODE=ultra conductor workflow run my-feature
```
