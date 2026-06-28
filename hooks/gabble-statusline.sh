#!/usr/bin/env bash
# gabble: terminal statusline badge
# Displays [GABBLE] or [GABBLE:MODE] when gabble is active.

flag="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.gabble-active"
[ -f "$flag" ] || exit 0

mode=$(tr -d '[:space:]' < "$flag")

if [ -z "$mode" ] || [ "$mode" = "full" ]; then
  printf '\033[38;5;75m[GABBLE]\033[0m'
else
  printf '\033[38;5;75m[GABBLE:%s]\033[0m' "$(echo "$mode" | tr '[:lower:]' '[:upper:]')"
fi
