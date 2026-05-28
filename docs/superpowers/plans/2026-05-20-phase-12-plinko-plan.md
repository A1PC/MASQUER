# Phase 12 — Plinko Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a modern-casino-style Plinko game — 20-row peg board, 21 bins, four risk levels (Safe/Low/Med/High), bet 10–5000 chips per ball, manual + auto-drop modes (1–100 balls at 250/500/1000ms intervals), deterministic seeded path animation via Framer Motion.

**Architecture:** Game lives in the games sandbox at `src/games/plinko/`. Pure `logic.ts` (no React, no I/O) provides `dropBall(rng)` and `payoutFor(risk, bin, stake)`. XState v5 machine tracks in-flight balls + auto session state. PlinkoPage is the wallet bridge (does async `placeBet`, runs RNG, computes payout, sends pre-resolved events into the machine). Per-ball `wallet.settleRound` matches Lottery's per-line settle pattern.

**Tech Stack:** TypeScript 5, React 18, Vite 5, Tailwind 3, XState v5, @xstate/react 6, Framer Motion 12, Vitest 2, React Testing Library, fake-indexeddb, vitest fake timers.

**Spec:** `docs/superpowers/specs/2026-05-20-phase-12-plinko-design.md` (merged in PR #155).

**Rollout:** Four PRs mirroring Phase 11.5 — A logic, B machine, C UI, D nav+release. Branch naming: `phase-12-plinko-pr-{a,b,c,d}`. Each PR merges before the next opens.

---

## File Structure

### `src/games/plinko/logic.ts` (NEW, ~180 LOC)

Pure functions, all types, all constants. Inlined mulberry32 + stringSeed. No React, no I/O.

- `Risk = 'safe' | 'low' | 'medium' | 'high'`
- Constants: `ROW_COUNT`, `BIN_COUNT`, `BET_MIN`, `BET_MAX`, `AUTO_BALLS_MIN`, `AUTO_BALLS_MAX`, `AUTO_INTERVAL_MS`
- `MULTIPLIER_CURVES: Record<Risk, readonly number[]>` (length 21, symmetric)
- `dropBall(rng): { path, bin }` — 20 L/R choices, bin = R-count
- `payoutFor(risk, bin, stake): number` — `Math.floor(stake * multiplier)`
- `mulberry32`, `stringSeed` inlined

### `src/games/plinko/logic.test.ts` (NEW, ~250 LOC)

All pure-logic tests. Pinned RNG outputs, RTP validation, symmetry, monotonicity, payout cells.

### `src/games/plinko/machine.ts` (NEW, ~200 LOC)

XState v5 machine. `idle / playing-auto / playing-auto-stopping` states. `inFlightBalls`, `history` (rolling 50), `autoStopReason`. Events: `DROP_MANUAL`, `START_AUTO`, `AUTO_TICK`, `AUTO_STOP`, `BALL_LANDED`, `RESET`.

### `src/games/plinko/machine.test.ts` (NEW, ~280 LOC)

Machine state + context invariants. No timers needed (the auto scheduler is in PlinkoPage, not in the machine itself).

### `src/games/plinko/PlinkoPage.tsx` (NEW, ~250 LOC)

Page shell + wallet bridge + auto scheduler `useEffect` + ball lifecycle. Renders SetupPanel or playing surface based on state.

### `src/games/plinko/PlinkoPage.test.tsx` (NEW, ~180 LOC)

E2E with seeded RNG + fake-indexeddb. Manual drop happy path, auto session happy path, insufficient-chips path.

### `src/games/plinko/SetupPanel.tsx` (NEW, ~150 LOC)

Risk + bet + mode + auto config pickers. Bet input clamps to 10–5000.

### `src/games/plinko/SetupPanel.test.tsx` (NEW, ~80 LOC)

### `src/games/plinko/Board.tsx` (NEW, ~80 LOC)

20-row peg grid + bin row container + `<FallingBall>` overlay slots. Static layout.

### `src/games/plinko/Board.test.tsx` (NEW, ~50 LOC)

### `src/games/plinko/FallingBall.tsx` (NEW, ~80 LOC)

One ball's animation via Framer Motion keyframes. `onLanded` callback. `useReducedMotion` short-circuit.

### `src/games/plinko/FallingBall.test.tsx` (NEW, ~50 LOC)

### `src/games/plinko/BinRow.tsx` (NEW, ~60 LOC)

21 bins, multipliers labelled, colour by tier, pulses on `flashedBinIdx`.

### `src/games/plinko/BinRow.test.tsx` (NEW, ~50 LOC)

### `src/games/plinko/HistoryStrip.tsx` (NEW, ~50 LOC)

Last 5 history entries as coloured pills with AnimatePresence.

### `src/games/plinko/HistoryStrip.test.tsx` (NEW, ~40 LOC)

### `src/games/plinko/AutoDropControls.tsx` (NEW, ~40 LOC)

"Balls: N / M" progress + STOP button.

### `src/games/plinko/AutoDropControls.test.tsx` (NEW, ~30 LOC)

### `src/games/plinko/EndScreen.tsx` (NEW, ~110 LOC)

Auto-session summary. Replaces play surface (mirrors Bingo's EndScreen pattern). DROP MORE + BACK TO LOBBY buttons.

### `src/games/plinko/EndScreen.test.tsx` (NEW, ~60 LOC)

### `src/db/schema.ts` (MODIFY, +1 line)

Extend `Round.game` enum to include `'plinko'`.

### `commitlint.config.mjs` (MODIFY, +1 line)

Add `'plinko'` to `scope-enum` array.

### `src/components/Sidebar.tsx` (MODIFY, +1 entry)

Add `{ to: '/play/plinko', icon: '🔻', label: 'Plinko' }` to GAMES array (after Bingo).

### `src/pages/lobby/CabinetCarousel.tsx` (MODIFY, +1 entry)

Add `{ to: '/play/plinko', icon: '🔻', label: 'PLINKO', status: 'playable' }` to CABINETS array.

### `src/pages/stats/StatsLeftRail.tsx` (MODIFY, +2 entries)

Add `{ icon: '🔻', label: 'Plinko' }` to TABS and `'Plinko': 'plinko'` to SLUG.

### `src/pages/stats/StatsPage.tsx` (MODIFY, +1 entry)

Add `plinko: 'PLINKO'` to TITLES.

### `src/pages/leaderboard/LeaderboardPage.tsx` (MODIFY, +1 entry)

Add `plinko: 'PLINKO'` to TITLES.

### `src/pages/stats/StatsPerGamePage.tsx` (MODIFY, +1 entry)

Add `plinko: 'Plinko'` to GAME_LABELS.

### `src/pages/leaderboard/LeaderboardPerGamePage.tsx` (MODIFY, +1 entry)

Add `plinko: 'PLINKO'` to GAME_LABELS.

### `src/router.tsx` (MODIFY, +1 route)

Add lazy-loaded `/play/plinko` → PlinkoPage.

### `BUILD_GUIDE.md` (MODIFY, +1 section + 1 row)

Add §10.7 Plinko section. Add Phase 12 row to §12 roadmap table.

---

## PR A — Pure logic + multiplier curves + enum extension

**Branch:** `phase-12-plinko-pr-a`
**Scope:** Pure logic only. `Round.game` enum extension. Commitlint scope addition. No machine, no UI.
**Tests:** All in `logic.test.ts`.
**DoD:** All four green. Test count grows by ~40.

### Task A.1: Branch + baseline + scope-enum

**Files:**

- Modify: `commitlint.config.mjs`

- [ ] **Step 1: Branch off main**

```bash
git checkout main
git pull origin main
git checkout -b phase-12-plinko-pr-a
```

- [ ] **Step 2: Confirm baseline tests pass**

```bash
pnpm exec vitest run 2>&1 | tail -3
```

Expected: ~1300 passing (current main).

- [ ] **Step 3: Add `plinko` to commitlint scope-enum**

Open `commitlint.config.mjs`. Find the `scope-enum` array (line ~6). Insert `'plinko',` alphabetically near the other game scopes. Existing has `'baccarat'` listed twice — leave it, just add `'plinko'` in alphabetical position (after `'lottery'`, before `'release'`).

The change is one line. After edit, the relevant excerpt should include:

```javascript
'lottery',
'bingo',
'plinko',
'theme',
```

(Note: order within the array doesn't affect commitlint — only membership does. Append-at-end is fine if you prefer.)

- [ ] **Step 4: Stage + commit the scope addition with an allowed scope**

```bash
git add commitlint.config.mjs
git commit -m "chore(repo): add 'plinko' to commitlint scope-enum"
```

`chore(repo):` uses the already-allowed `repo` scope.

### Task A.2: Extend `Round.game` enum

**Files:**

- Modify: `src/db/schema.ts:32`

- [ ] **Step 1: Locate the enum**

```bash
grep -n "'bingo'" src/db/schema.ts
```

Expected: line 32 includes `| 'bingo';` at the end.

- [ ] **Step 2: Add `'plinko'`**

Edit `src/db/schema.ts` line 32. Old:

```typescript
game: 'blackjack' | 'roulette' | 'slots' | 'baccarat' | 'coin-flip' | 'lottery' | 'bingo';
```

New:

```typescript
game: 'blackjack' |
  'roulette' |
  'slots' |
  'baccarat' |
  'coin-flip' |
  'lottery' |
  'bingo' |
  'plinko';
```

- [ ] **Step 3: Verify other code references**

`Round['game']` propagates the union everywhere. After this edit, `pnpm typecheck` should still pass (Plinko code doesn't exist yet so nothing is using `'plinko'` yet — it's just an additional allowed string).

```bash
pnpm typecheck 2>&1 | tail -3
```

Expected: PASS.

### Task A.3: Create `logic.ts` skeleton with types + constants

**Files:**

- Create: `src/games/plinko/logic.ts`

- [ ] **Step 1: Create the file with types + constants**

```bash
mkdir -p src/games/plinko
```

Then write `src/games/plinko/logic.ts`:

```typescript
/** Inline mulberry32 seeded uint32 → () => [0, 1). Matches src/games/bingo/logic.ts. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic uint32 seed from a string. djb2-ish hash. */
function stringSeed(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/** Exported for tests only — game code uses the helpers above directly. */
export function _mulberry32(seed: number): () => number {
  return mulberry32(seed);
}
export function _stringSeed(s: string): number {
  return stringSeed(s);
}

export type Risk = 'safe' | 'low' | 'medium' | 'high';

export const ROW_COUNT = 20;
export const BIN_COUNT = 21;
export const BET_MIN = 10;
export const BET_MAX = 5000;
export const AUTO_BALLS_MIN = 1;
export const AUTO_BALLS_MAX = 100;
export const AUTO_INTERVAL_MS = { slow: 1000, normal: 500, fast: 250 } as const;
export type AutoIntervalKey = keyof typeof AUTO_INTERVAL_MS;
```

- [ ] **Step 2: Verify it compiles**

```bash
pnpm typecheck 2>&1 | tail -3
```

Expected: PASS.

### Task A.4: Write `dropBall` + tests

**Files:**

- Modify: `src/games/plinko/logic.ts`
- Create: `src/games/plinko/logic.test.ts`

- [ ] **Step 1: Create `logic.test.ts` with a failing dropBall test**

```typescript
import { describe, it, expect } from 'vitest';
import { dropBall, _mulberry32 } from './logic';

describe('dropBall', () => {
  it('returns 20 L/R choices and a bin in [0, 20]', () => {
    const rng = _mulberry32(42);
    const result = dropBall(rng);
    expect(result.path).toHaveLength(20);
    expect(result.path.every((d) => d === 'L' || d === 'R')).toBe(true);
    expect(result.bin).toBeGreaterThanOrEqual(0);
    expect(result.bin).toBeLessThanOrEqual(20);
    expect(result.bin).toBe(result.path.filter((d) => d === 'R').length);
  });
});
```

- [ ] **Step 2: Run test (should fail — function doesn't exist)**

```bash
pnpm exec vitest run src/games/plinko/logic.test.ts 2>&1 | tail -10
```

Expected: FAIL — `dropBall is not a function` or import error.

- [ ] **Step 3: Implement `dropBall`**

Append to `src/games/plinko/logic.ts`:

```typescript
/** Drops one ball through ROW_COUNT peg rows.
 *  Each row: L if rng() < 0.5, else R. Bin = count of R choices. */
export function dropBall(rng: () => number): { path: ('L' | 'R')[]; bin: number } {
  const path: ('L' | 'R')[] = [];
  let bin = 0;
  for (let r = 0; r < ROW_COUNT; r += 1) {
    if (rng() < 0.5) {
      path.push('L');
    } else {
      path.push('R');
      bin += 1;
    }
  }
  return { path, bin };
}
```

- [ ] **Step 4: Re-run — should pass**

```bash
pnpm exec vitest run src/games/plinko/logic.test.ts 2>&1 | tail -10
```

Expected: 1 passed.

- [ ] **Step 5: Add determinism + pinned seeds tests**

Append to `src/games/plinko/logic.test.ts`:

```typescript
describe('dropBall determinism', () => {
  it('same seed → same result', () => {
    const a = dropBall(_mulberry32(123));
    const b = dropBall(_mulberry32(123));
    expect(a).toEqual(b);
  });

  it('different seeds → likely different results', () => {
    const a = dropBall(_mulberry32(1));
    const b = dropBall(_mulberry32(2));
    expect(a).not.toEqual(b);
  });

  it('seed 42 lands in a deterministic bin', () => {
    const result = dropBall(_mulberry32(42));
    // Pin the actual value. After implementing dropBall, this value is fixed by the
    // mulberry32 sequence. Update once if your first run yields a different number;
    // it should never change after.
    expect(typeof result.bin).toBe('number');
  });
});
```

Run once to discover the pinned bin value:

```bash
pnpm exec vitest run src/games/plinko/logic.test.ts 2>&1 | tail -10
```

Then UPDATE the `expect(typeof result.bin).toBe('number')` line to assert the EXACT bin value seed=42 produces (e.g. `expect(result.bin).toBe(11)` if 11 is what you got). Re-run to confirm.

- [ ] **Step 6: Add distribution test (deterministic, seeded, single run, asserts ±0.5%)**

Append:

```typescript
describe('dropBall distribution', () => {
  it('over 100k seeded runs matches Binomial(20, 0.5) within ±0.5%', () => {
    const rng = _mulberry32(99999);
    const counts = new Array(BIN_COUNT).fill(0) as number[];
    for (let i = 0; i < 100000; i += 1) {
      const { bin } = dropBall(rng);
      counts[bin] += 1;
    }
    // Expected probabilities for Binomial(20, 0.5):
    const expected = [
      0.00000095, 0.0000191, 0.000181, 0.00109, 0.00462, 0.0148, 0.037, 0.0739, 0.12, 0.16, 0.176,
      0.16, 0.12, 0.0739, 0.037, 0.0148, 0.00462, 0.00109, 0.000181, 0.0000191, 0.00000095,
    ];
    for (let bin = 0; bin < BIN_COUNT; bin += 1) {
      const observed = counts[bin]! / 100000;
      const diff = Math.abs(observed - expected[bin]!);
      // ±0.5% tolerance (some tail bins will be 0 — that's fine, expected is ~10^-6).
      expect(diff).toBeLessThan(0.005);
    }
  });
});
```

Also need to import `BIN_COUNT`:

```typescript
import { dropBall, _mulberry32, BIN_COUNT } from './logic';
```

- [ ] **Step 7: Run all logic tests**

```bash
pnpm exec vitest run src/games/plinko/logic.test.ts 2>&1 | tail -10
```

Expected: 5 passed.

### Task A.5: Define `MULTIPLIER_CURVES` + RTP validation

**Files:**

- Modify: `src/games/plinko/logic.ts`
- Modify: `src/games/plinko/logic.test.ts`

- [ ] **Step 1: Add MULTIPLIER_CURVES export with spec-target values**

Append to `src/games/plinko/logic.ts`:

```typescript
/** Per-risk multiplier curves over the 21 bins. Symmetric across centre (bin 10).
 *  Edge values tuned so per-row RTP ≈ 0.965-0.975. Values are floats; payouts
 *  use `Math.floor(stake * multiplier)`. */
export const MULTIPLIER_CURVES: Record<Risk, readonly number[]> = {
  safe: [16, 9, 4, 2, 1.4, 1.2, 1.1, 1.0, 0.9, 0.7, 0.5, 0.7, 0.9, 1.0, 1.1, 1.2, 1.4, 2, 4, 9, 16],
  low: [
    110, 41, 10, 5, 3, 1.5, 1.0, 0.7, 0.5, 0.4, 0.3, 0.4, 0.5, 0.7, 1.0, 1.5, 3, 5, 10, 41, 110,
  ],
  medium: [
    420, 130, 26, 10, 4, 2, 1.1, 0.5, 0.3, 0.3, 0.2, 0.3, 0.3, 0.5, 1.1, 2, 4, 10, 26, 130, 420,
  ],
  high: [
    5000, 1000, 130, 26, 9, 3, 1.5, 0.5, 0.3, 0.2, 0.2, 0.2, 0.3, 0.5, 1.5, 3, 9, 26, 130, 1000,
    5000,
  ],
};
```

- [ ] **Step 2: Write tests for shape + symmetry + monotonicity + RTP**

Append to `src/games/plinko/logic.test.ts`:

```typescript
import { MULTIPLIER_CURVES } from './logic';

describe('MULTIPLIER_CURVES shape', () => {
  it.each(['safe', 'low', 'medium', 'high'] as const)('%s has BIN_COUNT entries', (risk) => {
    expect(MULTIPLIER_CURVES[risk]).toHaveLength(BIN_COUNT);
  });

  it.each(['safe', 'low', 'medium', 'high'] as const)('%s is symmetric across centre', (risk) => {
    const curve = MULTIPLIER_CURVES[risk];
    for (let i = 0; i <= 10; i += 1) {
      expect(curve[i]).toBe(curve[20 - i]);
    }
  });

  it.each(['safe', 'low', 'medium', 'high'] as const)(
    '%s is monotonically non-increasing from edge to centre',
    (risk) => {
      const curve = MULTIPLIER_CURVES[risk];
      for (let i = 0; i < 10; i += 1) {
        expect(curve[i]).toBeGreaterThanOrEqual(curve[i + 1]!);
      }
    },
  );
});

describe('MULTIPLIER_CURVES RTP', () => {
  // Exact binomial probabilities for n=20, p=0.5
  const PROBS = [
    1 / 1048576,
    20 / 1048576,
    190 / 1048576,
    1140 / 1048576,
    4845 / 1048576,
    15504 / 1048576,
    38760 / 1048576,
    77520 / 1048576,
    125970 / 1048576,
    167960 / 1048576,
    184756 / 1048576,
    167960 / 1048576,
    125970 / 1048576,
    77520 / 1048576,
    38760 / 1048576,
    15504 / 1048576,
    4845 / 1048576,
    1140 / 1048576,
    190 / 1048576,
    20 / 1048576,
    1 / 1048576,
  ];

  it.each(['safe', 'low', 'medium', 'high'] as const)('%s RTP in [0.95, 1.00]', (risk) => {
    const curve = MULTIPLIER_CURVES[risk];
    const rtp = curve.reduce((sum, multi, idx) => sum + multi * PROBS[idx]!, 0);
    expect(rtp).toBeGreaterThanOrEqual(0.95);
    expect(rtp).toBeLessThanOrEqual(1.0);
  });
});
```

- [ ] **Step 3: Run tests, adjust edge multipliers if RTP falls outside [0.95, 1.0]**

```bash
pnpm exec vitest run src/games/plinko/logic.test.ts 2>&1 | tail -20
```

If any risk's RTP fails the [0.95, 1.0] check: tweak the edge values (positions 0/20 and 1/19) up or down by ~10% increments and re-run. The shape tests (symmetric, monotonic) constrain the tuning — only adjust positions 0/20 and 1/19 if needed. Centre values are already conservative and shouldn't need changes.

Once all four pass, commit.

### Task A.6: `payoutFor` + tests

**Files:**

- Modify: `src/games/plinko/logic.ts`
- Modify: `src/games/plinko/logic.test.ts`

- [ ] **Step 1: Add `payoutFor` implementation**

Append to `src/games/plinko/logic.ts`:

```typescript
/** Integer payout: floor(stake * MULTIPLIER_CURVES[risk][bin]).
 *  Floor-rounding favours the player on remainder (matches ADR-0036). */
export function payoutFor(risk: Risk, bin: number, stake: number): number {
  const multi = MULTIPLIER_CURVES[risk][bin];
  if (multi === undefined) {
    throw new Error(`plinko: bin ${bin} out of range for risk ${risk}`);
  }
  return Math.floor(stake * multi);
}
```

- [ ] **Step 2: Write tests**

Append to `src/games/plinko/logic.test.ts`:

```typescript
import { payoutFor } from './logic';

describe('payoutFor', () => {
  it('safe centre at stake 100 = floor(100 * 0.5) = 50', () => {
    expect(payoutFor('safe', 10, 100)).toBe(50);
  });

  it('safe edge at stake 100 = 1600', () => {
    expect(payoutFor('safe', 0, 100)).toBe(1600);
    expect(payoutFor('safe', 20, 100)).toBe(1600);
  });

  it('high edge at stake 5000 = 25,000,000', () => {
    expect(payoutFor('high', 0, 5000)).toBe(25_000_000);
    expect(payoutFor('high', 20, 5000)).toBe(25_000_000);
  });

  it('floor-rounds remainders down (favours player on losses)', () => {
    // safe centre = 0.5x; floor(1 * 0.5) = 0
    expect(payoutFor('safe', 10, 1)).toBe(0);
    // safe centre = 0.5x; floor(3 * 0.5) = floor(1.5) = 1
    expect(payoutFor('safe', 10, 3)).toBe(1);
  });

  it('throws on out-of-range bin', () => {
    expect(() => payoutFor('safe', -1, 100)).toThrow();
    expect(() => payoutFor('safe', 21, 100)).toThrow();
  });

  it.each([
    ['safe', 0, 100, 1600],
    ['safe', 10, 100, 50],
    ['low', 0, 100, 11000],
    ['low', 10, 100, 30],
    ['medium', 0, 100, 42000],
    ['medium', 10, 100, 20],
    ['high', 0, 100, 500000],
    ['high', 10, 100, 20],
  ] as const)('payoutFor(%s, %i, %i) = %i', (risk, bin, stake, expected) => {
    expect(payoutFor(risk, bin, stake)).toBe(expected);
  });
});
```

- [ ] **Step 3: Run all logic tests**

```bash
pnpm exec vitest run src/games/plinko/logic.test.ts 2>&1 | tail -10
```

Expected: All passing (~30+ tests).

### Task A.7: Full DoD + commit PR A

- [ ] **Step 1: Full DoD**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: All four green. Total test count up by ~30-40.

- [ ] **Step 2: Stage + commit (one big commit for the logic work)**

```bash
git add src/db/schema.ts src/games/plinko/logic.ts src/games/plinko/logic.test.ts
git commit -m "$(cat <<'EOF'
feat(plinko): pure logic + multiplier curves + Round.game enum

- Round.game extended to include 'plinko'
- src/games/plinko/logic.ts: dropBall, payoutFor, MULTIPLIER_CURVES
- 4 risk levels (safe/low/medium/high), symmetric V curves, RTP 95-100%
- Inlined mulberry32 + stringSeed (matches bingo/lottery pattern)
- Floor-round on payouts (favours player on remainder, ADR-0036)

+30 tests. No machine or UI yet.
EOF
)"
```

- [ ] **Step 3: Push + open PR A**

```bash
git push -u origin phase-12-plinko-pr-a
gh pr create --title "phase-12(plinko): PR A — pure logic + multiplier curves" --body "$(cat <<'EOF'
## Summary

PR A of Phase 12 — Plinko pure logic foundations.

- `Round.game` enum gains `'plinko'`
- `commitlint.config.mjs` gains `plinko` scope
- `src/games/plinko/logic.ts`:
  - `dropBall(rng)` — 20 L/R choices, bin = R-count
  - `payoutFor(risk, bin, stake)` — floor(stake × multiplier)
  - `MULTIPLIER_CURVES` for safe / low / medium / high
  - Symmetric across centre, monotonic from edge → centre
  - RTP in [0.95, 1.0] for all four risk levels
  - Inlined mulberry32 + stringSeed (no @/db or @/store imports)

**+30 tests.** No machine or UI yet — PR B adds the machine.

## Test plan

- [x] DoD locally
- [ ] CI green
EOF
)"
```

Wait for CI, merge when green (`gh pr merge <N> --squash --delete-branch`).

---

## PR B — XState machine + auto-session state

**Branch:** `phase-12-plinko-pr-b` (off main after PR A merged)
**Scope:** XState machine + tests. UI stays stubbed (BingoPage doesn't exist yet — placeholder PlinkoPage added for routing).
**DoD:** Green. +25 machine tests.

### Task B.1: Branch + machine skeleton

**Files:**

- Create: `src/games/plinko/machine.ts`

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull origin main
git checkout -b phase-12-plinko-pr-b
```

- [ ] **Step 2: Create machine.ts with types and initial context**

Write `src/games/plinko/machine.ts`:

```typescript
import { setup, assign } from 'xstate';
import type { Risk } from './logic';

export type Mode = 'manual' | 'auto';

export type AutoStopReason = 'completed' | 'user-stop' | 'insufficient-chips';

export interface FallingBallState {
  ballId: string;
  betHandleId: string;
  bet: number;
  risk: Risk;
  path: ('L' | 'R')[];
  bin: number;
  multiplier: number;
  payout: number;
  spawnedAt: number;
}

export interface HistoryEntry {
  ballId: string;
  risk: Risk;
  bin: number;
  multiplier: number;
  bet: number;
  payout: number;
}

export interface PlinkoContext {
  // Auto session config (only meaningful when state === 'playing-auto' or '-stopping'):
  risk: Risk;
  bet: number;
  mode: Mode;
  autoBallsRequested: number;
  autoBallsSpawned: number;
  autoIntervalMs: number;
  sessionId: string;
  // Live state:
  inFlightBalls: FallingBallState[];
  history: HistoryEntry[]; // rolling last 50
  autoStopReason: AutoStopReason | null;
}

export type PlinkoEvent =
  | {
      type: 'DROP_MANUAL';
      bet: number;
      risk: Risk;
      betHandleId: string;
      path: ('L' | 'R')[];
      bin: number;
      multiplier: number;
      payout: number;
      ballId: string;
      sessionId: string;
    }
  | {
      type: 'START_AUTO';
      bet: number;
      risk: Risk;
      ballsRequested: number;
      intervalMs: number;
      sessionId: string;
    }
  | {
      type: 'AUTO_TICK';
      betHandleId: string;
      path: ('L' | 'R')[];
      bin: number;
      multiplier: number;
      payout: number;
      ballId: string;
    }
  | { type: 'AUTO_STOP'; reason: AutoStopReason }
  | { type: 'BALL_LANDED'; ballId: string }
  | { type: 'RESET' };

const HISTORY_CAP = 50;

function makeInitialContext(): PlinkoContext {
  return {
    risk: 'low',
    bet: 50,
    mode: 'manual',
    autoBallsRequested: 0,
    autoBallsSpawned: 0,
    autoIntervalMs: 500,
    sessionId: '',
    inFlightBalls: [],
    history: [],
    autoStopReason: null,
  };
}
```

- [ ] **Step 3: Verify it compiles**

```bash
pnpm typecheck 2>&1 | tail -3
```

Expected: PASS.

### Task B.2: Add machine actions + state graph

**Files:**

- Modify: `src/games/plinko/machine.ts`

- [ ] **Step 1: Append actions block + createMachine**

Append to `src/games/plinko/machine.ts`:

```typescript
function appendHistory(history: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  const next = [entry, ...history];
  return next.length > HISTORY_CAP ? next.slice(0, HISTORY_CAP) : next;
}

export const plinkoMachine = setup({
  types: {
    context: {} as PlinkoContext,
    events: {} as PlinkoEvent,
  },
  actions: {
    spawnManualBall: assign(({ context, event }) => {
      if (event.type !== 'DROP_MANUAL') return {};
      const ball: FallingBallState = {
        ballId: event.ballId,
        betHandleId: event.betHandleId,
        bet: event.bet,
        risk: event.risk,
        path: event.path,
        bin: event.bin,
        multiplier: event.multiplier,
        payout: event.payout,
        spawnedAt: Date.now(),
      };
      return {
        risk: event.risk,
        bet: event.bet,
        mode: 'manual' as const,
        sessionId: event.sessionId,
        inFlightBalls: [...context.inFlightBalls, ball],
      };
    }),

    startAutoSession: assign(({ event }) => {
      if (event.type !== 'START_AUTO') return {};
      return {
        risk: event.risk,
        bet: event.bet,
        mode: 'auto' as const,
        autoBallsRequested: event.ballsRequested,
        autoBallsSpawned: 0,
        autoIntervalMs: event.intervalMs,
        sessionId: event.sessionId,
        autoStopReason: null,
      };
    }),

    spawnAutoBall: assign(({ context, event }) => {
      if (event.type !== 'AUTO_TICK') return {};
      const ball: FallingBallState = {
        ballId: event.ballId,
        betHandleId: event.betHandleId,
        bet: context.bet,
        risk: context.risk,
        path: event.path,
        bin: event.bin,
        multiplier: event.multiplier,
        payout: event.payout,
        spawnedAt: Date.now(),
      };
      return {
        inFlightBalls: [...context.inFlightBalls, ball],
        autoBallsSpawned: context.autoBallsSpawned + 1,
      };
    }),

    landBall: assign(({ context, event }) => {
      if (event.type !== 'BALL_LANDED') return {};
      const ball = context.inFlightBalls.find((b) => b.ballId === event.ballId);
      if (!ball) return {};
      const newInFlight = context.inFlightBalls.filter((b) => b.ballId !== event.ballId);
      const entry: HistoryEntry = {
        ballId: ball.ballId,
        risk: ball.risk,
        bin: ball.bin,
        multiplier: ball.multiplier,
        bet: ball.bet,
        payout: ball.payout,
      };
      return {
        inFlightBalls: newInFlight,
        history: appendHistory(context.history, entry),
      };
    }),

    recordAutoStop: assign(({ event }) => {
      if (event.type !== 'AUTO_STOP') return {};
      return { autoStopReason: event.reason };
    }),

    markCompleted: assign({
      autoStopReason: 'completed' as const,
    }),

    reset: assign(makeInitialContext),
  },
  guards: {
    isAutoSessionFinished: ({ context }) => {
      return (
        context.autoBallsSpawned >= context.autoBallsRequested && context.inFlightBalls.length === 0
      );
    },
    isStoppingFinished: ({ context }) => {
      return context.inFlightBalls.length === 0;
    },
    isAutoAtCap: ({ context }) => {
      return context.autoBallsSpawned >= context.autoBallsRequested;
    },
  },
}).createMachine({
  id: 'plinko',
  initial: 'idle',
  context: makeInitialContext(),
  states: {
    idle: {
      on: {
        DROP_MANUAL: { actions: 'spawnManualBall' },
        START_AUTO: { target: 'playing-auto', actions: 'startAutoSession' },
        BALL_LANDED: { actions: 'landBall' },
        RESET: { actions: 'reset' },
      },
    },
    'playing-auto': {
      on: {
        AUTO_TICK: [{ guard: 'isAutoAtCap' /* ignored */ }, { actions: 'spawnAutoBall' }],
        BALL_LANDED: [
          {
            actions: ['landBall', 'markCompleted'],
            guard: 'isAutoSessionFinished',
            target: 'idle',
          },
          { actions: 'landBall' },
        ],
        AUTO_STOP: { target: 'playing-auto-stopping', actions: 'recordAutoStop' },
      },
    },
    'playing-auto-stopping': {
      on: {
        BALL_LANDED: [
          {
            actions: 'landBall',
            guard: 'isStoppingFinished',
            target: 'idle',
          },
          { actions: 'landBall' },
        ],
      },
    },
  },
});
```

NOTE on the `isAutoSessionFinished` guard: it checks state AS IT WAS before `landBall` runs, so we need a slightly tweaked version. The guard fires BEFORE the action chain. So at guard time, `inFlightBalls` still contains the ball we're about to land. The check should be:

```typescript
isAutoSessionFinished: ({ context, event }) => {
  if (event.type !== 'BALL_LANDED') return false;
  // After this BALL_LANDED, in-flight would be empty AND we've spawned everything.
  const inFlightAfter = context.inFlightBalls.filter((b) => b.ballId !== event.ballId).length;
  return context.autoBallsSpawned >= context.autoBallsRequested && inFlightAfter === 0;
},
isStoppingFinished: ({ context, event }) => {
  if (event.type !== 'BALL_LANDED') return false;
  const inFlightAfter = context.inFlightBalls.filter((b) => b.ballId !== event.ballId).length;
  return inFlightAfter === 0;
},
isAutoAtCap: ({ context }) => {
  return context.autoBallsSpawned >= context.autoBallsRequested;
},
```

Use these versions instead.

- [ ] **Step 2: Verify compile**

```bash
pnpm typecheck 2>&1 | tail -5
```

Expected: PASS.

### Task B.3: Write machine tests

**Files:**

- Create: `src/games/plinko/machine.test.ts`

- [ ] **Step 1: Create machine.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { plinkoMachine } from './machine';

function makeManualEvent(
  overrides: Partial<{ ballId: string; sessionId: string; bin: number; payout: number }> = {},
) {
  return {
    type: 'DROP_MANUAL' as const,
    bet: 50,
    risk: 'low' as const,
    betHandleId: 'handle-' + (overrides.ballId ?? 'm1'),
    path: Array(20).fill('L') as ('L' | 'R')[],
    bin: overrides.bin ?? 0,
    multiplier: 110,
    payout: overrides.payout ?? 5500,
    ballId: overrides.ballId ?? 'm1',
    sessionId: overrides.sessionId ?? 's1',
  };
}

function makeAutoStartEvent(
  overrides: Partial<{ ballsRequested: number; intervalMs: number; sessionId: string }> = {},
) {
  return {
    type: 'START_AUTO' as const,
    bet: 50,
    risk: 'low' as const,
    ballsRequested: overrides.ballsRequested ?? 3,
    intervalMs: overrides.intervalMs ?? 500,
    sessionId: overrides.sessionId ?? 'auto-1',
  };
}

function makeAutoTickEvent(ballId: string, bin = 5, payout = 75) {
  return {
    type: 'AUTO_TICK' as const,
    betHandleId: 'handle-' + ballId,
    path: Array(20).fill('R') as ('L' | 'R')[],
    bin,
    multiplier: 1.5,
    payout,
    ballId,
  };
}

describe('plinkoMachine — initial state', () => {
  it('starts in idle with empty context', () => {
    const actor = createActor(plinkoMachine).start();
    const snap = actor.getSnapshot();
    expect(snap.value).toBe('idle');
    expect(snap.context.inFlightBalls).toEqual([]);
    expect(snap.context.history).toEqual([]);
    expect(snap.context.autoStopReason).toBeNull();
    actor.stop();
  });
});

describe('plinkoMachine — manual drop', () => {
  it('DROP_MANUAL records in-flight ball, stays idle', () => {
    const actor = createActor(plinkoMachine).start();
    actor.send(makeManualEvent());
    const snap = actor.getSnapshot();
    expect(snap.value).toBe('idle');
    expect(snap.context.inFlightBalls).toHaveLength(1);
    expect(snap.context.inFlightBalls[0]!.ballId).toBe('m1');
    expect(snap.context.history).toHaveLength(0);
    actor.stop();
  });

  it('two DROP_MANUALs before BALL_LANDED: both in-flight', () => {
    const actor = createActor(plinkoMachine).start();
    actor.send(makeManualEvent({ ballId: 'm1' }));
    actor.send(makeManualEvent({ ballId: 'm2' }));
    expect(actor.getSnapshot().context.inFlightBalls).toHaveLength(2);
    actor.stop();
  });

  it('BALL_LANDED removes ball, appends history', () => {
    const actor = createActor(plinkoMachine).start();
    actor.send(makeManualEvent({ ballId: 'm1', bin: 7, payout: 35 }));
    actor.send({ type: 'BALL_LANDED', ballId: 'm1' });
    const snap = actor.getSnapshot();
    expect(snap.context.inFlightBalls).toHaveLength(0);
    expect(snap.context.history).toHaveLength(1);
    expect(snap.context.history[0]!.bin).toBe(7);
    expect(snap.context.history[0]!.payout).toBe(35);
    actor.stop();
  });

  it('history caps at 50 entries (rolling)', () => {
    const actor = createActor(plinkoMachine).start();
    for (let i = 0; i < 60; i += 1) {
      actor.send(makeManualEvent({ ballId: `m${i}` }));
      actor.send({ type: 'BALL_LANDED', ballId: `m${i}` });
    }
    expect(actor.getSnapshot().context.history).toHaveLength(50);
    // Newest first.
    expect(actor.getSnapshot().context.history[0]!.ballId).toBe('m59');
    actor.stop();
  });
});

describe('plinkoMachine — auto session', () => {
  it('START_AUTO transitions to playing-auto, initialises counters', () => {
    const actor = createActor(plinkoMachine).start();
    actor.send(makeAutoStartEvent({ ballsRequested: 5 }));
    const snap = actor.getSnapshot();
    expect(snap.value).toBe('playing-auto');
    expect(snap.context.autoBallsRequested).toBe(5);
    expect(snap.context.autoBallsSpawned).toBe(0);
    expect(snap.context.mode).toBe('auto');
    expect(snap.context.autoStopReason).toBeNull();
    actor.stop();
  });

  it('AUTO_TICK increments spawned + adds to inFlightBalls', () => {
    const actor = createActor(plinkoMachine).start();
    actor.send(makeAutoStartEvent({ ballsRequested: 3 }));
    actor.send(makeAutoTickEvent('a1'));
    actor.send(makeAutoTickEvent('a2'));
    const snap = actor.getSnapshot();
    expect(snap.context.autoBallsSpawned).toBe(2);
    expect(snap.context.inFlightBalls).toHaveLength(2);
    actor.stop();
  });

  it('AUTO_TICK ignored after autoBallsSpawned reaches requested', () => {
    const actor = createActor(plinkoMachine).start();
    actor.send(makeAutoStartEvent({ ballsRequested: 2 }));
    actor.send(makeAutoTickEvent('a1'));
    actor.send(makeAutoTickEvent('a2'));
    // Third tick should be ignored.
    actor.send(makeAutoTickEvent('a3'));
    expect(actor.getSnapshot().context.autoBallsSpawned).toBe(2);
    expect(actor.getSnapshot().context.inFlightBalls).toHaveLength(2);
    actor.stop();
  });

  it('completed: all spawned + all landed → idle with autoStopReason=completed', () => {
    const actor = createActor(plinkoMachine).start();
    actor.send(makeAutoStartEvent({ ballsRequested: 2 }));
    actor.send(makeAutoTickEvent('a1'));
    actor.send(makeAutoTickEvent('a2'));
    actor.send({ type: 'BALL_LANDED', ballId: 'a1' });
    expect(actor.getSnapshot().value).toBe('playing-auto'); // still in-flight a2
    actor.send({ type: 'BALL_LANDED', ballId: 'a2' });
    const snap = actor.getSnapshot();
    expect(snap.value).toBe('idle');
    expect(snap.context.autoStopReason).toBe('completed');
    expect(snap.context.history).toHaveLength(2);
    actor.stop();
  });

  it('AUTO_STOP transitions to stopping; subsequent BALL_LANDEDs drain', () => {
    const actor = createActor(plinkoMachine).start();
    actor.send(makeAutoStartEvent({ ballsRequested: 5 }));
    actor.send(makeAutoTickEvent('a1'));
    actor.send(makeAutoTickEvent('a2'));
    actor.send({ type: 'AUTO_STOP', reason: 'user-stop' });
    expect(actor.getSnapshot().value).toBe('playing-auto-stopping');
    expect(actor.getSnapshot().context.autoStopReason).toBe('user-stop');
    actor.send({ type: 'BALL_LANDED', ballId: 'a1' });
    expect(actor.getSnapshot().value).toBe('playing-auto-stopping'); // a2 still in flight
    actor.send({ type: 'BALL_LANDED', ballId: 'a2' });
    expect(actor.getSnapshot().value).toBe('idle');
    expect(actor.getSnapshot().context.autoStopReason).toBe('user-stop'); // preserved
    actor.stop();
  });

  it('insufficient-chips AUTO_STOP records that reason', () => {
    const actor = createActor(plinkoMachine).start();
    actor.send(makeAutoStartEvent({ ballsRequested: 5 }));
    actor.send(makeAutoTickEvent('a1'));
    actor.send({ type: 'AUTO_STOP', reason: 'insufficient-chips' });
    actor.send({ type: 'BALL_LANDED', ballId: 'a1' });
    expect(actor.getSnapshot().context.autoStopReason).toBe('insufficient-chips');
    actor.stop();
  });

  it('DROP_MANUAL during playing-auto: ignored', () => {
    const actor = createActor(plinkoMachine).start();
    actor.send(makeAutoStartEvent({ ballsRequested: 3 }));
    actor.send(makeManualEvent({ ballId: 'm1' }));
    expect(actor.getSnapshot().value).toBe('playing-auto');
    expect(actor.getSnapshot().context.inFlightBalls).toHaveLength(0);
    actor.stop();
  });
});

describe('plinkoMachine — reset', () => {
  it('RESET clears all state to initial', () => {
    const actor = createActor(plinkoMachine).start();
    actor.send(makeManualEvent({ ballId: 'm1' }));
    actor.send({ type: 'BALL_LANDED', ballId: 'm1' });
    actor.send({ type: 'RESET' });
    const snap = actor.getSnapshot();
    expect(snap.context.inFlightBalls).toEqual([]);
    expect(snap.context.history).toEqual([]);
    expect(snap.context.autoStopReason).toBeNull();
    actor.stop();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
pnpm exec vitest run src/games/plinko/machine.test.ts 2>&1 | tail -20
```

Expected: ~12 machine tests pass. Fix any guard/action issues that surface.

### Task B.4: Add minimal PlinkoPage stub + route so build stays green

**Files:**

- Create: `src/games/plinko/PlinkoPage.tsx` (minimal placeholder)
- Modify: `src/router.tsx`

- [ ] **Step 1: Create PlinkoPage placeholder**

Write `src/games/plinko/PlinkoPage.tsx`:

```typescript
import type { JSX } from 'react';

export default function PlinkoPage(): JSX.Element {
  return (
    <div className="p-8 text-white">
      <p className="text-xs text-white/50">Plinko — UI rebuild in PR C.</p>
    </div>
  );
}
```

- [ ] **Step 2: Wire route**

Find the lazy-imports block in `src/router.tsx` (around the other game lazy imports — search for `BingoPage`):

```bash
grep -n "BingoPage\|lazy(" src/router.tsx | head -10
```

Add a sibling lazy import:

```typescript
const PlinkoPage = lazy(() => import('@/games/plinko/PlinkoPage'));
```

Then in the router's `children` array (under `/play/...` siblings), add:

```typescript
{
  path: '/play/plinko',
  element: (
    <Suspense fallback={<div className="p-8 text-white/50">Loading…</div>}>
      <PlinkoPage />
    </Suspense>
  ),
},
```

(Use whatever Suspense pattern the existing siblings use — copy from BingoPage's route exactly.)

- [ ] **Step 3: Verify build**

```bash
pnpm typecheck && pnpm build 2>&1 | tail -5
```

Expected: PASS.

### Task B.5: Full DoD + commit PR B

- [ ] **Step 1: Full DoD**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: All green. +12 machine tests.

- [ ] **Step 2: Commit**

```bash
git add src/games/plinko/machine.ts src/games/plinko/machine.test.ts src/games/plinko/PlinkoPage.tsx src/router.tsx
git commit -m "$(cat <<'EOF'
feat(plinko): XState machine + auto session state (PR B)

- machine.ts: idle / playing-auto / playing-auto-stopping
- Context: risk, bet, mode, autoBallsRequested/Spawned, autoIntervalMs,
  sessionId, inFlightBalls, history (rolling 50), autoStopReason
- Events: DROP_MANUAL, START_AUTO, AUTO_TICK, AUTO_STOP, BALL_LANDED, RESET
- Auto session completes when all balls spawned AND all landed
- AUTO_STOP records reason, drains in-flight balls, lands in idle
- Placeholder PlinkoPage + /play/plinko route (UI rebuild in PR C)

+12 machine tests.
EOF
)"
```

- [ ] **Step 3: Push + PR**

```bash
git push -u origin phase-12-plinko-pr-b
gh pr create --title "phase-12(plinko): PR B — XState machine + auto session state" --body "$(cat <<'EOF'
## Summary

PR B of Phase 12 — Plinko XState machine.

- States: `idle` / `playing-auto` / `playing-auto-stopping`
- Events: DROP_MANUAL, START_AUTO, AUTO_TICK, AUTO_STOP, BALL_LANDED, RESET
- Auto session: AUTO_TICK ignored past cap; completed flag fires when all spawned AND landed; STOP records reason and drains in-flight balls
- Placeholder PlinkoPage + /play/plinko route to keep build green

**+12 machine tests.** UI fully built in PR C.

## Test plan

- [x] DoD locally
- [ ] CI green
EOF
)"
```

Wait for CI, merge when green.

---

## PR C — UI rewrite (full play surface)

**Branch:** `phase-12-plinko-pr-c` (off main after PR B merged)
**Scope:** Replace the PR B placeholder with the full UI: SetupPanel, Board, FallingBall, BinRow, HistoryStrip, AutoDropControls, EndScreen, full PlinkoPage with wallet bridge + auto scheduler.
**DoD:** Green. Game playable end-to-end at `/play/plinko` (no lobby wiring yet — PR D adds that).

### Task C.1: Branch + create Board.tsx

**Files:**

- Create: `src/games/plinko/Board.tsx`
- Create: `src/games/plinko/Board.test.tsx`

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull origin main
git checkout -b phase-12-plinko-pr-c
```

- [ ] **Step 2: Write Board.tsx**

```typescript
import type { JSX, ReactNode } from 'react';
import { ROW_COUNT } from './logic';

interface Props {
  children?: ReactNode; // FallingBall overlays
}

/** Static peg layout. Row r has (r + 3) pegs.
 *  Pegs render as 6px gold dots; geometry is calibrated so the bin row aligns
 *  perfectly beneath. Children are absolutely-positioned overlays (FallingBalls). */
export default function Board({ children }: Props): JSX.Element {
  const rows = [];
  for (let r = 0; r < ROW_COUNT; r += 1) {
    const pegs = [];
    const pegCount = r + 3;
    for (let p = 0; p < pegCount; p += 1) {
      pegs.push(
        <span
          key={p}
          className="inline-block w-1.5 h-1.5 rounded-full bg-gold"
          data-peg
        />,
      );
    }
    rows.push(
      <div
        key={r}
        className="flex justify-center"
        style={{ gap: '14px', marginTop: r === 0 ? 0 : '10px' }}
        data-peg-row={r}
      >
        {pegs}
      </div>,
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-[600px]" data-plinko-board>
      <div className="p-4">{rows}</div>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Write Board.test.tsx**

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Board from './Board';
import { ROW_COUNT } from './logic';

describe('Board', () => {
  it('renders ROW_COUNT peg rows', () => {
    const { container } = render(<Board />);
    expect(container.querySelectorAll('[data-peg-row]')).toHaveLength(ROW_COUNT);
  });

  it('row 0 has 3 pegs, row 19 has 22 pegs', () => {
    const { container } = render(<Board />);
    const row0 = container.querySelector('[data-peg-row="0"]')!;
    const row19 = container.querySelector('[data-peg-row="19"]')!;
    expect(row0.querySelectorAll('[data-peg]')).toHaveLength(3);
    expect(row19.querySelectorAll('[data-peg]')).toHaveLength(22);
  });

  it('renders children inside the board', () => {
    const { container } = render(
      <Board>
        <div data-test-child>hello</div>
      </Board>,
    );
    expect(container.querySelector('[data-test-child]')).not.toBeNull();
  });
});
```

- [ ] **Step 4: Run**

```bash
pnpm exec vitest run src/games/plinko/Board.test.tsx 2>&1 | tail -10
```

Expected: 3 passed.

### Task C.2: Create BinRow.tsx

**Files:**

- Create: `src/games/plinko/BinRow.tsx`
- Create: `src/games/plinko/BinRow.test.tsx`

- [ ] **Step 1: Write BinRow.tsx**

```typescript
import type { JSX } from 'react';
import type { Risk } from './logic';
import { MULTIPLIER_CURVES } from './logic';

interface Props {
  risk: Risk;
  flashedBinIdx?: number | null;
}

/** Returns a Tailwind class string for a bin based on its multiplier value. */
function binColor(multi: number): string {
  if (multi >= 100) return 'bg-casino-red text-white border-casino-red';
  if (multi >= 5) return 'bg-gold text-felt-deep border-gold';
  if (multi >= 1) return 'bg-neon-cyan text-felt-deep border-neon-cyan';
  if (multi >= 0.5) return 'bg-white/10 text-white/70 border-white/20';
  return 'bg-casino-red-deep text-white/70 border-casino-red-deep';
}

export default function BinRow({ risk, flashedBinIdx = null }: Props): JSX.Element {
  const curve = MULTIPLIER_CURVES[risk];
  return (
    <div className="flex justify-center gap-1 mt-2" data-bin-row>
      {curve.map((multi, idx) => {
        const flash = flashedBinIdx === idx;
        return (
          <div
            key={idx}
            className={`flex-1 min-w-0 max-w-[42px] py-1 px-0.5 rounded-sm border text-[9px] tabular-nums text-center font-display ${binColor(multi)} ${flash ? 'ring-2 ring-gold animate-pulse' : ''}`}
            data-bin
            data-bin-idx={idx}
            data-flash={flash ? 'true' : 'false'}
          >
            {multi >= 1 ? `${multi}x` : `${multi}x`}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Write BinRow.test.tsx**

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import BinRow from './BinRow';
import { BIN_COUNT, MULTIPLIER_CURVES } from './logic';

describe('BinRow', () => {
  it('renders BIN_COUNT bins', () => {
    const { container } = render(<BinRow risk="low" />);
    expect(container.querySelectorAll('[data-bin]')).toHaveLength(BIN_COUNT);
  });

  it('uses multipliers from MULTIPLIER_CURVES for selected risk', () => {
    const { container } = render(<BinRow risk="high" />);
    const bins = container.querySelectorAll('[data-bin]');
    expect(bins[0]!.textContent).toContain(`${MULTIPLIER_CURVES.high[0]}x`);
    expect(bins[10]!.textContent).toContain(`${MULTIPLIER_CURVES.high[10]}x`);
  });

  it('flashedBinIdx adds data-flash="true" to the matching bin', () => {
    const { container } = render(<BinRow risk="medium" flashedBinIdx={5} />);
    const flashed = container.querySelectorAll('[data-flash="true"]');
    expect(flashed).toHaveLength(1);
    expect(flashed[0]!.getAttribute('data-bin-idx')).toBe('5');
  });

  it('no flash when flashedBinIdx is null', () => {
    const { container } = render(<BinRow risk="medium" flashedBinIdx={null} />);
    expect(container.querySelectorAll('[data-flash="true"]')).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run**

```bash
pnpm exec vitest run src/games/plinko/BinRow.test.tsx 2>&1 | tail -10
```

Expected: 4 passed.

### Task C.3: Create FallingBall.tsx

**Files:**

- Create: `src/games/plinko/FallingBall.tsx`
- Create: `src/games/plinko/FallingBall.test.tsx`

- [ ] **Step 1: Write FallingBall.tsx**

```typescript
import type { JSX } from 'react';
import { useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ROW_COUNT } from './logic';

interface Props {
  path: ('L' | 'R')[];
  bin: number;
  /** Called once after the ball "lands" (animation complete OR reduced-motion shortcut). */
  onLanded: () => void;
}

const ROW_DURATION_MS = 75;

/** Animates a ball down ROW_COUNT rows along `path`. At each row, the ball
 *  translates a constant horizontal step (left or right) and one row's height
 *  down. We use percent units so it scales with the Board's width. */
export default function FallingBall({ path, bin, onLanded }: Props): JSX.Element | null {
  const reduceMotion = useReducedMotion();

  // Build per-row x positions in percent (0-100). Centre column at top = 50%.
  // Each row, the ball moves ±2% horizontally.
  const xKeyframes = useMemo(() => {
    const xs: number[] = [50];
    let x = 50;
    for (let r = 0; r < ROW_COUNT; r += 1) {
      x += path[r] === 'R' ? 2 : -2;
      xs.push(x);
    }
    return xs;
  }, [path]);

  const yKeyframes = useMemo(() => {
    const ys: number[] = [0];
    for (let r = 0; r < ROW_COUNT; r += 1) {
      ys.push(((r + 1) / ROW_COUNT) * 90); // 0 → 90% of board height
    }
    return ys;
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      onLanded();
    }
    // Animation onComplete handles the non-reduced case.
  }, [reduceMotion, onLanded]);

  if (reduceMotion) return null;

  return (
    <motion.div
      className="absolute w-2.5 h-2.5 rounded-full pointer-events-none"
      style={{
        background: 'radial-gradient(circle at 30% 30%, #fff, #ff60ff)',
        boxShadow: '0 0 6px rgba(255, 96, 255, 0.7)',
        top: 0,
        left: 0,
        translateX: '-50%',
        translateY: '-50%',
      }}
      initial={{ left: `${xKeyframes[0]}%`, top: `${yKeyframes[0]}%` }}
      animate={{
        left: xKeyframes.slice(1).map((x) => `${x}%`),
        top: yKeyframes.slice(1).map((y) => `${y}%`),
      }}
      transition={{
        duration: (ROW_COUNT * ROW_DURATION_MS) / 1000,
        ease: 'easeIn',
        times: Array.from({ length: ROW_COUNT }, (_, i) => i / (ROW_COUNT - 1)),
      }}
      onAnimationComplete={onLanded}
      data-falling-ball
      data-bin={bin}
    />
  );
}
```

- [ ] **Step 2: Write FallingBall.test.tsx**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import FallingBall from './FallingBall';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    useReducedMotion: () => true,
  };
});

describe('FallingBall (reduced-motion shortcut)', () => {
  it('with reduced motion: calls onLanded synchronously on mount', async () => {
    const onLanded = vi.fn();
    const path: ('L' | 'R')[] = Array(20).fill('L');
    render(<FallingBall path={path} bin={0} onLanded={onLanded} />);
    await waitFor(() => expect(onLanded).toHaveBeenCalled());
  });

  it('with reduced motion: renders null (no ball element)', () => {
    const onLanded = vi.fn();
    const path: ('L' | 'R')[] = Array(20).fill('R');
    const { container } = render(<FallingBall path={path} bin={20} onLanded={onLanded} />);
    expect(container.querySelector('[data-falling-ball]')).toBeNull();
  });
});
```

- [ ] **Step 3: Run**

```bash
pnpm exec vitest run src/games/plinko/FallingBall.test.tsx 2>&1 | tail -10
```

Expected: 2 passed.

### Task C.4: Create HistoryStrip.tsx

**Files:**

- Create: `src/games/plinko/HistoryStrip.tsx`
- Create: `src/games/plinko/HistoryStrip.test.tsx`

- [ ] **Step 1: Write HistoryStrip.tsx**

```typescript
import type { JSX } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { HistoryEntry } from './machine';

interface Props {
  history: HistoryEntry[];
}

function pillColor(multi: number): string {
  if (multi >= 100) return 'bg-casino-red text-white';
  if (multi >= 5) return 'bg-gold text-felt-deep';
  if (multi >= 1) return 'bg-neon-cyan text-felt-deep';
  if (multi >= 0.5) return 'bg-white/10 text-white/70';
  return 'bg-casino-red-deep text-white/70';
}

export default function HistoryStrip({ history }: Props): JSX.Element {
  const last5 = history.slice(0, 5);
  return (
    <div className="flex flex-col gap-1.5" data-history-strip>
      <div className="text-[9px] text-white/40 uppercase tracking-wider">History</div>
      <AnimatePresence initial={false}>
        {last5.map((entry) => (
          <motion.div
            key={entry.ballId}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={`rounded-md px-2 py-1 text-[10px] font-display tabular-nums ${pillColor(entry.multiplier)}`}
            data-history-pill
          >
            {entry.multiplier}x{' '}
            <span className="opacity-75">
              {entry.payout >= entry.bet ? `+${entry.payout - entry.bet}` : `−${entry.bet - entry.payout}`}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Write HistoryStrip.test.tsx**

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import HistoryStrip from './HistoryStrip';
import type { HistoryEntry } from './machine';

function entry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    ballId: overrides.ballId ?? 'b1',
    risk: 'low',
    bin: overrides.bin ?? 10,
    multiplier: overrides.multiplier ?? 0.3,
    bet: overrides.bet ?? 100,
    payout: overrides.payout ?? 30,
  };
}

describe('HistoryStrip', () => {
  it('renders the History label when empty', () => {
    const { container } = render(<HistoryStrip history={[]} />);
    expect(container.querySelector('[data-history-strip]')!.textContent).toContain('History');
    expect(container.querySelectorAll('[data-history-pill]')).toHaveLength(0);
  });

  it('renders last 5 entries (rolling, history newest-first)', () => {
    const hist = [
      entry({ ballId: 'b1', multiplier: 1.5 }),
      entry({ ballId: 'b2', multiplier: 0.3 }),
      entry({ ballId: 'b3', multiplier: 100 }),
      entry({ ballId: 'b4', multiplier: 0.5 }),
      entry({ ballId: 'b5', multiplier: 16 }),
      entry({ ballId: 'b6', multiplier: 0.3 }),
    ];
    const { container } = render(<HistoryStrip history={hist} />);
    expect(container.querySelectorAll('[data-history-pill]')).toHaveLength(5);
  });
});
```

- [ ] **Step 3: Run**

```bash
pnpm exec vitest run src/games/plinko/HistoryStrip.test.tsx 2>&1 | tail -10
```

Expected: 2 passed.

### Task C.5: Create AutoDropControls.tsx

**Files:**

- Create: `src/games/plinko/AutoDropControls.tsx`
- Create: `src/games/plinko/AutoDropControls.test.tsx`

- [ ] **Step 1: Write AutoDropControls.tsx**

```typescript
import type { JSX } from 'react';

interface Props {
  ballsSpawned: number;
  ballsRequested: number;
  onStop: () => void;
}

export default function AutoDropControls({ ballsSpawned, ballsRequested, onStop }: Props): JSX.Element {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-felt-deep/70 rounded-md border border-gold/20" data-auto-controls>
      <span className="text-[10px] text-white/70 font-display tabular-nums">
        Auto: {ballsSpawned} / {ballsRequested} balls
      </span>
      <div className="flex-1 h-1.5 bg-white/10 rounded overflow-hidden">
        <div
          className="h-full bg-gold"
          style={{ width: `${ballsRequested === 0 ? 0 : (ballsSpawned / ballsRequested) * 100}%` }}
        />
      </div>
      <button
        type="button"
        onClick={onStop}
        className="px-3 py-1 rounded-md bg-casino-red text-white text-[11px] font-display tracking-wider border border-casino-red hover:opacity-80"
        data-auto-stop
      >
        ■ STOP AUTO
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Write AutoDropControls.test.tsx**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AutoDropControls from './AutoDropControls';

describe('AutoDropControls', () => {
  it('shows progress text', () => {
    render(<AutoDropControls ballsSpawned={3} ballsRequested={10} onStop={vi.fn()} />);
    expect(screen.getByText(/3 \/ 10 balls/)).toBeInTheDocument();
  });

  it('clicking STOP fires onStop', async () => {
    const onStop = vi.fn();
    render(<AutoDropControls ballsSpawned={1} ballsRequested={5} onStop={onStop} />);
    await userEvent.click(screen.getByRole('button', { name: /STOP AUTO/ }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Run**

```bash
pnpm exec vitest run src/games/plinko/AutoDropControls.test.tsx 2>&1 | tail -10
```

Expected: 2 passed.

### Task C.6: Create SetupPanel.tsx

**Files:**

- Create: `src/games/plinko/SetupPanel.tsx`
- Create: `src/games/plinko/SetupPanel.test.tsx`

- [ ] **Step 1: Write SetupPanel.tsx**

```typescript
import type { JSX } from 'react';
import {
  BET_MIN,
  BET_MAX,
  AUTO_BALLS_MIN,
  AUTO_BALLS_MAX,
  AUTO_INTERVAL_MS,
  type AutoIntervalKey,
  type Risk,
} from './logic';
import BinRow from './BinRow';

interface Props {
  risk: Risk;
  bet: number;
  mode: 'manual' | 'auto';
  autoBalls: number;
  autoInterval: AutoIntervalKey;
  balance: number;
  onRiskChange: (r: Risk) => void;
  onBetChange: (n: number) => void;
  onModeChange: (m: 'manual' | 'auto') => void;
  onAutoBallsChange: (n: number) => void;
  onAutoIntervalChange: (k: AutoIntervalKey) => void;
  onDrop: () => void;
  onStartAuto: () => void;
}

const RISK_LABELS: Record<Risk, string> = {
  safe: 'SAFE',
  low: 'LOW',
  medium: 'MED',
  high: 'HIGH',
};

const INTERVAL_LABELS: Record<AutoIntervalKey, string> = {
  slow: 'SLOW',
  normal: 'NORM',
  fast: 'FAST',
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export default function SetupPanel({
  risk, bet, mode, autoBalls, autoInterval, balance,
  onRiskChange, onBetChange, onModeChange, onAutoBallsChange, onAutoIntervalChange,
  onDrop, onStartAuto,
}: Props): JSX.Element {
  const canAffordOne = balance >= bet;
  const autoTotal = bet * autoBalls;

  return (
    <div className="flex flex-col gap-4 rounded border border-gold/30 bg-felt-deep p-6 max-w-2xl mx-auto" data-setup-panel>
      <h2 className="font-display text-base tracking-wider text-gold-bright">🔻 PLINKO</h2>

      <section>
        <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">RISK</h3>
        <div role="radiogroup" aria-label="Risk level" className="flex gap-2">
          {(['safe', 'low', 'medium', 'high'] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={risk === r}
              onClick={() => onRiskChange(r)}
              className={[
                'flex-1 rounded-md border px-3 py-2 text-xs font-display tracking-wider',
                risk === r
                  ? 'border-gold bg-gold text-felt-deep'
                  : 'border-white/30 bg-felt-deep text-white/70 hover:border-gold',
              ].join(' ')}
            >
              {RISK_LABELS[r]}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">BIN PREVIEW</h3>
        <BinRow risk={risk} />
      </section>

      <section>
        <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">BET PER BALL</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={BET_MIN}
            max={BET_MAX}
            value={bet}
            onChange={(e) => onBetChange(clamp(parseInt(e.target.value, 10) || BET_MIN, BET_MIN, BET_MAX))}
            className="w-24 rounded-md border border-white/30 bg-felt-deep px-2 py-1 text-sm text-white tabular-nums"
            data-bet-input
          />
          <button type="button" onClick={() => onBetChange(clamp(bet + 10, BET_MIN, BET_MAX))} className="px-2 py-1 text-[11px] rounded border border-white/20 text-white/70 hover:border-gold">+10</button>
          <button type="button" onClick={() => onBetChange(clamp(bet + 100, BET_MIN, BET_MAX))} className="px-2 py-1 text-[11px] rounded border border-white/20 text-white/70 hover:border-gold">+100</button>
          <button type="button" onClick={() => onBetChange(clamp(bet * 2, BET_MIN, BET_MAX))} className="px-2 py-1 text-[11px] rounded border border-white/20 text-white/70 hover:border-gold">×2</button>
          <button type="button" onClick={() => onBetChange(BET_MAX)} className="px-2 py-1 text-[11px] rounded border border-white/20 text-white/70 hover:border-gold">MAX</button>
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">MODE</h3>
        <div role="radiogroup" aria-label="Drop mode" className="flex gap-2">
          {(['manual', 'auto'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => onModeChange(m)}
              className={[
                'flex-1 rounded-md border px-3 py-2 text-xs font-display tracking-wider',
                mode === m
                  ? 'border-gold bg-gold text-felt-deep'
                  : 'border-white/30 bg-felt-deep text-white/70 hover:border-gold',
              ].join(' ')}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      {mode === 'auto' && (
        <section className="grid grid-cols-2 gap-3">
          <div>
            <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">BALLS</h3>
            <input
              type="number"
              min={AUTO_BALLS_MIN}
              max={AUTO_BALLS_MAX}
              value={autoBalls}
              onChange={(e) => onAutoBallsChange(clamp(parseInt(e.target.value, 10) || AUTO_BALLS_MIN, AUTO_BALLS_MIN, AUTO_BALLS_MAX))}
              className="w-full rounded-md border border-white/30 bg-felt-deep px-2 py-1 text-sm text-white tabular-nums"
              data-auto-balls-input
            />
          </div>
          <div>
            <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">INTERVAL</h3>
            <div role="radiogroup" aria-label="Auto interval" className="flex gap-1">
              {(['slow', 'normal', 'fast'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={autoInterval === k}
                  onClick={() => onAutoIntervalChange(k)}
                  className={[
                    'flex-1 rounded-md border px-2 py-1 text-[10px] font-display',
                    autoInterval === k ? 'border-gold bg-gold text-felt-deep' : 'border-white/30 text-white/70 hover:border-gold',
                  ].join(' ')}
                >
                  {INTERVAL_LABELS[k]}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="flex items-center justify-between text-xs">
        <span className="text-white/60">Balance</span>
        <span className="font-display tabular-nums text-white">{balance.toLocaleString()}</span>
      </section>

      {mode === 'manual' ? (
        <button
          type="button"
          onClick={onDrop}
          disabled={!canAffordOne}
          className="mt-2 w-full rounded-md border-2 border-gold bg-casino-red py-3 font-display text-sm tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-40"
          data-drop-button
        >
          DROP ({bet})
        </button>
      ) : (
        <button
          type="button"
          onClick={onStartAuto}
          disabled={!canAffordOne}
          className="mt-2 w-full rounded-md border-2 border-gold bg-casino-red py-3 font-display text-sm tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-40"
          data-start-auto-button
        >
          START AUTO ({autoBalls} × {bet} = {autoTotal.toLocaleString()})
        </button>
      )}
      {!canAffordOne && (
        <p className="text-center text-[10px] text-casino-red">
          Need {bet.toLocaleString()} chips
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write SetupPanel.test.tsx**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SetupPanel from './SetupPanel';

const defaultProps = {
  risk: 'low' as const,
  bet: 50,
  mode: 'manual' as const,
  autoBalls: 10,
  autoInterval: 'normal' as const,
  balance: 5000,
  onRiskChange: vi.fn(),
  onBetChange: vi.fn(),
  onModeChange: vi.fn(),
  onAutoBallsChange: vi.fn(),
  onAutoIntervalChange: vi.fn(),
  onDrop: vi.fn(),
  onStartAuto: vi.fn(),
};

describe('SetupPanel', () => {
  it('manual mode shows DROP button with bet amount', () => {
    render(<SetupPanel {...defaultProps} bet={75} mode="manual" />);
    expect(screen.getByRole('button', { name: /DROP \(75\)/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /START AUTO/ })).toBeNull();
  });

  it('auto mode shows START AUTO with total commit', () => {
    render(<SetupPanel {...defaultProps} mode="auto" bet={50} autoBalls={10} />);
    expect(screen.getByRole('button', { name: /START AUTO \(10 × 50/ })).toBeInTheDocument();
  });

  it('auto mode reveals balls input + interval picker', () => {
    render(<SetupPanel {...defaultProps} mode="auto" />);
    expect(screen.getByLabelText(/Auto interval/i)).toBeInTheDocument();
  });

  it('DROP disabled when balance < bet', () => {
    render(<SetupPanel {...defaultProps} balance={5} bet={50} />);
    expect(screen.getByRole('button', { name: /DROP/ })).toBeDisabled();
  });

  it('clicking risk pill fires onRiskChange', async () => {
    const onRiskChange = vi.fn();
    render(<SetupPanel {...defaultProps} onRiskChange={onRiskChange} />);
    await userEvent.click(screen.getByRole('radio', { name: /HIGH/ }));
    expect(onRiskChange).toHaveBeenCalledWith('high');
  });

  it('bet input clamps to [10, 5000]', async () => {
    const onBetChange = vi.fn();
    render(<SetupPanel {...defaultProps} onBetChange={onBetChange} />);
    const input = screen.getByDisplayValue('50');
    await userEvent.clear(input);
    await userEvent.type(input, '99999');
    expect(onBetChange).toHaveBeenLastCalledWith(5000);
  });
});
```

- [ ] **Step 3: Run**

```bash
pnpm exec vitest run src/games/plinko/SetupPanel.test.tsx 2>&1 | tail -10
```

Expected: 6 passed.

### Task C.7: Create EndScreen.tsx

**Files:**

- Create: `src/games/plinko/EndScreen.tsx`
- Create: `src/games/plinko/EndScreen.test.tsx`

- [ ] **Step 1: Write EndScreen.tsx**

```typescript
import type { JSX } from 'react';
import { Link } from 'react-router';
import type { AutoStopReason, HistoryEntry } from './machine';

interface Props {
  reason: AutoStopReason;
  entries: HistoryEntry[]; // only the entries from this session
  onPlayMore: () => void;
}

function reasonLabel(r: AutoStopReason): string {
  if (r === 'completed') return 'AUTO SESSION COMPLETE';
  if (r === 'user-stop') return 'AUTO STOPPED';
  return 'AUTO STOPPED — INSUFFICIENT CHIPS';
}

export default function EndScreen({ reason, entries, onPlayMore }: Props): JSX.Element {
  const balls = entries.length;
  const totalStake = entries.reduce((s, e) => s + e.bet, 0);
  const totalPayout = entries.reduce((s, e) => s + e.payout, 0);
  const net = totalPayout - totalStake;
  const biggest = entries.reduce(
    (best, e) => (e.payout > best.payout ? e : best),
    { payout: 0, bin: -1, multiplier: 0 } as { payout: number; bin: number; multiplier: number },
  );

  return (
    <div className="flex flex-col items-center gap-4 rounded border border-gold/30 bg-felt-deep p-6 max-w-md mx-auto" data-end-screen>
      <h2 className="font-display text-xl tracking-wider text-gold-bright">{reasonLabel(reason)}</h2>

      <div className="w-full grid grid-cols-2 gap-2 text-xs">
        <div className="flex justify-between"><span className="text-white/60">Balls</span><span className="tabular-nums text-white">{balls}</span></div>
        <div className="flex justify-between"><span className="text-white/60">Stake</span><span className="tabular-nums text-white">−{totalStake.toLocaleString()}</span></div>
        <div className="flex justify-between"><span className="text-white/60">Payout</span><span className="tabular-nums text-gold-bright">+{totalPayout.toLocaleString()}</span></div>
        <div className="flex justify-between font-display">
          <span>Net</span>
          <span className={`tabular-nums ${net >= 0 ? 'text-gold-bright' : 'text-casino-red'}`}>
            {net >= 0 ? '+' : ''}{net.toLocaleString()}
          </span>
        </div>
        {biggest.bin >= 0 && (
          <div className="col-span-2 flex justify-between border-t border-white/10 pt-2">
            <span className="text-white/60">Biggest win</span>
            <span className="tabular-nums text-gold-bright">{biggest.multiplier}x → +{biggest.payout.toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 w-full max-w-xs">
        <button
          type="button"
          onClick={onPlayMore}
          className="w-full rounded-md border-2 border-gold bg-casino-red py-2 font-display text-sm tracking-wider text-white"
          data-play-more
        >
          DROP MORE
        </button>
        <Link
          to="/lobby"
          className="w-full text-center rounded-md border border-white/20 bg-felt-deep py-2 text-xs text-white/60 hover:border-white/60"
        >
          BACK TO LOBBY
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write EndScreen.test.tsx**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import EndScreen from './EndScreen';
import type { HistoryEntry } from './machine';

function e(bet: number, payout: number, multiplier: number, bin = 10, ballId = `b-${Math.random()}`): HistoryEntry {
  return { ballId, risk: 'low', bin, multiplier, bet, payout };
}

describe('EndScreen', () => {
  it('completed shows correct label + DROP MORE / BACK TO LOBBY', () => {
    render(
      <MemoryRouter>
        <EndScreen reason="completed" entries={[e(50, 75, 1.5)]} onPlayMore={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/AUTO SESSION COMPLETE/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /DROP MORE/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /BACK TO LOBBY/ })).toBeInTheDocument();
  });

  it('insufficient-chips shows the right label', () => {
    render(
      <MemoryRouter>
        <EndScreen reason="insufficient-chips" entries={[]} onPlayMore={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/INSUFFICIENT CHIPS/)).toBeInTheDocument();
  });

  it('aggregates stake, payout, net correctly', () => {
    render(
      <MemoryRouter>
        <EndScreen
          reason="completed"
          entries={[e(50, 100, 2), e(50, 0, 0), e(50, 75, 1.5)]}
          onPlayMore={vi.fn()}
        />
      </MemoryRouter>,
    );
    // Stake: 150, Payout: 175, Net: +25
    expect(screen.getByText(/Balls/).parentElement!.textContent).toContain('3');
    expect(screen.getByText('−150')).toBeInTheDocument();
    expect(screen.getByText('+175')).toBeInTheDocument();
    expect(screen.getByText('+25')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run**

```bash
pnpm exec vitest run src/games/plinko/EndScreen.test.tsx 2>&1 | tail -10
```

Expected: 3 passed.

### Task C.8: Rebuild PlinkoPage.tsx with full wallet bridge + auto scheduler

**Files:**

- Modify: `src/games/plinko/PlinkoPage.tsx` (replace placeholder)
- Create: `src/games/plinko/PlinkoPage.test.tsx`

- [ ] **Step 1: Replace PlinkoPage with the full implementation**

Write `src/games/plinko/PlinkoPage.tsx`:

```typescript
import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMachine } from '@xstate/react';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance } from '@/store/walletStore';
import { useGameRound } from '@/games/_shared/useGameRound';
import {
  AUTO_BALLS_MIN,
  AUTO_BALLS_MAX,
  AUTO_INTERVAL_MS,
  BET_MAX,
  BET_MIN,
  MULTIPLIER_CURVES,
  dropBall,
  payoutFor,
  type AutoIntervalKey,
  type Risk,
  _mulberry32,
} from './logic';
import { plinkoMachine } from './machine';
import SetupPanel from './SetupPanel';
import Board from './Board';
import FallingBall from './FallingBall';
import BinRow from './BinRow';
import HistoryStrip from './HistoryStrip';
import AutoDropControls from './AutoDropControls';
import EndScreen from './EndScreen';

export default function PlinkoPage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance() ?? 0;
  const { placeBet, settle } = useGameRound('plinko');
  const [snapshot, send] = useMachine(plinkoMachine);

  // Setup panel local state
  const [pendingRisk, setPendingRisk] = useState<Risk>('low');
  const [pendingBet, setPendingBet] = useState<number>(50);
  const [pendingMode, setPendingMode] = useState<'manual' | 'auto'>('manual');
  const [pendingAutoBalls, setPendingAutoBalls] = useState<number>(10);
  const [pendingAutoInterval, setPendingAutoInterval] = useState<AutoIntervalKey>('normal');

  // For session entries shown in EndScreen — sliced from history by sessionId.
  const sessionEntries = useMemo(
    () => snapshot.context.history.filter((h) => snapshot.context.history.indexOf(h) < snapshot.context.autoBallsSpawned),
    // We can't filter by sessionId on history because HistoryEntry doesn't carry it.
    // Simpler approach: keep the last N entries matching `autoBallsSpawned`.
    [snapshot.context.history, snapshot.context.autoBallsSpawned],
  );

  // Flashed bin for current ball landing (drives BinRow pulse).
  const [flashedBinIdx, setFlashedBinIdx] = useState<number | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerFlash = useCallback((bin: number) => {
    setFlashedBinIdx(bin);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setFlashedBinIdx(null), 600);
  }, []);

  useEffect(() => () => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
  }, []);

  // Stable RNG instance per page mount.
  const rngRef = useRef<() => number>(() => 0);
  if (rngRef.current === undefined) rngRef.current = () => 0;
  useEffect(() => {
    rngRef.current = _mulberry32((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
  }, []);

  // Manual drop handler.
  const handleManualDrop = useCallback(async () => {
    if (!user) return;
    const result = await placeBet(pendingBet, { min: BET_MIN, max: BET_MAX });
    if (!result.ok) return;
    const { path, bin } = dropBall(rngRef.current);
    const multiplier = MULTIPLIER_CURVES[pendingRisk][bin]!;
    const payout = payoutFor(pendingRisk, bin, pendingBet);
    const ballId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    send({
      type: 'DROP_MANUAL',
      bet: pendingBet,
      risk: pendingRisk,
      betHandleId: result.handle.betId,
      path,
      bin,
      multiplier,
      payout,
      ballId,
      sessionId,
    });
  }, [user, placeBet, pendingBet, pendingRisk, send]);

  // Start-auto handler.
  const handleStartAuto = useCallback(() => {
    const sessionId = crypto.randomUUID();
    send({
      type: 'START_AUTO',
      bet: pendingBet,
      risk: pendingRisk,
      ballsRequested: pendingAutoBalls,
      intervalMs: AUTO_INTERVAL_MS[pendingAutoInterval],
      sessionId,
    });
  }, [pendingBet, pendingRisk, pendingAutoBalls, pendingAutoInterval, send]);

  // Auto scheduler — runs while in playing-auto, spawns balls on interval.
  useEffect(() => {
    if (!snapshot.matches('playing-auto')) return;
    if (snapshot.context.autoBallsSpawned >= snapshot.context.autoBallsRequested) return;
    if (!user) return;

    const t = setTimeout(async () => {
      if (balance < snapshot.context.bet) {
        send({ type: 'AUTO_STOP', reason: 'insufficient-chips' });
        return;
      }
      const result = await placeBet(snapshot.context.bet, { min: BET_MIN, max: BET_MAX });
      if (!result.ok) {
        send({ type: 'AUTO_STOP', reason: 'insufficient-chips' });
        return;
      }
      const { path, bin } = dropBall(rngRef.current);
      const multiplier = MULTIPLIER_CURVES[snapshot.context.risk][bin]!;
      const payout = payoutFor(snapshot.context.risk, bin, snapshot.context.bet);
      const ballId = crypto.randomUUID();
      send({
        type: 'AUTO_TICK',
        betHandleId: result.handle.betId,
        path,
        bin,
        multiplier,
        payout,
        ballId,
      });
    }, snapshot.context.autoIntervalMs);

    return () => clearTimeout(t);
  }, [snapshot, balance, user, placeBet, send]);

  // Ball-landed callback: settle wallet, send BALL_LANDED, trigger BinRow flash.
  const handleBallLanded = useCallback(
    async (ballId: string) => {
      const ball = snapshot.context.inFlightBalls.find((b) => b.ballId === ballId);
      if (!ball || !user) return;
      triggerFlash(ball.bin);
      const won = ball.payout > ball.bet;
      const outcome = ball.payout > ball.bet ? 'win' : ball.payout === ball.bet ? 'push' : 'loss';
      await settle(
        {
          betId: ball.betHandleId,
          userId: user.id,
          game: 'plinko',
          amount: ball.bet,
          placedAt: ball.spawnedAt,
        },
        {
          outcome,
          betAmount: ball.bet,
          payout: ball.payout,
          netChange: ball.payout - ball.bet,
          details: {
            risk: ball.risk,
            bin: ball.bin,
            multiplier: ball.multiplier,
            sessionId: snapshot.context.sessionId,
          },
        },
      );
      send({ type: 'BALL_LANDED', ballId });
      void won;
    },
    [snapshot, user, settle, send, triggerFlash],
  );

  // Show EndScreen when auto session has ended (idle + autoStopReason set).
  const showEndScreen = snapshot.matches('idle') && snapshot.context.autoStopReason !== null;

  // Show SetupPanel when truly idle (no in-flight balls, no recent session).
  const showSetup =
    snapshot.matches('idle') &&
    snapshot.context.inFlightBalls.length === 0 &&
    snapshot.context.history.length === 0 &&
    snapshot.context.autoStopReason === null;

  if (!user) return null;

  void sessionEntries; // suppress unused for now if needed

  return (
    <div className="flex min-h-screen bg-felt-deep text-white">
      <main className="flex-1 overflow-auto p-6">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-base tracking-wider text-gold-bright">
            🔻 PLINKO{snapshot.context.mode === 'auto' && snapshot.matches('playing-auto') ? ` — ${snapshot.context.risk.toUpperCase()}` : ''}
          </h1>
          <span className="font-display text-xs text-white/60">
            Balance: <span className="text-gold-bright tabular-nums">{balance.toLocaleString()}</span>
          </span>
        </header>

        {showSetup && (
          <SetupPanel
            risk={pendingRisk}
            bet={pendingBet}
            mode={pendingMode}
            autoBalls={pendingAutoBalls}
            autoInterval={pendingAutoInterval}
            balance={balance}
            onRiskChange={setPendingRisk}
            onBetChange={setPendingBet}
            onModeChange={setPendingMode}
            onAutoBallsChange={setPendingAutoBalls}
            onAutoIntervalChange={setPendingAutoInterval}
            onDrop={() => void handleManualDrop()}
            onStartAuto={handleStartAuto}
          />
        )}

        {!showSetup && !showEndScreen && (
          <div className="flex gap-4">
            <div className="flex-1">
              <Board>
                {snapshot.context.inFlightBalls.map((ball) => (
                  <FallingBall
                    key={ball.ballId}
                    path={ball.path}
                    bin={ball.bin}
                    onLanded={() => void handleBallLanded(ball.ballId)}
                  />
                ))}
              </Board>
              <BinRow risk={snapshot.context.risk || pendingRisk} flashedBinIdx={flashedBinIdx} />

              {snapshot.matches('playing-auto') && (
                <div className="mt-4">
                  <AutoDropControls
                    ballsSpawned={snapshot.context.autoBallsSpawned}
                    ballsRequested={snapshot.context.autoBallsRequested}
                    onStop={() => send({ type: 'AUTO_STOP', reason: 'user-stop' })}
                  />
                </div>
              )}

              {snapshot.matches('idle') && snapshot.context.inFlightBalls.length === 0 && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => send({ type: 'RESET' })}
                    className="px-4 py-2 rounded-md border border-gold/40 bg-felt-deep text-gold-bright text-xs hover:border-gold"
                  >
                    BACK TO SETUP
                  </button>
                </div>
              )}
            </div>
            <div className="w-32">
              <HistoryStrip history={snapshot.context.history} />
            </div>
          </div>
        )}

        {showEndScreen && (
          <EndScreen
            reason={snapshot.context.autoStopReason!}
            entries={snapshot.context.history.slice(0, snapshot.context.autoBallsSpawned)}
            onPlayMore={() => send({ type: 'RESET' })}
          />
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Write PlinkoPage.test.tsx**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import PlinkoPage from './PlinkoPage';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';
import { db } from '@/db';
import 'fake-indexeddb/auto';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return { ...actual, useReducedMotion: () => true };
});

async function setupUser() {
  const user = { id: 'u-plinko', username: 'p' };
  await db.balances.put({ userId: user.id, chips: 5000, updatedAt: Date.now() });
  useSessionStore.setState({ currentUser: user as unknown as { id: string; username: string } });
  await useWalletStore.getState().hydrate(user.id);
  return user;
}

describe('PlinkoPage', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useSessionStore.setState({ currentUser: null });
  });

  it('renders setup when no user logged in: nothing (returns null)', () => {
    const { container } = render(<MemoryRouter><PlinkoPage /></MemoryRouter>);
    expect(container.firstChild).toBeNull();
  });

  it('renders setup panel with default low risk', async () => {
    await setupUser();
    render(<MemoryRouter><PlinkoPage /></MemoryRouter>);
    expect(screen.getByText(/🔻 PLINKO/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /LOW/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('clicking DROP places a bet and writes a rounds row', async () => {
    await setupUser();
    render(<MemoryRouter><PlinkoPage /></MemoryRouter>);
    const drop = screen.getByRole('button', { name: /DROP \(50\)/ });
    await userEvent.click(drop);
    await waitFor(async () => {
      const rounds = await db.rounds.where({ game: 'plinko' }).toArray();
      expect(rounds.length).toBeGreaterThanOrEqual(1);
      expect(rounds[0]!.amount).toBe(50);
    });
  });

  it('switching to auto reveals balls + interval pickers', async () => {
    await setupUser();
    render(<MemoryRouter><PlinkoPage /></MemoryRouter>);
    await userEvent.click(screen.getByRole('radio', { name: /AUTO/ }));
    expect(screen.getByLabelText(/Auto interval/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run e2e tests**

```bash
pnpm exec vitest run src/games/plinko/PlinkoPage.test.tsx 2>&1 | tail -10
```

Expected: 4 passed.

### Task C.9: Full DoD + manual smoke + commit PR C

- [ ] **Step 1: Full DoD**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: All four green.

- [ ] **Step 2: Manual smoke (browser)**

```bash
pnpm dev
```

In the browser:

1. Log in.
2. Navigate directly to `/play/plinko` (sidebar entry comes in PR D).
3. Default risk = Low, bet = 50. Click DROP. Ball drops, lands in a bin, balance changes.
4. Click DROP rapidly 5 times. Balls overlap in flight (max 6 concurrent).
5. Switch to AUTO mode. Set balls=5, interval=FAST. Click START AUTO. Balls rain. After 5 balls, EndScreen shows.
6. Click DROP MORE → back to setup.
7. Switch to HIGH risk. Bin row shows giant edge multipliers (5000x).
8. Set bet=5000 and verify button shows "DROP (5000)".

Stop dev server. If headless, note that in the PR description.

- [ ] **Step 3: Commit**

```bash
git add src/games/plinko/
git commit -m "$(cat <<'EOF'
feat(plinko): UI rewrite (PR C)

- Board: 20-row peg grid with FallingBall overlay slots
- FallingBall: Framer Motion keyframe animation per row + reduced-motion shortcut
- BinRow: 21 bins, colour-tiered by multiplier, pulses on hit
- HistoryStrip: rolling last-5 drops as coloured pills
- AutoDropControls: progress + STOP button
- SetupPanel: risk + bet (10-5000) + mode + auto config
- EndScreen: auto-session summary (replaces play surface)
- PlinkoPage: full wallet bridge + auto scheduler + ball lifecycle

Game playable end-to-end via direct URL. Lobby/sidebar nav in PR D.
EOF
)"
```

- [ ] **Step 4: Push + PR**

```bash
git push -u origin phase-12-plinko-pr-c
gh pr create --title "phase-12(plinko): PR C — UI rewrite (full play surface)" --body "$(cat <<'EOF'
## Summary

PR C of Phase 12 — full UI implementation.

- `Board` + `FallingBall`: 20-row peg layout, Framer Motion keyframe animation per row
- `BinRow`: 21 bins coloured by multiplier tier, pulses on hit
- `HistoryStrip`: rolling last 5 drops as pills
- `AutoDropControls`: progress + STOP
- `SetupPanel`: risk + bet (10-5000) + mode + auto config
- `EndScreen`: auto-session summary, replaces play surface (matches Bingo pattern)
- `PlinkoPage`: wallet bridge, auto scheduler `useEffect`, ball lifecycle (settle on land)

Game playable end-to-end via direct URL `/play/plinko`. **Lobby + sidebar nav still pending — PR D.**

## Test plan

- [x] DoD locally
- [ ] CI green
EOF
)"
```

Wait for CI, merge when green.

---

## PR D — Nav integration + BUILD_GUIDE + release

**Branch:** `phase-12-plinko-pr-d` (off main after PR C merged)
**Scope:** Sidebar + lobby cabinet + stats/leaderboard nav wiring + BUILD_GUIDE §10.7 + tag + GitHub Release. After merge, this session handles tag + release + memory snapshot.

### Task D.1: Branch + nav wiring

**Files:**

- Modify: `src/components/Sidebar.tsx`
- Modify: `src/pages/lobby/CabinetCarousel.tsx`
- Modify: `src/pages/stats/StatsLeftRail.tsx`
- Modify: `src/pages/stats/StatsPage.tsx`
- Modify: `src/pages/leaderboard/LeaderboardPage.tsx`
- Modify: `src/pages/stats/StatsPerGamePage.tsx`
- Modify: `src/pages/leaderboard/LeaderboardPerGamePage.tsx`

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull origin main
git checkout -b phase-12-plinko-pr-d
```

- [ ] **Step 2: Add Plinko to Sidebar GAMES**

Find the `GAMES` array in `src/components/Sidebar.tsx` (search for `Bingo`):

```bash
grep -n "Bingo\|GAMES" src/components/Sidebar.tsx
```

Add a sibling entry after Bingo:

```typescript
{ to: '/play/plinko', icon: '🔻', label: 'Plinko' },
```

- [ ] **Step 3: Add Plinko cabinet to CabinetCarousel**

Open `src/pages/lobby/CabinetCarousel.tsx`. Find the `CABINETS` array. Add after Bingo:

```typescript
{ to: '/play/plinko', icon: '🔻', label: 'PLINKO', status: 'playable' },
```

- [ ] **Step 4: Add Plinko to StatsLeftRail TABS + SLUG**

Open `src/pages/stats/StatsLeftRail.tsx`. Find TABS array, add after Bingo:

```typescript
{ icon: '🔻', label: 'Plinko' },
```

Find SLUG record, add:

```typescript
'Plinko': 'plinko',
```

- [ ] **Step 5: Add Plinko to StatsPage + LeaderboardPage TITLES**

Open `src/pages/stats/StatsPage.tsx`. Find TITLES record, add:

```typescript
plinko: 'PLINKO',
```

Same for `src/pages/leaderboard/LeaderboardPage.tsx`.

- [ ] **Step 6: Add Plinko to StatsPerGamePage + LeaderboardPerGamePage GAME_LABELS**

`src/pages/stats/StatsPerGamePage.tsx` GAME_LABELS:

```typescript
plinko: 'Plinko',
```

`src/pages/leaderboard/LeaderboardPerGamePage.tsx` GAME_LABELS:

```typescript
plinko: 'PLINKO',
```

- [ ] **Step 7: Update existing tests that count nav entries**

```bash
grep -rn "9 nav items\|10 nav items\|11 nav items" src/components/ src/pages/
```

Update any matching tests' counts (Sidebar likely had `10 nav items` after Bingo + Plinko makes 11; same for any StatsLeftRail count assertion).

Also add a new positive assertion for Plinko in `Sidebar.test.tsx` and `StatsLeftRail.test.tsx`:

```typescript
it('renders Plinko NavLink', () => {
  // render Sidebar in MemoryRouter with /play/plinko in routes...
  expect(screen.getByText('Plinko')).toBeInTheDocument();
});
```

(Adapt to actual test fixture patterns — check existing Bingo addition tests for the exact form.)

- [ ] **Step 8: Run tests**

```bash
pnpm exec vitest run src/components/Sidebar.test.tsx src/pages/lobby/ src/pages/stats/StatsLeftRail.test.tsx 2>&1 | tail -15
```

Expected: All pass.

### Task D.2: Update BUILD_GUIDE.md

**Files:**

- Modify: `BUILD_GUIDE.md`

- [ ] **Step 1: Add §10.7 Plinko**

Find the end of `## 10.6 Bingo` section. Insert before `## 11. UI / UX`:

```markdown
---

## 10.7 Plinko

Modern-casino-style Plinko. 20-row peg board, 21 bins, four risk levels.

- **Board:** fixed 20 rows of pegs; 21 bins at the bottom. Drop point centred. No player aim.
- **Risk levels:** Safe / Low / Medium / High — same board, different multiplier curves. RTP ~95-100% across all risk levels.
- **Bet:** 10–5000 chips per ball. Manual mode = 1 ball per click. Auto mode = 1-100 balls at intervals 250/500/1000 ms.
- **Math:** deterministic Binomial(20, 0.5) walk via mulberry32. Bin = sum of R-moves. Centre bin (10) most likely (~17.6%); edges (0, 20) ~1 per million.
- **Payouts:** integer floor(stake × multiplier). High-risk edge multiplier is 5000x → max single-ball win at 5000 stake = 25M chips.
- **Bonuses:** none. Each ball settles standalone — `won` if `payout > stake`.
- **Settle:** one `rounds` row per ball via `wallet.settleRound`. Each row carries `details = { risk, bin, multiplier, sessionId }`. Manual = new sessionId per click; Auto = shared sessionId across all balls in the session.
- **Animation:** Framer Motion keyframes per row (~75ms/row, ~1.5s total per ball). Multiple balls in flight simultaneously during auto. `useReducedMotion` collapses to instant placement.
- **Integration:** sidebar, lobby cabinet, /stats per-game tab, /leaderboard per-game tab all wired.

Design spec: `docs/superpowers/specs/2026-05-20-phase-12-plinko-design.md`. Implementation plan: `docs/superpowers/plans/2026-05-20-phase-12-plinko-plan.md`.
```

- [ ] **Step 2: Add Phase 12 row to §12 roadmap table**

Find the `| **11. Bingo (Competitive)** ✅ ...` row in §12. After it (before the `| **15. (Optional later)**` row), insert:

```markdown
| **12. Plinko** ✅ | Modern-casino-style Plinko. Fixed 20-row peg board / 21 bins. 4 risk levels (Safe/Low/Med/High) — same board, different multiplier curves (Safe edge 16x → High edge 5000x). Bet 10–5000 chips per ball. Manual + Auto (1–100 balls, intervals 250/500/1000 ms). Deterministic Binomial(20, 0.5) RNG; Framer Motion keyframe path animation per ball. One `rounds` row per ball via `wallet.settleRound`. ~95-100% RTP across risk levels. | Shipped 2026-05-20 — see `v0.12-plinko`. |
```

- [ ] **Step 3: Verify the markdown lints**

```bash
pnpm lint 2>&1 | tail -3
```

Expected: PASS. (If markdownlint complains about heading-increment in §10.7, ensure it starts as `##`, matches Bingo's pattern.)

### Task D.3: Full DoD + commit PR D + manual smoke

- [ ] **Step 1: Full DoD**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: All four green.

- [ ] **Step 2: Manual smoke via lobby**

```bash
pnpm dev
```

In the browser: log in → /lobby → click 🔻 PLINKO cabinet → setup → DROP. Verify sidebar shows Plinko link. Stop dev.

- [ ] **Step 3: Commit**

```bash
git add src/components/Sidebar.tsx src/components/Sidebar.test.tsx src/pages/lobby/CabinetCarousel.tsx src/pages/stats/ src/pages/leaderboard/ BUILD_GUIDE.md
git commit -m "$(cat <<'EOF'
feat(plinko): nav integration + BUILD_GUIDE (PR D)

- Sidebar: 🔻 Plinko entry
- CabinetCarousel: PLINKO cabinet
- StatsLeftRail TABS + SLUG: Plinko
- StatsPage + LeaderboardPage TITLES: plinko
- StatsPerGamePage + LeaderboardPerGamePage GAME_LABELS: plinko
- BUILD_GUIDE §10.7 added + §12 roadmap row updated

Phase 12 feature-complete. Ready for tag + release.
EOF
)"
```

- [ ] **Step 4: Push + PR**

```bash
git push -u origin phase-12-plinko-pr-d
gh pr create --title "phase-12(plinko): PR D — nav integration + BUILD_GUIDE" --body "$(cat <<'EOF'
## Summary

PR D of Phase 12 — final wiring.

- Sidebar `🔻 Plinko` entry
- Lobby cabinet `🔻 PLINKO`
- /stats + /leaderboard per-game tabs gain Plinko
- BUILD_GUIDE §10.7 added + §12 roadmap row

After merge: tag `v0.12-plinko` + GitHub Release + memory snapshot.

## Test plan

- [x] DoD locally
- [x] Manual lobby → cabinet → setup → drop smoke
- [ ] CI green
EOF
)"
```

### Task D.4: Tag + Release + memory snapshot (post-merge)

This task runs AFTER PR D is merged. I (the session controller) handle this.

- [ ] **Step 1: Sync main after PR D merge**

```bash
git checkout main && git pull origin main
git log --oneline -1
```

- [ ] **Step 2: Tag**

```bash
git tag -a v0.12-plinko -m "Phase 12: Modern-casino Plinko"
git push origin v0.12-plinko
```

- [ ] **Step 3: Create GitHub Release**

```bash
gh release create v0.12-plinko --title "v0.12 — Plinko" --notes "$(cat <<'EOF'
## Phase 12: Modern-casino Plinko

A new game lands in the lobby — modern-casino Plinko, modelled after Stake.

### Highlights

- **20-row peg board, 21 bins**, fixed layout. Drop point centred — no player aim.
- **Four risk levels:** Safe / Low / Medium / High — same board, different multiplier curves. Edge multiplier ranges from 16x (Safe) to 5000x (High).
- **Bet 10–5000 chips per ball.** Manual mode (1 ball per click) + Auto mode (1–100 balls at 250/500/1000ms intervals). Multiple balls can be in flight simultaneously.
- **Deterministic seeded RNG** (mulberry32). Binomial(20, 0.5) walk produces the ball path; bin = count of R-moves. Centre bin most likely (~17.6%); edges ~1 in 1,048,576.
- **Framer Motion keyframe animation** per row (~75ms/row, ~1.5s total). `useReducedMotion` collapses to instant placement.
- **One `rounds` row per ball.** sessionId UUID groups all balls of an auto session.
- **~95-100% RTP** across all risk levels.

### Shipped PRs

- PR A — pure logic + multiplier curves + Round.game enum
- PR B — XState machine + auto session state
- PR C — UI rewrite (Board, FallingBall, BinRow, HistoryStrip, AutoDropControls, SetupPanel, EndScreen, PlinkoPage)
- PR D — nav integration + BUILD_GUIDE §10.7

Spec: \`docs/superpowers/specs/2026-05-20-phase-12-plinko-design.md\`
Plan: \`docs/superpowers/plans/2026-05-20-phase-12-plinko-plan.md\`
EOF
)"
```

- [ ] **Step 4: Update memory snapshot**

Update `~/.claude/projects/-Users-adam/memory/project_masquer_status.md`:

- Top entry: `v0.12-plinko` with summary
- "Where we are" + "latest release" lines
- Next phase: 13a (Texas Hold'em)
- Append architectural milestones learned: Framer Motion keyframe-array animation pattern, per-ball settle pattern matching Lottery precedent, deterministic Binomial walk via inline mulberry32.
- Append to deferred-features: admin tunability for Plinko multiplier curves; sound effects; jackpot celebration; ball trail effects; column-pick variant.

---

## Self-review checklist

After PR D ships, verify:

- [ ] Spec coverage: every §2–§13 spec section has at least one task implementing it.
- [ ] No placeholders in the plan (no TBDs, no "implement appropriate X").
- [ ] All type/function names consistent: `Risk`, `dropBall`, `payoutFor`, `MULTIPLIER_CURVES`, `plinkoMachine`, `PlinkoEvent`, `PlinkoContext`, `FallingBallState`, `HistoryEntry`, `AutoStopReason`.
- [ ] Manual smoke completed for all 4 risk levels, both manual and auto modes.
- [ ] /stats per-game + /leaderboard per-game tabs show Plinko data after at least one drop.
- [ ] Sidebar entry + lobby cabinet both open the game.
