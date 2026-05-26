# ADR-0040: Lottery as a system, not a games-sandbox citizen

- Status: Accepted
- Date: 2026-05-19
- Deciders: @adamzspare

## Context

The `src/games/<name>/` sandbox (BUILD_GUIDE §3, §4) is built around a contract:

- A game is one-user-per-round (the player clicks through to a result).
- A game `logic.ts` is pure; UI lives next to it in the same directory.
- Games go through `src/systems/wallet.ts` and never touch `src/db/*`
  or `src/store/*` directly. ESLint enforces.
- `src/games/_shared/GameShell` + `BettingPanel` + `useGameRound` are
  the standard reusable surfaces.

Phase 10's daily lottery violates two of those assumptions:

1. It's **event-driven**, not per-round. The user buys tickets across a
   day; settlement happens once when a scheduled draw runs (or backfills
   on app open) — for all users on the machine at once.
2. It needs **direct DB reads** beyond the wallet API: the admin page
   queries `lotteryDraws` and `lotteryLines` aggregates; the backfill
   scheduler queries unsettled lines across all users.

## Decision

**Lottery lives in `src/systems/lottery.ts` + `src/pages/lottery/`.**

- `src/systems/lottery.ts` — pure logic (`drawForDate`, `evaluateLine`,
  `payoutFor`, `generateLuckyDipLine`, `nextDrawAt`) + DB-touching
  functions (`buyTicket`, `settleMissedDraws`, favorites CRUD, admin
  queries). Treated like other systems (auth, wallet, rng, stats,
  admin-auth) — permitted to import from `@/db/*`.
- `src/pages/lottery/` — top-level page directory (not under
  `src/pages/games/` or `src/games/`). Lazy-loaded via `React.lazy()`
  in `src/router.tsx`, mirroring the Phase 7 `/stats` and `/leaderboard`
  pattern to keep Recharts in the shared chunk (ADR-0039).
- `Round.game` enum is extended with `'lottery'` so per-line settles
  flow into the existing rounds table and Phase 7's /stats and
  /leaderboard pages.

## Alternatives considered

- **Force lottery into `src/games/lottery/`**: Would require per-line
  wrapping in `useGameRound`, and the sandbox ESLint rule would have
  to be relaxed for lottery (admin reads aggregate state). Rejected:
  adapts the wrong primitive.
- **Pure separate top-level module (no integration with /stats and
  /leaderboard)**: Rejected — losing /stats integration costs the
  passive engagement loop the lottery is designed for.
- **Server-driven cron**: Out of scope (offline-only app).

## Consequences

- Lottery is the precedent for any future event-style content (daily
  challenges, achievements, weekly tournaments). Add them as
  `src/systems/<name>.ts` + `src/pages/<name>/`.
- `Round.game` union grows; every exhaustive switch over it needs a
  `'lottery'` branch. Phase 7 left-rail nav and GAME_LABELS need the
  new entry — wired in PR E.4 of the Phase 10 plan.
- The sandbox rule continues to apply to `src/games/**` only.

## References

- `src/systems/lottery.ts` (target location)
- `src/pages/lottery/` (page directory — created in PR B)
- Phase 10 spec §8 (architecture)
- ADR-0039 — Shared Recharts chunk (lazy-load pattern)

## Amendment (2026-05-26, Phase 15 #9)

Game shape expanded from Pick-5+1 to Pick-6+1 to match the UK National
Lottery payout shape (per user request — see spec
`docs/superpowers/specs/2026-05-26-phase-15-9-lottery-design.md`). Tier
matcher and payout table rewritten:

- `LotteryMatchTier` union: `'6' | '5+bonus' | '5' | '4' | '3' | '2'`.
- `LINE_COST` changed `10 → 5`. `REENTRY_VALUE` tracks `LINE_COST`
  (a free re-entry is worth one current line cost).
- Jackpot (`6` tier) = 20,000,000 chips. Other tiers per the new table
  in BUILD_GUIDE §10.5.
- Old `4+bonus` (was 100K) and `3+bonus` (was 2K) tiers removed —
  the bonus number matters only for the `5+bonus` tier (UK Lottery
  semantics).

The Dexie schema bumps with a destructive wipe of the four lottery
tables (`lotteryDraws`, `lotteryTickets`, `lotteryLines`,
`lotteryFavorites`); old Pick-5 lines can't be revalidated against
the new Pick-6 rules. `rounds` rows for past lottery wins stay
untouched (they're historical and don't affect new aggregates).

ADR-0040's core decision is **unchanged**: lottery still lives in
`src/systems/lottery.ts` + `src/pages/lottery/`, still imports
`@/db` and `@/store` freely, and still writes one rounds row per
evaluated line per the Phase-10 decision matrix.
