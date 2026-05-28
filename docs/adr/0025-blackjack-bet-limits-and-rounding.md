# ADR-0025: Blackjack — Bet Limits and BJ Payout Rounding

- Status: Accepted
- Date: 2026-05-17
- Deciders: Developer

## Context

Blackjack requires two rounding decisions:

1. **Bet limits** — minimum and maximum bet per hand (per CLAUDE.md Rule 6:
   all chip amounts are integers; no floats).
2. **Natural BJ payout** — 3:2 on an odd bet produces a fractional result
   (e.g., bet 5 → winnings 7.5). Standard casino practice rounds half-bets UP
   to the nearest chip.

## Decision

1. **Bet limits** — `MIN_BET: 5`, `MAX_BET: 1_000` (integers; enforced by UI).
2. **BJ payout formula** — `winnings = Math.ceil(bet / 2) * 3`. For even bets
   this is exact (bet 10 → ceil(5) × 3 = 15). For odd bets this rounds UP
   (bet 5 → ceil(2.5) × 3 = ceil(3) × 3 = 9; total return 14).
3. **No float arithmetic** — all intermediate values remain integers.

## Alternatives considered

- **Round DOWN** — standard in some casinos; excluded as it penalises the
  player on odd bets.
- **Round to nearest even** — `Math.round(bet / 2) * 3`; excluded because
  `Math.round` in JS uses "round half to even" only for `.5` inputs, creating
  inconsistency at higher values.
- **Disallow odd bets** — would require UI enforcement; excluded for UX
  simplicity. Rounding is simpler.

## Consequences

- `settlePlayerHand()` in `settle.ts` uses `Math.ceil(hand.betAmount / 2) * 3`
  for the `player-blackjack` payout path.
- Tests in `settle.test.ts` cover bet 10 (returns 25) and bet 5 (returns 14).

## References

- CLAUDE.md Rule 6 (integer money)
- BUILD_GUIDE.md §8.1 (after update)
- Phase 3 spec §3 decision #5
- `src/games/blackjack/settle.ts`
- `src/games/blackjack/config.ts` — `MIN_BET`, `MAX_BET`
