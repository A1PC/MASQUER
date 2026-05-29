#!/usr/bin/env bash
# MASQUER — local launcher
#
# Double-click this file (or the MASQUER.app on your Desktop that points at
# it) to open MASQUER in your default browser. The first run installs deps
# and builds the app; subsequent runs reuse the build unless `src/` is newer.
#
# Close the Terminal window (or hit Ctrl-C) to stop the server.

set -euo pipefail

# Resolve repo root from this script's location: scripts/macos/MASQUER.command
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

printf '\n🎭  MASQUER — local launcher\n'
printf '════════════════════════════\n\n'

# Make sure pnpm is reachable even when Launch Services strips PATH.
if ! command -v pnpm >/dev/null 2>&1; then
  for p in /opt/homebrew/bin /usr/local/bin "$HOME/.local/share/pnpm" "$HOME/Library/pnpm"; do
    if [[ -x "$p/pnpm" ]]; then
      export PATH="$p:$PATH"
      break
    fi
  done
fi

if ! command -v pnpm >/dev/null 2>&1; then
  printf '❌  pnpm not found on PATH.\n'
  printf '    Install it once with:  brew install pnpm\n\n'
  printf 'Press any key to close...\n'
  read -r -n 1
  exit 1
fi

# First-run install. Idempotent; skipped on subsequent launches.
if [[ ! -d node_modules ]]; then
  printf '📦  Installing dependencies (first run only, ~1 min)...\n'
  pnpm install
fi

# Build if dist/ is missing OR any source file is newer than dist/.
REBUILD=0
if [[ ! -d dist ]]; then
  REBUILD=1
elif find src -type f -newer dist -print -quit 2>/dev/null | grep -q .; then
  REBUILD=1
fi

if [[ "$REBUILD" -eq 1 ]]; then
  printf '🏗   Building MASQUER...\n'
  pnpm build
fi

PORT="${MASQUER_PORT:-4173}"

printf '\n▶︎   Serving on http://localhost:%s\n' "$PORT"
printf '    Browser will open automatically.\n'
printf '    Close this window to stop the server.\n\n'

# Start the preview server in the background.
pnpm exec vite preview --port "$PORT" --host 127.0.0.1 --strictPort &
SERVER_PID=$!

# Tear down the server cleanly when the user closes the window or hits Ctrl-C.
cleanup() {
  if kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup INT TERM EXIT

# Wait for the server to bind before opening the browser.
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -s -o /dev/null "http://127.0.0.1:$PORT/"; then
    break
  fi
  sleep 0.3
done

open "http://localhost:$PORT"

# Block on the server. When it exits (Ctrl-C / window close), `cleanup` runs.
wait "$SERVER_PID"
