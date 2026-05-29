# Linux desktop launcher

A one-time installer that registers a **MASQUER** XDG launcher in your app
menu **and** drops a clickable launcher on your Desktop (if you have one).
The launcher builds and serves the production bundle, then opens it in
your browser.

## Requirements

- A modern Linux desktop (GNOME, KDE, XFCE, Cinnamon, Mate, Pantheon, …)
- [Node.js 20+](https://nodejs.org/) (`apt install nodejs` / `dnf install nodejs` / `pacman -S nodejs`)
- [pnpm](https://pnpm.io/installation):
  - `curl -fsSL https://get.pnpm.io/install.sh | sh -`
  - or `npm install -g pnpm`
- A terminal emulator on PATH (`gnome-terminal`, `konsole`, `xfce4-terminal`,
  `kitty`, `alacritty`, …). The installer auto-detects the first available
  one. If none are installed the launcher still works, it just runs without
  a visible terminal window.

## Install (one-time)

From the repo root:

```bash
bash scripts/linux/install-shortcut.sh
```

You'll get **MASQUER** in your app menu and a clickable launcher on your
Desktop.

## Use

- Click **MASQUER** in your app launcher / app menu, **or** double-click the
  Desktop entry. (On GNOME the first launch of a Desktop entry may prompt
  "Untrusted application launcher" — right-click → **Allow Launching**.)
- A terminal window shows install / build progress (first run only), then
  starts the server and opens your default browser to
  `http://localhost:4173`.
- **Close the terminal window** (or hit Ctrl-C) to stop the server.

## How it works

- The installer writes a `[Desktop Entry]` to
  `~/.local/share/applications/masquer.desktop` (so it appears in your app
  menu) and copies it to `~/Desktop/masquer.desktop` (if the desktop
  directory exists).
- The entry's `Exec=` line wraps the launcher in your terminal emulator:
  e.g. `gnome-terminal -- bash /path/to/scripts/linux/MASQUER.sh`.
- `Icon=` points directly at `public/favicon.svg` — most desktops render
  SVG icons natively, no rasterisation needed.
- The `.sh` launcher:
  1. Locates `pnpm` even when launched from a `.desktop` entry (handles
     `~/.local/share/pnpm`, `~/.local/bin`, `~/.nvm/...`).
  2. Runs `pnpm install` if `node_modules/` is missing.
  3. Runs `pnpm build` if `dist/` is missing **or** any `src/` file is newer
     than `dist/`.
  4. Starts `pnpm exec vite preview --port 4173 --host 127.0.0.1 --strictPort`.
  5. Polls the port until it binds, then opens it with `xdg-open` (or `gio
open` as a fallback).
  6. Cleans the server up on window close (`trap … EXIT`).

## Re-run when you move the repo

The `.desktop` file hard-codes the absolute path to this checkout. If you
move/rename the repo directory, re-run the installer:

```bash
bash scripts/linux/install-shortcut.sh
```

## Custom port

```bash
MASQUER_PORT=8080 bash scripts/linux/install-shortcut.sh
```

Or set `MASQUER_PORT` in your shell before launching — the `.sh` script
respects it.

## Uninstall

```bash
rm -f ~/.local/share/applications/masquer.desktop ~/Desktop/masquer.desktop
update-desktop-database ~/.local/share/applications/ 2>/dev/null || true
```

The repo is untouched.
