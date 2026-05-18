# ADR-0037: Baccarat persistent shoe with cut card

- Status: Accepted
- Date: 2026-05-18
- Deciders: @adamzspare

## Context

Real Baccarat is dealt from a persistent 8-deck shoe. A cut card is inserted
roughly 14-28 cards from the bottom (the dealer's choice in practice). Once
the cut card is dealt out (mid-round usually), the shoe is finished and the
table reshuffles between rounds.

Phase 4 (Roulette) used a stateless RNG call per spin. Phase 5 (Slots) used
the cumulative-table weighted pick. Baccarat is the first localGamble game
where draws are NOT independent — once a card is dealt, the probability of
the next card changes (though the effect is tiny over 416 cards).

## Decision

**Persistent 8-deck shoe** held in the round machine's context (`ShoeState`).

- Shoe initial size: 416 cards (`DECKS_PER_SHOE * 52`).
- Cut-card placement: uniform random integer in `[14, 28]` from the END of
  the shoe (per spec §5). Range pinned in `config.ts`.
- Draws happen via `drawFromShoe(shoe)` which returns the next card and a
  new ShoeState with that card removed.
- After a round completes, `cutCardPassed` is set to true on the shoe if
  fewer than `cutPosition` cards remain. The next call to start a round
  detects this flag and reshuffles a fresh 8-deck shoe.
- Reshuffle is **one-round-delayed**: the round that uses up the cut card
  completes normally; the FOLLOWING round starts with a fresh shoe and
  shows a "FRESH SHOE" banner briefly.
- Shoe state is NOT persisted to Dexie — it lives only in the machine's
  in-memory context. A tab reload starts a fresh shoe. Acceptable for
  local play-money.

## Alternatives considered

- **Infinite-deck approximation** (independent draws each card, no shoe
  state). Simpler. Rejected: the user wanted a realistic shoe with a
  visible cut-card mid-shoe moment, and the long-run probabilities are
  almost identical anyway.
- **Cut-card placement as a fixed 21 cards from end.** Predictable; loses
  the small-but-real variation in real-casino practice. Rejected for the
  realism reason.
- **Persist shoe state in Dexie so it survives reloads.** Adds a new table
  plus a serialization layer. Rejected: the value of persisting a shoe
  across page reloads is near-zero (no card counting upside in this game),
  and the cost is non-trivial.
- **Reshuffle immediately mid-round when the cut card is hit.** Real
  casinos do NOT do this — once the cut card is dealt, the round finishes
  with the current shoe. Rejected to keep realism.

## Consequences

- Tab reload = fresh shoe. Mostly invisible to the player; the shoe-depth
  indicator just shows ~416 again.
- The shoe lives in the XState context and must be serialized into the
  machine's `RoundResult.details` (or at least its "depth-at-deal"
  snapshot) so that future analytics can compute things like
  "wins-per-shoe" if we ever want them.
- `shoe.ts` is a pure module — no React, no I/O — so it can be unit-tested
  in isolation (`shoe.test.ts`).

## References

- `src/games/baccarat/shoe.ts` — `build8DeckShoe`, `placeCutCard`,
  `drawFromShoe`, `cutCardPassed`
- `src/games/baccarat/types.ts` — `ShoeState`
- `src/games/baccarat/config.ts` — `DECKS_PER_SHOE`, `CUT_CARD_RANGE_FROM_END`
- Phase 6 spec §5
