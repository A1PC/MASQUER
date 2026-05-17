# Phase 4 — Roulette: design spec

**Date:** 2026-05-17
**Author:** Claude (collaborative session with adamzspare)
**Status:** Approved by user 2026-05-17 → implementation
**BUILD_GUIDE refs:** §8.2 (game rules), §3 (file layout), §12 row 4 (phase DoD)
**Tagged release this builds on:** `v0.4-blackjack` (Phase 3)
**Target release tag:** `v0.5-roulette`

---

## 1. Goal

Ship a fully-playable European Roulette game wired into the existing GameShell:
all 10 bet types from BUILD_GUIDE §8.2 with correct payouts, multi-bet rounds, an
XState v5 round machine, a numbered wheel with spin animation, a horizontal
green-felt betting layout, and Lobby integration (cabinet flip from stub →
playable, NEW badge moves from Blackjack to Roulette).

After this phase, four of the five games in the project are playable (Coin Flip,
Blackjack, Roulette, plus the stubs for Slots and Baccarat).

## 2. In scope / out of scope

**In scope**

- European wheel only (single zero, 37 pockets)
- All 10 bet types from §8.2 with the exact payouts in the table
- Multiple bets per round (1–10 distinct positions)
- Bet placement via chip-denomination selector + click target zones on the felt
- Wheel + ball spin animation (cosmetic; result decided by RNG first)
- One `wallet.settleRound` per round aggregating all bets (ADR-0028 pattern)
- Result reveal: winning-pocket pulse + result banner + chip-dribble on winning
  positions
- Post-settle UX: winning chips clear, losing chips remain on the felt as
  re-staging convenience (wallet still does fresh `placeBet` next round)
- Reduced-motion fallback for the spin animation
- Lobby cabinet flip + NEW badge transfer
- Three ADRs (0029 wheel order, 0030 bet position model, 0031 spin contract)

**Out of scope (deferred)**

- American wheel (double zero)
- "En prison" or "la partage" rules on even-money bets when 0 hits
- Auto-spin / "repeat last bet" buttons (could be a Phase 8 polish if asked)
- Statistics specific to Roulette (the global stats page already covers it via
  the rounds table from Phase 1)
- Visual chip stacking physics (chips render as numerical stacks, not 3D piles)
- Sound effects (all of localGamble is silent; Phase 8 polish if at all)

## 3. Game rules (canonical reference)

### 3.1 Wheel

- **Pockets:** 37 — `0` and `1..36`
- **Colors:**
  - `0` → green
  - Red: `1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36`
  - Black: `2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35`
- **Pocket order around the wheel (counter-clockwise from 0):**

  ```
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23,
  10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ```

  This is the real European single-zero sequence. Locked by ADR-0029.

### 3.2 Spin

- Winning number decided by `rng.randomInt(0, 36)` **before** any animation starts.
- Animation is purely cosmetic and is computed from the winning number.

### 3.3 Bet types and payouts (BUILD_GUIDE §8.2)

Payout below is the **profit** per unit staked (gross return = `bet + bet × payout`).
Losing bets return 0.

| Bet         | Covers                            | Payout | Notes                               |
| ----------- | --------------------------------- | ------ | ----------------------------------- |
| Straight up | 1 number (0–36)                   | 35:1   | Includes 0                          |
| Split       | 2 adjacent numbers                | 17:1   | Edge between two cells (horiz/vert) |
| Street      | 3 numbers (a row of 3)            | 11:1   | E.g. {1,2,3}, {4,5,6}, …            |
| Corner      | 4 numbers (2×2 block)             | 8:1    | Intersection of four cells          |
| Six line    | 6 numbers (2 adjacent rows)       | 5:1    | Edge between two streets            |
| Column      | 12 numbers (one of three cols)    | 2:1    | Column 1 = {1,4,7,…,34}, etc.       |
| Dozen       | 12 numbers (1–12 / 13–24 / 25–36) | 2:1    |                                     |
| Red / Black | 18 numbers                        | 1:1    | 0 loses                             |
| Odd / Even  | 18 numbers (excludes 0)           | 1:1    | 0 loses                             |
| Low / High  | 1–18 / 19–36                      | 1:1    | 0 loses                             |

**0 handling:** 0 loses all even-money and outside bets (no en prison). 0 wins
only a Straight bet on 0.

**Splits on/around 0:** valid splits involving 0 are `{0,1}`, `{0,2}`, `{0,3}`.

**Streets including 0:** the spec deliberately excludes them. Bets including 0
must be placed as splits or as a straight on 0. (This avoids the "basket" /
"top line" five-number bet that exists on American wheels with a unique 6:1
payout. ADR-0030 documents this exclusion.)

### 3.4 Per-round constraints

- Per-bet limits: **min 5 chips, max 1000 chips** (matches Blackjack via
  ADR-0025; locked in [BettingPanel] / Phase 2 convention)
- Maximum **10 distinct bet positions per round**. Placing on an already-bet
  position adds chips to that stack (does not consume a new position slot).
- All chip amounts are integers (CLAUDE.md hard rule).

## 4. Architecture

### 4.1 File structure

