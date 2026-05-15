# ADR-0003: CI strictness — lint, typecheck, test+coverage, build

- Status: Accepted
- Date: 2026-05-15
- Deciders: @adamzspare

## Context

A play-money casino is unforgiving about money math. BUILD_GUIDE §14 calls
out that we should be "thorough on money math and odds." We need a CI gate
that prevents money-related bugs from landing.

## Decision

Every PR must pass: `pnpm lint`, `pnpm typecheck`, `pnpm test:run`
(including coverage thresholds), and `pnpm build`. Coverage thresholds:

- `src/games/**/logic.ts`: 90% lines/functions/statements, 85% branches.
- `src/systems/**/*.ts`: 80% lines/functions/statements, 75% branches.
  Other code unthresholded for now (UI tests light per BUILD_GUIDE §14).

## Alternatives considered

- **Lint + test only** — fast but allows TS-only and build-only failures
  through.
- **Add bundle-size budget + Lighthouse** — overkill for a local app with
  no perf SLA.
- **No coverage thresholds** — relies on discipline; rejected because
  game-logic regressions are high-impact.

## Consequences

- Slower CI (~3-5 min per PR vs ~1 min minimal).
- Catches almost every regression before merge.
- Tests must accompany every game-logic change (otherwise threshold drops).
- Some CI flakes possible from third-party action versions — pinned where
  practical, monitored via Dependabot.

## References

- BUILD_GUIDE.md §14 (Testing Strategy)
- ADR-0001 (Vitest is part of the stack)
