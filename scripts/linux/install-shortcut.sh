#!/usr/bin/env bash
# Installs an XDG .desktop entry for MASQUER, pointing at this checkout's
# scripts/linux/MASQUER.sh. By default it installs to
# `~/.local/share/applications/` (so it shows up in your launcher / app menu)
# AND drops a copy on `~/Desktop/` if that directory exists.
#
# Idempotent: re-running replaces any existing entries.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
LAUNCHER="$SCRIPT_DIR/MASQUER.sh"
ICON_SRC="$REPO_ROOT/public/favicon.svg"

APPS_DIR="$HOME/.local/share/applications"
DESKTOP_DIR="${XDG_DESKTOP_DIR:-$HOME/Desktop}"
APPS_FILE="$APPS_DIR/masquer.desktop"
DESKTOP_FILE="$DESKTOP_DIR/masquer.desktop"

if [[ ! -f "$LAUNCHER" ]]; then
  printf '❌  Launcher not found at %s\n' "$LAUNCHER"
  exit 1
fi
chmod +x "$LAUNCHER"

printf '🎭  Installing MASQUER launcher...\n'

mkdir -p "$APPS_DIR"

# Pick a terminal emulator that supports `-e`. Most desktops have one; if
# none of the common ones are available the user can edit the .desktop's
# Exec= line to taste.
TERM_CMD=""
for t in x-terminal-emulator gnome-terminal konsole xfce4-terminal kitty alacritty wezterm tilix lxterminal terminator urxvt xterm; do
  if command -v "$t" >/dev/null 2>&1; then
    case "$t" in
      gnome-terminal) TERM_CMD="$t --"        ;;
      konsole)        TERM_CMD="$t -e"        ;;
      xfce4-terminal) TERM_CMD="$t -e"        ;;
      kitty|alacritty|wezterm) TERM_CMD="$t -e" ;;
      tilix)          TERM_CMD="$t -e"        ;;
      lxterminal)     TERM_CMD="$t -e"        ;;
      terminator)     TERM_CMD="$t -x"        ;;
      urxvt|xterm)    TERM_CMD="$t -e"        ;;
      *)              TERM_CMD="$t -e"        ;;
    esac
    break
  fi
done

if [[ -z "$TERM_CMD" ]]; then
  printf '⚠️   No terminal emulator detected on PATH. The .desktop entry will\n'
  printf '    fall back to running MASQUER.sh directly (no visible terminal).\n'
  EXEC_LINE="$LAUNCHER"
else
  EXEC_LINE="$TERM_CMD bash \"$LAUNCHER\""
fi

cat > "$APPS_FILE" <<DESKTOP
[Desktop Entry]
Type=Application
Name=MASQUER
GenericName=Local Play-Money Casino
Comment=Old-school Vegas content, modern-web execution.
Exec=$EXEC_LINE
Icon=$ICON_SRC
Terminal=false
Categories=Game;
StartupNotify=false
StartupWMClass=MASQUER
DESKTOP

chmod +x "$APPS_FILE"

printf '   Installed: %s\n' "$APPS_FILE"

# Drop a copy on the Desktop too, if the directory exists. Many DEs need the
# .desktop file to be marked trusted (chmod +x + the `metadata::trusted`
# flag) before it appears as a clickable launcher; we do what we can here.
if [[ -d "$DESKTOP_DIR" ]]; then
  cp -f "$APPS_FILE" "$DESKTOP_FILE"
  chmod +x "$DESKTOP_FILE"
  if command -v gio >/dev/null 2>&1; then
    gio set "$DESKTOP_FILE" metadata::trusted true 2>/dev/null || true
  fi
  printf '   Installed: %s\n' "$DESKTOP_FILE"
  printf '   (Right-click → Allow Launching if your desktop asks.)\n'
fi

# Refresh the application database where supported.
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$APPS_DIR" >/dev/null 2>&1 || true
fi

printf '\n✅  Done. Launch MASQUER from your app menu or Desktop.\n'
printf '    Repo: %s\n\n' "$REPO_ROOT"
