# macOS desktop launcher

A one-time installer that drops a double-clickable **MASQUER.app** on your
Desktop. The app builds and serves the production bundle, then opens it in
your browser.

## Install (one-time)

From the repo root:

```bash
bash scripts/macos/install-shortcut.sh
```

That's it. `MASQUER.app` now lives on your Desktop with the brand mask icon.

## Use

- **Double-click** the MASQUER icon on your Desktop.
- A Terminal window shows install / build progress (first run only), then
  starts the server and opens your default browser to
  `http://localhost:4173`.
- **Close the Terminal window** (⌘W) to stop the server.

## How it works

- `MASQUER.app` is a tiny macOS bundle whose executable just delegates to
  `scripts/macos/MASQUER.command` inside this repo.
- The launcher script:
  1. Locates `pnpm` (handles Homebrew + Corepack PATH oddities under Launch
     Services).
  2. Runs `pnpm install` if `node_modules/` is missing.
  3. Runs `pnpm build` if `dist/` is missing **or** any `src/` file is newer
     than `dist/` (so edits land without manual rebuilds).
  4. Starts `pnpm exec vite preview --port 4173 --host 127.0.0.1 --strictPort`.
  5. Waits for the port to bind, then opens
     [http://localhost:4173](http://localhost:4173) in your browser.
  6. Cleans the server up on window close (`trap … EXIT`).
- The `.icns` icon is generated at install time from `public/favicon.svg`
  using built-in macOS tooling (`qlmanage` + `sips` + `iconutil`). If any
  step fails, the app still installs — Finder will just show the default
  generic icon.

## Re-run when you move the repo

The Desktop `.app` hard-codes the absolute path to this checkout. If you
move/rename the repo directory, just re-run the installer:

```bash
bash scripts/macos/install-shortcut.sh
```

## Custom port

```bash
MASQUER_PORT=8080 bash scripts/macos/install-shortcut.sh
```

Or set `MASQUER_PORT` in your shell before launching — the `.command`
respects it.

## Uninstall

```bash
rm -rf ~/Desktop/MASQUER.app
```

The repo is untouched.