```
src/games/roulette/
├── types.ts            # Pure type definitions (BetType, BetPosition, RoundSpin…)
├── config.ts           # ROULETTE_CONFIG (limits, animation timing constants)
├── wheel.ts            # POCKET_ORDER, RED_NUMBERS, color(), indexOf(), neighborOf()
├── bets.ts             # Bet → number-set expansion + bet-key validation
├── logic.ts            # spin(), settle(), buildRoundDetails()
├── machine.ts          # XState v5 round machine (3 states)
├── ChipSelector.tsx    # 6-chip denomination selector (5/25/100/250/500/1000)
├── ChipStack.tsx       # Visual stack rendered on each bet position
├── Wheel.tsx           # Numbered wheel + pearl ball + spin animation
├── BettingLayout.tsx   # Green felt grid with click target zones
├── ResultBanner.tsx    # Sliding result banner (winning number + outcome)
├── RoulettePage.tsx    # Wires GameShell + machine + Wheel + BettingLayout
├── wheel.test.ts
├── bets.test.ts
├── logic.test.ts
├── machine.test.ts
├── Wheel.test.tsx
├── BettingLayout.test.tsx
├── ChipStack.test.tsx
└── RoulettePage.test.tsx
```

**Reused from earlier phases (NO modifications needed):**

- `src/systems/rng.ts` — `randomInt(0, 36)` provides the spin
- `src/systems/wallet.ts` — `placeBet` (per bet position) + `settleRound`
  (once per round, aggregating)
- `src/games/_shared/GameShell.tsx` — page-level chrome
- `src/games/_shared/RecentResults.tsx` — last-N rounds strip
- `src/games/_shared/useGameRound.ts` — bet/settle hook

**Files this phase touches outside `src/games/roulette/`:**

- `src/pages/Lobby.tsx` — flip Roulette cabinet from stub → playable; move
  NEW badge from Blackjack → Roulette
- `src/router.tsx` — already routes `/games/roulette` to `StubGamePage`; swap to
  `RoulettePage`
- `BUILD_GUIDE.md` §3 (game status table if present) and §12 row 4 (mark DoD met)
- `docs/adr/0029-roulette-european-wheel-order.md`
- `docs/adr/0030-roulette-bet-position-model.md`
- `docs/adr/0031-roulette-spin-animation-contract.md`
- `commitlint.config.js` — `roulette` scope is already present (verified); no
  change needed unless a new sub-scope is introduced

### 4.2 Layering (mirrors Blackjack)

```
┌───────────────────────────────────────────────────────────┐
│ RoulettePage (React, in src/games/roulette/)              │
│  ├─ GameShell                       (Phase 2 shared)      │
│  ├─ BettingLayout + ChipSelector    (Phase 4)             │
│  ├─ Wheel                           (Phase 4)             │
│  ├─ ResultBanner                    (Phase 4)             │
│  └─ useGameRound + walletStore      (Phase 2 shared)      │
└─────────────────────┬─────────────────────────────────────┘
                      │ events
                      ▼
┌───────────────────────────────────────────────────────────┐
│ rouletteMachine (XState v5)                               │
│  states: betting → spinning → settled → betting           │
└─────────────────────┬─────────────────────────────────────┘
                      │ pure
                      ▼
┌───────────────────────────────────────────────────────────┐
│ logic.ts / bets.ts / wheel.ts (pure, no I/O, no React)    │
│  spin / settle / bet-expansion / pocket lookup            │
└─────────────────────┬─────────────────────────────────────┘
                      │ randomInt(0, 36)
                      ▼
                  rng.ts (Phase 2 system)
```

CLAUDE.md hard rule 4 holds: `src/games/roulette/**` does not import from
`src/db/**` or `src/store/**`. The only I/O it touches is via `useGameRound`
(which lives in `src/games/_shared/**`, the exempted shared layer per ADR
followed during Phase 2 PR E).

## 5. Types (inline draft — `types.ts`)

```ts
// src/games/roulette/types.ts

/** All bet categories from BUILD_GUIDE §8.2. */
export type BetType =
  | 'straight' // 1 number, 35:1
  | 'split' // 2 numbers, 17:1
  | 'street' // 3 numbers, 11:1
  | 'corner' // 4 numbers, 8:1
  | 'six-line' // 6 numbers, 5:1
  | 'column' // 12 numbers, 2:1 — column 1/2/3
  | 'dozen' // 12 numbers, 2:1 — 1-12 / 13-24 / 25-36
  | 'red'
  | 'black' // 18 numbers each, 1:1
  | 'odd'
  | 'even' // 18 numbers each, 1:1
  | 'low'
  | 'high'; // 1-18 / 19-36, 1:1

/**
 * Canonical position key. One of:
 *  - `straight:N` where N ∈ 0..36
 *  - `split:N1-N2` where N1 < N2 and (N1, N2) is a valid wheel-adjacent pair
 *  - `street:N` where N is the lowest number in the row (1, 4, 7, …, 34)
 *  - `corner:N` where N is the top-left number of the 2×2 block
 *  - `six-line:N` where N is the lowest number of the two adjacent rows
 *  - `column:1` | `column:2` | `column:3`
 *  - `dozen:1` | `dozen:2` | `dozen:3`
 *  - `red` | `black` | `odd` | `even` | `low` | `high`
 *
 * The position key is the unique identifier for a bet on the felt. Two
 * placeBet calls with the same position key in one round add to the same
 * stack (no new position slot consumed).
 */
export type BetPositionKey = string;

export interface BetPosition {
  readonly key: BetPositionKey;
  readonly type: BetType;
  /** The numbers this position covers (computed by bets.ts). 1-36 for outside bets; 0..36 for straight. */
  readonly numbers: readonly number[];
  /** Profit multiple per unit staked (35, 17, 11, 8, 5, 2, or 1). */
  readonly payoutMultiple: 1 | 2 | 5 | 8 | 11 | 17 | 35;
}

export interface PlacedBet {
  readonly key: BetPositionKey;
  readonly type: BetType;
  readonly numbers: readonly number[];
  readonly payoutMultiple: BetPosition['payoutMultiple'];
  /** Total chips staked on this position this round (sum of all chip clicks). */
  readonly amount: number;
  /** Wallet bet-handle id (one per position). */
  readonly betHandleId: string;
}

export type PocketColor = 'red' | 'black' | 'green';

export interface SpinResult {
  readonly number: number; // 0..36
  readonly color: PocketColor;
  /** Index in POCKET_ORDER (0..36). Useful for animation. */
  readonly pocketIndex: number;
}

export interface BetOutcome {
  readonly key: BetPositionKey;
  readonly type: BetType;
  readonly amount: number;
  /** True if any number in this position matches the spin. */
  readonly won: boolean;
  /** Gross return to player on this position (0 if lost; `amount + amount * payoutMultiple` if won). */
  readonly payout: number;
}

export interface RouletteRoundDetails {
  readonly spin: SpinResult;
  readonly bets: readonly {
    readonly key: BetPositionKey;
    readonly type: BetType;
    readonly numbers: readonly number[];
    readonly amount: number;
    readonly payout: number;
  }[];
}
```

