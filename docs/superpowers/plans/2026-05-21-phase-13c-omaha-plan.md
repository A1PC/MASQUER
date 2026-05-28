# Phase 13c — Omaha Hold'em Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** No-Limit Omaha Hold'em (2-6 players vs archetype AI) as a near-clone of Texas Hold'em — community board, flop/turn/river, blinds, side pots, buy-in/cash-out session — with 4 hole cards, the mandatory exactly-2-hole+3-board showdown (`evaluateFrom(...,'omaha')`, already built in 13a), and a new `decideOmaha` AI.

**Architecture:** New `src/games/poker/omaha/` sibling reusing `_shared/` (deck, handEvaluator incl. `evaluateFrom 'omaha'`, sidePots, archetypes, PlayingCard, PokerVariantModal). New `decideOmaha` in `_shared/ai/`. The machine + page + UI are clones of the Hold'em equivalents with three diffs: deal 4 hole cards, evaluate via `evaluateFrom(...,'omaha')`, AI via `decideOmaha`. Hold'em + Draw code is NOT modified — Hold'em's `BettingControls`/`SessionBar`/`CommunityBoard`/`stakesConfig` are imported; `Seat`/`SetupPanel`/`ShowdownReveal` thin-forked only if they assume 2 hole cards.

**Tech Stack:** TypeScript 5, React 18, Vite 5, Tailwind 3, XState v5, @xstate/react 6, Framer Motion 12, Vitest 2, RTL, fake-indexeddb.

