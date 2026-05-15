# Dev environment setup

## First-time setup

1. **Install Node 20** via `nvm`:
   ```bash
   nvm install 20
   nvm use
   ```
2. **Enable pnpm** (ships with Node 20 via Corepack):
   ```bash
   corepack enable
   pnpm --version  # should be 9.x
   ```
3. **Clone and install:**
   ```bash
   git clone https://github.com/A1PC/localGamble.git
   cd localGamble
   pnpm install --frozen-lockfile
   ```
4. **Run the dev server:**
   ```bash
   pnpm dev
   # opens http://localhost:5173
   ```

## Recommended editor: VS Code

Install the workspace-recommended extensions when prompted (see
`.vscode/extensions.json`):
- `dbaeumer.vscode-eslint` — ESLint
- `esbenp.prettier-vscode` — Prettier
- `bradlc.vscode-tailwindcss` — Tailwind IntelliSense
- `vitest.explorer` — Vitest test explorer

## Common issues

| Symptom | Cause | Fix |
|---|---|---|
| `corepack: command not found` | Old Node | Upgrade to Node 20+ |
| `pnpm install` hangs at registry | Network / proxy | `pnpm config get registry`; reset to `https://registry.npmjs.org/` |
| Dev server port 5173 busy | Another Vite running | `lsof -i :5173`; kill or change `vite.config.ts` port |
| ESLint complains about every file | Wrong Node / pnpm version | `nvm use && corepack enable && pnpm install` |
| Husky hook didn't fire on commit | `prepare` script didn't run | `pnpm install` re-runs it; or `pnpm exec husky` manually |
| IndexedDB shows stale data after schema change | Old DB version | DevTools → Application → IndexedDB → delete `localGamble` |

## Browser support matrix

Targeted: latest stable **Chrome** and **Firefox** on desktop.
Out of scope: Safari (untested in MVP), all mobile browsers, anything
< 1024px viewport.
Why: this is a personal-machine app; one of two browsers is sufficient.
The build targets `>0.5%, last 2 versions, not dead, not op_mini all`
(default Vite preset).