## 6. Config (inline `config.ts`)

```ts
// src/games/roulette/config.ts

export const ROULETTE_CONFIG = {
  /** Per-bet-position limits. Same range as Blackjack (ADR-0025). */
  MIN_BET: 5,
  MAX_BET: 1_000,
  /** Maximum number of distinct bet positions per round. ADR-0030. */
  MAX_POSITIONS_PER_ROUND: 10,
  /** Available chip denominations (selector order, left → right). */
  CHIP_DENOMINATIONS: [5, 25, 100, 250, 500, 1_000] as const,
  /** Spin animation duration in ms. ADR-0031. */
  SPIN_DURATION_MS: 5_000,
  /** Result-banner reveal duration (banner stays visible until next bet click). */
  RESULT_PULSE_MS: 600,
} as const;

export type RouletteConfig = typeof ROULETTE_CONFIG;
```

## 7. Wheel data (inline `wheel.ts`)

```ts
// src/games/roulette/wheel.ts
import type { PocketColor } from './types';

/** Counter-clockwise pocket sequence starting from 0. Real European wheel. ADR-0029. */
export const POCKET_ORDER: readonly number[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const;

export const RED_NUMBERS: ReadonlySet<number> = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export function colorOf(n: number): PocketColor {
  if (n === 0) return 'green';
  return RED_NUMBERS.has(n) ? 'red' : 'black';
}

/** Index of N in POCKET_ORDER (0..36). Throws if N out of range. */
export function pocketIndexOf(n: number): number {
  const i = POCKET_ORDER.indexOf(n);
  if (i < 0) throw new RangeError(`Not a valid roulette number: ${n}`);
  return i;
}
```

**Why split into its own file:** the pocket order, color map, and angular
helpers are reused by `bets.ts` (for splits/corners), `Wheel.tsx` (for SVG arc
rendering and ball position), and `logic.test.ts`. Keeping them in one tiny
module makes the canonical data easy to find and audit.

## 8. Bet expansion (`bets.ts`)

`bets.ts` answers: given a click target on the felt, what `BetPosition` does
that correspond to, and what numbers does it cover?

Key exports:

```ts
// src/games/roulette/bets.ts
import type { BetPosition, BetPositionKey, BetType } from './types';

/** Construct a BetPosition from a type and the necessary parameters.
 *  Throws if the position is invalid (e.g. non-adjacent split, out-of-range street). */
export function makeBet(
  input:
    | { type: 'straight'; n: number }
    | { type: 'split'; a: number; b: number }
    | { type: 'street'; rowStart: number } // 1, 4, 7, …, 34
    | { type: 'corner'; topLeft: number }
    | { type: 'six-line'; rowStart: number } // 1, 4, …, 31
    | { type: 'column'; col: 1 | 2 | 3 }
    | { type: 'dozen'; dozen: 1 | 2 | 3 }
    | { type: 'red' | 'black' | 'odd' | 'even' | 'low' | 'high' },
): BetPosition;

/** True iff (a,b) is a valid split: horizontally adjacent on the grid, or
 *  vertically adjacent in the same column. Includes the three 0-splits. */
export function isValidSplit(a: number, b: number): boolean;

/** True iff `topLeft` is the top-left of a valid 2×2 corner on the felt
 *  (rows 1-3 always; columns 1-11; 0-adjacent corners are NOT valid). */
export function isValidCorner(topLeft: number): boolean;

/** Helpers used by BettingLayout for click-target geometry. */
export function rowOf(n: number): 1 | 2 | 3; // 1=bottom row (1,4,7…), 2=middle, 3=top
export function columnOf(n: number): 1 | 2 | 3; // 1-36 → 1,2,3; throws on 0
export function dozenOf(n: number): 1 | 2 | 3 | null; // null for 0
```

The `BetPositionKey` is derived deterministically by `makeBet` so the same
logical position always maps to the same key (enables stacking).

**Coverage requirements (per CLAUDE.md ≥ 90% on `games/*/logic.ts` — and we hold
`bets.ts` to the same bar):**

- Every bet type constructs the right number set
- All split adjacency cases (horizontal pairs, vertical pairs, 0-splits)
- All corner positions (valid and invalid)
- Street/six-line range validation
- Position key uniqueness for stacking

## 9. Logic API (`logic.ts`)

