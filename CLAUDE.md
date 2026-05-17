# Claude / Agent Instructions for localGamble

You are working in a TypeScript/React/Vite codebase that implements a local,
offline, play-money casino. The single source of truth is `BUILD_GUIDE.md`
in the repo root. Read it before doing anything.

## Hard rules — never violate

1. **Phase discipline.** Implement only the phase the user names. Do not
   pre-build future phases or "while I'm at it" features.
2. **Spec-first changes.** If a rule, payout, or schema must change, update
   `BUILD_GUIDE.md` first, commit it, then implement. Code follows the spec.
3. **Logic before UI.** For every game, write `logic.ts` (pure, no React,
   no I/O) with passing `logic.test.ts` BEFORE writing any React component.
4. **Games are sandboxed.** A file under `src/games/**` may NEVER import from
   `src/db/**` or `src/store/**` directly. Games go through `src/systems/**`
   only. (`placeBet`, `settleRound` etc.)
5. **One RNG.** No `Math.random()` anywhere. Use `src/systems/rng.ts`. ESLint
   enforces this — do not add `eslint-disable` for it.
6. **Money is integers.** All chip amounts are integers. No floats. No
   `parseFloat`. Rounding bugs at this layer are unacceptable.
7. **Every round is recorded.** Every completed game round writes exactly
   one row to the `rounds` table via `wallet.settleRound` (ADR-0016). There is
   no separate `systems/history.ts`. No exceptions.
8. **Definition of done.** Before saying a task is complete, run:
   `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. All four must
   pass. Then click through the affected feature in `pnpm dev`.

## Workflow

- One PR per BUILD_GUIDE phase (or per logical chunk within a large phase).
- Branch naming: `phase-N-short-name` or `fix/area-short-name` or
  `chore/short-name`. Never commit to `main`.
- Commit messages: Conventional Commits — `feat(blackjack): ...`,
  `fix(wallet): ...`, `test(roulette): ...`, `chore: ...`,
  `docs(build-guide): ...`. Imperative mood. Lower-case scope.
- Show your plan before non-trivial implementation work.

## Project map

- `BUILD_GUIDE.md` — master spec, read first
- `docs/superpowers/specs/` — per-phase design specs
- `docs/superpowers/plans/` — per-phase implementation plans
- `docs/adr/` — architecture decision records
- `src/systems/` — shared, side-effecting modules (auth, wallet, rng, stats, payouts)
- `src/games/<name>/logic.ts` — pure game rules, fully unit-tested
- `src/games/<name>/*.tsx` — React UI for that game
- `src/db/` — Dexie schema and typed helpers
- `src/store/` — Zustand stores (session, wallet)
- `src/theme/` — design tokens (colors, fonts), no hard-coded hex in components

## When in doubt

Ask before assuming. The cost of a clarifying question is much less than the
cost of building the wrong thing. If `BUILD_GUIDE.md` is silent or
ambiguous, raise it — don't pick silently.
