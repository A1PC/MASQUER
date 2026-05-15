# Contributing to localGamble

## Local setup

Requirements: Node 20 LTS (see `.nvmrc`), pnpm 9+.

```bash
nvm use            # picks up .nvmrc
corepack enable    # enables pnpm via Node's bundled corepack
pnpm install
pnpm dev           # http://localhost:5173
```

## Branch model

- `main` always builds and passes tests. Never commit directly.
- Feature branches:
  - `phase-N-short-name` — implements a phase from BUILD_GUIDE.md §12
  - `fix/area-short-name` — bug fix
  - `chore/short-name` — tooling, deps, docs
- One PR per phase (or per logical chunk if a phase is very large).
- Squash-merge into `main`. Delete branch after merge.

## Commit message format (Conventional Commits)

`<type>(<scope>): <imperative summary>`

Types: `feat`, `fix`, `test`, `chore`, `docs`, `refactor`, `perf`, `build`, `ci`.

Scopes (the canonical list lives in `commitlint.config.js`):
`blackjack`, `roulette`, `slots`, `baccarat`, `wallet`, `auth`, `rng`,
`history`, `stats`, `leaderboard`, `theme`, `db`, `session`, `lobby`,
`ci`, `build-guide`, `deps`, `release`, `repo`.

Examples:

- `feat(blackjack): add dealer soft-17 logic`
- `fix(wallet): reject bets above balance`
- `test(roulette): cover corner bet payout`
- `chore(ci): cache pnpm store between runs`
- `docs(build-guide): clarify baccarat third-card tableau`

## Definition of done (before opening a PR)

- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (and adds tests for new game logic)
- [ ] `pnpm build` passes
- [ ] Manually verified in `pnpm dev`
- [ ] PR description filled out from the template
- [ ] Linked to a GitHub issue or BUILD_GUIDE phase

## PR review

You may self-merge once CI is green. Use the PR description checklist as a
self-review prompt before merging.
