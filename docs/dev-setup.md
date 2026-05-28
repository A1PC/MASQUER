# Dev environment setup

Last refreshed at **v1.0** (2026-05-28).

## First-time setup

1. **Install Node 20** via `nvm`:

   ```bash
   nvm install 20
   nvm use            # picks up .nvmrc
   ```

2. **Enable pnpm** (ships with Node 20 via Corepack):

   ```bash
   corepack enable
   pnpm --version     # should be 9.x
   ```

3. **Clone and install:**

   ```bash
   git clone https://github.com/A1PC/localGamble.git
   cd localGamble    # the repo dir keeps the working-title name until the
                     # GitHub repo is renamed in repo settings (manual step).
   pnpm install --frozen-lockfile
   ```

4. **Run the dev server:**

   ```bash
   pnpm dev
   # opens http://localhost:5173
   ```

5. **Register a profile** on the login screen — you start with 1,000 chips.
   Data is per-browser in IndexedDB, so a different browser (or cleared
   storage) starts fresh.

## Recommended editor: VS Code

Install the workspace-recommended extensions when prompted (see
`.vscode/extensions.json`):

- `dbaeumer.vscode-eslint` — ESLint
- `esbenp.prettier-vscode` — Prettier
- `bradlc.vscode-tailwindcss` — Tailwind IntelliSense
- `vitest.explorer` — Vitest test explorer

## Definition of done (CI parity)

Run all of these before opening a PR. Every one is enforced by CI.

```bash
pnpm lint                                # ESLint, max warnings 0
pnpm typecheck                           # tsc -b --noEmit
pnpm exec vitest run                     # full test suite
pnpm build                               # production build (tsc -b + Vite)
pnpm build-storybook                     # storybook build
pnpm exec prettier --check .             # formatting
npx markdownlint-cli2 \
  --config .markdownlint.json '**/*.md'  # markdown lint
```

## Common issues

| Symptom                                        | Cause                       | Fix                                                                |
| ---------------------------------------------- | --------------------------- | ------------------------------------------------------------------ |
| `corepack: command not found`                  | Old Node                    | Upgrade to Node 20+                                                |
| `pnpm install` hangs at registry               | Network / proxy             | `pnpm config get registry`; reset to `https://registry.npmjs.org/` |
| Dev server port 5173 busy                      | Another Vite running        | `lsof -i :5173`; kill or change `vite.config.ts` port              |
| ESLint complains about every file              | Wrong Node / pnpm version   | `nvm use && corepack enable && pnpm install`                       |
| Husky hook didn't fire on commit               | `prepare` script didn't run | `pnpm install` re-runs it; or `pnpm exec husky` manually           |
| IndexedDB shows stale data after schema change | Old DB version              | DevTools → Application → IndexedDB → delete `masquer`              |
| Old `localGamble` IndexedDB still present      | Pre-1.0 data                | Delete `localGamble` in IndexedDB; v1.0 uses `masquer`             |

## Useful routes

| Route                    | What                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| `/` → `/lobby`           | Main app (register/login first)                                                          |
| `/play/<game>`           | A game (e.g. `/play/blackjack`, `/play/plinko`, `/play/poker/holdem`)                    |
| `/stats`, `/leaderboard` | Player stats + boards                                                                    |
| `/lottery`               | Daily Lottery (Pick-6+1; 20:00 daily draw)                                               |
| `/admin/login`           | Admin dashboard — login `admin` / `admin12345` (UI convenience, not a security boundary) |

To reset all local data after a schema change: DevTools → Application →
IndexedDB → delete `masquer` (the dev Login/Register pages also have a
dev-only "wipe" button).

## Lazy-loaded routes (post-v1.0)

Every game route is lazy-loaded behind a shared `<RouteFallback>`. After
successful auth, an idle-time prefetch hint pings the lobby's most-used
chunks so the first lobby-tile click feels instant. Main bundle is ~222 KB
gzipped (down from 477 KB pre-PR-C in Phase 15 #15).

## Admin login

Hidden at `/admin/login`. Credentials: **`admin`** / **`admin12345`**,
hardcoded in source on purpose — this is a UI convenience for a local app,
**not** a security boundary. See ADR-0034.

## Browser support matrix

Targeted: latest stable **Chrome** and **Firefox** on desktop.
Out of scope: Safari (untested in MVP), all mobile browsers, anything
< 1024px viewport.
Why: this is a personal-machine app; one of two browsers is sufficient.
The build targets `>0.5%, last 2 versions, not dead, not op_mini all`
(default Vite preset).
