# ADR-0035: Phase 9 tracking schema

- Status: Accepted
- Date: 2026-05-18
- Deciders: @adamzspare

## Context

The admin dashboard (Phase 9) needs to surface per-user and site-wide
analytics that the existing schema cannot answer:

- Total time on site per user (needs session start/end events)
- Total time on each game per user (needs game-page enter/exit events)
- Number of logins per user
- An audit trail of admin chip adjustments

The existing schema (Phase 1) has three tables: `users`, `balances`,
`rounds`. None capture session-level or page-level lifecycle events;
none capture admin actions.

## Decision

Add three new tables and three optional columns on `users`, all under a
single Dexie version 2 bump. No data migration callback is needed —
adding tables and adding optional columns are both additive.

**New optional columns on `users`** (treated as their default if absent):

- `isBanned?: boolean` (default false) — soft-ban flag; `auth.login`
  rejects banned users. Not indexed (IndexedDB doesn't support boolean
  keys); admin code filters in memory — small N.
- `loginCount?: number` (default 0) — incremented in `sessionStore.login`.
- `lastLoginAt?: number` (default undefined) — set in `sessionStore.login`.

**New `sessions` table** — one row per login.

```ts
{ id, userId, loginAt, logoutAt: number | null, durationMs: number | null }
```

Closed by: explicit logout, `beforeunload` listener (best-effort), or
orphan cleanup at the user's next login.

**New `gameVisits` table** — one row per game-page mount.

```ts
{ id, userId, sessionId, game, enteredAt, exitedAt: number | null, durationMs: number | null }
```

Closed on component unmount (router navigation, logout cascade, or tab
close via the same best-effort path as sessions).

**New `adjustments` table** — one row per admin chip change.

```ts
{
  (id, userId, amount, reason, adjustedAt);
}
```

Written atomically with the `balances` update by `admin.adjustBalance`.
No `adminUserId` — single hardcoded admin in MVP. Future multi-admin
support adds the field.

## Alternatives considered

- **Embed session-time data on `users` as cumulative counters.** Would
  let us answer "total time on site" with a single column read but loses
  granularity (no per-session breakdown, no game-time-per-session). Rejected:
  the admin needs to drill into individual sessions and game visits.
- **Embed game-visit data on the session row** (e.g.
  `gameTimes: Record<Game, number>`). Awkward to query; mutating a JSON
  blob on every page transition is expensive. Rejected.
- **Reuse the rounds table for adjustments** with a special
  `game: 'admin-adjustment'`. Rejected: pollutes "rounds played" stats
  and conflates game actions with admin actions.
- **Hash chain for tamper detection on adjustments.** Overkill for a
  local-only single-admin context. Deferred indefinitely.

## Consequences

- Session-time and game-time stats are only meaningful from Phase 9
  onwards (no backfill). The dashboard surfaces this with a small
  "data since v0.9-admin-dashboard" note.
- Total rounds, total wagered, total won — all of these are answerable
  from the existing `rounds` table for all historical data.
- Schema migration is forward-only (Dexie v2). Downgrading to a v1-only
  build would silently drop the new tables (and their data) on the next
  v2 open.
- `beforeunload` is best-effort; orphan-session cleanup at next login is
  the safety net.

## References

- ADR-0034 — Admin auth model (companion ADR)
- `src/db/schema.ts` — type definitions and version 2 stores
- `src/store/sessionStore.ts` — session lifecycle hooks
- `src/games/_shared/useGameVisit.ts` — game-page enter/exit hook
- `src/systems/admin.ts` — `adjustBalance` writes the audit row
- Phase 9 spec §4, §5