```ts
// src/games/roulette/logic.ts
import { randomInt } from '@/systems/rng';
import { colorOf, pocketIndexOf } from './wheel';
import type { BetOutcome, PlacedBet, RouletteRoundDetails, SpinResult } from './types';

/** Decide the winning number from the RNG. Pure-ish: depends on rng.ts. */
export function spin(): SpinResult {
  const n = randomInt(0, 36);
  return { number: n, color: colorOf(n), pocketIndex: pocketIndexOf(n) };
}

/** For one bet, compute the outcome given a spin. */
export function settleOne(bet: PlacedBet, spin: SpinResult): BetOutcome {
  const won = bet.numbers.includes(spin.number);
  const payout = won ? bet.amount + bet.amount * bet.payoutMultiple : 0;
  return { key: bet.key, type: bet.type, amount: bet.amount, won, payout };
}

/** Aggregate outcomes for the wallet.settleRound RoundResult.
 *
 *  - totalBet = sum of all bet amounts
 *  - totalPayout = sum of payouts on winning positions (0 on losers)
 *  - outcome = 'win' if totalPayout > totalBet, 'loss' if < totalBet, 'push' if equal
 *  - details = RouletteRoundDetails (per-position breakdown + spin)
 */
export function buildRoundResult(
  bets: readonly PlacedBet[],
  spin: SpinResult,
): {
  outcome: 'win' | 'loss' | 'push';
  betAmount: number;
  payout: number;
  netChange: number;
  details: RouletteRoundDetails;
};
```

**Note on `wallet.settleRound` contract (ADR-0028 pattern):** the page calls
`placeBet` once per position (each returns its own `BetHandle`), then calls
`settleRound` **once** with the first position's handle and the aggregate
`RoundResult`. Only the first position becomes the rounds-table row id;
the rest are absorbed into the aggregate. This mirrors how Blackjack handles
splits/doubles in Phase 3.

**Coverage requirements (`logic.ts` ≥ 90%):**

- `spin()` returns a result for every possible RNG value 0..36 with correct color
- `settleOne` for each bet type: win case + loss case
- `settleOne` for each bet type when spin is 0 (only `straight:0` wins; outside
  bets lose; splits on 0 win if covering 0)
- `buildRoundResult`: pure-loss round, pure-win round, mixed (win + loss), push
  (rare: e.g. one red bet wins 1:1, one black bet equal amount loses, plus a
  street whose payout offsets exactly — synthesized case sufficient)

## 10. Round machine (`machine.ts`)

XState v5, three states. Simpler than Blackjack's nine because there's no
per-hand sequence.

```
┌─────────┐  PLACE_BET → addBetToContext       ┌──────────┐
│ betting │  REMOVE_BET → drop bet              │ spinning │
│         │  CLEAR_ALL → wipe bets              │          │
│         │  SPIN (guard: bets.length > 0) ─────►          │
└─────────┘                                    └────┬─────┘
     ▲                                              │
     │ NEW_ROUND                                    │ (after SPIN_DURATION_MS:
     │                                              │   compute outcome, then →)
     │                                              ▼
     │                                       ┌──────────┐
     └──── NEW_ROUND ────────────────────────│ settled  │
                                              └──────────┘
```

Context:

```ts
interface Context {
  bets: PlacedBet[]; // current round, max 10 positions
  spin: SpinResult | null; // set on entering 'spinning'
  roundResult: ReturnType<typeof buildRoundResult> | null; // set on entering 'settled'
  spinDurationMs: number; // 5000 default; 0 when reduced-motion on (from page)
}
```

Events:

```ts
type Event =
  | { type: 'PLACE_BET'; bet: Omit<PlacedBet, 'betHandleId'>; betHandleId: string }
  | { type: 'REMOVE_BET'; key: BetPositionKey }
  | { type: 'CLEAR_ALL' }
  | { type: 'SPIN' } // gated by `hasAtLeastOneBet`
  | { type: 'NEW_ROUND' }; // re-enters betting; preserves losing bets per UX rule
```

Guards:

- `hasAtLeastOneBet` — `context.bets.length > 0`
- `underPositionCap` — `context.bets.length < MAX_POSITIONS_PER_ROUND` _or_ the
  PLACE_BET targets an existing key (stacking).

Actions:

- `addBet` — append/merge by key, summing amounts
- `removeBet` — drop by key
- `clearAll` — reset bets to []
- `setSpin` — assign `spin = spin()` on entering `spinning`
- `setResult` — assign `roundResult = buildRoundResult(bets, spin)` after the
  animation delay
- `prepareNextRound` — keep losing-bet positions in `context.bets` with their
  amounts but clear their `betHandleId` (UI re-staging); winning positions are
  removed entirely. The page is responsible for calling fresh `placeBet`
  calls for any kept positions when the player clicks SPIN again. **Wallet
  always sees fresh `placeBet` per round; the kept chips are UI only.**

Delays:

- `spinning` → `settled` after `context.spinDurationMs` (default
  `ROULETTE_CONFIG.SPIN_DURATION_MS = 5000`). Implemented as XState `after`
  transition reading from context, not from the config constant directly.
  The page supplies `spinDurationMs` via machine input on creation:
  - Normal: 5000
  - Reduced motion: 0
    The Wheel component reads the same value via prop so visual + machine
    stay in sync. ADR-0031 records this contract.

**Coverage requirements (`machine.test.ts`):**

- Initial state is `betting` with empty bets
- PLACE_BET adds a bet; second PLACE_BET on same key stacks; can't exceed cap
- REMOVE_BET drops; CLEAR_ALL wipes
- SPIN is rejected when no bets are placed
- SPIN transitions to `spinning`, sets `spin`, after 5s transitions to
  `settled` with `roundResult` populated