**Spec:** `docs/superpowers/specs/2026-05-21-phase-13c-omaha-design.md` (PR #177).

**Rollout:** 4 PRs, branches `phase-13c-omaha-pr-{a..d}`. Each merges before the next. No `Round.game`/commitlint/ADR changes.

**Known CI flake:** none (AdminLotteryPage fixed in #169). Re-run once if an unrelated file flakes.

---

## Reference: the Hold'em pieces this phase clones / reuses

Read these first — Omaha's machine/logic/page are near-verbatim clones:

- `src/games/poker/holdem/holdemLogic.ts` — `dealHand` (deals 2; Omaha deals 4), `nextActiveSeat`, `resolveShowdown` (uses `evaluateBest5`; Omaha uses `evaluateFrom(...,'omaha')`).
- `src/games/poker/holdem/machine.ts` — the full state machine (blinds, betting closure, heads-up, street progression, side-pot showdown, session lifecycle, `MachineInput`/`PokerEvent`/`PokerContext`/`SeatState`/`HandResult`). Omaha clones this with a 4-card deal + omaha showdown.
- `src/games/poker/holdem/HoldemPage.tsx` — session-keyed mount, wallet bridge, AI driver, `beforeunload`. Omaha clones it, swapping `decide`→`decideOmaha` (with the real street, no mapping trick).
- `src/games/poker/holdem/{BettingControls,SessionBar,CommunityBoard,Seat,SetupPanel,ShowdownReveal,PokerTable,stakesConfig}.tsx`.
- `src/games/poker/_shared/ai/decide.ts` — the archetype/pot-odds/raise-sizing structure `decideOmaha` mirrors; `preflopStrength`/`postflopStrength` (the strength functions Omaha replaces).
- `src/games/poker/_shared/handEvaluator.ts` — `evaluateFrom(holeCards, board, 'omaha')` already exists + tested.

---

## PR A — decideOmaha + omahaLogic (pure)

**Branch:** `phase-13c-omaha-pr-a`
**Scope:** `_shared/ai/decideOmaha.ts` + `omaha/omahaLogic.ts` + tests. No machine, no UI.
**DoD:** lint + typecheck + vitest + build green. ~37 tests.

### Task A.1: Branch + decideOmaha

**Files:** Create `src/games/poker/_shared/ai/decideOmaha.ts`

- [ ] **Step 1: Branch + read `decide.ts`**

```bash
git checkout main && git pull origin main
git checkout -b phase-13c-omaha-pr-a
cat src/games/poker/_shared/ai/decide.ts
```

- [ ] **Step 2: Write `decideOmaha.ts`** — mirror `decide`'s archetype/pot-odds/raise-sizing body, swapping the strength source. Use `decide.ts` as the structural template; only the strength functions differ:

```typescript
import type { Card } from '../types';
import { evaluateFrom } from '../handEvaluator';
import { ARCHETYPES, type Archetype } from './archetypes';
import type { DecisionContext, Decision } from './decide';

/** 4-card Omaha preflop strength, 0-1.
 *  Rewards high pairs, double-suited (two suits each appearing twice),
 *  connectedness (small rank gaps among the 4), and high cards. Penalises
 *  danglers (an isolated low card) and trips/quads in hand (dead cards —
 *  you can only ever use 2 hole cards). */
export function omahaPreflopStrength(holeCards: Card[]): number {
  const ranks = holeCards.map((c) => c.rank).sort((a, b) => b - a);
  const suits = holeCards.map((c) => c.suit);

  // high-card component (0-1): average of the four ranks scaled from [2..14]
  const avgRank = ranks.reduce((s, r) => s + r, 0) / ranks.length;
  let score = (avgRank - 2) / 12 / 2; // up to 0.5 from card height

  // rank-multiplicity
  const counts = new Map<number, number>();
  ranks.forEach((r) => counts.set(r, (counts.get(r) ?? 0) + 1));
  const mult = [...counts.values()].sort((a, b) => b - a);
  if (mult[0] === 2) score += 0.12 + ((ranks.find((r) => counts.get(r) === 2)! - 2) / 12) * 0.1; // a pair (higher = better)
  if (mult[0] === 2 && mult[1] === 2) score += 0.06; // double-paired
  if (mult[0] >= 3) score -= 0.18; // trips/quads in hand = dead cards

  // double-suited: two suits each appearing exactly twice
  const suitCounts = new Map<string, number>();
  suits.forEach((s) => suitCounts.set(s, (suitCounts.get(s) ?? 0) + 1));
  const suitMult = [...suitCounts.values()].sort((a, b) => b - a);
  if (suitMult[0] === 2 && suitMult[1] === 2)
    score += 0.12; // double-suited
  else if (suitMult[0] === 2)
    score += 0.05; // single-suited
  else if (suitMult[0] >= 3) score -= 0.05; // 3+ of one suit = a suit blocker

  // connectedness: reward small gaps among distinct ranks
  const distinct = [...new Set(ranks)].sort((a, b) => a - b);
  let connectBonus = 0;
  for (let i = 1; i < distinct.length; i += 1) {
    const gap = distinct[i]! - distinct[i - 1]!;
    if (gap === 1) connectBonus += 0.05;
    else if (gap === 2) connectBonus += 0.02;
  }
  score += Math.min(0.15, connectBonus);

  // dangler penalty: a lowest card far from the rest
  if (distinct.length >= 2 && distinct[1]! - distinct[0]! >= 5) score -= 0.06;

  return Math.max(0, Math.min(1, score));
}

/** Omaha postflop strength, 0-1: best legal hand under the exactly-2+3 rule. */
export function omahaPostflopStrength(holeCards: Card[], board: Card[]): number {
  const hr = evaluateFrom(holeCards, board, 'omaha');
  return Math.min(1, 0.12 + (hr.categoryValue / 8) * 0.88);
}

/** Decide an Omaha betting action. Reuses the archetype profile + pot-odds gate +
 *  raise-sizing structure from `decide`, but with Omaha strength. Never returns an
 *  illegal action. */
export function decideOmaha(ctx: DecisionContext): Decision {
  const profile = ARCHETYPES[ctx.archetype];
  const strength =
    ctx.street === 'preflop'
      ? omahaPreflopStrength(ctx.holeCards)
      : omahaPostflopStrength(ctx.holeCards, ctx.board);

  const canCheck = ctx.toCall === 0;

  if (ctx.toCall > 0) {
    const potOdds = ctx.toCall / (ctx.potSize + ctx.toCall);
    const callThreshold = potOdds * (0.6 + profile.cautiousness * 0.8);
    if (strength < callThreshold) {
      const goodSpot = ctx.position === 'late' && ctx.numActivePlayers <= 2;
      if (goodSpot && ctx.rng() < profile.bluffFactor) return raiseOrAllIn(ctx, strength);
      return { action: 'fold' };
    }
  }

  if (strength >= profile.vpipThreshold) {
    if (ctx.rng() < profile.aggression) return raiseOrAllIn(ctx, strength);
    return canCheck ? { action: 'check' } : { action: 'call' };
  }

  if (canCheck) {
    if (ctx.rng() < profile.bluffFactor) return raiseOrAllIn(ctx, strength);
    return { action: 'check' };
  }
  return { action: 'call' };
}

function raiseOrAllIn(ctx: DecisionContext, strength: number): Decision {
  const raiseIncrement = Math.max(ctx.minRaise, Math.round(ctx.potSize * (0.5 + strength * 0.5)));
  const total = ctx.toCall + raiseIncrement;
  if (total >= ctx.stack) return { action: 'raise', amount: ctx.stack };
  return { action: 'raise', amount: total };
}
```

NOTE: confirm `DecisionContext` + `Decision` are exported from `decide.ts`. If `decide.ts` does NOT export them, either import from wherever they're declared or re-declare identically. Verify with `grep -n "export" src/games/poker/_shared/ai/decide.ts`. The `raiseOrAllIn` body mirrors Hold'em's exact convention (Decision.amount = chips committed this action). Match `decide.ts`'s actual `raiseOrAllIn` if it differs.

- [ ] **Step 3: Write `decideOmaha.test.ts`** (use a seeded rng helper like the other AI tests):

```typescript
import { describe, it, expect } from 'vitest';
import { decideOmaha, omahaPreflopStrength, omahaPostflopStrength } from './decideOmaha';
import type { Card } from '../types';
import type { DecisionContext } from './decide';

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
function c(rank: Card['rank'], suit: Card['suit']): Card {
  return { rank, suit };
}
function ctx(over: Partial<DecisionContext>): DecisionContext {
  return {
    holeCards: [c(14, 's'), c(14, 'h'), c(13, 's'), c(12, 'h')],
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

describe('omahaPreflopStrength', () => {
  it('double-suited connected high cards > random unconnected low cards', () => {
    const premium = omahaPreflopStrength([c(14, 's'), c(13, 's'), c(12, 'h'), c(11, 'h')]); // AKQJ double-suited
    const trash = omahaPreflopStrength([c(9, 's'), c(5, 'h'), c(3, 'c'), c(2, 'd')]);
    expect(premium).toBeGreaterThan(trash);
  });
  it('penalises trips in hand vs the same pair without the dead third', () => {
    const tripsInHand = omahaPreflopStrength([c(14, 's'), c(14, 'h'), c(14, 'c'), c(13, 'd')]);
    const justPair = omahaPreflopStrength([c(14, 's'), c(14, 'h'), c(13, 'c'), c(12, 'd')]);
    expect(justPair).toBeGreaterThan(tripsInHand);
  });
  it('rewards double-suited over rainbow with same ranks', () => {
    const ds = omahaPreflopStrength([c(14, 's'), c(13, 's'), c(12, 'h'), c(11, 'h')]);
    const rainbow = omahaPreflopStrength([c(14, 's'), c(13, 'h'), c(12, 'c'), c(11, 'd')]);
    expect(ds).toBeGreaterThan(rainbow);
  });
});

describe('omahaPostflopStrength uses the 2+3 rule', () => {
  it('quads-in-hand is weak (can only use 2 hole cards)', () => {
    // four aces in hand: on a blank board you can only make a pair of aces
    const quadsInHand = omahaPostflopStrength(
      [c(14, 's'), c(14, 'h'), c(14, 'c'), c(14, 'd')],
      [c(2, 's'), c(7, 'h'), c(9, 'c')],
    );
    // a real two-pair using exactly 2 hole + 3 board should beat it
    const legit = omahaPostflopStrength(
      [c(2, 'h'), c(7, 's'), c(13, 'c'), c(12, 'd')],
      [c(2, 's'), c(7, 'h'), c(9, 'c')],
    );
    expect(legit).toBeGreaterThan(quadsInHand);
  });
});

describe('decideOmaha', () => {
  it('never checks facing a bet', () => {
    const d = decideOmaha(
      ctx({ toCall: 100, holeCards: [c(9, 's'), c(5, 'h'), c(3, 'c'), c(2, 'd')] }),
    );
    expect(d.action).not.toBe('check');
  });
  it('raise never exceeds stack', () => {
    for (let s = 0; s < 20; s += 1) {
      const d = decideOmaha(
        ctx({ stack: 80, potSize: 500, archetype: 'maniac', rng: seededRng(s) }),
      );
      if (d.action === 'raise') expect(d.amount).toBeLessThanOrEqual(80);
    }
  });
  it('deterministic per seed', () => {
    expect(decideOmaha(ctx({ rng: seededRng(42) }))).toEqual(
      decideOmaha(ctx({ rng: seededRng(42) })),
    );
  });
  it('maniac raises more than rock with a marginal hand', () => {
    let m = 0;
    let r = 0;
    for (let s = 0; s < 50; s += 1) {
      const base = {
        holeCards: [c(11, 's'), c(10, 's'), c(9, 'h'), c(8, 'h')] as Card[],
        toCall: 0,
      };
      if (decideOmaha(ctx({ ...base, archetype: 'maniac', rng: seededRng(s) })).action === 'raise')
        m += 1;
      if (decideOmaha(ctx({ ...base, archetype: 'rock', rng: seededRng(s) })).action === 'raise')
        r += 1;
    }
    expect(m).toBeGreaterThan(r);
  });
  it('uses postflop strength when street is not preflop', () => {
    const d = decideOmaha(
      ctx({
        street: 'flop',
        board: [c(14, 'c'), c(13, 'd'), c(2, 'h')],
        holeCards: [c(14, 's'), c(14, 'h'), c(5, 'c'), c(6, 'd')], // set of aces using 2 hole
        toCall: 0,
        archetype: 'rock',
      }),
    );
    expect(['check', 'raise']).toContain(d.action); // strong hand → not a fold when checking is free
  });
});
```

- [ ] **Step 4: Run + tune** — `pnpm exec vitest run src/games/poker/_shared/ai/decideOmaha.test.ts`. If a strength-ordering test fails, adjust the weights in `omahaPreflopStrength` (the ordering invariants must hold; exact values are tunable).

### Task A.2: omahaLogic.ts

**Files:** Create `src/games/poker/omaha/omahaLogic.ts` + test

- [ ] **Step 1: Read Hold'em's logic** — `cat src/games/poker/holdem/holdemLogic.ts`.

- [ ] **Step 2: Write `omahaLogic.ts`** — clone `holdemLogic.ts`, changing the deal to 4 cards and the showdown evaluator to `evaluateFrom(...,'omaha')`:

```typescript
import type { Card } from '../_shared/types';
import { deckFromSeed } from '../_shared/deck';
import { evaluateFrom, compareHands } from '../_shared/handEvaluator';
import { computeSidePots, type Contribution } from '../_shared/sidePots';

export type SeatStatus = 'active' | 'folded' | 'all-in' | 'busted' | 'empty';

/** Deal 4 hole cards per seat (round-robin) + 5 board cards from a seeded deck. */
export function dealHand(seed: string, numSeats: number): { holeCards: Card[][]; board: Card[] } {
  const deck = deckFromSeed(seed);
  const holeCards: Card[][] = Array.from({ length: numSeats }, () => []);
  let idx = 0;
  for (let round = 0; round < 4; round += 1) {
    for (let s = 0; s < numSeats; s += 1) {
      holeCards[s]!.push(deck[idx]!);
      idx += 1;
    }
  }
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

export function nextActiveSeat(seats: { status: SeatStatus }[], from: number): number {
  const n = seats.length;
  for (let step = 1; step <= n; step += 1) {
    const i = (from + step) % n;
    if (seats[i]!.status === 'active') return i;
  }
  return from;
}

/** Showdown via the Omaha exactly-2-hole + exactly-3-board rule. */
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
  const ranks = new Map<number, ReturnType<typeof evaluateFrom>>();
  for (const s of input.seats) {
    if (!s.folded) ranks.set(s.seatId, evaluateFrom(s.holeCards, input.board, 'omaha'));
  }
  const awards: Record<number, number> = {};
  for (const pot of pots) {
    let winners: number[] = [];
    let best: ReturnType<typeof evaluateFrom> | null = null;
    for (const seatId of pot.eligibleSeatIds) {
      const r = ranks.get(seatId);
      if (!r) continue;
      if (best === null || compareHands(r, best) > 0) {
        best = r;
        winners = [seatId];
      } else if (compareHands(r, best) === 0) {
        winners.push(seatId);
      }
    }
    if (winners.length === 0) continue;
    const share = Math.floor(pot.amount / winners.length);
    let remainder = pot.amount - share * winners.length;
    for (const w of winners) awards[w] = (awards[w] ?? 0) + share;
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

- [ ] **Step 3: Write `omahaLogic.test.ts`**:

```typescript
import { describe, it, expect } from 'vitest';
import { dealHand, nextActiveSeat, resolveShowdown } from './omahaLogic';
import type { Card } from '../_shared/types';

describe('dealHand', () => {
  it('deals 4 hole cards per seat + 5 board, all distinct', () => {
    const { holeCards, board } = dealHand('o.1', 4);
    expect(holeCards).toHaveLength(4);
    holeCards.forEach((h) => expect(h).toHaveLength(4));
    expect(board).toHaveLength(5);
    const all = [...holeCards.flat(), ...board];
    expect(new Set(all.map((c) => `${c.rank}${c.suit}`)).size).toBe(all.length);
  });
  it('deterministic by seed', () => {
    expect(dealHand('o', 6)).toEqual(dealHand('o', 6));
  });
});

describe('nextActiveSeat', () => {
  it('skips non-active + wraps', () => {
    const seats = [{ status: 'folded' as const }, { status: 'active' as const }, { status: 'all-in' as const }, { status: 'active' as const }];
    expect(nextActiveSeat(seats, 1)).toBe(3);
    expect(nextActiveSeat(seats, 3)).toBe(1);
  });
});

describe('resolveShowdown — omaha 2+3 rule', () => {
  function c(r: Card['rank'], s: Card['suit']): Card {
    return { rank: r, suit: s };
  }
  it('awards via exactly-2-hole + 3-board (a Hold'em-rules winner can LOSE under Omaha)', () => {
    // Board has 4 hearts. Seat 0 has ONE heart (would be a flush in Hold'em using 1 hole card —
    // illegal in Omaha). Seat 1 has TWO hearts (a legal Omaha flush).
    const board = [c(2, 'h'), c(7, 'h'), c(9, 'h'), c(11, 'h'), c(3, 's')];
    const awards = resolveShowdown({
      board,
      seats: [
        { seatId: 0, holeCards: [c(14, 'h'), c(14, 's'), c(13, 's'), c(12, 'c')], committed: 100, folded: false }, // 1 heart → no flush in Omaha; best is a pair of aces
        { seatId: 1, holeCards: [c(5, 'h'), c(6, 'h'), c(13, 'c'), c(12, 'd')], committed: 100, folded: false }, // 2 hearts → legal heart flush
      ],
    });
    expect(awards[1]).toBe(200); // the legal Omaha flush wins
    expect(awards[0]).toBeUndefined();
  });
  it('short all-in only wins the main pot', () => {
    const board = [c(2, 'c'), c(7, 'd'), c(9, 'h'), c(3, 's'), c(4, 'c')];
    const awards = resolveShowdown({
      board,
      seats: [
        { seatId: 0, holeCards: [c(2, 'h'), c(7, 's'), c(14, 'c'), c(13, 'd')], committed: 50, folded: false }, // two pair (2s+7s) using 2 hole
        { seatId: 1, holeCards: [c(9, 'c'), c(9, 's'), c(11, 'h'), c(12, 'd')], committed: 200, folded: false }, // trip nines
        { seatId: 2, holeCards: [c(3, 'h'), c(3, 'd'), c(10, 'c'), c(11, 's')], committed: 200, folded: false }, // trip threes
      ],
    });
    // main pot 150 → seat 1 (trips beat two pair); side pot 300 → seat 1 (trip nines > trip threes)
    expect(awards[1]).toBe(450);
  });
});
```

- [ ] **Step 4: Run** — `pnpm exec vitest run src/games/poker/omaha/omahaLogic.test.ts`. The "Hold'em-rules winner loses under Omaha" test is the key correctness anchor — if it fails, `evaluateFrom(...,'omaha')` isn't being used.

### Task A.3: Full DoD + commit + PR A

- [ ] **Step 1: DoD** — `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build`.
- [ ] **Step 2: Commit + push + PR**

```bash
git add src/games/poker/_shared/ai/decideOmaha.ts src/games/poker/_shared/ai/decideOmaha.test.ts src/games/poker/omaha/omahaLogic.ts src/games/poker/omaha/omahaLogic.test.ts
git commit -m "feat(poker): Omaha AI (decideOmaha) + omaha logic (PR A)"
git push -u origin phase-13c-omaha-pr-a
gh pr create --title "phase-13c(poker): PR A — decideOmaha + omaha logic" --body "PR A of Phase 13c. decideOmaha (4-card preflop heuristic + omaha postflop strength, reusing archetype/pot-odds/raise-sizing) + omahaLogic (dealHand 4-each+board, resolveShowdown via evaluateFrom 'omaha'). Reuses _shared. ~37 tests. No machine/UI."
```

---

## PR B — Omaha machine (Hold'em clone)

**Branch:** `phase-13c-omaha-pr-b` (off main after PR A merged)
**Scope:** `omaha/machine.ts` + tests + placeholder page + route. ~45 tests.

### Task B.1: Branch + machine

**Files:** Create `src/games/poker/omaha/machine.ts`

- [ ] **Step 1: Branch + read Hold'em machine**

```bash
git checkout main && git pull origin main
git checkout -b phase-13c-omaha-pr-b
cat src/games/poker/holdem/machine.ts
```

- [ ] **Step 2: Clone the machine** with these exact diffs from `holdem/machine.ts`:
  - Rename `holdemMachine`→`omahaMachine`, `PokerContext`→`OmahaContext`, `SeatState`→`OmahaSeatState`, `PokerEvent`→`OmahaEvent` (keep `HandResult`/`MachineInput` shapes identical; you may re-export or re-declare).
  - `startHand` calls `dealHand` from `../omaha/omahaLogic`... actually from `./omahaLogic` (same dir) → deals **4** hole cards per seat (the cloned holdem code deals 2; the change is entirely inside `omahaLogic.dealHand`, so `startHand` just calls it).
  - `showdown` calls `resolveShowdown` from `./omahaLogic` (omaha 2+3 rule). Everything else — blind posting, heads-up button-is-SB, betting closure (`lastAggressorSeat`/`actedSinceLastRaise`), `AI_ACTION` validation, street progression (board revealed by `street`), side pots, session lifecycle (REBUY/LEAVE_TABLE/RESEAT_AI/bust_prompt/button rotation/handsPlayed/biggestPotWon) — **copied verbatim**.
  - No discard events (Omaha has no draw). Events are exactly Hold'em's.
  - Init via XState `input` (same `MachineInput`).
  - Import `dealHand`, `nextActiveSeat`, `resolveShowdown` from `./omahaLogic`; `HandRank` etc. from `../_shared/...` as Hold'em does.

  Build incrementally (idle→posting_blinds→betting first, then streets, then showdown, then session) + commit per green sub-step if you like.

- [ ] **Step 3: Write `machine.test.ts`** (~45, clone Hold'em's `machine.test.ts`): initial state; `START_HAND` deals **4** each + posts blinds + correct first-to-act (incl. heads-up); betting closure (check-around / raise-reraise-call / all-fold); street progression preflop→flop→turn→river; all-in side pots; showdown awards via omaha (include a seeded case asserting the omaha rule is applied); uncontested win; bust→bust_prompt; rebuy; leave→session_over. Seeded decks + scripted `AI_ACTION` (never call `decideOmaha`).

- [ ] **Step 4: Run** — `pnpm exec vitest run src/games/poker/omaha/machine.test.ts`.

### Task B.2: Placeholder page + route

**Files:** Create `src/games/poker/omaha/OmahaPage.tsx` (placeholder); modify `src/router.tsx`

- [ ] **Step 1: Placeholder**

```typescript
import type { JSX } from 'react';
export default function OmahaPage(): JSX.Element {
  return <div className="p-8 text-white"><p className="text-xs text-white/50">Omaha — UI in PR C.</p></div>;
}
```

- [ ] **Step 2: Route** — add `const OmahaPage = lazy(() => import('@/games/poker/omaha/OmahaPage'));` + a `/play/poker/omaha` route mirroring the `/play/poker/holdem` Suspense pattern.
- [ ] **Step 3: DoD + commit + PR B**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
git add src/games/poker/omaha/machine.ts src/games/poker/omaha/machine.test.ts src/games/poker/omaha/OmahaPage.tsx src/router.tsx
git commit -m "feat(poker): Omaha machine + route (PR B)"
git push -u origin phase-13c-omaha-pr-b
gh pr create --title "phase-13c(poker): PR B — Omaha machine + route" --body "PR B of Phase 13c. omaha/machine.ts clones Hold'em with a 4-card deal + omaha showdown (evaluateFrom '\''omaha'\''). Hold'em untouched. Placeholder page + /play/poker/omaha route. ~45 tests."
```

