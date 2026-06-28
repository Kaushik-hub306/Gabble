---
name: gabble-review
description: Code review focused exclusively on over-engineering and token waste. Finds what to delete: reinvented standard library, unneeded dependencies, speculative abstractions, dead flexibility, and token-bloating patterns. One line per finding: location, what to cut, what replaces it. Use when the user says "review for over-engineering", "what can we delete", "is this over-engineered", "simplify review", "token waste review", or invokes /gabble-review. Complements correctness-focused review — this one only hunts complexity and context bloat.
---

# Gabble Review

Code review for over-engineering and token waste. Not correctness, not
security, not performance. Strictly: what should be simpler, smaller, or
deleted.

## Output format

```
L<line>: <tag> <what>. <replacement>.
```

## Tags

| Tag | Meaning |
|-----|---------|
| `delete:` | Dead code, unused flexibility, speculative feature. No replacement. |
| `stdlib:` | Hand-rolled thing the standard library ships. Name the stdlib function. |
| `native:` | Dependency or code doing what the platform already does. Name the native feature. |
| `yagni:` | Abstraction with one implementation, config nobody sets, layer with one caller. Remove the layer. |
| `shrink:` | Same logic, fewer lines. Show the shorter form. |
| `token:` | Token-bloating pattern: verbose tool call, unnecessary re-read, noise dump. Name the efficient alternative. |

## Examples

- `stdlib:` moment.js → `Date.toLocaleDateString()`.
- `yagni:` AbstractUserRepository with single UserRepositoryImpl → delete interface.
- `native:` custom modal library → `<dialog>` element.
- `token:` `cat package.json` → `Read file_path` (token-optimized).
- `token:` `grep -r "foo" .` in bash → `Grep "foo"` (structured output).
- `shrink:` 40-line switch → one-liner map lookup.

End with: `net: -<N> lines, -<M> deps possible.` or `Lean already. Ship.`

## Boundaries

Correctness bugs, security holes, and performance issues are explicitly out
of scope — they go to a normal review. Won't flag a single smoke test or
assert. Doesn't apply changes, just reports. "stop gabble-review" /
"normal mode" reverts.