- NEW_ROUND from `settled` returns to `betting`; losing-bet positions are
  preserved with their amounts; winning positions are removed
- Reduced-motion: machine itself does not branch; the page passes a 0-delay
  override (see §15)

## 11. Page (`RoulettePage.tsx`)

Wires everything together. Composition:

```
<GameShell title="Roulette" minBet={5} maxBet={1000}>
  <div className="roulette-page">
    <Wheel
      spinning={state.matches('spinning')}
      targetNumber={state.context.spin?.number ?? null}
      durationMs={spinDurationMs}
    />
    <ResultBanner
      visible={state.matches('settled')}
      result={state.context.roundResult}
      spin={state.context.spin}
    />
    <BettingLayout
      bets={state.context.bets}
      disabled={!state.matches('betting')}
      selectedChip={selectedChip}
      onPlaceBet={handlePlaceBet}
      onRemoveBet={key => send({ type: 'REMOVE_BET', key })}
    />
    <ChipSelector value={selectedChip} onChange={setSelectedChip} />
    <ActionsRow>
      <button onClick={() => send({ type: 'CLEAR_ALL' })}
              disabled={!state.matches('betting') || !state.context.bets.length}>
        Clear all bets
      </button>
      <button onClick={() => send({ type: 'SPIN' })}
              disabled={!state.matches('betting') || !state.context.bets.length}>
        Spin
      </button>
      <button onClick={() => send({ type: 'NEW_ROUND' })}
              disabled={!state.matches('settled')}>
        New round
      </button>
    </ActionsRow>
    <RecentResults game="roulette" />
  </div>
</GameShell>
```

`handlePlaceBet` responsibilities (called when the player clicks a target zone):

1. Build the `BetPosition` via `bets.makeBet(...)`. Bail if invalid.
2. Check chip selection: amount = current chip denomination. If existing
   stack + chip would exceed `MAX_BET`, ignore the click.
3. Call `useGameRound.placeBet(amount, { min: 5, max: 1000 })`. On
   `insufficient_chips` or `above_maximum`, surface a small toast (reuse
   the wallet error path from Phase 2).
4. On success: send `PLACE_BET` to the machine with the new handle.

When `state.matches('settled')`, the page also has to issue
`wallet.settleRound(firstHandle, aggregateResult)` exactly once. This is done
in a `useEffect` keyed on `state.context.roundResult` (mirrors the Blackjack
page pattern from Phase 3).

**Coverage requirements (`RoulettePage.test.tsx`):**

- Placing a bet adds a chip stack visually and calls `placeBet`
- Clicking SPIN with no bets is disabled
- After spin, `settleRound` is called exactly once
- Winning positions clear on NEW_ROUND; losing positions remain
- Insufficient-chips error surfaces (mocked walletStore)

## 12. Wheel component (`Wheel.tsx`)

### 12.1 Visual layers (back to front)

1. **Outer wooden ring** — `<div>` with radial-gradient brown wood + brass-gold
   inner border (`box-shadow: inset 0 0 0 6px #d4af37`) + **golden neon glow
   halo** (`box-shadow: 0 0 24px / 48px / 72px rgba(212,175,55,…)` stacked).
2. **Ball track** — recessed ring between the brass band and the pocket ring.
3. **Pocket ring** — single `<svg>` containing **37 `<path>` arcs** (each ≈9.73°)
   and a `<text>` label per arc with the pocket number. The whole `<svg>`
   element rotates as one unit. Pocket fills use the canonical colors (`#a3122a`
   red, `#1a1a1a` black, `#3dd17a` green) and labels are white with thin black
   stroke for contrast.
4. **Wooden hub disc** — small inner circle, radial gradient.
5. **Silver turret cross** — two crossed bars (horizontal + vertical) with a
   metallic gradient (`linear-gradient(180deg, #f4f4f4, #b8b8b8, #888, #b8b8b8,
#f4f4f4)`) and a central silver cap with gold trim. Sits on top of the hub.
6. **Pearl ball** — 14×14 px `<div>` with a radial gradient producing the pearl
   highlight. Positioned in the ball track via `transform: rotate(<angle>)
translateY(-<trackRadius>)`.

**Fixed pointer** — gold downward triangle anchored above the wheel,
indicating the winning pocket when the wheel stops.

All colors are pulled from `src/theme/` constants where they exist; new
roulette-specific colors (wood tones, pearl shade) are added there as part of
PR B (NOT hard-coded in components — CLAUDE.md project map).

### 12.2 Animation contract (ADR-0031)

- **Idle:** wheel stationary at `rotation = 0`. Ball hidden (`opacity: 0`).
- **Spinning (`SPIN_DURATION_MS = 5000`):**
  - Wheel rotates **clockwise**. Total rotation is `5 full turns + θ`
    where `θ = pocketIndexOf(winningNumber) × (360/37)` minus a small
    physics-style offset. Easing: `easeOut` (Framer Motion cubic).
  - Ball appears (`opacity: 1`) and orbits **counter-clockwise** along the
    ball track, decelerating with `easeOut`. End angle is computed so the
    ball sits over the winning pocket once the wheel stops.
  - Both animations are driven by the **same** `target` derived from the
    `targetNumber` prop. There is no real physics; the result is decided by
    `spin()` in the machine and the visuals are deterministic given that
    input.
- **Settled:** wheel and ball hold their final positions. Winning pocket
  pulses (`box-shadow` brief halo in pocket color, 600ms `easeOut`).
