# ADR-0036: Baccarat third-card tableau and integer rounding

- Status: Accepted
- Date: 2026-05-18
- Deciders: Developer

## Context

Baccarat (Phase 6) requires a canonical implementation of the third-card
drawing tableau — a fixed lookup table that controls when Banker draws a
third card based on Banker's own two-card total and the value of Player's
third card.

Several Baccarat variants exist (Mini, EZ, Punto Banco, Macau Big Table).
They all share the same Player rule (draw on 0-5, stand on 6-7) but vary
slightly in Banker behavior on edge cells. We picked one variant.

Additionally, the project rule "money is integers" (CLAUDE.md §3.6) means
the 5% banker commission, the Big-side `0.54:1` payout, and the Small-side
`1.5:1` payout cannot be implemented as direct float multiplications.

## Decision

**Canonical Punto Banco tableau** (the version used on full-size Baccarat
tables worldwide):

- Player draws iff two-card total is 0-5 (8/9 are naturals → no third).
- Banker rule, when Player did NOT draw (stood on 6/7): Banker draws iff
  Banker's two-card total is 0-5; stands on 6/7.
- Banker rule, when Player DREW a third with value `v` (0-9):
  - Banker 0/1/2 → always draws
  - Banker 3 → draws unless `v=8`
  - Banker 4 → draws iff `v` in 2..7
  - Banker 5 → draws iff `v` in 4..7
  - Banker 6 → draws iff `v` in 6..7
  - Banker 7 → always stands

**Integer rounding rule:** `floor()` everywhere.

- Banker commission = `floor(winnings * 0.05)`
- Big payout = `floor(bet * 0.54)`
- Small payout = `floor(bet * 1.5)`

`floor` favors the player on rounding remainders, matching low-stakes
real-casino practice ("the dealer doesn't bother making change for nickels").

## Alternatives considered

- **EZ Baccarat tableau.** Skips commission; instead introduces a "Banker
  with 7 made from 3 cards" push rule. Rejected: less commonly known, and
  the commission UI is more interesting to look at.
- **Round to nearest.** Mathematically fairer over the long run. Rejected
  because it sometimes favors the house on bets where floor would favor the
  player, which the user found counter-intuitive in design review.
- **Restrict bet amounts to multiples of 20** so 5% is always whole.
  Rejected: ugly UX, inconsistent with other games' free-form bet amounts.
- **Track sub-chip commission as floating-point debt and settle at session
  end.** Real high-roller practice. Rejected as scope creep.

## Consequences

- The third-card tableau implementation in `src/games/baccarat/logic.ts`
  matches `bankerDrawsThird()` cell-for-cell with this ADR. Every cell is
  pinned by a test in `logic.test.ts`.
- Players see slightly under-house-edge behavior on bets like Banker 17
  (commission of 0 chips instead of "fair" 1 chip). The tilt is sub-1%
  over long play and acceptable for play money.
- Future EZ-Baccarat or alt-variant support requires a new ADR; do not
  silently extend the tableau.

## References

- `src/games/baccarat/logic.ts` — `playerDrawsThird`, `bankerDrawsThird`
- `src/games/baccarat/logic.test.ts` — cell-by-cell tests
- `src/games/baccarat/config.ts` — `COMMISSION_RATE`, `BIG_PAYOUT_RATE`, `SMALL_PAYOUT_RATE`
- Phase 6 spec §4.3, §4.4, §4.5
