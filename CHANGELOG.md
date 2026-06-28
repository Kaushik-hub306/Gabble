# Changelog

## 1.0.0 — 2026-06-27

### Added
- **Combined ladder:** 7-rung YAGNI ladder + token optimization rules
- **CLI filter engine:** `gabble` command — rtk-style command output compression
- **7 filter modules:** git, test (pytest/cargo/go/jest), lint (eslint/ruff/golangci), build (tsc/cargo/next), files (ls/cat/grep), docker/k8s, AWS
- **3 additional filter modules:** packages (npm/pnpm/pip/bundle), ruby (rspec/rubocop), generic (errors-only/dedup/truncation)
- **Auto-rewrite hook:** PreToolUse intercepts bash commands transparently
- **MCP server:** 5 tools (gabble_run, gabble_filter, gabble_gain, gabble_discover, gabble_help)
- **Analytics:** `gabble-gain` (savings stats), `gabble-discover` (missed opportunities), `gabble-session` (live session stats)
- **Setup:** `gabble-init -g` one-command hook installation
- **6 skills:** main, review, audit, debt, gain, help
- **Multi-agent support:** AGENTS.md + Cursor/Windsurf/Cline/OpenCode configs
- **Statusline badge:** [GABBLE] terminal indicator
- **Tee recovery:** saves raw output on failure for LLM re-reading
- **TOML config:** user-customizable filters and hook exclusions
- **Intensity levels:** lite (advisory), full (enforced, default), ultra (YAGNI extremist)
- **Install script:** one-command curl-to-bash setup
- **npm package:** `@gabble/plugin` for npm-based distribution
- **Examples:** 5 before/after comparisons
- **Benchmarks:** methodology + promptfoo config