- **Reduced motion (`prefers-reduced-motion: reduce`):**
  - Skip rotation entirely.
  - On entering `spinning`, set `rotation = θ` immediately; ball appears at
    final position with a 200ms fade-in.
  - Machine timing is unchanged (still 5s before `settled`) to keep the wallet
    flow consistent, OR (alternative) the page passes `durationMs=0` and the
    machine settles instantly. **Decision:** use the alternative — pass
    `durationMs=0` to the machine via context override when reduced-motion
    is on. This avoids leaving the player staring at a static page for 5
    seconds. Documented in ADR-0031.

### 12.3 Implementation notes

- Use Framer Motion's `motion.svg` with `animate={{ rotate: targetDeg }}`
  and `transition={{ duration: 5, ease: [0.16, 1, 0.3, 1] }}`.
- Wheel `<svg>` is generated programmatically: a small helper builds the 37
  `<path d="M 0 0 L … A … Z" />` strings from `POCKET_ORDER` so adding labels
  or pocket borders later is a single function change.
- Ball position computed in the same component via a `useEffect` keyed on
  `targetNumber` + `spinning`.
- The component is **uncontrolled** in the sense that the parent never tells
  it the rotation directly — only `targetNumber` and `spinning`. This keeps
  parent and child decoupled.

**Coverage requirements (`Wheel.test.tsx`):**

- Renders all 37 pocket arcs with correct colors and labels
- When `targetNumber` changes while `spinning=true`, the wheel's `aria-label`
  reflects the target (for screen readers and easy testing)
- `prefers-reduced-motion: reduce` (mocked via `matchMedia`) renders the
  wheel in its final rotation without an animated transition

## 13. Betting layout (`BettingLayout.tsx`)

### 13.1 Grid

- Horizontal/landscape real-casino layout.
- Felt: dark-green gradient (`linear-gradient(180deg, #0a3a22, #0b2a18)`),
  inset gold border.
- CSS Grid:
  - Column track 1: zero cell (spans 3 rows tall, left side).
  - Tracks 2–13: number columns 1–12 (each holds the three numbers in that
    column).
  - Track 14: column-bet buttons ("2:1" × 3, one per row).
  - Row 4: three dozen-bet cells (each spans 4 number columns).
  - Row 5: six even-money bars (1-18, EVEN, RED, BLACK, ODD, 19-36), each
    spans 2 number columns.

### 13.2 Click target zones

Each click target maps to a `makeBet(...)` call and produces a
`BetPositionKey`. Targets:

| Target                                                     | Bet                                   |
| ---------------------------------------------------------- | ------------------------------------- |
| Number cell N                                              | `straight:N`                          |
| Edge between two adjacent number cells                     | `split:a-b`                           |
| Left edge of a row (touching the 1-3 column gutter, NOT 0) | `street:rowStart`                     |
| Intersection of four cells (2×2)                           | `corner:topLeft`                      |
| Left edge between two streets                              | `six-line:rowStart`                   |
| "2:1" cell at end of a row                                 | `column:row`                          |
| "1st 12" / "2nd 12" / "3rd 12"                             | `dozen:N`                             |
| "RED", "BLACK", "ODD", "EVEN", "1-18", "19-36"             | even-money bets                       |
| Zero cell                                                  | `straight:0`                          |
| Edges between 0 and {1, 2, 3}                              | `split:0-1`, `split:0-2`, `split:0-3` |

**Implementation:** each number cell is a `<button>` for `straight`. The
split/corner/street/six-line targets are smaller `<button>` overlays
positioned absolutely on the edges, with `aria-label` describing the bet
(e.g. "Split bet on 17 and 18"). Visual indication: edge targets are
invisible until hovered (small gold rectangle appears at the hovered edge),
matching real online roulette UX.

### 13.3 Chip rendering

- For each occupied `BetPositionKey`, render a `<ChipStack amount={...} />`
  centered on the target. ChipStack picks the smallest combination of
  denominations from `CHIP_DENOMINATIONS` that sums to `amount` and renders
  them stacked with slight vertical offsets.
- Selected positions (last placed) get a soft gold ring for ~400ms after
  placement (fade-out).

### 13.4 Disabled state

- During `spinning` and `settled`, all target buttons are disabled
  (`pointer-events: none`, opacity reduced to 0.7). Existing chip stacks
  remain visible.

### 13.5 Narrow viewports

- The felt has `overflow-x: auto` and a `min-width: 720px` interior. On
  narrow screens, horizontal scroll inside the felt area (the wheel above
  it stays centered). No reflow to a vertical layout (deferred — could be a
  Phase 8 polish).

**Coverage requirements (`BettingLayout.test.tsx`):**

- Clicking a number cell calls `onPlaceBet` with the right `straight` bet
- Clicking a split edge calls with the right `split` bet
- Clicking with no chip selected is a no-op (chip selector defaults to 5,
  so this is more "chip selector → bet amount" coverage)
- Disabled state blocks clicks
- Chip stacks render the correct denomination breakdown
- Reduced-motion: gold-ring placement highlight is omitted

## 14. ChipSelector + ChipStack

### 14.1 ChipSelector

- A row of 6 chip buttons, each rendered as a circular SVG/CSS chip.
- Colors (locked):
  - $5 = red, $25 = green, $100 = black, $250 = yellow, $500 = purple, $1000 = orange.
- Selected chip has a gold ring + slight lift.
- Disabled during `spinning`/`settled`.

### 14.2 ChipStack

- Renders 1–N chips of decreasing denomination, stacked top-to-bottom with
  ~4 px vertical offset.
- Breakdown rule: greedy — use as many of the largest denomination as fit,
  then next-largest, etc. (e.g. `amount=435` → 1×$250 + 1×$100 + 3×$25 + 2×$5 → 7 chips total).
