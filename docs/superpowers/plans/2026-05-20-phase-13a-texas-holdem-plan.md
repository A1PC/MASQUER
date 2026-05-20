# Phase 13a — Texas Hold'em + Shared Poker Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** No-Limit Texas Hold'em (configurable 2-6 players vs personality-archetype AI, tiered stakes, buy-in/cash-out session with rebuy) + the reusable poker infrastructure (deck, hand evaluator, side pots, AI engine, variant chooser) for 13b/13c.

**Architecture:** `src/games/poker/_shared/` holds reusable pure logic + the shared card component + variant modal; `src/games/poker/holdem/` holds the Hold'em XState machine + UI. The page (HoldemPage) does all async work — `placeBet`/`settleRound`, resolving AI decisions via `decide()` — and sends pre-resolved events into a synchronous, deterministic machine. Decks + AI are seeded for full reproducibility.

**Tech Stack:** TypeScript 5, React 18, Vite 5, Tailwind 3, XState v5, @xstate/react 6, Framer Motion 12, Vitest 2, RTL, fake-indexeddb, vitest fake timers.

**Spec:** `docs/superpowers/specs/2026-05-20-phase-13a-texas-holdem-design.md` (PR #162).

**Rollout:** 6 PRs, branches `phase-13a-poker-pr-{a..f}`. Each merges before the next opens.

**Known CI flake:** `src/pages/admin/AdminLotteryPage.test.tsx` "negative tone" + occasionally a bingo machine test fail intermittently in CI only (pass locally). If a PR's CI fails ONLY in those files, re-run — do not fix here.

---

## File Structure

(See spec §3 for the full tree.) Responsibilities:

**`_shared/` (PRs A, B):**

- `types.ts` — `Card`, `Rank`, `Suit`, `HandCategory`, `HandRank`, `PokerVariant`. Pure types, no logic.
- `deck.ts` — `freshDeck()`, `shuffle(deck, rng)`, `deckFromSeed(seed)`. Inlined mulberry32 + stringSeed.
- `handEvaluator.ts` — `evaluateBest5(cards)`, `evaluateFrom(hole, board, rule)`, `compareHands(a, b)`. The reusable core.
- `sidePots.ts` — `computeSidePots(contributions)`.
- `ai/archetypes.ts` — `Archetype`, `ArchetypeProfile`, `ARCHETYPES`.
- `ai/decide.ts` — `DecisionContext`, `Decision`, `decide(ctx)` + `handStrength` helper.
- `PlayingCard.tsx` — shared card visual (ported from blackjack).
- `PokerVariantModal.tsx` — variant chooser.

**`holdem/` (PRs C, D):**

- `holdemLogic.ts` — pure helpers the machine calls: `dealHand`, `firstToActPreflop/Postflop`, `nextLiveSeat`, `isBettingRoundClosed`, `resolveShowdown`.
- `machine.ts` — XState v5 hand + session lifecycle.
- UI: `HoldemPage`, `PokerTable`, `Seat`, `CommunityBoard`, `BettingControls`, `SetupPanel`, `SessionBar`, `ShowdownReveal`.

**Top-level (PR E):** `src/db/schema.ts` (enum), `commitlint.config.js` (scope), `src/router.tsx` (routes), Sidebar, CabinetCarousel, StatsLeftRail, StatsPage, LeaderboardPage, StatsPerGamePage, LeaderboardPerGamePage, BUILD_GUIDE.

---

## PR A — Shared core: deck + types + hand evaluator + side pots

**Branch:** `phase-13a-poker-pr-a`
**Scope:** Pure logic only. No UI, no machine, no enum changes yet.
**DoD:** lint + typecheck + vitest + build green. ~90 new tests.

### Task A.1: Branch + commitlint scope

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull origin main
git checkout -b phase-13a-poker-pr-a
```

- [ ] **Step 2: Add `poker` to commitlint scope-enum**
      Open `commitlint.config.js`. Add `'poker',` to the `scope-enum` array (after `'plinko'` if present, else anywhere in the list).

- [ ] **Step 3: Commit the scope addition**

```bash
git add commitlint.config.js
git commit -m "chore(repo): add 'poker' to commitlint scope-enum"
```

### Task A.2: types.ts

**Files:** Create `src/games/poker/_shared/types.ts`

- [ ] **Step 1: Write types.ts**

```bash
mkdir -p src/games/poker/_shared/ai
```

```typescript
export type Suit = 'c' | 'd' | 'h' | 's';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14; // 11=J 12=Q 13=K 14=A
export interface Card {
  rank: Rank;
  suit: Suit;
}
export type PokerVariant = 'holdem' | 'five-card-draw' | 'omaha';

export type HandCategory =
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'trips'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'quads'
  | 'straight-flush';

export const CATEGORY_VALUE: Record<HandCategory, number> = {
  'high-card': 0,
  pair: 1,
  'two-pair': 2,
  trips: 3,
  straight: 4,
  flush: 5,
  'full-house': 6,
  quads: 7,
  'straight-flush': 8,
};

export interface HandRank {
  category: HandCategory;
  categoryValue: number;
  tiebreakers: number[];
  best5: Card[];
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck 2>&1 | tail -3
```

Expected: PASS.

### Task A.3: deck.ts + tests

**Files:** Create `src/games/poker/_shared/deck.ts`, `deck.test.ts`

- [ ] **Step 1: Write deck.ts**

```typescript
import type { Card, Rank, Suit } from './types';

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

const SUITS: Suit[] = ['c', 'd', 'h', 's'];
const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

export function shuffle(deck: Card[], rng: () => number): Card[] {
  const out = deck.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function deckFromSeed(seed: string): Card[] {
  return shuffle(freshDeck(), mulberry32(stringSeed(seed)));
}
```

- [ ] **Step 2: Write deck.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { freshDeck, deckFromSeed } from './deck';

describe('freshDeck', () => {
  it('has 52 unique cards', () => {
    const d = freshDeck();
    expect(d).toHaveLength(52);
    const keys = new Set(d.map((c) => `${c.rank}${c.suit}`));
    expect(keys.size).toBe(52);
  });
});

describe('deckFromSeed', () => {
  it('is deterministic for a given seed', () => {
    expect(deckFromSeed('s.1')).toEqual(deckFromSeed('s.1'));
  });
  it('differs across seeds', () => {
    expect(deckFromSeed('s.1')).not.toEqual(deckFromSeed('s.2'));
  });
  it('is a permutation of freshDeck (52 unique)', () => {
    const d = deckFromSeed('x');
    expect(d).toHaveLength(52);
    expect(new Set(d.map((c) => `${c.rank}${c.suit}`)).size).toBe(52);
  });
});
```

- [ ] **Step 3: Run**

```bash
pnpm exec vitest run src/games/poker/_shared/deck.test.ts 2>&1 | tail -8
```

Expected: pass.

### Task A.4: handEvaluator.ts — scoring a 5-card hand

**Files:** Create `src/games/poker/_shared/handEvaluator.ts`, `handEvaluator.test.ts`

- [ ] **Step 1: Write the 5-card scorer + best-of-N + compare**

```typescript
import type { Card, HandCategory, HandRank, Rank } from './types';
import { CATEGORY_VALUE } from './types';

/** Generate all k-combinations of indices [0..n). */
function combinations<T>(arr: T[], k: number): T[][] {
  const out: T[][] = [];
  const n = arr.length;
  const idx = Array.from({ length: k }, (_, i) => i);
  if (k > n) return out;
  while (true) {
    out.push(idx.map((i) => arr[i]!));
    let i = k - 1;
    while (i >= 0 && idx[i] === n - k + i) i -= 1;
    if (i < 0) break;
    idx[i] += 1;
    for (let j = i + 1; j < k; j += 1) idx[j] = idx[j - 1]! + 1;
  }
  return out;
}

/** Score exactly 5 cards into a HandRank. */
function score5(cards: Card[]): HandRank {
  const ranks = cards.map((c) => c.rank).sort((a, b) => b - a); // desc
  const suits = cards.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);

  // rank counts
  const counts = new Map<Rank, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  // entries sorted by count desc, then rank desc
  const byCount = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  // straight detection (with wheel A-2-3-4-5)
  const uniqueDesc = [...new Set(ranks)].sort((a, b) => b - a);
  let straightHigh = 0;
  if (uniqueDesc.length === 5) {
    if (uniqueDesc[0]! - uniqueDesc[4]! === 4) straightHigh = uniqueDesc[0]!;
    // wheel: A,5,4,3,2 → treat as 5-high
    else if (
      uniqueDesc[0] === 14 &&
      uniqueDesc[1] === 5 &&
      uniqueDesc[2] === 4 &&
      uniqueDesc[3] === 3 &&
      uniqueDesc[4] === 2
    ) {
      straightHigh = 5;
    }
  }
  const isStraight = straightHigh > 0;

  function make(category: HandCategory, tiebreakers: number[]): HandRank {
    return { category, categoryValue: CATEGORY_VALUE[category], tiebreakers, best5: cards.slice() };
  }

  if (isStraight && isFlush) return make('straight-flush', [straightHigh]);
  if (byCount[0]![1] === 4) {
    const quad = byCount[0]![0];
    const kicker = byCount.find((e) => e[1] === 1)![0];
    return make('quads', [quad, kicker]);
  }
  if (byCount[0]![1] === 3 && byCount[1]![1] === 2) {
    return make('full-house', [byCount[0]![0], byCount[1]![0]]);
  }
  if (isFlush) return make('flush', ranks);
  if (isStraight) return make('straight', [straightHigh]);
  if (byCount[0]![1] === 3) {
    const trip = byCount[0]![0];
    const kickers = byCount
      .filter((e) => e[1] === 1)
      .map((e) => e[0])
      .sort((a, b) => b - a);
    return make('trips', [trip, ...kickers]);
  }
  if (byCount[0]![1] === 2 && byCount[1]![1] === 2) {
    const hi = Math.max(byCount[0]![0], byCount[1]![0]);
    const lo = Math.min(byCount[0]![0], byCount[1]![0]);
    const kicker = byCount.find((e) => e[1] === 1)![0];
    return make('two-pair', [hi, lo, kicker]);
  }
  if (byCount[0]![1] === 2) {
    const pair = byCount[0]![0];
    const kickers = byCount
      .filter((e) => e[1] === 1)
      .map((e) => e[0])
      .sort((a, b) => b - a);
    return make('pair', [pair, ...kickers]);
  }
  return make('high-card', ranks);
}

export function compareHands(a: HandRank, b: HandRank): number {
  if (a.categoryValue !== b.categoryValue) return a.categoryValue - b.categoryValue;
  const len = Math.max(a.tiebreakers.length, b.tiebreakers.length);
  for (let i = 0; i < len; i += 1) {
    const x = a.tiebreakers[i] ?? 0;
    const y = b.tiebreakers[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

/** Best 5-card hand from N>=5 cards. */
export function evaluateBest5(cards: Card[]): HandRank {
  if (cards.length < 5) throw new Error('evaluateBest5 needs >= 5 cards');
  if (cards.length === 5) return score5(cards);
  let best: HandRank | null = null;
  for (const combo of combinations(cards, 5)) {
    const hr = score5(combo);
    if (best === null || compareHands(hr, best) > 0) best = hr;
  }
  return best!;
}

/** Variant-aware. 'any' = best 5 of all. 'omaha' = exactly 2 hole + 3 board. */
export function evaluateFrom(holeCards: Card[], board: Card[], rule: 'any' | 'omaha'): HandRank {
  if (rule === 'any') return evaluateBest5([...holeCards, ...board]);
  // omaha: exactly 2 of hole × exactly 3 of board
  let best: HandRank | null = null;
  for (const h2 of combinations(holeCards, 2)) {
    for (const b3 of combinations(board, 3)) {
      const hr = score5([...h2, ...b3]);
      if (best === null || compareHands(hr, best) > 0) best = hr;
    }
  }
  if (best === null) throw new Error('evaluateFrom omaha: insufficient cards');
  return best;
}
```

- [ ] **Step 2: Write handEvaluator.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { evaluateBest5, compareHands } from './handEvaluator';
import type { Card, Suit } from './types';

function c(spec: string): Card {
  // e.g. "Ah", "Ts", "2c" — rank letter/number + suit letter
  const rankPart = spec.slice(0, spec.length - 1);
  const suit = spec[spec.length - 1] as Suit;
  const map: Record<string, number> = { T: 10, J: 11, Q: 12, K: 13, A: 14 };
  const rank = (map[rankPart] ?? parseInt(rankPart, 10)) as Card['rank'];
  return { rank, suit };
}
function hand(...specs: string[]): Card[] {
  return specs.map(c);
}

describe('evaluateBest5 categories', () => {
  it('detects a royal/straight flush', () => {
    expect(evaluateBest5(hand('Ah', 'Kh', 'Qh', 'Jh', 'Th')).category).toBe('straight-flush');
  });
  it('detects quads', () => {
    expect(evaluateBest5(hand('9h', '9d', '9c', '9s', '2h')).category).toBe('quads');
  });
  it('detects a full house', () => {
    expect(evaluateBest5(hand('9h', '9d', '9c', '2s', '2h')).category).toBe('full-house');
  });
  it('detects a flush', () => {
    expect(evaluateBest5(hand('Ah', 'Jh', '8h', '5h', '2h')).category).toBe('flush');
  });
  it('detects a straight', () => {
    expect(evaluateBest5(hand('9h', '8d', '7c', '6s', '5h')).category).toBe('straight');
  });
  it('detects the wheel straight (A-2-3-4-5) as 5-high', () => {
    const hr = evaluateBest5(hand('Ah', '2d', '3c', '4s', '5h'));
    expect(hr.category).toBe('straight');
    expect(hr.tiebreakers[0]).toBe(5);
  });
  it('detects trips', () => {
    expect(evaluateBest5(hand('9h', '9d', '9c', 'Ks', '2h')).category).toBe('trips');
  });
  it('detects two pair', () => {
    expect(evaluateBest5(hand('9h', '9d', '5c', '5s', '2h')).category).toBe('two-pair');
  });
  it('detects a pair', () => {
    expect(evaluateBest5(hand('9h', '9d', 'Kc', '5s', '2h')).category).toBe('pair');
  });
  it('detects high card', () => {
    expect(evaluateBest5(hand('Ah', 'Jd', '8c', '5s', '2h')).category).toBe('high-card');
  });
});

describe('evaluateBest5 best-of-7', () => {
  it('picks the flush out of 7 cards', () => {
    const hr = evaluateBest5(hand('Ah', 'Kh', 'Qh', '2h', '7h', '9d', '3c'));
    expect(hr.category).toBe('flush');
  });
  it('picks quads when the board pairs with pocket pair', () => {
    const hr = evaluateBest5(hand('9h', '9d', '9c', '9s', 'Kd', '2c', '3h'));
    expect(hr.category).toBe('quads');
  });
});

describe('compareHands', () => {
  it('flush beats straight', () => {
    const flush = evaluateBest5(hand('Ah', 'Jh', '8h', '5h', '2h'));
    const straight = evaluateBest5(hand('9h', '8d', '7c', '6s', '5h'));
    expect(compareHands(flush, straight)).toBeGreaterThan(0);
  });
  it('higher full house wins by trips rank', () => {
    const aces = evaluateBest5(hand('Ah', 'Ad', 'Ac', '2s', '2h'));
    const kings = evaluateBest5(hand('Kh', 'Kd', 'Kc', 'Qs', 'Qh'));
    expect(compareHands(aces, kings)).toBeGreaterThan(0);
  });
  it('one-pair resolved by kicker', () => {
    const aKing = evaluateBest5(hand('9h', '9d', 'Kc', '5s', '2h'));
    const aQueen = evaluateBest5(hand('9c', '9s', 'Qc', '5d', '2c'));
    expect(compareHands(aKing, aQueen)).toBeGreaterThan(0);
  });
  it('identical hands tie (0)', () => {
    const a = evaluateBest5(hand('Ah', 'Kh', 'Qh', 'Jh', 'Th'));
    const b = evaluateBest5(hand('As', 'Ks', 'Qs', 'Js', 'Ts'));
    expect(compareHands(a, b)).toBe(0);
  });
});
```

- [ ] **Step 3: Run + fix until green**

```bash
pnpm exec vitest run src/games/poker/_shared/handEvaluator.test.ts 2>&1 | tail -15
```

Expected: all pass. If a category mis-detects, the bug is almost always in `score5`'s count/straight logic — debug against the failing assertion.

### Task A.5: sidePots.ts + tests

**Files:** Create `src/games/poker/_shared/sidePots.ts`, `sidePots.test.ts`

- [ ] **Step 1: Write sidePots.ts**

```typescript
export interface SidePot {
  amount: number;
  eligibleSeatIds: number[];
}

export interface Contribution {
  seatId: number;
  committed: number;
  folded: boolean;
}

/** Build ordered pots (main first) from each seat's total hand contribution.
 *  Folded players' chips stay in the pots but they are never eligible to win. */
export function computeSidePots(contributions: Contribution[]): SidePot[] {
  const pots: SidePot[] = [];
  // distinct positive commitment levels, ascending
  const levels = [...new Set(contributions.map((c) => c.committed).filter((x) => x > 0))].sort(
    (a, b) => a - b,
  );
  let prev = 0;
  for (const level of levels) {
    const layer = level - prev;
    let amount = 0;
    const eligible: number[] = [];
    for (const c of contributions) {
      if (c.committed >= level) {
        amount += layer; // this seat contributes a full layer
        if (!c.folded) eligible.push(c.seatId);
      } else if (c.committed > prev) {
        amount += c.committed - prev; // partial (this seat is all-in below the level)
      }
    }
    if (amount > 0 && eligible.length > 0) {
      pots.push({ amount, eligibleSeatIds: eligible });
    } else if (amount > 0 && eligible.length === 0) {
      // everyone at this layer folded — fold the chips into the previous pot
      if (pots.length > 0) pots[pots.length - 1]!.amount += amount;
    }
    prev = level;
  }
  return pots;
}
```

- [ ] **Step 2: Write sidePots.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { computeSidePots } from './sidePots';

describe('computeSidePots', () => {
  it('single pot when all contribute equally', () => {
    const pots = computeSidePots([
      { seatId: 0, committed: 100, folded: false },
      { seatId: 1, committed: 100, folded: false },
      { seatId: 2, committed: 100, folded: false },
    ]);
    expect(pots).toHaveLength(1);
    expect(pots[0]!.amount).toBe(300);
    expect(pots[0]!.eligibleSeatIds.sort()).toEqual([0, 1, 2]);
  });

  it('one all-in for less creates a main + side pot', () => {
    // seat 0 all-in 50, seats 1+2 put in 200 each
    const pots = computeSidePots([
      { seatId: 0, committed: 50, folded: false },
      { seatId: 1, committed: 200, folded: false },
      { seatId: 2, committed: 200, folded: false },
    ]);
    // main pot: 50×3 = 150, eligible 0,1,2; side pot: 150×2 = 300, eligible 1,2
    expect(pots).toHaveLength(2);
    expect(pots[0]!.amount).toBe(150);
    expect(pots[0]!.eligibleSeatIds.sort()).toEqual([0, 1, 2]);
    expect(pots[1]!.amount).toBe(300);
    expect(pots[1]!.eligibleSeatIds.sort()).toEqual([1, 2]);
  });

  it('two all-ins at different amounts create three pots', () => {
    const pots = computeSidePots([
      { seatId: 0, committed: 50, folded: false },
      { seatId: 1, committed: 120, folded: false },
      { seatId: 2, committed: 300, folded: false },
    ]);
    // level 50: 50×3=150 elig {0,1,2}
    // level 120: 70×2 (seats1,2) + (seat0 already maxed at 50, contributes 0 more) = 140 elig {1,2}
    // level 300: 180×1 (seat2) + (seat1 maxed 120 contributes 0) = 180 elig {2}
    expect(pots).toHaveLength(3);
    expect(pots[0]).toEqual({ amount: 150, eligibleSeatIds: [0, 1, 2] });
    expect(pots[1]).toEqual({ amount: 140, eligibleSeatIds: [1, 2] });
    expect(pots[2]).toEqual({ amount: 180, eligibleSeatIds: [2] });
  });

  it('folded contributor stays in the pot but not eligible', () => {
    const pots = computeSidePots([
      { seatId: 0, committed: 100, folded: true },
      { seatId: 1, committed: 100, folded: false },
      { seatId: 2, committed: 100, folded: false },
    ]);
    expect(pots).toHaveLength(1);
    expect(pots[0]!.amount).toBe(300);
    expect(pots[0]!.eligibleSeatIds.sort()).toEqual([1, 2]);
  });
});
```

- [ ] **Step 3: Run + verify the arithmetic**

```bash
pnpm exec vitest run src/games/poker/_shared/sidePots.test.ts 2>&1 | tail -12
```

Expected: pass. The 3-pot test pins exact arithmetic — if it fails, trace the `layer`/`prev` accumulation.

### Task A.6: Full DoD + commit + open PR A

- [ ] **Step 1: DoD**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

All green. If only `AdminLotteryPage`/bingo flake fails, re-run.

- [ ] **Step 2: Commit + push + PR**

```bash
git add src/games/poker/_shared/types.ts src/games/poker/_shared/deck.ts src/games/poker/_shared/deck.test.ts src/games/poker/_shared/handEvaluator.ts src/games/poker/_shared/handEvaluator.test.ts src/games/poker/_shared/sidePots.ts src/games/poker/_shared/sidePots.test.ts
git commit -m "feat(poker): shared core — deck + hand evaluator + side pots (PR A)"
git push -u origin phase-13a-poker-pr-a
gh pr create --title "phase-13a(poker): PR A — shared core (deck + hand evaluator + side pots)" --body "PR A of Phase 13a. Pure reusable poker logic: deck (seeded), handEvaluator (best-5-of-7 brute force, compareHands), sidePots. ~50 tests. No UI/machine. Reusable by 13b/13c."
```

---

## PR B — AI engine (archetypes + decide)

**Branch:** `phase-13a-poker-pr-b` (off main after PR A merged)
**Scope:** `_shared/ai/` pure logic. ~30 tests.

### Task B.1: archetypes.ts

**Files:** Create `src/games/poker/_shared/ai/archetypes.ts`

- [ ] **Step 1: Branch + write archetypes.ts**

```bash
git checkout main && git pull origin main
git checkout -b phase-13a-poker-pr-b
```

```typescript
export type Archetype = 'rock' | 'station' | 'maniac' | 'shark';

export interface ArchetypeProfile {
  vpipThreshold: number;
  aggression: number;
  bluffFactor: number;
  cautiousness: number;
}

export const ARCHETYPES: Record<Archetype, ArchetypeProfile> = {
  rock: { vpipThreshold: 0.72, aggression: 0.45, bluffFactor: 0.04, cautiousness: 0.85 },
  station: { vpipThreshold: 0.4, aggression: 0.15, bluffFactor: 0.02, cautiousness: 0.2 },
  maniac: { vpipThreshold: 0.3, aggression: 0.85, bluffFactor: 0.35, cautiousness: 0.15 },
  shark: { vpipThreshold: 0.55, aggression: 0.6, bluffFactor: 0.18, cautiousness: 0.55 },
};

export const ARCHETYPE_NAMES: Record<Archetype, string> = {
  rock: 'Rock',
  station: 'Station',
  maniac: 'Maniac',
  shark: 'Shark',
};
```

### Task B.2: handStrength helper + decide.ts

**Files:** Create `src/games/poker/_shared/ai/decide.ts`

- [ ] **Step 1: Write decide.ts**

```typescript
import type { Card } from '../types';
import { evaluateBest5 } from '../handEvaluator';
import { ARCHETYPES, type Archetype } from './archetypes';

export interface DecisionContext {
  holeCards: Card[];
  board: Card[];
  street: 'preflop' | 'flop' | 'turn' | 'river';
  potSize: number;
  toCall: number;
  minRaise: number;
  stack: number;
  position: 'early' | 'late' | 'blinds';
  numActivePlayers: number;
  archetype: Archetype;
  rng: () => number;
}

export type Decision =
  | { action: 'fold' }
  | { action: 'check' }
  | { action: 'call' }
  | { action: 'raise'; amount: number };

/** Preflop hole-card strength, 0-1. Chen-formula-inspired. */
export function preflopStrength(holeCards: Card[]): number {
  const [a, b] = [holeCards[0]!, holeCards[1]!];
  const hi = Math.max(a.rank, b.rank);
  const lo = Math.min(a.rank, b.rank);
  const pair = a.rank === b.rank;
  const suited = a.suit === b.suit;
  const gap = hi - lo;
  // base from high card (scaled), pair bonus, suited bonus, connectedness
  let score = (hi - 2) / 12; // 0..1 from the high card
  if (pair)
    score = 0.5 + ((hi - 2) / 12) * 0.5; // pairs are strong: 0.5..1.0
  else {
    if (suited) score += 0.1;
    if (gap === 1) score += 0.08;
    else if (gap === 2) score += 0.04;
    score += (lo - 2) / 12 / 4; // small contribution from the low card
  }
  return Math.max(0, Math.min(1, score));
}

/** Postflop made-hand strength 0-1 from category + a small draw bonus. */
export function postflopStrength(holeCards: Card[], board: Card[]): number {
  const hr = evaluateBest5([...holeCards, ...board]);
  // categoryValue 0..8 → 0..1, weighted so even high-card isn't 0
  return Math.min(1, 0.15 + (hr.categoryValue / 8) * 0.85);
}

export function decide(ctx: DecisionContext): Decision {
  const profile = ARCHETYPES[ctx.archetype];
  const strength =
    ctx.street === 'preflop'
      ? preflopStrength(ctx.holeCards)
      : postflopStrength(ctx.holeCards, ctx.board);

  const canCheck = ctx.toCall === 0;

  // pot odds gate when facing a bet
  if (ctx.toCall > 0) {
    const potOdds = ctx.toCall / (ctx.potSize + ctx.toCall);
    const callThreshold = potOdds * (0.6 + profile.cautiousness * 0.8);
    if (strength < callThreshold) {
      // weak — usually fold, sometimes bluff-raise in good spots
      const goodSpot = ctx.position === 'late' && ctx.numActivePlayers <= 2;
      if (goodSpot && ctx.rng() < profile.bluffFactor) {
        return raiseOrAllIn(ctx, profile, strength);
      }
      return { action: 'fold' };
    }
  }

  // hand clears the threshold (or no bet to face)
  if (strength >= profile.vpipThreshold) {
    if (ctx.rng() < profile.aggression) {
      return raiseOrAllIn(ctx, profile, strength);
    }
    return canCheck ? { action: 'check' } : { action: 'call' };
  }

  // marginal: check if free, otherwise (already passed pot-odds) call, with rare bluff
  if (canCheck) {
    if (ctx.rng() < profile.bluffFactor) return raiseOrAllIn(ctx, profile, strength);
    return { action: 'check' };
  }
  return { action: 'call' };
}

function raiseOrAllIn(
  ctx: DecisionContext,
  profile: { aggression: number },
  strength: number,
): Decision {
  // size: pot-fraction scaled by strength + aggression, floored at minRaise total
  const target = ctx.currentBetTotal(ctx) + Math.round(ctx.potSize * (0.5 + strength * 0.5));
  const total = Math.max(ctx.toCall + ctx.minRaise, target);
  if (total >= ctx.stack) return { action: 'raise', amount: ctx.stack }; // all-in
  return { action: 'raise', amount: total };
}
```

NOTE: `raiseOrAllIn` references `ctx.currentBetTotal` which isn't on `DecisionContext`. Simplify: the "total bet" the AI is raising TO is `toCall` (to match) + a raise increment. Replace `raiseOrAllIn` with:

```typescript
function raiseOrAllIn(
  ctx: DecisionContext,
  _profile: { aggression: number },
  strength: number,
): Decision {
  const raiseIncrement = Math.max(ctx.minRaise, Math.round(ctx.potSize * (0.5 + strength * 0.5)));
  const total = ctx.toCall + raiseIncrement; // chips above current commit
  if (total >= ctx.stack) return { action: 'raise', amount: ctx.stack };
  return { action: 'raise', amount: total };
}
```

Here `amount` is the chips this seat puts in NOW (call portion + raise). The machine interprets `amount` as the total chips committed this action. Document this convention in a comment at the top of `decide.ts`:

```typescript
/** Decision.amount (for 'raise') = chips this seat commits THIS action
 *  (the call portion + the raise increment), capped at stack (all-in). */
```

- [ ] **Step 2: Write decide.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { decide, preflopStrength, type DecisionContext } from './decide';
import type { Card } from '../types';

function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function card(rank: Card['rank'], suit: Card['suit']): Card {
  return { rank, suit };
}
function ctx(over: Partial<DecisionContext>): DecisionContext {
  return {
    holeCards: [card(14, 'h'), card(14, 'd')],
    board: [],
    street: 'preflop',
    potSize: 30,
    toCall: 0,
    minRaise: 20,
    stack: 1000,
    position: 'late',
    numActivePlayers: 2,
    archetype: 'shark',
    rng: seededRng(1),
    ...over,
  };
}

describe('preflopStrength ordering', () => {
  it('AA > AKs > 72o', () => {
    const aa = preflopStrength([card(14, 'h'), card(14, 'd')]);
    const aks = preflopStrength([card(14, 'h'), card(13, 'h')]);
    const o72 = preflopStrength([card(7, 'h'), card(2, 'd')]);
    expect(aa).toBeGreaterThan(aks);
    expect(aks).toBeGreaterThan(o72);
  });
});

describe('decide legality', () => {
  it('never checks when facing a bet', () => {
    const d = decide(ctx({ toCall: 100, holeCards: [card(7, 'h'), card(2, 'd')] }));
    expect(d.action).not.toBe('check');
  });
  it('raise amount never exceeds stack', () => {
    for (let s = 0; s < 20; s += 1) {
      const d = decide(ctx({ stack: 80, potSize: 500, archetype: 'maniac', rng: seededRng(s) }));
      if (d.action === 'raise') expect(d.amount).toBeLessThanOrEqual(80);
    }
  });
  it('deterministic for a fixed seed', () => {
    expect(decide(ctx({ rng: seededRng(42) }))).toEqual(decide(ctx({ rng: seededRng(42) })));
  });
});

describe('archetype tendencies', () => {
  it('maniac raises more than rock with the same marginal hand', () => {
    let maniacRaises = 0;
    let rockRaises = 0;
    for (let s = 0; s < 50; s += 1) {
      const base = {
        holeCards: [card(11, 'h'), card(10, 'h')],
        toCall: 0,
        rng: seededRng(s),
      } as const;
      if (decide(ctx({ ...base, archetype: 'maniac' })).action === 'raise') maniacRaises += 1;
      if (decide(ctx({ ...base, archetype: 'rock', rng: seededRng(s) })).action === 'raise')
        rockRaises += 1;
    }
    expect(maniacRaises).toBeGreaterThan(rockRaises);
  });

  it('rock folds a weak hand to a bet; station calls more', () => {
    const weak = { holeCards: [card(8, 'h'), card(3, 'd')], toCall: 60, potSize: 100 } as const;
    let rockFolds = 0;
    let stationFolds = 0;
    for (let s = 0; s < 40; s += 1) {
      if (decide(ctx({ ...weak, archetype: 'rock', rng: seededRng(s) })).action === 'fold')
        rockFolds += 1;
      if (decide(ctx({ ...weak, archetype: 'station', rng: seededRng(s) })).action === 'fold')
        stationFolds += 1;
    }
    expect(rockFolds).toBeGreaterThan(stationFolds);
  });
});
```

- [ ] **Step 3: Run + tune**

```bash
pnpm exec vitest run src/games/poker/_shared/ai/decide.test.ts 2>&1 | tail -15
```

Expected: pass. If "maniac raises more than rock" fails, the archetype constants need a wider spread (maniac aggression up, rock down) — adjust in `archetypes.ts`. The four archetypes + engine structure are locked; only the constants may be tuned.

### Task B.3: Full DoD + commit + PR B

- [ ] **Step 1: DoD + commit + push + PR**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
git add src/games/poker/_shared/ai/
git commit -m "feat(poker): AI engine — personality archetypes + decision engine (PR B)"
git push -u origin phase-13a-poker-pr-b
gh pr create --title "phase-13a(poker): PR B — AI engine (archetypes + decide)" --body "PR B of Phase 13a. Pure, seeded AI: 4 archetypes (Rock/Station/Maniac/Shark) over a shared decision engine (hand strength + pot odds + bluff). AI never sees opponent cards. ~30 tests."
```

---

## PR C — Hold'em machine + holdemLogic + ADR-0041

**Branch:** `phase-13a-poker-pr-c` (off main after PR B merged)
**Scope:** `holdem/holdemLogic.ts` + `holdem/machine.ts` + placeholder HoldemPage + route + ADR-0041. ~50 tests. The hardest PR.

### Task C.1: Branch + ADR-0041

**Files:** Create `docs/adr/0041-poker-session-wallet-model.md`

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull origin main
git checkout -b phase-13a-poker-pr-c
```

- [ ] **Step 2: Write ADR-0041** (mirror the style of `docs/adr/0040-lottery-as-system.md`)

```markdown
# ADR-0041: Poker buy-in/cash-out session wallet model

- Status: Accepted
- Date: 2026-05-20
- Deciders: @adamzspare

## Context

Every game so far writes exactly one `rounds` row per game via `wallet.settleRound`,
and every `wallet.placeBet` corresponds 1:1 to that settle (ADR-0016). Poker breaks
this: a player buys into a table, plays MANY hands with a persistent stack, may rebuy
(another debit) after busting, and finally cashes out their remaining stack — all as
one "session".

## Decision

A poker session is ONE `rounds` row. The wallet sees multiple debits (the initial
buy-in + each rebuy via `placeBet`) and a single credit (the final stack via
`settleRound`). Only the FIRST `placeBet` returns the session handle used for the
final `settleRound`. Rebuy amounts accumulate into a `totalBoughtIn` counter held in
machine context. The settle records `stake = totalBoughtIn`, `payout = finalStack`,
`won = finalStack > totalBoughtIn`. Net wallet effect: `-buyIn -rebuy1 ... +finalStack`,
which is exactly correct.

Per-hand chip movement happens entirely in machine context — the wallet is untouched
between SIT DOWN and LEAVE TABLE (except rebuys).

## Consequences

- Stats treat a session as one round (a +5000 winning session is one high-payout row).
  Acceptable for a session-based game; per-hand granularity is out of scope.
- Closing the tab mid-session leaves the session handle open and the in-memory stack
  lost. Mitigation: best-effort `beforeunload` settle with the current stack; otherwise
  the buy-in is forfeit. Documented limitation.
- This is the first game where wallet debits are not 1:1 with the rounds row. Future
  session-based games (multi-hand blackjack shoes, etc.) can follow this pattern.
```

### Task C.2: holdemLogic.ts — pure helpers

**Files:** Create `src/games/poker/holdem/holdemLogic.ts`, `holdemLogic.test.ts`

- [ ] **Step 1: Write holdemLogic.ts** — pure functions the machine composes. Define:

```typescript
import type { Card } from '../_shared/types';
import { deckFromSeed } from '../_shared/deck';
import { evaluateBest5, compareHands } from '../_shared/handEvaluator';
import { computeSidePots, type Contribution } from '../_shared/sidePots';

export type Street = 'preflop' | 'flop' | 'turn' | 'river';
export type SeatStatus = 'active' | 'folded' | 'all-in' | 'busted' | 'empty';

/** Deal hole cards + prepare the board burn/deal order from a seeded deck.
 *  Returns hole cards per seat index + the 5 community cards (revealed progressively). */
export function dealHand(seed: string, numSeats: number): { holeCards: Card[][]; board: Card[] } {
  const deck = deckFromSeed(seed);
  const holeCards: Card[][] = Array.from({ length: numSeats }, () => []);
  let idx = 0;
  // two cards each, dealt one at a time around the table (standard)
  for (let round = 0; round < 2; round += 1) {
    for (let s = 0; s < numSeats; s += 1) {
      holeCards[s]!.push(deck[idx]!);
      idx += 1;
    }
  }
  // burn + flop(3), burn + turn(1), burn + river(1)
  idx += 1; // burn
  const board = [deck[idx]!, deck[idx + 1]!, deck[idx + 2]!];
  idx += 3;
  idx += 1; // burn
  board.push(deck[idx]!);
  idx += 1;
  idx += 1; // burn
  board.push(deck[idx]!);
  return { holeCards, board };
}

/** Index of the next seat (clockwise) with status 'active' (can still act). */
export function nextActiveSeat(seats: { status: SeatStatus }[], from: number): number {
  const n = seats.length;
  for (let step = 1; step <= n; step += 1) {
    const i = (from + step) % n;
    if (seats[i]!.status === 'active') return i;
  }
  return from; // no other active seat
}

/** Showdown: given live seats' hole cards + board + contributions, returns
 *  the chips awarded per seatId. Splits ties; respects side-pot eligibility. */
export function resolveShowdown(input: {
  board: Card[];
  seats: { seatId: number; holeCards: Card[]; committed: number; folded: boolean }[];
}): Record<number, number> {
  const pots = computeSidePots(
    input.seats.map<Contribution>((s) => ({
      seatId: s.seatId,
      committed: s.committed,
      folded: s.folded,
    })),
  );
  const ranks = new Map<number, ReturnType<typeof evaluateBest5>>();
  for (const s of input.seats) {
    if (!s.folded) ranks.set(s.seatId, evaluateBest5([...s.holeCards, ...input.board]));
  }
  const awards: Record<number, number> = {};
  for (const pot of pots) {
    // best eligible hand(s)
    let winners: number[] = [];
    let bestRank: ReturnType<typeof evaluateBest5> | null = null;
    for (const seatId of pot.eligibleSeatIds) {
      const r = ranks.get(seatId);
      if (!r) continue;
      if (bestRank === null || compareHands(r, bestRank) > 0) {
        bestRank = r;
        winners = [seatId];
      } else if (compareHands(r, bestRank) === 0) {
        winners.push(seatId);
      }
    }
    if (winners.length === 0) continue;
    const share = Math.floor(pot.amount / winners.length);
    let remainder = pot.amount - share * winners.length;
    for (const w of winners) {
      awards[w] = (awards[w] ?? 0) + share;
    }
    // odd chip(s) go to the first winner(s) clockwise — simplest deterministic rule
    let i = 0;
    while (remainder > 0) {
      awards[winners[i % winners.length]!] = (awards[winners[i % winners.length]!] ?? 0) + 1;
      remainder -= 1;
      i += 1;
    }
  }
  return awards;
}
```

- [ ] **Step 2: Write holdemLogic.test.ts** — test `dealHand` (correct counts, no card reused across hole+board, deterministic by seed), `nextActiveSeat` (skips folded/all-in/busted, wraps), `resolveShowdown` (single winner takes pot; split on tie with odd-chip rule; side-pot eligibility — a short all-in can only win the main pot). Provide ~15 tests with hand-built fixtures.

```typescript
import { describe, it, expect } from 'vitest';
import { dealHand, nextActiveSeat, resolveShowdown } from './holdemLogic';
import type { Card } from '../_shared/types';

describe('dealHand', () => {
  it('deals 2 hole cards per seat + 5 board, all distinct', () => {
    const { holeCards, board } = dealHand('seed.1', 3);
    expect(holeCards).toHaveLength(3);
    holeCards.forEach((h) => expect(h).toHaveLength(2));
    expect(board).toHaveLength(5);
    const all = [...holeCards.flat(), ...board];
    const keys = new Set(all.map((c) => `${c.rank}${c.suit}`));
    expect(keys.size).toBe(all.length); // no reuse
  });
  it('is deterministic by seed', () => {
    expect(dealHand('s', 4)).toEqual(dealHand('s', 4));
  });
});

describe('nextActiveSeat', () => {
  it('skips non-active seats and wraps', () => {
    const seats = [
      { status: 'folded' as const },
      { status: 'active' as const },
      { status: 'all-in' as const },
      { status: 'active' as const },
    ];
    expect(nextActiveSeat(seats, 1)).toBe(3);
    expect(nextActiveSeat(seats, 3)).toBe(1);
  });
});

describe('resolveShowdown', () => {
  function c(r: Card['rank'], s: Card['suit']): Card {
    return { rank: r, suit: s };
  }
  it('awards the whole pot to the best hand', () => {
    const awards = resolveShowdown({
      board: [c(14, 'c'), c(13, 'd'), c(2, 'h'), c(7, 's'), c(9, 'c')],
      seats: [
        { seatId: 0, holeCards: [c(14, 'h'), c(14, 'd')], committed: 100, folded: false }, // trip aces
        { seatId: 1, holeCards: [c(13, 'h'), c(13, 's')], committed: 100, folded: false }, // trip kings
      ],
    });
    expect(awards[0]).toBe(200);
    expect(awards[1]).toBeUndefined();
  });
  it('splits a tie and gives the odd chip to the first winner', () => {
    const awards = resolveShowdown({
      board: [c(14, 'c'), c(13, 'd'), c(12, 'h'), c(11, 's'), c(10, 'c')], // board plays: broadway
      seats: [
        { seatId: 0, holeCards: [c(2, 'h'), c(3, 'd')], committed: 51, folded: false },
        { seatId: 1, holeCards: [c(4, 'h'), c(5, 's')], committed: 50, folded: false },
      ],
    });
    // pot 101, both play the board (A-high straight) → split 50/50 + 1 odd chip
    expect(awards[0]! + awards[1]!).toBe(101);
    expect(Math.abs(awards[0]! - awards[1]!)).toBe(1);
  });
  it('short all-in only wins the main pot', () => {
    const awards = resolveShowdown({
      board: [c(2, 'c'), c(3, 'd'), c(4, 'h'), c(8, 's'), c(9, 'c')],
      seats: [
        { seatId: 0, holeCards: [c(14, 'h'), c(14, 'd')], committed: 50, folded: false }, // best hand, short
        { seatId: 1, holeCards: [c(13, 'h'), c(13, 's')], committed: 200, folded: false },
        { seatId: 2, holeCards: [c(12, 'h'), c(12, 's')], committed: 200, folded: false },
      ],
    });
    // main pot 150 → seat 0 (aces). side pot 300 → seat 1 (kings beat queens)
    expect(awards[0]).toBe(150);
    expect(awards[1]).toBe(300);
    expect(awards[2]).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run**

```bash
pnpm exec vitest run src/games/poker/holdem/holdemLogic.test.ts 2>&1 | tail -15
```

### Task C.3: machine.ts — context, events, lifecycle

**Files:** Create `src/games/poker/holdem/machine.ts`

- [ ] **Step 1: Write the machine** following spec §6. Key structure (full types + actions; this is the longest file — implement carefully against the spec's context/events):
  - `setup({ types, actions, guards }).createMachine(...)`.
  - States: `idle`, `posting_blinds`, `betting`, `advance_street`, `showdown`, `award_uncontested`, `hand_complete`, `bust_prompt`, `session_over`.
  - Actions: `setupSession` (from SIT_DOWN-equivalent START via context init — but session init happens via the page passing buyIn/tableSize/stakes when constructing the machine; use an `input` to `createMachine` or a `START_SESSION` event), `startHand` (deal via `dealHand`, post blinds, set button + toActSeat), `applyPlayerAction`, `applyPlayerRaise`, `applyAiAction`, `advanceStreet`, `runShowdown` (via `resolveShowdown`), `awardUncontested`, `moveButton`, `flagBustedAndReseatHooks`, `applyRebuy`, `recordLeave`.
  - Guards: `bettingRoundClosed`, `onlyOneLive`, `streetIsRiver`, `playerBusted`.

  Because this file is large, implement it incrementally: get `idle → posting_blinds → betting` working first (test blind posting), then betting-round closure, then street advance, then showdown. Commit after each green sub-step if you like.

  Critical correctness points (from spec §6):
  - Heads-up: button posts SB and acts first preflop, last postflop.
  - Betting round closes when all live non-all-in seats have matched `currentBet` or folded AND action returned to `lastAggressorSeat` (or checked around).
  - `AI_ACTION` is validated: clamp raise to `[minRaise+toCall, stack]`; over-stack → all-in; illegal check when `toCall>0` → treat as call.
  - Showdown writes `handResult` for the UI.

- [ ] **Step 2: Write machine.test.ts** (~50 tests) — seeded decks + scripted actions. Cover every bullet in spec §10 "PR C". Machine tests feed `AI_ACTION` directly (never call `decide`). Example skeleton:

```typescript
import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { holdemMachine } from './machine';
// build an actor with input { buyIn, tableSize, stakes, sessionId, aiArchetypes }
// drive START_HAND, assert blinds posted + hole cards dealt + toActSeat correct
// drive scripted PLAYER_ACTION / AI_ACTION through a full hand to showdown
// assert stacks update per resolveShowdown
```

Provide the full set of assertions matching spec §10. (The implementer writes these against the actual machine API they build — keep each test small + seeded.)

- [ ] **Step 3: Run machine tests until green**

```bash
pnpm exec vitest run src/games/poker/holdem/machine.test.ts 2>&1 | tail -20
```

### Task C.4: Placeholder HoldemPage + routes

**Files:** Create `src/games/poker/holdem/HoldemPage.tsx` (placeholder), modify `src/router.tsx`

- [ ] **Step 1: Placeholder page**

```typescript
import type { JSX } from 'react';
export default function HoldemPage(): JSX.Element {
  return <div className="p-8 text-white"><p className="text-xs text-white/50">Texas Hold'em — UI in PR D.</p></div>;
}
```

- [ ] **Step 2: Add routes** — `grep -n "lazy(" src/router.tsx`, add:

```typescript
const HoldemPage = lazy(() => import('@/games/poker/holdem/HoldemPage'));
```

and a `/play/poker/holdem` route mirroring the existing game-route Suspense pattern. (The `/play/poker` modal route comes in PR E.)

- [ ] **Step 3: DoD + commit + PR C**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
git add src/games/poker/holdem/ src/router.tsx docs/adr/0041-poker-session-wallet-model.md
git commit -m "feat(poker): Hold'em machine + holdemLogic + ADR-0041 (PR C)"
git push -u origin phase-13a-poker-pr-c
gh pr create --title "phase-13a(poker): PR C — Hold'em machine + holdemLogic + ADR-0041" --body "PR C of Phase 13a. holdemLogic (dealHand, nextActiveSeat, resolveShowdown) + XState machine (hand + session lifecycle, betting-round closure, side-pot showdown, heads-up button-is-SB, rebuy, leave). ADR-0041 documents the buy-in/cash-out session wallet model. Placeholder HoldemPage + /play/poker/holdem route. ~65 tests."
```

---

## PR D — Hold'em UI (full play surface)

**Branch:** `phase-13a-poker-pr-d` (off main after PR C merged)
**Scope:** PlayingCard + all Hold'em components + full HoldemPage wallet/AI bridge. Playable via direct URL. ~40 tests.

### Task D.1: PlayingCard.tsx (ported card visual)

**Files:** Create `src/games/poker/_shared/PlayingCard.tsx`, `PlayingCard.test.tsx`

- [ ] **Step 1: Read the blackjack card to port its visual**

```bash
cat src/games/blackjack/Card.tsx
```

- [ ] **Step 2: Write `PlayingCard.tsx`** — replicate blackjack's gradient/border/font/pinstripe-back tokens, adapted to the poker `Card` type (`{ rank: 2-14, suit: 'c'|'d'|'h'|'s' }`). Map rank 11-14 → J/Q/K/A and suit letters → ♣♦♥♠ glyphs. Props: `card: Card | null`, `faceDown?: boolean`, `size?: 'table' | 'hole' | 'mini'`, `highlight?: boolean`. Red for d/h, white for c/s, neon glow + gold border per the existing style.
- [ ] **Step 3: Write PlayingCard.test.tsx** — renders rank+suit glyph; face-down shows the pinstripe back (no rank); highlight adds the gold-glow class. ~5 tests.
- [ ] **Step 4: Run.**

### Task D.2: Seat + CommunityBoard + BettingControls + SetupPanel + SessionBar + ShowdownReveal

For each component below: write the `.tsx`, then a focused `.test.tsx`, then run. Follow spec §8 for behaviour. Each is mechanical given the spec — keep them small and `data-*`-attributed for testability.

- [ ] **Step 1: `Seat.tsx`** — name/archetype/"YOU", stack (tabular-nums), two `PlayingCard`s (face-up for you, face-down for AI until `revealed`), dealer/SB/BB markers, acting glow (cyan ring), FOLDED/ALL-IN/BUSTED states, last-action label. Test: renders stack, shows face-down AI cards, acting ring via `data-acting`.
- [ ] **Step 2: `CommunityBoard.tsx`** — up to 5 `PlayingCard`s + pot total; Framer Motion flip per street, `useReducedMotion` → instant. Test: renders N board cards + pot text.
- [ ] **Step 3: `BettingControls.tsx`** — FOLD / (CHECK if `toCall===0` else CALL {toCall}) / RAISE with slider [minRaise..stack] + quick buttons (½/¾/pot/all-in) + live total. Disabled when `!isYourTurn`. Fires `onFold/onCheck/onCall/onRaise(amount)`. Test: CHECK only when toCall=0; slider clamps; off-turn disabled; raise fires with amount.
- [ ] **Step 4: `SetupPanel.tsx`** — table size (2-6 radio), stakes tier (Low/Mid/High), buy-in slider (40-100 BB of tier), SIT DOWN (disabled until wallet hydrated + balance ≥ min). Test: tier changes buy-in range; SIT DOWN disabled when poor; fires onSitDown with {tableSize, stakes, buyIn}.
- [ ] **Step 5: `SessionBar.tsx`** — session net (green/red), hands played, stack vs totalBoughtIn, LEAVE TABLE (disabled mid-hand w/ tooltip). Test: LEAVE disabled when `inHand`; net colour.
- [ ] **Step 6: `ShowdownReveal.tsx`** — given `handResult`, flips live AI cards, highlights winners' best5 (gold), shows category text + split amounts. Test: renders winner category; highlights best5 cards.

### Task D.3: PokerTable.tsx + HoldemPage.tsx (orchestrator)

**Files:** Create `PokerTable.tsx`; replace `HoldemPage.tsx`; create `HoldemPage.test.tsx`

- [ ] **Step 1: `PokerTable.tsx`** — row-based layout (spec §8): AI `Seat`s across the top, `CommunityBoard` centred, your `Seat` + `BettingControls` bottom, `SessionBar` right rail. Pure presentational; takes machine snapshot + callbacks.

- [ ] **Step 2: `HoldemPage.tsx`** — the orchestrator. Key responsibilities:
  - `useMachine(holdemMachine)` with session input gathered from SetupPanel.
  - Wallet bridge: SIT DOWN → `placeBet(buyIn)` (capture session handle in a ref) → send session-start; REBUY → `placeBet(rebuy)` → send `REBUY`; LEAVE → compute `totalBoughtIn`/`finalStack` → `settleRound(sessionHandle, ...)` with `details` per spec §7 → machine `session_over`.
  - **AI turn driver** `useEffect`: when `snapshot.context.toActSeat` is an AI seat and state is `betting`, build a `DecisionContext` from context, call `decide(ctx)` after a seeded "thinking" delay (`useReducedMotion` → ~0; else 600-1200ms via `setTimeout`), then `send({ type: 'AI_ACTION', seatId, decision })`. Cleanup clears the timeout.
  - `beforeunload` best-effort settle (per ADR-0041): on unload, if a session is open, attempt a synchronous settle with the current stack.
  - Renders SetupPanel (pre-sit) → PokerTable (seated) → session-over summary card.
  - RNG: seed a `mulberry32` per session for AI thinking-jitter + any UI randomness (no `Math.random`).

- [ ] **Step 3: `HoldemPage.test.tsx`** — e2e with fake-indexeddb + wallet hydration + a seeded deck + scripted/auto AI:
  - Sit down (table size 2, Low stakes) → assert SIT DOWN debits wallet + table renders.
  - Play one hand to completion with the AI driver running (fake timers) → assert stacks change.
  - LEAVE TABLE → assert a `rounds` row written with `game: 'poker'`, `stake === totalBoughtIn`, `payout === finalStack`, `details.variant === 'holdem'`.
  - Mock `useReducedMotion` true to zero the thinking delay.

- [ ] **Step 4: Manual smoke** (if browser): `/play/poker/holdem` → sit → play hands → leave. Verify cards match blackjack/baccarat style, betting slider works, showdown reveals. If headless, note it.

- [ ] **Step 5: DoD + commit + PR D**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
git add src/games/poker/
git commit -m "feat(poker): Hold'em UI + wallet/AI bridge (PR D)"
git push -u origin phase-13a-poker-pr-d
gh pr create --title "phase-13a(poker): PR D — Hold'em UI (full play surface)" --body "PR D of Phase 13a. PlayingCard (ported blackjack visual) + Seat + CommunityBoard + BettingControls + SetupPanel + SessionBar + ShowdownReveal + PokerTable + full HoldemPage (wallet bridge + AI turn driver + beforeunload settle). Playable end-to-end via /play/poker/holdem. ~40 tests."
```

---

## PR E — Variant chooser + nav + enum + BUILD_GUIDE

**Branch:** `phase-13a-poker-pr-e` (off main after PR D merged)

### Task E.1: Round.game enum + GAME_LABELS

- [ ] **Step 1: Branch + extend enum** — `src/db/schema.ts`: add `| 'poker'` to `Round.game`.
- [ ] **Step 2: Add GAME_LABELS** — `StatsPerGamePage.tsx` (`poker: 'Poker'`), `LeaderboardPerGamePage.tsx` (`poker: 'POKER'`). (Typecheck forces these; same as Plinko.)
- [ ] **Step 3: typecheck.**

### Task E.2: PokerVariantModal

**Files:** Create `src/games/poker/_shared/PokerVariantModal.tsx`, test

- [ ] **Step 1: Write modal** — mirror `BingoVariantModal.tsx`. Three cards: **Texas Hold'em** (active → `navigate('/play/poker/holdem')`), **Five-Card Draw** + **Omaha** (greyed, "COMING SOON" badge, non-clickable). ESC/backdrop close.
- [ ] **Step 2: Test** — renders 3 options, only Hold'em navigable, ESC closes. ~4 tests.

### Task E.3: Routing + nav

- [ ] **Step 1: `/play/poker` route** — hosts the modal (or redirects to /lobby if hit directly with no further path); `/play/poker/holdem` already added in PR C.
- [ ] **Step 2: Sidebar** — add `{ to: '/play/poker', icon: '♠️', label: 'Poker' }` to GAMES.
- [ ] **Step 3: CabinetCarousel** — Poker cabinet opens `PokerVariantModal` (button, not Link — mirror Bingo's cabinet).
- [ ] **Step 4: StatsLeftRail** TABS + SLUG; **StatsPage** + **LeaderboardPage** TITLES gain `poker`.
- [ ] **Step 5: Update nav count assertions** in `Sidebar.test.tsx` + `StatsLeftRail.test.tsx`; add Poker assertions.

### Task E.4: BUILD_GUIDE §10.8 + roadmap row

- [ ] **Step 1: Add §10.8 Poker — Texas Hold'em** after §10.7 (Plinko). Summarise: configurable 2-6, No-Limit, tiered stakes, buy-in/cash-out session + rebuy, archetype AI, shared `_shared/` infra for 13b/13c, ADR-0041. Reference spec + plan paths.
- [ ] **Step 2: Add Phase 13a roadmap row** to §12 after the Phase 12 row.

### Task E.5: DoD + commit + PR E

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
git add src/db/schema.ts src/games/poker/_shared/PokerVariantModal.tsx src/games/poker/_shared/PokerVariantModal.test.tsx src/router.tsx src/components/Sidebar.tsx src/components/Sidebar.test.tsx src/pages/lobby/CabinetCarousel.tsx src/pages/stats/ src/pages/leaderboard/ BUILD_GUIDE.md
git commit -m "feat(poker): variant chooser + nav + enum + BUILD_GUIDE (PR E)"
git push -u origin phase-13a-poker-pr-e
gh pr create --title "phase-13a(poker): PR E — variant chooser + nav + enum + BUILD_GUIDE" --body "PR E of Phase 13a. PokerVariantModal (Hold'em active, Draw/Omaha coming-soon), /play/poker routing, Round.game enum + GAME_LABELS, sidebar + lobby cabinet + stats/leaderboard nav, BUILD_GUIDE §10.8."
```

---

## PR F — Release

**Branch:** none (controller does this post-PR-E-merge)

### Task F.1: Tag + Release + memory

- [ ] **Step 1: Sync main after PR E merge.**

```bash
git checkout main && git pull origin main
```

- [ ] **Step 2: Tag**

```bash
git tag -a v0.13a-texas-holdem -m "Phase 13a: No-Limit Texas Hold'em + shared poker infra"
git push origin v0.13a-texas-holdem
```

- [ ] **Step 3: GitHub Release** `v0.13a-texas-holdem` — highlights: configurable 2-6 NLHE, tiered stakes, buy-in/cash-out session + rebuy, 4-archetype AI, shared poker infra (deck/handEvaluator/sidePots/ai) for 13b/13c, ADR-0041, cards match blackjack/baccarat. List PRs A-E + test delta.
- [ ] **Step 4: Memory snapshot** — update `project_localgamble_status.md`: top entry `v0.13a-texas-holdem`, "where we are", next phase 13b (Five-Card Draw — reuses `_shared/` + adds a draw/discard street), architectural milestones (shared poker infra, buy-in/cash-out session per ADR-0041, brute-force hand evaluator, archetype AI engine). Append Phase 13a deferred items to `localgamble-deferred-features`.

---

## Self-review checklist

After PR F:

- [ ] Spec coverage: §2-§9 each map to ≥1 task.
- [ ] No placeholders.
- [ ] Type consistency: `Card`, `HandRank`, `Decision`, `DecisionContext`, `Archetype`, `SeatState`, `PokerContext`, `SidePot`, `evaluateBest5`, `compareHands`, `computeSidePots`, `decide`, `dealHand`, `resolveShowdown`, `holdemMachine` consistent across tasks.
- [ ] Manual smoke: all stakes tiers, 2 + 6 player tables, all-in side pots, rebuy, leave-and-settle.
- [ ] Cards visually match blackjack/baccarat.
- [ ] /stats + /leaderboard show poker after a session.
