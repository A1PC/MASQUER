# Phase 4 Roulette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MASQUER Roulette game end-to-end — pure logic + XState v5 round machine + numbered wheel with spin animation + horizontal betting layout + page wiring + lobby flip — so it's fully playable from the lobby with all 10 bet types from BUILD_GUIDE §8.2 paying out correctly.

**Architecture:** Mirrors the Phase 3 (Blackjack) split-by-responsibility: `wheel.ts`/`bets.ts`/`logic.ts` are pure with ≥90% test coverage, `machine.ts` is a 3-state XState v5 machine, the visual components are isolated and individually testable, and `RoulettePage.tsx` is the only place wallet I/O happens. Result is decided by `rng.randomInt(0, 36)` before any animation starts; the wheel + ball spin are deterministic from the result. The ADR-0028 multi-handle wallet pattern is reused: one `wallet.placeBet` per bet position, one `wallet.settleRound` per round aggregating all outcomes.

**Tech Stack:** TypeScript 5, React 18, Vite 5, XState 5 (+ `@xstate/react` 6), Framer Motion 12, Tailwind 3, Vitest 2 + React Testing Library + jsdom + fake-indexeddb, pnpm 9.

**Spec:** `docs/superpowers/specs/2026-05-17-phase-4-roulette-design.md` (merged in PR #87).

**Branch model:** 4 phase PRs + 1 release PR, all targeting `main`. Each PR is independently mergeable, leaves the app in a working state, and has full CI green. Subagent-driven development; fresh subagent per task; two-stage review (spec then code) between tasks; full code review at PR boundary.

```
phase-4-roulette-pr-a-logic     →  PR A: pure logic + machine + ADRs
phase-4-roulette-pr-b-wheel     →  PR B: <Wheel /> component
phase-4-roulette-pr-c-betting   →  PR C: <BettingLayout /> + chip components
phase-4-roulette-pr-d-page      →  PR D: <RoulettePage /> + lobby flip + router
chore/release-v0.5-roulette     →  release PR (tag v0.5-roulette)
```

**Hard rules (CLAUDE.md) that apply to every task:**

1. **No `Math.random` anywhere.** Only `src/systems/rng.ts`. ESLint enforces this.
2. **Money is integers.** No floats, no `parseFloat`, no `/` without `Math.floor`/`Math.ceil`/`Math.round`.
3. **Games are sandboxed.** `src/games/roulette/**` (except `*Page.tsx`) cannot import from `@/db/*` or `@/store/*`. ESLint enforces this — do NOT add `eslint-disable`.
4. **Every round records exactly one row.** Wallet `settleRound` is called once per round; the aggregate handle pattern from ADR-0028 is used for multi-position rounds.
5. **Definition of done** for every task that touches code: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` must all pass before the task is considered complete.
6. **One PR per phase chunk.** Branch off `main`, push, open PR, wait for CI, merge into main, branch the next PR off the freshly-merged main.
7. **Commit messages:** Conventional Commits, scoped. Allowed scopes for this phase: `roulette`, `games`, `ui`, `theme`, `lobby`, `routing`, `build-guide`, `adr`, `ci`, `release`. Header ≤ 100 chars.
8. **Do not edit `CLAUDE.md`.** The user edits that themselves.

**Deviation from spec — no NEW badge.** §11 of the spec mentions "NEW badge moves from Blackjack → Roulette." Looking at `src/pages/lobby/CabinetCarousel.tsx` there is no NEW-badge concept — cabinets only have `status: 'playable' | 'stub'`. The lobby change is therefore just flipping Roulette's status from `'stub'` to `'playable'` and removing its `phase` field. No new visual element is introduced.

**Deviation from spec — no dev preview routes.** §19 of the spec mentions `/dev/wheel-preview` and `/dev/betting-preview` routes. The existing router has no such pattern. Adding two ad-hoc routes for one phase introduces a convention that nothing else uses and would have to be either removed or generalized later. The plan replaces these with **Vitest snapshot/RTL tests + manual smoke via the full RoulettePage in PR D**. Visual review during PR B and PR C happens by the subagent rendering the component in an isolated test page wired to `pnpm dev` only when explicitly needed — not as a committed route. This matches how Phase 3 (Blackjack) validated `Card.tsx` and `HandView.tsx`.

---

## File map

Created across the 4 PRs:

```
src/games/roulette/
├── types.ts                # PR A
├── config.ts               # PR A
├── wheel.ts                # PR A
├── bets.ts                 # PR A
├── logic.ts                # PR A
├── machine.ts              # PR A
├── wheel.test.ts           # PR A
├── bets.test.ts            # PR A
├── logic.test.ts           # PR A
├── machine.test.ts         # PR A
├── Wheel.tsx               # PR B
├── Wheel.test.tsx          # PR B
├── ChipSelector.tsx        # PR C
├── ChipSelector.test.tsx   # PR C
├── ChipStack.tsx           # PR C
├── ChipStack.test.tsx      # PR C
├── BettingLayout.tsx       # PR C
├── BettingLayout.test.tsx  # PR C
├── ResultBanner.tsx        # PR D
├── ResultBanner.test.tsx   # PR D
├── RoulettePage.tsx        # PR D
└── RoulettePage.test.tsx   # PR D

docs/adr/
├── 0029-roulette-european-wheel-order.md            # PR A
├── 0030-roulette-bet-position-model.md              # PR A
└── 0031-roulette-spin-animation-contract.md         # PR A

modified:
├── vitest.config.ts                                  # PR A (coverage include + thresholds)
├── tailwind.config.ts                                # PR B (new wood/brass/pearl colors)
├── src/theme/tokens.ts                               # PR B (matching token entries)
├── src/router.tsx                                    # PR D (swap StubGamePage → RoulettePage)
└── src/pages/lobby/CabinetCarousel.tsx               # PR D (flip roulette → playable)
```

---

## Definition of Done (per task, per PR, per phase)

**Per task:** the named files exist with the named contents, all tests in the task pass, the commit lands on the branch with the specified commit message.

**Per PR:**

```bash
pnpm lint && pnpm typecheck && pnpm test --run && pnpm build
```

All four green locally on the PR branch. CI green on the PR. Code reviewed via the subagent-driven-development two-stage review per task + a final code-review at PR boundary.

**Per phase (after PR D merges):**

- Manual smoke in `pnpm dev`: log in → lobby → click Roulette cabinet → place at least one straight bet, one outside bet, one split → click Spin → observe correct settle and balance change → click New round → observe losing chips remain on the felt, winning ones cleared → spin again
- Toggle OS `prefers-reduced-motion: reduce` and repeat smoke; wheel must not animate, wallet flow still correct
- All 10 bet types exercised at least once (in tests OR manual smoke OR both)
- A spin of 0 observed at least once (use `seed()` in a manual session if needed; do not commit any seed)
- Bundle size: `pnpm build` reports a JS bundle ≤ 800 kB total (current ~657 kB; Roulette adds ~80–100 kB expected)

---

## Pre-flight (do once before starting PR A)

- [ ] **Step P.1: Sync main**

```bash
git checkout main && git pull --ff-only
git log -1 --oneline
```

Expected: latest commit is `chore(release): v0.4-blackjack (#86)` or newer (PR #87 spec merge already on main).

- [ ] **Step P.2: Verify baseline is green**

```bash
pnpm install && pnpm lint && pnpm typecheck && pnpm test --run && pnpm build
```

Expected: all four commands exit 0. If anything fails, STOP and surface to the user — do not start Phase 4 on a broken main.

- [ ] **Step P.3: Read the spec end-to-end**

`docs/superpowers/specs/2026-05-17-phase-4-roulette-design.md` — every section. This plan assumes the spec is your reference for _what_ and uses your reading time on _how_.

---

# PR A — Logic + Machine + ADRs

**Branch:** `phase-4-roulette-pr-a-logic` (off `main`)
**Goal of this PR:** Ship every pure-logic file + the XState machine + the three ADRs, all with passing tests, BEFORE any UI is written. Mirrors Phase 3 PR A which shipped the Blackjack logic and machine. After this PR merges, the game is fully testable in unit tests even though there's no UI to play it with.
**Risk:** Lowest of the four PRs. No React. No I/O. The only external dependency is `src/systems/rng.ts`.
**Estimated tasks:** 16.

## Task A.1: Branch and scaffold the roulette folder

**Files:**

- Create: `src/games/roulette/` (already exists as empty dir with `.gitkeep`)
- Delete: `src/games/roulette/.gitkeep`

- [ ] **Step 1: Branch off main**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-4-roulette-pr-a-logic
```

Expected: clean `main`, new branch created.

- [ ] **Step 2: Delete the `.gitkeep` placeholder**

```bash
git rm src/games/roulette/.gitkeep
```

Expected: file removed (later tasks add real files in this folder).

- [ ] **Step 3: Verify baseline still lints and types**

```bash
pnpm lint && pnpm typecheck
```

Expected: both exit 0. No source files added yet so nothing should have changed.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(roulette): drop .gitkeep ahead of Phase 4 implementation"
```

## Task A.2: Define the Roulette type surface

**Files:**

- Create: `src/games/roulette/types.ts`

Types only — no runtime code, so no test file. Compilation IS the test (the later tasks consume these types).

- [ ] **Step 1: Write `src/games/roulette/types.ts`**

```ts
/** All bet categories from BUILD_GUIDE §8.2. */
export type BetType =
  | 'straight'
  | 'split'
  | 'street'
  | 'corner'
  | 'six-line'
  | 'column'
  | 'dozen'
  | 'red'
  | 'black'
  | 'odd'
  | 'even'
  | 'low'
  | 'high';

/**
 * Canonical position key. Encoded as a string so it can be a Map key, a React
 * key, and a stable identifier across renders. Format per type:
 *   straight:N        N ∈ 0..36
 *   split:N1-N2       N1 < N2, valid wheel-adjacent pair (incl. 0-1, 0-2, 0-3)
 *   street:N          N is the lowest of the row of 3 (1,4,7,…,34)
 *   corner:N          N is the top-left of the 2×2 block
 *   six-line:N        N is the lowest of two adjacent rows of 3
 *   column:1|2|3
 *   dozen:1|2|3
 *   red | black | odd | even | low | high
 */
export type BetPositionKey = string;

export interface BetPosition {
  readonly key: BetPositionKey;
  readonly type: BetType;
  /** The numbers this position covers. 1 element for straight, up to 18 for even-money. */
  readonly numbers: readonly number[];
  /** Profit multiple per unit staked: 35 / 17 / 11 / 8 / 5 / 2 / 1 (matches §8.2). */
  readonly payoutMultiple: 1 | 2 | 5 | 8 | 11 | 17 | 35;
}

export interface PlacedBet extends BetPosition {
  /** Total chips staked on this position this round (sum of all chip clicks). Integer ≥ 1. */
  readonly amount: number;
  /** Canonical wallet bet-handle id for this position (the FIRST placeBet for this key). */
  readonly betHandleId: string;
}

export type PocketColor = 'red' | 'black' | 'green';

export interface SpinResult {
  /** 0..36 inclusive — winning pocket number. */
  readonly number: number;
  readonly color: PocketColor;
  /** Index into POCKET_ORDER (0..36). Used for ball positioning. */
  readonly pocketIndex: number;
}

export interface BetOutcome {
  readonly key: BetPositionKey;
  readonly type: BetType;
  readonly amount: number;
  readonly won: boolean;
  /** Gross return to player on this position. 0 on loss; `amount + amount * payoutMultiple` on win. */
  readonly payout: number;
}

export interface RouletteRoundDetails {
  readonly spin: SpinResult;
  readonly bets: ReadonlyArray<{
    readonly key: BetPositionKey;
    readonly type: BetType;
    readonly numbers: readonly number[];
    readonly amount: number;
    readonly payout: number;
  }>;
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: exit 0. No new errors.

- [ ] **Step 3: Commit**

```bash
git add src/games/roulette/types.ts
git commit -m "feat(roulette): add type definitions for bets, spin, and round details"
```

## Task A.3: Roulette config

**Files:**

- Create: `src/games/roulette/config.ts`

No test file (a frozen object — compilation is the test).

- [ ] **Step 1: Write `src/games/roulette/config.ts`**

```ts
export const ROULETTE_CONFIG = {
  /** Per-bet-position chip minimum. Matches Blackjack via ADR-0025. */
  MIN_BET: 5,
  /** Per-bet-position chip maximum. Matches Blackjack via ADR-0025. */
  MAX_BET: 1_000,
  /** Maximum number of distinct bet positions on the felt per round. ADR-0030. */
  MAX_POSITIONS_PER_ROUND: 10,
  /** Chip denominations shown in the selector (left → right). ADR-0030. */
  CHIP_DENOMINATIONS: [5, 25, 100, 250, 500, 1_000] as const,
  /** Spin animation duration in ms. ADR-0031. */
  SPIN_DURATION_MS: 5_000,
  /** Result-banner / pocket-pulse duration in ms. ADR-0031. */
  RESULT_PULSE_MS: 600,
} as const;

export type RouletteConfig = typeof ROULETTE_CONFIG;
export type ChipDenomination = (typeof ROULETTE_CONFIG.CHIP_DENOMINATIONS)[number];
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/games/roulette/config.ts
git commit -m "feat(roulette): add ROULETTE_CONFIG (limits, chips, animation timing)"
```

## Task A.4: Wheel data (pocket order + colors)

**Files:**

- Create: `src/games/roulette/wheel.ts`
- Create: `src/games/roulette/wheel.test.ts`

TDD: tests first.

- [ ] **Step 1: Write the failing test (`wheel.test.ts`)**

```ts
import { describe, expect, it } from 'vitest';
import { POCKET_ORDER, RED_NUMBERS, colorOf, pocketIndexOf } from './wheel';

describe('POCKET_ORDER', () => {
  it('contains exactly 37 unique numbers, 0..36', () => {
    expect(POCKET_ORDER).toHaveLength(37);
    expect(new Set(POCKET_ORDER).size).toBe(37);
    for (const n of POCKET_ORDER) {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(36);
      expect(Number.isInteger(n)).toBe(true);
    }
  });

  it('starts with 0', () => {
    expect(POCKET_ORDER[0]).toBe(0);
  });

  it('matches the real European single-zero sequence (ADR-0029)', () => {
    expect([...POCKET_ORDER]).toEqual([
      0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20,
      14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
    ]);
  });
});

describe('RED_NUMBERS', () => {
  it('contains the 18 standard reds', () => {
    expect(RED_NUMBERS.size).toBe(18);
    for (const n of [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]) {
      expect(RED_NUMBERS.has(n)).toBe(true);
    }
  });

  it('does not contain 0', () => {
    expect(RED_NUMBERS.has(0)).toBe(false);
  });
});

describe('colorOf', () => {
  it('returns green for 0', () => {
    expect(colorOf(0)).toBe('green');
  });

  it('returns red for canonical reds', () => {
    for (const n of [1, 7, 18, 19, 36]) expect(colorOf(n)).toBe('red');
  });

  it('returns black for canonical blacks', () => {
    for (const n of [2, 4, 17, 26, 35]) expect(colorOf(n)).toBe('black');
  });

  it('colors balance to 18 red + 18 black + 1 green over 0..36', () => {
    let r = 0,
      b = 0,
      g = 0;
    for (let n = 0; n <= 36; n++) {
      const c = colorOf(n);
      if (c === 'red') r++;
      else if (c === 'black') b++;
      else g++;
    }
    expect(r).toBe(18);
    expect(b).toBe(18);
    expect(g).toBe(1);
  });
});

describe('pocketIndexOf', () => {
  it('returns 0 for the number 0', () => {
    expect(pocketIndexOf(0)).toBe(0);
  });

  it('round-trips through POCKET_ORDER for every number', () => {
    for (let n = 0; n <= 36; n++) {
      const idx = pocketIndexOf(n);
      expect(POCKET_ORDER[idx]).toBe(n);
    }
  });

  it('throws on out-of-range input', () => {
    expect(() => pocketIndexOf(-1)).toThrow(RangeError);
    expect(() => pocketIndexOf(37)).toThrow(RangeError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test --run src/games/roulette/wheel.test.ts
```

Expected: FAIL — "Cannot find module './wheel'".

- [ ] **Step 3: Write `src/games/roulette/wheel.ts`**

```ts
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

/** Index of N in POCKET_ORDER. Throws if N is not 0..36. */
export function pocketIndexOf(n: number): number {
  if (!Number.isInteger(n) || n < 0 || n > 36) {
    throw new RangeError(`pocketIndexOf: ${n} is not a valid roulette number`);
  }
  const i = POCKET_ORDER.indexOf(n);
  if (i < 0) {
    throw new RangeError(`pocketIndexOf: ${n} not present in POCKET_ORDER (data integrity bug)`);
  }
  return i;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test --run src/games/roulette/wheel.test.ts
```

Expected: PASS — 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/games/roulette/wheel.ts src/games/roulette/wheel.test.ts
git commit -m "feat(roulette): canonical European wheel pocket order + colors"
```

## Task A.5: Bet validation helpers

**Files:**

- Create: `src/games/roulette/bets.ts` (helpers section only; `makeBet` arrives in Task A.6)
- Create: `src/games/roulette/bets.test.ts`

Helpers: `columnOf`, `dozenOf`, `isValidSplit`, `isValidStreet`, `isValidCorner`, `isValidSixLine`, and the number-set constants.

**Grid layout reference (real-casino landscape):**

```
zero │ col 1  col 2  col 3  col 4  col 5  col 6  col 7  col 8  col 9  col 10 col 11 col 12  │ "2:1"
 0   │   3      6      9      12     15     18     21     24     27     30     33     36   │  col 3
     │   2      5      8      11     14     17     20     23     26     29     32     35   │  col 2
     │   1      4      7      10     13     16     19     22     25     28     31     34   │  col 1
```

- **Streets** are rows of 3 numbers in a single visual column: {1,2,3}, {4,5,6}, …, {34,35,36}. Street's `rowStart` is the smallest (1, 4, 7, …, 34).
- **Vertical splits** (within a visual column / inside one street): (1,2), (2,3), (4,5), (5,6), …, (34,35), (35,36) — 24 splits.
- **Horizontal splits** (within a visual row / across adjacent visual columns): (1,4), (4,7), …, (31,34) in bottom row; (2,5), …, (32,35) in middle row; (3,6), …, (33,36) in top row — 33 splits.
- **0-splits:** (0,1), (0,2), (0,3) — 3 splits.
- **Corners** are 2×2 blocks. `topLeft` is the smallest. Valid topLeft ∈ {1,2,4,5,7,8,…,31,32}: i.e. `topLeft % 3 !== 0` and `topLeft ≤ 32`.
- **Six-lines** combine two adjacent streets: rowStart ∈ {1, 4, 7, …, 31}.

- [ ] **Step 1: Write the failing test (`bets.test.ts`)**

```ts
import { describe, expect, it } from 'vitest';
import {
  RED_NUMBERS_ARRAY,
  BLACK_NUMBERS_ARRAY,
  ODD_NUMBERS,
  EVEN_NUMBERS,
  LOW_NUMBERS,
  HIGH_NUMBERS,
  COLUMN_NUMBERS,
  DOZEN_NUMBERS,
  columnOf,
  dozenOf,
  isValidSplit,
  isValidStreet,
  isValidCorner,
  isValidSixLine,
} from './bets';

describe('number-set constants', () => {
  it('RED_NUMBERS_ARRAY matches the canonical 18 reds in ascending order', () => {
    expect(RED_NUMBERS_ARRAY).toEqual([
      1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
    ]);
  });

  it('BLACK_NUMBERS_ARRAY is exactly the 18 blacks (1..36 minus reds)', () => {
    expect(BLACK_NUMBERS_ARRAY).toHaveLength(18);
    for (const n of BLACK_NUMBERS_ARRAY) {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(36);
      expect(RED_NUMBERS_ARRAY).not.toContain(n);
    }
    expect(new Set([...RED_NUMBERS_ARRAY, ...BLACK_NUMBERS_ARRAY]).size).toBe(36);
  });

  it('ODD_NUMBERS and EVEN_NUMBERS each have 18 elements and exclude 0', () => {
    expect(ODD_NUMBERS).toHaveLength(18);
    expect(EVEN_NUMBERS).toHaveLength(18);
    expect(ODD_NUMBERS).not.toContain(0);
    expect(EVEN_NUMBERS).not.toContain(0);
    for (const n of ODD_NUMBERS) expect(n % 2).toBe(1);
    for (const n of EVEN_NUMBERS) expect(n % 2).toBe(0);
  });

  it('LOW_NUMBERS = 1..18, HIGH_NUMBERS = 19..36', () => {
    expect(LOW_NUMBERS).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    expect(HIGH_NUMBERS).toEqual(Array.from({ length: 18 }, (_, i) => i + 19));
  });

  it('COLUMN_NUMBERS[1..3] each have 12 numbers, partitioning 1..36', () => {
    expect(COLUMN_NUMBERS[1]).toHaveLength(12);
    expect(COLUMN_NUMBERS[2]).toHaveLength(12);
    expect(COLUMN_NUMBERS[3]).toHaveLength(12);
    const union = new Set([...COLUMN_NUMBERS[1], ...COLUMN_NUMBERS[2], ...COLUMN_NUMBERS[3]]);
    expect(union.size).toBe(36);
    for (let n = 1; n <= 36; n++) expect(union.has(n)).toBe(true);
  });

  it('COLUMN_NUMBERS[1] = 1,4,7,…,34', () => {
    expect(COLUMN_NUMBERS[1]).toEqual([1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]);
  });

  it('DOZEN_NUMBERS[1..3] partition 1..36 into thirds', () => {
    expect(DOZEN_NUMBERS[1]).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    expect(DOZEN_NUMBERS[2]).toEqual(Array.from({ length: 12 }, (_, i) => i + 13));
    expect(DOZEN_NUMBERS[3]).toEqual(Array.from({ length: 12 }, (_, i) => i + 25));
  });
});

describe('columnOf', () => {
  it.each([
    [1, 1],
    [4, 1],
    [34, 1],
    [2, 2],
    [5, 2],
    [35, 2],
    [3, 3],
    [6, 3],
    [36, 3],
  ])('columnOf(%i) === %i', (n, expected) => {
    expect(columnOf(n)).toBe(expected);
  });

  it('throws on 0 and out-of-range', () => {
    expect(() => columnOf(0)).toThrow(RangeError);
    expect(() => columnOf(37)).toThrow(RangeError);
  });
});

describe('dozenOf', () => {
  it.each([
    [1, 1],
    [12, 1],
    [13, 2],
    [24, 2],
    [25, 3],
    [36, 3],
  ])('dozenOf(%i) === %i', (n, expected) => {
    expect(dozenOf(n)).toBe(expected);
  });

  it('returns null for 0', () => {
    expect(dozenOf(0)).toBeNull();
  });

  it('throws on out-of-range', () => {
    expect(() => dozenOf(37)).toThrow(RangeError);
    expect(() => dozenOf(-1)).toThrow(RangeError);
  });
});

describe('isValidSplit', () => {
  it('accepts the three 0-splits regardless of order', () => {
    expect(isValidSplit(0, 1)).toBe(true);
    expect(isValidSplit(1, 0)).toBe(true);
    expect(isValidSplit(0, 2)).toBe(true);
    expect(isValidSplit(0, 3)).toBe(true);
  });

  it('rejects (0, 4) and other non-adjacent 0-splits', () => {
    expect(isValidSplit(0, 4)).toBe(false);
    expect(isValidSplit(0, 36)).toBe(false);
  });

  it('accepts vertical splits within a street row', () => {
    expect(isValidSplit(1, 2)).toBe(true);
    expect(isValidSplit(2, 3)).toBe(true);
    expect(isValidSplit(4, 5)).toBe(true);
    expect(isValidSplit(34, 35)).toBe(true);
  });

  it('rejects vertical pairs that cross street rows', () => {
    expect(isValidSplit(3, 4)).toBe(false);
    expect(isValidSplit(6, 7)).toBe(false);
    expect(isValidSplit(33, 34)).toBe(false);
  });

  it('accepts horizontal splits within a visual row', () => {
    expect(isValidSplit(1, 4)).toBe(true);
    expect(isValidSplit(2, 5)).toBe(true);
    expect(isValidSplit(3, 6)).toBe(true);
    expect(isValidSplit(31, 34)).toBe(true);
  });

  it('rejects horizontal pairs out of range or in the wrong visual row', () => {
    expect(isValidSplit(34, 37)).toBe(false);
    expect(isValidSplit(1, 5)).toBe(false);
  });

  it('there are exactly 60 valid splits in total (3 + 24 + 33)', () => {
    let count = 0;
    for (let a = 0; a <= 36; a++) {
      for (let b = a + 1; b <= 36; b++) {
        if (isValidSplit(a, b)) count++;
      }
    }
    expect(count).toBe(60);
  });
});

describe('isValidStreet', () => {
  it('accepts the 12 row starts', () => {
    for (const s of [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]) {
      expect(isValidStreet(s)).toBe(true);
    }
  });

  it('rejects everything else', () => {
    expect(isValidStreet(0)).toBe(false);
    expect(isValidStreet(2)).toBe(false);
    expect(isValidStreet(3)).toBe(false);
    expect(isValidStreet(35)).toBe(false);
    expect(isValidStreet(37)).toBe(false);
  });
});

describe('isValidCorner', () => {
  it('accepts all valid top-lefts', () => {
    const valid: number[] = [];
    for (let n = 1; n <= 32; n++) if (n % 3 !== 0) valid.push(n);
    expect(valid).toHaveLength(22);
    for (const t of valid) expect(isValidCorner(t)).toBe(true);
  });

  it('rejects every n % 3 === 0', () => {
    for (const t of [3, 6, 9, 12, 15, 18, 21, 24, 27, 30]) {
      expect(isValidCorner(t)).toBe(false);
    }
  });

  it('rejects out-of-range top-lefts (≤ 0, ≥ 33, > 36)', () => {
    expect(isValidCorner(0)).toBe(false);
    expect(isValidCorner(33)).toBe(false);
    expect(isValidCorner(36)).toBe(false);
  });
});

describe('isValidSixLine', () => {
  it('accepts the 11 valid row starts (1..31 stepping by 3)', () => {
    for (const s of [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31]) {
      expect(isValidSixLine(s)).toBe(true);
    }
  });

  it('rejects 34 (last street has no street to pair with)', () => {
    expect(isValidSixLine(34)).toBe(false);
  });

  it('rejects non-row-starts', () => {
    expect(isValidSixLine(2)).toBe(false);
    expect(isValidSixLine(3)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test --run src/games/roulette/bets.test.ts
```

Expected: FAIL — "Cannot find module './bets'".

- [ ] **Step 3: Write `src/games/roulette/bets.ts` (helpers + constants only — `makeBet` arrives in A.6)**

```ts
import { RED_NUMBERS } from './wheel';

export const RED_NUMBERS_ARRAY: readonly number[] = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
];

export const BLACK_NUMBERS_ARRAY: readonly number[] = (() => {
  const blacks: number[] = [];
  for (let n = 1; n <= 36; n++) {
    if (!RED_NUMBERS.has(n)) blacks.push(n);
  }
  return blacks;
})();

export const ODD_NUMBERS: readonly number[] = Array.from({ length: 18 }, (_, i) => i * 2 + 1);
export const EVEN_NUMBERS: readonly number[] = Array.from({ length: 18 }, (_, i) => (i + 1) * 2);
export const LOW_NUMBERS: readonly number[] = Array.from({ length: 18 }, (_, i) => i + 1);
export const HIGH_NUMBERS: readonly number[] = Array.from({ length: 18 }, (_, i) => i + 19);

export const COLUMN_NUMBERS: Readonly<Record<1 | 2 | 3, readonly number[]>> = {
  1: Array.from({ length: 12 }, (_, i) => i * 3 + 1),
  2: Array.from({ length: 12 }, (_, i) => i * 3 + 2),
  3: Array.from({ length: 12 }, (_, i) => i * 3 + 3),
};

export const DOZEN_NUMBERS: Readonly<Record<1 | 2 | 3, readonly number[]>> = {
  1: Array.from({ length: 12 }, (_, i) => i + 1),
  2: Array.from({ length: 12 }, (_, i) => i + 13),
  3: Array.from({ length: 12 }, (_, i) => i + 25),
};

export function columnOf(n: number): 1 | 2 | 3 {
  if (!Number.isInteger(n) || n < 1 || n > 36) {
    throw new RangeError(`columnOf: ${n} must be an integer in 1..36`);
  }
  const c = n % 3;
  return (c === 0 ? 3 : c) as 1 | 2 | 3;
}

export function dozenOf(n: number): 1 | 2 | 3 | null {
  if (n === 0) return null;
  if (!Number.isInteger(n) || n < 1 || n > 36) {
    throw new RangeError(`dozenOf: ${n} must be 0..36`);
  }
  return Math.ceil(n / 12) as 1 | 2 | 3;
}

export function isValidSplit(a: number, b: number): boolean {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a === b) return false;
  const [lo, hi] = a < b ? [a, b] : [b, a];
  if (lo < 0 || hi > 36) return false;
  if (lo === 0) return hi === 1 || hi === 2 || hi === 3;
  // Vertical: same street row, adjacent within the column of 3.
  if (hi === lo + 1) return lo % 3 !== 0;
  // Horizontal: same visual row, adjacent across street rows.
  if (hi === lo + 3) return lo >= 1 && lo <= 33;
  return false;
}

export function isValidStreet(rowStart: number): boolean {
  if (!Number.isInteger(rowStart)) return false;
  return rowStart >= 1 && rowStart <= 34 && rowStart % 3 === 1;
}

export function isValidCorner(topLeft: number): boolean {
  if (!Number.isInteger(topLeft)) return false;
  return topLeft >= 1 && topLeft <= 32 && topLeft % 3 !== 0;
}

export function isValidSixLine(rowStart: number): boolean {
  if (!Number.isInteger(rowStart)) return false;
  return rowStart >= 1 && rowStart <= 31 && rowStart % 3 === 1;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test --run src/games/roulette/bets.test.ts
```

Expected: PASS — all tests pass. Re-running `pnpm test --run` should now also show all wheel + bets tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/games/roulette/bets.ts src/games/roulette/bets.test.ts
git commit -m "feat(roulette): bet validation helpers + number-set constants"
```

## Task A.6: `makeBet` constructor

**Files:**

- Modify: `src/games/roulette/bets.ts` (add `makeBet` + its input union type)
- Modify: `src/games/roulette/bets.test.ts` (add `makeBet` describe block)

- [ ] **Step 1: Append the failing test to `bets.test.ts`**

Add the following inside `bets.test.ts` (append after the existing describes, but include `makeBet` in the imports at the top of the file):

```ts
import { makeBet } from './bets';

describe('makeBet', () => {
  it('straight on N: key, numbers, payout 35', () => {
    const b = makeBet({ type: 'straight', n: 17 });
    expect(b).toEqual({
      key: 'straight:17',
      type: 'straight',
      numbers: [17],
      payoutMultiple: 35,
    });
  });

  it('straight on 0', () => {
    expect(makeBet({ type: 'straight', n: 0 })).toMatchObject({
      key: 'straight:0',
      numbers: [0],
      payoutMultiple: 35,
    });
  });

  it('rejects straight outside 0..36', () => {
    expect(() => makeBet({ type: 'straight', n: 37 })).toThrow(RangeError);
    expect(() => makeBet({ type: 'straight', n: -1 })).toThrow(RangeError);
  });

  it('split canonicalises key by sorting (a < b in the key)', () => {
    const b = makeBet({ type: 'split', a: 5, b: 4 });
    expect(b.key).toBe('split:4-5');
    expect(b.numbers).toEqual([4, 5]);
    expect(b.payoutMultiple).toBe(17);
  });

  it('split on 0-1 / 0-2 / 0-3', () => {
    expect(makeBet({ type: 'split', a: 0, b: 1 }).key).toBe('split:0-1');
    expect(makeBet({ type: 'split', a: 0, b: 2 }).key).toBe('split:0-2');
    expect(makeBet({ type: 'split', a: 0, b: 3 }).key).toBe('split:0-3');
  });

  it('rejects invalid splits', () => {
    expect(() => makeBet({ type: 'split', a: 3, b: 4 })).toThrow(RangeError);
    expect(() => makeBet({ type: 'split', a: 0, b: 4 })).toThrow(RangeError);
    expect(() => makeBet({ type: 'split', a: 1, b: 5 })).toThrow(RangeError);
  });

  it('street covers three sequential numbers and pays 11', () => {
    const b = makeBet({ type: 'street', rowStart: 4 });
    expect(b).toMatchObject({
      key: 'street:4',
      numbers: [4, 5, 6],
      payoutMultiple: 11,
    });
  });

  it('rejects invalid street rowStart', () => {
    expect(() => makeBet({ type: 'street', rowStart: 2 })).toThrow(RangeError);
  });

  it('corner covers four 2×2 numbers and pays 8', () => {
    const b = makeBet({ type: 'corner', topLeft: 1 });
    expect(b).toMatchObject({
      key: 'corner:1',
      numbers: [1, 2, 4, 5],
      payoutMultiple: 8,
    });
  });

  it('rejects invalid corner topLeft', () => {
    expect(() => makeBet({ type: 'corner', topLeft: 3 })).toThrow(RangeError);
    expect(() => makeBet({ type: 'corner', topLeft: 33 })).toThrow(RangeError);
  });

  it('six-line covers six numbers and pays 5', () => {
    const b = makeBet({ type: 'six-line', rowStart: 1 });
    expect(b).toMatchObject({
      key: 'six-line:1',
      numbers: [1, 2, 3, 4, 5, 6],
      payoutMultiple: 5,
    });
  });

  it('column N covers the right 12 numbers and pays 2', () => {
    expect(makeBet({ type: 'column', col: 1 }).numbers).toEqual([
      1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34,
    ]);
    expect(makeBet({ type: 'column', col: 2 }).key).toBe('column:2');
    expect(makeBet({ type: 'column', col: 3 }).payoutMultiple).toBe(2);
  });

  it('dozen N covers the right 12 numbers and pays 2', () => {
    expect(makeBet({ type: 'dozen', dozen: 1 }).numbers).toEqual(
      Array.from({ length: 12 }, (_, i) => i + 1),
    );
    expect(makeBet({ type: 'dozen', dozen: 2 }).key).toBe('dozen:2');
    expect(makeBet({ type: 'dozen', dozen: 3 }).payoutMultiple).toBe(2);
  });

  it.each(['red', 'black', 'odd', 'even', 'low', 'high'] as const)(
    '%s even-money bet has key === type and pays 1',
    (t) => {
      const b = makeBet({ type: t });
      expect(b.key).toBe(t);
      expect(b.type).toBe(t);
      expect(b.payoutMultiple).toBe(1);
      expect(b.numbers).toHaveLength(18);
    },
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test --run src/games/roulette/bets.test.ts
```

Expected: FAIL — "makeBet is not exported".

- [ ] **Step 3: Append `makeBet` to `bets.ts`**

Add at the bottom of `bets.ts`:

```ts
import type { BetPosition } from './types';

type MakeBetInput =
  | { type: 'straight'; n: number }
  | { type: 'split'; a: number; b: number }
  | { type: 'street'; rowStart: number }
  | { type: 'corner'; topLeft: number }
  | { type: 'six-line'; rowStart: number }
  | { type: 'column'; col: 1 | 2 | 3 }
  | { type: 'dozen'; dozen: 1 | 2 | 3 }
  | { type: 'red' }
  | { type: 'black' }
  | { type: 'odd' }
  | { type: 'even' }
  | { type: 'low' }
  | { type: 'high' };

export function makeBet(input: MakeBetInput): BetPosition {
  switch (input.type) {
    case 'straight': {
      if (!Number.isInteger(input.n) || input.n < 0 || input.n > 36) {
        throw new RangeError(`makeBet straight: n=${input.n} must be 0..36`);
      }
      return {
        key: `straight:${input.n}`,
        type: 'straight',
        numbers: [input.n],
        payoutMultiple: 35,
      };
    }
    case 'split': {
      const [lo, hi] = input.a < input.b ? [input.a, input.b] : [input.b, input.a];
      if (!isValidSplit(lo, hi)) {
        throw new RangeError(`makeBet split: ${lo}-${hi} is not a valid split`);
      }
      return {
        key: `split:${lo}-${hi}`,
        type: 'split',
        numbers: [lo, hi],
        payoutMultiple: 17,
      };
    }
    case 'street': {
      if (!isValidStreet(input.rowStart)) {
        throw new RangeError(`makeBet street: rowStart=${input.rowStart} invalid`);
      }
      return {
        key: `street:${input.rowStart}`,
        type: 'street',
        numbers: [input.rowStart, input.rowStart + 1, input.rowStart + 2],
        payoutMultiple: 11,
      };
    }
    case 'corner': {
      if (!isValidCorner(input.topLeft)) {
        throw new RangeError(`makeBet corner: topLeft=${input.topLeft} invalid`);
      }
      const t = input.topLeft;
      return {
        key: `corner:${t}`,
        type: 'corner',
        numbers: [t, t + 1, t + 3, t + 4],
        payoutMultiple: 8,
      };
    }
    case 'six-line': {
      if (!isValidSixLine(input.rowStart)) {
        throw new RangeError(`makeBet six-line: rowStart=${input.rowStart} invalid`);
      }
      const s = input.rowStart;
      return {
        key: `six-line:${s}`,
        type: 'six-line',
        numbers: [s, s + 1, s + 2, s + 3, s + 4, s + 5],
        payoutMultiple: 5,
      };
    }
    case 'column':
      return {
        key: `column:${input.col}`,
        type: 'column',
        numbers: COLUMN_NUMBERS[input.col],
        payoutMultiple: 2,
      };
    case 'dozen':
      return {
        key: `dozen:${input.dozen}`,
        type: 'dozen',
        numbers: DOZEN_NUMBERS[input.dozen],
        payoutMultiple: 2,
      };
    case 'red':
      return { key: 'red', type: 'red', numbers: RED_NUMBERS_ARRAY, payoutMultiple: 1 };
    case 'black':
      return { key: 'black', type: 'black', numbers: BLACK_NUMBERS_ARRAY, payoutMultiple: 1 };
    case 'odd':
      return { key: 'odd', type: 'odd', numbers: ODD_NUMBERS, payoutMultiple: 1 };
    case 'even':
      return { key: 'even', type: 'even', numbers: EVEN_NUMBERS, payoutMultiple: 1 };
    case 'low':
      return { key: 'low', type: 'low', numbers: LOW_NUMBERS, payoutMultiple: 1 };
    case 'high':
      return { key: 'high', type: 'high', numbers: HIGH_NUMBERS, payoutMultiple: 1 };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test --run src/games/roulette/bets.test.ts
```

Expected: PASS — all makeBet tests pass alongside the existing helper tests.

- [ ] **Step 5: Commit**

```bash
git add src/games/roulette/bets.ts src/games/roulette/bets.test.ts
git commit -m "feat(roulette): makeBet constructor covering all 10 bet types"
```

## Task A.7: `spin()` and `settleOne()` in logic.ts

**Files:**

- Create: `src/games/roulette/logic.ts`
- Create: `src/games/roulette/logic.test.ts`

- [ ] **Step 1: Write the failing test (`logic.test.ts`)**

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { seed, unseed } from '@/systems/rng';
import { makeBet } from './bets';
import { settleOne, spin } from './logic';
import type { PlacedBet, SpinResult } from './types';

function placed(bet: ReturnType<typeof makeBet>, amount: number): PlacedBet {
  return { ...bet, amount, betHandleId: 'test-handle' };
}

describe('spin', () => {
  afterEach(() => unseed());

  it('returns a SpinResult with number 0..36 and matching color', () => {
    seed(1);
    const r = spin();
    expect(r.number).toBeGreaterThanOrEqual(0);
    expect(r.number).toBeLessThanOrEqual(36);
    if (r.number === 0) expect(r.color).toBe('green');
    expect(r.pocketIndex).toBeGreaterThanOrEqual(0);
    expect(r.pocketIndex).toBeLessThanOrEqual(36);
  });

  it('is deterministic under a fixed seed', () => {
    seed(42);
    const a = spin();
    seed(42);
    const b = spin();
    expect(a).toEqual(b);
  });

  it('over many spins, hits every pocket at least once (sanity)', () => {
    seed(1);
    const seen = new Set<number>();
    for (let i = 0; i < 5_000; i++) seen.add(spin().number);
    expect(seen.size).toBe(37);
  });
});

describe('settleOne', () => {
  const spinResult = (n: number): SpinResult => ({
    number: n,
    color: n === 0 ? 'green' : 'red',
    pocketIndex: 0,
  });

  it('straight win pays 35:1 (gross 36×)', () => {
    const bet = placed(makeBet({ type: 'straight', n: 17 }), 10);
    expect(settleOne(bet, spinResult(17))).toEqual({
      key: 'straight:17',
      type: 'straight',
      amount: 10,
      won: true,
      payout: 360,
    });
  });

  it('straight loss returns 0', () => {
    const bet = placed(makeBet({ type: 'straight', n: 17 }), 10);
    expect(settleOne(bet, spinResult(18)).payout).toBe(0);
    expect(settleOne(bet, spinResult(18)).won).toBe(false);
  });

  it('split win pays 17:1 (gross 18×)', () => {
    const bet = placed(makeBet({ type: 'split', a: 17, b: 18 }), 10);
    expect(settleOne(bet, spinResult(18)).payout).toBe(180);
  });

  it('street win pays 11:1 (gross 12×)', () => {
    const bet = placed(makeBet({ type: 'street', rowStart: 16 }), 10);
    expect(settleOne(bet, spinResult(17)).payout).toBe(120);
  });

  it('corner win pays 8:1 (gross 9×)', () => {
    const bet = placed(makeBet({ type: 'corner', topLeft: 1 }), 10);
    expect(settleOne(bet, spinResult(5)).payout).toBe(90);
  });

  it('six-line win pays 5:1 (gross 6×)', () => {
    const bet = placed(makeBet({ type: 'six-line', rowStart: 1 }), 10);
    expect(settleOne(bet, spinResult(4)).payout).toBe(60);
  });

  it('column win pays 2:1 (gross 3×)', () => {
    const bet = placed(makeBet({ type: 'column', col: 2 }), 10);
    expect(settleOne(bet, spinResult(20)).payout).toBe(30);
  });

  it('dozen win pays 2:1', () => {
    const bet = placed(makeBet({ type: 'dozen', dozen: 1 }), 10);
    expect(settleOne(bet, spinResult(7)).payout).toBe(30);
  });

  it('red/black/odd/even/low/high pay 1:1 on hit', () => {
    for (const t of ['red', 'black', 'odd', 'even', 'low', 'high'] as const) {
      const bet = placed(makeBet({ type: t }), 10);
      const winningN = bet.numbers[0]!;
      expect(settleOne(bet, spinResult(winningN)).payout).toBe(20);
    }
  });

  it('0 loses all outside / even-money bets (no en prison)', () => {
    for (const t of ['red', 'black', 'odd', 'even', 'low', 'high'] as const) {
      const bet = placed(makeBet({ type: t }), 10);
      expect(settleOne(bet, spinResult(0)).payout).toBe(0);
    }
    expect(settleOne(placed(makeBet({ type: 'column', col: 1 }), 10), spinResult(0)).payout).toBe(
      0,
    );
    expect(settleOne(placed(makeBet({ type: 'dozen', dozen: 1 }), 10), spinResult(0)).payout).toBe(
      0,
    );
  });

  it('0 wins straight:0 and split:0-1 / 0-2 / 0-3', () => {
    expect(settleOne(placed(makeBet({ type: 'straight', n: 0 }), 5), spinResult(0)).payout).toBe(
      180,
    );
    expect(settleOne(placed(makeBet({ type: 'split', a: 0, b: 1 }), 5), spinResult(0)).payout).toBe(
      90,
    );
    expect(settleOne(placed(makeBet({ type: 'split', a: 0, b: 2 }), 5), spinResult(0)).payout).toBe(
      90,
    );
    expect(settleOne(placed(makeBet({ type: 'split', a: 0, b: 3 }), 5), spinResult(0)).payout).toBe(
      90,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test --run src/games/roulette/logic.test.ts
```

Expected: FAIL — "Cannot find module './logic'".

- [ ] **Step 3: Write `src/games/roulette/logic.ts`** (only `spin` + `settleOne`; `buildRoundResult` arrives in A.8)

```ts
import { randomInt } from '@/systems/rng';
import { colorOf, pocketIndexOf } from './wheel';
import type { BetOutcome, PlacedBet, SpinResult } from './types';

export function spin(): SpinResult {
  const n = randomInt(0, 36);
  return { number: n, color: colorOf(n), pocketIndex: pocketIndexOf(n) };
}

export function settleOne(bet: PlacedBet, spinResult: SpinResult): BetOutcome {
  const won = bet.numbers.includes(spinResult.number);
  const payout = won ? bet.amount + bet.amount * bet.payoutMultiple : 0;
  return { key: bet.key, type: bet.type, amount: bet.amount, won, payout };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test --run src/games/roulette/logic.test.ts
```

Expected: PASS — all settleOne + spin tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/games/roulette/logic.ts src/games/roulette/logic.test.ts
git commit -m "feat(roulette): RNG-backed spin() + per-bet settleOne()"
```

## Task A.8: `buildRoundResult()` aggregator

**Files:**

- Modify: `src/games/roulette/logic.ts` (add `buildRoundResult`)
- Modify: `src/games/roulette/logic.test.ts` (add `buildRoundResult` describe)

- [ ] **Step 1: Append failing tests to `logic.test.ts`**

```ts
import { buildRoundResult } from './logic';

describe('buildRoundResult', () => {
  const spinResult = (n: number): SpinResult => ({
    number: n,
    color: n === 0 ? 'green' : 'red',
    pocketIndex: 0,
  });

  it('pure-loss round: outcome=loss, payout=0, netChange=-totalBet', () => {
    const bets: PlacedBet[] = [
      placed(makeBet({ type: 'straight', n: 17 }), 10),
      placed(makeBet({ type: 'red' }), 25),
    ];
    const r = buildRoundResult(bets, spinResult(0)); // 0 is green; both lose
    expect(r.outcome).toBe('loss');
    expect(r.betAmount).toBe(35);
    expect(r.payout).toBe(0);
    expect(r.netChange).toBe(-35);
    expect(r.details.spin.number).toBe(0);
    expect(r.details.bets).toHaveLength(2);
  });

  it('pure-win round: outcome=win, payout > betAmount', () => {
    const bets: PlacedBet[] = [placed(makeBet({ type: 'straight', n: 17 }), 10)];
    const r = buildRoundResult(bets, spinResult(17));
    expect(r.outcome).toBe('win');
    expect(r.betAmount).toBe(10);
    expect(r.payout).toBe(360);
    expect(r.netChange).toBe(350);
  });

  it('mixed round: aggregates winners and losers correctly', () => {
    const bets: PlacedBet[] = [
      placed(makeBet({ type: 'straight', n: 17 }), 10), // wins on 17 → 360
      placed(makeBet({ type: 'red' }), 10), // 17 is black → loses
      placed(makeBet({ type: 'column', col: 2 }), 10), // 17 is in col 2 → wins → 30
    ];
    const r = buildRoundResult(bets, spinResult(17));
    expect(r.betAmount).toBe(30);
    expect(r.payout).toBe(390);
    expect(r.netChange).toBe(360);
    expect(r.outcome).toBe('win');
  });

  it('push round: payout equals betAmount → outcome=push', () => {
    // 5 chips on red, plus 5 chips that mathematically would always equal 5 back is rare.
    // The cleanest synthesised push: bet only red, spin lands red → payout = 10 = bet*2 → win.
    // For a true push we need payout === betAmount. Easiest:
    //   bet 5 chips on red AND 5 chips on black; one wins (payout 10), other loses (0).
    //   total bet = 10, total payout = 10, netChange = 0 → push.
    const bets: PlacedBet[] = [
      placed(makeBet({ type: 'red' }), 5),
      placed(makeBet({ type: 'black' }), 5),
    ];
    const r = buildRoundResult(bets, spinResult(2)); // 2 is black
    expect(r.betAmount).toBe(10);
    expect(r.payout).toBe(10);
    expect(r.netChange).toBe(0);
    expect(r.outcome).toBe('push');
  });

  it('details.bets preserves position numbers and amounts verbatim', () => {
    const bets: PlacedBet[] = [placed(makeBet({ type: 'street', rowStart: 4 }), 7)];
    const r = buildRoundResult(bets, spinResult(5));
    expect(r.details.bets[0]).toEqual({
      key: 'street:4',
      type: 'street',
      numbers: [4, 5, 6],
      amount: 7,
      payout: 84, // 7 + 7*11
    });
  });

  it('empty bets array → push with all zeros (defensive)', () => {
    const r = buildRoundResult([], spinResult(7));
    expect(r.betAmount).toBe(0);
    expect(r.payout).toBe(0);
    expect(r.netChange).toBe(0);
    expect(r.outcome).toBe('push');
    expect(r.details.bets).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test --run src/games/roulette/logic.test.ts
```

Expected: FAIL — "buildRoundResult is not exported".

- [ ] **Step 3: Append `buildRoundResult` to `logic.ts`**

```ts
import type { RouletteRoundDetails } from './types';

export function buildRoundResult(
  bets: readonly PlacedBet[],
  spinResult: SpinResult,
): {
  outcome: 'win' | 'loss' | 'push';
  betAmount: number;
  payout: number;
  netChange: number;
  details: RouletteRoundDetails;
} {
  const outcomes = bets.map((b) => settleOne(b, spinResult));
  const betAmount = bets.reduce((sum, b) => sum + b.amount, 0);
  const payout = outcomes.reduce((sum, o) => sum + o.payout, 0);
  const netChange = payout - betAmount;
  const outcome: 'win' | 'loss' | 'push' = netChange > 0 ? 'win' : netChange < 0 ? 'loss' : 'push';

  const details: RouletteRoundDetails = {
    spin: spinResult,
    bets: bets.map((b, i) => ({
      key: b.key,
      type: b.type,
      numbers: b.numbers,
      amount: b.amount,
      payout: outcomes[i]!.payout,
    })),
  };

  return { outcome, betAmount, payout, netChange, details };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test --run src/games/roulette/logic.test.ts
```

Expected: PASS — all 18 logic tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/games/roulette/logic.ts src/games/roulette/logic.test.ts
git commit -m "feat(roulette): buildRoundResult aggregator (multi-bet round outcome)"
```

## Task A.9: Machine — states, events, basic actions

**Files:**

- Create: `src/games/roulette/machine.ts`
- Create: `src/games/roulette/machine.test.ts`

This task ships the machine skeleton: `betting → spinning → settled` shape, `PLACE_BET` / `REMOVE_BET` / `CLEAR_ALL` / `SPIN` events, position cap, stacking. The `spinning` delay and reduced-motion override arrive in A.10. `NEW_ROUND` re-staging arrives in A.11.

- [ ] **Step 1: Write the failing test (`machine.test.ts`)**

```ts
import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { rouletteMachine } from './machine';
import { makeBet } from './bets';
import type { PlacedBet } from './types';

function placed(bet: ReturnType<typeof makeBet>, amount: number, handleId = 'h'): PlacedBet {
  return { ...bet, amount, betHandleId: handleId };
}

function startMachine() {
  const actor = createActor(rouletteMachine);
  actor.start();
  return actor;
}

describe('rouletteMachine — initial state', () => {
  it('starts in betting with no bets', () => {
    const a = startMachine();
    expect(a.getSnapshot().value).toBe('betting');
    expect(a.getSnapshot().context.bets).toEqual([]);
    expect(a.getSnapshot().context.spinResult).toBeNull();
    expect(a.getSnapshot().context.roundResult).toBeNull();
  });
});

describe('rouletteMachine — PLACE_BET', () => {
  it('adds a bet to context', () => {
    const a = startMachine();
    a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'straight', n: 17 }), 5, 'h1') });
    expect(a.getSnapshot().context.bets).toHaveLength(1);
    expect(a.getSnapshot().context.bets[0]).toMatchObject({
      key: 'straight:17',
      amount: 5,
      betHandleId: 'h1',
    });
  });

  it('stacking: second PLACE_BET on same key adds to amount, preserves first handle', () => {
    const a = startMachine();
    a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'straight', n: 17 }), 5, 'h1') });
    a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'straight', n: 17 }), 25, 'h2') });
    const bets = a.getSnapshot().context.bets;
    expect(bets).toHaveLength(1);
    expect(bets[0]).toMatchObject({ amount: 30, betHandleId: 'h1' });
  });

  it('enforces 10-position cap; 11th new position is dropped (stacking always allowed)', () => {
    const a = startMachine();
    for (let n = 1; n <= 10; n++) {
      a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'straight', n }), 5, `h${n}`) });
    }
    expect(a.getSnapshot().context.bets).toHaveLength(10);
    a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'straight', n: 11 }), 5, 'h11') });
    expect(a.getSnapshot().context.bets).toHaveLength(10);

    // Stacking on an existing position still works.
    a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'straight', n: 5 }), 25, 'h-stack') });
    const stacked = a.getSnapshot().context.bets.find((b) => b.key === 'straight:5')!;
    expect(stacked.amount).toBe(30);
  });
});

describe('rouletteMachine — REMOVE_BET and CLEAR_ALL', () => {
  it('REMOVE_BET drops by key', () => {
    const a = startMachine();
    a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'red' }), 5, 'h-red') });
    a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'black' }), 5, 'h-black') });
    a.send({ type: 'REMOVE_BET', key: 'red' });
    expect(a.getSnapshot().context.bets.map((b) => b.key)).toEqual(['black']);
  });

  it('CLEAR_ALL wipes bets', () => {
    const a = startMachine();
    a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'red' }), 5, 'h-red') });
    a.send({ type: 'CLEAR_ALL' });
    expect(a.getSnapshot().context.bets).toEqual([]);
  });
});

describe('rouletteMachine — SPIN gate', () => {
  it('SPIN is rejected when there are no bets', () => {
    const a = startMachine();
    a.send({ type: 'SPIN' });
    expect(a.getSnapshot().value).toBe('betting');
  });

  it('SPIN transitions to spinning when at least one bet exists', () => {
    const a = startMachine();
    a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'red' }), 5, 'h') });
    a.send({ type: 'SPIN' });
    expect(a.getSnapshot().value).toBe('spinning');
    expect(a.getSnapshot().context.spinResult).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test --run src/games/roulette/machine.test.ts
```

Expected: FAIL — "Cannot find module './machine'".

- [ ] **Step 3: Write `src/games/roulette/machine.ts`** (skeleton; delays + NEW_ROUND filled in A.10/A.11)

```ts
import { assign, setup } from 'xstate';
import { ROULETTE_CONFIG } from './config';
import { buildRoundResult, spin } from './logic';
import type { BetPositionKey, PlacedBet, SpinResult } from './types';

interface Context {
  bets: PlacedBet[];
  spinResult: SpinResult | null;
  roundResult: ReturnType<typeof buildRoundResult> | null;
  spinDurationMs: number;
}

type MachineEvent =
  | { type: 'PLACE_BET'; bet: PlacedBet }
  | { type: 'REMOVE_BET'; key: BetPositionKey }
  | { type: 'CLEAR_ALL' }
  | { type: 'SPIN' }
  | { type: 'NEW_ROUND' };

type MachineInput = { spinDurationMs?: number } | undefined;

export const rouletteMachine = setup({
  types: {
    context: {} as Context,
    events: {} as MachineEvent,
    input: {} as MachineInput,
  },
  guards: {
    hasAtLeastOneBet: ({ context }) => context.bets.length > 0,
  },
  actions: {
    addBet: assign({
      bets: ({ context, event }) => {
        if (event.type !== 'PLACE_BET') return context.bets;
        const idx = context.bets.findIndex((b) => b.key === event.bet.key);
        if (idx >= 0) {
          const existing = context.bets[idx]!;
          const next = [...context.bets];
          next[idx] = { ...existing, amount: existing.amount + event.bet.amount };
          return next;
        }
        if (context.bets.length >= ROULETTE_CONFIG.MAX_POSITIONS_PER_ROUND) return context.bets;
        return [...context.bets, event.bet];
      },
    }),
    removeBet: assign({
      bets: ({ context, event }) => {
        if (event.type !== 'REMOVE_BET') return context.bets;
        return context.bets.filter((b) => b.key !== event.key);
      },
    }),
    clearAll: assign({ bets: () => [] }),
    setSpinResult: assign({
      spinResult: () => spin(),
    }),
  },
}).createMachine({
  id: 'roulette',
  initial: 'betting',
  context: ({ input }) => ({
    bets: [],
    spinResult: null,
    roundResult: null,
    spinDurationMs: input?.spinDurationMs ?? ROULETTE_CONFIG.SPIN_DURATION_MS,
  }),
  states: {
    betting: {
      on: {
        PLACE_BET: { actions: 'addBet' },
        REMOVE_BET: { actions: 'removeBet' },
        CLEAR_ALL: { actions: 'clearAll' },
        SPIN: {
          guard: 'hasAtLeastOneBet',
          target: 'spinning',
        },
      },
    },
    spinning: {
      entry: 'setSpinResult',
      // 'after' transition + setRoundResult action filled in by Task A.10
    },
    settled: {
      // 'NEW_ROUND' transition + prepareNextRound action filled in by Task A.11
    },
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test --run src/games/roulette/machine.test.ts
```

Expected: PASS — initial state, PLACE_BET, stacking, cap, REMOVE_BET, CLEAR_ALL, SPIN guard, SPIN transition.

- [ ] **Step 5: Commit**

```bash
git add src/games/roulette/machine.ts src/games/roulette/machine.test.ts
git commit -m "feat(roulette): XState machine skeleton (betting/spinning/settled, bet ops)"
```

## Task A.10: Machine — spinning delay + reduced-motion override

**Files:**

- Modify: `src/games/roulette/machine.ts` (add `setRoundResult` action + `after` delay + `delays` setup)
- Modify: `src/games/roulette/machine.test.ts` (add delay tests)

The Vitest pattern for time-based XState transitions: use `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync(ms)`. XState v5's `after` transitions integrate with the runtime's clock, which respects fake timers.

- [ ] **Step 1: Append failing tests to `machine.test.ts`**

```ts
import { vi } from 'vitest';
import { ROULETTE_CONFIG } from './config';

describe('rouletteMachine — spinning delay → settled', () => {
  it('after SPIN_DURATION_MS, transitions to settled with roundResult populated', async () => {
    vi.useFakeTimers();
    try {
      const a = startMachine();
      a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'red' }), 5, 'h') });
      a.send({ type: 'SPIN' });
      expect(a.getSnapshot().value).toBe('spinning');
      await vi.advanceTimersByTimeAsync(ROULETTE_CONFIG.SPIN_DURATION_MS);
      expect(a.getSnapshot().value).toBe('settled');
      expect(a.getSnapshot().context.roundResult).not.toBeNull();
      expect(a.getSnapshot().context.roundResult!.betAmount).toBe(5);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reduced-motion override (spinDurationMs=0) settles immediately', async () => {
    vi.useFakeTimers();
    try {
      const actor = createActor(rouletteMachine, { input: { spinDurationMs: 0 } });
      actor.start();
      actor.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'red' }), 5, 'h') });
      actor.send({ type: 'SPIN' });
      await vi.advanceTimersByTimeAsync(0);
      expect(actor.getSnapshot().value).toBe('settled');
    } finally {
      vi.useRealTimers();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test --run src/games/roulette/machine.test.ts
```

Expected: FAIL — `spinning` state never advances to `settled` (the transition isn't wired yet).

- [ ] **Step 3: Update `src/games/roulette/machine.ts`**

Add `setRoundResult` to actions, add `delays` map to `setup()`, add `after` transition to `spinning`:

```ts
// In setup({}).actions add this entry:
setRoundResult: assign({
  roundResult: ({ context }) => {
    if (!context.spinResult) return null;
    return buildRoundResult(context.bets, context.spinResult);
  },
}),

// In setup({}) add a new delays entry as a sibling of guards/actions:
delays: {
  spinDuration: ({ context }) => context.spinDurationMs,
},

// Update the spinning state:
spinning: {
  entry: 'setSpinResult',
  after: {
    spinDuration: {
      target: 'settled',
      actions: 'setRoundResult',
    },
  },
},
```

The full updated `machine.ts` after this task should read (for reference, copy verbatim if you prefer to overwrite):

```ts
import { assign, setup } from 'xstate';
import { ROULETTE_CONFIG } from './config';
import { buildRoundResult, spin } from './logic';
import type { BetPositionKey, PlacedBet, SpinResult } from './types';

interface Context {
  bets: PlacedBet[];
  spinResult: SpinResult | null;
  roundResult: ReturnType<typeof buildRoundResult> | null;
  spinDurationMs: number;
}

type MachineEvent =
  | { type: 'PLACE_BET'; bet: PlacedBet }
  | { type: 'REMOVE_BET'; key: BetPositionKey }
  | { type: 'CLEAR_ALL' }
  | { type: 'SPIN' }
  | { type: 'NEW_ROUND' };

type MachineInput = { spinDurationMs?: number } | undefined;

export const rouletteMachine = setup({
  types: {
    context: {} as Context,
    events: {} as MachineEvent,
    input: {} as MachineInput,
  },
  guards: {
    hasAtLeastOneBet: ({ context }) => context.bets.length > 0,
  },
  actions: {
    addBet: assign({
      bets: ({ context, event }) => {
        if (event.type !== 'PLACE_BET') return context.bets;
        const idx = context.bets.findIndex((b) => b.key === event.bet.key);
        if (idx >= 0) {
          const existing = context.bets[idx]!;
          const next = [...context.bets];
          next[idx] = { ...existing, amount: existing.amount + event.bet.amount };
          return next;
        }
        if (context.bets.length >= ROULETTE_CONFIG.MAX_POSITIONS_PER_ROUND) return context.bets;
        return [...context.bets, event.bet];
      },
    }),
    removeBet: assign({
      bets: ({ context, event }) => {
        if (event.type !== 'REMOVE_BET') return context.bets;
        return context.bets.filter((b) => b.key !== event.key);
      },
    }),
    clearAll: assign({ bets: () => [] }),
    setSpinResult: assign({
      spinResult: () => spin(),
    }),
    setRoundResult: assign({
      roundResult: ({ context }) => {
        if (!context.spinResult) return null;
        return buildRoundResult(context.bets, context.spinResult);
      },
    }),
  },
  delays: {
    spinDuration: ({ context }) => context.spinDurationMs,
  },
}).createMachine({
  id: 'roulette',
  initial: 'betting',
  context: ({ input }) => ({
    bets: [],
    spinResult: null,
    roundResult: null,
    spinDurationMs: input?.spinDurationMs ?? ROULETTE_CONFIG.SPIN_DURATION_MS,
  }),
  states: {
    betting: {
      on: {
        PLACE_BET: { actions: 'addBet' },
        REMOVE_BET: { actions: 'removeBet' },
        CLEAR_ALL: { actions: 'clearAll' },
        SPIN: {
          guard: 'hasAtLeastOneBet',
          target: 'spinning',
        },
      },
    },
    spinning: {
      entry: 'setSpinResult',
      after: {
        spinDuration: {
          target: 'settled',
          actions: 'setRoundResult',
        },
      },
    },
    settled: {
      // NEW_ROUND wired in Task A.11
    },
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test --run src/games/roulette/machine.test.ts
```

Expected: PASS — both spinning-delay tests pass alongside prior ones.

- [ ] **Step 5: Commit**

```bash
git add src/games/roulette/machine.ts src/games/roulette/machine.test.ts
git commit -m "feat(roulette): spinning → settled after spinDuration with reduced-motion override"
```

## Task A.11: Machine — NEW_ROUND with kept-losing-bets re-staging

**Files:**

- Modify: `src/games/roulette/machine.ts` (add `prepareNextRound` action + NEW_ROUND transition)
- Modify: `src/games/roulette/machine.test.ts` (add NEW_ROUND tests)

`prepareNextRound` rule (spec §10): losing positions stay in `context.bets` with their amounts but their `betHandleId` is wiped (UI re-stages on next spin). Winning positions are dropped entirely. `spinResult` and `roundResult` clear.

- [ ] **Step 1: Append failing tests to `machine.test.ts`**

```ts
import { seed, unseed } from '@/systems/rng';

describe('rouletteMachine — NEW_ROUND prepareNextRound', () => {
  it('clears winning positions, keeps losing ones with cleared handle IDs', async () => {
    vi.useFakeTimers();
    try {
      // Seed to control the spin outcome.
      seed(1); // We'll observe what spin() returns and assert accordingly.
      const a = startMachine();

      // Set up bets that we know will split into winners + losers given the seed.
      // We use red and black: whichever the spin lands on wins, the other loses.
      a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'red' }), 5, 'h-red') });
      a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'black' }), 7, 'h-black') });
      a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'straight', n: 19 }), 3, 'h-19') });

      a.send({ type: 'SPIN' });
      await vi.advanceTimersByTimeAsync(ROULETTE_CONFIG.SPIN_DURATION_MS);

      const settled = a.getSnapshot();
      expect(settled.value).toBe('settled');
      const winningNumber = settled.context.spinResult!.number;

      a.send({ type: 'NEW_ROUND' });
      const next = a.getSnapshot();
      expect(next.value).toBe('betting');
      expect(next.context.spinResult).toBeNull();
      expect(next.context.roundResult).toBeNull();

      // Each preserved bet should have its key + amount + numbers intact, but betHandleId cleared.
      for (const bet of next.context.bets) {
        expect(bet.betHandleId).toBe('');
        expect(bet.numbers).not.toContain(winningNumber);
      }
    } finally {
      vi.useRealTimers();
      unseed();
    }
  });

  it('drops all bets when every position wins', async () => {
    vi.useFakeTimers();
    try {
      seed(1);
      const a = startMachine();
      // Bet on every column → exactly one wins on any non-zero spin.
      // To force "all win", bet only on red and a straight on the spin number — needs to know spin first.
      // Simpler synthesis: bet only on a single straight matching the spin.
      // We don't know the spin yet, so we run once to discover it, then re-seed.
      seed(1);
      const dryActor = startMachine();
      dryActor.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'red' }), 5, 'h') });
      dryActor.send({ type: 'SPIN' });
      await vi.advanceTimersByTimeAsync(ROULETTE_CONFIG.SPIN_DURATION_MS);
      const n = dryActor.getSnapshot().context.spinResult!.number;
      dryActor.stop();

      seed(1);
      a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'straight', n }), 5, 'h-s') });
      a.send({ type: 'SPIN' });
      await vi.advanceTimersByTimeAsync(ROULETTE_CONFIG.SPIN_DURATION_MS);
      expect(a.getSnapshot().context.roundResult!.outcome).toBe('win');

      a.send({ type: 'NEW_ROUND' });
      expect(a.getSnapshot().context.bets).toEqual([]);
    } finally {
      vi.useRealTimers();
      unseed();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test --run src/games/roulette/machine.test.ts
```

Expected: FAIL — `NEW_ROUND` is not handled in `settled`; state stays in `settled`.

- [ ] **Step 3: Update `src/games/roulette/machine.ts`**

Add `prepareNextRound` to `actions`, wire `NEW_ROUND` in `settled`:

```ts
// In setup({}).actions add:
prepareNextRound: assign({
  bets: ({ context }) => {
    if (!context.spinResult) return [];
    const winningNumber = context.spinResult.number;
    return context.bets
      .filter((b) => !b.numbers.includes(winningNumber))
      .map((b) => ({ ...b, betHandleId: '' }));
  },
  spinResult: () => null,
  roundResult: () => null,
}),

// Replace the settled state:
settled: {
  on: {
    NEW_ROUND: {
      target: 'betting',
      actions: 'prepareNextRound',
    },
  },
},
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test --run src/games/roulette/machine.test.ts
```

Expected: PASS — all 14+ machine tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/games/roulette/machine.ts src/games/roulette/machine.test.ts
git commit -m "feat(roulette): NEW_ROUND keeps losing bets, drops winners (re-staging)"
```

## Task A.12: Vitest coverage thresholds for roulette

**Files:**

- Modify: `vitest.config.ts`

- [ ] **Step 1: Update `vitest.config.ts`**

Find the `test.coverage` block. Add `src/games/roulette/**/*.ts` paths to `include` AND `thresholds`:

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
      'src/systems/**/*.ts',
    ],
    exclude: ['**/*.test.ts', '**/*.test.tsx'],
    thresholds: {
      'src/games/**/logic.ts': { lines: 90, functions: 90, branches: 85, statements: 90 },
      'src/games/blackjack/**/*.ts': { lines: 90, functions: 90, branches: 85, statements: 90 },
      'src/games/roulette/**/*.ts': { lines: 90, functions: 90, branches: 85, statements: 90 },
      'src/systems/**/*.ts': { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
},
```

Note: roulette uses the strict ≥90% threshold across all `.ts` files (not just `logic.ts`). This is intentional — the machine, bets, wheel are all pure logic too. The visual `.tsx` files in PRs B/C/D are not under the threshold.

- [ ] **Step 2: Run coverage and verify thresholds met**

```bash
pnpm test --run --coverage
```

Expected: all tests pass AND all coverage thresholds met. Per-file table in the v8 output should show ≥90% lines/functions/branches/statements on every `src/games/roulette/*.ts` file. If any file misses, add tests to cover the missing branches before committing.

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "test(roulette): coverage thresholds (≥90% on src/games/roulette/**/*.ts)"
```

## Task A.13: ADR-0029 — European wheel order

**Files:**

- Create: `docs/adr/0029-roulette-european-wheel-order.md`

- [ ] **Step 1: Write `docs/adr/0029-roulette-european-wheel-order.md`**

```markdown
# ADR-0029: Roulette — European single-zero wheel order canonicalized

- Status: Accepted
- Date: 2026-05-17
- Deciders: Developer

## Context

Phase 4 ships European Roulette (single zero, 37 pockets). The wheel must:

1. Render the pockets in the correct geometric order on screen.
2. Provide the spin animation a stable angular target derived from the
   winning number.
3. Optionally support neighbor-based bets in the future (voisins du zéro,
   tiers du cylindre, orphelins).

We need a single source of truth for the pocket sequence around the wheel.

## Decision

Ship `src/games/roulette/wheel.ts` exporting:

- `POCKET_ORDER: readonly number[]` — the 37 numbers in counter-clockwise
  order starting from 0, matching the **real European single-zero wheel**:
  `0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26`.
- `RED_NUMBERS: ReadonlySet<number>` — the canonical 18 reds.
- `colorOf(n)` — `'red' | 'black' | 'green'` lookup.
- `pocketIndexOf(n)` — index into `POCKET_ORDER`, used by `Wheel.tsx` for
  ball positioning.

American wheel (double zero, 38 pockets) is **out of scope** for the
foreseeable future. The constant is `as const` and consumed by
`Wheel.tsx`, `logic.ts`, and tests — there is no runtime mutation.

## Alternatives considered

- **American wheel** — Two pockets (`0` and `00`) and a different number
  sequence (and the unique 5-number "basket" bet at 6:1). Rejected: house
  edge is double the European edge for the same gameplay surface; nothing
  in the user base requires it.
- **Configurable wheel type** — Make the wheel data a config so we could
  switch. Rejected as YAGNI: zero current demand for American, and the
  betting layout (BettingLayout.tsx) would also have to fork. Easier to
  add when actually wanted.
- **Generate the order from a known shuffle** — Tempting, but the
  real-world wheel order is not a closed-form sequence; it's literally a
  37-element constant. Listing it directly is more honest.

## Consequences

- One source of truth for the pocket order. `Wheel.tsx` reads
  `POCKET_ORDER` to lay out SVG arcs; `logic.ts` uses
  `pocketIndexOf` to expose a stable index for ball animation; tests
  pin the constant byte-for-byte.
- Future neighbor bets (voisins / tiers / orphelins) become trivial
  derivations from `POCKET_ORDER`.
- If the test fails because someone reorders the array, the failure
  message points directly at this ADR.

## References

- BUILD_GUIDE §8.2 — "European wheel (single zero, 37 pockets…)"
- `src/games/roulette/wheel.ts`
- `src/games/roulette/wheel.test.ts`
- Phase 4 spec §3.1, §7
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0029-roulette-european-wheel-order.md
git commit -m "docs(adr): 0029 — Roulette European single-zero wheel order"
```

## Task A.14: ADR-0030 — Bet position model

**Files:**

- Create: `docs/adr/0030-roulette-bet-position-model.md`

- [ ] **Step 1: Write `docs/adr/0030-roulette-bet-position-model.md`**

```markdown
# ADR-0030: Roulette — Bet position model + 10-position cap

- Status: Accepted
- Date: 2026-05-17
- Deciders: Developer

## Context

A Roulette round can have multiple bets on the same felt:

- Some are single-number (straight).
- Some span 2 (split), 3 (street), 4 (corner), 6 (six-line), 12
  (column / dozen), or 18 (even-money) numbers.
- A player can stack additional chips on a position they've already bet on.

The internal model needs to:

1. Identify a "position" by a canonical key so stacking sums correctly
   and the UI can render each position deterministically.
2. Cap the number of distinct positions to a sane number to prevent
   pathological state growth (the machine context holds all of them in
   memory and the BettingLayout has to render each one).
3. Map a click target on the felt to the right `BetPosition` exactly once.

## Decision

**`BetPositionKey`** is a deterministic string built by `bets.makeBet(...)`
encoded as:
```

straight:N // N ∈ 0..36
split:N1-N2 // N1 < N2; valid adjacencies only (vertical, horizontal, 0-1/0-2/0-3)
street:N // N = lowest of the row of 3 (1, 4, 7, …, 34)
corner:N // N = top-left of the 2×2 block; N % 3 ∈ {1, 2}; N ≤ 32
six-line:N // N = lowest of the lower of two adjacent streets; N ∈ {1, 4, …, 31}
column:1 | column:2 | column:3
dozen:1 | dozen:2 | dozen:3
red | black | odd | even | low | high

```

**Stacking semantics:** two `PLACE_BET` events with the same key in one
round add their amounts; the machine keeps the first event's
`betHandleId` as the canonical handle for that position (per ADR-0028).

**Position cap:** 10 distinct positions per round
(`ROULETTE_CONFIG.MAX_POSITIONS_PER_ROUND`). The 11th distinct position
is dropped silently. Stacking on an existing position is always allowed.

**Excluded bet types:**

- The American "basket" / "top line" 5-number bet (0, 00, 1, 2, 3) does
  not exist on a single-zero wheel.
- "Streets including 0" (0-1-2 or 0-2-3 as 3-number bets) are excluded.
  Players who want chips on both 0 and 1 use a split.

## Alternatives considered

- **Unbounded position count.** Rejected: state grows unboundedly; UI
  has to render an arbitrary number of click overlays; no real player
  benefit (10 is far more than realistic play).
- **Stack as separate position records keyed by handle ID.** Rejected:
  the felt visually shows one chip stack per position — splitting them
  internally would force the UI to merge for display. Single canonical
  position is the simpler model.
- **Variable cap based on screen size or auth level.** Rejected as
  premature; a single constant in `config.ts` is one line to change if
  we ever want to.
- **Allow American "basket" 0-1-2-3-(00) bet.** Already excluded by the
  single-zero decision in ADR-0029.

## Consequences

- `BettingLayout.tsx` derives a `BetPosition` deterministically from the
  clicked target via `bets.makeBet({...})`.
- The wallet still sees one `placeBet` per chip click; the machine
  aggregates them into one position. `settleRound` is called once per
  round per ADR-0028, with the aggregate `betAmount` and `payout`.
- The 10-position rule pins UI assumptions: chip-stack rendering,
  exposure totals, and the "Clear all bets" affordance are all bounded.

## References

- BUILD_GUIDE §8.2
- ADR-0028 — multi-handle wallet pattern (reused here)
- ADR-0029 — single-zero wheel (drives the excluded bet types)
- `src/games/roulette/bets.ts`
- `src/games/roulette/types.ts`
- `src/games/roulette/config.ts`
- Phase 4 spec §3.4, §5, §8, §13
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0030-roulette-bet-position-model.md
git commit -m "docs(adr): 0030 — Roulette bet position model + 10-position cap"
```

## Task A.15: ADR-0031 — Spin animation contract

**Files:**

- Create: `docs/adr/0031-roulette-spin-animation-contract.md`

- [ ] **Step 1: Write `docs/adr/0031-roulette-spin-animation-contract.md`**

```markdown
# ADR-0031: Roulette — Spin animation contract

- Status: Accepted
- Date: 2026-05-17
- Deciders: Developer

## Context

BUILD_GUIDE §8.2 is explicit: "The wheel animation is cosmetic; the
result is decided by the RNG, then the wheel animates to land on it."
We need to formalise the animation timing, direction, and
reduced-motion behavior in one place so the machine, the page, and the
Wheel component stay in sync.

## Decision

**Timing.** `ROULETTE_CONFIG.SPIN_DURATION_MS = 5000`. This is the
single source of truth for spin duration in both the machine (state
delay) and the Wheel component (Framer Motion `transition.duration`).

**Result before animation.** The machine's `setSpinResult` action
calls `logic.spin()` (which calls `rng.randomInt(0, 36)`) on entering
`spinning`. The Wheel component reads the resulting number from
context and animates to it. There is no race between visual outcome
and stored outcome — the stored outcome is set first, always.

**Directions and easing.**

- Wheel rotates **clockwise**. Total rotation = `5 × 360° + θ` where
  `θ = pocketIndexOf(winningNumber) × (360° / 37)` minus a small offset
  to make the ball appear to settle naturally.
- Ball orbits **counter-clockwise**, decelerating in opposition to the
  wheel (real roulette physics). End angle places the ball over the
  winning pocket once the wheel stops.
- Both use the same easing curve (Framer Motion `[0.16, 1, 0.3, 1]` —
  the standard easeOutExpo equivalent).

**Reduced motion.** When `useReducedMotion()` (from `framer-motion`)
returns true, two things change:

1. The RoulettePage passes `spinDurationMs: 0` to the machine via
   input. The machine settles immediately (no 5-second visual hang).
2. The Wheel component renders the final rotation directly without an
   animated transition.

The pocket-pulse on settled is also skipped under reduced motion. The
result banner appears with `opacity: 1` immediately (no slide).

**Pulse.** On entering `settled`, the winning pocket pulses for
`ROULETTE_CONFIG.RESULT_PULSE_MS` (600ms) with a color-matched halo
(red/black/green). This is purely visual and has no machine effect.

## Alternatives considered

- **Longer spin (8–10s).** Rejected: feels slow and tedious by the
  third round; 5s is the brainstorm-validated sweet spot.
- **Real physics simulation.** Rejected: produces non-deterministic
  visual landings that disagree with the RNG result; defeats the
  "result decided first" guarantee from §8.2.
- **Keep the 5s delay even under reduced motion.** Rejected: forces
  the player to stare at a static page for 5 seconds. Reduced motion
  should reduce delay, not just visual movement.
- **Different easing per element.** Rejected: synchronized easing
  keeps the ball-over-pocket landing deterministic without extra math.

## Consequences

- One config constant tunes spin duration. Changing it requires no
  code edits — only `ROULETTE_CONFIG.SPIN_DURATION_MS`.
- Tests pin the machine's `after` delay to `ROULETTE_CONFIG.SPIN_DURATION_MS`
  and the reduced-motion override path (`spinDurationMs: 0`).
- The Wheel component is "uncontrolled" — it never tells the parent
  where it is; it just reads `spinning` + `targetNumber` + `durationMs`
  props and draws.
- Future "fast spin" mode (Phase 8 polish) is one line: pass
  `spinDurationMs: 2000` from the page if the user toggles a setting.

## References

- BUILD_GUIDE §8.2
- ADR-0029 — wheel order (used for ball-landing math)
- `src/games/roulette/machine.ts` — `delays.spinDuration`
- `src/games/roulette/Wheel.tsx` — animation contract
- `src/games/roulette/config.ts` — `SPIN_DURATION_MS`, `RESULT_PULSE_MS`
- Phase 4 spec §3.2, §12.2, §16
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0031-roulette-spin-animation-contract.md
git commit -m "docs(adr): 0031 — Roulette spin animation contract (5s, reduced-motion)"
```

## Task A.16: PR A — verify, push, open, merge

- [ ] **Step 1: Run the full DoD locally**

```bash
pnpm lint && pnpm typecheck && pnpm test --run && pnpm build
```

Expected: all four exit 0. Tests should show ≥ 50 new tests passing across wheel/bets/logic/machine.

- [ ] **Step 2: Verify coverage thresholds met**

```bash
pnpm test --run --coverage
```

Expected: per-file table shows `src/games/roulette/*.ts` at ≥ 90% lines/functions/branches/statements.

- [ ] **Step 3: Push branch**

```bash
git push -u origin phase-4-roulette-pr-a-logic
```

- [ ] **Step 4: Open PR**

```bash
gh pr create --title "phase-4(roulette): pure logic + XState machine + tests + 3 ADRs" --body "$(cat <<'EOF'
## Summary

PR A of Phase 4. Ships every pure-logic file + the XState v5 round machine + ADRs 0029/0030/0031. No UI yet — the next 3 PRs build the components on top of this base.

- `types.ts`, `config.ts`, `wheel.ts`, `bets.ts`, `logic.ts`, `machine.ts`
- All 10 bet types from BUILD_GUIDE §8.2 implemented with correct payouts
- 60 valid splits / 33 horizontal + 24 vertical + 3 zero-splits
- XState v5 machine: `betting → spinning → settled → betting`
- Reduced-motion path: `spinDurationMs: 0` input collapses spin instantly
- Coverage gate: ≥ 90% on `src/games/roulette/**/*.ts`
- ADR-0029 European wheel order, ADR-0030 bet position model, ADR-0031 spin animation contract

## Test plan

- [x] `pnpm lint && pnpm typecheck && pnpm test --run && pnpm build` green locally
- [x] Coverage thresholds met for `src/games/roulette/**/*.ts`
- [ ] CI green (4 jobs)
- [ ] Subagent two-stage reviews per task passed

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

# PR B — Wheel component

**Branch:** `phase-4-roulette-pr-b-wheel` (off freshly-merged `main`)
**Goal of this PR:** Ship the visual `<Wheel />` component — the polished wooden ring + brass + golden neon glow + 37-pocket SVG + silver turret cross + pearl ball + 5s spin animation + reduced-motion fallback + pocket pulse on settle. Pure presentational component; no wallet, no machine wiring.
**Risk:** Medium. SVG arc geometry + Framer Motion + reduced-motion path. Lots of small geometry that's easy to get off-by-one on.
**Estimated tasks:** 8.

**Visual review strategy.** This PR has no committed dev preview route (deviation from spec §19; rationale at top of plan). Visual verification happens in two ways:

1. **Strong RTL tests** in this PR pin every visible structural property (pocket count, colors, labels, ball position math, animation props).
2. **Integration smoke** in PR D when `RoulettePage` wires the Wheel to the machine — the subagent runs `pnpm dev` and confirms the wheel renders correctly in context.

If the subagent wants to eyeball the wheel earlier, they can temporarily mount `<Wheel targetNumber={17} spinning={false} settled={false} />` inside `StubGamePage.tsx` while developing (do NOT commit that change).

## Task B.1: Branch + new theme tokens (wood, brass, pearl)

**Files:**

- Modify: `tailwind.config.ts` (add roulette wood/brass/pearl colors)
- Modify: `src/theme/tokens.ts` (matching token entries)

The Wheel's classic-casino look needs colors we don't have yet. Adding them to the theme keeps CLAUDE.md project-map happy (no hard-coded hex in components).

- [ ] **Step 1: Branch off freshly-merged main**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-4-roulette-pr-b-wheel
```

- [ ] **Step 2: Add roulette color tokens to `tailwind.config.ts`**

Locate the `colors:` block and add a `roulette` namespace after the existing entries:

```ts
colors: {
  felt: { DEFAULT: '#0b1f17', deep: '#06120c' },
  casino: { red: '#a3122a', 'red-deep': '#6e0a1d' },
  gold: { DEFAULT: '#d4af37', bright: '#f0c64a' },
  neon: { cyan: '#3df0ff', magenta: '#ff5cf2' },
  chip: { win: '#3dd17a', loss: '#7a1f2b', push: '#7a7a7a' },
  roulette: {
    wood: '#6b4423',
    'wood-light': '#8b5a3c',
    'wood-dark': '#4a2d18',
    pocket: '#1a1a1a',
    'pocket-red': '#a3122a',
    'pocket-green': '#3dd17a',
    silver: '#c0c0c0',
    'silver-light': '#f4f4f4',
    'silver-dark': '#707070',
    pearl: '#fff5e8',
    'pearl-cream': '#f0e0c8',
    'felt-table': '#0a3a22',
  },
},
```

And add a matching box-shadow for the golden neon halo:

```ts
boxShadow: {
  'neon-cyan': '0 0 12px rgba(61,240,255,0.6)',
  'neon-magenta': '0 0 12px rgba(255,92,242,0.6)',
  'gold-glow': '0 0 18px rgba(212,175,55,0.55)',
  'roulette-wheel': '0 0 24px rgba(212,175,55,0.6), 0 0 48px rgba(212,175,55,0.35), 0 0 72px rgba(212,175,55,0.15), 0 8px 32px rgba(0,0,0,0.7)',
  'roulette-pulse-red': '0 0 16px 4px rgba(163,18,42,0.85)',
  'roulette-pulse-black': '0 0 16px 4px rgba(255,255,255,0.4)',
  'roulette-pulse-green': '0 0 16px 4px rgba(61,209,122,0.85)',
},
```

- [ ] **Step 3: Add matching entries to `src/theme/tokens.ts`**

```ts
export const tokens = {
  color: {
    bg: { base: '#06120c', felt: '#0b1f17' },
    primary: { red: '#a3122a', redDeep: '#6e0a1d' },
    accent: { gold: '#d4af37', goldBright: '#f0c64a' },
    highlight: { cyan: '#3df0ff', magenta: '#ff5cf2' },
    outcome: { win: '#3dd17a', loss: '#7a1f2b', push: '#7a7a7a' },
    roulette: {
      wood: '#6b4423',
      woodLight: '#8b5a3c',
      woodDark: '#4a2d18',
      pocket: '#1a1a1a',
      pocketRed: '#a3122a',
      pocketGreen: '#3dd17a',
      silver: '#c0c0c0',
      silverLight: '#f4f4f4',
      silverDark: '#707070',
      pearl: '#fff5e8',
      pearlCream: '#f0e0c8',
      feltTable: '#0a3a22',
    },
  },
} as const;

export type ThemeTokens = typeof tokens;
```

- [ ] **Step 4: Typecheck + build**

```bash
pnpm typecheck && pnpm build
```

Expected: both exit 0. Build picks up the new Tailwind classes.

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.ts src/theme/tokens.ts
git commit -m "feat(theme): add roulette wood/brass/silver/pearl color tokens"
```

## Task B.2: Wheel.tsx scaffold + props + render smoke test

**Files:**

- Create: `src/games/roulette/Wheel.tsx` (props + outer layers only; pocket ring + ball arrive in B.3/B.4)
- Create: `src/games/roulette/Wheel.test.tsx`

- [ ] **Step 1: Write the failing test (`Wheel.test.tsx`)**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Wheel from './Wheel';

describe('<Wheel /> scaffold', () => {
  it('renders the wheel container with role=img and a name', () => {
    render(<Wheel targetNumber={null} spinning={false} settled={false} />);
    const wheel = screen.getByRole('img', { name: /roulette wheel/i });
    expect(wheel).toBeInTheDocument();
  });

  it('renders the outer ring, ball track, hub, and turret as separate layers', () => {
    render(<Wheel targetNumber={null} spinning={false} settled={false} />);
    expect(document.querySelector('[data-roulette-layer="outer-ring"]')).toBeInTheDocument();
    expect(document.querySelector('[data-roulette-layer="ball-track"]')).toBeInTheDocument();
    expect(document.querySelector('[data-roulette-layer="hub"]')).toBeInTheDocument();
    expect(document.querySelector('[data-roulette-layer="turret"]')).toBeInTheDocument();
  });

  it('renders a fixed gold pointer at the top', () => {
    render(<Wheel targetNumber={null} spinning={false} settled={false} />);
    expect(document.querySelector('[data-roulette-layer="pointer"]')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test --run src/games/roulette/Wheel.test.tsx
```

Expected: FAIL — cannot import `./Wheel`.

- [ ] **Step 3: Write `src/games/roulette/Wheel.tsx`** (scaffold only)

```tsx
import type { JSX } from 'react';

export interface WheelProps {
  /** Winning number 0..36 when known; null during idle/betting. */
  targetNumber: number | null;
  /** True during the spinning state. Triggers the wheel + ball animation. */
  spinning: boolean;
  /** True after the round settles. Triggers the winning-pocket pulse. */
  settled: boolean;
  /**
   * Spin animation duration in ms. Default 5000. When 0, the wheel snaps to
   * `targetNumber` without any animated transition (reduced-motion path).
   */
  durationMs?: number;
  /**
   * True when `prefers-reduced-motion` is set. Used to skip non-rotation
   * animations (pocket pulse, ball orbit transition). The page passes the
   * result of `useReducedMotion()` from framer-motion.
   */
  reducedMotion?: boolean;
}

export default function Wheel({
  targetNumber,
  spinning,
  settled,
  durationMs = 5000,
  reducedMotion = false,
}: WheelProps): JSX.Element {
  return (
    <div
      role="img"
      aria-label={
        targetNumber !== null ? `Roulette wheel, current target ${targetNumber}` : 'Roulette wheel'
      }
      className="relative h-[320px] w-[320px]"
      data-spinning={spinning}
      data-settled={settled}
      data-target={targetNumber ?? ''}
      data-reduced-motion={reducedMotion}
      data-duration-ms={durationMs}
    >
      {/* Pointer — fixed gold triangle at top, not part of the wheel rotation. */}
      <div
        data-roulette-layer="pointer"
        className="absolute -top-3 left-1/2 z-30 -translate-x-1/2"
        style={{
          width: 0,
          height: 0,
          borderLeft: '12px solid transparent',
          borderRight: '12px solid transparent',
          borderTop: '20px solid var(--tw-color-gold, #d4af37)',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
        }}
      />

      {/* Outer ring — brown wood + brass-gold inner border + GOLDEN NEON GLOW. */}
      <div
        data-roulette-layer="outer-ring"
        className="absolute inset-0 rounded-full bg-gradient-to-br from-roulette-wood-light via-roulette-wood to-roulette-wood-dark shadow-roulette-wheel"
        style={{
          boxShadow:
            '0 0 24px rgba(212,175,55,0.6), 0 0 48px rgba(212,175,55,0.35), 0 0 72px rgba(212,175,55,0.15), inset 0 0 0 6px #d4af37, inset 0 0 0 8px #1a1a1a, 0 8px 32px rgba(0,0,0,0.7)',
        }}
      />

      {/* Ball track — recessed ring between brass band and pocket ring. */}
      <div
        data-roulette-layer="ball-track"
        className="absolute inset-[22px] rounded-full"
        style={{
          background: 'radial-gradient(circle at 35% 30%, rgba(70,45,25,0.4), transparent 60%)',
          boxShadow: 'inset 0 0 0 1px rgba(212,175,55,0.3), inset 0 2px 8px rgba(0,0,0,0.6)',
        }}
      />

      {/* Pocket ring — filled in by Task B.3 with 37 SVG arcs. */}
      <div data-roulette-layer="pocket-ring" className="absolute inset-[36px] rounded-full">
        {/* SVG arcs added in Task B.3 */}
      </div>

      {/* Hub — wood disc behind the turret. */}
      <div
        data-roulette-layer="hub"
        className="absolute inset-[120px] rounded-full bg-gradient-to-br from-roulette-wood-light via-roulette-wood to-roulette-wood-dark"
        style={{
          boxShadow: '0 0 0 2px #d4af37, 0 0 0 3px #1a1a1a, inset 0 0 20px rgba(0,0,0,0.5)',
        }}
      />

      {/* Silver turret cross — 4-arm spinner on top of the hub. */}
      <div data-roulette-layer="turret" className="pointer-events-none absolute inset-[120px]">
        {/* Horizontal arm */}
        <div
          className="absolute left-[6px] right-[6px] top-1/2 h-[10px] -translate-y-1/2 rounded"
          style={{
            background:
              'linear-gradient(180deg, #f4f4f4 0%, #b8b8b8 40%, #888 50%, #b8b8b8 60%, #f4f4f4 100%)',
            boxShadow: '0 0 8px rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.4)',
          }}
        />
        {/* Vertical arm */}
        <div
          className="absolute bottom-[6px] left-1/2 top-[6px] w-[10px] -translate-x-1/2 rounded"
          style={{
            background:
              'linear-gradient(180deg, #f4f4f4 0%, #b8b8b8 40%, #888 50%, #b8b8b8 60%, #f4f4f4 100%)',
            boxShadow: '0 0 8px rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.4)',
          }}
        />
        {/* Center silver cap */}
        <div
          className="absolute left-1/2 top-1/2 z-10 h-[28px] w-[28px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: 'radial-gradient(circle at 35% 30%, #f4f4f4 0%, #c0c0c0 40%, #707070 90%)',
            boxShadow:
              '0 0 0 2px #d4af37, 0 0 12px rgba(255,255,255,0.5), 0 2px 4px rgba(0,0,0,0.4)',
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test --run src/games/roulette/Wheel.test.tsx
```

Expected: PASS — 3 tests pass.

- [ ] **Step 5: Typecheck**

```bash
pnpm typecheck
```

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/games/roulette/Wheel.tsx src/games/roulette/Wheel.test.tsx
git commit -m "feat(roulette): Wheel scaffold (outer ring, hub, turret, pointer)"
```

## Task B.3: Pocket ring — 37 SVG arcs with number labels

**Files:**

- Modify: `src/games/roulette/Wheel.tsx` (replace the pocket-ring stub with real SVG)
- Modify: `src/games/roulette/Wheel.test.tsx` (add arc/label tests)

SVG donut-slice math (one slice per pocket):

```
cx = cy = 124   (center of the 248×248 pocket-ring container — 248 = 320 - 36×2)
rOuter = 124    (full radius of container)
rInner = 76     (leaves room for the hub at inset-[120px] inside the 320 wrap, so r ≈ 80)
arc       = 360 / 37 ≈ 9.7297°
labelR    = 100  (midway between rInner and rOuter)
```

Helper functions live inside Wheel.tsx (small enough to not warrant a separate file).

- [ ] **Step 1: Append failing tests to `Wheel.test.tsx`**

```tsx
import { POCKET_ORDER, colorOf } from './wheel';

describe('<Wheel /> pocket ring', () => {
  it('renders exactly 37 pocket arcs', () => {
    render(<Wheel targetNumber={null} spinning={false} settled={false} />);
    const arcs = document.querySelectorAll('[data-pocket]');
    expect(arcs).toHaveLength(37);
  });

  it('each arc has data-pocket=number and data-color matching colorOf', () => {
    render(<Wheel targetNumber={null} spinning={false} settled={false} />);
    for (const n of POCKET_ORDER) {
      const arc = document.querySelector(`[data-pocket="${n}"]`);
      expect(arc).toBeInTheDocument();
      expect(arc!.getAttribute('data-color')).toBe(colorOf(n));
    }
  });

  it('renders a text label for every pocket', () => {
    render(<Wheel targetNumber={null} spinning={false} settled={false} />);
    for (const n of POCKET_ORDER) {
      const label = document.querySelector(`[data-pocket-label="${n}"]`);
      expect(label).toBeInTheDocument();
      expect(label!.textContent).toBe(String(n));
    }
  });

  it('arcs are children of a single rotating <svg> group', () => {
    render(<Wheel targetNumber={null} spinning={false} settled={false} />);
    const svg = document.querySelector('[data-roulette-layer="pocket-ring"] svg');
    expect(svg).toBeInTheDocument();
    expect(svg!.querySelectorAll('[data-pocket]')).toHaveLength(37);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test --run src/games/roulette/Wheel.test.tsx
```

Expected: FAIL — `data-pocket` elements not found.

- [ ] **Step 3: Replace the pocket-ring stub in `Wheel.tsx`**

At the top of the file, add the imports and helper functions:

```tsx
import { POCKET_ORDER, colorOf } from './wheel';
import type { PocketColor } from './types';

const POCKET_FILL: Record<PocketColor, string> = {
  red: '#a3122a',
  black: '#1a1a1a',
  green: '#3dd17a',
};

const POCKET_RING_SIZE = 248; // 320 - 36*2
const CX = POCKET_RING_SIZE / 2;
const CY = POCKET_RING_SIZE / 2;
const R_OUTER = 124;
const R_INNER = 76;
const LABEL_R = 100;
const ARC_DEG = 360 / 37;

function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  // -90° offset puts pocket 0 at the top of the wheel.
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSlicePath(startDeg: number, endDeg: number): string {
  const startOuter = polar(CX, CY, R_OUTER, startDeg);
  const endOuter = polar(CX, CY, R_OUTER, endDeg);
  const endInner = polar(CX, CY, R_INNER, endDeg);
  const startInner = polar(CX, CY, R_INNER, startDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${R_OUTER} ${R_OUTER} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${R_INNER} ${R_INNER} 0 ${largeArc} 0 ${startInner.x} ${startInner.y}`,
    'Z',
  ].join(' ');
}
```

Then replace the pocket-ring `<div>` (currently with no children) with:

```tsx
<div data-roulette-layer="pocket-ring" className="absolute inset-[36px] rounded-full">
  <svg
    viewBox={`0 0 ${POCKET_RING_SIZE} ${POCKET_RING_SIZE}`}
    width={POCKET_RING_SIZE}
    height={POCKET_RING_SIZE}
    className="overflow-visible"
  >
    {/* gold inner ring border drawn under the pockets */}
    <circle cx={CX} cy={CY} r={R_OUTER} fill="#0b1f17" />
    {POCKET_ORDER.map((n, i) => {
      const startDeg = i * ARC_DEG;
      const endDeg = (i + 1) * ARC_DEG;
      const midDeg = (startDeg + endDeg) / 2;
      const labelPos = polar(CX, CY, LABEL_R, midDeg);
      const color = colorOf(n);
      return (
        <g key={n} data-pocket={n} data-color={color}>
          <path
            d={donutSlicePath(startDeg, endDeg)}
            fill={POCKET_FILL[color]}
            stroke="#d4af37"
            strokeWidth={0.5}
          />
          <text
            data-pocket-label={n}
            x={labelPos.x}
            y={labelPos.y}
            transform={`rotate(${midDeg} ${labelPos.x} ${labelPos.y})`}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#fff"
            stroke="#000"
            strokeWidth={0.4}
            fontSize={12}
            fontFamily="JetBrains Mono, monospace"
            fontWeight="bold"
          >
            {n}
          </text>
        </g>
      );
    })}
    {/* gold inner border ring between pockets and hub */}
    <circle cx={CX} cy={CY} r={R_INNER} fill="none" stroke="#d4af37" strokeWidth={2} />
  </svg>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test --run src/games/roulette/Wheel.test.tsx
```

Expected: PASS — all pocket-ring tests pass.

- [ ] **Step 5: Typecheck**

```bash
pnpm typecheck
```

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/games/roulette/Wheel.tsx src/games/roulette/Wheel.test.tsx
git commit -m "feat(roulette): pocket ring SVG (37 arcs + labels in real wheel order)"
```

## Task B.4: Pearl ball element + positioning math

**Files:**

- Modify: `src/games/roulette/Wheel.tsx` (add ball element + positioning)
- Modify: `src/games/roulette/Wheel.test.tsx` (add ball position test)

The ball orbits in the **ball track** (at radius `R_BALL = (R_OUTER + R_INNER) / 2 = 100`, in the same coordinate space as the pocket ring). Final position when settled = polar coordinates of the winning pocket's midpoint.

When `spinning=true` AND `targetNumber !== null`, the ball is rendered at its destination. The orbit animation arrives in Task B.5; for this task we just place it correctly when stationary.

- [ ] **Step 1: Append failing test to `Wheel.test.tsx`**

```tsx
import { POCKET_ORDER as ORDER } from './wheel';

describe('<Wheel /> ball', () => {
  it('hidden when targetNumber is null', () => {
    render(<Wheel targetNumber={null} spinning={false} settled={false} />);
    expect(document.querySelector('[data-roulette-layer="ball"]')).toBeNull();
  });

  it('renders the ball when targetNumber is set', () => {
    render(<Wheel targetNumber={17} spinning={false} settled={true} />);
    const ball = document.querySelector('[data-roulette-layer="ball"]');
    expect(ball).toBeInTheDocument();
  });

  it("ball's data-pocket attribute matches targetNumber", () => {
    render(<Wheel targetNumber={32} spinning={false} settled={true} />);
    const ball = document.querySelector('[data-roulette-layer="ball"]');
    expect(ball!.getAttribute('data-pocket')).toBe('32');
  });

  it("ball's data-pocket-index reflects POCKET_ORDER position", () => {
    render(<Wheel targetNumber={32} spinning={false} settled={true} />);
    const ball = document.querySelector('[data-roulette-layer="ball"]');
    // 32 is at index 1 in POCKET_ORDER (after 0).
    expect(ball!.getAttribute('data-pocket-index')).toBe(String(ORDER.indexOf(32)));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test --run src/games/roulette/Wheel.test.tsx
```

Expected: FAIL — `data-roulette-layer="ball"` not found.

- [ ] **Step 3: Add the ball to `Wheel.tsx`**

Add constants near the top:

```tsx
const R_BALL = (R_OUTER + R_INNER) / 2;
const BALL_SIZE = 14;
```

Just inside the outer `<div>` (between the turret and the closing `</div>`), add:

```tsx
{
  /* Pearl ball — appears once a target is known, animates in Task B.5. */
}
{
  targetNumber !== null &&
    (() => {
      const idx = POCKET_ORDER.indexOf(targetNumber);
      const midDeg = idx * ARC_DEG + ARC_DEG / 2;
      // Ball lives in the same 248×248 coordinate space as the pocket ring,
      // which is inset 36px inside the 320×320 wrap.
      const pos = polar(CX, CY, R_BALL, midDeg);
      const left = 36 + pos.x - BALL_SIZE / 2;
      const top = 36 + pos.y - BALL_SIZE / 2;
      return (
        <div
          data-roulette-layer="ball"
          data-pocket={targetNumber}
          data-pocket-index={idx}
          className="absolute z-20 rounded-full"
          style={{
            width: BALL_SIZE,
            height: BALL_SIZE,
            left,
            top,
            background:
              'radial-gradient(circle at 30% 25%, #ffffff 0%, #fff5e8 30%, #f0e0c8 60%, #c9b896 100%)',
            boxShadow:
              '0 0 6px rgba(255,255,255,0.8), 0 0 12px rgba(255,220,180,0.4), 0 1px 2px rgba(0,0,0,0.4)',
          }}
        />
      );
    })();
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test --run src/games/roulette/Wheel.test.tsx
```

Expected: PASS — all ball tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/games/roulette/Wheel.tsx src/games/roulette/Wheel.test.tsx
git commit -m "feat(roulette): pearl ball element with pocket-correct positioning"
```

## Task B.5: Spin animation via Framer Motion (wheel rotation)

**Files:**

- Modify: `src/games/roulette/Wheel.tsx` (wrap pocket-ring `<svg>` in `motion.svg`, drive rotation from props)
- Modify: `src/games/roulette/Wheel.test.tsx` (assert rotation target attribute on the motion element)

The wheel rotates clockwise. Total rotation = `5 × 360 + θ` where `θ` is the angular position of the winning pocket. We use `motion.svg` for the pocket ring and pass `animate={{ rotate: targetDeg }}` plus a `transition` whose `duration` reads from the `durationMs` prop.

Easing: `[0.16, 1, 0.3, 1]` (easeOutExpo-ish), matches Framer Motion conventions and feels right for a roulette wheel decelerating.

- [ ] **Step 1: Append failing test to `Wheel.test.tsx`**

```tsx
describe('<Wheel /> spin animation', () => {
  it('when spinning + targetNumber set, the pocket-ring svg has data-rotate-target set', () => {
    render(<Wheel targetNumber={32} spinning={true} settled={false} durationMs={5000} />);
    const motionSvg = document.querySelector('[data-roulette-layer="pocket-ring"] svg');
    expect(motionSvg).toBeInTheDocument();
    // Target = 5 full turns + θ where θ = idx(32) * 360/37
    // idx(32) = 1, so θ = 360/37 ≈ 9.7297, target = 5*360 + 9.7297 ≈ 1809.7
    const target = motionSvg!.getAttribute('data-rotate-target');
    expect(target).not.toBeNull();
    const value = Number(target);
    expect(value).toBeGreaterThan(1809);
    expect(value).toBeLessThan(1810);
  });

  it('when not spinning + targetNumber set, the wheel rests at θ (no full turns)', () => {
    render(<Wheel targetNumber={32} spinning={false} settled={true} durationMs={5000} />);
    const motionSvg = document.querySelector('[data-roulette-layer="pocket-ring"] svg');
    const value = Number(motionSvg!.getAttribute('data-rotate-target'));
    expect(value).toBeGreaterThan(9);
    expect(value).toBeLessThan(10);
  });

  it('when targetNumber is null, rotate target is 0', () => {
    render(<Wheel targetNumber={null} spinning={false} settled={false} />);
    const motionSvg = document.querySelector('[data-roulette-layer="pocket-ring"] svg');
    expect(motionSvg!.getAttribute('data-rotate-target')).toBe('0');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test --run src/games/roulette/Wheel.test.tsx
```

Expected: FAIL — `data-rotate-target` attribute not set.

- [ ] **Step 3: Wire Framer Motion in `Wheel.tsx`**

Add to imports:

```tsx
import { motion } from 'framer-motion';
```

Add a rotation-computation block just inside the component body (after the prop destructuring):

```tsx
const targetIdx = targetNumber !== null ? POCKET_ORDER.indexOf(targetNumber) : 0;
const thetaDeg = targetIdx * ARC_DEG;
const rotateTarget = targetNumber === null ? 0 : spinning ? 5 * 360 + thetaDeg : thetaDeg;
```

Replace the existing pocket-ring `<svg>` with `motion.svg`:

```tsx
<motion.svg
  viewBox={`0 0 ${POCKET_RING_SIZE} ${POCKET_RING_SIZE}`}
  width={POCKET_RING_SIZE}
  height={POCKET_RING_SIZE}
  className="overflow-visible"
  data-rotate-target={rotateTarget}
  animate={{ rotate: rotateTarget }}
  transition={
    durationMs === 0 ? { duration: 0 } : { duration: durationMs / 1000, ease: [0.16, 1, 0.3, 1] }
  }
  style={{ originX: '50%', originY: '50%' }}
>
  {/* ...same children as before (circle + arcs + inner border)... */}
</motion.svg>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test --run src/games/roulette/Wheel.test.tsx
```

Expected: PASS — all rotation-target tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/games/roulette/Wheel.tsx src/games/roulette/Wheel.test.tsx
git commit -m "feat(roulette): wheel spin animation (5 turns + theta, easeOut)"
```

## Task B.6: Reduced-motion fallback

**Files:**

- Modify: `src/games/roulette/Wheel.tsx` (skip transition when `reducedMotion` is true)
- Modify: `src/games/roulette/Wheel.test.tsx` (add reduced-motion test)

When `reducedMotion=true`, force `transition: { duration: 0 }` regardless of `durationMs`. This means the rotation visually jumps to `rotateTarget` immediately. The `durationMs=0` path from Task B.5 already does this — the only addition is honoring the explicit `reducedMotion` prop too (in case the page passes `durationMs > 0` but reducedMotion is on, which shouldn't happen with our page wiring but is defensive).

- [ ] **Step 1: Append failing test to `Wheel.test.tsx`**

```tsx
describe('<Wheel /> reduced motion', () => {
  it('when reducedMotion=true, container records data-reduced-motion=true', () => {
    render(
      <Wheel
        targetNumber={17}
        spinning={true}
        settled={false}
        durationMs={5000}
        reducedMotion={true}
      />,
    );
    const container = screen.getByRole('img', { name: /roulette wheel/i });
    expect(container.getAttribute('data-reduced-motion')).toBe('true');
  });

  it('when reducedMotion=true, the pocket-ring svg snaps (no animated transition)', () => {
    render(
      <Wheel
        targetNumber={17}
        spinning={true}
        settled={false}
        durationMs={5000}
        reducedMotion={true}
      />,
    );
    const motionSvg = document.querySelector('[data-roulette-layer="pocket-ring"] svg');
    // We expose the chosen transition duration as a data attribute for testability.
    expect(motionSvg!.getAttribute('data-transition-duration')).toBe('0');
  });

  it('when reducedMotion=false but durationMs=0, also snaps', () => {
    render(
      <Wheel
        targetNumber={17}
        spinning={true}
        settled={false}
        durationMs={0}
        reducedMotion={false}
      />,
    );
    const motionSvg = document.querySelector('[data-roulette-layer="pocket-ring"] svg');
    expect(motionSvg!.getAttribute('data-transition-duration')).toBe('0');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test --run src/games/roulette/Wheel.test.tsx
```

Expected: FAIL — `data-transition-duration` not set.

- [ ] **Step 3: Update `Wheel.tsx`**

Compute the effective duration and expose it as a data attribute:

```tsx
const effectiveDurationSec = reducedMotion || durationMs === 0 ? 0 : durationMs / 1000;
```

Update the `motion.svg`:

```tsx
<motion.svg
  viewBox={`0 0 ${POCKET_RING_SIZE} ${POCKET_RING_SIZE}`}
  width={POCKET_RING_SIZE}
  height={POCKET_RING_SIZE}
  className="overflow-visible"
  data-rotate-target={rotateTarget}
  data-transition-duration={effectiveDurationSec}
  animate={{ rotate: rotateTarget }}
  transition={
    effectiveDurationSec === 0
      ? { duration: 0 }
      : { duration: effectiveDurationSec, ease: [0.16, 1, 0.3, 1] }
  }
  style={{ originX: '50%', originY: '50%' }}
>
  ...
</motion.svg>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test --run src/games/roulette/Wheel.test.tsx
```

Expected: PASS — reduced-motion tests green; previous tests still green.

- [ ] **Step 5: Commit**

```bash
git add src/games/roulette/Wheel.tsx src/games/roulette/Wheel.test.tsx
git commit -m "feat(roulette): reduced-motion path for wheel (transition duration 0)"
```

## Task B.7: Pocket pulse on settled

**Files:**

- Modify: `src/games/roulette/Wheel.tsx` (apply pulse style to the winning pocket when settled)
- Modify: `src/games/roulette/Wheel.test.tsx` (add pulse test)

When `settled=true` and `targetNumber !== null` and `reducedMotion=false`: the winning pocket gets a `data-pulse="true"` attribute on its `<g>` element, and the path stroke widens with a color-matched glow drop-shadow. Pure visual; no JS animation.

- [ ] **Step 1: Append failing test to `Wheel.test.tsx`**

```tsx
describe('<Wheel /> pocket pulse', () => {
  it('when settled + targetNumber, that pocket has data-pulse=true', () => {
    render(<Wheel targetNumber={17} spinning={false} settled={true} />);
    const winning = document.querySelector('[data-pocket="17"]');
    expect(winning!.getAttribute('data-pulse')).toBe('true');

    const otherPocket = document.querySelector('[data-pocket="18"]');
    expect(otherPocket!.getAttribute('data-pulse')).toBeNull();
  });

  it('no pocket pulses when not settled', () => {
    render(<Wheel targetNumber={17} spinning={false} settled={false} />);
    expect(document.querySelectorAll('[data-pulse="true"]')).toHaveLength(0);
  });

  it('reduced motion suppresses the pulse', () => {
    render(<Wheel targetNumber={17} spinning={false} settled={true} reducedMotion={true} />);
    expect(document.querySelectorAll('[data-pulse="true"]')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test --run src/games/roulette/Wheel.test.tsx
```

Expected: FAIL — `data-pulse` attribute not set.

- [ ] **Step 3: Update the pocket `<g>` in `Wheel.tsx`**

Compute a `shouldPulse` flag per pocket:

```tsx
const pulseEnabled = settled && targetNumber !== null && !reducedMotion;

{
  POCKET_ORDER.map((n, i) => {
    const startDeg = i * ARC_DEG;
    const endDeg = (i + 1) * ARC_DEG;
    const midDeg = (startDeg + endDeg) / 2;
    const labelPos = polar(CX, CY, LABEL_R, midDeg);
    const color = colorOf(n);
    const isWinner = pulseEnabled && n === targetNumber;
    return (
      <g key={n} data-pocket={n} data-color={color} data-pulse={isWinner ? 'true' : undefined}>
        <path
          d={donutSlicePath(startDeg, endDeg)}
          fill={POCKET_FILL[color]}
          stroke={isWinner ? '#fff' : '#d4af37'}
          strokeWidth={isWinner ? 2 : 0.5}
          style={
            isWinner
              ? {
                  filter:
                    color === 'red'
                      ? 'drop-shadow(0 0 8px rgba(163,18,42,1)) drop-shadow(0 0 16px rgba(163,18,42,0.6))'
                      : color === 'green'
                        ? 'drop-shadow(0 0 8px rgba(61,209,122,1)) drop-shadow(0 0 16px rgba(61,209,122,0.6))'
                        : 'drop-shadow(0 0 8px rgba(255,255,255,0.85)) drop-shadow(0 0 16px rgba(255,255,255,0.45))',
                }
              : undefined
          }
        />
        <text
          data-pocket-label={n}
          x={labelPos.x}
          y={labelPos.y}
          transform={`rotate(${midDeg} ${labelPos.x} ${labelPos.y})`}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#fff"
          stroke="#000"
          strokeWidth={0.4}
          fontSize={12}
          fontFamily="JetBrains Mono, monospace"
          fontWeight="bold"
        >
          {n}
        </text>
      </g>
    );
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test --run src/games/roulette/Wheel.test.tsx
```

Expected: PASS — pulse tests green; previous tests still green.

- [ ] **Step 5: Commit**

```bash
git add src/games/roulette/Wheel.tsx src/games/roulette/Wheel.test.tsx
git commit -m "feat(roulette): winning-pocket pulse on settle (color-matched glow)"
```

## Task B.8: PR B — verify, push, open, merge

- [ ] **Step 1: Run the full DoD locally**

```bash
pnpm lint && pnpm typecheck && pnpm test --run && pnpm build
```

Expected: all four exit 0. Test run shows ≥ 15 new Wheel tests passing (all previous tests still passing).

- [ ] **Step 2: Push branch**

```bash
git push -u origin phase-4-roulette-pr-b-wheel
```

- [ ] **Step 3: Open PR**

```bash
gh pr create --title "phase-4(roulette): Wheel component (SVG arcs + spin + ball + pulse)" --body "$(cat <<'EOF'
## Summary

PR B of Phase 4. Ships the visual `<Wheel />` component.

- Classic wooden ring + brass-gold border + golden neon glow halo
- 37 SVG arc pockets with number labels in real European wheel order
- Silver turret cross (4-arm spinner + center cap)
- Pearl ball with pocket-correct positioning
- 5-second spin animation (Framer Motion, easeOut, 5 full turns + θ)
- Reduced-motion path (transition duration 0, no pulse)
- Winning-pocket pulse on settle (color-matched glow)
- New theme tokens: `roulette-wood / wood-light / wood-dark / pocket / pearl / silver / felt-table`

## Test plan

- [x] `pnpm lint && pnpm typecheck && pnpm test --run && pnpm build` green locally
- [ ] CI green (4 jobs)
- [ ] Subagent two-stage reviews per task passed
- [ ] Visual smoke deferred to PR D (full RoulettePage)

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

# PR C — BettingLayout + ChipSelector + ChipStack

**Branch:** `phase-4-roulette-pr-c-betting` (off freshly-merged `main`)
**Goal of this PR:** Ship the green felt + 37 number cells + edge target overlays for splits/corners/streets/six-lines + the three outside-bet rows (columns/dozens/even-money) + the 6-chip denomination selector + the per-position chip-stack renderer. Pure presentational + interaction; no machine, no wallet — those wire in PR D.
**Risk:** Medium-high. Click target geometry is the trickiest single thing in Phase 4. The 60 splits + 22 corners + 12 streets + 11 six-lines + 6 even-money bars must all map to the correct `bets.makeBet(...)` calls.
**Estimated tasks:** 9.

**Coordinate system (locked across the whole PR).** All positions are in pixels, relative to the felt's top-left:

```
const CELL_W = 48;        // each number cell
const CELL_H = 32;
const ZERO_W = 32;        // narrower zero cell
const COL_BTN_W = 48;     // the three "2:1" buttons on the right
const SPLIT_THICK = 10;   // thickness of split-edge overlays
const CORNER_SIZE = 14;   // square corner overlays
const STREET_THICK = 10;  // street and six-line are placed on the bottom outside line
const DOZEN_H = 28;
const EVEN_H = 28;
const GUTTER = 4;         // small vertical gap between number grid, dozens, even-money

// Visual column → pixel positions
function cellLeft(visualCol: number): number {
  // visualCol ∈ 1..12
  return ZERO_W + (visualCol - 1) * CELL_W;
}
function cellTop(row: number): number {
  // row ∈ 1..3 (1 = top, 3 = bottom of the number grid)
  return (row - 1) * CELL_H;
}

// (visualCol, row) → roulette number
//   row 1 (top)    → 3 * visualCol      (3, 6, 9, …, 36)
//   row 2 (middle) → 3 * visualCol - 1  (2, 5, 8, …, 35)
//   row 3 (bottom) → 3 * visualCol - 2  (1, 4, 7, …, 34)
function cellNumber(visualCol: number, row: number): number {
  return 3 * visualCol - (row - 1);
}

// Total felt interior width
const FELT_W = ZERO_W + 12 * CELL_W + COL_BTN_W;  // 32 + 576 + 48 = 656
const FELT_H = 3 * CELL_H + GUTTER + DOZEN_H + GUTTER + EVEN_H; // 96 + 4 + 28 + 4 + 28 = 160
```

Every task in PR C uses these constants. Put them at the top of `BettingLayout.tsx`.

## Task C.1: ChipSelector component + test

**Files:**

- Create: `src/games/roulette/ChipSelector.tsx`
- Create: `src/games/roulette/ChipSelector.test.tsx`

Six chip buttons in a horizontal row. Locked colors from the spec: $5 red, $25 green, $100 black, $250 yellow, $500 purple, $1000 orange. Selected chip has a gold ring + slight scale-up. Disabled when `disabled` prop is true.

- [ ] **Step 1: Branch off freshly-merged main**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-4-roulette-pr-c-betting
```

- [ ] **Step 2: Write the failing test (`ChipSelector.test.tsx`)**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChipSelector from './ChipSelector';
import { ROULETTE_CONFIG } from './config';

describe('<ChipSelector />', () => {
  it('renders all 6 denominations as buttons in order', () => {
    render(<ChipSelector value={5} onChange={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(6);
    for (let i = 0; i < 6; i++) {
      const d = ROULETTE_CONFIG.CHIP_DENOMINATIONS[i]!;
      expect(buttons[i]!.getAttribute('data-chip')).toBe(String(d));
    }
  });

  it('the selected chip has data-selected="true"', () => {
    render(<ChipSelector value={100} onChange={() => {}} />);
    const selected = document.querySelector('[data-selected="true"]');
    expect(selected!.getAttribute('data-chip')).toBe('100');
  });

  it('clicking a chip calls onChange with its denomination', async () => {
    const onChange = vi.fn();
    render(<ChipSelector value={5} onChange={onChange} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /250/i }));
    expect(onChange).toHaveBeenCalledWith(250);
  });

  it('when disabled, no click triggers onChange', async () => {
    const onChange = vi.fn();
    render(<ChipSelector value={5} onChange={onChange} disabled />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /100/i }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm test --run src/games/roulette/ChipSelector.test.tsx
```

Expected: FAIL — cannot import `./ChipSelector`.

- [ ] **Step 4: Write `src/games/roulette/ChipSelector.tsx`**

```tsx
import type { JSX } from 'react';
import { ROULETTE_CONFIG, type ChipDenomination } from './config';

interface Props {
  value: ChipDenomination;
  onChange: (next: ChipDenomination) => void;
  disabled?: boolean;
}

const CHIP_COLORS: Record<ChipDenomination, { bg: string; ring: string; text: string }> = {
  5: { bg: '#e85d75', ring: '#fff', text: '#fff' },
  25: { bg: '#3dd17a', ring: '#fff', text: '#06120c' },
  100: { bg: '#1a1a1a', ring: '#d4af37', text: '#ffe066' },
  250: { bg: '#ffd23f', ring: '#1a1a1a', text: '#06120c' },
  500: { bg: '#7a3fff', ring: '#fff', text: '#fff' },
  1000: { bg: '#ff7a3f', ring: '#fff', text: '#06120c' },
};

export default function ChipSelector({ value, onChange, disabled = false }: Props): JSX.Element {
  return (
    <div className="flex items-center gap-2.5">
      <span className="mr-1 text-[11px] uppercase tracking-wider text-white/50">Chip:</span>
      {ROULETTE_CONFIG.CHIP_DENOMINATIONS.map((d) => {
        const palette = CHIP_COLORS[d];
        const selected = d === value;
        return (
          <button
            key={d}
            type="button"
            data-chip={d}
            data-selected={selected ? 'true' : 'false'}
            disabled={disabled}
            onClick={() => onChange(d)}
            aria-label={`Select ${d}-chip`}
            aria-pressed={selected}
            className={`grid h-11 w-11 place-items-center rounded-full text-[12px] font-bold transition-transform disabled:opacity-40 ${
              selected ? 'scale-110 ring-2 ring-gold-bright' : 'hover:scale-105'
            }`}
            style={{
              background: palette.bg,
              color: palette.text,
              border: `3px solid ${palette.ring}`,
              boxShadow: selected ? '0 0 12px rgba(240,198,74,0.6)' : 'none',
            }}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test --run src/games/roulette/ChipSelector.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/games/roulette/ChipSelector.tsx src/games/roulette/ChipSelector.test.tsx
git commit -m "feat(roulette): ChipSelector with 6 denominations (5/25/100/250/500/1000)"
```

## Task C.2: ChipStack component + test

**Files:**

- Create: `src/games/roulette/ChipStack.tsx`
- Create: `src/games/roulette/ChipStack.test.tsx`

Greedy breakdown of an integer chip amount into denominations from `CHIP_DENOMINATIONS` (largest-first). Renders as small stacked circles. If breakdown produces > 6 visual chips, collapse to a single top chip + amount badge.

- [ ] **Step 1: Write the failing test (`ChipStack.test.tsx`)**

```tsx
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import ChipStack, { breakdown } from './ChipStack';

describe('breakdown', () => {
  it('exact denomination → single chip', () => {
    expect(breakdown(5)).toEqual([5]);
    expect(breakdown(1000)).toEqual([1000]);
  });

  it('combines largest-first', () => {
    expect(breakdown(435)).toEqual([250, 100, 25, 25, 25, 5, 5]);
  });

  it('handles 0 chips → empty array', () => {
    expect(breakdown(0)).toEqual([]);
  });

  it('handles 5 + 5 = 10 with two 5s (no smaller denom available)', () => {
    expect(breakdown(10)).toEqual([5, 5]);
  });

  it('uses 1000s, 500s, etc. for large amounts', () => {
    expect(breakdown(2750)).toEqual([1000, 1000, 500, 250]);
  });

  it('rejects negative or non-integer (returns empty)', () => {
    expect(breakdown(-5)).toEqual([]);
    expect(breakdown(3.5)).toEqual([]);
  });
});

describe('<ChipStack />', () => {
  it('renders one chip per breakdown entry when ≤ 6 chips', () => {
    const { container } = render(<ChipStack amount={75} />);
    // 75 = 25 + 25 + 25 → 3 chips
    expect(container.querySelectorAll('[data-chip-denom]')).toHaveLength(3);
  });

  it('renders an "overflow" stack with amount badge when > 6 chips', () => {
    const { container } = render(<ChipStack amount={435} />);
    // breakdown is 7 chips → overflow
    expect(container.querySelector('[data-chip-stack-overflow]')).toBeInTheDocument();
    expect(container.querySelector('[data-chip-stack-overflow]')!.textContent).toContain('435');
  });

  it('renders nothing when amount is 0', () => {
    const { container } = render(<ChipStack amount={0} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test --run src/games/roulette/ChipStack.test.tsx
```

Expected: FAIL — cannot import `./ChipStack`.

- [ ] **Step 3: Write `src/games/roulette/ChipStack.tsx`**

```tsx
import type { JSX } from 'react';
import { ROULETTE_CONFIG, type ChipDenomination } from './config';

export function breakdown(amount: number): ChipDenomination[] {
  if (!Number.isInteger(amount) || amount <= 0) return [];
  const denoms = [...ROULETTE_CONFIG.CHIP_DENOMINATIONS].sort((a, b) => b - a);
  const result: ChipDenomination[] = [];
  let remaining = amount;
  for (const d of denoms) {
    while (remaining >= d) {
      result.push(d);
      remaining -= d;
    }
  }
  return result;
}

const CHIP_COLORS: Record<ChipDenomination, { bg: string; ring: string; text: string }> = {
  5: { bg: '#e85d75', ring: '#fff', text: '#fff' },
  25: { bg: '#3dd17a', ring: '#fff', text: '#06120c' },
  100: { bg: '#1a1a1a', ring: '#d4af37', text: '#ffe066' },
  250: { bg: '#ffd23f', ring: '#1a1a1a', text: '#06120c' },
  500: { bg: '#7a3fff', ring: '#fff', text: '#fff' },
  1000: { bg: '#ff7a3f', ring: '#fff', text: '#06120c' },
};

interface Props {
  amount: number;
  /** Optional fixed size for the chip. Default 24px. */
  size?: number;
}

const OVERFLOW_THRESHOLD = 6;

export default function ChipStack({ amount, size = 24 }: Props): JSX.Element | null {
  const chips = breakdown(amount);
  if (chips.length === 0) return null;

  if (chips.length <= OVERFLOW_THRESHOLD) {
    return (
      <div
        className="pointer-events-none relative"
        style={{ width: size, height: size + chips.length * 3 }}
      >
        {chips.map((d, i) => {
          const palette = CHIP_COLORS[d];
          return (
            <div
              key={`${d}-${i}`}
              data-chip-denom={d}
              className="absolute left-0 grid place-items-center rounded-full text-[9px] font-bold"
              style={{
                width: size,
                height: size,
                bottom: i * 3,
                background: palette.bg,
                color: palette.text,
                border: `2px solid ${palette.ring}`,
                boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
              }}
            >
              {d}
            </div>
          );
        })}
      </div>
    );
  }

  // Overflow: top chip = largest denomination present, plus a small total badge.
  const top = chips[0]!;
  const palette = CHIP_COLORS[top];
  return (
    <div
      data-chip-stack-overflow
      className="pointer-events-none relative grid place-items-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        background: palette.bg,
        color: palette.text,
        border: `2px solid ${palette.ring}`,
        boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
        fontSize: 9,
      }}
    >
      {top}
      <span
        className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-felt-deep px-1 text-[9px] text-gold-bright"
        style={{ border: '1px solid #d4af37' }}
      >
        {amount}
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test --run src/games/roulette/ChipStack.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/games/roulette/ChipStack.tsx src/games/roulette/ChipStack.test.tsx
git commit -m "feat(roulette): ChipStack with greedy breakdown + overflow handling"
```

## Task C.3: BettingLayout — number cells (zero + 3×12 grid)

**Files:**

- Create: `src/games/roulette/BettingLayout.tsx`
- Create: `src/games/roulette/BettingLayout.test.tsx`

This task ships the zero cell + the 36 number cells with click handlers that call `onPlaceBet` with a `straight` bet. Outside bars, dozens, edge overlays arrive in subsequent tasks.

- [ ] **Step 1: Write the failing test (`BettingLayout.test.tsx`)**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BettingLayout from './BettingLayout';
import type { PlacedBet } from './types';

describe('<BettingLayout /> number cells', () => {
  it('renders 37 number cells (0 plus 1..36)', () => {
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
      />,
    );
    for (let n = 0; n <= 36; n++) {
      expect(document.querySelector(`[data-cell-number="${n}"]`)).toBeInTheDocument();
    }
  });

  it('cell colors follow colorOf', () => {
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
      />,
    );
    expect(document.querySelector('[data-cell-number="0"]')!.getAttribute('data-color')).toBe(
      'green',
    );
    expect(document.querySelector('[data-cell-number="1"]')!.getAttribute('data-color')).toBe(
      'red',
    );
    expect(document.querySelector('[data-cell-number="2"]')!.getAttribute('data-color')).toBe(
      'black',
    );
    expect(document.querySelector('[data-cell-number="17"]')!.getAttribute('data-color')).toBe(
      'black',
    );
  });

  it('clicking a number cell calls onPlaceBet with a straight bet of chipAmount', async () => {
    const onPlaceBet = vi.fn();
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={25}
        onPlaceBet={onPlaceBet}
        onRemoveBet={() => {}}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /straight bet on 17/i }));
    expect(onPlaceBet).toHaveBeenCalledTimes(1);
    expect(onPlaceBet.mock.calls[0]![0]).toMatchObject({
      key: 'straight:17',
      type: 'straight',
      amount: 25,
    });
  });

  it('clicking 0 calls onPlaceBet with straight:0', async () => {
    const onPlaceBet = vi.fn();
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={onPlaceBet}
        onRemoveBet={() => {}}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /straight bet on 0/i }));
    expect(onPlaceBet.mock.calls[0]![0].key).toBe('straight:0');
  });

  it('renders chip stack on cells that have bets', () => {
    const bets: PlacedBet[] = [
      {
        key: 'straight:17',
        type: 'straight',
        numbers: [17],
        payoutMultiple: 35,
        amount: 30,
        betHandleId: 'h',
      },
    ];
    render(
      <BettingLayout
        bets={bets}
        disabled={false}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
      />,
    );
    // Chip stack rendered inside the cell or absolutely positioned over it.
    const stack = document.querySelector('[data-bet-stack="straight:17"]');
    expect(stack).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test --run src/games/roulette/BettingLayout.test.tsx
```

Expected: FAIL — cannot import `./BettingLayout`.

- [ ] **Step 3: Write `src/games/roulette/BettingLayout.tsx`** (zero + numbers + chip stacks; outside/overlays in later tasks)

```tsx
import type { JSX } from 'react';
import { makeBet } from './bets';
import { colorOf } from './wheel';
import ChipStack from './ChipStack';
import type { BetPosition, BetPositionKey, PlacedBet } from './types';

// --- Coordinate constants (locked across PR C) ---
const CELL_W = 48;
const CELL_H = 32;
const ZERO_W = 32;
const COL_BTN_W = 48;
const GUTTER = 4;
const DOZEN_H = 28;
const EVEN_H = 28;

const FELT_W = ZERO_W + 12 * CELL_W + COL_BTN_W; // 656
const FELT_H = 3 * CELL_H + GUTTER + DOZEN_H + GUTTER + EVEN_H; // 160

function cellLeft(visualCol: number): number {
  return ZERO_W + (visualCol - 1) * CELL_W;
}
function cellTop(row: number): number {
  return (row - 1) * CELL_H;
}
function cellNumber(visualCol: number, row: number): number {
  return 3 * visualCol - (row - 1);
}

// --- Colors ---
const CELL_FILLS: Record<'red' | 'black' | 'green', string> = {
  red: '#a3122a',
  black: '#1a1a1a',
  green: '#3dd17a',
};

// --- Props ---
export interface BettingLayoutProps {
  /** Current bets on the felt this round. */
  bets: readonly PlacedBet[];
  /** True during spinning/settled — clicks are ignored. */
  disabled: boolean;
  /** Current chip denomination. Clicking a target adds this many chips to the position. */
  chipAmount: number;
  /** Called when a click target is hit. Receives a fully-formed BetPosition + amount. */
  onPlaceBet: (bet: BetPosition & { amount: number }) => void;
  /** Called when a chip stack is clicked (right-click or X button — for now, unused; reserved). */
  onRemoveBet: (key: BetPositionKey) => void;
}

export default function BettingLayout({
  bets,
  disabled,
  chipAmount,
  onPlaceBet,
}: BettingLayoutProps): JSX.Element {
  const handleStraight = (n: number) => {
    if (disabled) return;
    onPlaceBet({ ...makeBet({ type: 'straight', n }), amount: chipAmount });
  };

  const betByKey = new Map(bets.map((b) => [b.key, b]));

  return (
    <div
      data-roulette-felt
      className="relative mx-auto overflow-x-auto rounded-lg p-4"
      style={{
        background: 'linear-gradient(180deg, #0a3a22 0%, #0b2a18 100%)',
        boxShadow: 'inset 0 0 0 2px #d4af37, inset 0 0 0 3px #1a1a1a',
      }}
    >
      <div className="relative" style={{ width: FELT_W, height: FELT_H }}>
        {/* Zero cell */}
        <button
          type="button"
          data-cell-number={0}
          data-color="green"
          disabled={disabled}
          onClick={() => handleStraight(0)}
          aria-label="Straight bet on 0"
          className="absolute flex items-center justify-center font-display text-white"
          style={{
            left: 0,
            top: 0,
            width: ZERO_W,
            height: 3 * CELL_H,
            background: CELL_FILLS.green,
            color: '#06120c',
            border: '1px solid rgba(212,175,55,0.6)',
          }}
        >
          0
        </button>

        {/* Number cells 1..36 */}
        {Array.from({ length: 12 }, (_, ci) => ci + 1).flatMap((c) =>
          [1, 2, 3].map((r) => {
            const n = cellNumber(c, r);
            const color = colorOf(n);
            return (
              <button
                key={n}
                type="button"
                data-cell-number={n}
                data-color={color}
                disabled={disabled}
                onClick={() => handleStraight(n)}
                aria-label={`Straight bet on ${n}`}
                className="absolute flex items-center justify-center font-display text-white"
                style={{
                  left: cellLeft(c),
                  top: cellTop(r),
                  width: CELL_W,
                  height: CELL_H,
                  background: CELL_FILLS[color],
                  border: '1px solid rgba(212,175,55,0.6)',
                }}
              >
                {n}
              </button>
            );
          }),
        )}

        {/* Chip stacks for placed bets (positioned over the cells) */}
        {bets.map((b) => {
          // For straight bets, render on the corresponding cell.
          if (b.type === 'straight') {
            const n = b.numbers[0]!;
            let left: number, top: number;
            if (n === 0) {
              left = ZERO_W / 2 - 12;
              top = (3 * CELL_H) / 2 - 12;
            } else {
              const c = Math.ceil(n / 3);
              const r = (n - 1) % 3 === 0 ? 3 : (n - 1) % 3 === 1 ? 2 : 1;
              left = cellLeft(c) + CELL_W / 2 - 12;
              top = cellTop(r) + CELL_H / 2 - 12;
            }
            return (
              <div
                key={b.key}
                data-bet-stack={b.key}
                className="absolute pointer-events-none z-10"
                style={{ left, top }}
              >
                <ChipStack amount={b.amount} />
              </div>
            );
          }
          // Other bet types render in later tasks (handled via positioning maps).
          return null;
        })}
      </div>
    </div>
  );
}
```

(Yes, the `r` formula is a small jigsaw — `(n - 1) % 3` returns 0 for 1,4,7…, 1 for 2,5,8…, 2 for 3,6,9… so we map 0→row 3, 1→row 2, 2→row 1. Add a comment near it if you find it cryptic.)

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test --run src/games/roulette/BettingLayout.test.tsx
```

Expected: PASS — number-cell tests + chip-stack test.

- [ ] **Step 5: Commit**

```bash
git add src/games/roulette/BettingLayout.tsx src/games/roulette/BettingLayout.test.tsx
git commit -m "feat(roulette): BettingLayout zero + number cells + straight-bet handler"
```

## Task C.4: BettingLayout — outside bars (columns, dozens, even-money)

**Files:**

- Modify: `src/games/roulette/BettingLayout.tsx` (add column 2:1 buttons + dozens + even-money rows)
- Modify: `src/games/roulette/BettingLayout.test.tsx` (add outside-bet tests)

- [ ] **Step 1: Append failing tests**

```tsx
describe('<BettingLayout /> outside bars', () => {
  it('renders 3 column 2:1 buttons mapping to columns 1/2/3', async () => {
    const onPlaceBet = vi.fn();
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={10}
        onPlaceBet={onPlaceBet}
        onRemoveBet={() => {}}
      />,
    );
    const user = userEvent.setup();
    // Three buttons, labelled "Column bet on column N"
    expect(screen.getAllByRole('button', { name: /column bet on column [1-3]/i })).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: /column bet on column 2/i }));
    expect(onPlaceBet.mock.calls[0]![0].key).toBe('column:2');
    expect(onPlaceBet.mock.calls[0]![0].amount).toBe(10);
  });

  it('renders 3 dozen bet cells (1st 12 / 2nd 12 / 3rd 12)', async () => {
    const onPlaceBet = vi.fn();
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={onPlaceBet}
        onRemoveBet={() => {}}
      />,
    );
    const user = userEvent.setup();
    expect(screen.getByRole('button', { name: /dozen bet on 1st 12/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dozen bet on 2nd 12/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dozen bet on 3rd 12/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /dozen bet on 3rd 12/i }));
    expect(onPlaceBet.mock.calls[0]![0].key).toBe('dozen:3');
  });

  it('renders 6 even-money bars (1-18 / EVEN / RED / BLACK / ODD / 19-36)', async () => {
    const onPlaceBet = vi.fn();
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={onPlaceBet}
        onRemoveBet={() => {}}
      />,
    );
    const user = userEvent.setup();
    const labels = [/1-18/i, /even/i, /^red$/i, /^black$/i, /odd/i, /19-36/i];
    for (const lbl of labels) {
      expect(screen.getByRole('button', { name: lbl })).toBeInTheDocument();
    }
    await user.click(screen.getByRole('button', { name: /^red$/i }));
    expect(onPlaceBet.mock.calls[0]![0].key).toBe('red');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test --run src/games/roulette/BettingLayout.test.tsx
```

Expected: FAIL — column/dozen/even-money buttons not rendered.

- [ ] **Step 3: Add the outside bars to `BettingLayout.tsx`**

Add the following inside the relative-positioned `<div>`, after the chip-stack render block (before its closing `</div>`):

```tsx
{
  /* Column 2:1 buttons (right of the number grid) */
}
{
  [1, 2, 3].map((rouletteCol) => {
    // roulette column 1 = bottom row (row 3), column 2 = middle (row 2), column 3 = top (row 1)
    const row = 4 - rouletteCol; // {col:1→row 3, col:2→row 2, col:3→row 1}
    return (
      <button
        key={rouletteCol}
        type="button"
        data-outside-bet={`column:${rouletteCol}`}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          onPlaceBet({
            ...makeBet({ type: 'column', col: rouletteCol as 1 | 2 | 3 }),
            amount: chipAmount,
          });
        }}
        aria-label={`Column bet on column ${rouletteCol}`}
        className="absolute flex items-center justify-center font-display text-[10px] text-white"
        style={{
          left: cellLeft(13),
          top: cellTop(row),
          width: COL_BTN_W,
          height: CELL_H,
          background: 'rgba(11, 31, 17, 0.7)',
          border: '1px solid rgba(212,175,55,0.6)',
        }}
      >
        2:1
      </button>
    );
  });
}

{
  /* Dozen row */
}
{
  (
    [
      { dozen: 1, label: '1st 12' },
      { dozen: 2, label: '2nd 12' },
      { dozen: 3, label: '3rd 12' },
    ] as const
  ).map(({ dozen, label }) => (
    <button
      key={dozen}
      type="button"
      data-outside-bet={`dozen:${dozen}`}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onPlaceBet({ ...makeBet({ type: 'dozen', dozen }), amount: chipAmount });
      }}
      aria-label={`Dozen bet on ${label}`}
      className="absolute flex items-center justify-center font-display text-[11px] text-white"
      style={{
        left: cellLeft(1 + (dozen - 1) * 4),
        top: 3 * CELL_H + GUTTER,
        width: 4 * CELL_W,
        height: DOZEN_H,
        background: 'rgba(11, 31, 17, 0.6)',
        border: '1px solid rgba(212,175,55,0.6)',
      }}
    >
      {label}
    </button>
  ));
}

{
  /* Even-money row */
}
{
  (
    [
      { type: 'low', label: '1-18', bg: 'rgba(11, 31, 17, 0.6)' },
      { type: 'even', label: 'EVEN', bg: 'rgba(11, 31, 17, 0.6)' },
      { type: 'red', label: 'RED', bg: 'rgba(163, 18, 42, 0.6)' },
      { type: 'black', label: 'BLACK', bg: 'rgba(15, 15, 15, 0.7)' },
      { type: 'odd', label: 'ODD', bg: 'rgba(11, 31, 17, 0.6)' },
      { type: 'high', label: '19-36', bg: 'rgba(11, 31, 17, 0.6)' },
    ] as const
  ).map(({ type, label, bg }, i) => (
    <button
      key={type}
      type="button"
      data-outside-bet={type}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onPlaceBet({ ...makeBet({ type }), amount: chipAmount });
      }}
      aria-label={label === 'RED' ? 'Red' : label === 'BLACK' ? 'Black' : label}
      className="absolute flex items-center justify-center font-display text-[11px] text-white"
      style={{
        left: cellLeft(1 + i * 2),
        top: 3 * CELL_H + GUTTER + DOZEN_H + GUTTER,
        width: 2 * CELL_W,
        height: EVEN_H,
        background: bg,
        border: '1px solid rgba(212,175,55,0.6)',
      }}
    >
      {label}
    </button>
  ));
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test --run src/games/roulette/BettingLayout.test.tsx
```

Expected: PASS — all 3 outside-bar describes pass alongside earlier tests.

- [ ] **Step 5: Commit**

```bash
git add src/games/roulette/BettingLayout.tsx src/games/roulette/BettingLayout.test.tsx
git commit -m "feat(roulette): outside bars (columns, dozens, even-money)"
```

## Task C.5: BettingLayout — edge target overlays (splits, corners, streets, six-lines)

**Files:**

- Modify: `src/games/roulette/BettingLayout.tsx` (add overlay generation)
- Modify: `src/games/roulette/BettingLayout.test.tsx` (add overlay tests)

This is the trickiest task in the phase. We generate the 60 splits + 22 corners + 12 streets + 11 six-lines + 3 zero-splits as `<button>` overlays positioned absolutely. Each is small + transparent by default and shows a thin gold rectangle on hover.

- [ ] **Step 1: Append failing tests**

```tsx
describe('<BettingLayout /> edge overlays', () => {
  it('renders 24 vertical-split overlays', () => {
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
      />,
    );
    // 24 splits where hi = lo + 1
    let count = 0;
    document.querySelectorAll('[data-overlay-type="split"]').forEach((el) => {
      const k = el.getAttribute('data-overlay-key')!;
      const [, pair] = k.split(':');
      const [a, b] = pair!.split('-').map(Number);
      if (b! - a! === 1 && a! >= 1) count++;
    });
    expect(count).toBe(24);
  });

  it('renders 33 horizontal-split overlays', () => {
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
      />,
    );
    let count = 0;
    document.querySelectorAll('[data-overlay-type="split"]').forEach((el) => {
      const k = el.getAttribute('data-overlay-key')!;
      const [, pair] = k.split(':');
      const [a, b] = pair!.split('-').map(Number);
      if (b! - a! === 3) count++;
    });
    expect(count).toBe(33);
  });

  it('renders 3 zero-split overlays', () => {
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
      />,
    );
    expect(document.querySelector('[data-overlay-key="split:0-1"]')).toBeInTheDocument();
    expect(document.querySelector('[data-overlay-key="split:0-2"]')).toBeInTheDocument();
    expect(document.querySelector('[data-overlay-key="split:0-3"]')).toBeInTheDocument();
  });

  it('renders 22 corner overlays', () => {
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
      />,
    );
    expect(document.querySelectorAll('[data-overlay-type="corner"]')).toHaveLength(22);
  });

  it('renders 12 street overlays', () => {
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
      />,
    );
    expect(document.querySelectorAll('[data-overlay-type="street"]')).toHaveLength(12);
  });

  it('renders 11 six-line overlays', () => {
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
      />,
    );
    expect(document.querySelectorAll('[data-overlay-type="six-line"]')).toHaveLength(11);
  });

  it('clicking a split overlay calls onPlaceBet with the right key', async () => {
    const onPlaceBet = vi.fn();
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={onPlaceBet}
        onRemoveBet={() => {}}
      />,
    );
    const user = userEvent.setup();
    await user.click(document.querySelector('[data-overlay-key="split:17-18"]')!);
    expect(onPlaceBet.mock.calls[0]![0].key).toBe('split:17-18');
  });

  it('clicking a corner overlay calls onPlaceBet with the right key', async () => {
    const onPlaceBet = vi.fn();
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={onPlaceBet}
        onRemoveBet={() => {}}
      />,
    );
    const user = userEvent.setup();
    await user.click(document.querySelector('[data-overlay-key="corner:1"]')!);
    expect(onPlaceBet.mock.calls[0]![0].key).toBe('corner:1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test --run src/games/roulette/BettingLayout.test.tsx
```

Expected: FAIL — no overlay elements rendered.

- [ ] **Step 3: Add edge overlays to `BettingLayout.tsx`**

Add these constants near the top (next to other layout constants):

```tsx
const SPLIT_THICK = 10;
const CORNER_SIZE = 14;
const STREET_THICK = 10;
```

Then add a helper function (above the component):

```tsx
type OverlayDef =
  | {
      kind: 'split';
      key: string;
      lo: number;
      hi: number;
      style: React.CSSProperties;
      label: string;
    }
  | { kind: 'corner'; key: string; topLeft: number; style: React.CSSProperties; label: string }
  | { kind: 'street'; key: string; rowStart: number; style: React.CSSProperties; label: string }
  | { kind: 'six-line'; key: string; rowStart: number; style: React.CSSProperties; label: string };

function buildOverlays(): OverlayDef[] {
  const out: OverlayDef[] = [];

  // Vertical splits: between rows in same visual column. 24 total.
  // pair (cellNumber(c, r), cellNumber(c, r-1)) for c=1..12 and r=2,3.
  // edge is at top of cell (c, r).
  for (let c = 1; c <= 12; c++) {
    for (let r = 2; r <= 3; r++) {
      const lo = Math.min(cellNumber(c, r), cellNumber(c, r - 1));
      const hi = Math.max(cellNumber(c, r), cellNumber(c, r - 1));
      out.push({
        kind: 'split',
        key: `split:${lo}-${hi}`,
        lo,
        hi,
        style: {
          left: cellLeft(c),
          top: cellTop(r) - SPLIT_THICK / 2,
          width: CELL_W,
          height: SPLIT_THICK,
        },
        label: `Split bet on ${lo} and ${hi}`,
      });
    }
  }

  // Horizontal splits: between columns in same row. 33 total.
  for (let c = 1; c <= 11; c++) {
    for (let r = 1; r <= 3; r++) {
      const lo = Math.min(cellNumber(c, r), cellNumber(c + 1, r));
      const hi = Math.max(cellNumber(c, r), cellNumber(c + 1, r));
      out.push({
        kind: 'split',
        key: `split:${lo}-${hi}`,
        lo,
        hi,
        style: {
          left: cellLeft(c + 1) - SPLIT_THICK / 2,
          top: cellTop(r),
          width: SPLIT_THICK,
          height: CELL_H,
        },
        label: `Split bet on ${lo} and ${hi}`,
      });
    }
  }

  // Zero splits: between zero cell and cells (1, r) for r=1..3.
  for (let r = 1; r <= 3; r++) {
    const cellN = cellNumber(1, r); // 3,2,1 for r=1,2,3
    out.push({
      kind: 'split',
      key: `split:0-${cellN}`,
      lo: 0,
      hi: cellN,
      style: {
        left: ZERO_W - SPLIT_THICK / 2,
        top: cellTop(r),
        width: SPLIT_THICK,
        height: CELL_H,
      },
      label: `Split bet on 0 and ${cellN}`,
    });
  }

  // Corners: 2×2 intersections. 22 total.
  // For (c, r) ∈ {1..11} × {1, 2}, topLeft number = 3c - r.
  for (let c = 1; c <= 11; c++) {
    for (let r = 1; r <= 2; r++) {
      const topLeft = 3 * c - r;
      out.push({
        kind: 'corner',
        key: `corner:${topLeft}`,
        topLeft,
        style: {
          left: cellLeft(c + 1) - CORNER_SIZE / 2,
          top: cellTop(r + 1) - CORNER_SIZE / 2,
          width: CORNER_SIZE,
          height: CORNER_SIZE,
        },
        label: `Corner bet on ${topLeft}, ${topLeft + 1}, ${topLeft + 3}, ${topLeft + 4}`,
      });
    }
  }

  // Streets: 12 total. Click target on the bottom outside line under column c.
  for (let c = 1; c <= 12; c++) {
    const rowStart = 3 * c - 2; // 1, 4, …, 34
    out.push({
      kind: 'street',
      key: `street:${rowStart}`,
      rowStart,
      style: {
        left: cellLeft(c),
        top: cellTop(3) + CELL_H - STREET_THICK / 2,
        width: CELL_W,
        height: STREET_THICK,
      },
      label: `Street bet on ${rowStart}, ${rowStart + 1}, ${rowStart + 2}`,
    });
  }

  // Six-lines: 11 total. Click target on the bottom line between columns c and c+1.
  for (let c = 1; c <= 11; c++) {
    const rowStart = 3 * c - 2;
    out.push({
      kind: 'six-line',
      key: `six-line:${rowStart}`,
      rowStart,
      style: {
        left: cellLeft(c + 1) - SPLIT_THICK / 2,
        top: cellTop(3) + CELL_H - STREET_THICK / 2,
        width: SPLIT_THICK,
        height: STREET_THICK,
      },
      label: `Six-line bet on ${rowStart} through ${rowStart + 5}`,
    });
  }

  return out;
}
```

Then inside the component, before the closing `</div>` of the relative-positioned felt area, render the overlays:

```tsx
{
  buildOverlays().map((o) => (
    <button
      key={o.key}
      type="button"
      data-overlay-type={o.kind}
      data-overlay-key={o.key}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        if (o.kind === 'split') {
          onPlaceBet({ ...makeBet({ type: 'split', a: o.lo, b: o.hi }), amount: chipAmount });
        } else if (o.kind === 'corner') {
          onPlaceBet({ ...makeBet({ type: 'corner', topLeft: o.topLeft }), amount: chipAmount });
        } else if (o.kind === 'street') {
          onPlaceBet({ ...makeBet({ type: 'street', rowStart: o.rowStart }), amount: chipAmount });
        } else {
          onPlaceBet({
            ...makeBet({ type: 'six-line', rowStart: o.rowStart }),
            amount: chipAmount,
          });
        }
      }}
      aria-label={o.label}
      className="absolute z-20 cursor-pointer bg-transparent hover:bg-gold/60"
      style={{ ...o.style, border: 'none' }}
    />
  ));
}
```

Add a small chip-stack render for non-straight bets as well. Append to the existing chip-stack `bets.map`:

```tsx
{
  bets.map((b) => {
    if (b.type === 'straight') {
      /* existing render */ return /* … */;
    }
    // Find the overlay position for this key and render the chip stack there.
    const overlay = buildOverlays().find((o) => o.key === b.key);
    if (!overlay) return null;
    const s = overlay.style as React.CSSProperties;
    const left = Number(s.left) + Number(s.width) / 2 - 12;
    const top = Number(s.top) + Number(s.height) / 2 - 12;
    return (
      <div
        key={b.key}
        data-bet-stack={b.key}
        className="pointer-events-none absolute z-30"
        style={{ left, top }}
      >
        <ChipStack amount={b.amount} />
      </div>
    );
  });
}
```

(Note: `buildOverlays()` is called twice — once for overlays, once for chip-stack positioning. That's intentional and fast; the function is pure and ~22 array allocations total.)

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test --run src/games/roulette/BettingLayout.test.tsx
```

Expected: PASS — all overlay tests pass (counts: 24+33+3 splits, 22 corners, 12 streets, 11 six-lines).

- [ ] **Step 5: Commit**

```bash
git add src/games/roulette/BettingLayout.tsx src/games/roulette/BettingLayout.test.tsx
git commit -m "feat(roulette): edge target overlays (splits, corners, streets, six-lines)"
```

## Task C.6: BettingLayout — disabled state + selected ring + Clear all + Total exposure

**Files:**

- Modify: `src/games/roulette/BettingLayout.tsx` (add visual disabled cues + total + clear-all)
- Modify: `src/games/roulette/BettingLayout.test.tsx` (add tests)

The component now also renders the total exposure line + a "Clear all bets" button above the felt. Disabled state lowers opacity. A newly-placed bet (the last entry in `bets`) gets a `data-selected` attribute used in the next task for visual highlight; for now we just expose the attribute.

- [ ] **Step 1: Append failing tests**

```tsx
describe('<BettingLayout /> footer and disabled state', () => {
  it('renders total exposure summing all bet amounts', () => {
    render(
      <BettingLayout
        bets={[
          { key: 'red', type: 'red', numbers: [1], payoutMultiple: 1, amount: 5, betHandleId: 'h' },
          {
            key: 'black',
            type: 'black',
            numbers: [2],
            payoutMultiple: 1,
            amount: 25,
            betHandleId: 'h2',
          },
        ]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
      />,
    );
    expect(screen.getByText(/total bet/i).textContent).toContain('30');
  });

  it('renders a Clear all button that fires onClearAll', async () => {
    const onClearAll = vi.fn();
    render(
      <BettingLayout
        bets={[
          { key: 'red', type: 'red', numbers: [1], payoutMultiple: 1, amount: 5, betHandleId: 'h' },
        ]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
        onClearAll={onClearAll}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /clear all bets/i }));
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it('Clear all button is disabled when bets is empty', () => {
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
        onClearAll={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /clear all bets/i })).toBeDisabled();
  });

  it('when disabled, the felt has data-disabled=true and number cells are aria-disabled', () => {
    render(
      <BettingLayout
        bets={[]}
        disabled={true}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
      />,
    );
    expect(document.querySelector('[data-roulette-felt]')!.getAttribute('data-disabled')).toBe(
      'true',
    );
    expect(
      (screen.getByRole('button', { name: /straight bet on 17/i }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('the most recently placed bet has data-selected on its chip stack', () => {
    render(
      <BettingLayout
        bets={[
          {
            key: 'straight:1',
            type: 'straight',
            numbers: [1],
            payoutMultiple: 35,
            amount: 5,
            betHandleId: 'h1',
          },
          {
            key: 'straight:2',
            type: 'straight',
            numbers: [2],
            payoutMultiple: 35,
            amount: 5,
            betHandleId: 'h2',
          },
        ]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
      />,
    );
    const selected = document.querySelector('[data-bet-stack="straight:2"]');
    expect(selected!.getAttribute('data-selected')).toBe('true');
    const other = document.querySelector('[data-bet-stack="straight:1"]');
    expect(other!.getAttribute('data-selected')).not.toBe('true');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test --run src/games/roulette/BettingLayout.test.tsx
```

Expected: FAIL — no clear-all button, no total, no `data-disabled` flag.

- [ ] **Step 3: Update `BettingLayout.tsx`**

Update the `BettingLayoutProps` interface to add `onClearAll`:

```tsx
export interface BettingLayoutProps {
  bets: readonly PlacedBet[];
  disabled: boolean;
  chipAmount: number;
  onPlaceBet: (bet: BetPosition & { amount: number }) => void;
  onRemoveBet: (key: BetPositionKey) => void;
  /** Optional: clear all bets. If omitted, the Clear button is hidden. */
  onClearAll?: () => void;
}
```

Wrap the felt in an outer container that adds a header row with the total + clear button:

```tsx
const total = bets.reduce((sum, b) => sum + b.amount, 0);
const lastBetKey = bets.length > 0 ? bets[bets.length - 1]!.key : null;

return (
  <div className="mx-auto max-w-[700px]">
    {/* Header row */}
    <div className="mb-2 flex items-center justify-between px-1">
      <span className="font-display text-[11px] tracking-wider text-gold">TOTAL BET</span>
      <span className="font-mono text-sm text-gold-bright">{total}</span>
      {onClearAll && (
        <button
          type="button"
          onClick={() => {
            if (!disabled && total > 0) onClearAll();
          }}
          disabled={disabled || total === 0}
          className="rounded-md border border-white/20 bg-transparent px-2 py-1 text-[11px] text-white/60 hover:bg-white/5 disabled:opacity-40"
          aria-label="Clear all bets"
        >
          Clear all bets
        </button>
      )}
    </div>

    {/* Felt — existing div with data-roulette-felt */}
    <div
      data-roulette-felt
      data-disabled={disabled ? 'true' : 'false'}
      className="relative mx-auto overflow-x-auto rounded-lg p-4"
      style={{
        background: 'linear-gradient(180deg, #0a3a22 0%, #0b2a18 100%)',
        boxShadow: 'inset 0 0 0 2px #d4af37, inset 0 0 0 3px #1a1a1a',
        opacity: disabled ? 0.85 : 1,
      }}
    >
      {/* …existing inner relative-positioned div with all the buttons + overlays + stacks… */}
    </div>
  </div>
);
```

Update the chip-stack `<div>`s (both straight and non-straight) to include `data-selected`:

```tsx
data-selected={b.key === lastBetKey ? 'true' : undefined}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test --run src/games/roulette/BettingLayout.test.tsx
```

Expected: PASS — header tests, disabled tests, last-bet selection test all pass.

- [ ] **Step 5: Commit**

```bash
git add src/games/roulette/BettingLayout.tsx src/games/roulette/BettingLayout.test.tsx
git commit -m "feat(roulette): Clear all + total exposure + disabled state + selected ring"
```

## Task C.7: Visual sanity check (manual, no commit)

This is the only manual-only task in the plan. The subagent runs the dev server and confirms the felt renders correctly.

- [ ] **Step 1: Start the dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Temporarily mount BettingLayout + Wheel in `StubGamePage.tsx`** _(DO NOT COMMIT)_

In `src/games/_shared/StubGamePage.tsx`, temporarily add at the top of the returned JSX:

```tsx
{
  props.game === 'roulette' && (
    <div style={{ padding: 20 }}>
      <Wheel targetNumber={null} spinning={false} settled={false} />
      <div style={{ height: 20 }} />
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={(b) => console.log('placed', b)}
        onRemoveBet={() => {}}
        onClearAll={() => {}}
      />
    </div>
  );
}
```

Navigate to `/play/roulette` and verify:

- Wheel renders with visible pockets, gold pointer, silver turret, no ball
- Felt renders with green background + gold border
- All 37 numbers visible with correct red/black/green colors
- 3 "2:1" buttons on the right
- "1st 12 / 2nd 12 / 3rd 12" below
- "1-18 / EVEN / RED / BLACK / ODD / 19-36" below that
- Hover over the edge between two numbers — gold rectangle appears (split)
- Hover at the intersection of four numbers — gold square appears (corner)
- Click any number — `console.log` shows correct bet key

- [ ] **Step 3: Revert StubGamePage.tsx** _(MUST do before committing)_

```bash
git checkout -- src/games/_shared/StubGamePage.tsx
git status
```

Expected: no changes in working tree — confirm only the planned files are modified on this branch.

## Task C.8: PR C — verify, push, open, merge

- [ ] **Step 1: Run the full DoD locally**

```bash
pnpm lint && pnpm typecheck && pnpm test --run && pnpm build
```

Expected: all four exit 0. ≥ 30 new tests across ChipSelector / ChipStack / BettingLayout.

- [ ] **Step 2: Push branch**

```bash
git push -u origin phase-4-roulette-pr-c-betting
```

- [ ] **Step 3: Open PR**

```bash
gh pr create --title "phase-4(roulette): BettingLayout + ChipSelector + ChipStack" --body "$(cat <<'EOF'
## Summary

PR C of Phase 4. Ships the green felt + chip components.

- `ChipSelector.tsx` — 6 denominations (5/25/100/250/500/1000) with classic chip colors
- `ChipStack.tsx` — greedy denomination breakdown + overflow handling
- `BettingLayout.tsx` — horizontal real-casino layout:
  - Zero cell + 36 number cells (3×12 grid)
  - 60 split + 22 corner + 12 street + 11 six-line edge overlays
  - 3 column 2:1 buttons + 3 dozen cells + 6 even-money bars
  - Total exposure header + "Clear all bets" button
  - Disabled state during spin/settle, selected-bet ring on last placed

No machine / wallet wiring — RoulettePage in PR D glues it all together.

## Test plan

- [x] `pnpm lint && pnpm typecheck && pnpm test --run && pnpm build` green locally
- [x] Visual smoke via temporary mount in StubGamePage (reverted before commit)
- [ ] CI green (4 jobs)
- [ ] Subagent two-stage reviews per task passed

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

# PR D — RoulettePage + Lobby + Router

**Branch:** `phase-4-roulette-pr-d-page` (off freshly-merged `main`)
**Goal of this PR:** Wire the machine + Wheel + BettingLayout + chips into a fully-playable `RoulettePage`. Swap the router stub. Flip the lobby cabinet. After this PR merges, Roulette is playable end-to-end from the lobby and the BUILD_GUIDE §12 row 4 DoD is met.
**Risk:** Highest. Wallet integration + machine + multi-component composition + lobby + router all in one PR.
**Estimated tasks:** 9.

## Wallet-timing model (DESIGN AMENDMENT — supersedes spec §11)

The spec §11 implies the page calls `wallet.placeBet` on every felt click and that REMOVE_BET / CLEAR_ALL would refund. But the wallet has no `cancelBet` operation — `placeBet` deducts and `settleRound` credits, with no in-between. Refunding via `settleRound` would create phantom round rows.

**Adopted model: defer placeBet to Spin.** Bets on the felt are _virtual_ during `betting` — the machine tracks position + amount only. On `SPIN`, the page calls `wallet.placeBet` for each position. Real money never moves while the player is still arranging chips. This matches real-casino flow ("place your bets" is a window; chips don't move until the dealer calls "no more bets") and avoids a wallet API expansion.

**Consequences:**

- `PlacedBet.betHandleId` is `''` while in the machine. The page populates the real handle ID into its own `handlesRef` map immediately before calling `settleRound`.
- REMOVE_BET / CLEAR_ALL during `betting` simply mutate machine state — no wallet I/O.
- On `SPIN`: the page synchronously kicks off N `placeBet` calls in parallel, awaits them, records handles in `handlesRef`, then dispatches `SPIN` to the machine. If any `placeBet` fails (insufficient chips, etc.), the SPIN is aborted and a toast is shown.
- The "kept losing bets" UX flows naturally: NEW_ROUND clears winners and the page also clears `handlesRef`. The losing bets remain visually on the felt. The next SPIN re-places them — fresh handles, fresh deductions.

This amendment is recorded in PR D's description and called out in the release notes. The Phase 4 spec stands as the design intent; this plan locks in the executable implementation.

## Task D.1: ResultBanner component + test

**Files:**

- Create: `src/games/roulette/ResultBanner.tsx`
- Create: `src/games/roulette/ResultBanner.test.tsx`

The banner appears when `visible=true`. Content: winning number + color label + net change ("You won $X" / "You lost $Y" / "Even — $0"). Framer Motion slide-in (skipped on reduced motion).

- [ ] **Step 1: Branch off freshly-merged main**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-4-roulette-pr-d-page
```

- [ ] **Step 2: Write the failing test (`ResultBanner.test.tsx`)**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ResultBanner from './ResultBanner';
import type { SpinResult } from './types';

const spinAt = (n: number, color: 'red' | 'black' | 'green'): SpinResult => ({
  number: n,
  color,
  pocketIndex: 0,
});

describe('<ResultBanner />', () => {
  it('renders nothing when visible=false', () => {
    const { container } = render(
      <ResultBanner visible={false} spin={spinAt(17, 'black')} netChange={350} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows the winning number and color in upper case', () => {
    render(<ResultBanner visible={true} spin={spinAt(17, 'black')} netChange={350} />);
    expect(screen.getByText(/17/)).toBeInTheDocument();
    expect(screen.getByText(/BLACK/i)).toBeInTheDocument();
  });

  it('shows positive netChange as "You won $N"', () => {
    render(<ResultBanner visible={true} spin={spinAt(7, 'red')} netChange={350} />);
    expect(screen.getByText(/won/i).textContent).toContain('350');
  });

  it('shows negative netChange as "You lost $N"', () => {
    render(<ResultBanner visible={true} spin={spinAt(0, 'green')} netChange={-50} />);
    expect(screen.getByText(/lost/i).textContent).toContain('50');
  });

  it('shows zero netChange as "Even — $0"', () => {
    render(<ResultBanner visible={true} spin={spinAt(2, 'black')} netChange={0} />);
    expect(screen.getByText(/even/i).textContent).toContain('0');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm test --run src/games/roulette/ResultBanner.test.tsx
```

Expected: FAIL — cannot import `./ResultBanner`.

- [ ] **Step 4: Write `src/games/roulette/ResultBanner.tsx`**

```tsx
import type { JSX } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { SpinResult } from './types';

interface Props {
  visible: boolean;
  spin: SpinResult | null;
  netChange: number;
}

const COLOR_LABEL: Record<'red' | 'black' | 'green', string> = {
  red: 'RED',
  black: 'BLACK',
  green: 'GREEN',
};

const COLOR_STYLE: Record<'red' | 'black' | 'green', string> = {
  red: 'text-casino-red',
  black: 'text-white',
  green: 'text-chip-win',
};

export default function ResultBanner({ visible, spin, netChange }: Props): JSX.Element | null {
  const reduce = useReducedMotion();
  if (!visible || !spin) return null;

  const verdict =
    netChange > 0
      ? `You won $${netChange}`
      : netChange < 0
        ? `You lost $${Math.abs(netChange)}`
        : 'Even — $0';

  return (
    <AnimatePresence>
      <motion.div
        key="result-banner"
        initial={reduce ? { opacity: 1 } : { opacity: 0, y: -32 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -32 }}
        transition={{ duration: reduce ? 0 : 0.25, ease: 'easeOut' }}
        role="status"
        aria-live="polite"
        className="mx-auto mb-3 flex max-w-[520px] items-center justify-between rounded-md border border-gold/40 bg-felt-deep px-4 py-2 font-display text-sm tracking-wider"
      >
        <span className="text-gold-bright">
          <span className={COLOR_STYLE[spin.color]}>{spin.number}</span>
          <span className="mx-2 text-white/40">·</span>
          <span className={COLOR_STYLE[spin.color]}>{COLOR_LABEL[spin.color]}</span>
        </span>
        <span
          className={
            netChange > 0 ? 'text-chip-win' : netChange < 0 ? 'text-chip-loss' : 'text-chip-push'
          }
        >
          {verdict}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test --run src/games/roulette/ResultBanner.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/games/roulette/ResultBanner.tsx src/games/roulette/ResultBanner.test.tsx
git commit -m "feat(roulette): ResultBanner (winning number + verdict + slide-in)"
```

## Task D.2: RoulettePage skeleton — GameShell, machine, ChipSelector wiring

**Files:**

- Create: `src/games/roulette/RoulettePage.tsx`
- Create: `src/games/roulette/RoulettePage.test.tsx`

This task wires the machine + the visual components. No wallet calls yet — bets stay virtual. SPIN button is enabled but only updates machine state. The next task adds the wallet bridge.

- [ ] **Step 1: Write the failing test (`RoulettePage.test.tsx`)**

The test must mock `useCurrentUser` and `useWalletStore`, and must reset Dexie. The Blackjack page test is the reference; key patterns to copy verbatim from `src/games/blackjack/BlackjackPage.test.tsx`:

- `resetDb()` in `beforeEach`
- Seed the RNG with `seed(N)` in `beforeEach`; `unseed()` in `afterEach`
- Hydrate the wallet store (set balance via store mutator)
- Set a fake user via `useSessionStore.setState`

Write the test:

```tsx
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import RoulettePage from './RoulettePage';
import { seed, unseed } from '@/systems/rng';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';
import { db } from '@/db';
import type { User } from '@/db/schema';

async function resetDb() {
  await db.balances.clear();
  await db.rounds.clear();
  await db.users.clear();
}

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

async function hydrateUser(balance = 500) {
  await db.users.put(TEST_USER);
  await db.balances.put({ userId: TEST_USER.id, chips: balance, updatedAt: Date.now() });
  useSessionStore.setState({ user: TEST_USER });
  await useWalletStore.getState().hydrate(TEST_USER.id);
}

describe('<RoulettePage /> skeleton', () => {
  beforeEach(async () => {
    seed(1);
    await resetDb();
    await hydrateUser(500);
  });
  afterEach(() => unseed());

  it('renders the title and shows the felt + wheel + chip selector', async () => {
    render(
      <MemoryRouter>
        <RoulettePage />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/ROULETTE/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /roulette wheel/i })).toBeInTheDocument();
    expect(document.querySelector('[data-roulette-felt]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /select 5-chip/i })).toBeInTheDocument();
  });

  it('Spin button is disabled when no bets are placed', () => {
    render(
      <MemoryRouter>
        <RoulettePage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /^spin$/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test --run src/games/roulette/RoulettePage.test.tsx
```

Expected: FAIL — cannot import `./RoulettePage`.

- [ ] **Step 3: Write `src/games/roulette/RoulettePage.tsx`** (skeleton — no wallet yet)

```tsx
import type { JSX } from 'react';
import { useState } from 'react';
import { useMachine } from '@xstate/react';
import { useReducedMotion } from 'framer-motion';
import GameShell from '@/games/_shared/GameShell';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance } from '@/store/walletStore';
import BettingLayout from './BettingLayout';
import ChipSelector from './ChipSelector';
import Wheel from './Wheel';
import ResultBanner from './ResultBanner';
import { rouletteMachine } from './machine';
import { ROULETTE_CONFIG, type ChipDenomination } from './config';

export default function RoulettePage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance() ?? 0;
  const reducedMotion = useReducedMotion() ?? false;

  const [chip, setChip] = useState<ChipDenomination>(5);

  const [state, send] = useMachine(rouletteMachine, {
    input: { spinDurationMs: reducedMotion ? 0 : ROULETTE_CONFIG.SPIN_DURATION_MS },
  });

  if (!user) return null;

  const inBetting = state.matches('betting');
  const inSpinning = state.matches('spinning');
  const inSettled = state.matches('settled');
  const hasBets = state.context.bets.length > 0;

  const targetNumber = state.context.spinResult?.number ?? null;

  return (
    <GameShell
      title="🎡 ROULETTE"
      meta="Single-zero · 5–1000 · max 10 positions"
      bettingPanel={
        <div className="mx-auto flex max-w-[720px] flex-col gap-3 px-2">
          <ResultBanner
            visible={inSettled}
            spin={state.context.spinResult}
            netChange={state.context.roundResult?.netChange ?? 0}
          />
          <BettingLayout
            bets={state.context.bets}
            disabled={!inBetting}
            chipAmount={chip}
            onPlaceBet={(bet) => send({ type: 'PLACE_BET', bet: { ...bet, betHandleId: '' } })}
            onRemoveBet={(key) => send({ type: 'REMOVE_BET', key })}
            onClearAll={() => send({ type: 'CLEAR_ALL' })}
          />
          <div className="flex items-center justify-between gap-3">
            <ChipSelector value={chip} onChange={setChip} disabled={!inBetting} />
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/50">
                Balance: <span className="font-mono text-white/80">{balance.toLocaleString()}</span>
              </span>
              <button
                type="button"
                onClick={() => send({ type: 'SPIN' })}
                disabled={!inBetting || !hasBets}
                className="rounded-md bg-casino-red px-4 py-2 font-display text-sm tracking-wider text-white shadow-gold-glow hover:bg-casino-red-deep disabled:opacity-40"
              >
                SPIN
              </button>
              <button
                type="button"
                onClick={() => send({ type: 'NEW_ROUND' })}
                disabled={!inSettled}
                className="rounded-md border border-gold/40 bg-transparent px-3 py-2 text-xs text-gold-bright hover:bg-gold/10 disabled:opacity-40"
              >
                New round
              </button>
            </div>
          </div>
        </div>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-4">
        <Wheel
          targetNumber={targetNumber}
          spinning={inSpinning}
          settled={inSettled}
          durationMs={reducedMotion ? 0 : ROULETTE_CONFIG.SPIN_DURATION_MS}
          reducedMotion={reducedMotion}
        />
      </div>
    </GameShell>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test --run src/games/roulette/RoulettePage.test.tsx
```

Expected: PASS — both skeleton tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/games/roulette/RoulettePage.tsx src/games/roulette/RoulettePage.test.tsx
git commit -m "feat(roulette): RoulettePage skeleton wiring machine + Wheel + BettingLayout"
```

## Task D.3: Wallet bridge — placeBet on Spin, settleRound on settled

**Files:**

- Modify: `src/games/roulette/RoulettePage.tsx` (add wallet bridge effects + handlesRef)
- Modify: `src/games/roulette/RoulettePage.test.tsx` (add integration tests)

Pattern: a `handlesRef` `Map<BetPositionKey, string>` outside the machine. Two effects:

1. When the user clicks SPIN: intercept the click, call `placeBet` for each bet in parallel, populate `handlesRef`, then dispatch SPIN to the machine. If any placeBet fails, abort and surface a toast (for MVP, log to console; full toast UI deferred).
2. When `state.matches('settled')`: call `settleRound` once with the aggregate. Guard with a `settledRef` to prevent double-settle.

- [ ] **Step 1: Append failing tests**

```tsx
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

describe('<RoulettePage /> wallet bridge', () => {
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

  it('placing red + black bets, spinning, settles to a push (balance unchanged)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <MemoryRouter>
        <RoulettePage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /select 25-chip/i }));
    await user.click(screen.getByRole('button', { name: /^red$/i }));
    await user.click(screen.getByRole('button', { name: /^black$/i }));

    // Balance before spin: still 500 (deferred placeBet model).
    expect(useWalletStore.getState().balance).toBe(500);

    await user.click(screen.getByRole('button', { name: /^spin$/i }));
    // After placeBets resolve (microtasks), balance = 500 - 50 = 450. Flush microtasks:
    await vi.advanceTimersByTimeAsync(0);
    expect(useWalletStore.getState().balance).toBe(450);

    // Advance the spin and wait for settle.
    await vi.advanceTimersByTimeAsync(5000);
    // Flush the settleRound microtask.
    await vi.advanceTimersByTimeAsync(0);

    // Bet 25 on red AND 25 on black (total deducted 50). Whichever color wins, its gross
    // return is 25 + 25 = 50 (1:1 payout). Total credited via settleRound = 50. Net = 0 → push.
    expect(useWalletStore.getState().balance).toBe(500);

    const rounds = await db.rounds.where('userId').equals(TEST_USER.id).toArray();
    expect(rounds).toHaveLength(1);
    expect(rounds[0]!.game).toBe('roulette');
    expect(rounds[0]!.betAmount).toBe(50);
    expect(rounds[0]!.payout).toBe(50);
    expect(rounds[0]!.netChange).toBe(0);
  });

  it('insufficient chips on SPIN aborts; balance untouched, no round row written', async () => {
    // Reseed user with low balance.
    await db.balances.put({ userId: TEST_USER.id, chips: 10, updatedAt: Date.now() });
    await useWalletStore.getState().hydrate(TEST_USER.id);
    expect(useWalletStore.getState().balance).toBe(10);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <MemoryRouter>
        <RoulettePage />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: /select 100-chip/i }));
    await user.click(screen.getByRole('button', { name: /^red$/i }));
    await user.click(screen.getByRole('button', { name: /^spin$/i }));

    // Spin must not proceed; the placeBet for 100 chips fails (only 10 available).
    await vi.advanceTimersByTimeAsync(0);

    expect(useWalletStore.getState().balance).toBe(10);
    const rounds = await db.rounds.toArray();
    expect(rounds).toHaveLength(0);
  });
});
```

Why microtask flushing matters: the wallet bridge issues `placeBet` calls inside an async IIFE. Under fake timers, microtasks still run, but Promise.resolve continuations don't fire until the event loop yields. `vi.advanceTimersByTimeAsync(0)` is the canonical way to flush both the macrotask queue and the microtask queue together.

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test --run src/games/roulette/RoulettePage.test.tsx
```

Expected: FAIL — no wallet I/O happens currently; balance unchanged.

- [ ] **Step 3: Update `RoulettePage.tsx` with wallet bridges**

Add imports:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useWalletStore } from '@/store/walletStore';
```

Add inside the component (after `useMachine`):

```tsx
const placeBet = useWalletStore((s) => s.placeBet);
const settleRound = useWalletStore((s) => s.settleRound);

const handlesRef = useRef<Map<string, string>>(new Map());
const settledRef = useRef<string | null>(null);

const handleSpinClick = useCallback(() => {
  if (!user) return;
  if (!inBetting || !hasBets) return;

  void (async () => {
    // Place each bet for real. Run sequentially so a failure aborts cleanly.
    const newHandles: [string, string][] = [];
    for (const bet of state.context.bets) {
      const result = await placeBet({
        userId: user.id,
        game: 'roulette',
        amount: bet.amount,
        min: ROULETTE_CONFIG.MIN_BET,
        max: ROULETTE_CONFIG.MAX_BET,
      });
      if (!result.ok) {
        // Roll back any prior placements this attempt via push-result style refund?
        // The wallet has no cancel API, so refund via no-op settleRound with payout = amount.
        for (const [, hId] of newHandles) {
          await settleRound({
            handle: {
              betId: hId,
              userId: user.id,
              game: 'roulette',
              amount: 0,
              placedAt: Date.now(),
            },
            result: {
              outcome: 'push',
              betAmount: 0,
              payout: 0,
              netChange: 0,
              details: { refunded: true },
            },
          });
        }
        console.warn('Roulette SPIN aborted: placeBet failed', result.error);
        return;
      }
      newHandles.push([bet.key, result.handle.betId]);
    }
    // All placeBets succeeded → write into handlesRef + dispatch SPIN.
    for (const [k, h] of newHandles) handlesRef.current.set(k, h);
    send({ type: 'SPIN' });
  })();
}, [user, inBetting, hasBets, state.context.bets, placeBet, settleRound, send]);

// Settle bridge: when entering settled, call settleRound once with aggregate.
useEffect(() => {
  if (!inSettled || !user) return;
  const rr = state.context.roundResult;
  if (!rr) return;
  const firstKey = state.context.bets[0]?.key;
  if (!firstKey) return;
  const firstHandleId = handlesRef.current.get(firstKey);
  if (!firstHandleId) return;
  if (settledRef.current === firstHandleId) return;
  settledRef.current = firstHandleId;
  void (async () => {
    await settleRound({
      handle: {
        betId: firstHandleId,
        userId: user.id,
        game: 'roulette',
        amount: rr.betAmount,
        placedAt: Date.now(),
      },
      result: {
        outcome: rr.outcome,
        betAmount: rr.betAmount,
        payout: rr.payout,
        netChange: rr.netChange,
        details: rr.details,
      },
    });
  })();
}, [inSettled, user, state.context.roundResult, state.context.bets, settleRound]);

// Reset guards when leaving settled.
useEffect(() => {
  if (!inSettled) settledRef.current = null;
}, [inSettled]);
```

Then change the SPIN button's `onClick` to use `handleSpinClick` instead of `() => send({ type: 'SPIN' })`.

(Note about the abort-refund: it issues `settleRound` with `betAmount: 0, payout: 0` purely to mark the bet as "consumed" without affecting balance — but `placeBet` already deducted the chips, so we need to refund them. The cleanest fix: pass `betAmount: amount, payout: amount, netChange: 0, outcome: 'push'`. The rounds row is recorded as a push with `details.refunded = true`. For Phase 4, accept this small data oddity — the alternative is a wallet API expansion. Document this in the PR D body.)

Update the refund block in `handleSpinClick`:

```tsx
for (const [k, hId] of newHandles) {
  const amount = state.context.bets.find((b) => b.key === k)!.amount;
  await settleRound({
    handle: { betId: hId, userId: user.id, game: 'roulette', amount, placedAt: Date.now() },
    result: {
      outcome: 'push',
      betAmount: amount,
      payout: amount,
      netChange: 0,
      details: { refunded: true, reason: 'partial-spin-abort' },
    },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test --run src/games/roulette/RoulettePage.test.tsx
```

Expected: PASS — balance flows correctly, rounds rows created.

- [ ] **Step 5: Commit**

```bash
git add src/games/roulette/RoulettePage.tsx src/games/roulette/RoulettePage.test.tsx
git commit -m "feat(roulette): wallet bridge — placeBet on spin, settleRound on settled"
```

## Task D.4: NEW_ROUND handling — recent results sidebar + handle map cleanup

**Files:**

- Modify: `src/games/roulette/RoulettePage.tsx` (wire `useRecentRounds`, clear `handlesRef` on NEW_ROUND)
- Modify: `src/games/roulette/RoulettePage.test.tsx` (add NEW_ROUND tests)

- [ ] **Step 1: Append failing tests**

```tsx
describe('<RoulettePage /> NEW_ROUND', () => {
  beforeEach(async () => {
    seed(1);
    await resetDb();
    await hydrateUser(500);
  });
  afterEach(() => unseed());

  it('after settle + NEW_ROUND, losing bets remain on the felt, winning ones clear', async () => {
    vi.useFakeTimers();
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <MemoryRouter>
          <RoulettePage />
        </MemoryRouter>,
      );
      await user.click(screen.getByRole('button', { name: /select 5-chip/i }));
      await user.click(screen.getByRole('button', { name: /^red$/i }));
      await user.click(screen.getByRole('button', { name: /^black$/i }));
      await user.click(screen.getByRole('button', { name: /^spin$/i }));
      await vi.advanceTimersByTimeAsync(5000);

      // One of {red, black} won; that bet's chip stack should be removed after NEW_ROUND.
      await user.click(screen.getByRole('button', { name: /new round/i }));

      const stacks = document.querySelectorAll('[data-bet-stack]');
      // Exactly one chip stack should remain (the losing one).
      expect(stacks).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows recent rounds in the GameShell sidebar after settle', async () => {
    vi.useFakeTimers();
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <MemoryRouter>
          <RoulettePage />
        </MemoryRouter>,
      );
      await user.click(screen.getByRole('button', { name: /select 5-chip/i }));
      await user.click(screen.getByRole('button', { name: /^red$/i }));
      await user.click(screen.getByRole('button', { name: /^spin$/i }));
      await vi.advanceTimersByTimeAsync(5000);

      // Sidebar shows "RECENT" + at least 1 entry.
      expect(screen.getByText(/RECENT/i)).toBeInTheDocument();
      expect(screen.getByText(/last 1/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test --run src/games/roulette/RoulettePage.test.tsx
```

Expected: FAIL — no recentItems wired; no handlesRef cleanup yet.

- [ ] **Step 3: Update `RoulettePage.tsx`**

Add to imports:

```tsx
import { useMemo } from 'react';
import { useRecentRounds } from '@/systems/hooks/useRecentRounds';
import type { RecentResultItem } from '@/games/_shared/RecentResults';
import type { RouletteRoundDetails } from './types';
import { colorOf } from './wheel';
```

Inside the component, after the wallet bridge effects:

```tsx
// Clear handlesRef on NEW_ROUND so the next round starts fresh.
useEffect(() => {
  if (inBetting && state.context.spinResult === null) {
    handlesRef.current.clear();
  }
}, [inBetting, state.context.spinResult]);

// Recent results sidebar
const rounds = useRecentRounds(user?.id, 'roulette', 12);
const recentItems: RecentResultItem[] = useMemo(
  () =>
    rounds.map((r) => {
      const d = r.details as RouletteRoundDetails;
      const color = d.spin?.color ?? 'green';
      const badgeBg = color === 'red' ? '#a3122a' : color === 'black' ? '#1a1a1a' : '#3dd17a';
      return {
        key: r.id,
        badgeText: String(d.spin?.number ?? '?'),
        badgeColor: badgeBg,
        badgeTextColor: color === 'black' ? '#fff' : '#06120c',
        betLabel: String(r.betAmount),
        netChips: r.netChange,
        accent: r.outcome,
      };
    }),
  [rounds],
);
```

Pass `recentItems` to `<GameShell>` as a prop.

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test --run src/games/roulette/RoulettePage.test.tsx
```

Expected: PASS — both NEW_ROUND tests + sidebar test.

- [ ] **Step 5: Commit**

```bash
git add src/games/roulette/RoulettePage.tsx src/games/roulette/RoulettePage.test.tsx
git commit -m "feat(roulette): NEW_ROUND cleanup + recent results sidebar"
```

## Task D.5: Router swap — StubGamePage → RoulettePage

**Files:**

- Modify: `src/router.tsx`

- [ ] **Step 1: Update `src/router.tsx`**

Add the import alongside the others:

```tsx
import RoulettePage from '@/games/roulette/RoulettePage';
```

Replace the line:

```tsx
{ path: 'play/roulette', element: <StubGamePage game="roulette" phase={4} /> },
```

with:

```tsx
{ path: 'play/roulette', element: <RoulettePage /> },
```

- [ ] **Step 2: Run lint + typecheck + tests**

```bash
pnpm lint && pnpm typecheck && pnpm test --run
```

Expected: all green. The StubGamePage test (if any references roulette) still passes — StubGamePage is still mounted for slots and baccarat.

- [ ] **Step 3: Commit**

```bash
git add src/router.tsx
git commit -m "feat(routing): mount RoulettePage at /play/roulette"
```

## Task D.6: Lobby cabinet flip — Roulette → playable

**Files:**

- Modify: `src/pages/lobby/CabinetCarousel.tsx`

- [ ] **Step 1: Update the CABINETS array**

Change the roulette entry from:

```tsx
{ to: '/play/roulette', icon: '🎡', label: 'ROULETTE', status: 'stub', phase: 4 },
```

to:

```tsx
{ to: '/play/roulette', icon: '🎡', label: 'ROULETTE', status: 'playable' },
```

- [ ] **Step 2: Run lint + typecheck + tests**

```bash
pnpm lint && pnpm typecheck && pnpm test --run
```

Expected: all green. The lobby renders Roulette with the cyan "playable" gradient instead of the red "stub" tile.

- [ ] **Step 3: Commit**

```bash
git add src/pages/lobby/CabinetCarousel.tsx
git commit -m "feat(lobby): flip Roulette cabinet to playable"
```

## Task D.7: Manual end-to-end smoke

This task is manual-only — no commit, but it's a hard gate before opening PR D.

- [ ] **Step 1: Start the dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Walk the golden path**

1. Log in (or register a fresh user).
2. Verify Lobby shows Roulette cabinet in **cyan PLAY NOW** state (not red stub).
3. Click the Roulette cabinet.
4. Page loads at `/play/roulette` with the wheel + felt + chip selector visible.
5. Select the $25 chip.
6. Click `RED` → chip stack appears on the RED bar. Total bet shows `25`.
7. Click `BLACK` → second chip stack. Total bet `50`.
8. Click `straight on 17` (the number cell 17) → third stack. Total `75`.
9. Click `Spin`. Balance drops by 75. Wheel spins for 5s.
10. Result banner appears. Wheel stops with ball on the winning pocket. Winning pocket pulses.
11. If you won, balance updates with the credit. The RECENT sidebar shows a new entry with the winning number.
12. Click `New round`. Winning chips clear; losing chips remain.
13. Click `Spin` again. Losing chips are re-placed (balance drops accordingly).

- [ ] **Step 3: Walk the reduced-motion path**

1. Set OS to "Reduce motion" (macOS: System Settings → Accessibility → Display → Reduce motion).
2. Refresh the page.
3. Place a bet and click Spin. Wheel should NOT rotate visually — result should appear immediately (no 5-second delay).
4. Result banner appears without slide.
5. Restore OS reduce-motion to off.

- [ ] **Step 4: Walk the edge cases**

1. Insufficient chips: deliberately bet more than your balance (e.g. pick the $1000 chip and try to stack 5 on different positions). Click Spin → no spin happens, balance untouched, console shows the warning.
2. Position cap: place chips on 11 different number cells (e.g. straight on 1, 2, 3, … 11). The 11th click should be silently ignored (10-position cap).
3. Stacking: click the same number twice → chip stack grows; total bet doubles.
4. CLEAR ALL: place several bets, then click "Clear all bets". Felt clears.
5. Zero spin: hard to force, but if you observe one during the smoke session, confirm all outside bets lose and `straight:0` (if placed) wins.

## Task D.8: PR D — verify, push, open, merge

- [ ] **Step 1: Run the full DoD locally**

```bash
pnpm lint && pnpm typecheck && pnpm test --run && pnpm build
```

Expected: all four exit 0. Test suite shows total Roulette test count ≥ 80.

- [ ] **Step 2: Verify coverage**

```bash
pnpm test --run --coverage
```

Expected: `src/games/roulette/*.ts` (logic, bets, wheel, machine, config) at ≥ 90%. `.tsx` files have no formal threshold but have explicit tests.

- [ ] **Step 3: Push branch**

```bash
git push -u origin phase-4-roulette-pr-d-page
```

- [ ] **Step 4: Open PR**

```bash
gh pr create --title "phase-4(roulette): RoulettePage + lobby flip + router (game playable)" --body "$(cat <<'EOF'
## Summary

PR D of Phase 4. Wires everything together; Roulette is fully playable from the lobby.

- `ResultBanner.tsx` — winning number + verdict, slides in on settle
- `RoulettePage.tsx` — machine + Wheel + BettingLayout + ChipSelector composed via GameShell; recent-rounds sidebar
- Wallet bridge: **deferred placeBet model** (chips don't move until SPIN; design amendment vs. spec §11 — full rationale in plan §"Wallet-timing model")
- Router swap: `/play/roulette` mounts `RoulettePage`
- Lobby: Roulette cabinet flips from stub → playable cyan tile
- All 10 bet types reachable via the felt; reduced-motion path verified

## Test plan

- [x] `pnpm lint && pnpm typecheck && pnpm test --run && pnpm build` green locally
- [x] Coverage ≥ 90% on `src/games/roulette/*.ts`
- [x] Manual golden-path smoke (Task D.7)
- [x] Manual reduced-motion smoke
- [x] Insufficient-chips / position-cap / stacking / clear-all edge cases verified
- [ ] CI green (4 jobs)
- [ ] Subagent two-stage reviews per task passed

## Design notes

**Refund-via-push pattern.** If SPIN's parallel placeBet calls partially succeed and then one fails, already-placed handles are refunded via a `settleRound` with `outcome: 'push'`, `payout = amount`, and `details.refunded = true`. This leaves a small "refunded round" row in the rounds table. The alternative (a wallet `cancelBet` API) was rejected as out-of-scope for Phase 4. Stats pages can filter `details.refunded === true` if needed in Phase 7.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Wait for CI green, merge, sync main**

```bash
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

Expected: PR merged, main synced, branch deleted (PR D). Phase 4 implementation complete on main.

---

# Release PR — v0.5-roulette

**Branch:** `chore/release-v0.5-roulette` (off freshly-merged `main`)
**Goal:** Tag the v0.5-roulette release. No code changes (the previous PR added everything). Just a release-notes commit + a tag.

## Task R.1: Branch and verify

- [ ] **Step 1: Sync main, branch**

```bash
git checkout main && git pull --ff-only
git checkout -b chore/release-v0.5-roulette
```

- [ ] **Step 2: Verify everything still green locally on main**

```bash
pnpm lint && pnpm typecheck && pnpm test --run && pnpm build
```

Expected: all four exit 0. Bundle size shown by `pnpm build` should be ≤ 800 kB JS.

## Task R.2: Empty release commit + tag

- [ ] **Step 1: Create an empty commit**

```bash
git commit --allow-empty -m "chore(release): v0.5-roulette"
```

- [ ] **Step 2: Tag**

```bash
git tag -a v0.5-roulette -m "Phase 4 — Roulette: European single-zero wheel, all 10 bet types"
```

- [ ] **Step 3: Push branch + tag**

```bash
git push -u origin chore/release-v0.5-roulette
git push origin v0.5-roulette
```

## Task R.3: PR + GitHub Release

- [ ] **Step 1: Open the release PR**

```bash
gh pr create --title "chore(release): v0.5-roulette" --body "$(cat <<'EOF'
## Summary

Tag the Phase 4 release. No code changes — PR A through PR D shipped everything.

## What's in v0.5-roulette

- European single-zero wheel (37 pockets, real pocket order)
- All 10 bet types from BUILD_GUIDE §8.2 with correct payouts (35:1 / 17:1 / 11:1 / 8:1 / 5:1 / 2:1 / 1:1)
- Multi-bet rounds (up to 10 distinct positions, chip-stacking on each)
- Classic wood + brass + golden-neon-glow wheel with silver turret + pearl ball
- 5-second spin animation with reduced-motion fallback
- Horizontal real-casino betting layout with edge-overlay targets for splits/corners/streets/six-lines
- 6-chip denomination selector (5 / 25 / 100 / 250 / 500 / 1000)
- ADRs 0029 (wheel order), 0030 (bet position model), 0031 (spin animation contract)
- Coverage ≥ 90% on `src/games/roulette/*.ts`

## Phase progress

Phases 0–4 complete. Next: Phase 5 (Slots), Phase 6 (Baccarat), Phase 7 (Stats + Leaderboard), Phase 8 (Polish).

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
gh release create v0.5-roulette \
  --title "v0.5-roulette — Phase 4 complete" \
  --notes "Full European Roulette: 10 bet types, multi-bet rounds, classic wheel with golden neon glow + silver turret + pearl ball, horizontal betting layout. See PR #<R-pr-number> for full notes."
```

Expected: release published at `https://github.com/A1PC/localGamble/releases/tag/v0.5-roulette`.

---