- If breakdown exceeds 6 chips visually, render the top chip with a small
  badge showing the total amount and collapse the rest to a stylized stub.
  (Prevents UI overflow on max-bet stacks.)

**Coverage requirements (`ChipStack.test.tsx`):**

- Greedy breakdown for a handful of representative amounts
- 6-chip overflow rule

## 15. Result reveal sequence

When the machine enters `settled`:

1. **t = 0:** Winning pocket pulses (600ms `easeOut`, color-matched halo).
2. **t = 0:** ResultBanner slides in from the top of the felt area.
   Content: `♠ 17 BLACK — You won $X` (or `You lost $Y` or `Even — $0`).
   Slide animation: `y: -40 → 0`, `opacity: 0 → 1`, 250ms.
3. **t = 200ms:** For each winning `BetPosition`, the chip-stack icon
   animates: scale-up briefly (1.0 → 1.1 → 1.0 in 300ms) — the "chip dribble"
   we reuse from Phase 2's wallet settlement micro-animation.
4. **t = 800ms:** Losing chip-stacks stay in place (UX rule). Winning
   chip-stacks fade out (`opacity: 1 → 0`, 250ms) and are removed from
   `context.bets` on the next `NEW_ROUND`.
5. Player clicks **New round** to re-enter `betting`. Losing positions
   remain (re-staged); fresh `placeBet` calls are issued for each on the
   next SPIN.

For `prefers-reduced-motion: reduce`, steps 2–4 happen with no transitions
(snap), and the wheel pulse from §12 is skipped.

## 16. Reduced motion summary

Single source of truth — `src/theme/useReducedMotion.ts` (already exists per
Phase 3) — read once in `RoulettePage` and propagated to children via props:

- `Wheel`: `durationMs={reducedMotion ? 0 : 5000}` and skips rotation
- `BettingLayout`: skips the gold-ring placement highlight
- `ResultBanner`: snaps in/out instead of sliding
- Pocket pulse skipped

The machine reads its delay from `context.spinDurationMs` (see §10); the
page supplies `0` instead of `5000` when reduced motion is on. (Confirmed
pattern in §10 + ADR-0031.)

## 17. ADRs

Three new ADRs in PR A. Drafts below — full text written in the PR commit.

### ADR-0029 — European wheel pocket order canonicalized in `wheel.ts`

- **Decision:** ship the real European single-zero pocket order as a frozen
  constant. American wheel deferred indefinitely.
- **Rationale:** matches player expectation; single source of truth for
  `Wheel.tsx` (visual) and `logic.ts` (would only matter if neighbor bets
  were ever added).
- **Consequences:** any future bet types that depend on pocket adjacency
  (voisins, tiers du cylindre) can lean on this constant.

### ADR-0030 — Roulette bet position model

- **Decision:** model bets as discrete `BetPosition` records keyed by a
  canonical `BetPositionKey` string. Max 10 distinct positions per round.
  Repeated clicks on the same key add to the stack rather than consuming
  position slots.
- **Rationale:** matches real-casino mental model (chips on a position
  combine); keeps state predictable; the 10-position cap prevents
  pathological state explosions in the machine context.
- **Consequences:** stacking semantics drive both the BettingLayout UX and
  the ChipStack visual breakdown. Splits including 0 are explicit
  (`split:0-1`, etc); streets including 0 and the American "basket" 5-number
  bet are intentionally excluded.

### ADR-0031 — Roulette spin animation contract

- **Decision:** 5-second spin, wheel ease-out clockwise, ball ease-out
  counter-clockwise, both deterministic from the RNG-decided winning
  number; result is decided **before** animation starts; `prefers-reduced-motion`
  collapses both visual + machine delay to 0.