---

## PR C — Omaha UI (full play surface)

**Branch:** `phase-13c-omaha-pr-c` (off main after PR B merged)
**Scope:** `OmahaSeat`, `OmahaTable`, full `OmahaPage` + reused Hold'em controls. Playable via direct URL. ~35 tests.

### Task C.1: Branch + OmahaSeat

**Files:** Create `src/games/poker/omaha/OmahaSeat.tsx` + test

- [ ] **Step 1: Branch + read Hold'em UI**

```bash
git checkout main && git pull origin main
git checkout -b phase-13c-omaha-pr-c
cat src/games/poker/holdem/Seat.tsx src/games/poker/holdem/PokerTable.tsx src/games/poker/holdem/HoldemPage.tsx
```

- [ ] **Step 2: Write `OmahaSeat.tsx`** — clone `holdem/Seat.tsx`, rendering **4** hole cards (face-down for AI until showdown; yours face-up). Keep stack/archetype/dealer/blind markers/acting glow/status states identical. Adjust the hole-card row to fit 4 cards (smaller for AI seats).
- [ ] **Step 3: Write `OmahaSeat.test.tsx`** — renders 4 hole-card slots; AI cards face-down; stack + archetype shown; acting glow via the same data attribute Hold'em's Seat uses.
- [ ] **Step 4: Run.**

