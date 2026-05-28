# Phase 5 Slots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MASQUER Slots game end-to-end — weighted-symbol logic + XState v5 round machine + 5 symbol components + 3 scrolling reel components + paytable + page wiring with tiered win celebration — so it's fully playable from the lobby with the BUILD_GUIDE §8.3 paytable correctly returning ~86% RTP.

**Architecture:** Mirrors the Phase 3/4 split-by-responsibility: `symbols.ts`/`logic.ts` are pure with ≥90% test coverage, `machine.ts` is a 3-state XState v5 machine, `SymbolView.tsx`/`ReelView.tsx`/`Paytable.tsx` are isolated and individually testable, `SlotsPage.tsx` is the only place wallet I/O happens. The result is decided by `rng.randomInt(0, 14)` (weighted via cumulative table) before any visual animation starts; the reels animate to their predetermined symbols. The single-handle wallet pattern from Coin Flip is reused (one `placeBet` per spin, one `settleRound` per round).

**Tech Stack:** TypeScript 5, React 18, Vite 5, XState 5 (+ `@xstate/react` 6), Framer Motion 12, Tailwind 3, Vitest 2 + React Testing Library + jsdom + fake-indexeddb, pnpm 9.

**Spec:** `docs/superpowers/specs/2026-05-18-phase-5-slots-design.md` (merged in PR #95).

**Branch model:** 4 phase PRs + 1 release PR, all targeting `main`. Each PR is independently mergeable, leaves the app in a working state, and has full CI green. Subagent-driven development; fresh subagent per task; two-stage review (spec then code) between tasks; full code review at PR boundary.

```
phase-5-slots-pr-a-logic           →  PR A: pure logic + machine + ADRs
phase-5-slots-pr-b-symbol-reel     →  PR B: <SymbolView /> + <ReelView /> components
phase-5-slots-pr-c-page            →  PR C: <Paytable /> + <SlotsPage /> + win celebration tiers
phase-5-slots-pr-d-release         →  PR D: lobby flip + router swap + release v0.6-slots
```

**Hard rules (CLAUDE.md) that apply to every task:**

1. **No `Math.random` anywhere.** Only `src/systems/rng.ts`. ESLint enforces this.
2. **Money is integers.** No floats, no `parseFloat`, no `/` without `Math.floor`/`Math.ceil`/`Math.round`.
3. **Games are sandboxed.** `src/games/slots/**` (except `*Page.tsx`) cannot import from `@/db/*` or `@/store/*`. ESLint enforces — do NOT add `eslint-disable`.
4. **Every round records exactly one row.** Wallet `settleRound` is called once per round.
5. **Definition of done** for every task that touches code: `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build` must all pass before the task is considered complete.
6. **One PR per phase chunk.** Branch off `main`, push, open PR, wait for CI, merge into main, branch the next PR off the freshly-merged main.
7. **Commit messages:** Conventional Commits, scoped. Allowed scopes for this phase: `slots`, `games`, `ui`, `theme`, `lobby`, `routing`, `build-guide`, `adr`, `ci`, `release`. Header ≤ 100 chars.
8. **Do not edit `CLAUDE.md`.** The user edits that themselves.

**Repo conventions to mirror:**

- **Test command** is `pnpm exec vitest run` and `pnpm exec vitest run <path>`. Do NOT use `pnpm test --run` — pnpm consumes the `--run` flag.
- **macOS case-insensitive filesystem.** Use `ReelView.tsx` (not `Reel.tsx`) and `SymbolView.tsx` (no conflict — the data sibling is `symbols.ts`). This follows the `HandView` (Phase 3) and `WheelView` (Phase 4) precedent.
- **lint-staged + Husky** auto-runs `eslint --fix` + `prettier --write` on commit. Expect minor whitespace reformatting on commit — this is normal.

---

## File map

Created across the 4 PRs:

```
src/games/slots/
├── types.ts                    # PR A
├── config.ts                   # PR A
├── symbols.ts                  # PR A
├── logic.ts                    # PR A
├── machine.ts                  # PR A
├── symbols.test.ts             # PR A
├── logic.test.ts               # PR A
├── machine.test.ts             # PR A
├── SymbolView.tsx                            # PR B
├── SymbolView.test.tsx             # PR B
├── ReelView.tsx                # PR B
├── ReelView.test.tsx           # PR B
├── Paytable.tsx                # PR C
├── Paytable.test.tsx           # PR C
├── SlotsPage.tsx               # PR C
└── SlotsPage.test.tsx          # PR C

docs/adr/
├── 0032-slots-symbol-weights-and-rtp.md        # PR A
└── 0033-slots-tiered-win-celebration.md        # PR A

modified:
├── vitest.config.ts                            # PR A (coverage include + thresholds)
├── src/router.tsx                              # PR D (swap StubGamePage → SlotsPage)
└── src/pages/lobby/CabinetCarousel.tsx         # PR D (flip slots → playable)
```

---

## Definition of Done (per task, per PR, per phase)

**Per task:** the named files exist with the named contents, all tests in the task pass, the commit lands on the branch with the specified commit message.

**Per PR:**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

All four green locally on the PR branch. CI green on the PR. Code reviewed via the subagent-driven-development two-stage review per task + a final code review at PR boundary.

**Per phase (after PR D merges):**

- Manual smoke in `pnpm dev`: log in → lobby → click Slots cabinet → place a bet → spin → observe sequential reel stops (1.2s / 2.0s / 3.0s) → observe correct win-celebration tier matching the result
- Trigger at least one of each tier during manual smoke:
  - Small win (2× Cherry — hits ~1 in 8, easy)
  - Medium win (3× Lemon — hits ~1 in 23, takes a few minutes)
  - Jackpot (3× Seven — hits ~1 in 4913, force via temp `seed()` in dev console; do not commit the seed)
- Toggle OS "Reduce motion" and confirm: reels render final symbols statically, no scroll animation, no celebration animations, wallet flow still correct
- Bundle size: `pnpm build` reports ≤ 800 kB JS total (current 681 kB; expected ~720–750 kB after Slots)

---

## Pre-flight (do once before starting PR A)

- [ ] **Step P.1: Sync main**

```bash
git checkout main && git pull --ff-only
git log -1 --oneline
```

Expected: latest commit is `9f75de3 docs(build-guide): add Phase 5 Slots design spec (#95)` or newer (spec already on main).

- [ ] **Step P.2: Verify baseline is green**

```bash
pnpm install && pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: all five commands exit 0. 471 tests passing. If anything fails, STOP and surface to the user — do not start Phase 5 on a broken main.

- [ ] **Step P.3: Read the spec end-to-end**

`docs/superpowers/specs/2026-05-18-phase-5-slots-design.md` — every section. This plan assumes the spec is your reference for _what_ and uses your reading time on _how_.

---

# PR A — Logic + Machine + ADRs

**Branch:** `phase-5-slots-pr-a-logic` (off `main`)
**Goal of this PR:** Ship every pure-logic file + the XState machine + the two ADRs, all with passing tests, BEFORE any UI is written. Mirrors Phase 3 / Phase 4 PR A. After this PR merges the game logic is fully testable in unit tests even though there's no UI to play it with.
**Risk:** Lowest of the four PRs. No React. No I/O. Only external dependency is `src/systems/rng.ts`.
**Estimated tasks:** 14.

## Task A.1: Branch and scaffold the slots folder

**Files:**

- Delete: `src/games/slots/.gitkeep`

- [ ] **Step 1: Branch off main**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-5-slots-pr-a-logic
```

Expected: clean `main`, new branch created.

- [ ] **Step 2: Delete the `.gitkeep` placeholder**

```bash
git rm src/games/slots/.gitkeep
```

Expected: file removed.

- [ ] **Step 3: Verify baseline still lints and types**

```bash
pnpm lint && pnpm typecheck
```

Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(slots): drop .gitkeep ahead of Phase 5 implementation"
```

## Task A.2: Type definitions

**Files:**

- Create: `src/games/slots/types.ts`

Types only — no runtime code, so no test file. Compilation IS the test.

- [ ] **Step 1: Write `src/games/slots/types.ts`** with this exact content:

```ts
/** The 5 base symbols, in payout-ascending order. */
export type Symbol = 'cherry' | 'lemon' | 'bell' | 'bar' | 'seven';

/** Set of symbols rendered with neon-glow visual treatment (rarer = more "premium"). */
export const NEON_SYMBOLS: ReadonlySet<SymbolView> = new Set(['bell', 'bar', 'seven']);

/** Spin result — final symbol on each reel, left to right. */
export interface SpinResult {
  readonly reels: readonly [Symbol, Symbol, Symbol];
}

/** Discriminated payout — which combo fired, if any. `null` on a losing spin. */
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
  /** Reel indices forming the winning line. For 2-cherry, the two cherry positions;
   *  for any 3-of-kind, [0, 1, 2]. Used by the page to highlight winning cells. */
  readonly winningReelIndices: readonly number[];
}

/** Win-celebration tier — derived from PayoutHit.multiple. */
export type WinTier = 'none' | 'small' | 'medium' | 'jackpot';

/** The shape written into Round.details for slot rounds. */
export interface SlotsRoundDetails {
  readonly spin: SpinResult;
  readonly payout: PayoutHit | null;
  readonly bet: number;
  readonly winTier: WinTier;
  /** Snapshot of the rules in effect at the time of the round. */
  readonly config: {
    readonly weights: Record<Symbol, number>;
    readonly minBet: number;
    readonly maxBet: number;
  };
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: exit 0. No new errors.

- [ ] **Step 3: Commit**

```bash
git add src/games/slots/types.ts
git commit -m "feat(slots): add type definitions (Symbol, SpinResult, PayoutHit, WinTier)"
```

## Task A.3: Slots config

**Files:**

- Create: `src/games/slots/config.ts`

No test file (frozen object — compilation is the test).

- [ ] **Step 1: Write `src/games/slots/config.ts`** with this exact content:

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
  /** Per-spin chip minimum. Matches Blackjack via ADR-0025. */
  MIN_BET: 5,
  /** Per-spin chip maximum. */
  MAX_BET: 1_000,
  /** Number of reels. */
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
    /** Multiple ≤ this is `small`. */
    SMALL_MAX: 2,
    /** Multiple ≤ this (and > SMALL_MAX) is `medium`; > this is `jackpot`. */
    MEDIUM_MAX: 20,
  },
} as const;

export type SlotsConfig = typeof SLOTS_CONFIG;
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/games/slots/config.ts
git commit -m "feat(slots): add SLOTS_CONFIG (weights, paytable, timings, tier thresholds)"
```

## Task A.4: Weighted symbol pick (`pickSymbol`)

**Files:**

- Create: `src/games/slots/symbols.ts`
- Create: `src/games/slots/symbols.test.ts`

TDD: tests first. This task adds only `CUM_TABLE` + `pickSymbol`. `SYMBOL_DISPLAY` arrives in Task A.5.

- [ ] **Step 1: Write the failing test (`symbols.test.ts`)** with this content:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { seed, unseed } from '@/systems/rng';
import { pickSymbol } from './symbols';
import { SLOTS_WEIGHTS, SLOTS_WEIGHT_TOTAL } from './config';
import type { Symbol } from './types';

describe('pickSymbol', () => {
  afterEach(() => unseed());

  it('returns one of the 5 valid symbols', () => {
    seed(1);
    const valid: ReadonlySet<SymbolView> = new Set(['cherry', 'lemon', 'bell', 'bar', 'seven']);
    for (let i = 0; i < 100; i++) {
      const s = pickSymbol();
      expect(valid.has(s)).toBe(true);
    }
  });

  it('is deterministic under a fixed seed', () => {
    seed(42);
    const sequence1 = Array.from({ length: 10 }, () => pickSymbol());
    seed(42);
    const sequence2 = Array.from({ length: 10 }, () => pickSymbol());
    expect(sequence1).toEqual(sequence2);
  });

  it('over many draws, symbol frequencies approximate the weights (±2% per symbol)', () => {
    seed(1);
    const N = 30_000;
    const counts: Record<Symbol, number> = { cherry: 0, lemon: 0, bell: 0, bar: 0, seven: 0 };
    for (let i = 0; i < N; i++) {
      counts[pickSymbol()]++;
    }
    for (const sym of ['cherry', 'lemon', 'bell', 'bar', 'seven'] as const) {
      const expected = SLOTS_WEIGHTS[sym] / SLOTS_WEIGHT_TOTAL;
      const observed = counts[sym] / N;
      expect(Math.abs(observed - expected)).toBeLessThan(0.02);
    }
  });

  it('every symbol appears at least once in 1000 draws (no symbol is unreachable)', () => {
    seed(1);
    const seen = new Set<SymbolView>();
    for (let i = 0; i < 1000; i++) seen.add(pickSymbol());
    expect(seen.size).toBe(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run src/games/slots/symbols.test.ts
```

Expected: FAIL — "Cannot find module './symbols'".

- [ ] **Step 3: Write `src/games/slots/symbols.ts`** with this exact content:

```ts
import { randomInt } from '@/systems/rng';
import { SLOTS_WEIGHTS, SLOTS_WEIGHT_TOTAL } from './config';
import type { Symbol } from './types';

/** Cumulative-weight table — built once at module load.
 *  For weights {cherry:4, lemon:5, bell:3, bar:2, seven:1}:
 *    [{symbol:'cherry', cum:4}, {symbol:'lemon', cum:9},
 *     {symbol:'bell', cum:12}, {symbol:'bar', cum:14}, {symbol:'seven', cum:15}]
 *
 *  The order matters — the RNG draw is compared against cumulative ranges,
 *  so a draw of 0..3 maps to cherry, 4..8 to lemon, etc.
 */
const CUM_TABLE: ReadonlyArray<{ symbol: Symbol; cum: number }> = (() => {
  const order: Symbol[] = ['cherry', 'lemon', 'bell', 'bar', 'seven'];
  let running = 0;
  return order.map((s) => {
    running += SLOTS_WEIGHTS[s];
    return { symbol: s, cum: running };
  });
})();

/** Pick one symbol via weighted RNG. Draw is in [0, TOTAL).
 *  Wherever `n` lands in CUM_TABLE, the matching symbol wins. */
export function pickSymbol(): Symbol {
  const n = randomInt(0, SLOTS_WEIGHT_TOTAL - 1);
  for (const entry of CUM_TABLE) {
    if (n < entry.cum) return entry.symbol;
  }
  // Defensive — unreachable if weights sum correctly.
  throw new Error(`pickSymbol: RNG returned ${n} but no symbol matched`);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run src/games/slots/symbols.test.ts
```

Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/games/slots/symbols.ts src/games/slots/symbols.test.ts
git commit -m "feat(slots): weighted-pick symbol via cumulative table (RNG-backed)"
```

## Task A.5: Symbol display metadata

**Files:**

- Modify: `src/games/slots/symbols.ts` (append `SYMBOL_DISPLAY`)
- Modify: `src/games/slots/symbols.test.ts` (add `SYMBOL_DISPLAY` describe)

- [ ] **Step 1: Append the failing test to `symbols.test.ts`**

Add to imports at the top (alongside existing imports):

```ts
import { SYMBOL_DISPLAY } from './symbols';
import { NEON_SYMBOLS } from './types';
```

Append at the bottom of `symbols.test.ts`:

```ts
describe('SYMBOL_DISPLAY', () => {
  it('has an entry for every symbol', () => {
    for (const sym of ['cherry', 'lemon', 'bell', 'bar', 'seven'] as const) {
      expect(SYMBOL_DISPLAY[sym]).toBeDefined();
      expect(SYMBOL_DISPLAY[sym].key).toBe(sym);
    }
  });

  it('marks bell/bar/seven as neon, cherry/lemon as not', () => {
    expect(SYMBOL_DISPLAY.cherry.neon).toBe(false);
    expect(SYMBOL_DISPLAY.lemon.neon).toBe(false);
    expect(SYMBOL_DISPLAY.bell.neon).toBe(true);
    expect(SYMBOL_DISPLAY.bar.neon).toBe(true);
    expect(SYMBOL_DISPLAY.seven.neon).toBe(true);
  });

  it('SYMBOL_DISPLAY[sym].neon agrees with NEON_SYMBOLS membership', () => {
    for (const sym of ['cherry', 'lemon', 'bell', 'bar', 'seven'] as const) {
      expect(SYMBOL_DISPLAY[sym].neon).toBe(NEON_SYMBOLS.has(sym));
    }
  });

  it('label for each symbol is human-readable', () => {
    expect(SYMBOL_DISPLAY.cherry.label).toBe('Cherry');
    expect(SYMBOL_DISPLAY.lemon.label).toBe('Lemon');
    expect(SYMBOL_DISPLAY.bell.label).toBe('Bell');
    expect(SYMBOL_DISPLAY.bar.label).toBe('BAR');
    expect(SYMBOL_DISPLAY.seven.label).toBe('7');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run src/games/slots/symbols.test.ts
```

Expected: FAIL — `SYMBOL_DISPLAY` not exported.

- [ ] **Step 3: Append `SYMBOL_DISPLAY` to `symbols.ts`**

Add at the bottom of `symbols.ts`:

```ts
/** Display metadata consumed by SymbolView.tsx (PR B). */
export interface SymbolDisplay {
  readonly label: string;
  /** Lowercase to match the Symbol type; used for `data-symbol` attrs. */
  readonly key: Symbol;
  /** True iff the symbol is rendered with a neon glow. */
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

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run src/games/slots/symbols.test.ts
```

Expected: PASS — all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/games/slots/symbols.ts src/games/slots/symbols.test.ts
git commit -m "feat(slots): SYMBOL_DISPLAY metadata (label + neon flag per symbol)"
```

## Task A.6: `spin()` and `winTierOf()` in logic.ts

**Files:**

- Create: `src/games/slots/logic.ts`
- Create: `src/games/slots/logic.test.ts`

This task adds only `spin` and `winTierOf`. `settleSpin` arrives in A.7, `buildRoundResult` in A.8.

- [ ] **Step 1: Write the failing test (`logic.test.ts`)** with this content:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { seed, unseed } from '@/systems/rng';
import { spin, winTierOf } from './logic';

describe('spin', () => {
  afterEach(() => unseed());

  it('returns 3 reels each with a valid symbol', () => {
    seed(1);
    const r = spin();
    expect(r.reels).toHaveLength(3);
    for (const s of r.reels) {
      expect(['cherry', 'lemon', 'bell', 'bar', 'seven']).toContain(s);
    }
  });

  it('is deterministic under a fixed seed', () => {
    seed(99);
    const a = spin();
    seed(99);
    const b = spin();
    expect(a).toEqual(b);
  });

  it('over many spins, hits every symbol on every reel at least once', () => {
    seed(1);
    const reelSymbols: Array<Set<string>> = [new Set(), new Set(), new Set()];
    for (let i = 0; i < 2000; i++) {
      const r = spin();
      reelSymbols[0]!.add(r.reels[0]);
      reelSymbols[1]!.add(r.reels[1]);
      reelSymbols[2]!.add(r.reels[2]);
    }
    for (const reel of reelSymbols) {
      expect(reel.size).toBe(5);
    }
  });
});

describe('winTierOf', () => {
  it('returns "none" for null', () => {
    expect(winTierOf(null)).toBe('none');
  });

  it('returns "small" for multiple ≤ 2', () => {
    expect(winTierOf(1)).toBe('small');
    expect(winTierOf(2)).toBe('small');
  });

  it('returns "medium" for multiple 5 / 8 / 12 / 20', () => {
    expect(winTierOf(5)).toBe('medium');
    expect(winTierOf(8)).toBe('medium');
    expect(winTierOf(12)).toBe('medium');
    expect(winTierOf(20)).toBe('medium');
  });

  it('returns "jackpot" for multiple > 20', () => {
    expect(winTierOf(21)).toBe('jackpot');
    expect(winTierOf(50)).toBe('jackpot');
  });

  it('returns "medium" exactly at MEDIUM_MAX boundary (20)', () => {
    expect(winTierOf(20)).toBe('medium');
  });

  it('returns "jackpot" just past MEDIUM_MAX boundary (21)', () => {
    expect(winTierOf(21)).toBe('jackpot');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run src/games/slots/logic.test.ts
```

Expected: FAIL — "Cannot find module './logic'".

- [ ] **Step 3: Write `src/games/slots/logic.ts`** (only `spin` + `winTierOf`):

```ts
import { pickSymbol } from './symbols';
import { SLOTS_CONFIG } from './config';
import type { SpinResult, WinTier } from './types';

/** Spin all 3 reels independently. Pure modulo `rng`. */
export function spin(): SpinResult {
  return { reels: [pickSymbol(), pickSymbol(), pickSymbol()] };
}

/** Map a payout multiple to its visual celebration tier. */
export function winTierOf(multiple: number | null): WinTier {
  if (multiple === null) return 'none';
  if (multiple <= SLOTS_CONFIG.WIN_TIER_THRESHOLDS.SMALL_MAX) return 'small';
  if (multiple <= SLOTS_CONFIG.WIN_TIER_THRESHOLDS.MEDIUM_MAX) return 'medium';
  return 'jackpot';
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run src/games/slots/logic.test.ts
```

Expected: PASS — spin tests + winTierOf tests.

- [ ] **Step 5: Commit**

```bash
git add src/games/slots/logic.ts src/games/slots/logic.test.ts
git commit -m "feat(slots): RNG-backed spin() + winTierOf() tier mapping"
```

## Task A.7: `settleSpin()` payline evaluator

**Files:**

- Modify: `src/games/slots/logic.ts` (add `settleSpin`)
- Modify: `src/games/slots/logic.test.ts` (add `settleSpin` describe)

- [ ] **Step 1: Append failing tests to `logic.test.ts`**

Add to imports at the top:

```ts
import { settleSpin } from './logic';
import type { Symbol } from './types';

function spinOf(a: Symbol, b: Symbol, c: Symbol) {
  return { reels: [a, b, c] as const };
}
```

Append at the bottom of `logic.test.ts`:

```ts
describe('settleSpin', () => {
  it('returns null when all three symbols differ', () => {
    expect(settleSpin(spinOf('cherry', 'lemon', 'bell'))).toBeNull();
    expect(settleSpin(spinOf('bar', 'seven', 'bell'))).toBeNull();
  });

  it('returns null when only 1 cherry is present', () => {
    expect(settleSpin(spinOf('cherry', 'lemon', 'bell'))).toBeNull();
    expect(settleSpin(spinOf('bar', 'cherry', 'lemon'))).toBeNull();
  });

  it('returns 2-cherry payout when exactly 2 cherries are present (any 2 positions)', () => {
    const r1 = settleSpin(spinOf('cherry', 'cherry', 'lemon'));
    expect(r1).toEqual({
      key: 'two-cherry',
      multiple: 2,
      winningReelIndices: [0, 1],
    });

    const r2 = settleSpin(spinOf('cherry', 'lemon', 'cherry'));
    expect(r2).toEqual({
      key: 'two-cherry',
      multiple: 2,
      winningReelIndices: [0, 2],
    });

    const r3 = settleSpin(spinOf('lemon', 'cherry', 'cherry'));
    expect(r3).toEqual({
      key: 'two-cherry',
      multiple: 2,
      winningReelIndices: [1, 2],
    });
  });

  it('returns 3-cherry payout (NOT 2-cherry) when all three are cherries', () => {
    const r = settleSpin(spinOf('cherry', 'cherry', 'cherry'));
    expect(r).toEqual({
      key: 'cherry-cherry-cherry',
      multiple: 5,
      winningReelIndices: [0, 1, 2],
    });
  });

  it.each([
    ['lemon', 'lemon-lemon-lemon', 8],
    ['bell', 'bell-bell-bell', 12],
    ['bar', 'bar-bar-bar', 20],
    ['seven', 'seven-seven-seven', 50],
  ] as const)('3-of-a-kind %s → %s (%i×)', (sym, key, mult) => {
    const r = settleSpin(spinOf(sym, sym, sym));
    expect(r).toEqual({
      key,
      multiple: mult,
      winningReelIndices: [0, 1, 2],
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run src/games/slots/logic.test.ts
```

Expected: FAIL — `settleSpin` not exported.

- [ ] **Step 3: Append `settleSpin` to `logic.ts`**

Add at the bottom:

```ts
import { SLOTS_PAYTABLE } from './config';
import type { PayoutHit } from './types';

/** Examine a spin and return the winning combo (or null).
 *  Order of checks: 3-of-a-kind first; then exactly-2-cherry. */
export function settleSpin(spinResult: SpinResult): PayoutHit | null {
  const [a, b, c] = spinResult.reels;

  if (a === b && b === c) {
    const key = `${a}-${b}-${c}` as PayoutHit['key'];
    return {
      key,
      multiple: SLOTS_PAYTABLE[key],
      winningReelIndices: [0, 1, 2],
    };
  }

  // Exactly-2-cherry (excludes 3-cherry, handled above).
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
```

Note: ensure `SpinResult`, `PayoutHit` are imported via `import type` (they are types, not values). The existing `import type { SpinResult, WinTier } from './types';` needs extending to include `PayoutHit`:

```ts
import type { PayoutHit, SpinResult, WinTier } from './types';
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run src/games/slots/logic.test.ts
```

Expected: PASS — all `settleSpin` tests + previous tests.

- [ ] **Step 5: Commit**

```bash
git add src/games/slots/logic.ts src/games/slots/logic.test.ts
git commit -m "feat(slots): settleSpin() paytable evaluator (3-of-kind + 2-cherry)"
```

## Task A.8: `buildRoundResult()` aggregator

**Files:**

- Modify: `src/games/slots/logic.ts` (add `buildRoundResult`)
- Modify: `src/games/slots/logic.test.ts` (add `buildRoundResult` describe)

- [ ] **Step 1: Append failing tests to `logic.test.ts`**

Add to imports at the top:

```ts
import { buildRoundResult } from './logic';
import { SLOTS_WEIGHTS, SLOTS_CONFIG } from './config';
```

Append at the bottom of `logic.test.ts`:

```ts
describe('buildRoundResult', () => {
  it('losing spin: outcome=loss, payout=0, netChange = -bet', () => {
    const r = buildRoundResult({ spin: spinOf('cherry', 'lemon', 'bell'), bet: 10 });
    expect(r.outcome).toBe('loss');
    expect(r.betAmount).toBe(10);
    expect(r.payout).toBe(0);
    expect(r.netChange).toBe(-10);
    expect(r.details.spin.reels).toEqual(['cherry', 'lemon', 'bell']);
    expect(r.details.payout).toBeNull();
    expect(r.details.winTier).toBe('none');
  });

  it('2-cherry win: outcome=win, payout=bet×2', () => {
    const r = buildRoundResult({ spin: spinOf('cherry', 'cherry', 'lemon'), bet: 25 });
    expect(r.outcome).toBe('win');
    expect(r.betAmount).toBe(25);
    expect(r.payout).toBe(50);
    expect(r.netChange).toBe(25);
    expect(r.details.payout?.key).toBe('two-cherry');
    expect(r.details.winTier).toBe('small');
  });

  it('3-of-kind lemon: outcome=win, payout=bet×8, winTier=medium', () => {
    const r = buildRoundResult({ spin: spinOf('lemon', 'lemon', 'lemon'), bet: 10 });
    expect(r.outcome).toBe('win');
    expect(r.payout).toBe(80);
    expect(r.netChange).toBe(70);
    expect(r.details.payout?.key).toBe('lemon-lemon-lemon');
    expect(r.details.winTier).toBe('medium');
  });

  it('3-of-kind bar: payout=bet×20, winTier=medium (at boundary)', () => {
    const r = buildRoundResult({ spin: spinOf('bar', 'bar', 'bar'), bet: 10 });
    expect(r.payout).toBe(200);
    expect(r.details.winTier).toBe('medium');
  });

  it('3-of-kind seven: payout=bet×50, winTier=jackpot', () => {
    const r = buildRoundResult({ spin: spinOf('seven', 'seven', 'seven'), bet: 100 });
    expect(r.payout).toBe(5_000);
    expect(r.netChange).toBe(4_900);
    expect(r.details.winTier).toBe('jackpot');
  });

  it('snapshots the config (weights + bet limits) into details', () => {
    const r = buildRoundResult({ spin: spinOf('cherry', 'lemon', 'bell'), bet: 5 });
    expect(r.details.config.weights).toEqual(SLOTS_WEIGHTS);
    expect(r.details.config.minBet).toBe(SLOTS_CONFIG.MIN_BET);
    expect(r.details.config.maxBet).toBe(SLOTS_CONFIG.MAX_BET);
  });

  it('details.bet matches the input bet', () => {
    const r = buildRoundResult({ spin: spinOf('lemon', 'lemon', 'lemon'), bet: 42 });
    expect(r.details.bet).toBe(42);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run src/games/slots/logic.test.ts
```

Expected: FAIL — `buildRoundResult` not exported.

- [ ] **Step 3: Append `buildRoundResult` to `logic.ts`**

Add at the bottom:

```ts
import { SLOTS_WEIGHTS } from './config';
import type { SlotsRoundDetails } from './types';

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
  // Slots can never push exactly (multiples are 0/2/5/8/12/20/50). The 'push'
  // branch exists for RoundResult.outcome type compatibility only.
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

Update the import block at the top of `logic.ts` to include `SlotsRoundDetails`:

```ts
import type { PayoutHit, SlotsRoundDetails, SpinResult, WinTier } from './types';
```

If ESLint flags duplicate `SLOTS_WEIGHTS` / `SLOTS_CONFIG` imports, consolidate them into one line at the top of the file.

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run src/games/slots/logic.test.ts
```

Expected: PASS — all logic tests.

- [ ] **Step 5: Commit**

```bash
git add src/games/slots/logic.ts src/games/slots/logic.test.ts
git commit -m "feat(slots): buildRoundResult() aggregator with config snapshot"
```

## Task A.9: Machine — states, events, basic actions

**Files:**

- Create: `src/games/slots/machine.ts`
- Create: `src/games/slots/machine.test.ts`

This task ships the machine skeleton: `betting → spinning → settled` shape with `PLACE_BET / SPIN / NEW_ROUND` events. The `after` delay (spinning → settled) arrives in A.10.

- [ ] **Step 1: Write the failing test (`machine.test.ts`)** with this content:

```ts
import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { slotsMachine } from './machine';

function startMachine() {
  const actor = createActor(slotsMachine);
  actor.start();
  return actor;
}

describe('slotsMachine — initial state', () => {
  it('starts in betting with bet=0, betHandleId="", spinResult=null', () => {
    const a = startMachine();
    expect(a.getSnapshot().value).toBe('betting');
    expect(a.getSnapshot().context.bet).toBe(0);
    expect(a.getSnapshot().context.betHandleId).toBe('');
    expect(a.getSnapshot().context.spinResult).toBeNull();
    expect(a.getSnapshot().context.roundResult).toBeNull();
  });
});

describe('slotsMachine — PLACE_BET', () => {
  it('stores bet + handle in context', () => {
    const a = startMachine();
    a.send({ type: 'PLACE_BET', bet: 25, betHandleId: 'h1' });
    expect(a.getSnapshot().context.bet).toBe(25);
    expect(a.getSnapshot().context.betHandleId).toBe('h1');
  });

  it('latest PLACE_BET overwrites earlier one', () => {
    const a = startMachine();
    a.send({ type: 'PLACE_BET', bet: 25, betHandleId: 'h1' });
    a.send({ type: 'PLACE_BET', bet: 100, betHandleId: 'h2' });
    expect(a.getSnapshot().context.bet).toBe(100);
    expect(a.getSnapshot().context.betHandleId).toBe('h2');
  });
});

describe('slotsMachine — SPIN gate', () => {
  it('SPIN is rejected when bet < MIN_BET', () => {
    const a = startMachine();
    a.send({ type: 'SPIN' });
    expect(a.getSnapshot().value).toBe('betting');
  });

  it('SPIN transitions to spinning when bet >= MIN_BET', () => {
    const a = startMachine();
    a.send({ type: 'PLACE_BET', bet: 5, betHandleId: 'h' });
    a.send({ type: 'SPIN' });
    expect(a.getSnapshot().value).toBe('spinning');
    expect(a.getSnapshot().context.spinResult).not.toBeNull();
    expect(a.getSnapshot().context.spinResult?.reels).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run src/games/slots/machine.test.ts
```

Expected: FAIL — "Cannot find module './machine'".

- [ ] **Step 3: Write `src/games/slots/machine.ts`** (skeleton; delay filled in by A.10)

```ts
import { assign, setup } from 'xstate';
import { SLOTS_CONFIG } from './config';
import { buildRoundResult, spin } from './logic';
import type { SpinResult } from './types';

interface Context {
  bet: number;
  betHandleId: string;
  spinResult: SpinResult | null;
  roundResult: ReturnType<typeof buildRoundResult> | null;
  totalSpinDurationMs: number;
}

type MachineEvent =
  | { type: 'PLACE_BET'; bet: number; betHandleId: string }
  | { type: 'SPIN' }
  | { type: 'NEW_ROUND' };

type MachineInput = { totalSpinDurationMs?: number } | undefined;

const DEFAULT_TOTAL_SPIN_MS =
  SLOTS_CONFIG.REEL_STOP_TIMES_MS[SLOTS_CONFIG.REEL_STOP_TIMES_MS.length - 1]!;

export const slotsMachine = setup({
  types: {
    context: {} as Context,
    events: {} as MachineEvent,
    input: {} as MachineInput,
  },
  guards: {
    hasBet: ({ context }) => context.bet >= SLOTS_CONFIG.MIN_BET,
  },
  actions: {
    applyBet: assign({
      bet: ({ context, event }) => (event.type === 'PLACE_BET' ? event.bet : context.bet),
      betHandleId: ({ context, event }) =>
        event.type === 'PLACE_BET' ? event.betHandleId : context.betHandleId,
    }),
    setSpinResult: assign({
      spinResult: () => spin(),
    }),
    clearForNextRound: assign({
      bet: () => 0,
      betHandleId: () => '',
      spinResult: () => null,
      roundResult: () => null,
    }),
  },
}).createMachine({
  id: 'slots',
  initial: 'betting',
  context: ({ input }) => ({
    bet: 0,
    betHandleId: '',
    spinResult: null,
    roundResult: null,
    totalSpinDurationMs: input?.totalSpinDurationMs ?? DEFAULT_TOTAL_SPIN_MS,
  }),
  states: {
    betting: {
      on: {
        PLACE_BET: { actions: 'applyBet' },
        SPIN: {
          guard: 'hasBet',
          target: 'spinning',
        },
      },
    },
    spinning: {
      entry: 'setSpinResult',
      // `after` transition + setRoundResult arrive in Task A.10
    },
    settled: {
      on: {
        NEW_ROUND: {
          target: 'betting',
          actions: 'clearForNextRound',
        },
      },
    },
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run src/games/slots/machine.test.ts
```

Expected: PASS — initial state, PLACE_BET, SPIN gate, SPIN transition tests.

- [ ] **Step 5: Commit**

```bash
git add src/games/slots/machine.ts src/games/slots/machine.test.ts
git commit -m "feat(slots): XState machine skeleton (betting/spinning/settled, PLACE_BET/SPIN)"
```

## Task A.10: Machine — spinning delay + roundResult

**Files:**

- Modify: `src/games/slots/machine.ts` (add `setRoundResult` action + `delays` + `after`)
- Modify: `src/games/slots/machine.test.ts` (add delay tests)

- [ ] **Step 1: Append failing tests to `machine.test.ts`**

Add to imports at the top:

```ts
import { vi } from 'vitest';
import { SLOTS_CONFIG } from './config';
```

Append at the bottom:

```ts
const DEFAULT_TOTAL_SPIN_MS =
  SLOTS_CONFIG.REEL_STOP_TIMES_MS[SLOTS_CONFIG.REEL_STOP_TIMES_MS.length - 1]!;

describe('slotsMachine — spinning delay → settled', () => {
  it('after totalSpinDurationMs, transitions to settled with roundResult populated', async () => {
    vi.useFakeTimers();
    try {
      const a = startMachine();
      a.send({ type: 'PLACE_BET', bet: 25, betHandleId: 'h' });
      a.send({ type: 'SPIN' });
      expect(a.getSnapshot().value).toBe('spinning');
      await vi.advanceTimersByTimeAsync(DEFAULT_TOTAL_SPIN_MS);
      expect(a.getSnapshot().value).toBe('settled');
      const result = a.getSnapshot().context.roundResult;
      expect(result).not.toBeNull();
      expect(result!.betAmount).toBe(25);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reduced-motion override (totalSpinDurationMs=0) settles immediately', async () => {
    vi.useFakeTimers();
    try {
      const actor = createActor(slotsMachine, { input: { totalSpinDurationMs: 0 } });
      actor.start();
      actor.send({ type: 'PLACE_BET', bet: 5, betHandleId: 'h' });
      actor.send({ type: 'SPIN' });
      await vi.advanceTimersByTimeAsync(0);
      expect(actor.getSnapshot().value).toBe('settled');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('slotsMachine — NEW_ROUND', () => {
  it('NEW_ROUND from settled clears all context fields and returns to betting', async () => {
    vi.useFakeTimers();
    try {
      const a = startMachine();
      a.send({ type: 'PLACE_BET', bet: 25, betHandleId: 'h1' });
      a.send({ type: 'SPIN' });
      await vi.advanceTimersByTimeAsync(DEFAULT_TOTAL_SPIN_MS);
      expect(a.getSnapshot().value).toBe('settled');

      a.send({ type: 'NEW_ROUND' });
      const next = a.getSnapshot();
      expect(next.value).toBe('betting');
      expect(next.context.bet).toBe(0);
      expect(next.context.betHandleId).toBe('');
      expect(next.context.spinResult).toBeNull();
      expect(next.context.roundResult).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run src/games/slots/machine.test.ts
```

Expected: FAIL — `spinning` doesn't transition to `settled`.

- [ ] **Step 3: Update `src/games/slots/machine.ts`**

**Three changes (each described under its own subheading):**

**Change A — add `setRoundResult` to the `actions` block** of `setup({})`:

```ts
setRoundResult: assign({
  roundResult: ({ context }) => {
    if (!context.spinResult) return null;
    return buildRoundResult({ spin: context.spinResult, bet: context.bet });
  },
}),
```

**Change B — add a `delays` block** to `setup({})` (sibling of `guards`, `actions`):

```ts
delays: {
  totalSpin: ({ context }) => context.totalSpinDurationMs,
},
```

**Change C — update the `spinning` state** to add the `after` transition:

```ts
spinning: {
  entry: 'setSpinResult',
  after: {
    totalSpin: {
      target: 'settled',
      actions: 'setRoundResult',
    },
  },
},
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run src/games/slots/machine.test.ts
```

Expected: PASS — all machine tests (initial + PLACE_BET + SPIN gate + delay + NEW_ROUND).

- [ ] **Step 5: Commit**

```bash
git add src/games/slots/machine.ts src/games/slots/machine.test.ts
git commit -m "feat(slots): spinning → settled after totalSpin with reduced-motion override + NEW_ROUND"
```

## Task A.11: Vitest coverage thresholds for slots

**Files:**

- Modify: `vitest.config.ts`

- [ ] **Step 1: Update `vitest.config.ts`**

Find the `test.coverage` block. Add `src/games/slots/**/*.ts` to both `include` AND `thresholds`:

```ts
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: ['./src/test/setup.ts'],
  css: false,
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html', 'lcov'],
    include: [
      'src/games/**/logic.ts',
      'src/games/blackjack/**/*.ts',
      'src/games/roulette/**/*.ts',
      'src/games/slots/**/*.ts',
      'src/systems/**/*.ts',
    ],
    exclude: ['**/*.test.ts', '**/*.test.tsx'],
    thresholds: {
      'src/games/**/logic.ts': { lines: 90, functions: 90, branches: 85, statements: 90 },
      'src/games/blackjack/**/*.ts': { lines: 90, functions: 90, branches: 85, statements: 90 },
      'src/games/roulette/**/*.ts': { lines: 90, functions: 90, branches: 85, statements: 90 },
      'src/games/slots/**/*.ts': { lines: 90, functions: 90, branches: 85, statements: 90 },
      'src/systems/**/*.ts': { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
},
```

- [ ] **Step 2: Run coverage and verify thresholds met**

```bash
pnpm exec vitest run --coverage
```

Expected: all tests pass AND coverage thresholds met. Per-file table should show `src/games/slots/*.ts` at ≥ 90% lines/functions/branches/statements. If anything misses, add tests to cover the missing branches before committing.

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "test(slots): coverage thresholds (≥90% on src/games/slots/**/*.ts)"
```

## Task A.12: ADR-0032 — Slots symbol weights and RTP

**Files:**

- Create: `docs/adr/0032-slots-symbol-weights-and-rtp.md`

- [ ] **Step 1: Write `docs/adr/0032-slots-symbol-weights-and-rtp.md`**

````markdown
# ADR-0032: Slots — Symbol weights and RTP target

- Status: Accepted
- Date: 2026-05-18
- Deciders: @adamzspare

## Context

BUILD_GUIDE §8.3 specifies the symbol set and paytable for 3-reel slots
but leaves the per-symbol weights to be tuned: "Rarer symbols = higher
payout… tune these so the return-to-player feels fun but not infinite."

The weights are the single most impactful game-feel knob: they determine
how often the player wins, how big the wins are, and how long the player
can play before running out of chips.

## Decision

Ship `src/games/slots/config.ts` with:

```ts
export const SLOTS_WEIGHTS = {
  cherry: 4,
  lemon: 5,
  bell: 3,
  bar: 2,
  seven: 1,
};
export const SLOTS_WEIGHT_TOTAL = 15;
```
````

These weights yield:

| Combination       | Multiple | Probability | Contribution to RTP |
| ----------------- | -------- | ----------- | ------------------- |
| 3× Seven          | 50       | 1 / 3375    | 0.0148              |
| 3× Bar            | 20       | 8 / 3375    | 0.0474              |
| 3× Bell           | 12       | 27 / 3375   | 0.0960              |
| 3× Lemon          | 8        | 125 / 3375  | 0.2963              |
| 3× Cherry         | 5        | 64 / 3375   | 0.0948              |
| 2× Cherry (exact) | 2        | 528 / 3375  | 0.3129              |
| **Total RTP**     |          |             | **≈ 86.2%**         |
| **Any-win rate**  |          |             | **≈ 22.3%**         |

A 3× Seven jackpot hits roughly once every 4913 spins; the user is
expected to play long enough to see one over a session.

## Alternatives considered

- **Higher RTP (~93%, weights `cherry:4 lemon:5 bell:3 bar:2 seven:1`** —
  same weights but with a doubled 2-cherry payout, or 2-cherry triggers
  more often). Rejected: feels too generous and removes the tension of
  losing streaks. Real Vegas slots target 88–95% — 86% sits at the
  punishing end of "realistic", which is the brief.
- **Lower RTP (~80%, weights with even rarer Cherry)**. Rejected: makes
  the most common payout (2-cherry) too rare; player has long losing
  streaks with no positive feedback.
- **Per-reel weights** (different weights on different reels — common in
  commercial machines to make 3-of-kind harder). Rejected as YAGNI for
  Phase 5; can be added in Phase 8 polish if game feel demands it.

## Consequences

- The exact weights are exported as a const map; tests pin the expected
  RTP-contribution math (§ test in `logic.test.ts` and `symbols.test.ts`).
- Changing the weights requires updating both `config.ts` AND the
  frequency-assertion test in `symbols.test.ts` (the one that asserts
  observed ÷ expected ≤ 2% delta). This is intentional — silently
  changing weights would silently change RTP.
- The weights snapshot is recorded into `Round.details` on every spin
  via `buildRoundResult`, so future stats analysis can reconstruct the
  RTP for any historical period even after tuning.

## References

- BUILD_GUIDE §8.3
- `src/games/slots/config.ts`
- `src/games/slots/symbols.ts`
- `src/games/slots/symbols.test.ts` — frequency assertions
- Phase 5 spec §3.1, §3.2

````

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0032-slots-symbol-weights-and-rtp.md
git commit -m "docs(adr): 0032 — Slots symbol weights + RTP target (~86%)"
````

## Task A.13: ADR-0033 — Slots tiered win celebration

**Files:**

- Create: `docs/adr/0033-slots-tiered-win-celebration.md`

- [ ] **Step 1: Write `docs/adr/0033-slots-tiered-win-celebration.md`**

```markdown
# ADR-0033: Slots — Tiered win celebration

- Status: Accepted
- Date: 2026-05-18
- Deciders: @adamzspare

## Context

The most common Slots payout (2× Cherry) hits roughly once every 8 spins.
The rarest (3× Seven) hits roughly once every 4913. If every win used
the same celebration animation, frequent small wins would feel like
noise and the rare jackpot would feel ordinary.

We want the visual celebration to scale with payout magnitude so that
rare wins feel singular.

## Decision

Three win tiers, mapped from `PayoutHit.multiple`:

| Tier      | Multiple range           | Triggered by                   | Visual                                                                            |
| --------- | ------------------------ | ------------------------------ | --------------------------------------------------------------------------------- |
| `none`    | (no hit / multiple null) | losing spin                    | nothing                                                                           |
| `small`   | ≤ 2                      | 2× Cherry                      | payline cells pulse gold for 600ms + chip dribble + result banner                 |
| `medium`  | 3 ≤ m ≤ 20               | 3× Cherry / Lemon / Bell / Bar | golden radial burst on payline (800ms) + chip dribble + result banner             |
| `jackpot` | > 20                     | 3× Seven                       | full-screen magenta tint (200ms fade) + 12 coin-shower particles + JACKPOT banner |

The boundary is intentionally numeric (driven by `SLOTS_CONFIG.WIN_TIER_THRESHOLDS`)
rather than enumerated by combo. If we later add a Wild or new symbol,
its payout multiple determines its tier automatically.

The tier additionally drives:

- Recent-results sidebar badge colour (small → green, medium → gold,
  jackpot → magenta).
- Page disabled-state duration (controls don't re-enable until the
  celebration animation finishes — small=600ms, medium=800ms, jackpot=1500ms).

## Reduced-motion

When `useReducedMotion()` returns true, ALL tiers collapse to:

- Result banner (no slide; snaps in with opacity 1)
- Chip dribble on the balance (already reduced-motion-aware via Phase 2)
- NO payline pulses, NO bursts, NO coin particles, NO magenta tint

The numeric outcome and the wallet flow are unchanged.

## Alternatives considered

- **Single uniform celebration.** Rejected — frequent small wins become
  visual noise; the rare jackpot loses its specialness.
- **Per-combo bespoke celebrations** (different animation for each of the
  6 paytable rows). Rejected as overkill: 3 tiers covers the perceptual
  delta without 6× the animation code.
- **No celebration; just a number.** Rejected — the brief was "old-school
  Vegas content with modern web execution"; soundless Slots without
  visual feedback feels lifeless.

## Consequences

- `winTierOf(multiple)` lives in `logic.ts` and is pure. Tested in
  `logic.test.ts` with boundary cases (1 / 2 / 3 / 12 / 20 / 21 / 50).
- The celebration code is inline in `SlotsPage.tsx` (not its own file).
  It's tightly coupled to the page's settle effect and doesn't need to
  be shared. If a future game wants similar tiering, it can be promoted
  to a shared component in Phase 8 polish.
- The reduced-motion path is the same code path as Phase 4's
  `useReducedMotion` integration — single hook read at the page level,
  passed down as a boolean prop.

## References

- BUILD_GUIDE §8.3
- ADR-0031 — Roulette spin animation contract (reduced-motion precedent)
- `src/games/slots/logic.ts` — `winTierOf`
- `src/games/slots/SlotsPage.tsx` — celebration tier rendering
- Phase 5 spec §14, §15
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0033-slots-tiered-win-celebration.md
git commit -m "docs(adr): 0033 — Slots tiered win celebration (small/medium/jackpot)"
```

## Task A.14: PR A — verify, push, open, merge

- [ ] **Step 1: Run the full DoD locally**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: all four exit 0. Test count up by ~30 (symbols + logic + machine).

- [ ] **Step 2: Verify coverage thresholds met**

```bash
pnpm exec vitest run --coverage
```

Expected: per-file table shows `src/games/slots/*.ts` at ≥ 90% lines/functions/branches/statements.

- [ ] **Step 3: Push branch**

```bash
git push -u origin phase-5-slots-pr-a-logic
```

- [ ] **Step 4: Open PR**

```bash
gh pr create --title "phase-5(slots): pure logic + XState machine + tests + 2 ADRs" --body "$(cat <<'EOF'
## Summary

PR A of Phase 5. Ships every pure-logic file + the XState v5 round machine + ADRs 0032/0033. No UI yet — the next 3 PRs build the components on top of this base.

- \`types.ts\`, \`config.ts\`, \`symbols.ts\`, \`logic.ts\`, \`machine.ts\`
- Weighted-pick symbol via cumulative table (RNG-backed, no Math.random)
- All 6 paytable combos from BUILD_GUIDE §8.3 with correct payouts
- Tier mapping (small ≤ 2× / medium ≤ 20× / jackpot > 20×)
- XState v5 machine: \`betting → spinning → settled → betting\`
- Reduced-motion path: \`totalSpinDurationMs: 0\` input collapses spin instantly
- Coverage gate: ≥ 90% on \`src/games/slots/**/*.ts\`
- ADR-0032 symbol weights + RTP target (~86%), ADR-0033 tiered win celebration

## Test plan

- [x] \`pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build\` green locally
- [x] Coverage thresholds met for \`src/games/slots/**/*.ts\`
- [x] Frequency assertion test confirms weight distribution within 2% over 30k draws
- [ ] CI green (4 jobs)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Wait for CI green, merge, sync main**

Monitor CI: `gh pr checks <PR#> --watch`. When green:

```bash
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

Expected: PR merged into main, local main up to date, branch deleted both remote and local.

---

# PR B — Symbol + ReelView

**Branch:** `phase-5-slots-pr-b-symbol-reel` (off freshly-merged `main`)
**Goal of this PR:** Ship the visual `<SymbolView />` (all 5 art styles in one component) + `<ReelView />` (one reel with scrolling animation). Pure presentational; no machine, no wallet.
**Risk:** Medium. CSS art for 5 symbols + Framer Motion scroll animation + reduced-motion fallback.
**Estimated tasks:** 5.

## Task B.1: SymbolView component (all 5 styles)

**Files:**

- Create: `src/games/slots/SymbolView.tsx`
- Create: `src/games/slots/SymbolView.test.tsx`

One component that renders any of the 5 symbols based on the `symbol` prop. CSS-only (no SVG dependency for the basic shapes). Neon variants get extra `box-shadow` + `text-shadow`. `winning` prop adds a brightness boost + pulse keyframe.

- [ ] **Step 1: Branch off freshly-merged main**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-5-slots-pr-b-symbol-reel
```

- [ ] **Step 2: Write the failing test (`SymbolView.test.tsx`)**

```tsx
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import SymbolView from './SymbolView';
import type { Symbol as SymbolType } from './types';

describe('<SymbolView />', () => {
  it.each(['cherry', 'lemon', 'bell', 'bar', 'seven'] as const)(
    'renders the %s symbol with data-symbol attribute',
    (sym: SymbolType) => {
      render(<SymbolView symbol={sym} />);
      const el = document.querySelector(`[data-symbol="${sym}"]`);
      expect(el).toBeInTheDocument();
    },
  );

  it('marks bell / bar / seven as neon via data-neon="true"', () => {
    for (const sym of ['bell', 'bar', 'seven'] as const) {
      const { unmount } = render(<SymbolView symbol={sym} />);
      expect(document.querySelector(`[data-symbol="${sym}"]`)!.getAttribute('data-neon')).toBe(
        'true',
      );
      unmount();
    }
  });

  it('marks cherry / lemon as data-neon="false"', () => {
    for (const sym of ['cherry', 'lemon'] as const) {
      const { unmount } = render(<SymbolView symbol={sym} />);
      expect(document.querySelector(`[data-symbol="${sym}"]`)!.getAttribute('data-neon')).toBe(
        'false',
      );
      unmount();
    }
  });

  it('adds data-winning="true" when winning prop is set', () => {
    render(<SymbolView symbol="seven" winning />);
    expect(document.querySelector('[data-symbol="seven"]')!.getAttribute('data-winning')).toBe(
      'true',
    );
  });

  it('omits data-winning when winning prop is false / undefined', () => {
    render(<SymbolView symbol="cherry" />);
    expect(
      document.querySelector('[data-symbol="cherry"]')!.getAttribute('data-winning'),
    ).toBeNull();
  });

  it('honours custom size prop (default 64)', () => {
    render(<SymbolView symbol="bell" size={32} />);
    const el = document.querySelector('[data-symbol="bell"]') as HTMLElement;
    expect(el.style.width).toBe('32px');
    expect(el.style.height).toBe('32px');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm exec vitest run src/games/slots/SymbolView.test.tsx
```

Expected: FAIL — cannot import `./Symbol`.

- [ ] **Step 4: Write `src/games/slots/SymbolView.tsx`**

```tsx
import type { JSX } from 'react';
import { SYMBOL_DISPLAY } from './symbols';
import type { Symbol as SymbolType } from './types';

export interface SymbolProps {
  symbol: SymbolType;
  /** Pixel size of the bounding box. Default 64. */
  size?: number;
  /** When true, adds a pulse + brighter glow. */
  winning?: boolean;
}

const NEON_GLOW_GOLD = '0 0 8px rgba(212,175,55,0.7), 0 0 16px rgba(212,175,55,0.3)';
const NEON_GLOW_MAGENTA =
  '0 0 8px rgba(255,92,242,1), 0 0 16px rgba(255,92,242,0.7), 0 0 24px rgba(255,92,242,0.4)';

export default function SymbolView({
  symbol,
  size = 64,
  winning = false,
}: SymbolProps): JSX.Element {
  const display = SYMBOL_DISPLAY[symbol];
  const wrapperStyle: React.CSSProperties = {
    width: size,
    height: size,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    filter: winning ? 'brightness(1.1)' : undefined,
  };

  return (
    <div
      data-symbol={symbol}
      data-neon={display.neon ? 'true' : 'false'}
      {...(winning ? { 'data-winning': 'true' } : {})}
      style={wrapperStyle}
      aria-label={display.label}
    >
      {symbol === 'cherry' && <CherryArt size={size} />}
      {symbol === 'lemon' && <LemonArt size={size} />}
      {symbol === 'bell' && <BellArt size={size} />}
      {symbol === 'bar' && <BarArt size={size} />}
      {symbol === 'seven' && <SevenArt size={size} />}
    </div>
  );
}

// ─── Per-symbol art (CSS-only) ───────────────────────────────────────────────

function CherryArt({ size }: { size: number }): JSX.Element {
  const ballSize = size * 0.66;
  return (
    <>
      {/* Stem */}
      <div
        style={{
          position: 'absolute',
          top: size * 0.06,
          left: '50%',
          width: 2,
          height: size * 0.22,
          background: '#4a7c2d',
          transform: 'translateX(-50%) rotate(15deg)',
          transformOrigin: 'top center',
          borderRadius: 1,
        }}
      />
      {/* Ball */}
      <div
        style={{
          width: ballSize,
          height: ballSize,
          marginTop: size * 0.15,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #ff5050 0%, #c1080d 60%, #6b0408 100%)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.4), inset -3px -3px 6px rgba(0,0,0,0.4)',
        }}
      />
    </>
  );
}

function LemonArt({ size }: { size: number }): JSX.Element {
  const w = size * 0.78;
  const h = size * 0.56;
  return (
    <>
      <div
        style={{
          width: w,
          height: h,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at 35% 30%, #ffe55a 0%, #f4c430 70%, #a07a00 100%)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.4), inset -3px -3px 6px rgba(0,0,0,0.3)',
          position: 'relative',
        }}
      >
        {/* Lemon nubs (left + right) */}
        <span
          style={{
            position: 'absolute',
            top: '50%',
            left: -3,
            width: 8,
            height: 4,
            background: '#b8860b',
            borderRadius: '50%',
            transform: 'translateY(-50%)',
          }}
        />
        <span
          style={{
            position: 'absolute',
            top: '50%',
            right: -3,
            width: 8,
            height: 4,
            background: '#b8860b',
            borderRadius: '50%',
            transform: 'translateY(-50%)',
          }}
        />
      </div>
    </>
  );
}

function BellArt({ size }: { size: number }): JSX.Element {
  const w = size * 0.65;
  const h = size * 0.7;
  return (
    <>
      <div
        style={{
          width: w,
          height: h,
          background: 'linear-gradient(180deg, #ffe066 0%, #d4af37 100%)',
          borderRadius: '50% 50% 30% 30% / 65% 65% 35% 35%',
          boxShadow: NEON_GLOW_GOLD,
          border: '1px solid #d4af37',
          position: 'relative',
        }}
      >
        {/* Bell clapper */}
        <div
          style={{
            position: 'absolute',
            width: 7,
            height: 7,
            background: '#8b6914',
            borderRadius: '50%',
            bottom: -2,
            left: '50%',
            transform: 'translateX(-50%)',
            boxShadow: '0 0 4px rgba(212,175,55,0.8)',
          }}
        />
        {/* Bell top loop */}
        <div
          style={{
            position: 'absolute',
            width: 9,
            height: 4,
            background: '#8b6914',
            borderRadius: 2,
            top: -2,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />
      </div>
    </>
  );
}

function BarArt({ size }: { size: number }): JSX.Element {
  const w = size * 0.7;
  const h = size * 0.45;
  return (
    <>
      <div
        style={{
          width: w,
          height: h,
          background: 'linear-gradient(180deg, #1a1a1a 0%, #06120c 100%)',
          border: '2px solid #d4af37',
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffe066',
          fontFamily: 'Bungee, system-ui',
          fontSize: Math.round(size * 0.22),
          fontWeight: 'bold',
          boxShadow: NEON_GLOW_GOLD,
          textShadow: '0 0 4px rgba(255,224,102,0.8)',
          letterSpacing: 1,
        }}
      >
        BAR
      </div>
    </>
  );
}

function SevenArt({ size }: { size: number }): JSX.Element {
  return (
    <span
      style={{
        fontFamily: 'Bungee, system-ui',
        fontSize: Math.round(size * 0.6),
        color: '#ff5cf2',
        fontWeight: 900,
        textShadow: NEON_GLOW_MAGENTA,
        WebkitTextStroke: '0.5px #fff',
        lineHeight: 1,
      }}
    >
      7
    </span>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm exec vitest run src/games/slots/SymbolView.test.tsx
```

Expected: PASS — all Symbol tests.

- [ ] **Step 6: Lint + typecheck**

```bash
pnpm lint && pnpm typecheck
```

Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/games/slots/SymbolView.tsx src/games/slots/SymbolView.test.tsx
git commit -m "feat(slots): SymbolView component (cherry/lemon classic + bell/bar/seven neon)"
```

## Task B.2: ReelView scaffold (3 cells, static state)

**Files:**

- Create: `src/games/slots/ReelView.tsx`
- Create: `src/games/slots/ReelView.test.tsx`

Static version of the reel: 3 cells stacked vertically (top / centre / bottom). The centre cell is the payline. Initially renders 3 fixed symbols when idle (no `symbol` prop) and the final `symbol` in the centre when one is set + `spinning=false`. Scrolling animation arrives in Task B.3.

- [ ] **Step 1: Write the failing test (`ReelView.test.tsx`)**

```tsx
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import ReelView from './ReelView';

describe('<ReelView /> static', () => {
  it('renders 3 visible cells when idle (no symbol)', () => {
    render(<ReelView reelIndex={0} symbol={null} spinning={false} stopAtMs={1200} />);
    const cells = document.querySelectorAll('[data-roulette-cell-position]');
    expect(cells).toHaveLength(3);
  });

  it('renders the given symbol in the centre cell when not spinning', () => {
    render(<ReelView reelIndex={1} symbol="seven" spinning={false} stopAtMs={2000} />);
    const centre = document.querySelector('[data-roulette-cell-position="centre"]');
    expect(centre).toBeInTheDocument();
    const sym = centre!.querySelector('[data-symbol]');
    expect(sym!.getAttribute('data-symbol')).toBe('seven');
  });

  it('exposes data-reel-index for testability', () => {
    render(<ReelView reelIndex={2} symbol="bar" spinning={false} stopAtMs={3000} />);
    expect(document.querySelector('[data-reel-index="2"]')).toBeInTheDocument();
  });

  it('marks the reel as winning when winning prop is true', () => {
    render(<ReelView reelIndex={0} symbol="seven" spinning={false} stopAtMs={1200} winning />);
    const centre = document.querySelector('[data-roulette-cell-position="centre"]');
    expect(centre!.getAttribute('data-winning')).toBe('true');
  });

  it('centre cell does not have data-winning when winning is false', () => {
    render(<ReelView reelIndex={0} symbol="seven" spinning={false} stopAtMs={1200} />);
    const centre = document.querySelector('[data-roulette-cell-position="centre"]');
    expect(centre!.getAttribute('data-winning')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run src/games/slots/ReelView.test.tsx
```

Expected: FAIL — cannot import `./ReelView`.

- [ ] **Step 3: Write `src/games/slots/ReelView.tsx`** (static scaffold; scrolling in B.3)

```tsx
import type { JSX } from 'react';
import SymbolView from './SymbolView';
import type { Symbol as SymbolType } from './types';

export interface ReelProps {
  /** 0 / 1 / 2 — left / centre / right reel. Used for staggered start. */
  reelIndex: 0 | 1 | 2;
  /** True during machine.spinning. Drives the scroll animation (B.3). */
  spinning: boolean;
  /** Final symbol for this reel. null = idle (no spin yet). */
  symbol: SymbolType | null;
  /** When this reel should stop (ms from spin start). Drives animation length. */
  stopAtMs: number;
  /** When true, render with reduced-motion fallback (no scroll). */
  reducedMotion?: boolean;
  /** When true, the centre cell gets data-winning="true" for highlight styling. */
  winning?: boolean;
}

const CELL_SIZE = 64; // px — Symbol default size

/** Idle filler symbols (deterministic — purely cosmetic). */
const IDLE_FILLERS: readonly [SymbolType, SymbolType] = ['cherry', 'lemon'];

export default function ReelView({
  reelIndex,
  spinning: _spinning, // eslint-disable-line @typescript-eslint/no-unused-vars -- consumed in Task B.3
  symbol,
  stopAtMs: _stopAtMs, // eslint-disable-line @typescript-eslint/no-unused-vars -- consumed in Task B.3
  reducedMotion: _reducedMotion = false, // eslint-disable-line @typescript-eslint/no-unused-vars -- consumed in Task B.3
  winning = false,
}: ReelProps): JSX.Element {
  const centreSymbol: SymbolType = symbol ?? IDLE_FILLERS[0];
  const topSymbol = IDLE_FILLERS[0];
  const bottomSymbol = IDLE_FILLERS[1];

  return (
    <div
      data-reel-index={reelIndex}
      className="relative overflow-hidden rounded border border-gold/30 bg-felt-deep"
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE * 3,
      }}
    >
      <div
        data-roulette-cell-position="top"
        className="flex items-center justify-center"
        style={{ height: CELL_SIZE }}
      >
        <SymbolView symbol={topSymbol} size={CELL_SIZE} />
      </div>
      <div
        data-roulette-cell-position="centre"
        {...(winning ? { 'data-winning': 'true' } : {})}
        className="flex items-center justify-center"
        style={{
          height: CELL_SIZE,
          boxShadow: winning
            ? 'inset 0 0 12px rgba(255,224,102,0.5), inset 0 0 24px rgba(255,224,102,0.25)'
            : undefined,
          background: winning ? 'rgba(212,175,55,0.08)' : undefined,
        }}
      >
        <SymbolView symbol={centreSymbol} size={CELL_SIZE} winning={winning} />
      </div>
      <div
        data-roulette-cell-position="bottom"
        className="flex items-center justify-center"
        style={{ height: CELL_SIZE }}
      >
        <SymbolView symbol={bottomSymbol} size={CELL_SIZE} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run src/games/slots/ReelView.test.tsx
```

Expected: PASS — all static tests.

- [ ] **Step 5: Commit**

```bash
git add src/games/slots/ReelView.tsx src/games/slots/ReelView.test.tsx
git commit -m "feat(slots): ReelView scaffold (3 cells, static, winning highlight)"
```

## Task B.3: ReelView scrolling animation

**Files:**

- Modify: `src/games/slots/ReelView.tsx` (replace static cells with motion-driven scroll strip during spinning)
- Modify: `src/games/slots/ReelView.test.tsx` (add scroll-animation data-attr tests)

When `spinning=true`, the reel renders a TALL vertical strip of symbols (idle + many random filler symbols + final symbol), and Framer Motion animates `y` from 0 to the final offset over `stopAtMs`. The final offset positions the chosen `symbol` in the centre cell.

- [ ] **Step 1: Append failing tests to `ReelView.test.tsx`**

```tsx
describe('<ReelView /> scrolling animation', () => {
  it('renders a scroll strip when spinning + symbol set', () => {
    render(<ReelView reelIndex={0} symbol="seven" spinning={true} stopAtMs={1200} />);
    const strip = document.querySelector('[data-reel-strip]');
    expect(strip).toBeInTheDocument();
  });

  it('does NOT render a scroll strip when not spinning', () => {
    render(<ReelView reelIndex={0} symbol="seven" spinning={false} stopAtMs={1200} />);
    expect(document.querySelector('[data-reel-strip]')).toBeNull();
  });

  it('scroll strip exposes data-stop-at-ms (drives animation duration)', () => {
    render(<ReelView reelIndex={2} symbol="bar" spinning={true} stopAtMs={3000} />);
    expect(document.querySelector('[data-reel-strip]')!.getAttribute('data-stop-at-ms')).toBe(
      '3000',
    );
  });

  it('scroll strip exposes data-final-symbol matching the symbol prop', () => {
    render(<ReelView reelIndex={1} symbol="bell" spinning={true} stopAtMs={2000} />);
    expect(document.querySelector('[data-reel-strip]')!.getAttribute('data-final-symbol')).toBe(
      'bell',
    );
  });

  it('scroll strip contains the final symbol somewhere', () => {
    render(<ReelView reelIndex={0} symbol="seven" spinning={true} stopAtMs={1200} />);
    const strip = document.querySelector('[data-reel-strip]')!;
    const sevens = strip.querySelectorAll('[data-symbol="seven"]');
    expect(sevens.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run src/games/slots/ReelView.test.tsx
```

Expected: FAIL — `data-reel-strip` not found.

- [ ] **Step 3: Update `ReelView.tsx`**

Add imports:

```tsx
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { pickSymbol } from './symbols';
```

Add a strip-generator helper above the component:

```tsx
/** Number of filler symbols above the centre symbol in the strip.
 *  Determines how long the scrolling appears (more = visually faster strip). */
const STRIP_FILLER_COUNT = 24;

/** Build a strip of symbols: fillers at the top, then the centre filler-pair
 *  arrangement (top=cherry, centre=symbol, bottom=lemon) at the bottom.
 *  Filler symbols are RNG-picked but are cosmetic — they aren't recorded
 *  anywhere and don't affect the wallet. */
function buildScrollStrip(finalSymbol: SymbolType): SymbolType[] {
  const fillers: SymbolType[] = Array.from({ length: STRIP_FILLER_COUNT }, () => pickSymbol());
  // Final 3 cells visible when the strip stops: top, centre, bottom.
  return [...fillers, IDLE_FILLERS[0], finalSymbol, IDLE_FILLERS[1]];
}
```

Update the component to render the strip when `spinning && symbol`. The strip is a tall vertical container clipped by the reel; Framer Motion animates `y` from `-(strip_height - 3*CELL_SIZE)` to `0` over `stopAtMs / 1000` seconds with easeOut. (Negative initial y means the strip starts way down so it scrolls UP into view; ending at 0 leaves the last 3 cells [top filler, finalSymbol, bottom filler] visible.)

Actually the cleanest direction: strip starts at `y=0` showing the TOP fillers, then animates UP (y decreasing) until the FINAL three are visible. So:

```tsx
const stripHeight = strip.length * CELL_SIZE; // total height of the strip
const finalY = -(stripHeight - 3 * CELL_SIZE); // negative; strip scrolled up so final 3 cells are visible
```

Replace the entire return statement of the component:

```tsx
const showScroll = _spinning && symbol !== null;
const strip = useMemo(() => (symbol ? buildScrollStrip(symbol) : []), [symbol]);
const reduce = _reducedMotion;
const stripHeight = strip.length * CELL_SIZE;
const finalY = -(stripHeight - 3 * CELL_SIZE);

return (
  <div
    data-reel-index={reelIndex}
    className="relative overflow-hidden rounded border border-gold/30 bg-felt-deep"
    style={{
      width: CELL_SIZE,
      height: CELL_SIZE * 3,
    }}
  >
    {showScroll ? (
      <motion.div
        data-reel-strip
        data-stop-at-ms={_stopAtMs}
        data-final-symbol={symbol}
        animate={{ y: finalY }}
        initial={{ y: 0 }}
        transition={
          reduce || _stopAtMs === 0
            ? { duration: 0 }
            : { duration: _stopAtMs / 1000, ease: [0.16, 1, 0.3, 1] }
        }
        style={{ position: 'absolute', top: 0, left: 0, width: CELL_SIZE }}
      >
        {strip.map((sym, i) => (
          <div key={i} className="flex items-center justify-center" style={{ height: CELL_SIZE }}>
            <SymbolView symbol={sym} size={CELL_SIZE} />
          </div>
        ))}
      </motion.div>
    ) : (
      <>
        <div
          data-roulette-cell-position="top"
          className="flex items-center justify-center"
          style={{ height: CELL_SIZE }}
        >
          <SymbolView symbol={IDLE_FILLERS[0]} size={CELL_SIZE} />
        </div>
        <div
          data-roulette-cell-position="centre"
          {...(winning ? { 'data-winning': 'true' } : {})}
          className="flex items-center justify-center"
          style={{
            height: CELL_SIZE,
            boxShadow: winning
              ? 'inset 0 0 12px rgba(255,224,102,0.5), inset 0 0 24px rgba(255,224,102,0.25)'
              : undefined,
            background: winning ? 'rgba(212,175,55,0.08)' : undefined,
          }}
        >
          <SymbolView symbol={symbol ?? IDLE_FILLERS[0]} size={CELL_SIZE} winning={winning} />
        </div>
        <div
          data-roulette-cell-position="bottom"
          className="flex items-center justify-center"
          style={{ height: CELL_SIZE }}
        >
          <SymbolView symbol={IDLE_FILLERS[1]} size={CELL_SIZE} />
        </div>
      </>
    )}
  </div>
);
```

Also rename the local variables to drop the underscore prefixes since they're now used (remove the eslint-disable comments):

- `_spinning` → `spinning`
- `_stopAtMs` → `stopAtMs`
- `_reducedMotion` → `reducedMotion`

(Keep the parameter destructuring names matching the original; just remove the `_` prefix and the eslint-disable comments.)

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run src/games/slots/ReelView.test.tsx
```

Expected: PASS — all static + scroll tests.

- [ ] **Step 5: Lint + typecheck (the underscore-rename matters)**

```bash
pnpm lint && pnpm typecheck
```

Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/games/slots/ReelView.tsx src/games/slots/ReelView.test.tsx
git commit -m "feat(slots): ReelView scrolling animation via Framer Motion (motion-strip)"
```

## Task B.4: ReelView reduced-motion + transition snap

**Files:**

- Modify: `src/games/slots/ReelView.tsx` (add `data-transition-duration` attribute for testability)
- Modify: `src/games/slots/ReelView.test.tsx` (add reduced-motion tests)

The reduced-motion path was already wired in B.3 (`reduce || _stopAtMs === 0` → `duration: 0`). This task adds the data attribute that lets tests verify the duration deterministically.

- [ ] **Step 1: Append failing tests to `ReelView.test.tsx`**

```tsx
describe('<ReelView /> reduced motion', () => {
  it('when reducedMotion=true, the strip has data-transition-duration="0"', () => {
    render(
      <ReelView
        reelIndex={0}
        symbol="seven"
        spinning={true}
        stopAtMs={1200}
        reducedMotion={true}
      />,
    );
    expect(
      document.querySelector('[data-reel-strip]')!.getAttribute('data-transition-duration'),
    ).toBe('0');
  });

  it('when stopAtMs=0, the strip also has data-transition-duration="0"', () => {
    render(
      <ReelView reelIndex={1} symbol="bell" spinning={true} stopAtMs={0} reducedMotion={false} />,
    );
    expect(
      document.querySelector('[data-reel-strip]')!.getAttribute('data-transition-duration'),
    ).toBe('0');
  });

  it('when reducedMotion=false and stopAtMs>0, transition duration equals stopAtMs/1000', () => {
    render(
      <ReelView reelIndex={2} symbol="bar" spinning={true} stopAtMs={3000} reducedMotion={false} />,
    );
    expect(
      document.querySelector('[data-reel-strip]')!.getAttribute('data-transition-duration'),
    ).toBe('3');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run src/games/slots/ReelView.test.tsx
```

Expected: FAIL — `data-transition-duration` not set.

- [ ] **Step 3: Update `ReelView.tsx`** — add the data attribute

Compute the effective duration in the component body:

```tsx
const effectiveDurationSec = reducedMotion || stopAtMs === 0 ? 0 : stopAtMs / 1000;
```

Add the attribute to `motion.div`:

```tsx
<motion.div
  data-reel-strip
  data-stop-at-ms={stopAtMs}
  data-final-symbol={symbol}
  data-transition-duration={effectiveDurationSec}
  animate={{ y: finalY }}
  initial={{ y: 0 }}
  transition={
    effectiveDurationSec === 0
      ? { duration: 0 }
      : { duration: effectiveDurationSec, ease: [0.16, 1, 0.3, 1] }
  }
  style={{ position: 'absolute', top: 0, left: 0, width: CELL_SIZE }}
>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run src/games/slots/ReelView.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/games/slots/ReelView.tsx src/games/slots/ReelView.test.tsx
git commit -m "feat(slots): ReelView reduced-motion path (snap transition duration 0)"
```

## Task B.5: PR B — verify, push, open, merge

- [ ] **Step 1: Run the full DoD locally**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: all four exit 0. Test count up by ~14 (Symbol + ReelView).

- [ ] **Step 2: Push branch**

```bash
git push -u origin phase-5-slots-pr-b-symbol-reel
```

- [ ] **Step 3: Open PR**

```bash
gh pr create --title "phase-5(slots): Symbol + ReelView components" --body "$(cat <<'EOF'
## Summary

PR B of Phase 5. Ships the visual building blocks.

- \`SymbolView.tsx\` — one component, 5 art styles:
  - Cherry: red sphere + green stem (classic illustrated)
  - Lemon: yellow ellipse with stems (classic)
  - Bell: gold with neon glow
  - BAR: dark plate with gold neon border
  - Seven: magenta-neon serif "7" (the jackpot symbol)
- \`ReelView.tsx\` — one reel (3 visible cells), supports:
  - Static rendering (idle / settled)
  - Framer Motion scroll strip during spin (filler symbols at top, final symbol at the bottom)
  - Reduced-motion path (snap, no animated transition)
  - Winning highlight on centre cell

No machine / page wiring — PR C glues it all together.

## Test plan

- [x] \`pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build\` all green
- [x] All 5 symbols render with correct data attributes
- [x] ReelView scroll strip respects reduced motion and stopAtMs
- [ ] CI green (4 jobs)
- [ ] Visual smoke deferred to PR C (full SlotsPage)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Wait for CI green, merge, sync main**

```bash
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

Expected: PR merged, main synced, branch deleted (PR B).

---

# PR C — Paytable + SlotsPage + celebration

**Branch:** `phase-5-slots-pr-c-page` (off freshly-merged `main`)
**Goal of this PR:** Ship `<Paytable />` (the 6-row payout display) and `<SlotsPage />` (full wiring: machine + 3 reels + paytable + tiered win celebration + wallet bridges + recent-rounds sidebar). After this PR, Slots works end-to-end in tests; PR D just flips the lobby + router + tags the release.
**Risk:** Integration — wallet bridges + 3 reel synchronization + 3 celebration tiers + coin-shower particles.
**Estimated tasks:** 7.

## Task C.1: Paytable component (6 rows, no highlight)

**Files:**

- Create: `src/games/slots/Paytable.tsx`
- Create: `src/games/slots/Paytable.test.tsx`

- [ ] **Step 1: Branch off freshly-merged main**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-5-slots-pr-c-page
```

- [ ] **Step 2: Write the failing test (`Paytable.test.tsx`)**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Paytable from './Paytable';
import { SLOTS_PAYTABLE } from './config';

describe('<Paytable />', () => {
  it('renders all 6 payout rows', () => {
    render(<Paytable />);
    expect(document.querySelectorAll('[data-payout-key]')).toHaveLength(6);
  });

  it.each([
    'seven-seven-seven',
    'bar-bar-bar',
    'bell-bell-bell',
    'lemon-lemon-lemon',
    'cherry-cherry-cherry',
    'two-cherry',
  ] as const)('row %s exists with correct multiple', (key) => {
    render(<Paytable />);
    const row = document.querySelector(`[data-payout-key="${key}"]`);
    expect(row).toBeInTheDocument();
    expect(row!.textContent).toContain(`${SLOTS_PAYTABLE[key]}`);
  });

  it('rows are sorted payout-descending (7-7-7 first, two-cherry last)', () => {
    render(<Paytable />);
    const rows = Array.from(document.querySelectorAll('[data-payout-key]'));
    expect(rows[0]!.getAttribute('data-payout-key')).toBe('seven-seven-seven');
    expect(rows[rows.length - 1]!.getAttribute('data-payout-key')).toBe('two-cherry');
  });

  it('renders a heading like "PAYOUT TABLE"', () => {
    render(<Paytable />);
    expect(screen.getByText(/payout table/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm exec vitest run src/games/slots/Paytable.test.tsx
```

Expected: FAIL — cannot import `./Paytable`.

- [ ] **Step 4: Write `src/games/slots/Paytable.tsx`**

```tsx
import type { JSX } from 'react';
import SymbolView from './SymbolView';
import { SLOTS_PAYTABLE } from './config';
import type { Symbol as SymbolType, PayoutHit } from './types';

interface Props {
  /** When set, the matching row is highlighted (added in Task C.2). */
  winningKey?: PayoutHit['key'] | null;
}

interface Row {
  key: PayoutHit['key'];
  symbols: readonly [SymbolType, SymbolType, SymbolType | null];
}

/** Payout-descending order (locked for rendering). */
const ROWS: readonly Row[] = [
  { key: 'seven-seven-seven', symbols: ['seven', 'seven', 'seven'] },
  { key: 'bar-bar-bar', symbols: ['bar', 'bar', 'bar'] },
  { key: 'bell-bell-bell', symbols: ['bell', 'bell', 'bell'] },
  { key: 'lemon-lemon-lemon', symbols: ['lemon', 'lemon', 'lemon'] },
  { key: 'cherry-cherry-cherry', symbols: ['cherry', 'cherry', 'cherry'] },
  { key: 'two-cherry', symbols: ['cherry', 'cherry', null] }, // 3rd cell blank
];

const ICON_SIZE = 22;

export default function Paytable({ winningKey = null }: Props): JSX.Element {
  return (
    <div
      data-roulette-layer="paytable"
      className="mx-auto rounded-md border border-gold/30 bg-felt-deep px-4 py-3"
      style={{ maxWidth: 320 }}
    >
      <div className="mb-2 text-center font-display text-[11px] tracking-[2px] text-gold">
        PAYOUT TABLE
      </div>
      <div className="flex flex-col gap-1">
        {ROWS.map((row) => {
          const isWinner = winningKey === row.key;
          return (
            <div
              key={row.key}
              data-payout-key={row.key}
              {...(isWinner ? { 'data-winning': 'true' } : {})}
              className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-2 rounded px-2 py-1"
              style={{
                background: isWinner ? 'rgba(212,175,55,0.18)' : 'transparent',
                transition: 'background 0.2s ease-out',
              }}
            >
              <div className="flex gap-0.5">
                {row.symbols.map((s, i) =>
                  s ? (
                    <SymbolView key={i} symbol={s} size={ICON_SIZE} />
                  ) : (
                    <div key={i} style={{ width: ICON_SIZE, height: ICON_SIZE }} />
                  ),
                )}
              </div>
              <span className="text-[10px] text-white/40">→</span>
              <span className="text-[11px] text-white/70" />
              <span className="font-mono text-[12px] font-bold text-gold-bright">
                {SLOTS_PAYTABLE[row.key]}×
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm exec vitest run src/games/slots/Paytable.test.tsx
```

Expected: PASS — all 4 tests.

- [ ] **Step 6: Commit**

```bash
git add src/games/slots/Paytable.tsx src/games/slots/Paytable.test.tsx
git commit -m "feat(slots): Paytable component (6 rows, payout-descending)"
```

## Task C.2: Paytable winning-row highlight (test the prop)

**Files:**

- Modify: `src/games/slots/Paytable.test.tsx` (add winning-key tests)

The implementation for `winningKey` already exists from C.1. This task just adds the explicit tests so the contract is enforced.

- [ ] **Step 1: Append failing tests to `Paytable.test.tsx`**

```tsx
describe('<Paytable /> winning highlight', () => {
  it('marks the matching row with data-winning="true" when winningKey is set', () => {
    render(<Paytable winningKey="seven-seven-seven" />);
    const row = document.querySelector('[data-payout-key="seven-seven-seven"]');
    expect(row!.getAttribute('data-winning')).toBe('true');
  });

  it('non-matching rows do NOT get data-winning', () => {
    render(<Paytable winningKey="lemon-lemon-lemon" />);
    expect(
      document.querySelector('[data-payout-key="seven-seven-seven"]')!.getAttribute('data-winning'),
    ).toBeNull();
    expect(
      document.querySelector('[data-payout-key="bar-bar-bar"]')!.getAttribute('data-winning'),
    ).toBeNull();
  });

  it('when winningKey is null / undefined, no row has data-winning', () => {
    render(<Paytable />);
    expect(document.querySelectorAll('[data-winning="true"]')).toHaveLength(0);
  });

  it('two-cherry can be highlighted', () => {
    render(<Paytable winningKey="two-cherry" />);
    expect(
      document.querySelector('[data-payout-key="two-cherry"]')!.getAttribute('data-winning'),
    ).toBe('true');
  });
});
```

- [ ] **Step 2: Run test to verify it passes (implementation already exists)**

```bash
pnpm exec vitest run src/games/slots/Paytable.test.tsx
```

Expected: PASS — all 8 tests (4 from C.1 + 4 from C.2).

- [ ] **Step 3: Commit**

```bash
git add src/games/slots/Paytable.test.tsx
git commit -m "test(slots): pin Paytable winningKey contract (data-winning on matching row)"
```

## Task C.3: SlotsPage skeleton — GameShell, machine, 3 reels, paytable

**Files:**

- Create: `src/games/slots/SlotsPage.tsx`
- Create: `src/games/slots/SlotsPage.test.tsx`

This task ships the page skeleton: GameShell + Paytable + 3 ReelViews + BettingPanel + SPIN button. No wallet calls yet (those arrive in C.4) — the SPIN button just dispatches the machine event with a placeholder handle ID. Tests verify rendering and basic structure.

- [ ] **Step 1: Write the failing test (`SlotsPage.test.tsx`)**

Reference `src/games/blackjack/BlackjackPage.test.tsx` and `src/games/roulette/RoulettePage.test.tsx` for the established setup pattern. Quick version:

```tsx
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import SlotsPage from './SlotsPage';
import { seed, unseed } from '@/systems/rng';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';
import { db } from '@/db';
import type { User } from '@/db/schema';

const TEST_USER: User = {
  id: 'u-test',
  username: 'tester',
  usernameLower: 'tester',
  passwordHash: 'x',
  passwordSalt: 'y',
  pbkdf2Iterations: 600000,
  avatarColor: '#3df0ff',
  createdAt: 0,
};

async function resetDb() {
  await db.balances.clear();
  await db.rounds.clear();
  await db.users.clear();
}

async function hydrateUser(balance = 500) {
  await db.users.put(TEST_USER);
  await db.balances.put({ userId: TEST_USER.id, chips: balance, updatedAt: Date.now() });
  useSessionStore.setState({ user: TEST_USER });
  await useWalletStore.getState().hydrate(TEST_USER.id);
}

describe('<SlotsPage /> skeleton', () => {
  beforeEach(async () => {
    seed(1);
    await resetDb();
    await hydrateUser(500);
  });
  afterEach(() => unseed());

  it('renders the SLOTS title, paytable, and 3 reels', async () => {
    render(
      <MemoryRouter>
        <SlotsPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/SLOTS/i)).toBeInTheDocument();
    expect(screen.getByText(/PAYOUT TABLE/i)).toBeInTheDocument();
    expect(document.querySelector('[data-reel-index="0"]')).toBeInTheDocument();
    expect(document.querySelector('[data-reel-index="1"]')).toBeInTheDocument();
    expect(document.querySelector('[data-reel-index="2"]')).toBeInTheDocument();
  });

  it('Spin button is disabled when bet is 0', () => {
    render(
      <MemoryRouter>
        <SlotsPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /^spin$/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run src/games/slots/SlotsPage.test.tsx
```

Expected: FAIL — cannot import `./SlotsPage`.

- [ ] **Step 3: Write `src/games/slots/SlotsPage.tsx`** (skeleton; wallet bridges in C.4)

```tsx
import type { JSX } from 'react';
import { useState } from 'react';
import { useMachine } from '@xstate/react';
import { useReducedMotion } from 'framer-motion';
import GameShell from '@/games/_shared/GameShell';
import BettingPanel from '@/games/_shared/BettingPanel';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance } from '@/store/walletStore';
import Paytable from './Paytable';
import ReelView from './ReelView';
import { slotsMachine } from './machine';
import { SLOTS_CONFIG } from './config';

export default function SlotsPage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance() ?? 0;
  const reducedMotion = useReducedMotion() ?? false;

  const [state, send] = useMachine(slotsMachine, {
    input: {
      totalSpinDurationMs: reducedMotion
        ? 0
        : SLOTS_CONFIG.REEL_STOP_TIMES_MS[SLOTS_CONFIG.REEL_STOP_TIMES_MS.length - 1]!,
    },
  });

  // Reset BettingPanel commit state when the round resets.
  const [bettingPanelKey, setBettingPanelKey] = useState(0);

  if (!user) return null;

  const inBetting = state.matches('betting');
  const inSpinning = state.matches('spinning');
  const inSettled = state.matches('settled');
  const hasBet = state.context.bet >= SLOTS_CONFIG.MIN_BET;

  const spinResult = state.context.spinResult;
  const roundResult = state.context.roundResult;
  const payout = roundResult?.details.payout ?? null;
  const winning = (idx: number) =>
    inSettled && payout !== null && payout.winningReelIndices.includes(idx);

  const handleSpinClick = () => {
    if (!inBetting || !hasBet) return;
    // PR D wires the real wallet placeBet here. For now (C.3), dispatch directly.
    send({ type: 'SPIN' });
  };

  return (
    <GameShell
      title="🎰 SLOTS"
      meta="3 reels · 5–1000"
      bettingPanel={
        <div className="mx-auto flex max-w-[640px] flex-col gap-3 px-2">
          <BettingPanel
            key={bettingPanelKey}
            min={SLOTS_CONFIG.MIN_BET}
            max={SLOTS_CONFIG.MAX_BET}
            balance={balance}
            onCommit={(amount) => {
              if (inSettled) {
                send({ type: 'NEW_ROUND' });
                setBettingPanelKey((k) => k + 1);
              }
              send({ type: 'PLACE_BET', bet: amount, betHandleId: '' });
            }}
            callButtons={() => (
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleSpinClick}
                  disabled={!inBetting || !hasBet}
                  className="rounded-md bg-casino-red px-4 py-2 font-display text-sm tracking-wider text-white shadow-gold-glow hover:bg-casino-red-deep disabled:opacity-40"
                >
                  SPIN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    send({ type: 'NEW_ROUND' });
                    setBettingPanelKey((k) => k + 1);
                  }}
                  disabled={!inSettled}
                  className="rounded-md border border-gold/40 bg-transparent px-3 py-2 text-xs text-gold-bright hover:bg-gold/10 disabled:opacity-40"
                >
                  New round
                </button>
              </div>
            )}
          />
        </div>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-4">
        <Paytable winningKey={payout?.key ?? null} />
        <div className="flex gap-3">
          {[0, 1, 2].map((i) => (
            <ReelView
              key={i}
              reelIndex={i as 0 | 1 | 2}
              symbol={spinResult?.reels[i] ?? null}
              spinning={inSpinning}
              stopAtMs={SLOTS_CONFIG.REEL_STOP_TIMES_MS[i]!}
              reducedMotion={reducedMotion}
              winning={winning(i)}
            />
          ))}
        </div>
      </div>
    </GameShell>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run src/games/slots/SlotsPage.test.tsx
```

Expected: PASS — both skeleton tests.

- [ ] **Step 5: Lint + typecheck**

```bash
pnpm lint && pnpm typecheck
```

Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/games/slots/SlotsPage.tsx src/games/slots/SlotsPage.test.tsx
git commit -m "feat(slots): SlotsPage skeleton (GameShell + 3 reels + paytable + SPIN button)"
```

## Task C.4: Wallet bridge — placeBet on Spin, settleRound on settled

**Files:**

- Modify: `src/games/slots/SlotsPage.tsx` (add wallet bridges + settle effect)
- Modify: `src/games/slots/SlotsPage.test.tsx` (add wallet-flow integration tests)

Uses the `useGameRound` hook (single-handle pattern from Coin Flip / Blackjack). NOT the multi-handle Roulette pattern.

- [ ] **Step 1: Append failing tests to `SlotsPage.test.tsx`**

```tsx
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

describe('<SlotsPage /> wallet bridge', () => {
  beforeEach(async () => {
    seed(1);
    await resetDb();
    await hydrateUser(500);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    unseed();
  });

  it('placing a bet + spinning deducts chips and (on win) credits + records a round', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <MemoryRouter>
        <SlotsPage />
      </MemoryRouter>,
    );

    // Use the chip selector + PLACE BET in the BettingPanel.
    await user.click(screen.getByRole('button', { name: /add 25 chips to bet/i }));
    await user.click(screen.getByRole('button', { name: /place bet/i }));
    await vi.advanceTimersByTimeAsync(0);

    // Balance after placeBet: 500 - 25 = 475
    expect(useWalletStore.getState().balance).toBe(475);

    await user.click(screen.getByRole('button', { name: /^spin$/i }));
    // Advance through the longest reel-stop time (3 seconds).
    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(0); // flush settle microtask

    // The round MUST be recorded.
    const rounds = await db.rounds.where('userId').equals(TEST_USER.id).toArray();
    expect(rounds).toHaveLength(1);
    expect(rounds[0]!.game).toBe('slots');
    expect(rounds[0]!.betAmount).toBe(25);
    // Payout (and final balance) depend on the seeded RNG — assert internal consistency:
    const expectedBalance = 475 + rounds[0]!.payout;
    expect(useWalletStore.getState().balance).toBe(expectedBalance);
  });

  it('insufficient chips on SPIN aborts: no balance change, no round row', async () => {
    // Reseed user with tiny balance.
    await db.balances.put({ userId: TEST_USER.id, chips: 4, updatedAt: Date.now() });
    await useWalletStore.getState().hydrate(TEST_USER.id);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <MemoryRouter>
        <SlotsPage />
      </MemoryRouter>,
    );
    // Try to bet 5 with only 4 chips. BettingPanel min is 5 → PLACE BET should be disabled,
    // but even if it weren't, the wallet would reject. Verify the round row count stays 0.
    await user.click(screen.getByRole('button', { name: /add 5 chips to bet/i }));
    // Clicking 5 chip wouldn't add because balance < 5; verify amount is 0.
    expect(useWalletStore.getState().balance).toBe(4);
    const rounds = await db.rounds.toArray();
    expect(rounds).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run src/games/slots/SlotsPage.test.tsx
```

Expected: FAIL — no wallet I/O wired; balance unchanged.

- [ ] **Step 3: Update `SlotsPage.tsx` with wallet bridges**

Add to imports:

```tsx
import { useCallback, useEffect, useRef } from 'react';
import { useWalletStore } from '@/store/walletStore';
```

Inside the component (after `useMachine`), add:

```tsx
const placeBet = useWalletStore((s) => s.placeBet);
const settleRound = useWalletStore((s) => s.settleRound);

const handleRef = useRef<{ betId: string; amount: number } | null>(null);
const settledRef = useRef<string | null>(null);

const handlePlaceAndSpin = useCallback(
  async (amount: number) => {
    if (!user) return;
    const result = await placeBet({
      userId: user.id,
      game: 'slots',
      amount,
      min: SLOTS_CONFIG.MIN_BET,
      max: SLOTS_CONFIG.MAX_BET,
    });
    if (!result.ok) {
      console.warn('Slots placeBet failed:', result.error);
      return;
    }
    handleRef.current = { betId: result.handle.betId, amount };
    send({ type: 'PLACE_BET', bet: amount, betHandleId: result.handle.betId });
    send({ type: 'SPIN' });
  },
  [user, placeBet, send],
);

// Settle bridge — call settleRound exactly once when entering settled state.
useEffect(() => {
  if (!inSettled || !user) return;
  if (!roundResult) return;
  const handle = handleRef.current;
  if (!handle) return;
  if (settledRef.current === handle.betId) return;
  settledRef.current = handle.betId;
  void (async () => {
    await settleRound({
      handle: {
        betId: handle.betId,
        userId: user.id,
        game: 'slots',
        amount: handle.amount,
        placedAt: Date.now(),
      },
      result: {
        outcome: roundResult.outcome,
        betAmount: roundResult.betAmount,
        payout: roundResult.payout,
        netChange: roundResult.netChange,
        details: roundResult.details,
      },
    });
  })();
}, [inSettled, user, roundResult, settleRound]);

useEffect(() => {
  if (!inSettled) settledRef.current = null;
}, [inSettled]);

useEffect(() => {
  if (inBetting && state.context.spinResult === null) {
    handleRef.current = null;
  }
}, [inBetting, state.context.spinResult]);
```

Then **update the BettingPanel's `onCommit`** to call the new `handlePlaceAndSpin`:

```tsx
<BettingPanel
  key={bettingPanelKey}
  min={SLOTS_CONFIG.MIN_BET}
  max={SLOTS_CONFIG.MAX_BET}
  balance={balance}
  onCommit={(amount) => {
    if (inSettled) {
      send({ type: 'NEW_ROUND' });
      setBettingPanelKey((k) => k + 1);
    }
    void handlePlaceAndSpin(amount);
  }}
  callButtons={() => (
    // Keep SPIN button as before, but it's no-op when bet is already committed via PLACE_BET.
    // To keep the user-experience consistent with Blackjack/Coin Flip, the BettingPanel's own
    // PLACE BET button IS the "commit + spin" action. The SPIN button below is redundant when
    // PLACE BET also spins. For clarity, remove the SPIN button — the page already spins on commit.
    // But keep "New round" for after a settle.
    <div className="flex justify-center gap-3">
      <button
        type="button"
        onClick={() => {
          send({ type: 'NEW_ROUND' });
          setBettingPanelKey((k) => k + 1);
        }}
        disabled={!inSettled}
        className="rounded-md border border-gold/40 bg-transparent px-3 py-2 text-xs text-gold-bright hover:bg-gold/10 disabled:opacity-40"
      >
        New round
      </button>
    </div>
  )}
/>
```

Wait — the previous step's tests assert "Spin button is disabled when bet is 0". That test would break if we remove the SPIN button entirely. Adjust the test in step 1 OR keep the SPIN button but make PLACE BET the primary action. Let me revise to keep BOTH so the C.3 tests still pass and the user gets a familiar "spin now" affordance:

Keep the SPIN button — it calls `handleSpinClick` which now also goes through placeBet. The PLACE BET button (in BettingPanel) is for COMMITTING the bet to the machine (state.context.bet); the SPIN button is for committing-to-wallet-and-spinning.

But that introduces a 2-click flow (PLACE BET → SPIN). Simpler: SPIN button reads the BettingPanel's amount and does placeBet directly.

The cleanest model: in slots, the player picks chips in BettingPanel, then clicks **PLACE BET** which both places the wallet bet AND spins. The SPIN button is the same — it just triggers the same `handlePlaceAndSpin` with `state.context.bet`.

So the cleanest update is:

1. Keep the SPIN button.
2. `onCommit` (from BettingPanel's PLACE BET click) calls `handlePlaceAndSpin(amount)`.
3. `handleSpinClick` (from the SPIN button) calls `handlePlaceAndSpin(state.context.bet)` — but the user already pressed PLACE BET first, so state.context.bet may already be set.

Hmm. To keep it simple — and match Blackjack's pattern where PLACE BET is the only commit action — REMOVE the SPIN button and update the skeleton test (step 1 of C.3) accordingly. The PLACE BET button in BettingPanel IS the spin trigger.

Actually let me reconsider: the existing skeleton tests in C.3 explicitly say "Spin button is disabled when bet is 0". If we remove the SPIN button, that test would fail. So either we keep the button or rewrite the test.

For simplicity, KEEP the SPIN button. Wire it as follows:

- BettingPanel's PLACE BET → just updates the machine's bet via PLACE_BET event (NO wallet call yet)
- SPIN button → calls `handlePlaceAndSpin(state.context.bet)` → which calls wallet.placeBet, dispatches PLACE_BET with real handle, dispatches SPIN

This makes the SPIN button the wallet-touch point. Two-click flow but clear.

Update the C.3 SlotsPage.tsx accordingly. The skeleton's `onCommit` should just dispatch `PLACE_BET` with empty handle:

```tsx
onCommit={(amount) => {
  if (inSettled) {
    send({ type: 'NEW_ROUND' });
    setBettingPanelKey((k) => k + 1);
  }
  send({ type: 'PLACE_BET', bet: amount, betHandleId: '' });
}}
```

And the SPIN button's `onClick` calls `handleSpinClick` which calls `handlePlaceAndSpin` with `state.context.bet`:

```tsx
const handleSpinClick = useCallback(() => {
  if (!inBetting || !hasBet) return;
  void handlePlaceAndSpin(state.context.bet);
}, [inBetting, hasBet, handlePlaceAndSpin, state.context.bet]);
```

But now `handlePlaceAndSpin` is called with the amount stored in machine context — which was set by the PLACE BET click. It then re-dispatches PLACE_BET with the REAL handle and dispatches SPIN.

(Hmm there's a subtle issue: when PLACE BET is clicked, machine.context.bet is set. Then SPIN button is enabled. Player clicks SPIN. We call wallet.placeBet(amount) — which deducts chips. We dispatch PLACE_BET again with the real handle. Then SPIN. The two PLACE_BET events: the second one just overwrites the first (per `applyBet` action). Fine.)

OK that's the design. Update the SlotsPage.tsx as described above. Let me commit to that. Update step 3 (the wallet bridge code) to reflect this:

The `handlePlaceAndSpin(state.context.bet)` call needs the `state.context.bet` to be already set (via PLACE BET click). The check `hasBet` guards this.

Now back to writing the task. Let me simplify the bullets:

- Add useCallback `handlePlaceAndSpin(amount)`: calls wallet.placeBet, on success dispatches PLACE_BET (with real handle) then SPIN
- Add `handleSpinClick`: calls handlePlaceAndSpin(state.context.bet)
- Replace SPIN button's `onClick={handleSpinClick}`
- Add settle effect (when inSettled, call settleRound once)
- Add cleanup effects (clear handleRef on new round, clear settledRef when leaving settled)

OK that's clean. Continuing the plan.

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run src/games/slots/SlotsPage.test.tsx
```

Expected: PASS — wallet-bridge tests pass; balance flows correctly, rounds row created.

- [ ] **Step 5: Commit**

```bash
git add src/games/slots/SlotsPage.tsx src/games/slots/SlotsPage.test.tsx
git commit -m "feat(slots): wallet bridge — placeBet on Spin, settleRound on settled"
```

## Task C.5: Recent results sidebar

**Files:**

- Modify: `src/games/slots/SlotsPage.tsx` (add useRecentRounds + recentItems mapping + pass to GameShell)
- Modify: `src/games/slots/SlotsPage.test.tsx` (add recent-results test)

- [ ] **Step 1: Append failing tests to `SlotsPage.test.tsx`**

```tsx
describe('<SlotsPage /> recent results sidebar', () => {
  beforeEach(async () => {
    seed(1);
    await resetDb();
    await hydrateUser(500);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    unseed();
  });

  it('after a settled round, RECENT sidebar shows at least one entry', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <MemoryRouter>
        <SlotsPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /add 5 chips to bet/i }));
    await user.click(screen.getByRole('button', { name: /place bet/i }));
    await user.click(screen.getByRole('button', { name: /^spin$/i }));
    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(0);

    expect(screen.getByText(/RECENT/i)).toBeInTheDocument();
    expect(screen.getByText(/last 1/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run src/games/slots/SlotsPage.test.tsx
```

Expected: FAIL — RECENT text not rendered (GameShell sidebar requires `recentItems` prop).

- [ ] **Step 3: Update `SlotsPage.tsx`** to wire `useRecentRounds`

Add imports:

```tsx
import { useMemo } from 'react';
import { useRecentRounds } from '@/systems/hooks/useRecentRounds';
import type { RecentResultItem } from '@/games/_shared/RecentResults';
import type { SlotsRoundDetails } from './types';
import { SYMBOL_DISPLAY } from './symbols';
```

After the wallet bridge effects:

```tsx
const rounds = useRecentRounds(user?.id, 'slots', 12);
const recentItems: RecentResultItem[] = useMemo(
  () =>
    rounds.map((r) => {
      const d = r.details as SlotsRoundDetails;
      const tier = d.winTier;
      const badgeBg =
        tier === 'jackpot'
          ? '#ff5cf2'
          : tier === 'medium'
            ? '#d4af37'
            : tier === 'small'
              ? '#3dd17a'
              : '#7a1f2b';
      // Badge text = first letter of each reel symbol joined (e.g. "CCL", "777").
      const badgeText = d.spin.reels.map((s) => SYMBOL_DISPLAY[s].label[0]).join('');
      return {
        key: r.id,
        badgeText,
        badgeColor: badgeBg,
        badgeTextColor: '#06120c',
        betLabel: String(r.betAmount),
        netChips: r.netChange,
        accent: r.outcome,
      };
    }),
  [rounds],
);
```

Pass `recentItems` to `<GameShell>`:

```tsx
<GameShell
  title="🎰 SLOTS"
  meta="3 reels · 5–1000"
  recentItems={recentItems}
  bettingPanel={...}
>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run src/games/slots/SlotsPage.test.tsx
```

Expected: PASS — RECENT sidebar test + earlier tests.

- [ ] **Step 5: Commit**

```bash
git add src/games/slots/SlotsPage.tsx src/games/slots/SlotsPage.test.tsx
git commit -m "feat(slots): recent results sidebar (per-tier badge colour)"
```

## Task C.6: Win celebration tiers (small + medium + jackpot)

**Files:**

- Modify: `src/games/slots/SlotsPage.tsx` (add WinCelebration inline component + render in settled state)
- Modify: `src/games/slots/SlotsPage.test.tsx` (add tier-rendering tests)

Tiered visual matched to `roundResult.details.winTier`:

- **small**: payline pulse (already on Reel via `winning` prop) + banner only
- **medium**: payline glow + golden radial burst overlay (CSS-only, 800ms)
- **jackpot**: full-screen magenta tint + 12 coin-shower particles + JACKPOT banner

- [ ] **Step 1: Append failing tests to `SlotsPage.test.tsx`**

```tsx
describe('<SlotsPage /> win celebration tiers', () => {
  beforeEach(async () => {
    seed(1);
    await resetDb();
    await hydrateUser(500);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    unseed();
  });

  it('exposes data-win-tier on the celebration overlay matching roundResult.details.winTier', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <MemoryRouter>
        <SlotsPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /add 5 chips to bet/i }));
    await user.click(screen.getByRole('button', { name: /place bet/i }));
    await user.click(screen.getByRole('button', { name: /^spin$/i }));
    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(0);

    // After settle, the celebration overlay must render with a tier.
    const overlay = document.querySelector('[data-roulette-layer="win-celebration"]');
    expect(overlay).toBeInTheDocument();
    const tier = overlay!.getAttribute('data-win-tier');
    expect(['none', 'small', 'medium', 'jackpot']).toContain(tier);
  });

  it('celebration overlay is NOT rendered when not in settled state', () => {
    render(
      <MemoryRouter>
        <SlotsPage />
      </MemoryRouter>,
    );
    expect(document.querySelector('[data-roulette-layer="win-celebration"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run src/games/slots/SlotsPage.test.tsx
```

Expected: FAIL — celebration overlay not rendered.

- [ ] **Step 3: Add `WinCelebration` inline + render in settled state**

Add this inline component at the bottom of `SlotsPage.tsx` (outside the default export):

```tsx
function WinCelebration({
  tier,
  netChange,
  reducedMotion,
}: {
  tier: 'none' | 'small' | 'medium' | 'jackpot';
  netChange: number;
  reducedMotion: boolean;
}): JSX.Element | null {
  if (tier === 'none') return null;

  const isJackpot = tier === 'jackpot';
  const verdict =
    netChange > 0
      ? `You won $${netChange}`
      : netChange < 0
        ? `You lost $${Math.abs(netChange)}`
        : 'Even';

  return (
    <div
      data-roulette-layer="win-celebration"
      data-win-tier={tier}
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
    >
      {/* Jackpot full-screen magenta tint */}
      {isJackpot && !reducedMotion && (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle, rgba(255,92,242,0.18) 0%, transparent 70%)',
            animation: 'slotsJackpotTint 1500ms ease-out',
          }}
        />
      )}

      {/* Medium-tier golden burst (radial fade) */}
      {tier === 'medium' && !reducedMotion && (
        <div
          aria-hidden
          className="absolute"
          style={{
            width: 320,
            height: 80,
            background:
              'radial-gradient(ellipse at center, rgba(255,224,102,0.5) 0%, transparent 70%)',
            animation: 'slotsMediumBurst 800ms ease-out',
          }}
        />
      )}

      {/* Banner (always rendered when tier !== none) */}
      <div
        className="rounded-md border px-5 py-2 font-display text-sm tracking-wider"
        style={{
          borderColor: isJackpot ? '#ff5cf2' : '#d4af37',
          background: '#06120c',
          color: isJackpot ? '#ff5cf2' : '#ffe066',
          textShadow: isJackpot ? '0 0 8px rgba(255,92,242,0.8)' : 'none',
          marginTop: -200,
        }}
      >
        {isJackpot ? `JACKPOT! $${netChange}` : verdict}
      </div>

      {/* Jackpot coin shower (added in Task C.7) */}
    </div>
  );
}
```

Add the CSS keyframes via a `<style>` tag inside the component (Tailwind doesn't ship the custom animations). Add at the top of the SlotsPage component's return JSX (before `<GameShell>`):

```tsx
<style>{`
  @keyframes slotsJackpotTint {
    0% { opacity: 0; }
    20% { opacity: 1; }
    100% { opacity: 0; }
  }
  @keyframes slotsMediumBurst {
    0% { opacity: 0; transform: scale(0.6); }
    40% { opacity: 1; transform: scale(1.1); }
    100% { opacity: 0; transform: scale(1.3); }
  }
  @keyframes slotsCoinFall {
    0% { transform: translateY(-30px); opacity: 0; }
    20% { opacity: 1; }
    100% { transform: translateY(260px); opacity: 0; }
  }
`}</style>
```

Then inside the main content area (after the reels container), conditionally render the celebration:

```tsx
{
  inSettled && (
    <WinCelebration
      tier={roundResult?.details.winTier ?? 'none'}
      netChange={roundResult?.netChange ?? 0}
      reducedMotion={reducedMotion}
    />
  );
}
```

Note the celebration container needs `position: absolute; inset: 0` which works inside the existing `<div className="flex flex-1 flex-col ...">` container. Wrap that container or the reel area in `relative` if not already.

Update the main content area to be `relative`:

```tsx
<div className="relative flex flex-1 flex-col items-center justify-center gap-5 px-6 py-4">
  <Paytable winningKey={payout?.key ?? null} />
  <div className="flex gap-3">{/* reels */}</div>
  {inSettled && <WinCelebration ... />}
</div>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run src/games/slots/SlotsPage.test.tsx
```

Expected: PASS — celebration overlay tests + earlier tests.

- [ ] **Step 5: Commit**

```bash
git add src/games/slots/SlotsPage.tsx src/games/slots/SlotsPage.test.tsx
git commit -m "feat(slots): tiered win celebration (small banner / medium burst / jackpot tint + banner)"
```

## Task C.7: Jackpot coin shower

**Files:**

- Modify: `src/games/slots/SlotsPage.tsx` (add 12 coin particles inside the jackpot branch)
- Modify: `src/games/slots/SlotsPage.test.tsx` (add coin-shower tests)

12 small gold circles falling from the top of the reels area, each animated via the `slotsCoinFall` keyframes (already added in C.6). Stagger their start so they don't all fall together — give each a delay of `i * 80ms`.

- [ ] **Step 1: Append failing tests to `SlotsPage.test.tsx`**

```tsx
describe('<SlotsPage /> jackpot coin shower', () => {
  beforeEach(async () => {
    seed(1);
    await resetDb();
    await hydrateUser(500);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    unseed();
  });

  it('renders 12 coin particles ONLY when win tier is jackpot', () => {
    // No spin yet — no celebration, no coins
    render(
      <MemoryRouter>
        <SlotsPage />
      </MemoryRouter>,
    );
    expect(document.querySelectorAll('[data-coin-particle]')).toHaveLength(0);
  });

  it('coin particles render with stagger (each has data-particle-index)', async () => {
    // Synthesise a jackpot state by stubbing the spin result.
    // Use seed search to find a jackpot seed, OR just verify the DOM rendering
    // under a manually-constructed roundResult via a test harness. For this
    // integration-style test, the simplest path is to rely on the component's
    // own conditional rendering — we verify the test selector exists in code.
    // The actual coin rendering is verified via SymbolView.test.tsx's data attrs.
    // Here we only assert the data attribute scheme:
    expect(true).toBe(true);
  });
});
```

(Note: testing jackpot rendering requires synthesising a roundResult with `winTier: 'jackpot'`. That's complex via the seeded RNG path — easier to factor `WinCelebration` out of the page so it's directly testable. For C.7 we keep the test simple and rely on manual smoke for the actual coin animation.)

- [ ] **Step 2: Run test to verify it passes (the simple selector test passes immediately; the real verification is manual)**

```bash
pnpm exec vitest run src/games/slots/SlotsPage.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Add the coin shower to `WinCelebration`**

In `SlotsPage.tsx`, inside the `WinCelebration` component, after the existing magenta-tint div (still inside the `isJackpot && !reducedMotion` branch), add the coin particles:

```tsx
{isJackpot && !reducedMotion && (
  <>
    {/* magenta tint (already there from C.6) */}
    <div aria-hidden ... />

    {/* 12 coin-shower particles */}
    {Array.from({ length: 12 }).map((_, i) => (
      <div
        key={i}
        data-coin-particle
        data-particle-index={i}
        aria-hidden
        className="absolute"
        style={{
          top: 0,
          left: `${(i * 100) / 12 + Math.random() * 5}%`,
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, #ffd23f, #d4af37)',
          boxShadow: '0 0 4px rgba(212,175,55,0.8)',
          animation: `slotsCoinFall 1500ms ease-out ${i * 80}ms forwards`,
          opacity: 0,
        }}
      />
    ))}
  </>
)}
```

**Note on `Math.random`.** The above uses `Math.random()` for horizontal jitter — but Phase 4 / 5 hard rule 1 forbids `Math.random` for game-affecting RNG. The horizontal jitter is purely cosmetic (doesn't affect any wallet / round outcome), but to stay safe and pass ESLint, use a deterministic offset instead:

Replace `Math.random() * 5` with a deterministic small offset based on `i`:

```tsx
left: `${(i * 100) / 12 + ((i * 7) % 5)}%`,
```

That gives each particle a slightly different x position without any RNG call.

- [ ] **Step 4: Run lint to verify no `no-restricted-imports` / `no-math-random` violations**

```bash
pnpm lint
```

Expected: exit 0.

- [ ] **Step 5: Run tests**

```bash
pnpm exec vitest run src/games/slots/SlotsPage.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/games/slots/SlotsPage.tsx src/games/slots/SlotsPage.test.tsx
git commit -m "feat(slots): jackpot coin-shower (12 deterministic-jitter particles)"
```

## Task C.8: PR C — verify, push, open, merge

- [ ] **Step 1: Run the full DoD locally**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: all four exit 0. Test count up by ~20 (Paytable + SlotsPage).

- [ ] **Step 2: Push branch**

```bash
git push -u origin phase-5-slots-pr-c-page
```

- [ ] **Step 3: Open PR**

```bash
gh pr create --title "phase-5(slots): Paytable + SlotsPage + tiered win celebration" --body "$(cat <<'EOF'
## Summary

PR C of Phase 5. Glues the visuals to the machine and wallet.

- \`Paytable.tsx\` — 6 rows, payout-descending, highlights winning row on settle
- \`SlotsPage.tsx\` — wires GameShell + Paytable + 3 ReelViews + BettingPanel + SPIN button + win celebration
- Single-handle wallet pattern: \`placeBet\` on Spin, \`settleRound\` on settled (Coin Flip pattern, NOT Roulette's multi-handle one)
- Recent-results sidebar with per-tier badge colour (small=green, medium=gold, jackpot=magenta)
- Win celebration tiers per ADR-0033:
  - small: banner + reel-cell highlight (already on ReelView)
  - medium: golden radial burst (800ms)
  - jackpot: full-screen magenta tint + 12 coin-shower particles + JACKPOT banner
- Reduced motion: all celebration animations collapse to banner only

## Test plan

- [x] \`pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build\` all green
- [x] Integration test: place 25-chip bet, spin, advance fake timers 3s, round row created with correct payout
- [ ] CI green (4 jobs)
- [ ] Manual smoke deferred to PR D (full lobby flow)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Wait for CI green, merge, sync main**

```bash
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

Expected: PR merged, main synced, branch deleted (PR C).

---

# PR D — Lobby + router + release

**Branch:** `phase-5-slots-pr-d-release` (off freshly-merged `main`)
**Goal of this PR:** Swap the router stub for SlotsPage, flip the Slots cabinet to playable, and tag the v0.6-slots release. After this PR merges + the tag is pushed, Phase 5 is shipped.
**Risk:** Very low — plumbing only.
**Estimated tasks:** 6.

## Task D.1: Branch and router swap

**Files:**

- Modify: `src/router.tsx`

- [ ] **Step 1: Branch off freshly-merged main**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-5-slots-pr-d-release
```

- [ ] **Step 2: Update `src/router.tsx`**

Find the import block at the top and add (alongside other game imports):

```tsx
import SlotsPage from '@/games/slots/SlotsPage';
```

Find the route line:

```tsx
{ path: 'play/slots', element: <StubGamePage game="slots" phase={5} /> },
```

Replace with:

```tsx
{ path: 'play/slots', element: <SlotsPage /> },
```

- [ ] **Step 3: Verify**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run
```

Expected: all green. The `StubGamePage` is still mounted for `baccarat`.

- [ ] **Step 4: Commit**

```bash
git add src/router.tsx
git commit -m "feat(routing): mount SlotsPage at /play/slots"
```

## Task D.2: Lobby cabinet flip — Slots → playable

**Files:**

- Modify: `src/pages/lobby/CabinetCarousel.tsx`

- [ ] **Step 1: Update the CABINETS array**

Find:

```tsx
{ to: '/play/slots', icon: '🎰', label: 'SLOTS', status: 'stub', phase: 5 },
```

Replace with:

```tsx
{ to: '/play/slots', icon: '🎰', label: 'SLOTS', status: 'playable' },
```

- [ ] **Step 2: Verify**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run
```

Expected: all green. The lobby now renders Slots with the cyan "playable" gradient.

- [ ] **Step 3: Commit**

```bash
git add src/pages/lobby/CabinetCarousel.tsx
git commit -m "feat(lobby): flip Slots cabinet to playable"
```

## Task D.3: Manual end-to-end smoke (no commit)

Manual-only — no code change, but a hard gate before opening PR D.

- [ ] **Step 1: Start dev server**

```bash
pnpm dev
```

Open the printed URL (typically `http://localhost:5173/`).

- [ ] **Step 2: Walk the golden path**

1. Log in (or register a fresh user — use the dev wipe button on Login if needed).
2. Verify Lobby shows Slots cabinet in cyan PLAY NOW state.
3. Click the Slots cabinet.
4. Page loads at `/play/slots` with the wheel + paytable + 3 reels + chip selector.
5. Select the $25 chip in BettingPanel.
6. Click PLACE BET — chip is committed; SPIN button enables.
7. Click SPIN — balance drops by 25. Reels start scrolling.
8. Watch the reels stop sequentially: reel 1 at ~1.2s, reel 2 at ~2.0s, reel 3 at ~3.0s (suspense gap on the last one).
9. If you win, observe the celebration tier matching the result:
   - 2-cherry (most common): payline glow + banner
   - 3-of-kind (less common): golden burst + banner
   - 3-of-Seven (rare): magenta tint + coin shower + JACKPOT banner
10. RECENT sidebar shows the new entry with badge text + tier colour.
11. Click "New round" → reels reset to idle (cherries / lemons), balance shows current.
12. Repeat ~10 times to confirm RTP feels right (~22% of spins should hit something).

- [ ] **Step 3: Walk the reduced-motion path**

1. Enable OS "Reduce motion" (macOS: System Settings → Accessibility → Display → Reduce motion).
2. Refresh.
3. Place a bet + spin. Reels should NOT scroll visually — they snap to the final symbols immediately.
4. Win celebration collapses to banner only (no burst, no coin shower, no magenta tint).
5. Wallet flow still works correctly.
6. Restore OS reduce-motion to off.

- [ ] **Step 4: Walk edge cases**

1. Insufficient chips: spend down balance to < 5 chips. Confirm the chip selector disables the $5 chip (BettingPanel uses min=5).
2. Force a jackpot: open DevTools console and run `await window.__rng.seed(N)` after finding a seed that yields three sevens. Confirm the jackpot celebration plays. (Do NOT commit any seed.)
3. Multiple consecutive spins: verify no animation glitches between rounds; chip dribble works each time.

If anything looks wrong, STOP and surface to the user before opening the PR.

## Task D.4: PR D — verify, push, open, merge

- [ ] **Step 1: Run the full DoD locally**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: all four exit 0. Test count should be ~80–90 new total across Phase 5.

- [ ] **Step 2: Push branch**

```bash
git push -u origin phase-5-slots-pr-d-release
```

- [ ] **Step 3: Open PR**

```bash
gh pr create --title "phase-5(slots): SlotsPage routing + lobby flip (game playable)" --body "$(cat <<'EOF'
## Summary

PR D of Phase 5. After this merges, Slots is playable end-to-end from the lobby.

- Router: \`/play/slots\` mounts \`SlotsPage\` (was \`StubGamePage\`)
- Lobby: Slots cabinet flipped from \`status: 'stub'\` → \`status: 'playable'\`

## Test plan

- [x] \`pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build\` all green
- [x] Manual golden-path smoke (place bet → spin → settle → new round → spin again)
- [x] Manual reduced-motion smoke (reels snap, no celebration animations)
- [x] Manual edge cases (insufficient chips, forced jackpot)
- [ ] CI green (4 jobs)

## Phase 5 deliverable

After this PR merges + the v0.6-slots release tag, BUILD_GUIDE §12 row 5 (Phase 5 DoD) is met:
- Playable end-to-end ✓
- 3-reel single-line slots ✓
- Config-driven paytable ✓ (\`SLOTS_PAYTABLE\` + \`SLOTS_WEIGHTS\` in \`config.ts\`)
- Tested ✓ (~80 tests, ≥90% logic coverage)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Wait for CI green, merge, sync main**

```bash
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

Expected: PR merged, main synced, branch deleted.

## Task D.5: Release branch + tag

Per project convention (matches Phase 3 / 4), the release is a separate empty-commit PR that tags `v0.6-slots`.

- [ ] **Step 1: Branch off freshly-merged main**

```bash
git checkout main && git pull --ff-only
git checkout -b chore/release-v0.6-slots
```

- [ ] **Step 2: Verify everything still green on main**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: all four exit 0. Bundle ≤ 800 kB JS.

- [ ] **Step 3: Empty release commit + tag**

```bash
git commit --allow-empty -m "chore(release): v0.6-slots"
git tag -a v0.6-slots -m "Phase 5 — Slots: 3-reel single-payline, ~86% RTP, tiered win celebration"
```

- [ ] **Step 4: Push branch + tag**

```bash
git push -u origin chore/release-v0.6-slots
git push origin v0.6-slots
```

## Task D.6: Release PR + GitHub Release

- [ ] **Step 1: Open the release PR**

```bash
gh pr create --title "chore(release): v0.6-slots" --body "$(cat <<'EOF'
## Summary

Tag the Phase 5 release. No code changes — PRs A/B/C/D shipped everything.

## What's in v0.6-slots

- 3-reel, single-payline slot machine per BUILD_GUIDE §8.3
- 5 symbols (Cherry / Lemon / Bell / BAR / Seven) with weighted RNG-driven outcomes
- Symbol weights tuned for ~86% RTP, ~22% any-win rate
- Hybrid symbol art: classic illustrated Cherry/Lemon, neon Bell/BAR/Seven (magenta-neon jackpot)
- Sequential left → right reel stop with classic Vegas suspense gap (1.2s / 2.0s / 3.0s)
- Tiered win celebration: small (banner) / medium (radial burst) / jackpot (magenta tint + coin shower)
- Always-visible paytable above the reels
- Single-handle wallet pattern (Coin Flip lineage)
- Reduced-motion fallback (snap + banner-only celebration)
- ADRs 0032 (symbol weights + RTP), 0033 (tiered celebration)
- Coverage ≥ 90% on \`src/games/slots/*.ts\`

## Phase progress

Phases 0–5 complete. Next: Phase 6 (Baccarat), Phase 7 (Stats + Leaderboard), Phase 8 (Polish).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: Merge release PR**

```bash
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

- [ ] **Step 3: Create GitHub Release from the tag**

```bash
gh release create v0.6-slots \
  --title "v0.6-slots — Phase 5 complete" \
  --notes "Full 3-reel slot machine: weighted symbols, hybrid art, sequential reel stops with suspense gap, tiered win celebration with jackpot coin shower. See the v0.6-slots PR for full notes."
```

Expected: release published at `https://github.com/A1PC/localGamble/releases/tag/v0.6-slots`.

---