- **Rationale:** matches BUILD_GUIDE §8.2 ("animation is cosmetic; result
  decided by RNG"); 5s is the sweet spot from the brainstorm; reduced-motion
  must not strand the player.
- **Consequences:** the spin duration is a single config constant; future
  tuning is one-line. Animation tests pin the contract.

## 18. Testing strategy

Targets and tools (per CLAUDE.md):

- **Unit:** Vitest, jsdom — `wheel.test.ts`, `bets.test.ts`, `logic.test.ts`,
  `machine.test.ts`. Coverage gate ≥ 90% on `logic.ts` and `bets.ts`.
- **Component:** React Testing Library — `Wheel.test.tsx`,
  `BettingLayout.test.tsx`, `ChipStack.test.tsx`, `RoulettePage.test.tsx`.
- **Integration:** `RoulettePage.test.tsx` exercises the full flow with the
  real machine + mocked `walletStore`: place bets → spin → assert
  `placeBet` and `settleRound` mocks called with right args → assert UI
  reflects settled state.
- **No-`Math.random` lint:** existing ESLint rule from Phase 2 already
  enforces. Verified for new files.
- **Coverage check:** `pnpm test --coverage` in CI must hit the ≥90% gate;
  the gate is configured via `vitest.config.ts` (already in place from
  Phase 3).

Edge cases worth explicit tests:

- Spin = 0: all outside bets lose, `straight:0` and `split:0-1/0-2/0-3` win
- 10-position cap: 11th distinct position is rejected; 11th click on an
  existing position stacks
- Max-bet stacking: $1000 cap is enforced per position even when the chip
  selector says $1000 — clicking a position with $500 stack + $1000 chip
  rejects (because $500 + $1000 > $1000)
- Insufficient chips mid-round: `walletStore.placeBet` returns
  `insufficient_chips`; the position is NOT added to machine context

## 19. PR sequencing (4 PRs)

Each PR is independently mergeable, leaves the app in a working state, and
has its own CI green. **Subagent-driven development**, one fresh subagent
per PR, two-stage review (spec compliance → code quality) per
`superpowers:subagent-driven-development`.

### PR A — Logic + machine + ADRs

**Branch:** `phase-4-roulette-pr-a-logic`
**Scope:** `types.ts`, `config.ts`, `wheel.ts`, `bets.ts`, `logic.ts`,
`machine.ts` plus tests for each. ADRs 0029/0030/0031. BUILD_GUIDE §3
update for game-status row (if such a row is present; else leave §12 row 4
unchanged until PR D).
**Coverage:** logic/bets ≥ 90%; machine ≥ 90%.
**Risk:** lowest — purely logic + state, no UI. Catches all rule mistakes
upfront before anything visual is built. Mirrors Phase 3 PR A.

### PR B — Wheel component

**Branch:** `phase-4-roulette-pr-b-wheel`
**Scope:** `Wheel.tsx`, `Wheel.test.tsx`. Includes any new color tokens in
`src/theme/` for wood/brass/pearl tones. Includes a dev-only preview route
at `/dev/wheel-preview` (gated to `import.meta.env.DEV`) for visual smoke
testing.
**Risk:** medium — SVG arc geometry + Framer Motion + reduced-motion fallback.

### PR C — BettingLayout + ChipSelector + ChipStack

**Branch:** `phase-4-roulette-pr-c-betting`
**Scope:** `BettingLayout.tsx`, `ChipSelector.tsx`, `ChipStack.tsx`, plus
tests. Includes dev preview at `/dev/betting-preview`.
**Risk:** medium — click target geometry is the trickiest part of the
phase. Subagent must build the edge-overlay buttons carefully.

### PR D — RoulettePage + lobby + release

**Branch:** `phase-4-roulette-pr-d-page`
**Scope:** `RoulettePage.tsx` + `RoulettePage.test.tsx`, `ResultBanner.tsx`,
update `router.tsx` (swap StubGamePage), update `pages/Lobby.tsx`
(flip cabinet stub → playable; move NEW badge from Blackjack to Roulette),
update BUILD_GUIDE §12 row 4 (Phase 4 DoD met).
**Risk:** integration — the wallet + machine wiring is where Phase 3 PR C
had its `exactOptionalPropertyTypes` hiccups. Spec calls them out in §11
so the subagent has guardrails.

**Release PR** (separate): `chore(release): v0.5-roulette (#XX)` — tag,
release notes, no code changes. Following the Phase 3 release pattern.

## 20. Definition of Done (Phase 4)

Per BUILD_GUIDE §12 row 4 and CLAUDE.md hard rule 8, **before** the release
PR:

- [ ] All 4 PRs merged to main
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` green locally
      on main after PR D merges
- [ ] CI: all 4 jobs green on main
- [ ] Bundle still under reasonable size (≤ 800 kB JS; current is ~657 kB —
      Roulette should add < 100 kB, but flag if over)
- [ ] Manual smoke: log in, navigate to Lobby, click Roulette cabinet, place
      at least three different bet types (straight, split, outside),
      spin, observe correct settle, observe winning chips clear and losing
      chips remain, click New round, spin again
- [ ] `prefers-reduced-motion: reduce` manual smoke: same flow with the
      OS setting on, no animations play, wallet flow still correct
- [ ] All 10 bet types exercised at least once (manual or via tests)
- [ ] 0 hits at least once (force via temporary `rng.seed` if needed in
      dev preview; do NOT commit the seed)

## 21. Risks and mitigations

| Risk                                        | Mitigation                                                                                                                                                                                           |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SVG arc geometry off-by-one (37 ≠ 36)       | Inline test asserting `sum of arc angles === 360°` and pocket positions land where expected                                                                                                          |
| Click target ambiguity (split edge vs cell) | Edge targets are smaller `<button>`s overlaying the cell border, positioned absolutely — gives them click priority via natural stacking order. Hover state confirms which bet you're about to place. |
| Reduced-motion stranding (5s static page)   | Decision in §16: pass `durationMs=0` when reduced motion on. ADR-0031 records this.                                                                                                                  |
| 10-position cap is the wrong number         | Easy to change — single constant in `config.ts`. Won't affect logic tests.                                                                                                                           |
| Bundle size jump from new wheel SVG         | Wheel SVG is procedural (37 arcs generated at runtime) — adds < 5 kB. The bigger contributor will be the bet-position table; estimate ~30 kB. Flag in PR D if over budget.                           |
| Casino bet "basket" expectation             | Documented in ADR-0030 as deliberately excluded (it's American-wheel-only)                                                                                                                           |
| Wallet `settleRound` idempotency edge case  | Already covered by ADR-0028 + Phase 3 PR C testing; we just follow the pattern                                                                                                                       |

## 22. Open questions

None at spec time. All decisions locked during the brainstorming session
(see `.superpowers/brainstorm/70734-1779049938/` for visual companion
mockups + answer trail).

## 23. Out-of-band notes

- The visual companion server (`http://localhost:63774`) and its
  `.superpowers/brainstorm/70734-1779049938/content/` directory are
  ephemeral (gitignored). Mockups are not part of the deliverable.
- Phase 5 (Slots) will reuse this same shape: pure logic + machine + visual
  component + page + lobby flip. The `_shared` layer + this pattern
  graduate further with each phase — that's the deliberate compounding from
  Phase 2's investment in GameShell/useGameRound.

---

**Spec status:** Approved 2026-05-17. Proceed to writing-plans skill.