### Task C.2: OmahaTable + OmahaPage

**Files:** Create `OmahaTable.tsx`; replace `OmahaPage.tsx`; create `OmahaPage.test.tsx`

- [ ] **Step 1: `OmahaTable.tsx`** — clone `holdem/PokerTable.tsx`: AI `OmahaSeat`s top, `holdem/CommunityBoard` (imported, unchanged) centred, your `OmahaSeat` (4 cards) + `holdem/BettingControls` (imported) bottom, `holdem/SessionBar` (imported) right rail.
- [ ] **Step 2: `OmahaPage.tsx`** — clone `holdem/HoldemPage.tsx`:
  - Session-keyed sub-component mounting `useMachine(omahaMachine, { input })` after `placeBet` resolves.
  - Wallet bridge: SIT DOWN/REBUY/LEAVE → `settleRound` with `details.variant: 'omaha'`.
  - **AI driver:** when `toActSeat` is an AI seat in `betting`, build a `DecisionContext` with the AI's **4** hole cards, the real `board`, and the **real `street`** (preflop/flop/turn/river — NO mapping trick), call `decideOmaha(ctx)` from `@/games/poker/_shared/ai/decideOmaha` after a seeded thinking delay (`useReducedMotion`→~0), send `AI_ACTION`.
  - `START_HAND`/`RESEAT_AI` loops + `beforeunload` settle (copy from HoldemPage).
  - SetupPanel with an "Omaha Hold'em" label (thin fork the heading if Hold'em's SetupPanel hardcodes it); `ShowdownReveal` reused (it renders `handResult.revealedHands` generically — verify it handles 4-card hands; thin-fork into `omaha/` only if it assumes 2).
  - Seed a `mulberry32` per session (no `Math.random`).
