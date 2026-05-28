# Phase 5 — Slots: design spec

**Date:** 2026-05-18
**Author:** Claude (collaborative session with Developer)
**Status:** Approved by user 2026-05-18 → implementation
**BUILD_GUIDE refs:** §8.3 (game rules), §3 (file layout), §12 row 5 (phase DoD)
**Tagged release this builds on:** `v0.5-roulette` (Phase 4)
**Target release tag:** `v0.6-slots`

---

## 1. Goal

Ship a fully-playable 3-reel, single-payline slot machine wired into the
existing GameShell: 5 symbols (Cherry / Lemon / Bell / BAR / Seven) with
weighted RNG-driven outcomes, the 6-combo paytable from BUILD_GUIDE §8.3,
sequential left-to-right reel stop with classic Vegas suspense gap, tiered
win celebration, and Lobby integration (cabinet flip stub → playable).

After this phase, **four** of the five games are playable end-to-end (Coin
Flip, Blackjack, Roulette, Slots) with only Baccarat remaining as a stub.

## 2. In scope / out of scope

**In scope**

- 3-reel, single horizontal payline
- 5 symbols with the locked weights below
- The exact 6-combo paytable from BUILD_GUIDE §8.3 (Seven 50× / Bar 20× /
  Bell 12× / Lemon 8× / Cherry 5× / 2×Cherry 2×)
- Single bet per spin (5–1000 chips, integer only)
- Sequential left → right reel stop with suspense gap (1.2s / 2.0s / 3.0s)
- Scrolling-symbols spin animation (classic look, motion blur)
- Tiered win celebration: small (pulse), medium (radial burst), jackpot
  (full-screen flash + coin particles)
- Always-visible paytable panel above the reels
- Reduced-motion fallback (snap to result, no animations)
- Lobby cabinet flip + router swap

**Out of scope (deferred)**

- Wild symbol (BUILD_GUIDE §8.3 says "Wild later" — Phase 8 polish)
- Multi-line / multi-coin betting
- Auto-spin (5/10/25 spins on a counter)
- Progressive jackpot
- Sound (entire app is silent until Phase 8)
- Per-symbol art polish (no animated cherry stem wobble, etc.)
- Bonus rounds, scatter symbols, free spins

## 3. Game rules (canonical reference)

### 3.1 Symbol set

Per BUILD_GUIDE §8.3, the five base symbols (lowest payout → highest):

| Symbol | Display style                            | Weight | Per-reel probability |
| ------ | ---------------------------------------- | ------ | -------------------- |
| Cherry | Red sphere with green stem (illustrated) | 4      | 4/15 = 26.67%        |
| Lemon  | Yellow oval (illustrated)                | 5      | 5/15 = 33.33%        |
| Bell   | Gold bell with subtle neon glow          | 3      | 3/15 = 20.00%        |
| BAR    | Dark plate with gold neon border         | 2      | 2/15 = 13.33%        |
| Seven  | Bold magenta-neon serif "7"              | 1      | 1/15 = 6.67%         |

**Total weight per reel: 15.** Each reel draws independently via
`rng.randomInt(0, 14)` mapped through a cumulative weight table — no
`Math.random` anywhere (CLAUDE.md hard rule).

The visual rarity hierarchy reinforces the paytable: rarer symbols are
visually more "premium" (neon glow). The magenta-neon Seven becomes the
obvious "jackpot symbol."

### 3.2 Paytable (BUILD_GUIDE §8.3)

Payout is a multiple of the bet. Gross return = `bet × multiple`. Losing
spins return 0.

| Combination on payline                        | Multiple | Probability (3-reel)                     | Contribution to RTP |
| --------------------------------------------- | -------- | ---------------------------------------- | ------------------- |
| Seven – Seven – Seven                         | 50       | (1/15)³ = 1/3375 ≈ 0.0296%               | 50/3375 ≈ 0.0148    |
| Bar – Bar – Bar                               | 20       | (2/15)³ = 8/3375 ≈ 0.237%                | 160/3375 ≈ 0.0474   |
| Bell – Bell – Bell                            | 12       | (3/15)³ = 27/3375 ≈ 0.800%               | 324/3375 ≈ 0.0960   |
| Lemon – Lemon – Lemon                         | 8        | (5/15)³ = 125/3375 ≈ 3.70%               | 1000/3375 ≈ 0.296   |
| Cherry – Cherry – Cherry                      | 5        | (4/15)³ = 64/3375 ≈ 1.90%                | 320/3375 ≈ 0.0948   |
| **Exactly** 2 Cherries (any 2 of 3 positions) | 2        | 3 × (4/15)² × (11/15) = 528/3375 ≈ 15.6% | 1056/3375 ≈ 0.313   |

**Total RTP** ≈ 86.2%. **Any-win rate** ≈ 22.3%.

