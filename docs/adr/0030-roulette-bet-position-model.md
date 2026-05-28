# ADR-0030: Roulette — Bet position model + 10-position cap

- Status: Accepted
- Date: 2026-05-17
- Deciders: Developer

## Context

A Roulette round can have multiple bets on the same felt:

- Some are single-number (straight).
- Some span 2 (split), 3 (street), 4 (corner), 6 (six-line), 12
  (column / dozen), or 18 (even-money) numbers.
- A player can stack additional chips on a position they've already bet on.

The internal model needs to:

1. Identify a "position" by a canonical key so stacking sums correctly
   and the UI can render each position deterministically.
2. Cap the number of distinct positions to a sane number to prevent
   pathological state growth (the machine context holds all of them in
   memory and the BettingLayout has to render each one).
3. Map a click target on the felt to the right `BetPosition` exactly once.

## Decision

**`BetPositionKey`** is a deterministic string built by `bets.makeBet(...)`
encoded as:

```
straight:N            // N ∈ 0..36
split:N1-N2           // N1 < N2; valid adjacencies only (vertical, horizontal, 0-1/0-2/0-3)
street:N              // N = lowest of the row of 3 (1, 4, 7, …, 34)
corner:N              // N = top-left of the 2×2 block; N % 3 ∈ {1, 2}; N ≤ 32
six-line:N            // N = lowest of the lower of two adjacent streets; N ∈ {1, 4, …, 31}
column:1 | column:2 | column:3
dozen:1 | dozen:2 | dozen:3
red | black | odd | even | low | high
```

**Stacking semantics:** two `PLACE_BET` events with the same key in one
round add their amounts; the machine keeps the first event's
`betHandleId` as the canonical handle for that position (per ADR-0028).

**Position cap:** 10 distinct positions per round
(`ROULETTE_CONFIG.MAX_POSITIONS_PER_ROUND`). The 11th distinct position
is dropped silently. Stacking on an existing position is always allowed.

**Excluded bet types:**

- The American "basket" / "top line" 5-number bet (0, 00, 1, 2, 3) does
  not exist on a single-zero wheel.
- "Streets including 0" (0-1-2 or 0-2-3 as 3-number bets) are excluded.
  Players who want chips on both 0 and 1 use a split.

## Alternatives considered

- **Unbounded position count.** Rejected: state grows unboundedly; UI
  has to render an arbitrary number of click overlays; no real player
  benefit (10 is far more than realistic play).
- **Stack as separate position records keyed by handle ID.** Rejected:
  the felt visually shows one chip stack per position — splitting them
  internally would force the UI to merge for display. Single canonical
  position is the simpler model.
- **Variable cap based on screen size or auth level.** Rejected as
  premature; a single constant in `config.ts` is one line to change if
  we ever want to.
- **Allow American "basket" 0-1-2-3-(00) bet.** Already excluded by the
  single-zero decision in ADR-0029.

## Consequences

- `BettingLayout.tsx` derives a `BetPosition` deterministically from the
  clicked target via `bets.makeBet({...})`.
- The wallet still sees one `placeBet` per chip click; the machine
  aggregates them into one position. `settleRound` is called once per
  round per ADR-0028, with the aggregate `betAmount` and `payout`.
- The 10-position rule pins UI assumptions: chip-stack rendering,
  exposure totals, and the "Clear all bets" affordance are all bounded.

## References

- BUILD_GUIDE §8.2
- ADR-0028 — multi-handle wallet pattern (reused here)
- ADR-0029 — single-zero wheel (drives the excluded bet types)
- `src/games/roulette/bets.ts`
- `src/games/roulette/types.ts`
- `src/games/roulette/config.ts`
- Phase 4 spec §3.4, §5, §8, §13

## Amendment (2026-05-25, Phase 15 #6)

The original 10-position cap (`MAX_POSITIONS_PER_ROUND`) was a safety
rail introduced before the deferred-`placeBet` wallet model was battle-
tested. With Phase-4's deferred-placeBet model now stable across all
multi-bet games, the cap is removed: the player may place an unlimited
number of positions per round, each up to `MAX_BET` (1000). Total
stake is bounded by the player's chip balance, not by position count.

The bet-key uniqueness contract is unchanged — one `PlacedBet` per
`BetPositionKey` per round, with subsequent clicks accumulating into
the existing `amount` field.

Implementation: `addBet` in `src/games/roulette/machine.ts` no longer
short-circuits when `bets.length >= cap`; `ROULETTE_CONFIG.MAX_POSITIONS_PER_ROUND`
is deleted from `src/games/roulette/config.ts`. Tests asserting the
cap-rejection branch are removed.

## Amendment (2026-05-26, Phase 15 #6 follow-up)

Bug reported post-#235: with `MAX_BET = 1_000` (per-position cap),
stacking more than one max-denomination chip on a single position
(e.g. five 1,000 chips on RED) made `placeBet` reject the position
(`amount > max`). The page's bridge then refunded the placed bets
and the spin ran cosmetically via `wallet.recordSpinOnly` from #237,
showing a result on screen with no real wallet change.

Resolution: raise `ROULETTE_CONFIG.MAX_BET` to `1_000_000` so the
per-position cap is effectively unbounded for normal play. Total
stake is still bounded by the player's chip balance (enforced by
`placeBet` against current chips). The user's intent
"as much money and as many chips as they would like" is now met:
no per-position cap, no position-count cap, no per-round total cap;
only balance.
