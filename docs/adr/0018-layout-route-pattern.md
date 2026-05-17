# ADR-0018: Layout route pattern — single `/` parent with `<RequireAuth>` baked in

- Status: Accepted
- Date: 2026-05-17
- Deciders: @adamzspare

## Context

The TopBar + Sidebar shell wraps every signed-in page. Three options were
considered: single layout route, two layout routes (auth vs signed-in), or
per-route `<RequireAuth>` wrappers (Phase 1 pattern).

## Decision

Use a single React Router 7 layout route at `/` whose element is
`<RequireAuth><AppLayout /></RequireAuth>`. AppLayout renders TopBar +
Sidebar + `<Outlet />`. Child routes for /lobby, /play/_, /stats,
/leaderboard, /profile_, /settings are nested under it. /login and
/register are siblings at the top level (unauthed).

## Alternatives considered

- **Per-route `<RequireAuth>` wrappers (Phase 1 pattern)** — less DRY; easy
  to forget on a new page.
- **Two layout routes** — more flexibility but overkill for current scope.

## Consequences

- One place to find the shell.
- RequireAuth applied uniformly; no opt-out needed.
- New signed-in pages slot in as additional children — zero config.
- Phase 7 loader-based routes for stats can attach as child route loaders
  without changing this structure.

## References

- Phase 2 spec §6.9 (router.tsx verbatim)
- ADR-0011 (RequireAuth pattern — preserved)
- ADR-0014 (RR 7 data-router migration)
