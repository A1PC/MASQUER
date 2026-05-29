# MASQUER desktop launchers

One-time installers for each major desktop platform. Each drops a
**MASQUER** shortcut (in your app menu, on your Desktop, or both) that
builds the production bundle on first launch, then opens the game in your
default browser.

| Platform | Installer                                    | What it creates                                                                                    |
| -------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| macOS    | [`macos/install-shortcut.sh`](./macos/)      | `~/Desktop/MASQUER.app` (proper Apple bundle, brand mask icon).                                    |
| Windows  | [`windows/install-shortcut.ps1`](./windows/) | `~/Desktop/MASQUER.lnk` (and optionally Start Menu).                                               |
| Linux    | [`linux/install-shortcut.sh`](./linux/)      | `~/.local/share/applications/masquer.desktop` + `~/Desktop/masquer.desktop` (XDG-compliant entry). |

## What you get on every platform

- One double-click and the game is on screen.
- First launch: `pnpm install` + `pnpm build` (≈ 1 minute on a decent
  machine).
- Subsequent launches: only rebuilds when files under `src/` are newer than
  `dist/`. Otherwise the server starts immediately.
- Default port `4173` (override with `MASQUER_PORT`).
- Closing the launcher window stops the server cleanly.

## Per-platform docs

- macOS — [`scripts/macos/README.md`](./macos/README.md)
- Windows — [`scripts/windows/README.md`](./windows/README.md)
- Linux — [`scripts/linux/README.md`](./linux/README.md)

Each platform doc lists its own requirements (Node 20+, pnpm, optional
icon-rendering tool), troubleshooting, custom-port instructions, and how
to uninstall.

## Prerequisites (same across all three)

- [Node.js 20+](https://nodejs.org/)
- [pnpm](https://pnpm.io/installation)

Optional per-platform icon-rendering tools are listed in each platform's
README. Without them the launcher still works; you just see the default
shell-script icon instead of the MASQUER mask.

## How the launchers stay in sync

Each platform has its own thin script (`MASQUER.command`, `MASQUER.bat`,
`MASQUER.sh`) that all do the same five things in the same order:

1. Locate `pnpm` on the platform-specific PATH.
2. `pnpm install` if `node_modules/` is missing.
3. `pnpm build` if `dist/` is stale relative to `src/`.
4. `pnpm exec vite preview --port 4173 --host 127.0.0.1 --strictPort`.
5. Wait for the port to bind, open the default browser, block until the
   user closes the window (cleans up the server on exit).

If you need to change behaviour, update all three scripts together to keep
parity.
