#!/usr/bin/env bash
# Creates ~/Desktop/MASQUER.app — a double-clickable macOS launcher for this
# local checkout of the MASQUER repo. Idempotent: re-running replaces any
# existing app of the same name.
#
# Usage:
#   bash scripts/macos/install-shortcut.sh
#
# The .app delegates to scripts/macos/MASQUER.command in this repo. If you
# move/rename the repo, just re-run this installer to refresh the path.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
LAUNCHER="$SCRIPT_DIR/MASQUER.command"
APP="$HOME/Desktop/MASQUER.app"

if [[ ! -f "$LAUNCHER" ]]; then
  printf '❌  Launcher not found at %s\n' "$LAUNCHER"
  exit 1
fi
chmod +x "$LAUNCHER"

printf '🎭  Installing MASQUER.app to your Desktop...\n'

# Wipe any prior install so re-runs are deterministic.
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

# Info.plist
cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>MASQUER</string>
  <key>CFBundleDisplayName</key><string>MASQUER</string>
  <key>CFBundleIdentifier</key><string>local.masquer.launcher</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleExecutable</key><string>MASQUER</string>
  <key>CFBundleIconFile</key><string>MASQUER.icns</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>LSUIElement</key><false/>
</dict>
</plist>
PLIST

# The .app's executable just opens Terminal on the launcher .command.
# Using `open -a Terminal` gives the user the standard terminal window with
# the build progress + server output (and closing the window stops the
# server via the launcher's trap).
cat > "$APP/Contents/MacOS/MASQUER" <<STUB
#!/usr/bin/env bash
exec /usr/bin/open -a Terminal "$LAUNCHER"
STUB
chmod +x "$APP/Contents/MacOS/MASQUER"

# Best-effort icon: render the existing favicon.svg (the MASQUER mask) into
# a proper .icns. Skip gracefully if the macOS Quick Look renderer hiccups.
ICON_SRC="$REPO_ROOT/public/favicon.svg"
if [[ -f "$ICON_SRC" ]] && command -v qlmanage >/dev/null && command -v sips >/dev/null && command -v iconutil >/dev/null; then
  TMP_DIR="$(mktemp -d)"
  ICONSET="$TMP_DIR/MASQUER.iconset"
  mkdir -p "$ICONSET"

  printf '🎨  Rendering icon from public/favicon.svg...\n'

  # qlmanage renders an SVG to PNG via Quick Look. Output goes to
  # <TMP_DIR>/favicon.svg.png by default at 1024x1024 max.
  qlmanage -t -s 1024 -o "$TMP_DIR" "$ICON_SRC" >/dev/null 2>&1 || true
  RENDERED="$TMP_DIR/favicon.svg.png"

  if [[ -f "$RENDERED" ]]; then
    for sz in 16 32 64 128 256 512; do
      sips -z $sz $sz                "$RENDERED" --out "$ICONSET/icon_${sz}x${sz}.png"     >/dev/null
      sips -z $((sz * 2)) $((sz * 2)) "$RENDERED" --out "$ICONSET/icon_${sz}x${sz}@2x.png" >/dev/null
    done
    iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/MASQUER.icns" 2>/dev/null || true
  else
    printf '   (Skipped — SVG render unavailable; Finder will show the default icon)\n'
  fi

  rm -rf "$TMP_DIR"
fi

# Nudge Finder to refresh the icon cache for this bundle.
touch "$APP"

printf '\n✅  Installed: %s\n' "$APP"
printf '   Repo: %s\n' "$REPO_ROOT"
printf '\n   Double-click MASQUER on your Desktop to launch.\n\n'