**The 2-cherry rule.** "Any 2 of 3 positions" means _exactly_ 2 cherries.
The 3-cherry case is excluded (it's handled by the higher 5× payout).
Combinatorially: 3 positions to choose 2 cherries × (4/15)² × (11/15 for
the non-cherry slot) = 528/3375.

**Order of evaluation.** Each spin checks for a 3-of-a-kind match first
(highest payout symbol wins if multiple somehow match — impossible with
distinct symbols, defensive only); then for exactly-2-cherries; otherwise
no payout. A spin can produce only ONE payout per round.

### 3.3 Bet limits + bet model

- **Min bet**: 5 chips (matches Blackjack / Roulette per ADR-0025)
- **Max bet**: 1000 chips
- **Integer chips only** (CLAUDE.md hard rule)
- **One bet per spin.** The wallet model is the **simple single-handle
  pattern** from Coin Flip — NOT the multi-handle aggregating pattern from
  Blackjack / Roulette. Page calls `useGameRound.placeBet` once at SPIN
  time and `useGameRound.settle` once at settled state.

## 4. Architecture

### 4.1 File structure

```
src/games/slots/
├── types.ts                    # Symbol, SpinResult, WinTier, SlotsRoundDetails
├── config.ts                   # SLOTS_CONFIG (limits, weights, paytable, timings)
├── symbols.ts                  # Symbol metadata + weighted-pick helper
├── logic.ts                    # spin(), settleSpin(), winTierOf(), buildRoundResult()
├── machine.ts                  # XState v5 round machine (3 states)
├── Symbol.tsx                  # One symbol cell (Cherry / Lemon / Bell / Bar / Seven)
├── ReelView.tsx                # One reel — scrolling animation, stop timing
├── Paytable.tsx                # The 6-combo paytable display
├── SlotsPage.tsx               # Wires GameShell + 3 reels + paytable + win tier
├── symbols.test.ts
├── logic.test.ts
├── machine.test.ts
├── Symbol.test.tsx
├── ReelView.test.tsx
├── Paytable.test.tsx
└── SlotsPage.test.tsx
```

**Reused from earlier phases (NO modifications needed):**

- `src/systems/rng.ts` — `randomInt(0, 14)` for symbol picks
- `src/systems/wallet.ts` — `placeBet` + `settleRound`
- `src/games/_shared/GameShell.tsx` — page-level chrome
- `src/games/_shared/BettingPanel.tsx` — chip-stacking bet input (same as Blackjack)
- `src/games/_shared/RecentResults.tsx` — last-N rounds sidebar
- `src/games/_shared/useGameRound.ts` — bet/settle hook (single-handle pattern)
- `src/systems/hooks/useRecentRounds.ts` — Dexie-backed recent rounds

**Files this phase touches outside `src/games/slots/`:**

- `src/router.tsx` — swap `<StubGamePage game="slots" phase={5} />` for `<SlotsPage />`
- `src/pages/lobby/CabinetCarousel.tsx` — flip Slots cabinet stub → playable
- `vitest.config.ts` — add `src/games/slots/**/*.ts` to coverage thresholds (≥90%)
- `docs/adr/0032-slots-symbol-weights-and-rtp.md`
- `docs/adr/0033-slots-tiered-win-celebration.md`

**File naming.** `ReelView.tsx` rather than `Reel.tsx` to dodge the
macOS case-insensitive filesystem collision (per the `HandView` /
`WheelView` precedent established in Phases 3 and 4). The data sibling is
`symbols.ts` (not `reel.ts`), so there's no actual collision risk on
`Reel.tsx` today — but using `ReelView.tsx` keeps the naming convention
consistent and forward-safe.

### 4.2 Layering

```
┌───────────────────────────────────────────────────────────┐
│ SlotsPage (React, in src/games/slots/)                    │
│  ├─ GameShell                       (Phase 2 shared)      │
│  ├─ Paytable                        (Phase 5)             │
│  ├─ 3 × ReelView                    (Phase 5)             │
│  ├─ BettingPanel + useGameRound     (Phase 2 shared)      │
│  └─ WinCelebration overlay          (Phase 5, inline)     │
└─────────────────────┬─────────────────────────────────────┘
                      │ events
                      ▼
┌───────────────────────────────────────────────────────────┐
│ slotsMachine (XState v5)                                  │
│  states: betting → spinning → settled → betting           │
└─────────────────────┬─────────────────────────────────────┘
                      │ pure
                      ▼
┌───────────────────────────────────────────────────────────┐
│ logic.ts / symbols.ts (pure, no I/O, no React)            │
│  weighted pick / paytable evaluation / win-tier mapping   │
└─────────────────────┬─────────────────────────────────────┘
                      │ randomInt(0, 14)
                      ▼
                  rng.ts (Phase 2 system)
```

CLAUDE.md hard rule 4 holds: `src/games/slots/**` (except `SlotsPage.tsx`)
does not import from `src/db/**` or `src/store/**`. ESLint enforces.

## 5. Types (inline draft — `types.ts`)

```ts
/** The 5 base symbols, in payout-ascending order. */
export type Symbol = 'cherry' | 'lemon' | 'bell' | 'bar' | 'seven';

/** Where the colour-glow visual rendering kicks in. */
export const NEON_SYMBOLS: ReadonlySet<Symbol> = new Set(['bell', 'bar', 'seven']);

export interface SpinResult {
  /** Final symbol on each reel, left to right. Length always 3. */
  readonly reels: readonly [Symbol, Symbol, Symbol];
}

/** Which payout fired, if any. `null` when the spin loses. */
export interface PayoutHit {
  readonly key:
    | 'seven-seven-seven'
    | 'bar-bar-bar'
    | 'bell-bell-bell'
    | 'lemon-lemon-lemon'
    | 'cherry-cherry-cherry'
    | 'two-cherry';
  /** Payout multiple — applied to bet to get the gross return. */
  readonly multiple: 50 | 20 | 12 | 8 | 5 | 2;
  /** Which reel indices form the winning line. For 2-cherry, the two
   *  cherry positions; for any 3-of-kind, all three. Used by the page to
   *  highlight the winning cells. */
  readonly winningReelIndices: readonly number[];
}

/** Win celebration tier driven off PayoutHit.multiple. */
export type WinTier = 'none' | 'small' | 'medium' | 'jackpot';

export interface SlotsRoundDetails {
  readonly spin: SpinResult;
  /** Null on a losing spin. */
  readonly payout: PayoutHit | null;
  readonly bet: number;
  readonly winTier: WinTier;
  /** Snapshot of the rules in effect at the time of the round, for
   *  traceability. Tiny — just weights total and bet limits. */
  readonly config: {
    readonly weights: Record<Symbol, number>;
    readonly minBet: number;
    readonly maxBet: number;
  };
}
```

## 6. Config (`config.ts`)

```ts
import type { Symbol } from './types';

/** Symbol weights — the rarer the symbol, the higher the payout.
 *  Tuned for ~86% RTP, ~22% any-win rate. ADR-0032.
 *  Easy to tune: change these numbers, rerun tests, ship. */
export const SLOTS_WEIGHTS: Readonly<Record<Symbol, number>> = {
  cherry: 4,
  lemon: 5,
  bell: 3,
  bar: 2,
  seven: 1,
};

/** Sum of weights — used as the upper bound for the per-reel RNG draw. */
export const SLOTS_WEIGHT_TOTAL = 15; // sum of SLOTS_WEIGHTS values

/** Paytable — BUILD_GUIDE §8.3.
 *  Keyed by payout key (matches PayoutHit['key']). */
export const SLOTS_PAYTABLE = {
  'seven-seven-seven': 50,
  'bar-bar-bar': 20,
  'bell-bell-bell': 12,
  'lemon-lemon-lemon': 8,
  'cherry-cherry-cherry': 5,
  'two-cherry': 2,
} as const;

export const SLOTS_CONFIG = {
  MIN_BET: 5,
  MAX_BET: 1_000,
  REEL_COUNT: 3 as const,
  /** Reel stop timings in ms, left → right. ADR-0033 (incl. suspense gap). */
  REEL_STOP_TIMES_MS: [1_200, 2_000, 3_000] as const,
  /** Cells visible per reel — top, centre (payline), bottom. */
  REEL_VISIBLE_CELLS: 3 as const,
  /** Small-win celebration duration (ms). */
  CELEBRATION_SMALL_MS: 600,
  /** Medium-win celebration duration (ms). */
  CELEBRATION_MEDIUM_MS: 800,
  /** Jackpot celebration duration (ms). */
  CELEBRATION_JACKPOT_MS: 1_500,
  /** Win-tier thresholds (payout multiple). */
  WIN_TIER_THRESHOLDS: {
    SMALL_MAX: 2, // multiple ≤ this is `small`
    MEDIUM_MAX: 20, // multiple ≤ this (and > SMALL_MAX) is `medium`; > this is `jackpot`
  },
} as const;

export type SlotsConfig = typeof SLOTS_CONFIG;
```

## 7. Symbol data + weighted pick (`symbols.ts`)

```ts
import { randomInt } from '@/systems/rng';
import { SLOTS_WEIGHTS, SLOTS_WEIGHT_TOTAL } from './config';
import type { Symbol } from './types';

/** Cumulative-weight table — built once at module load.
 *  e.g. for weights {cherry:4, lemon:5, bell:3, bar:2, seven:1}:
 *    [{symbol:'cherry', cum:4}, {symbol:'lemon', cum:9},
 *     {symbol:'bell', cum:12}, {symbol:'bar', cum:14}, {symbol:'seven', cum:15}]
 */
const CUM_TABLE: ReadonlyArray<{ symbol: Symbol; cum: number }> = (() => {
  const order: Symbol[] = ['cherry', 'lemon', 'bell', 'bar', 'seven'];
  let running = 0;
  return order.map((s) => {
    running += SLOTS_WEIGHTS[s];
    return { symbol: s, cum: running };
  });
})();

/** Pick one symbol per reel via weighted RNG. The draw is in [0, TOTAL).
 *  Wherever `n` lands in CUM_TABLE, the matching symbol wins. */
export function pickSymbol(): Symbol {
  const n = randomInt(0, SLOTS_WEIGHT_TOTAL - 1);
  for (const entry of CUM_TABLE) {
    if (n < entry.cum) return entry.symbol;
  }
  // Defensive — unreachable if weights sum correctly.
  throw new Error(`pickSymbol: RNG returned ${n} but no symbol matched`);
}

/** Symbol display metadata (consumed by Symbol.tsx). */
export interface SymbolDisplay {
  readonly label: string;
  readonly; /** Lowercase to match Symbol type; used for data-symbol attrs. */
  key: Symbol;
  readonly neon: boolean;
}
export const SYMBOL_DISPLAY: Readonly<Record<Symbol, SymbolDisplay>> = {
  cherry: { label: 'Cherry', key: 'cherry', neon: false },
  lemon: { label: 'Lemon', key: 'lemon', neon: false },
  bell: { label: 'Bell', key: 'bell', neon: true },
  bar: { label: 'BAR', key: 'bar', neon: true },
  seven: { label: '7', key: 'seven', neon: true },
};
```

## 8. Logic API (`logic.ts`)

```ts
import { pickSymbol } from './symbols';
import { SLOTS_CONFIG, SLOTS_PAYTABLE, SLOTS_WEIGHTS } from './config';
import type { PayoutHit, SlotsRoundDetails, SpinResult, Symbol, WinTier } from './types';

/** Spin all 3 reels independently. Pure modulo `rng`. */
export function spin(): SpinResult {
  return { reels: [pickSymbol(), pickSymbol(), pickSymbol()] };
}

/** Map a payout multiple to its tier (drives the win celebration). */
export function winTierOf(multiple: number | null): WinTier {
  if (multiple === null) return 'none';
  if (multiple <= SLOTS_CONFIG.WIN_TIER_THRESHOLDS.SMALL_MAX) return 'small';
  if (multiple <= SLOTS_CONFIG.WIN_TIER_THRESHOLDS.MEDIUM_MAX) return 'medium';
  return 'jackpot';
}

/** Examine a spin and return the winning combo (or null). Order of checks:
 *  3-of-a-kind first (highest payout via paytable); then exactly-2-cherry. */
export function settleSpin(spinResult: SpinResult): PayoutHit | null {
  const [a, b, c] = spinResult.reels;

  if (a === b && b === c) {
    const key = `${a}-${b}-${c}` as PayoutHit['key'];
    const multiple = SLOTS_PAYTABLE[key];
    return {
      key,
      multiple,
      winningReelIndices: [0, 1, 2],
    };
  }

  // Exactly-2-cherry (any 2 of 3 positions, excluding 3-of-a-kind handled above).
  const cherryPositions = spinResult.reels
    .map((s, i) => (s === 'cherry' ? i : -1))
    .filter((i) => i >= 0);
  if (cherryPositions.length === 2) {
    return {
      key: 'two-cherry',
      multiple: SLOTS_PAYTABLE['two-cherry'],
      winningReelIndices: cherryPositions,
    };
  }

  return null;
}

/** Aggregate to the shape the wallet expects. */
export function buildRoundResult(input: { spin: SpinResult; bet: number }): {
  outcome: 'win' | 'loss' | 'push';
  betAmount: number;
  payout: number;
  netChange: number;
  details: SlotsRoundDetails;
} {
  const hit = settleSpin(input.spin);
  const grossReturn = hit ? input.bet * hit.multiple : 0;
  const netChange = grossReturn - input.bet;
  // Note: slots can never push (payout = bet exactly is impossible — multiples are 0/2/5/8/12/20/50).
  // The 'push' branch exists for type compatibility with RoundResult.outcome.
  const outcome: 'win' | 'loss' | 'push' = netChange > 0 ? 'win' : netChange < 0 ? 'loss' : 'push';

  return {
    outcome,
    betAmount: input.bet,
    payout: grossReturn,
    netChange,
    details: {
      spin: input.spin,
      payout: hit,
      bet: input.bet,
      winTier: winTierOf(hit?.multiple ?? null),
      config: {
        weights: SLOTS_WEIGHTS,
        minBet: SLOTS_CONFIG.MIN_BET,
        maxBet: SLOTS_CONFIG.MAX_BET,
      },
    },
  };
}
```

**Coverage requirements** (per CLAUDE.md ≥ 90% on `src/games/slots/**`):

- `spin()` returns a SpinResult under fixed seed
- `pickSymbol()` produces every symbol with correct frequency over N draws
- `settleSpin()` for every 3-of-a-kind combination → correct PayoutHit
- `settleSpin()` for 2-cherry (each of 3 position pairs) → correct PayoutHit
- `settleSpin()` for all-different / 1-cherry-only / 3-cherry → returns null
  or 3-of-a-kind (NOT 2-cherry)
- `winTierOf()` boundary tests (1 / 2 / 3 / 12 / 20 / 21 / 50)
- `buildRoundResult` for win/loss + correct netChange + correct details shape

## 9. Round machine (`machine.ts`)

```
┌─────────┐  PLACE_BET → store bet & handle in context     ┌──────────┐
│ betting │  SPIN (guard: hasBet) ────────────────────────►│ spinning │
└─────────┘                                                 └────┬─────┘
     ▲                                                            │
     │ NEW_ROUND                                                  │ (entry: setSpinResult — fires logic.spin()
     │                                                            │  immediately so the result exists before
     │                                                            │  the visual animation completes)
     │                                                            │
     │                                                            │ (after REEL_STOP_TIMES_MS[2] = 3000ms:
     │                                                            │   setRoundResult → state.context.roundResult)
     │                                                            ▼
     │                                                       ┌──────────┐
     └──── NEW_ROUND ────────────────────────────────────────│ settled  │
                                                              └──────────┘
```

Context:

```ts
interface Context {
  bet: number; // 0 when idle
  betHandleId: string; // '' when idle
  spinResult: SpinResult | null; // set on entering spinning
  roundResult: ReturnType<typeof buildRoundResult> | null; // set on settled
  totalSpinDurationMs: number; // 3000 default; 0 when reduced-motion
}
```

Events:

```ts
type Event =
  | { type: 'PLACE_BET'; bet: number; betHandleId: string }
  | { type: 'SPIN' } // gated by `hasBet`
  | { type: 'NEW_ROUND' };
```

Guards:

- `hasBet` — `context.bet >= SLOTS_CONFIG.MIN_BET`

Actions:

- `applyBet` — assign `bet` + `betHandleId` from event
- `setSpinResult` — assign `spinResult = spin()` on entering `spinning`
- `setRoundResult` — assign `roundResult = buildRoundResult({ spin, bet })`
  after the `after` delay
- `clearForNextRound` — reset `bet`, `betHandleId`, `spinResult`, `roundResult`

Delays (XState v5 `delays:` block):

- `totalSpin` — `({ context }) => context.totalSpinDurationMs` — drives
  the `spinning → settled` transition.

The page reads `state.matches('spinning')` to start each reel's individual
animation (the page passes reel-stop times to each `<ReelView />`). The
machine only knows about the TOTAL spin duration (longest reel time).

**Reduced motion.** The page passes `totalSpinDurationMs: 0` to the machine
input when `useReducedMotion()` returns true. The machine settles
immediately and the page renders all three reels at their final symbols
with no scrolling animation.

**Coverage requirements** (`machine.test.ts`):

- Initial state is `betting` with bet=0
- PLACE_BET stores bet + handle
- SPIN is rejected when bet < MIN_BET
- SPIN transitions to spinning + sets spinResult
- After totalSpin delay → settled + roundResult populated
- Reduced-motion (`totalSpinDurationMs: 0`) settles instantly
- NEW_ROUND → betting + all context fields cleared

## 10. Page (`SlotsPage.tsx`)

```tsx
<GameShell title="🎰 SLOTS" meta="3 reels · 5–1000" recentItems={recentItems}
  bettingPanel={
    <BettingPanel
      min={SLOTS_CONFIG.MIN_BET}
      max={SLOTS_CONFIG.MAX_BET}
      balance={balance}
      onCommit={(amount) => {
        if (state.matches('settled')) send({ type: 'NEW_ROUND' });
        handlePlaceAndSpin(amount);
      }}
      callButtons={() => <SpinButton />}
    />
  }
>
  <div className="slots-page">
    <Paytable />
    <ReelArea>
      <ReelView reelIndex={0} symbol={spinResult?.reels[0]} stopAtMs={REEL_STOP_TIMES_MS[0]} ... />
      <ReelView reelIndex={1} symbol={spinResult?.reels[1]} stopAtMs={REEL_STOP_TIMES_MS[1]} ... />
      <ReelView reelIndex={2} symbol={spinResult?.reels[2]} stopAtMs={REEL_STOP_TIMES_MS[2]} ... />
      <Payline winningReelIndices={roundResult?.details.payout?.winningReelIndices ?? []} />
    </ReelArea>
    <WinCelebration tier={roundResult?.details.winTier ?? 'none'} payout={roundResult?.payout ?? 0} />
  </div>
</GameShell>
```

**`handlePlaceAndSpin`** flow:

1. Call `useGameRound.placeBet(amount, { min: 5, max: 1000 })`.
2. On success: `send({ type: 'PLACE_BET', bet: amount, betHandleId: handle.betId })`,
   then immediately `send({ type: 'SPIN' })`.
3. On `insufficient_chips`: surface a small toast (reuse Phase 2 pattern).

**Settle bridge.** A `useEffect` watches `state.matches('settled')`:
when the machine reaches `settled` with `roundResult !== null`, the page
calls `useGameRound.settle(handle, roundResult)` exactly once, guarded by
a `settledRef` to prevent double-settle (mirrors the Blackjack /
Roulette pattern).

**Recent results sidebar.** Same as Roulette but adapted for slots:

```ts
const items: RecentResultItem[] = rounds.map((r) => {
  const d = r.details as SlotsRoundDetails;
  const tier = d.winTier;
  return {
    key: r.id,
    badgeText: d.spin.reels.map((s) => SYMBOL_DISPLAY[s].label[0]).join(''),
    badgeColor:
      tier === 'jackpot'
        ? '#ff5cf2'
        : tier === 'medium'
          ? '#d4af37'
          : tier === 'small'
            ? '#3dd17a'
            : '#7a1f2b',
    badgeTextColor: '#06120c',
    betLabel: String(r.betAmount),
    netChips: r.netChange,
    accent: r.outcome,
  };
});
```

## 11. Reel component (`ReelView.tsx`)

**Visual structure.** A 3-cell vertical strip (top / centre / bottom). The
centre cell is the payline. During spin, the strip scrolls vertically very
fast — implemented as a CSS-transformed tall strip of N symbols sliding
upward, ending positioned so the final symbol is centred.

**Animation contract.**

- Idle (no `symbol` prop): show 3 placeholder symbols (the initial idle
  state — pick a fixed deterministic set like `['cherry','lemon','cherry']`
  for visual stability).
- When `spinning=true` and `symbol` is set: the reel scrolls a long strip
  (~30 symbols, generated via repeated weighted picks) over `stopAtMs`,
  decelerating with `[0.16, 1, 0.3, 1]` easing (matches Wheel/Roulette
  animation easing), ending with the final symbol centred.
- When `spinning=false` and `symbol` is set: the reel is static with
  the final symbol centred.
- Reduced motion (`stopAtMs = 0` or `reducedMotion=true`): snap straight to
  final symbol, no scroll.

**Props.**

```ts
export interface ReelProps {
  reelIndex: 0 | 1 | 2;
  spinning: boolean;
  symbol: Symbol | null; // null while idle / before SPIN clicked
  stopAtMs: number; // when this reel should stop (drives its animation length)
  reducedMotion?: boolean;
  winning?: boolean; // true if this reel index is in winningReelIndices
}
```

**Geometry.** Each cell ~64×64 px. Strip width = 64 px. Strip height =
64 × 3 = 192 px container (clipped via `overflow: hidden`).

**Implementation note.** Use Framer Motion `motion.div` for the inner
strip; animate `y` from a large negative value to the final offset. The
final offset is computed so the chosen `symbol` lands in the centre cell.

The strip's symbols above and below the chosen one can be generated via
extra `pickSymbol()` calls (purely cosmetic — RNG decides only the final
one). Document this in the component: "Filler symbols are deterministic
per render from the seeded RNG; they are NOT recorded anywhere and don't
affect the wallet."

**Coverage** (`ReelView.test.tsx`):

- Renders the centre cell with the right symbol when not spinning
- Centre cell `data-symbol` matches the `symbol` prop
- When `winning=true`, the centre cell gets `data-winning="true"` (drives
  payline glow)
- Reduced motion: the inner strip has `data-transition-duration="0"`
- Static-state snapshot: 3 cells visible

## 12. Symbol component (`Symbol.tsx`)

Renders one symbol in one of the 5 visual styles. Hybrid art direction:

- **Cherry** — classic: red radial-gradient sphere with green stem (CSS).
  No neon.
- **Lemon** — classic: yellow ellipse with darker yellow stem nubs. No neon.
- **Bell** — neon: gold bell shape (CSS clip-path or radial gradient) with
  subtle outer gold glow (`box-shadow: 0 0 12px rgba(212,175,55,0.7)`).
- **BAR** — neon: dark plate with gold border and "BAR" text. Outer glow.
- **Seven** — neon: bold serif "7" in magenta (`#ff5cf2`) with strong
  outer glow (`text-shadow: 0 0 8/16/24px`).

**Props.**

```ts
export interface SymbolProps {
  symbol: Symbol;
  size?: number; // default 64
  winning?: boolean; // adds a pulse + brighter glow when true
}
```

The `data-symbol` attribute is always set for test selectors. When
`winning=true`, `data-winning="true"` is added and the visual gets a
~10% brightness boost + colour-matched pulse animation (CSS keyframes,
respects `prefers-reduced-motion`).

**Coverage** (`Symbol.test.tsx`):

- Renders for each of the 5 symbols
- `data-symbol` attribute matches
- Neon symbols (Bell / BAR / Seven) have `data-neon="true"`
- `winning=true` adds `data-winning="true"`

## 13. Paytable component (`Paytable.tsx`)

Always-visible small panel ABOVE the reels showing the 6 combos in
payout-descending order:

```
PAYOUT TABLE
─────────────
7 7 7   →  50× bet
B B B   →  20×
🔔🔔🔔  →  12×
🍋🍋🍋   →   8×
🍒🍒🍒   →   5×
🍒 🍒   →   2×
```

(The icons are rendered via `<Symbol size={20} />` not actual emoji.)

**Layout.** 6 rows × 3 columns (icons / arrow / multiple text). Width
matches the reel area. Background `#0b1f17` (felt-deep), border
`#d4af37/30%` (gold/30).

When the round settles with a win, the winning row briefly highlights
(gold background flash, 600ms, matches reduced-motion). This connects
the visual outcome to the table without forcing the player to read the
result banner.

**Coverage** (`Paytable.test.tsx`):

- Renders all 6 rows
- Each row has `data-payout-key` matching one of the PayoutHit keys
- Each row's multiple text matches `SLOTS_PAYTABLE[key]`
- When `winningKey` prop is set, that row has `data-winning="true"`

## 14. Win celebration tiers

Driven by `winTierOf(payout.multiple)`. Inline component inside
`SlotsPage.tsx` (not its own file — tightly coupled to the page's
settle effect).

### Tier 1 — small (multiple ≤ 2, i.e. 2-cherry only)

- Duration: 600ms.
- Payline cells (the centre cell of each reel that's in
  `winningReelIndices`) get a gold pulse (CSS `box-shadow` keyframes).
- Result banner slides in from the top: `🍒🍒 — You won $X`.
- Chip dribble micro-animation on the balance (reuse Phase 2 pattern).

### Tier 2 — medium (multiple 5 / 8 / 12 / 20 — all 3-of-a-kind except Seven)

- Duration: 800ms.
- Payline gets a golden RADIAL burst (CSS radial-gradient overlay that
  fades 0 → 0.4 → 0 opacity over the duration).
- Result banner with payout multiple highlighted: `BAR BAR BAR — You won $X`.
- Chip dribble.

### Tier 3 — jackpot (multiple 50, i.e. 3×Seven)

- Duration: 1500ms.
- Full-screen magenta tint overlay (low opacity ~10%, 200ms fade in/out).
- 12 coin-shower particles falling from the top edge of the reels area
  (each a small gold circle with `motion.div`, animated `y: -20 → 200` +
  `opacity: 0 → 1 → 0` over 1500ms, staggered start).
- Payline gets a sustained magenta glow.
- Result banner with magenta neon styling: `JACKPOT! $X`.
- Chip dribble + a slightly louder balance pulse.

**Reduced motion.** All celebrations collapse to a simple banner with the
result + chip dribble. No pulses, no bursts, no particles.

## 15. Reduced motion summary

When `useReducedMotion()` returns true (the page reads once at mount, passes
down):

- Machine: `totalSpinDurationMs: 0` → machine settles immediately
- All 3 reels: `stopAtMs: 0` → snap to final symbols, no scroll animation
- Paytable: winning-row flash skipped
- Win celebration: collapses to banner + chip dribble (no pulses /
  bursts / particles)
- Result banner: snaps in, no slide

## 16. ADRs (in PR A)

### ADR-0032 — Slots symbol weights + RTP target

- **Decision:** Cherry:4 / Lemon:5 / Bell:3 / Bar:2 / Seven:1 per reel
  (total 15). Yields ~86.2% RTP and ~22.3% any-win rate.
- **Rationale:** BUILD_GUIDE §8.3 says "tune RTP so the return-to-player
  feels fun but not infinite." 86% strikes the balance — feels like a
  real casino slot without being grindingly punishing. Easy to tune via
  `config.ts` if it feels off in playtest.
- **Consequences:** documented hit frequencies in §3.2 inform manual
  smoke testing. Logic tests pin the weights numerically; changing them
  intentionally requires updating both `config.ts` and the
  weighted-pick tests.

### ADR-0033 — Slots tiered win celebration

- **Decision:** three tiers — small (multiple ≤ 2), medium (≤ 20),
  jackpot (> 20). Each tier has a distinct visual; all collapse to the
  base banner under reduced motion.
- **Rationale:** Uniform celebration becomes noise (2-cherry hits ~1 in 8
  spins). Tiering earns the dramatic moments — the magenta-neon Seven
  is the only thing that triggers the jackpot celebration, which makes
  hitting it feel singular.
- **Consequences:** the celebration code lives in `SlotsPage.tsx` (not
  its own file) because it's tightly coupled to the page's settle
  effect. If future games want similar tiering, it can be promoted to a
  shared `_shared/WinTiers.tsx` then.

## 17. Testing strategy

Targets and tools (per CLAUDE.md):

- **Unit (Vitest + jsdom):** `symbols.test.ts`, `logic.test.ts`,
  `machine.test.ts`. Coverage gate ≥ 90% on `src/games/slots/**/*.ts`.
- **Component (RTL):** `Symbol.test.tsx`, `ReelView.test.tsx`,
  `Paytable.test.tsx`, `SlotsPage.test.tsx`.
- **Integration (`SlotsPage.test.tsx`):** drives the full flow with the
  real machine + mocked `walletStore` + seeded RNG. Place a bet, spin,
  advance fake timers past the spin duration, assert correct settle,
  correct row in `db.rounds`, correct win-tier rendering.
- **Coverage check:** `pnpm exec vitest run --coverage`. New thresholds in
  `vitest.config.ts`.

**Edge cases worth explicit tests:**

- Spin produces 3 different symbols → no payout, `outcome: 'loss'`
- Spin produces 1 cherry only → no payout (NOT a 1-cherry payout)
- Spin produces 2 cherries in positions (0, 1) → 2-cherry payout, indices [0, 1]
- Spin produces 2 cherries in positions (0, 2) → 2-cherry payout, indices [0, 2]
- Spin produces 3 cherries → 3-cherry 5× payout (NOT 2-cherry 2×)
- Spin produces 3 sevens → jackpot tier, 50× payout
- Insufficient chips on SPIN → wallet placeBet fails → spin doesn't start
- Reduced motion: machine settles instantly + reels render final symbols statically

## 18. PR sequencing (4 PRs)

**Subagent-driven development**, fresh subagent per task, two-stage review.

### PR A — Logic + machine + ADRs

**Branch:** `phase-5-slots-pr-a-logic`
**Scope:** `types.ts`, `config.ts`, `symbols.ts`, `logic.ts`, `machine.ts`
plus tests; ADRs 0032 + 0033; `vitest.config.ts` coverage update.
**Coverage:** ≥ 90% on `src/games/slots/*.ts`.
**Risk:** lowest — no UI, all pure logic.

### PR B — Symbol + ReelView

**Branch:** `phase-5-slots-pr-b-symbol-reel`
**Scope:** `Symbol.tsx` (all 5 styles, neon-aware), `ReelView.tsx`
(scrolling animation, reduced-motion path), plus tests.
**Risk:** medium — CSS art for 5 symbols + Framer Motion scroll animation.

### PR C — Paytable + SlotsPage + celebration

**Branch:** `phase-5-slots-pr-c-page`
**Scope:** `Paytable.tsx`, `SlotsPage.tsx` (full wiring: machine + reels +
paytable + win-celebration tiers + recent-results sidebar), plus tests.
**Risk:** integration — wallet bridges + 3 reel synchronization + celebration tiers.

### PR D — Lobby + router + release

**Branch:** `phase-5-slots-pr-d-release`
**Scope:** update `src/router.tsx` (swap `StubGamePage` → `SlotsPage`),
update `src/pages/lobby/CabinetCarousel.tsx` (flip Slots cabinet
stub → playable), empty release commit, tag `v0.6-slots`, GitHub Release.
**Risk:** very low — plumbing only.

## 19. Definition of Done (Phase 5)

Per BUILD_GUIDE §12 row 5 and CLAUDE.md hard rule 8:

- [ ] All 4 PRs merged to main
- [ ] `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build`
      green locally on main after PR D
- [ ] CI: all 4 jobs green on main
- [ ] Bundle still under reasonable size (≤ 800 kB JS total; current is
      681 kB → expected ~720-750 kB after slots)
- [ ] Manual smoke: log in → lobby → click Slots cabinet → place a bet →
      spin → observe sequential reel stops with suspense gap → observe
      correct win celebration tier matching the result
- [ ] Manual smoke at each tier: trigger a 2-cherry, a 3-of-kind, and
      (via temporary `seed()` in dev console, NOT committed) a 3-Seven
- [ ] `prefers-reduced-motion: reduce` manual smoke: spin settles
      instantly, no animations, wallet flow still correct

## 20. Risks and mitigations

| Risk                                                                                | Mitigation                                                                                                               |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| RTP feels wrong in playtest (too generous / too tight)                              | Weights live in `config.ts`. Adjust → rerun the 3 weighted-pick frequency tests → done. ADR-0032 documents the formula.  |
| Reel-scroll animation jitter on slow devices                                        | Single Framer Motion `motion.div` per reel with one `y` transition; no per-frame JS. Reduced-motion path skips entirely. |
| Jackpot celebration too long → blocks next spin                                     | Buttons stay disabled until celebration completes (1.5s for jackpot). Player can still see banner and balance update.    |
| Coin-shower particles cost too much CPU                                             | Only 12 particles, only rendered on jackpot. Negligible.                                                                 |
| Win-celebration code grows large in `SlotsPage.tsx`                                 | Document at top of file. If it exceeds ~150 lines, promote to `WinCelebration.tsx` in Phase 8 polish.                    |
| Multi-symbol payout collision (e.g. seven-seven-cherry would match 2-cherry today?) | Tests cover this — 2-cherry only fires when cherry count is EXACTLY 2. seven-seven-cherry returns null.                  |

## 21. Open questions

None at spec time. All decisions locked during brainstorming
(see `.superpowers/brainstorm/94358-1779107240/` for visual companion
mockups + answer trail).

---

**Spec status:** Approved 2026-05-18. Proceed to writing-plans skill.
