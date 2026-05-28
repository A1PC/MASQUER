# ADR-0014: React Router 7 — data router pattern with AppBootstrap wrapper

- Status: Accepted
- Date: 2026-05-15
- Deciders: Developer

## Context

Dependabot opened a PR (#42, closed) bumping `react-router-dom` from 6.x to
7.x. RR 7 promotes the data-router API (`createBrowserRouter` +
`RouterProvider`) and rebrands the `-dom` package as `react-router`. We
deferred the upgrade pending a deliberate migration plan.

## Decision

1. Adopt the data-router API: define routes as a `RouteObject[]` and mount
   them via `<RouterProvider router={router} />`.
2. Move bootstrap-on-app-start into a new `<AppBootstrap>` wrapper that
   sits ABOVE `<RouterProvider>` in `main.tsx`. AppBootstrap renders its
   child only after bootstrap resolves.
3. Rename all imports from `react-router-dom` to `react-router`.
4. Delete `src/App.tsx`; route table moves to `src/router.tsx`.
5. Tests use a small `renderWithRouter([...routes], {initialEntry})` helper
   wrapping `createMemoryRouter` + `RouterProvider`.

## Alternatives considered

- **Stay on RR 6**: postpones the work; v6 is in maintenance mode.
- **Minimal compat upgrade (keep `<BrowserRouter>` + `<Routes>`)**: less
  invasive but doesn't unlock the loader/action APIs we'll want for Phase 7
  stats and Phase 2 lobby balance fetching. If we're touching it, do it
  right.
- **Bootstrap as a root route loader**: more idiomatic v7, but introduces
  loader and HydrateFallback concepts we don't otherwise need yet. Defer
  to Phase 8 polish or whenever a route legitimately needs a loader.

## Consequences

- One-time refactor of 11 files (mostly test files).
- `src/App.tsx` is deleted; its job split between `router.tsx` (route data)
  and `AppBootstrap.tsx` (boot state). Each file now does one thing.
- Future routes that need data fetching can adopt loaders without further
  architectural change.
- `react-router-dom` import alias stays available, but new imports use
  `react-router` per RR 7 guidance.

## References

- React Router 7 migration docs.
- ADR-0011 (RequireAuth pattern — preserved).
- Phase 1 spec sections 6.10, 6.11 (current routing setup being replaced).
