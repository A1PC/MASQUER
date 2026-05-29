#!/usr/bin/env bash
# MASQUER — local launcher (Linux)
#
# Run this script (or the .desktop entry installed via install-shortcut.sh)
# to open MASQUER in your default browser. The first run installs deps and
# builds the app; subsequent runs reuse the build unless `src/` is newer.
#
# Close the terminal window (or hit Ctrl-C) to stop the server.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

printf '\n🎭  MASQUER — local launcher\n'
printf '════════════════════════════\n\n'

# Locate pnpm — handle common install paths when launched from a .desktop
# entry where ~/.profile / shell init hasn't run.
if ! command -v pnpm >/dev/null 2>&1; then
  for p in \
    "$HOME/.local/share/pnpm" \
    "$HOME/.local/bin" \
    "$HOME/.nvm/versions/node/$(node -v 2>/dev/null)/bin" \
    /usr/local/bin \
    /usr/bin; do
    if [[ -x "$p/pnpm" ]]; then
      export PATH="$p:$PATH"
      break
    fi
  done
fi

if ! command -v pnpm >/dev/null 2>&1; then
  printf '❌  pnpm not found on PATH.\n'
  printf '    Install it once with one of:\n'
  printf '      curl -fsSL https://get.pnpm.io/install.sh | sh -\n'
  printf '      npm install -g pnpm\n'
  printf '      sudo apt install npm && sudo npm install -g pnpm\n\n'
  printf 'Press any key to close...\n'
  read -r -n 1
  exit 1
fi

if [[ ! -d node_modules ]]; then
  printf '📦  Installing dependencies (first run only, ~1 min)...\n'
  pnpm install
fi

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

pnpm exec vite preview --port "$PORT" --host 127.0.0.1 --strictPort &
SERVER_PID=$!

cleanup() {
  if kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup INT TERM EXIT

# Wait for the port to bind, then open the browser via xdg-open.
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -s -o /dev/null "http://127.0.0.1:$PORT/"; then
    break
  fi
  sleep 0.3
done

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://localhost:$PORT" >/dev/null 2>&1 &
elif command -v gio >/dev/null 2>&1; then
  gio open "http://localhost:$PORT" >/dev/null 2>&1 &
else
  printf '    (No xdg-open / gio — open http://localhost:%s manually.)\n' "$PORT"
fi

wait "$SERVER_PID"
