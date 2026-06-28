# Contributing to Gabble

Gabble follows its own philosophy: minimal, lazy, efficient.

## Adding a filter module

1. Create `filters/<name>.js`
2. Export a `default(raw, opts)` function
3. Optionally export named sub-functions (e.g., `status`, `diff`)
4. Register in `bin/gabble` ROUTES table
5. Register in `hooks/gabble-pretooluse.js` REWRITE_PATTERNS
6. Smoke test: `node bin/gabble <command>`

Filter signature: `function filter(rawOutput, { verbose, ultra, exitCode, cmd })`
Return: filtered string.

## Design rules

- **One filter per ecosystem** (git.js, test.js, lint.js, etc.)
- **Sub-300 lines per filter** — if longer, split the ecosystem
- **Graceful fallback** — if parsing fails, return raw output unchanged
- **Exit code preservation** — never swallow non-zero exit codes
- **<10ms overhead** — filters must be fast
- **No dependencies** — stdlib only (Node `fs`, `path`, `child_process`)
- **Quiet by default** — no console.log in filter code; use verbose flag

## Adding a skill

Skills live in `skills/<name>/SKILL.md` with YAML frontmatter:
```yaml
---
name: gabble-<name>
description: What it does + trigger phrases
---
```

Register in `hooks/gabble-mode-tracker.js` if it changes mode.

## PR checklist

- [ ] Filter module: smoke test with real command output
- [ ] No new npm dependencies
- [ ] Works on macOS and Linux
- [ ] `node -e "require('./filters/new-filter')"` loads without error
