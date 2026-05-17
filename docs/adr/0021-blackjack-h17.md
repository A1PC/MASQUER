# ADR-0021: Blackjack — H17 (dealer hits soft 17)

- Status: Accepted
- Date: 2026-05-17
- Deciders: @adamzspare

## Context

BUILD_GUIDE §8.1 says "pick one rule and document it" for what the dealer
does on a soft 17. Two options: stand on all 17s (S17) or hit on soft 17
(H17). BUILD_GUIDE notes S17 as "standard" but leaves it open.

## Decision

Adopt **H17** (dealer hits soft 17). Implemented in `dealer.ts`:
`dealerShouldHit(cards)` returns true when value < 17 OR (value === 17 AND
soft).

## Alternatives considered

- **S17 (stand on all 17s)** — player-friendlier; ~0.2% lower house edge.
  Simpler rule. Recommended by BUILD_GUIDE.
- **Variable per session** — overkill for play money.

## Consequences

- House edge ~0.2% higher than S17.
- One additional code path in dealer logic (`total.soft` check).
- Spec §13 codifies BUILD_GUIDE §8.1 wording update.

## References

- BUILD_GUIDE.md §8.1 (after update)
- Phase 3 spec §3 decision #1
- `src/games/blackjack/dealer.ts`
