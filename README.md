# localGamble

A local, offline, play-money casino app. Single-machine, no real money,
no internet. Browser-based.

See [`BUILD_GUIDE.md`](./BUILD_GUIDE.md) for the full project specification.

## Quick start

```bash
nvm use && corepack enable && pnpm install
pnpm dev
```

## Scripts

| Command          | Purpose                            |
| ---------------- | ---------------------------------- |
| `pnpm dev`       | Start Vite dev server              |
| `pnpm build`     | Production build                   |
| `pnpm preview`   | Serve the production build locally |
| `pnpm lint`      | ESLint check                       |
| `pnpm typecheck` | `tsc --noEmit`                     |
| `pnpm test`      | Vitest in watch mode               |
| `pnpm test:run`  | Vitest single run with coverage    |
| `pnpm format`    | Prettier write                     |

## Documentation map

- `BUILD_GUIDE.md` — master spec
- `CLAUDE.md` — agent hard rules
- `CONTRIBUTING.md` — branch / commit / PR conventions
- `docs/conventions.md` — code conventions
- `docs/dev-setup.md` — environment setup
- `docs/risks.md` — risk register
- `docs/adr/*.md` — architecture decisions
- `docs/superpowers/specs/*.md` — per-phase design specs
- `docs/superpowers/plans/*.md` — per-phase implementation plans

## Project status

Tracked via [Milestones](../../milestones). One milestone per BUILD_GUIDE phase.
