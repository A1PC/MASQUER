# ADR-0019: UI preferences via `uiStore` with localStorage persistence

- Status: Accepted
- Date: 2026-05-17
- Deciders: @adamzspare

## Context

The sidebar collapse state must survive a page refresh per user preference.
ADR-0010 currently limits localStorage access to `src/systems/auth.ts`.
Adding more UI prefs over time (sound volume, etc.) shouldn't require
adding them to auth.ts.

## Decision

Create `src/store/uiStore.ts` as a Zustand store that owns UI preferences,
with localStorage read on init and write on every change. The first
preference is `sidebarCollapsed`. Default on first ever visit is OPEN
(collapsed=false) for discoverability.

Extend ADR-0010's localStorage allow-list to include `src/store/uiStore.ts`.
`docs/conventions.md` updated to reflect the two-file allow-list.

## Alternatives considered

- **In-memory only** — loses persistence; user has to re-toggle every visit.
- **Persist to IndexedDB** — overkill for one boolean; async read on boot
  delays UI.
- **Put pref management in auth.ts** — couples unrelated concerns.

## Consequences

- A second module gets localStorage access; allow-list now [auth.ts, uiStore.ts].
- Future UI prefs (Phase 8 sound volume, etc.) extend this store rather than
  proliferating new stores.
- Test pattern: `vi.resetModules()` + re-import to recompute initial state.

## References

- ADR-0010 (localStorage allow-list, Phase 1)
- Phase 2 spec §6.7 (uiStore.ts verbatim)
