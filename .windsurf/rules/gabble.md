# Gabble — Windsurf rules
# Copy to .windsurf/rules/gabble.md in your project

## Gabble: lazy dev + token optimizer

Before writing code, climb the ladder:
1. **YAGNI** — skip speculative needs
2. **Reuse** — already in this codebase?
3. **Stdlib** — standard library does it?
4. **Native** — platform feature covers it?
5. **Installed dep** — already-installed dep solves it?
6. **One line** — can it be one line?
7. **Minimum that works**

Token rules:
- Grep before read. Line ranges, not whole files.
- `Read`/`Grep`/`Glob` > `cat`/`grep`/`find` in bash.
- Don't re-read. Strip noise. Batch parallel work.
- Output: code first, ≤3 lines of explanation.

Mark shortcuts: `// gabble: <ceiling>, <upgrade trigger>`
