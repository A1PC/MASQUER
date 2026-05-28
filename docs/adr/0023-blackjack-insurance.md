# ADR-0023: Blackjack — Insurance (offered when dealer shows Ace, pays 2:1)

- Status: Accepted
- Date: 2026-05-17
- Deciders: Developer

## Context

Insurance is a side bet offered when the dealer's up-card is an Ace. The
player bets up to half their main bet that the dealer has a natural blackjack.
If the dealer has blackjack, insurance pays 2:1 (gross return 3× the insurance
bet). If not, insurance is lost.

## Decision

Implement insurance as follows:

1. **Offered only when dealer up-card is Ace** — machine routes to
   `insurance_prompt` state when `dealerCards[0].rank === 'A'`.
2. **Bet amount** — player chooses the amount; UI enforces the half-bet cap.
   Machine accepts the bet as-is via `TAKE_INSURANCE` event.
3. **Payout** — 2:1 net (gross: `bet × 3`). `settleInsurance()` in
   `settle.ts`.
4. **Insurance ratio** — `INSURANCE_RATIO: 0.5` stored in config for the UI.
5. **Natural BJ detection** — insurance wins only on a 2-card dealer 21.

## Alternatives considered

- **No insurance** — simpler; not chosen as it deviates from standard rules.
- **Even-money shortcut for player BJ** — not implemented; handled by separate
  BJ payout path.

## Consequences

- `InsuranceState` type tracks `status`, `bet`, and `payout`.
- `buildRoundDetails` aggregates insurance bet/payout into `totalBet`/
  `totalPayout` for the wallet settle call.
- `TAKE_INSURANCE` event carries a `betHandleId` — separate `placeBet` call
  made by the page (ADR-0028).

## References

- BUILD_GUIDE.md §8.1 (after update)
- Phase 3 spec §3 decision #3
- `src/games/blackjack/settle.ts` — `settleInsurance`
- `src/games/blackjack/machine.ts` — `insurance_prompt` state
