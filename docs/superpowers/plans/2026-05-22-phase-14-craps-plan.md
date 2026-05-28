# Phase 14 — Craps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full-table single-player Craps — two dice, come-out/point phases, the complete bet set (line, odds, come/don't-come, place, field, proposition/center), a per-bet resolver registry, tiered tables, and a table-session wallet (buy-in bankroll, ADR-0041).

**Architecture:** Self-contained `src/games/craps/`. Pure `dice.ts` + a `BET_TYPES` resolver registry in `bets.ts` (each bet: `canPlace`/`isWorking`/`resolve`/`payout`) + `resolveRoll.ts`. XState v5 machine drives come-out/point phases + placement validation + the session. The page does RNG + wallet (wallet-bridge-async / machine-pure). Reuses the session wallet pattern (ADR-0041), seeded RNG, and roulette's chip-selector UX. New ADR-0042 for the resolver registry + working-bet rules.

**Tech Stack:** TypeScript 5, React 18, Vite 5, Tailwind 3, XState v5, @xstate/react 6, Framer Motion 12, Vitest 2, RTL, fake-indexeddb.

**Spec:** `docs/superpowers/specs/2026-05-22-phase-14-craps-design.md` (PR #188).

**Rollout:** 6 PRs, branches `phase-14-craps-pr-{a..f}`. Each merges before the next. `Round.game` enum + commitlint scope `craps` added in-phase. ADR-0042 in PR C.

**Known CI flake:** none (AdminLotteryPage fixed in #169). Re-run once if an unrelated file flakes.

---

## Reference: precedents to mirror

- `src/games/roulette/ChipSelector.tsx` — the chip-denomination selector UX the `ChipTray` mirrors; `src/games/roulette/RoulettePage.tsx` — multi-bet placement + the deferred wallet pattern (craps differs: session bankroll).
- `src/games/poker/holdem/HoldemPage.tsx` + `machine.ts` — the session-keyed mount, buy-in/cash-out wallet bridge (ADR-0041), `beforeunload` settle. Craps' session lifecycle mirrors this (bankroll instead of stack).
- `src/games/poker/_shared/deck.ts` — the inlined `mulberry32` + `stringSeed` seeding pattern to copy into `dice.ts`.
- `src/games/_shared/useGameRound.ts` — `placeBet`/`settle` signatures.
- `docs/adr/0041-poker-session-wallet-model.md` — the session wallet ADR craps reuses. `docs/adr/_template.md` — ADR format for 0042.

---

## PR A — Dice + line/odds resolvers + resolveRoll

**Branch:** `phase-14-craps-pr-a`
**Scope:** `dice.ts`, `stakes.ts`, `bets.ts` (registry + line/odds/come resolvers), `resolveRoll.ts` + tests. Commitlint scope `craps`. Pure logic only.
**DoD:** lint + typecheck + vitest + build green. ~45 tests.

### Task A.1: Branch + commitlint scope

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull origin main
git checkout -b phase-14-craps-pr-a
```

- [ ] **Step 2: Add `craps` to `commitlint.config.js` scope-enum** (insert `'craps',` in the array).
- [ ] **Step 3: Commit**

```bash
git add commitlint.config.js
git commit -m "chore(repo): add 'craps' to commitlint scope-enum"
```

### Task A.2: dice.ts + tests

**Files:** Create `src/games/craps/dice.ts`, `dice.test.ts`

- [ ] **Step 1: Write `dice.ts`**

```typescript
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

function stringSeed(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

export interface Roll {
  d1: number;
  d2: number;
  total: number;
  isHard: boolean;
}

/** Roll two dice from a seeded rng. Each die uniform 1-6. */
export function rollDice(rng: () => number): Roll {
  const d1 = Math.floor(rng() * 6) + 1;
  const d2 = Math.floor(rng() * 6) + 1;
  return { d1, d2, total: d1 + d2, isHard: d1 === d2 };
}

/** Seeded rng factory for a session — game code seeds `${sessionId}.${rollNumber}`. */
export function rngFromSeed(seed: string): () => number {
  return mulberry32(stringSeed(seed));
}
```

- [ ] **Step 2: Write `dice.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { rollDice, rngFromSeed } from './dice';

describe('rollDice', () => {
  it('produces dice in 1-6, total in 2-12, isHard when equal', () => {
    const rng = rngFromSeed('s.1');
    for (let i = 0; i < 1000; i += 1) {
      const r = rollDice(rng);
      expect(r.d1).toBeGreaterThanOrEqual(1);
      expect(r.d1).toBeLessThanOrEqual(6);
      expect(r.d2).toBeGreaterThanOrEqual(1);
      expect(r.d2).toBeLessThanOrEqual(6);
      expect(r.total).toBe(r.d1 + r.d2);
      expect(r.isHard).toBe(r.d1 === r.d2);
    }
  });
  it('deterministic by seed', () => {
    const a = rngFromSeed('x');
    const b = rngFromSeed('x');
    expect(rollDice(a)).toEqual(rollDice(b));
  });
  it('covers all totals 2-12 over many seeded rolls', () => {
    const rng = rngFromSeed('coverage');
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i += 1) seen.add(rollDice(rng).total);
    for (let t = 2; t <= 12; t += 1) expect(seen.has(t)).toBe(true);
  });
});
```

- [ ] **Step 3: Run** — `pnpm exec vitest run src/games/craps/dice.test.ts`.

### Task A.3: stakes.ts

**Files:** Create `src/games/craps/stakes.ts`

- [ ] **Step 1: Write `stakes.ts`**

```typescript
export type StakesTier = 'low' | 'mid' | 'high';

export interface StakesConfig {
  tier: StakesTier;
  label: string;
  tableMin: number; // minimum per bet
  tableMax: number; // maximum per bet
  buyInMin: number;
  buyInMax: number;
  oddsMultiple: number; // odds capped at this × the line bet (default 3)
  chips: number[]; // chip-tray denominations for this tier
}

export const CRAPS_STAKES: Record<StakesTier, StakesConfig> = {
  low: {
    tier: 'low',
    label: 'Low',
    tableMin: 10,
    tableMax: 500,
    buyInMin: 200,
    buyInMax: 1000,
    oddsMultiple: 3,
    chips: [10, 25, 100],
  },
  mid: {
    tier: 'mid',
    label: 'Mid',
    tableMin: 50,
    tableMax: 2500,
    buyInMin: 1000,
    buyInMax: 5000,
    oddsMultiple: 3,
    chips: [50, 100, 500],
  },
  high: {
    tier: 'high',
    label: 'High',
    tableMin: 250,
    tableMax: 12500,
    buyInMin: 5000,
    buyInMax: 25000,
    oddsMultiple: 3,
    chips: [250, 500, 2500],
  },
};
```

### Task A.4: bets.ts registry + line/odds/come resolvers

**Files:** Create `src/games/craps/bets.ts`, `bets.test.ts`

- [ ] **Step 1: Write the registry scaffolding + line/odds/come resolvers**

```typescript
import type { Roll } from './dice';

export type Phase = 'come-out' | 'point';

// FINAL shape — locked here in PR A; PRs B/C build on it WITHOUT changing it.
// `payout()` supplies winnings for fixed-odds bets. Roll-dependent bets (field,
// horn, C&E) instead set `multiplier` (winnings = amount * multiplier) or an exact
// integer `winnings` override on the `win` outcome. resolveRoll applies precedence:
//   winnings ?? (multiplier !== undefined ? amount*multiplier : payout()). See ADR-0042.
export type BetOutcome =
  | { kind: 'win'; multiplier?: number; winnings?: number }
  | { kind: 'lose' }
  | { kind: 'push' }
  | { kind: 'standing' }
  | { kind: 'move'; toPoint: number };

export interface BetContext {
  point: number | null;
}

export interface BetType {
  id: string;
  label: string;
  canPlace(phase: Phase, ctx: BetContext): boolean;
  isWorking(phase: Phase): boolean;
  // `amount` (the stake) is OPTIONAL — only composite bets (horn, C&E in PR B) read it to
  // compute their exact `winnings` override; fixed-odds resolvers omit the param entirely.
  // resolveRoll always passes bet.amount, so it is defined at runtime. Optional keeps the
  // 4-arg fixed-odds resolvers + their tests valid without a 5th argument.
  resolve(
    roll: Roll,
    phase: Phase,
    point: number | null,
    betPoint: number | null,
    amount?: number,
  ): BetOutcome;
  payout(amount: number, betPoint: number | null): number; // winnings only, floored
}

const POINT_NUMBERS = [4, 5, 6, 8, 9, 10];

/** True-odds winnings for a pass/come odds bet of `amount` on `betPoint`. */
function passOddsWinnings(amount: number, betPoint: number): number {
  if (betPoint === 4 || betPoint === 10) return amount * 2; // 2:1
  if (betPoint === 5 || betPoint === 9) return Math.floor((amount * 3) / 2); // 3:2
  return Math.floor((amount * 6) / 5); // 6/8 → 6:5
}
/** True-odds winnings for a don't-pass/don't-come LAY odds bet of `amount` on `betPoint`. */
function dontOddsWinnings(amount: number, betPoint: number): number {
  if (betPoint === 4 || betPoint === 10) return Math.floor(amount / 2); // lay 2:1 → win 1:2
  if (betPoint === 5 || betPoint === 9) return Math.floor((amount * 2) / 3); // lay 3:2 → win 2:3
  return Math.floor((amount * 5) / 6); // 6/8 → win 5:6
}

export const BET_TYPES: Record<string, BetType> = {
  pass: {
    id: 'pass',
    label: 'Pass Line',
    canPlace: (phase) => phase === 'come-out',
    isWorking: () => true,
    resolve(roll, phase, point) {
      if (phase === 'come-out') {
        if (roll.total === 7 || roll.total === 11) return { kind: 'win', payout: 0 }; // even money — payout() supplies winnings
        if (roll.total === 2 || roll.total === 3 || roll.total === 12) return { kind: 'lose' };
        return { kind: 'standing' }; // point established; pass rides
      }
      if (point !== null && roll.total === point) return { kind: 'win', payout: 0 };
      if (roll.total === 7) return { kind: 'lose' };
      return { kind: 'standing' };
    },
    payout: (amount) => amount, // 1:1
  },

  'dont-pass': {
    id: 'dont-pass',
    label: "Don't Pass",
    canPlace: (phase) => phase === 'come-out',
    isWorking: () => true,
    resolve(roll, phase, point) {
      if (phase === 'come-out') {
        if (roll.total === 7 || roll.total === 11) return { kind: 'lose' };
        if (roll.total === 2 || roll.total === 3) return { kind: 'win', payout: 0 };
        if (roll.total === 12) return { kind: 'push' }; // bar 12
        return { kind: 'standing' };
      }
      if (roll.total === 7) return { kind: 'win', payout: 0 };
      if (point !== null && roll.total === point) return { kind: 'lose' };
      return { kind: 'standing' };
    },
    payout: (amount) => amount, // 1:1
  },

  come: {
    id: 'come',
    label: 'Come',
    canPlace: (phase) => phase === 'point',
    isWorking: () => true,
    resolve(roll, _phase, _point, betPoint) {
      if (betPoint === null) {
        // freshly placed come bet, awaiting its own come-point
        if (roll.total === 7 || roll.total === 11) return { kind: 'win', payout: 0 };
        if (roll.total === 2 || roll.total === 3 || roll.total === 12) return { kind: 'lose' };
        return { kind: 'move', toPoint: roll.total };
      }
      if (roll.total === betPoint) return { kind: 'win', payout: 0 };
      if (roll.total === 7) return { kind: 'lose' };
      return { kind: 'standing' };
    },
    payout: (amount) => amount,
  },

  'dont-come': {
    id: 'dont-come',
    label: "Don't Come",
    canPlace: (phase) => phase === 'point',
    isWorking: () => true,
    resolve(roll, _phase, _point, betPoint) {
      if (betPoint === null) {
        if (roll.total === 7 || roll.total === 11) return { kind: 'lose' };
        if (roll.total === 2 || roll.total === 3) return { kind: 'win', payout: 0 };
        if (roll.total === 12) return { kind: 'push' };
        return { kind: 'move', toPoint: roll.total };
      }
      if (roll.total === 7) return { kind: 'win', payout: 0 };
      if (roll.total === betPoint) return { kind: 'lose' };
      return { kind: 'standing' };
    },
    payout: (amount) => amount,
  },

  'odds-pass': {
    id: 'odds-pass',
    label: 'Pass Odds',
    canPlace: (phase, ctx) => phase === 'point' && ctx.point !== null, // also used behind come points
    isWorking: (phase) => phase === 'point', // odds off on come-out
    resolve(roll, _phase, point, betPoint) {
      const num = betPoint ?? point;
      if (num === null) return { kind: 'standing' };
      if (roll.total === num) return { kind: 'win', payout: 0 };
      if (roll.total === 7) return { kind: 'lose' };
      return { kind: 'standing' };
    },
    payout: (amount, betPoint) => passOddsWinnings(amount, betPoint ?? 4),
  },

  'odds-dont': {
    id: 'odds-dont',
    label: "Don't Odds",
    canPlace: (phase, ctx) => phase === 'point' && ctx.point !== null,
    isWorking: () => true, // lay odds work on come-out too, but simplest: always working in point phase contexts
    resolve(roll, _phase, point, betPoint) {
      const num = betPoint ?? point;
      if (num === null) return { kind: 'standing' };
      if (roll.total === 7) return { kind: 'win', payout: 0 };
      if (roll.total === num) return { kind: 'lose' };
      return { kind: 'standing' };
    },
    payout: (amount, betPoint) => dontOddsWinnings(amount, betPoint ?? 4),
  },
};

export { POINT_NUMBERS };
```

CONVENTION (matches the locked `BetOutcome` above): a `resolve` win returns plain `{ kind: 'win' }` for fixed-odds bets — `resolveRoll` will call `payout()` for the winnings. Only the roll-dependent bets (field in PR B, horn/C&E in PR B) populate `multiplier`/`winnings`. The line/odds/come/place resolvers in this PR therefore return `{ kind: 'win' }` with no extra fields. `payout()` always returns winnings only (excl. stake); `resolveRoll` adds the stake back.

- [ ] **Step 2: Write `bets.test.ts` for the line/odds/come resolvers** — `it.each` over scenarios:

```typescript
import { describe, it, expect } from 'vitest';
import { BET_TYPES } from './bets';
import type { Roll } from './dice';

function roll(d1: number, d2: number): Roll {
  return { d1, d2, total: d1 + d2, isHard: d1 === d2 };
}

describe('pass line', () => {
  const pass = BET_TYPES.pass!;
  it('come-out 7 or 11 wins', () => {
    expect(pass.resolve(roll(3, 4), 'come-out', null, null)).toEqual({ kind: 'win' });
    expect(pass.resolve(roll(5, 6), 'come-out', null, null)).toEqual({ kind: 'win' });
  });
  it('come-out 2/3/12 loses', () => {
    expect(pass.resolve(roll(1, 1), 'come-out', null, null)).toEqual({ kind: 'lose' });
    expect(pass.resolve(roll(6, 6), 'come-out', null, null)).toEqual({ kind: 'lose' });
  });
  it('come-out point number stands', () => {
    expect(pass.resolve(roll(4, 2), 'come-out', null, null)).toEqual({ kind: 'standing' });
  });
  it('point made wins, seven-out loses, else stands', () => {
    expect(pass.resolve(roll(3, 3), 'point', 6, null)).toEqual({ kind: 'win' });
    expect(pass.resolve(roll(3, 4), 'point', 6, null)).toEqual({ kind: 'lose' });
    expect(pass.resolve(roll(5, 3), 'point', 6, null)).toEqual({ kind: 'standing' });
  });
  it('pays 1:1', () => {
    expect(pass.payout(100, null)).toBe(100);
  });
});

describe("don't pass", () => {
  const dp = BET_TYPES['dont-pass']!;
  it('come-out 12 pushes (bar 12)', () => {
    expect(dp.resolve(roll(6, 6), 'come-out', null, null)).toEqual({ kind: 'push' });
  });
  it('come-out 2/3 wins, 7/11 loses', () => {
    expect(dp.resolve(roll(1, 1), 'come-out', null, null)).toEqual({ kind: 'win' });
    expect(dp.resolve(roll(3, 4), 'come-out', null, null)).toEqual({ kind: 'lose' });
  });
  it('point: seven-out wins, point made loses', () => {
    expect(dp.resolve(roll(3, 4), 'point', 6, null)).toEqual({ kind: 'win' });
    expect(dp.resolve(roll(3, 3), 'point', 6, null)).toEqual({ kind: 'lose' });
  });
});

describe('come bet travels', () => {
  const come = BET_TYPES.come!;
  it('fresh come bet: 7/11 win, 2/3/12 lose, else move', () => {
    expect(come.resolve(roll(3, 4), 'point', 6, null)).toEqual({ kind: 'win' });
    expect(come.resolve(roll(1, 1), 'point', 6, null)).toEqual({ kind: 'lose' });
    expect(come.resolve(roll(2, 3), 'point', 6, null)).toEqual({ kind: 'move', toPoint: 5 });
  });
  it('travelled come bet: its number wins, 7 loses, else stands', () => {
    expect(come.resolve(roll(2, 3), 'point', 6, 5)).toEqual({ kind: 'win' });
    expect(come.resolve(roll(3, 4), 'point', 6, 5)).toEqual({ kind: 'lose' });
    expect(come.resolve(roll(6, 4), 'point', 6, 5)).toEqual({ kind: 'standing' });
  });
});

describe('pass odds true-odds payouts', () => {
  const odds = BET_TYPES['odds-pass']!;
  it('2:1 on 4/10, 3:2 on 5/9, 6:5 on 6/8', () => {
    expect(odds.payout(100, 4)).toBe(200);
    expect(odds.payout(100, 10)).toBe(200);
    expect(odds.payout(100, 5)).toBe(150);
    expect(odds.payout(100, 6)).toBe(120);
  });
  it('odds off on come-out (isWorking false)', () => {
    expect(odds.isWorking('come-out')).toBe(false);
    expect(odds.isWorking('point')).toBe(true);
  });
  it('wins when its number rolls, loses on 7', () => {
    expect(odds.resolve(roll(3, 3), 'point', 6, null)).toEqual({ kind: 'win' });
    expect(odds.resolve(roll(3, 4), 'point', 6, null)).toEqual({ kind: 'lose' });
  });
});
```

- [ ] **Step 3: Run** — fix until green.

### Task A.5: resolveRoll.ts + tests

**Files:** Create `src/games/craps/resolveRoll.ts`, `resolveRoll.test.ts`

- [ ] **Step 1: Write `resolveRoll.ts`**

```typescript
import type { Roll } from './dice';
import { BET_TYPES, type Phase, type BetOutcome } from './bets';

export interface ActiveBet {
  betId: string;
  amount: number;
  betPoint: number | null;
}

export interface RollResolution {
  perBet: Array<{ bet: ActiveBet; outcome: BetOutcome }>;
  netReturned: number; // chips returned to bankroll this roll (stake-returns + winnings; losers contribute 0)
}

export function resolveRoll(
  bets: ActiveBet[],
  roll: Roll,
  phase: Phase,
  point: number | null,
): RollResolution {
  const perBet: Array<{ bet: ActiveBet; outcome: BetOutcome }> = [];
  let netReturned = 0;
  for (const bet of bets) {
    const type = BET_TYPES[bet.betId];
    if (!type) {
      perBet.push({ bet, outcome: { kind: 'standing' } });
      continue;
    }
    if (!type.isWorking(phase)) {
      perBet.push({ bet, outcome: { kind: 'standing' } });
      continue;
    }
    const outcome = type.resolve(roll, phase, point, bet.betPoint, bet.amount);
    if (outcome.kind === 'win') {
      // precedence: explicit integer winnings → multiplier → fixed payout()
      const winnings =
        outcome.winnings ??
        (outcome.multiplier !== undefined
          ? bet.amount * outcome.multiplier
          : type.payout(bet.amount, bet.betPoint));
      netReturned += bet.amount + winnings; // stake back + winnings
    } else if (outcome.kind === 'push') {
      netReturned += bet.amount; // stake back
    }
    perBet.push({ bet, outcome });
  }
  return { perBet, netReturned };
}
```

- [ ] **Step 2: Write `resolveRoll.test.ts`** — net-returned aggregation across a mix of bets:

```typescript
import { describe, it, expect } from 'vitest';
import { resolveRoll } from './resolveRoll';
import type { Roll } from './dice';

function roll(d1: number, d2: number): Roll {
  return { d1, d2, total: d1 + d2, isHard: d1 === d2 };
}

describe('resolveRoll', () => {
  it('come-out 7: pass wins (stake+winnings), dont-pass loses', () => {
    const r = resolveRoll(
      [
        { betId: 'pass', amount: 100, betPoint: null },
        { betId: 'dont-pass', amount: 100, betPoint: null },
      ],
      roll(3, 4),
      'come-out',
      null,
    );
    // pass: 100 stake + 100 winnings = 200 returned; dont-pass: 0
    expect(r.netReturned).toBe(200);
    expect(r.perBet[0]!.outcome).toEqual({ kind: 'win' });
    expect(r.perBet[1]!.outcome).toEqual({ kind: 'lose' });
  });
  it('dont-pass 12 push returns the stake', () => {
    const r = resolveRoll(
      [{ betId: 'dont-pass', amount: 100, betPoint: null }],
      roll(6, 6),
      'come-out',
      null,
    );
    expect(r.netReturned).toBe(100);
    expect(r.perBet[0]!.outcome).toEqual({ kind: 'push' });
  });
  it('non-working bet (odds on come-out) stands, returns 0', () => {
    const r = resolveRoll(
      [{ betId: 'odds-pass', amount: 100, betPoint: 6 }],
      roll(3, 3),
      'come-out',
      null,
    );
    expect(r.netReturned).toBe(0);
    expect(r.perBet[0]!.outcome).toEqual({ kind: 'standing' });
  });
});
```

- [ ] **Step 3: Run.**

### Task A.6: Full DoD + commit + PR A

- [ ] **Step 1: DoD** — `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build`.
- [ ] **Step 2: Commit + push + PR**

```bash
git add src/games/craps/dice.ts src/games/craps/dice.test.ts src/games/craps/stakes.ts src/games/craps/bets.ts src/games/craps/bets.test.ts src/games/craps/resolveRoll.ts src/games/craps/resolveRoll.test.ts
git commit -m "feat(craps): dice + line/odds/come resolvers + resolveRoll (PR A)"
git push -u origin phase-14-craps-pr-a
gh pr create --title "phase-14(craps): PR A — dice + line/odds resolvers + resolveRoll" --body "PR A of Phase 14. Pure: dice (seeded 2-dice), stakes tiers, the BET_TYPES registry scaffolding + pass/dont-pass/come/dont-come/odds resolvers, resolveRoll. ~45 tests. No machine/UI."
```

---

## PR B — Place / field / proposition / hardway resolvers

**Branch:** `phase-14-craps-pr-b` (off main after PR A merged)
**Scope:** Extend `BET_TYPES` in `bets.ts` with place, field, hardways, and one-roll props + tests. Pure.
**DoD:** green. ~40 tests.

### Task B.1: Branch + place + field resolvers

**Files:** Modify `src/games/craps/bets.ts`, `bets.test.ts`

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull origin main
git checkout -b phase-14-craps-pr-b
```

- [ ] **Step 2: Add place + field to `BET_TYPES`** (append to the registry object):

```typescript
// helper for place payouts (winnings only)
function placeWinnings(amount: number, num: number): number {
  if (num === 4 || num === 10) return Math.floor((amount * 9) / 5); // 9:5
  if (num === 5 || num === 9) return Math.floor((amount * 7) / 5); // 7:5
  return Math.floor((amount * 7) / 6); // 6/8 → 7:6
}

// In BET_TYPES, add one entry per place number 4,5,6,8,9,10:
//   id: `place-${num}`, label: `Place ${num}`,
//   canPlace: (phase) => phase === 'point',   // place bets made during point phase
//   isWorking: (phase) => phase === 'point',  // OFF on come-out
//   resolve: (roll) => roll.total === num ? { kind:'win' } : roll.total === 7 ? { kind:'lose' } : { kind:'standing' },
//   payout: (amount) => placeWinnings(amount, num),
// Build these with a loop or write 6 explicit entries.

field: {
  id: 'field',
  label: 'Field',
  canPlace: () => true,
  isWorking: () => true,
  resolve(roll) {
    const t = roll.total;
    if (t === 2) return { kind: 'win', multiplier: 2 }; // 2:1
    if (t === 12) return { kind: 'win', multiplier: 3 }; // 3:1
    if (t === 3 || t === 4 || t === 9 || t === 10 || t === 11) return { kind: 'win' }; // 1:1 via payout()
    return { kind: 'lose' };
  },
  payout: (amount) => amount, // 1:1 fallback; the 2×/3× cases set multiplier in resolve()
},
```

The field's roll-dependent bonus uses the `multiplier` field already locked on `BetOutcome` in PR A (resolveRoll applies `amount * multiplier` when present, else `payout()`). No type or resolveRoll changes are needed in this PR — just return the multiplier from resolve for 2 and 12.

- [ ] **Step 3: Tests for place + field**:

```typescript
describe('place bets', () => {
  it('place-6 wins on 6, loses on 7, stands otherwise; off on come-out', () => {
    const p6 = BET_TYPES['place-6']!;
    expect(p6.isWorking('come-out')).toBe(false);
    expect(p6.resolve(roll(3, 3), 'point', 8, null)).toEqual({ kind: 'win' });
    expect(p6.resolve(roll(3, 4), 'point', 8, null)).toEqual({ kind: 'lose' });
    expect(p6.resolve(roll(5, 4), 'point', 8, null)).toEqual({ kind: 'standing' });
    expect(p6.payout(120, null)).toBe(140); // 7:6 → 120 * 7/6 = 140
  });
  it('place-4 pays 9:5', () => {
    expect(BET_TYPES['place-4']!.payout(100, null)).toBe(180);
  });
});

describe('field', () => {
  const field = BET_TYPES.field!;
  it('wins on 2/3/4/9/10/11/12, loses on 5/6/7/8', () => {
    expect(field.resolve(roll(1, 1), 'come-out', null, null).kind).toBe('win');
    expect(field.resolve(roll(2, 3), 'come-out', null, null).kind).toBe('lose'); // 5
    expect(field.resolve(roll(3, 4), 'come-out', null, null).kind).toBe('lose'); // 7
  });
  it('2 pays 2:1, 12 pays 3:1 via multiplier', () => {
    expect(field.resolve(roll(1, 1), 'come-out', null, null)).toEqual({
      kind: 'win',
      multiplier: 2,
    });
    expect(field.resolve(roll(6, 6), 'come-out', null, null)).toEqual({
      kind: 'win',
      multiplier: 3,
    });
    expect(field.resolve(roll(4, 5), 'come-out', null, null)).toEqual({ kind: 'win' }); // 9 → 1:1
  });
});
```

- [ ] **Step 4: Run.**

### Task B.2: Hardways + one-roll props

**Files:** Modify `src/games/craps/bets.ts`, `bets.test.ts`

- [ ] **Step 1: Add hardways + props to `BET_TYPES`**:

```typescript
// Hardways: hard-4, hard-6, hard-8, hard-10. Win if the number rolls HARD (both dice equal);
// lose if it rolls easy OR a 7. Multi-roll (stands otherwise). Always working in point phase;
// off on come-out by default (standard).
// For num in [4,6,8,10]:
//   id: `hard-${num}`, label: `Hard ${num}`,
//   canPlace: () => true, isWorking: (phase) => phase === 'point',
//   resolve: (roll) =>
//     roll.total === num ? (roll.isHard ? { kind:'win' } : { kind:'lose' })
//       : roll.total === 7 ? { kind:'lose' } : { kind:'standing' },
//   payout: (amount) => num === 4 || num === 10 ? amount * 7 : amount * 9,  // 7:1 / 9:1

// One-roll props (resolve every roll; win or lose immediately):
'any-7': { id:'any-7', label:'Any 7', canPlace:()=>true, isWorking:()=>true,
  resolve:(roll)=> roll.total===7?{kind:'win'}:{kind:'lose'}, payout:(a)=>a*4 }, // 4:1
'any-craps': { id:'any-craps', label:'Any Craps', canPlace:()=>true, isWorking:()=>true,
  resolve:(roll)=> (roll.total===2||roll.total===3||roll.total===12)?{kind:'win'}:{kind:'lose'}, payout:(a)=>a*7 }, // 7:1
'prop-2': { id:'prop-2', label:'2 (Aces)', canPlace:()=>true, isWorking:()=>true,
  resolve:(roll)=> roll.total===2?{kind:'win'}:{kind:'lose'}, payout:(a)=>a*30 },
'prop-3': { id:'prop-3', label:'3', canPlace:()=>true, isWorking:()=>true,
  resolve:(roll)=> roll.total===3?{kind:'win'}:{kind:'lose'}, payout:(a)=>a*15 },
'prop-11': { id:'prop-11', label:'11 (Yo)', canPlace:()=>true, isWorking:()=>true,
  resolve:(roll)=> roll.total===11?{kind:'win'}:{kind:'lose'}, payout:(a)=>a*15 },
'prop-12': { id:'prop-12', label:'12 (Boxcars)', canPlace:()=>true, isWorking:()=>true,
  resolve:(roll)=> roll.total===12?{kind:'win'}:{kind:'lose'}, payout:(a)=>a*30 },
```

**Horn + C&E** are composite bets — the stake splits across sub-bets, so on a win part of the stake is lost. resolveRoll always credits `amount + winnings` on a win, so each resolver returns an **exact integer `winnings` override** (the locked field on `BetOutcome`) sized so that `amount + winnings` equals the true total return: `winnings = desiredTotalReturn - amount`. The `resolve` signature already includes the `amount` param (locked in PR A's `BetType` interface), so these resolvers compute it directly — no type or resolveRoll change in this PR.

```typescript
// resolve signature: (roll, phase, point, betPoint, amount)
'horn': { id:'horn', label:'Horn', canPlace:()=>true, isWorking:()=>true,
  resolve(roll, _phase, _point, _betPoint, amount = 0) {
    const q = Math.floor(amount / 4);
    if (roll.total === 2 || roll.total === 12) return { kind: 'win', winnings: 31 * q - amount };
    if (roll.total === 3 || roll.total === 11) return { kind: 'win', winnings: 16 * q - amount };
    return { kind: 'lose' };
  },
  payout: (amount) => amount, // unused for the credit (winnings override always set on win)
},
// C&E: stake splits in half — half on any-craps (2/3/12 pays 7:1), half on 11 (pays 15:1). h = floor(amount/2).
//   hit 2/3/12: craps half returns h + 7h = 8h; eleven half lost → winnings = 8h - amount.
//   hit 11:     eleven half returns h + 15h = 16h; craps half lost → winnings = 16h - amount.
'c-and-e': { id:'c-and-e', label:'C & E', canPlace:()=>true, isWorking:()=>true,
  resolve(roll, _phase, _point, _betPoint, amount = 0) {
    const h = Math.floor(amount / 2);
    if (roll.total === 2 || roll.total === 3 || roll.total === 12) return { kind: 'win', winnings: 8 * h - amount };
    if (roll.total === 11) return { kind: 'win', winnings: 16 * h - amount };
    return { kind: 'lose' };
  },
  payout: (amount) => amount,
},
```

- [ ] **Step 2: Tests** for hardways (win hard, lose easy, lose on 7, stand otherwise; 7:1 / 9:1 payouts), one-roll props (each number's win/lose + payout), and horn/C&E (a hit on each constituent number yields the documented integer winnings; a miss loses).
- [ ] **Step 3: Run.**

### Task B.3: Full DoD + commit + PR B

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
git add src/games/craps/bets.ts src/games/craps/bets.test.ts
git commit -m "feat(craps): place/field/hardway/proposition resolvers (PR B)"
git push -u origin phase-14-craps-pr-b
gh pr create --title "phase-14(craps): PR B — place/field/proposition/hardway resolvers" --body "PR B of Phase 14. Extends BET_TYPES with place (9:5/7:5/7:6, off on come-out), field (2×/3× via multiplier), hardways (7:1/9:1, win-hard/lose-easy-or-7), one-roll props (any 7, any craps, 2/3/11/12), horn + C&E (composite, exact integer winnings). ~40 tests."
```

---

## PR C — Machine + session + ADR-0042

**Branch:** `phase-14-craps-pr-c` (off main after PR B merged)
**Scope:** `machine.ts` + tests + placeholder `CrapsPage` + `/play/craps` route + ADR-0042. ~35 tests.

### Task C.1: Branch + ADR-0042

- [ ] **Step 1: Branch** (`git checkout main && git pull && git checkout -b phase-14-craps-pr-c`).
- [ ] **Step 2: Write `docs/adr/0042-craps-bet-resolver-registry.md`** (mirror `_template.md` / 0041 style): record the `BetType` registry contract (canPlace/isWorking/resolve/payout), the win/lose/push/standing/move outcome model + the `multiplier`/`winnings` overrides for roll-dependent payouts (field, horn, C&E), the payout-returns-winnings-only convention, and the standard working/off defaults (place + come-odds off on come-out; "place working on come-out" toggle deferred). Note craps reuses the session wallet model from ADR-0041.

### Task C.2: machine.ts

**Files:** Create `src/games/craps/machine.ts`, `machine.test.ts`

- [ ] **Step 1: Build the machine** per spec §5. States `idle → table → settling → session_over`, phase in `context.phase`. Reference `holdem/machine.ts` for the session-lifecycle + `input` pattern. Key actions:
  - `sitDown` (assign from `input` `{ sessionId, buyIn, stakes }` → bankroll, phase 'come-out', point null, empty bets).
  - `placeBet` (guard: `BET_TYPES[betId].canPlace(phase, { point })` + `amount` in `[tableMin, tableMax]` + odds ≤ `oddsMultiple × line` + `bankroll >= amount`; debit bankroll; push ActiveBet).
  - `removeBet` (guard: removable in this phase; refund to bankroll; drop the bet).
  - `applyRoll` (the page sends `ROLL { roll }`): run `resolveRoll(bets, roll, phase, point)`; `bankroll += netReturned`; rebuild `bets` — drop win/lose/push, keep `standing`, relocate `move` bets (set their `betPoint = toPoint`, keep amount); update `biggestWin`; then phase transition: come-out 4-10 → set point + phase 'point'; point: roll===point → clear point + phase 'come-out'; roll===7 → clear point + phase 'come-out' (resolveRoll already settled everything). `rollNumber += 1`, `rollsPlayed += 1`, set `lastRoll`/`lastResolution`.
  - `rebuy`, `recordLeave`.
  - Events: `SIT_DOWN` (input), `PLACE_BET`, `REMOVE_BET`, `ROLL { roll }`, `REBUY`, `LEAVE_TABLE`. Exports `crapsMachine`, `CrapsContext`, `CrapsEvent`, `MachineInput`.
- [ ] **Step 2: Tests** (~35) — come-out resolution (7/11 win, 2/3/12, point set), point resolution (point made → come-out, seven-out → come-out + don't-side won), place-bet placement rejected on come-out (canPlace false), place bets off on come-out (isWorking → standing), come-bet travel relocates betPoint, odds cap guard, remove-bet refund, rebuy, leave→session_over, biggestWin. Seeded/scripted `ROLL { roll }` (machine never calls `rollDice`).
- [ ] **Step 3: Run.**

### Task C.3: Placeholder page + route + DoD + PR C

- [ ] **Step 1: Placeholder `CrapsPage.tsx`**:

```typescript
import type { JSX } from 'react';
export default function CrapsPage(): JSX.Element {
  return <div className="p-8 text-white"><p className="text-xs text-white/50">Craps — UI in PR D.</p></div>;
}
```

- [ ] **Step 2: Route** — `src/router.tsx`: `const CrapsPage = lazy(() => import('@/games/craps/CrapsPage'));` + `/play/craps` route (mirror an existing game route's Suspense).
- [ ] **Step 3: DoD + commit + PR C**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
git add src/games/craps/machine.ts src/games/craps/machine.test.ts src/games/craps/CrapsPage.tsx src/router.tsx docs/adr/0042-craps-bet-resolver-registry.md
git commit -m "feat(craps): machine + session + ADR-0042 (PR C)"
git push -u origin phase-14-craps-pr-c
gh pr create --title "phase-14(craps): PR C — machine + session + ADR-0042" --body "PR C of Phase 14. XState machine (come-out/point phases, placement validation, working/off rules, come-bet travel, buy-in/cash-out session per ADR-0041). ADR-0042 records the bet-resolver registry. Placeholder page + /play/craps route. ~35 tests."
```

---

## PR D — UI (full play surface)

**Branch:** `phase-14-craps-pr-d` (off main after PR C merged)
**Scope:** CrapsTable, BetSpot, Dice, PointPuck, PropositionDrawer, ChipTray, SessionBar, SetupPanel + full CrapsPage. ~20 tests.

### Task D.1: Branch + leaf components

- [ ] **Step 1: Branch.** Read `src/games/roulette/ChipSelector.tsx` + `src/games/poker/holdem/HoldemPage.tsx` for the chip-selector + session-page patterns.
- [ ] **Step 2: `Dice.tsx`** — two dice (white, red pips) that tumble on a new `lastRoll` via Framer Motion and settle on `d1`/`d2`; `useReducedMotion` → instant. Props: `roll: Roll | null`. Pip layouts for 1-6. `data-die` + `data-face` attrs for tests.
- [ ] **Step 3: `PointPuck.tsx`** — ON (white) over the point number / OFF (black). Prop `point: number | null`.
- [ ] **Step 4: `ChipTray.tsx`** — denomination buttons from `stakes.chips`; selected denom highlighted; shows bankroll. Fires `onSelectChip(value)`.
- [ ] **Step 5: `BetSpot.tsx`** — props `{ betId, label, chips: ActiveBet[], canPlace: boolean, onPlace, onRemove }`. Renders label + stacked chip total; dimmed + non-interactive when `!canPlace`; click → `onPlace`; small ✕ → `onRemove` (when removable). `data-bet-spot={betId}`, `data-disabled`.
- [ ] **Step 6:** small tests for Dice (settles on faces; reduced-motion instant), PointPuck (ON/OFF position), BetSpot (dim when `!canPlace`, fires onPlace/onRemove).

### Task D.2: CrapsTable + PropositionDrawer + SessionBar + SetupPanel

- [ ] **Step 1: `PropositionDrawer.tsx`** — collapsible centre box; renders BetSpots for hard-4/6/8/10, any-7, any-craps, prop-2/3/11/12, horn, c-and-e. Toggle expand/collapse.
- [ ] **Step 2: `CrapsTable.tsx`** — authentic half-table: Place row (place-4/5/6/8/9/10 with `PointPuck`), COME band, FIELD strip, PASS/DON'T-PASS line with odds spots, the `PropositionDrawer`, the `Dice` + recent rolls. Takes the machine snapshot + callbacks; computes each spot's `canPlace` from `BET_TYPES[betId].canPlace(phase, { point })`.
- [ ] **Step 3: `SessionBar.tsx`** (bankroll, session net, rolls, LEAVE TABLE between-rolls) + `SetupPanel.tsx` (stakes tier + buy-in slider + SIT DOWN). Mirror Hold'em's equivalents.

### Task D.3: CrapsPage + e2e + DoD + PR D

- [ ] **Step 1: `CrapsPage.tsx`** — orchestrator mirroring `HoldemPage`: a session-keyed sub-component mounting `useMachine(crapsMachine, { input })` after `placeBet(buyIn)`; wallet bridge (SIT DOWN / REBUY / LEAVE settle via `settleRound` with details `{ tier, rollsPlayed, rebuys, biggestWin, sessionId }`); the **ROLL driver** — player clicks ROLL, the page builds the rng with `rngFromSeed` seeded on the session id and roll number, calls `rollDice`, then sends a `ROLL` event carrying the resolved roll into the machine. Add a `beforeunload` settle. Read `phase` and `point` to drive spot enablement + the puck. Flow: SetupPanel pre-sit, CrapsTable seated, session-over summary.
- [ ] **Step 2: `CrapsPage.test.tsx`** e2e (fake-indexeddb + wallet hydration + seeded dice + `useReducedMotion` mocked): sit (Low tier) → place a pass-line bet → ROLL to set a point → ROLL the point → win credited to bankroll → LEAVE → assert a `rounds` row `game: 'craps'`, `stake === totalBoughtIn`, `payout === finalBankroll`. (Use a seed where the point is made quickly, or send scripted rolls by stubbing the rng to a fixed sequence.)
- [ ] **Step 3: Manual smoke** (if browser): `/play/craps` → sit → pass line → roll → place/field/prop bets → seven-out → leave. If headless, note it.
- [ ] **Step 4: DoD + commit + PR D**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
git add src/games/craps/
git commit -m "feat(craps): full table UI + wallet/roll bridge (PR D)"
git push -u origin phase-14-craps-pr-d
gh pr create --title "phase-14(craps): PR D — full table UI" --body "PR D of Phase 14. CrapsTable (authentic half-table) + BetSpot + Dice + PointPuck + PropositionDrawer + ChipTray + SessionBar + SetupPanel + full CrapsPage (wallet bridge + roll driver). Playable via /play/craps. ~20 tests."
```

---

## PR E — Enum + nav + BUILD_GUIDE

**Branch:** `phase-14-craps-pr-e` (off main after PR D merged)

- [ ] **Task E.1:** `src/db/schema.ts` — add `| 'craps'` to `Round.game`. Add GAME_LABELS: `StatsPerGamePage.tsx` (`craps: 'Craps'`), `LeaderboardPerGamePage.tsx` (`craps: 'CRAPS'`) — typecheck forces these.
- [ ] **Task E.2:** Sidebar — `{ to: '/play/craps', icon: '🎲', label: 'Craps' }`. CabinetCarousel — `{ to: '/play/craps', icon: '🎲', label: 'CRAPS', status: 'playable' }` (direct Link; no variant modal). StatsLeftRail TABS+SLUG; StatsPage + LeaderboardPage TITLES gain `craps`. Update nav-count test assertions + add a Craps assertion in Sidebar.test + StatsLeftRail.test.
- [ ] **Task E.3:** BUILD_GUIDE — add §10.9 Craps (full-table, per-bet resolver registry, session wallet, ADR-0042); §12 roadmap row Phase 14 (✅ Shipped 2026-05-22 — `v0.14-craps`); note this completes all gameplay phases (only Phase 15 Polish remains). §1 games list gains Craps.
- [ ] **Task E.4:** DoD + commit + PR E.

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
git add src/db/schema.ts src/pages/stats/ src/pages/leaderboard/ src/components/Sidebar.tsx src/components/Sidebar.test.tsx src/pages/lobby/CabinetCarousel.tsx src/pages/stats/StatsLeftRail.test.tsx BUILD_GUIDE.md
git commit -m "feat(craps): enum + nav + BUILD_GUIDE (PR E)"
git push -u origin phase-14-craps-pr-e
gh pr create --title "phase-14(craps): PR E — enum + nav + BUILD_GUIDE" --body "PR E of Phase 14. Round.game enum + GAME_LABELS + sidebar (🎲) + lobby cabinet + stats/leaderboard nav + BUILD_GUIDE §10.9. Completes all gameplay phases."
```

---

## PR F — Release (controller, post-merge)

- [ ] **Step 1:** `git checkout main && git pull origin main`.
- [ ] **Step 2:** `git tag -a v0.14-craps -m "Phase 14: full-table Craps" && git push origin v0.14-craps`.
- [ ] **Step 3:** `gh release create v0.14-craps` — highlights: full-table single-player craps, per-bet resolver registry (~15+ bets), come-out/point machine, true-odds + field 2×/3× + hardways + props, table-session wallet (ADR-0041), ADR-0042. List PRs A-E + test delta. Note this **completes all gameplay phases — only Phase 15 Polish remains.**
- [ ] **Step 4: Memory** — update `project_masquer_status.md`: top entry `v0.14-craps`; **next phase = 15 Polish** (the final phase: sound, animation refinement, the rebrand from "MASQUER", per-game bundle splitting, the deferred-features evaluation pass). Append Phase 14 deferred items (put/buy/lay, working-on-come-out toggle, fire bet, hop bets, hi-lo field paytable). Note ADR count → 42.

---

## Self-review checklist

After PR F:

- [ ] Spec §2-§8 each map to a task.
- [ ] No placeholders.
- [ ] Type/name consistency: `Roll`, `rollDice`, `rngFromSeed`, `BetType`, `BET_TYPES`, `BetOutcome` (with `multiplier`/`winnings` overrides), `ActiveBet`, `resolveRoll`, `RollResolution`, `crapsMachine`, `CrapsContext`, `CrapsEvent`, `CRAPS_STAKES`, `CrapsTable`, `BetSpot`, `CrapsPage`.
- [ ] The field/horn/C&E roll-dependent payouts use the `multiplier`/`winnings` outcome overrides (not `payout()`), and `resolveRoll` applies them.
- [ ] Working/off: place + come-odds resolve as `standing` on the come-out (via `isWorking`).
- [ ] Manual smoke: come-out → point → seven-out cycle; a place bet, a field bet, a prop bet, odds behind the line; rebuy; leave-and-settle.
- [ ] All gameplay phases done; only Phase 15 Polish remains.
