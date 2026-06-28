---
name: gabble-audit
description: Whole-repo audit for over-engineering and token waste. Like gabble-review, but scans the entire codebase instead of a diff: a ranked list of what to delete, simplify, or replace with stdlib/native/token-efficient equivalents. Use when the user says "audit this codebase", "audit for over-engineering", "what can I delete from this repo", "find bloat", "gabble-audit", or "/gabble-audit". One-shot report, does not apply fixes.
---

# Gabble Audit

gabble-review, repo-wide. Scan the whole tree, rank findings biggest cut
first. Same tags, broader scope.

## Hunt

Grep the repo for:

- Dependencies already provided by stdlib or platform
- Single-implementation interfaces (abstract class with one subclass)
- Factories with one product
- Wrappers that only delegate (class Wrapper { method() { return x.method(); } })
- Single-export files (one function in its own module)
- Dead flags, unused config keys
- Hand-rolled stdlib (custom deepClone, custom debounce, custom UUID)
- Token bloat: `cat file | grep x` instead of `Grep "x"`, full-file reads when a line range would do
- Unfiltered bash commands: `npm test` without `--silent`, `git status` in full verbose

## Output

One line per finding, ranked by impact:

```
<tag> <what to cut>. <replacement>. [path]
```

End with:

```
net: -<N> lines, -<M> deps, -<K> tokens/run possible.
```

If nothing to cut: `Lean already. No token waste found. Ship.`

## Boundaries

Over-engineering, complexity, and token waste only. Correctness bugs,
security holes, performance are out of scope. Lists findings, applies
nothing. One-shot. "stop gabble-audit" / "normal mode" reverts.