- [ ] **Step 3: `OmahaPage.test.tsx`** — e2e (fake-indexeddb + wallet hydration + seeded deck + `useReducedMotion` mocked): sit → preflop bet → flop → turn → river → showdown → leave → assert a `rounds` row with `game: 'poker'`, `details.variant: 'omaha'`, `stake === totalBoughtIn`, `payout === finalStack`. Include a seeded hand asserting the showdown applied the omaha 2+3 rule (winner differs from Hold'em-rules winner). Reference `HoldemPage.test.tsx` for the harness.
- [ ] **Step 4: Manual smoke** (if browser): `/play/poker/omaha` → sit → play a hand → showdown → leave. Verify 4 hole cards render + the board + the betting controls. If headless, note it.
- [ ] **Step 5: DoD + commit + PR C**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
git add src/games/poker/omaha/
git commit -m "feat(poker): Omaha UI + wallet/AI bridge (PR C)"
git push -u origin phase-13c-omaha-pr-c
gh pr create --title "phase-13c(poker): PR C — Omaha UI (full play surface)" --body "PR C of Phase 13c. OmahaSeat (4 cards) + OmahaTable + full OmahaPage (wallet bridge + decideOmaha AI driver, real street, no mapping trick). Reuses Hold'em CommunityBoard/BettingControls/SessionBar/ShowdownReveal. Playable via /play/poker/omaha. ~35 tests."
```

---

## PR D — Activate variant + BUILD_GUIDE + release

**Branch:** `phase-13c-omaha-pr-d` (off main after PR C merged)

### Task D.1: Activate the Omaha variant card

**Files:** `src/games/poker/_shared/PokerVariantModal.tsx` + test

- [ ] **Step 1: Branch + read the modal** — `cat src/games/poker/_shared/PokerVariantModal.tsx`.
- [ ] **Step 2: Flip the Omaha card** from greyed/"COMING SOON" to active → `navigate('/play/poker/omaha')`. All three variants now active; no "coming soon" cards remain.
- [ ] **Step 3: Update `PokerVariantModal.test.tsx`** — assert Omaha is now active + navigates; assert there are no remaining "COMING SOON" badges.

### Task D.2: BUILD_GUIDE

- [ ] **Step 1: Update §10.8** (Poker) — note all three variants (Texas Hold'em, Five-Card Draw, Omaha Hold'em) are live, sharing `poker/_shared/`. Update/add the §12 roadmap row for 13c (✅ Shipped 2026-05-21 — `v0.13c-omaha`), and note the poker trio is complete. Reference the 13c spec + plan paths. Correct heading levels for markdownlint.

### Task D.3: DoD + commit + PR D

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
git add src/games/poker/_shared/PokerVariantModal.tsx src/games/poker/_shared/PokerVariantModal.test.tsx BUILD_GUIDE.md
git commit -m "feat(poker): activate Omaha variant + BUILD_GUIDE (PR D)"
git push -u origin phase-13c-omaha-pr-d
gh pr create --title "phase-13c(poker): PR D — activate Omaha + BUILD_GUIDE" --body "PR D of Phase 13c. Flip the Omaha card in PokerVariantModal to active (→ /play/poker/omaha); all three variants now live. BUILD_GUIDE §10.8 + §12 updated. Completes the poker trio."
```

### Task D.4: Tag + Release + memory (post-merge, controller)

- [ ] **Step 1:** `git checkout main && git pull origin main`
- [ ] **Step 2:** `git tag -a v0.13c-omaha -m "Phase 13c: No-Limit Omaha Hold'em" && git push origin v0.13c-omaha`
- [ ] **Step 3:** `gh release create v0.13c-omaha` — highlights: NLHE Omaha 2-6 vs archetype AI, 4 hole cards, mandatory exactly-2+3 showdown (reuses `evaluateFrom 'omaha'` from 13a), new `decideOmaha` AI, reuses the whole poker `_shared/` core + Hold'em UI. Completes the poker trio (Hold'em + Five-Card Draw + Omaha). List PRs A-D + test delta.
- [ ] **Step 4: Memory** — update `project_masquer_status.md`: top entry `v0.13c-omaha`; **next phase 14 (Craps)** — the last game phase before Polish; note the poker trio (13a/b/c) is complete and the `_shared/` reuse validated (Omaha shipped as a near-clone in 4 PRs). Append 13c deferred items (Pot-Limit, Hi-Lo, 5/6-card Omaha) to `masquer-deferred-features`.

---

## Self-review checklist

After PR D:

- [ ] Spec §2-§8 each map to a task.
- [ ] No placeholders.
- [ ] Type/name consistency: `decideOmaha`, `omahaPreflopStrength`, `omahaPostflopStrength`, `dealHand`, `resolveShowdown`, `omahaMachine`, `OmahaContext`, `OmahaSeatState`, `OmahaEvent`, `OmahaSeat`, `OmahaTable`, `OmahaPage`.
- [ ] The AI driver passes the real `street` + 4 hole cards + board to `decideOmaha` (no Hold'em/Draw-style street mapping).
- [ ] Showdown uses `evaluateFrom(...,'omaha')` (the "Hold'em winner loses under Omaha" test passes).
- [ ] Manual smoke: 2 + 6 player tables, an all-in side pot, rebuy, leave-and-settle; 4 hole cards render.
- [ ] All three poker variants playable from the lobby modal; no "coming soon" cards remain.
