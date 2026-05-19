# ADR-0039: Shared Recharts chunk

- Status: Accepted
- Date: 2026-05-19
- Deciders: @adamzspare

## Context

Phase 9 introduced Recharts (~400 kB chunk) as part of the admin
dashboard, lazy-loaded only when admins visit /admin/\*. Player pages
never paid the cost.

Phase 7 ships charts on the player /stats page (Graphs view). Naive
import — pulling Recharts into the main bundle — would inflate it
from 720 kB to ~1.1 MB. Unacceptable.

## Decision

Move all chart wrappers (the 4 from Phase 9 plus the 3 new ones in
Phase 7) into `src/components/charts/`. Import via static `import`
statements from both admin and player pages.

Vite's automatic code-splitting will:

- Place Recharts and the chart wrappers into ONE shared chunk.
- Lazy-load that chunk only when either an admin page or the player
  /stats page (Graphs view) is mounted.
- Reuse the same chunk across both (no double load).

The chunk is currently produced as `dist/assets/GameDistributionDonut-*.js`
in Phase 9 builds (Vite names it after the entry; PR D may produce a
slightly different chunk name once leaderboard charts are added — that's
expected). The important invariant is that there is ONE such chunk, not
two.

## Alternatives considered

- **Recharts in main bundle.** Simplest implementation, ~400 kB main
  bundle regression. Rejected: violates the Phase 9 budget.
- **Separate player-charts chunk and admin-charts chunk.** Recharts
  bundled twice in `dist/`. Each chunk hits the wire when its parent
  page is opened. Rejected: 400 kB wasted bandwidth.
- **CDN-load Recharts at runtime.** Avoid bundling entirely. Rejected:
  the app is local-only and offline-first; no network at runtime.

## Consequences

- Main bundle stays at ~720 kB.
- Recharts chunk loads on first admin navigation OR first player
  Graphs-view toggle, whichever comes first.
- All chart wrappers live in `src/components/charts/` going forward.
  Adding a new chart automatically rides the same chunk.
- `src/pages/admin/charts/` is deleted.

## References

- `src/components/charts/` (target home)
- ADR-0038 — Stats aggregation module location (companion refactor)
- Phase 7 spec §9
