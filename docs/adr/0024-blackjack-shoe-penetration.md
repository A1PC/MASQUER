# ADR-0024: Blackjack — Shoe Penetration (6-deck shoe, cut card at 156)

- Status: Accepted
- Date: 2026-05-17
- Deciders: @adamzspare

## Context

Blackjack is typically played with a multi-deck shoe to reduce the effectiveness
of card counting. A "cut card" is placed in the shoe; when the cut card is
reached, the dealer shuffles after the current round. The penetration depth
(fraction of shoe dealt before reshuffle) affects both game fairness and the
risk of shoe exhaustion.

## Decision

1. **6-deck shoe** (`DECKS: 6`) — 312 cards total. Standard for most Vegas
   Strip games.
2. **Cut card at 156** (`CUT_CARD_AT: 156`) — exactly 50% penetration. The
   shoe is reshuffled before the next round once 156 or more cards have been
   dealt.
3. **Reshuffle check** — `needsReshuffle(shoe, originalSize, cutAt)` is called
   in the `initShoe` action at the START of each new round (not mid-round).
4. **Fresh shoe on empty** — if the shoe is empty (first round or unexpected
   depletion), `initShoe` always builds a fresh shoe.

## Alternatives considered

- **Single deck** — higher natural BJ frequency (player advantage); excluded.
- **8 decks** — more common in high-roller areas; 6-deck chosen for simplicity.
- **75% penetration (234 cards)** — more realistic; 50% chosen as a safe
  default that prevents shoe exhaustion even with max splits.
- **Mid-round reshuffle** — too complex; reshuffle before next round only.

## Consequences

- A round can deal at most ~30 cards (2 players × 4 hands × 3-4 cards each +
  dealer). With 156 cards remaining after cut, shoe exhaustion is impossible.
- `shoeOriginalSize` is stored in context to compute `dealt = originalSize -
shoe.length` on each round.

## References

- BUILD_GUIDE.md §8.1
- Phase 3 spec §3 decision #4
- `src/games/blackjack/cards.ts` — `buildShoe`, `freshShoe`, `needsReshuffle`
- `src/games/blackjack/config.ts` — `DECKS`, `CUT_CARD_AT`
