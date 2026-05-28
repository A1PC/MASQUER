# ADR-0026: Blackjack — XState v5 State Machine for Round Lifecycle

- Status: Accepted
- Date: 2026-05-17
- Deciders: Developer

## Context

Blackjack has a complex multi-step round lifecycle: betting → dealing →
insurance → naturals check → per-hand player action → dealer action →
settling → new round. This requires coordinated state transitions, conditional
routing, and context mutation across many steps. The Phase 2 architecture for
coin-flip used a simple `useGameRound` hook without a state machine; Blackjack
is far more complex and benefits from explicit state modelling.

## Decision

Use **XState v5** (`xstate@5.x` + `@xstate/react@6.x`) to implement the
Blackjack round state machine. The machine (`machine.ts`) is a pure module
with no React dependencies; the page uses `useMachine` from `@xstate/react`.

Key design choices:

1. **9 states** — `betting`, `awaiting_bet_handle`, `dealing`,
   `insurance_prompt`, `checking_naturals`, `player_action`, `after_action`,
   `dealer_check`, `dealer_action`, `settling`.
2. **Context** holds all mutable round state: shoe, hands, dealer cards,
   insurance, bet amounts, and the final `roundResult`.
3. **`reenter: true`** on `dealer_action`'s self-loop — required in XState v5
   for re-triggering entry actions.
4. **No `Math.random()`** — shoe uses `systems/rng.ts` (ADR-0005 compliant).
5. **`roundResult` is `null` before settling** — avoids `exactOptionalPropertyTypes`
   TS6 conflict when resetting context to `undefined`.

## Alternatives considered

- **Plain React state + useReducer** — workable but no formal state guarantees;
  missing transitions would be silent bugs.
- **Zustand slice** — not game-sandboxed; violates CLAUDE.md Rule 4.
- **XState v4** — older API (`interpret`, `Machine`); v5 is the current stable.

## Consequences

- `xstate` and `@xstate/react` added as production dependencies (~10 kB gzip).
- Machine is fully unit-testable via `createActor` without React.
- The page must call `wallet.placeBet` and pass the resulting `betHandleId`
  back to the machine via events (ADR-0028).

## References

- BUILD_GUIDE.md §8.1
- Phase 3 spec §5.1
- `src/games/blackjack/machine.ts`
- ADR-0028 (multi-hand wallet pattern)
