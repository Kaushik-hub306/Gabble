# Security Policy

## What Gabble does with your data

Gabble runs entirely locally. It never sends command output, file paths, or
any user data to external servers.

- **Token tracking** (`~/.gabble/history.json`): stores command names (not
  arguments), token counts, and timestamps. Stays on your machine.
- **Tee recovery** (`~/.gabble/tee/`): saves raw command output on failure.
  Stays on your machine. Auto-cleaned after 90 days.
- **Config** (`~/.config/gabble/config.toml`): your preferences. Stays on
  your machine.
- **Telemetry**: disabled by default. If enabled, sends only anonymized
  aggregate counts (command types, token savings, no arguments/paths/data).

## Reporting a vulnerability

Email: `security@gabble.dev` (or open a private GitHub security advisory)

Response: within 48 hours.

## Scope

- The gabble CLI (`bin/gabble`) executes arbitrary commands you pass to it.
  It adds no privilege escalation — it runs with your user's permissions.
- The auto-rewrite hook (`gabble-pretooluse.js`) only modifies Bash tool
  calls by prefixing them with the gabble binary path. It does not alter
  command arguments.
- The MCP server (`mcp/server.js`) exposes gabble tools over stdio. It
  runs locally with the same permissions as the calling process.
