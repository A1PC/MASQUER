# ADR-0028: Blackjack — Multi-Hand Wallet Pattern (one placeBet per hand)

- Status: Accepted
- Date: 2026-05-17
- Deciders: Developer

## Context

The Phase 2 wallet API (`placeBet` / `settleRound`) was designed for single-bet
rounds (coin-flip). Blackjack can have up to 4 hands per round (via splits),
each requiring its own bet. Additionally, insurance is a separate side bet.
The wallet needs to track each bet individually for traceability (ADR-0016).

## Decision

Use **one `placeBet` call per bet placement event**:

1. **Main bet** — `PLACE_BET` triggers `wallet.placeBet(amount)` on the page;
   the resulting `betHandleId` is passed back via `BET_PLACED`.
2. **Split bet** — `SPLIT` event on the page triggers `wallet.placeBet(amount)`
   for the new hand; `betHandleId` is passed via `SPLIT { betHandleId }`.
3. **Double bet** — `DOUBLE` triggers `wallet.placeBet(extraAmount)` on the
   page; `betHandleId` via `DOUBLE { betHandleId }`.
4. **Insurance bet** — `TAKE_INSURANCE` triggers `wallet.placeBet(insuranceBet)`
   on the page; `betHandleId` via `TAKE_INSURANCE { betHandleId, bet }`.
5. **Single `settleRound`** — at settling, `roundResult.totalBet` and
   `roundResult.totalPayout` are passed to one `wallet.settleRound` call with
   the full `betHandleIds` array as `details.betHandleIds`.

The machine is the source of truth for all game logic; the page is responsible
for calling the wallet and passing handles back.

## Alternatives considered

- **Machine calls wallet directly** — violates CLAUDE.md Rule 4 (games go
  through `systems/**` only; machine would need to import wallet).
- **Single large bet with internal split accounting** — loses per-hand
  traceability in the `rounds` table.
- **Separate `settleRound` per hand** — multiple rows per blackjack round;
  violates ADR-0016's one-row-per-round constraint.

## Consequences

- Page must handle `wallet.placeBet` failures (e.g., insufficient chips) before
  sending `SPLIT` or `DOUBLE` events. Guard at the page level (R-37).
- `betHandleIds` array in context grows during a round; `buildRoundDetails`
  includes it for auditability.
- All bet amounts in context are integers (CLAUDE.md Rule 6).

## References

- ADR-0016 (one round row per game round)
- CLAUDE.md Rule 4 (game sandbox)
- Phase 3 spec §8 (wallet integration pattern)
- `src/games/blackjack/machine.ts` — `betHandleIds`, `SPLIT`, `DOUBLE` events
- `src/games/blackjack/settle.ts` — `buildRoundDetails`
