# ADR-0042: Craps bet-resolver registry

- Status: Accepted
- Date: 2026-05-22
- Deciders: Developer

## Context

Craps has ~15+ distinct bet types, each with unique win/lose/push/standing resolution rules, payout
odds, and working/off defaults. A naive switch-statement approach in the machine would create a
monolithic, untestable blob. We need a pattern that (a) isolates each bet's rules for unit testing,
(b) supports arbitrary extension, and (c) handles the two payout models: fixed-odds payouts and
roll-dependent composite payouts (field, horn, C&E).

Craps also reuses the table-session wallet model from ADR-0041 (one `rounds` row per session,
buy-in/cash-out bankroll, rebuys accumulate into `totalBoughtIn`).

## Decision

Each bet type is registered in `BET_TYPES: Record<string, BetType>` in `src/games/craps/bets.ts`.
Every entry satisfies the `BetType` interface:

```typescript
interface BetType {
  id: string;
  label: string;
  canPlace(phase: Phase, ctx: BetContext): boolean;
  isWorking(phase: Phase): boolean;
  resolve(
    roll: Roll,
    phase: Phase,
    point: number | null,
    betPoint: number | null,
    amount?: number,
  ): BetOutcome;
  payout(amount: number, betPoint: number | null): number; // winnings only, floor-rounded
}
```

**`BetOutcome` model:**

```typescript
type BetOutcome =
  | { kind: 'win'; multiplier?: number; winnings?: number }
  | { kind: 'lose' }
  | { kind: 'push' }
  | { kind: 'standing' }
  | { kind: 'move'; toPoint: number };
```

**Payout convention:** `payout()` returns **winnings only** (excluding stake). The machine/resolver
credits `stake + winnings` on a `win`. Floor-rounded (favours house on remainder, per ADR-0036).

**Roll-dependent payout overrides:** Fixed-odds bets (pass, come, place, hardways, props) return
plain `{ kind: 'win' }` and rely on `payout()`. Roll-dependent bets use the override fields:

- `multiplier`: winnings = `amount × multiplier` (field: 2 on a 2, 3 on a 12)
- `winnings`: exact integer override (horn, C&E: composite bets where stake splits across
  sub-bets — the winning portion covers only one quarter/half, so winnings can be negative relative
  to a naive calculation)

`resolveRoll` applies precedence: `winnings ?? (multiplier !== undefined ? amount × multiplier : payout())`.

**Working/off defaults (standard casino rules):**

- **Place bets** (`place-4` through `place-10`): `isWorking` returns `false` on the come-out.
  They resolve as `standing` on come-out rolls via `resolveRoll`.
- **Come odds** (`odds-pass`, `odds-dont`): `isWorking` returns `false` on come-out.
- All other bets (pass, don't-pass, come, don't-come, field, propositions, hardways): always working.
- A "place bets working on come-out" toggle is **deferred** (out of scope for Phase 14).

**Come-bet travel:** Come and don't-come bets in their initial state (`betPoint === null`) return
`{ kind: 'move', toPoint: roll.total }` when a point number (4-10) rolls. The machine relocates
these bets by setting `betPoint = toPoint` while keeping the amount; they then win/lose on their
own number.

**Session wallet:** Craps reuses ADR-0041 exactly. `SIT_DOWN` does `placeBet(buyIn)` → in-memory
`bankroll`. Wins/losses update `bankroll` in machine context only. `REBUY` adds chips.
`LEAVE_TABLE` → `settleRound(sessionHandle, { stake: totalBoughtIn, payout: bankroll, won: bankroll > totalBoughtIn, details: { tier, rollsPlayed, rebuys, biggestWin, sessionId } })`.
One `rounds` row per session.

## Alternatives considered

- **Inline switch in machine** — concise for 3-4 bets; unworkable for 15+. Untestable in isolation.
- **Class hierarchy per bet** — more OOP structure but adds boilerplate; plain object registry
  is simpler and idiomatic in this codebase (see roulette's payout table approach).
- **Separate resolver module per bet** — maximum isolation but overkill; the registry pattern
  gives enough isolation with a single import.

## Consequences

- Each bet resolver is independently unit-testable. PRs A and B covered all 15+ bets with ~85 tests.
- Adding a new bet (put bet, buy/lay, hop) is a single registry entry with no machine changes.
- The `multiplier`/`winnings` override fields on `BetOutcome` are locked; changing the payout model
  for field/horn/C&E would require a type revision.
- The `amount?` optional parameter on `resolve` keeps fixed-odds resolver signatures clean while
  allowing composite bets to compute their exact return.
- "Place working on come-out" and configurable field paytable are deferred; they can be added via
  a `forceWorking` flag on `ActiveBet` or a `fieldPays12` config in `StakesConfig` without touching
  the registry interface.

## References

- `src/games/craps/bets.ts` — the registry implementation
- `src/games/craps/resolveRoll.ts` — applies the registry to a list of active bets
- `src/games/craps/machine.ts` — consumes the registry for placement validation + working rules
- ADR-0041 — poker session wallet model (reused by craps)
- ADR-0036 — floor-rounding convention
- BUILD_GUIDE.md §10.9 — Phase 14 Craps
