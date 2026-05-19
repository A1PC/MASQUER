# ADR-0038: Stats aggregation module location

- Status: Accepted
- Date: 2026-05-19
- Deciders: @adamzspare

## Context

Phase 9 introduced `src/pages/admin/queries.ts` as the single source of
Dexie aggregations for the admin dashboard (per-user totals, site-wide
stats, net-flow series, game-distribution, top-winners/losers, per-user
helpers).

Phase 7 ships `/stats` and `/leaderboard` for end-users. Both surfaces
need the same aggregations (and a few extensions). Three options:

1. Keep `queries.ts` in `pages/admin/`; player pages import from there.
2. Duplicate as `src/systems/stats.ts` for player-facing code.
3. Promote `queries.ts` to a neutral location (`src/systems/stats.ts`)
   and have admin import from there too.

## Decision

**Promote.** Move `src/pages/admin/queries.ts` → `src/systems/stats.ts`.
Admin imports from the new location after a brief transition period.

To avoid breaking admin during the move, PR A leaves a re-export shim at
the old path that re-exports every public symbol from `@/systems/stats`.

PR E updates every admin import to the new path and deletes the shim.

## Alternatives considered

- **Option 1 (admin import from admin path).** Couples player UI to
  admin module layout. Anyone reorganizing admin code could
  inadvertently break /stats. Rejected.
- **Option 2 (duplicate).** Two copies of the same Dexie code drift.
  Rejected.
- **Pure leaf system in `src/lib/`** instead of `src/systems/`. The
  project convention is that `src/systems/` is the canonical home for
  shared side-effecting modules (`auth`, `wallet`, `rng`, `crypto`,
  `admin`, `admin-auth`). `stats` fits there.

## Consequences

- One source of truth for derived stats. No drift between admin and player.
- Admin tests continue to pass during PR A via the shim.
- PR E is a small mechanical refactor (3 admin pages × 1 import each; the
  3 chart wrappers in `src/pages/admin/charts/` relocate in PR C and pick
  up the new path at that time).
- `src/pages/admin/` becomes UI-only (chart wrappers move in PR C; the
  queries shim is gone after PR E).

## References

- `src/systems/stats.ts` (target location)
- `src/pages/admin/queries.ts` (temporary shim)
- ADR-0039 — Shared Recharts chunk (companion refactor)
- Phase 7 spec §7
