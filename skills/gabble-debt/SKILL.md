---
name: gabble-debt
description: Harvest every `gabble:` and `ponytail:` comment in the codebase into a debt ledger, so the deliberate shortcuts and deferrals get tracked instead of rotting into "later means never." Use when the user says "gabble debt", "/gabble-debt", "what did gabble defer", "list the shortcuts", "gabble ledger", or "what did we mark to do later." One-shot report, changes nothing.
---

# Gabble Debt

Harvest every `gabble:` comment into a debt ledger. These are deliberate
shortcuts marked during lazy development — if they're not tracked, "later"
becomes "never."

## Scan

```bash
grep -rnE '(#|//|--|<!--)\s*gabble:' . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build --exclude-dir=target
```

Adapt the comment prefix per stack (`#` for Python/Ruby/Shell, `//` for JS/TS/Go/Rust, `--` for SQL/Lua, `<!--` for HTML/XML).

Also scan for legacy `ponytail:` markers if the project migrated from ponytail to gabble.

## Expected comment format

```
// gabble: <what was simplified>. ceiling: <limit>. upgrade: <trigger to revisit>.
```

## Output

One row per marker, grouped by file:

```
<file>:<line>: <what was simplified>
  ceiling: <the limit named>
  upgrade: <trigger to revisit>
  owner: <git blame author> (optional)
```

- Any marker missing a ceiling or upgrade path → tag `no-trigger`.
- End with: `<N> shortcuts tracked.` or `No gabble: debt. Clean ledger.`

## Boundaries

Reads and reports only, changes nothing. Optionally writes `GABBLE-DEBT.md`
if asked. "stop gabble-debt" / "normal mode" reverts.
