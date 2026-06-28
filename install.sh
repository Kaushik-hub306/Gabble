#!/usr/bin/env bash
# Gabble install script — one-command setup
# curl -fsSL https://raw.githubusercontent.com/Kaushik-hub306/Gabble/main/install.sh | bash

set -e

RED='\033[0;31m' GREEN='\033[0;32m' CYAN='\033[0;36m' NC='\033[0m'
INSTALL_DIR="${GABBLE_INSTALL_DIR:-$HOME/.gabble}"
BIN_DIR="${GABBLE_BIN_DIR:-$HOME/.local/bin}"
PLUGIN_DIR="${CLAUDE_PLUGIN_DIR:-$HOME/.claude/plugins/cache/gabble/gabble/1.0.0}"

echo -e "${CYAN}Gabble — lazy dev + token optimizer${NC}"
echo ""

# Detect OS
case "$(uname -s)" in
  Darwin)  OS="macos" ;;
  Linux)   OS="linux" ;;
  *)       echo -e "${RED}Unsupported OS${NC}"; exit 1 ;;
esac

# Check Node.js
if ! command -v node &>/dev/null; then
  echo -e "${RED}Node.js required. Install from https://nodejs.org${NC}"
  exit 1
fi

NODE_VER=$(node -v | cut -d. -f1 | tr -d 'v')
if [ "$NODE_VER" -lt 18 ]; then
  echo -e "${RED}Node.js 18+ required (found $(node -v))${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} Node.js $(node -v)"

# Install gabble CLI
mkdir -p "$BIN_DIR"
cp bin/gabble "$BIN_DIR/gabble"
cp bin/gabble-gain "$BIN_DIR/gabble-gain"
cp bin/gabble-discover "$BIN_DIR/gabble-discover"
cp bin/gabble-init "$BIN_DIR/gabble-init"
cp bin/gabble-session "$BIN_DIR/gabble-session"
chmod +x "$BIN_DIR/gabble" "$BIN_DIR/gabble-gain" "$BIN_DIR/gabble-discover" "$BIN_DIR/gabble-init" "$BIN_DIR/gabble-session"

# Add to PATH if needed
if ! echo "$PATH" | grep -q "$BIN_DIR"; then
  echo "export PATH=\"$BIN_DIR:\$PATH\"" >> "$HOME/.bashrc"
  echo "export PATH=\"$BIN_DIR:\$PATH\"" >> "$HOME/.zshrc" 2>/dev/null || true
  echo -e "${GREEN}✓${NC} Added $BIN_DIR to PATH (restart shell or source ~/.zshrc)"
else
  echo -e "${GREEN}✓${NC} $BIN_DIR already in PATH"
fi

# Install Claude Code plugin
mkdir -p "$PLUGIN_DIR"
cp -r .claude-plugin hooks skills filters GABBLE.md AGENTS.md "$PLUGIN_DIR/" 2>/dev/null || true

# Register plugin
CLAUDE_CONFIG="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
SETTINGS="$CLAUDE_CONFIG/settings.json"

if [ -f "$SETTINGS" ]; then
  # Add statusline if missing
  if ! grep -q "gabble-statusline" "$SETTINGS" 2>/dev/null; then
    echo -e "${CYAN}ℹ${NC} To enable statusline, add to $SETTINGS:"
    echo '  "statusLine": { "type": "command", "command": "bash \"'"$PLUGIN_DIR"'/hooks/gabble-statusline.sh\"" }'
  fi
fi

echo ""
echo -e "${GREEN}✓ Gabble installed!${NC}"
echo ""
echo "  CLI:          gabble <command>"
echo "  Gain:         gabble-gain"
echo "  Discover:     gabble-discover"
echo "  Init hook:    gabble-init -g"
echo ""
echo "  In Claude Code, gabble activates automatically next session."
echo "  Or run: /gabble full"
echo ""
