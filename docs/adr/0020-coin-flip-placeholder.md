# ADR-0020: Coin Flip as Phase 2's placeholder game

- Status: Accepted
- Date: 2026-05-17
- Deciders: Developer

## Context

BUILD_GUIDE §12 row 2 requires "a placeholder game can place and settle a bet
and write a rounds row." Several shapes are possible: a minimal "Win/Lose
button," a full game like Coin Flip, or stubs for the planned games.

## Decision

Coin Flip is the placeholder. It's a real game: place a bet, call HEADS or
TAILS, RNG decides the outcome via systems/rng.ts, 1:1 payout. Min 1, max 500.

It serves as the reference template for Phase 3-6 games: same GameShell,
same BettingPanel, same useGameRound hook, same RecentResults pattern. A
new game in Phase 3+ copies the structure and replaces logic.ts +
game-specific call buttons.

In addition, 4 stub pages (Blackjack, Roulette, Slots, Baccarat) make all
cabinets clickable from the lobby. The stubs show a "Coming in Phase N"
splash with links back to the lobby and Coin Flip.

## Alternatives considered

- **Minimal Win/Lose button** — exercises wallet+history but not RNG;
  doesn't validate the full stack.
- **Multiple stub pages only** — doesn't validate the play loop end-to-end.
- **A small game per phase (Coin Flip stays forever)** — keeps the
  placeholder permanently; aesthetically odd but harmless.

## Consequences

- Phase 2 ships a real, playable game.
- Phase 3 (Blackjack) inherits the full template.
- Coin Flip remains in the lobby as Game #5 — playable indefinitely.
- The `'coin-flip'` value in `Round.game` union persists across phases.

## References

- BUILD_GUIDE.md §12 row 2
- Phase 2 spec §6.23 (logic.ts), §6.24 (CoinFlipPage.tsx)
- ADR-0015 (RNG)
