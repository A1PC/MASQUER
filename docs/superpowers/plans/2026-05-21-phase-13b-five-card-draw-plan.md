# Phase 13b — Five-Card Draw Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** No-Limit Five-Card Draw (2-6 players vs archetype AI), reusing the `poker/_shared/` core + Hold'em's table/stakes/betting/session framework. New surface: a single draw/discard street (cap 3) + an AI discard heuristic.

**Architecture:** New `src/games/poker/five-card-draw/` sibling reusing `_shared/` pure helpers (deck, handEvaluator, sidePots, ai/decide, PlayingCard, PokerVariantModal). New `decideDiscard` added to `_shared/ai/`. Shipped Hold'em code is NOT modified — Hold'em UI controls are imported where props match, thin-forked only where a Hold'em assumption leaks. Same wallet-bridge-async / machine-pure + session-keyed-mount patterns as Hold'em.

**Tech Stack:** TypeScript 5, React 18, Vite 5, Tailwind 3, XState v5, @xstate/react 6, Framer Motion 12, Vitest 2, RTL, fake-indexeddb.

**Spec:** `docs/superpowers/specs/2026-05-21-phase-13b-five-card-draw-design.md` (PR #171).

**Rollout:** 4 PRs, branches `phase-13b-draw-pr-{a..d}`. Each merges before the next opens. No `Round.game`/commitlint/ADR changes needed.

**Known CI flake:** none currently (the `AdminLotteryPage` flake was fixed in #169). If a new flake appears only in unrelated files, re-run once.

---

## Reference: the Hold'em pieces this phase mirrors / reuses

Read these before starting — the draw machine + page are structurally close to Hold'em:

- `src/games/poker/holdem/machine.ts` — the betting-round closure, blind posting, heads-up handling, side-pot showdown, session lifecycle, `MachineInput`/`PokerEvent`/`PokerContext`/`SeatState`/`HandResult` shapes. **The draw machine copies this structure, swapping the flop/turn/river streets for predraw/draw/postdraw and removing the community board.**
- `src/games/poker/holdem/holdemLogic.ts` — `dealHand`, `nextActiveSeat`, `resolveShowdown`. Draw's `drawLogic.ts` mirrors these (no board).
- `src/games/poker/holdem/HoldemPage.tsx` — the session-keyed sub-component, wallet bridge (SIT DOWN/REBUY/LEAVE → `settleRound`), AI turn driver, `beforeunload` settle. Draw's page mirrors it + adds the discard driver.
- `src/games/poker/holdem/{BettingControls,SessionBar,ShowdownReveal,SetupPanel,Seat,stakesConfig}.tsx` — reused by import or thin-forked.
- `src/games/poker/_shared/ai/decide.ts` — reused for betting; `preflopStrength` (2-card) vs `postflopStrength([...cards], board)` (`evaluateBest5`).

---

## PR A — AI discard + draw logic (pure)

**Branch:** `phase-13b-draw-pr-a`
**Scope:** `_shared/ai/decideDiscard.ts` + `five-card-draw/drawLogic.ts` + tests. No machine, no UI.
**DoD:** lint + typecheck + vitest + build green. ~45 tests.

### Task A.1: Branch + decideDiscard

**Files:** Create `src/games/poker/_shared/ai/decideDiscard.ts`

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull origin main
git checkout -b phase-13b-draw-pr-a
```

- [ ] **Step 2: Write `decideDiscard.ts`**

```typescript
import type { Card } from '../types';
import { evaluateBest5 } from '../handEvaluator';
import { ARCHETYPES, type Archetype } from './archetypes';

/** Returns the indices (into the 5-card hand) to discard, length 0-3.
 *  Archetype-flavoured + seeded. Never returns duplicates or out-of-range
 *  indices, and never more than 3. Empty array = stand pat. */
export function decideDiscard(
  holeCards: Card[],
  archetype: Archetype,
  rng: () => number,
): number[] {
  const profile = ARCHETYPES[archetype];
  const hr = evaluateBest5(holeCards);

  // Made hand: straight or better → stand pat (unless a maniac breaks it).
  if (hr.categoryValue >= 4) {
    // 4 = straight per CATEGORY_VALUE
    if (archetype === 'maniac' && rng() < profile.bluffFactor * 0.5) {
      // rare: break a straight to draw 1 (degenerate aggression)
      return [4];
    }
    return [];
  }

  const baseline = baselineDiscard(holeCards);

  // Archetype flavour:
  if (archetype === 'maniac' && rng() < profile.bluffFactor) {
    // bluff: stand pat on a weak hand (rep strength)
    return [];
  }
  if ((archetype === 'station' || archetype === 'shark') && baseline.length > 0 && rng() < 0.15) {
    // keep one extra high kicker → draw one fewer (drop the highest discard index whose card is a high card)
    return baseline.slice(0, baseline.length - 1);
  }
  return baseline;
}

/** Textbook discard: indices to throw given the made/drawing hand. */
function baselineDiscard(cards: Card[]): number[] {
  const ranks = cards.map((c) => c.rank);
  const suits = cards.map((c) => c.suit);

  // rank-count map
  const counts = new Map<number, number[]>(); // rank → indices
  ranks.forEach((r, i) => {
    const arr = counts.get(r) ?? [];
    arr.push(i);
    counts.set(r, arr);
  });
  const groups = [...counts.values()].sort((a, b) => b.length - a.length);

  // Trips: keep the 3, discard the other 2
  if (groups[0]!.length === 3) {
    return cards.map((_, i) => i).filter((i) => !groups[0]!.includes(i));
  }
  // Two pair: keep the 4, discard the odd card
  if (groups[0]!.length === 2 && groups[1]!.length === 2) {
    const keep = new Set([...groups[0]!, ...groups[1]!]);
    return cards.map((_, i) => i).filter((i) => !keep.has(i));
  }
  // One pair: keep the pair, discard the other 3
  if (groups[0]!.length === 2) {
    return cards.map((_, i) => i).filter((i) => !groups[0]!.includes(i));
  }

  // 4-to-a-flush: one suit appears 4 times → discard the off-suit card
  for (const suit of ['c', 'd', 'h', 's'] as const) {
    const idxs = suits.map((s, i) => (s === suit ? i : -1)).filter((i) => i >= 0);
    if (idxs.length === 4) {
      return cards.map((_, i) => i).filter((i) => !idxs.includes(i));
    }
  }

  // 4-to-an-open-ended-straight: 4 distinct consecutive ranks present → discard the 5th
  const openDraw = fourToStraight(ranks);
  if (openDraw) {
    return cards.map((_, i) => i).filter((i) => !openDraw.includes(i));
  }

  // Nothing: keep the highest 2 cards, discard 3.
  const byRankDesc = cards.map((_, i) => i).sort((a, b) => ranks[b]! - ranks[a]!);
  return byRankDesc.slice(2); // discard the lowest 3
}

/** If 4 of the 5 cards form 4 consecutive distinct ranks, return their indices. */
function fourToStraight(ranks: number[]): number[] | null {
  const uniq = [...new Set(ranks)].sort((a, b) => a - b);
  if (uniq.length < 4) return null;
  for (let start = 0; start + 4 <= uniq.length; start += 1) {
    const window = uniq.slice(start, start + 4);
    if (window[3]! - window[0]! === 3) {
      // 4 consecutive ranks → keep those, discard the rest
      const keepRanks = new Set(window);
      const keepIdx: number[] = [];
      ranks.forEach((r, i) => {
        if (keepRanks.has(r) && keepIdx.length < 4) keepIdx.push(i);
      });
      return ranks.map((_, i) => i).filter((i) => !keepIdx.includes(i));
    }
  }
  return null;
}
```

NOTE: cap-3 is guaranteed by construction (one-pair draws 3; nothing draws 3; everything else fewer). Add a defensive clamp in case of an unexpected path:

```typescript
// at the end of decideDiscard, before returning baseline/variants, wrap with:
function clampDiscard(indices: number[]): number[] {
  return [...new Set(indices)].filter((i) => i >= 0 && i < 5).slice(0, 3);
}
```

Apply `clampDiscard(...)` to every return value in `decideDiscard`.

- [ ] **Step 3: Write `decideDiscard.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { decideDiscard } from './decideDiscard';
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
function c(rank: Card['rank'], suit: Card['suit']): Card {
  return { rank, suit };
}

describe('decideDiscard', () => {
  it('stands pat on a straight (rock)', () => {
    const hand = [c(9, 'h'), c(8, 'd'), c(7, 'c'), c(6, 's'), c(5, 'h')];
    expect(decideDiscard(hand, 'rock', seededRng(1))).toEqual([]);
  });

  it('stands pat on a flush (rock)', () => {
    const hand = [c(14, 'h'), c(10, 'h'), c(7, 'h'), c(4, 'h'), c(2, 'h')];
    expect(decideDiscard(hand, 'rock', seededRng(1))).toEqual([]);
  });

  it('one pair → discards the other 3 (rock)', () => {
    const hand = [c(9, 'h'), c(9, 'd'), c(13, 'c'), c(5, 's'), c(2, 'h')];
    const d = decideDiscard(hand, 'rock', seededRng(1));
    expect(d).toHaveLength(3);
    // keeps indices 0,1 (the pair)
    expect(d).not.toContain(0);
    expect(d).not.toContain(1);
  });

  it('two pair → discards the odd card (rock)', () => {
    const hand = [c(9, 'h'), c(9, 'd'), c(5, 'c'), c(5, 's'), c(2, 'h')];
    expect(decideDiscard(hand, 'rock', seededRng(1))).toEqual([4]);
  });

  it('trips → discards the other 2 (rock)', () => {
    const hand = [c(9, 'h'), c(9, 'd'), c(9, 'c'), c(13, 's'), c(2, 'h')];
    expect(decideDiscard(hand, 'rock', seededRng(1)).sort()).toEqual([3, 4]);
  });

  it('4-to-a-flush → discards the off-suit card (rock)', () => {
    const hand = [c(14, 'h'), c(10, 'h'), c(7, 'h'), c(4, 'h'), c(2, 'c')];
    expect(decideDiscard(hand, 'rock', seededRng(1))).toEqual([4]);
  });

  it('4-to-an-open-straight → discards the 5th (rock)', () => {
    const hand = [c(9, 'h'), c(8, 'd'), c(7, 'c'), c(6, 's'), c(2, 'h')];
    expect(decideDiscard(hand, 'rock', seededRng(1))).toEqual([4]);
  });

  it('nothing → keeps top 2, discards 3 (rock)', () => {
    const hand = [c(14, 'h'), c(11, 'd'), c(7, 'c'), c(4, 's'), c(2, 'h')];
    const d = decideDiscard(hand, 'rock', seededRng(1));
    expect(d).toHaveLength(3);
    expect(d).not.toContain(0); // ace kept
    expect(d).not.toContain(1); // jack kept
  });

  it('never returns more than 3, never duplicates/out-of-range (fuzz across archetypes)', () => {
    const hands: Card[][] = [
      [c(9, 'h'), c(9, 'd'), c(13, 'c'), c(5, 's'), c(2, 'h')],
      [c(14, 'h'), c(11, 'd'), c(7, 'c'), c(4, 's'), c(2, 'h')],
      [c(9, 'h'), c(8, 'd'), c(7, 'c'), c(6, 's'), c(2, 'h')],
    ];
    for (const archetype of ['rock', 'station', 'maniac', 'shark'] as const) {
      for (const hand of hands) {
        for (let s = 0; s < 20; s += 1) {
          const d = decideDiscard(hand, archetype, seededRng(s));
          expect(d.length).toBeLessThanOrEqual(3);
          expect(new Set(d).size).toBe(d.length);
          d.forEach((i) => {
            expect(i).toBeGreaterThanOrEqual(0);
            expect(i).toBeLessThan(5);
          });
        }
      }
    }
  });

  it('deterministic per (hand, archetype, seed)', () => {
    const hand = [c(9, 'h'), c(9, 'd'), c(13, 'c'), c(5, 's'), c(2, 'h')];
    expect(decideDiscard(hand, 'maniac', seededRng(7))).toEqual(
      decideDiscard(hand, 'maniac', seededRng(7)),
    );
  });

  it('maniac sometimes stands pat on a weak hand (bluff)', () => {
    const hand = [c(14, 'h'), c(11, 'd'), c(7, 'c'), c(4, 's'), c(2, 'h')];
    let standPats = 0;
    for (let s = 0; s < 100; s += 1) {
      if (decideDiscard(hand, 'maniac', seededRng(s)).length === 0) standPats += 1;
    }
    expect(standPats).toBeGreaterThan(0); // bluffFactor 0.35 → several stand-pats in 100
  });
});
```

- [ ] **Step 4: Run + tune** — `pnpm exec vitest run src/games/poker/_shared/ai/decideDiscard.test.ts`. If a category mis-detects, fix `baselineDiscard`. If the maniac-bluff test sees 0 stand-pats, the `rng() < bluffFactor` gate needs the seed range widened or the threshold confirmed against `ARCHETYPES.maniac.bluffFactor` (0.35).

### Task A.2: drawLogic.ts

**Files:** Create `src/games/poker/five-card-draw/drawLogic.ts` + test

- [ ] **Step 1: Read Hold'em's logic for the patterns**

```bash
cat src/games/poker/holdem/holdemLogic.ts
```

- [ ] **Step 2: Write `drawLogic.ts`**

```typescript
import type { Card } from '../_shared/types';
import { deckFromSeed } from '../_shared/deck';
import { evaluateBest5, compareHands } from '../_shared/handEvaluator';
import { computeSidePots, type Contribution } from '../_shared/sidePots';

export type SeatStatus = 'active' | 'folded' | 'all-in' | 'busted' | 'empty';

/** Deal 5 cards per seat round-robin from a seeded deck.
 *  Returns the per-seat hole cards + the cursor pointing past the dealt cards. */
export function dealHand(
  seed: string,
  numSeats: number,
): { holeCards: Card[][]; deckCursor: number } {
  const deck = deckFromSeed(seed);
  const holeCards: Card[][] = Array.from({ length: numSeats }, () => []);
  let idx = 0;
  for (let round = 0; round < 5; round += 1) {
    for (let s = 0; s < numSeats; s += 1) {
      holeCards[s]!.push(deck[idx]!);
      idx += 1;
    }
  }
  return { holeCards, deckCursor: idx };
}

/** Replace the cards at `indices` (validated ≤3, in-range, unique) with the next
 *  cards from `deck` starting at `cursor`. Returns the new 5-card hand + advanced cursor. */
export function applyDiscards(
  deck: Card[],
  cursor: number,
  holeCards: Card[],
  indices: number[],
): { holeCards: Card[]; cursor: number } {
  const clean = [...new Set(indices)].filter((i) => i >= 0 && i < holeCards.length).slice(0, 3);
  const next = holeCards.slice();
  let c = cursor;
  for (const i of clean) {
    next[i] = deck[c]!;
    c += 1;
  }
  return { holeCards: next, cursor: c };
}

/** Re-uses _shared deck + cursor for the cursor-based reuse-safety of the dealer. */
export function nextActiveSeat(seats: { status: SeatStatus }[], from: number): number {
  const n = seats.length;
  for (let step = 1; step <= n; step += 1) {
    const i = (from + step) % n;
    if (seats[i]!.status === 'active') return i;
  }
  return from;
}

/** Showdown: 5-card hands, no board. Returns chips awarded per seatId.
 *  Splits ties (odd chip to first winner clockwise), respects side-pot eligibility. */
export function resolveShowdown(input: {
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
    if (!s.folded) ranks.set(s.seatId, evaluateBest5(s.holeCards));
  }
  const awards: Record<number, number> = {};
  for (const pot of pots) {
    let winners: number[] = [];
    let best: ReturnType<typeof evaluateBest5> | null = null;
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

- [ ] **Step 3: Write `drawLogic.test.ts`** — mirror Hold'em's `holdemLogic.test.ts` structure:

```typescript
import { describe, it, expect } from 'vitest';
import { dealHand, applyDiscards, nextActiveSeat, resolveShowdown } from './drawLogic';
import { deckFromSeed } from '../_shared/deck';
import type { Card } from '../_shared/types';

describe('dealHand', () => {
  it('deals 5 distinct cards per seat + cursor past them', () => {
    const { holeCards, deckCursor } = dealHand('s.1', 4);
    expect(holeCards).toHaveLength(4);
    holeCards.forEach((h) => expect(h).toHaveLength(5));
    expect(deckCursor).toBe(20);
    const all = holeCards.flat();
    expect(new Set(all.map((c) => `${c.rank}${c.suit}`)).size).toBe(20);
  });
  it('is deterministic by seed', () => {
    expect(dealHand('s', 6)).toEqual(dealHand('s', 6));
  });
});

describe('applyDiscards', () => {
  it('replaces exactly the indexed cards from the cursor; advances cursor; no reuse', () => {
    const deck = deckFromSeed('apply.1');
    const hole = deck.slice(0, 5);
    const cursor = 30;
    const { holeCards, cursor: c2 } = applyDiscards(deck, cursor, hole, [0, 2]);
    expect(c2).toBe(32);
    expect(holeCards[0]).toEqual(deck[30]);
    expect(holeCards[2]).toEqual(deck[31]);
    expect(holeCards[1]).toEqual(hole[1]); // untouched
    expect(holeCards[3]).toEqual(hole[3]);
  });
  it('clamps to ≤3 and ignores out-of-range/duplicate indices', () => {
    const deck = deckFromSeed('apply.2');
    const hole = deck.slice(0, 5);
    const { holeCards, cursor } = applyDiscards(deck, 30, hole, [0, 0, 1, 2, 3, 9]);
    expect(cursor).toBe(33); // only 3 drawn
    void holeCards;
  });
  it('stand pat (empty) leaves the hand + cursor unchanged', () => {
    const deck = deckFromSeed('apply.3');
    const hole = deck.slice(0, 5);
    const { holeCards, cursor } = applyDiscards(deck, 30, hole, []);
    expect(holeCards).toEqual(hole);
    expect(cursor).toBe(30);
  });
});

describe('nextActiveSeat', () => {
  it('skips non-active + wraps', () => {
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
  it('awards the pot to the best 5-card hand', () => {
    const awards = resolveShowdown({
      seats: [
        {
          seatId: 0,
          holeCards: [c(14, 'h'), c(14, 'd'), c(14, 'c'), c(2, 's'), c(3, 'h')],
          committed: 100,
          folded: false,
        }, // trip aces
        {
          seatId: 1,
          holeCards: [c(13, 'h'), c(13, 'd'), c(13, 'c'), c(2, 'c'), c(4, 'h')],
          committed: 100,
          folded: false,
        }, // trip kings
      ],
    });
    expect(awards[0]).toBe(200);
  });
  it('short all-in only wins the main pot', () => {
    const awards = resolveShowdown({
      seats: [
        {
          seatId: 0,
          holeCards: [c(14, 'h'), c(14, 'd'), c(14, 'c'), c(14, 's'), c(3, 'h')],
          committed: 50,
          folded: false,
        }, // quad aces, short
        {
          seatId: 1,
          holeCards: [c(13, 'h'), c(13, 'd'), c(13, 'c'), c(2, 'c'), c(4, 'h')],
          committed: 200,
          folded: false,
        },
        {
          seatId: 2,
          holeCards: [c(12, 'h'), c(12, 'd'), c(12, 'c'), c(2, 's'), c(5, 'h')],
          committed: 200,
          folded: false,
        },
      ],
    });
    expect(awards[0]).toBe(150); // main pot only
    expect(awards[1]).toBe(300); // side pot (kings beat queens)
  });
});
```

- [ ] **Step 4: Run** — `pnpm exec vitest run src/games/poker/five-card-draw/drawLogic.test.ts`.

### Task A.3: Full DoD + commit + PR A

- [ ] **Step 1: DoD** — `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build` (all green).
- [ ] **Step 2: Commit + push + PR**

```bash
git add src/games/poker/_shared/ai/decideDiscard.ts src/games/poker/_shared/ai/decideDiscard.test.ts src/games/poker/five-card-draw/drawLogic.ts src/games/poker/five-card-draw/drawLogic.test.ts
git commit -m "feat(poker): Five-Card Draw AI discard + draw logic (PR A)"
git push -u origin phase-13b-draw-pr-a
gh pr create --title "phase-13b(poker): PR A — AI discard + draw logic" --body "PR A of Phase 13b. Pure: decideDiscard (archetype-flavoured, seeded, ≤3) + drawLogic (dealHand 5-each, applyDiscards, resolveShowdown, nextActiveSeat). Reuses _shared handEvaluator/sidePots/deck. ~45 tests. No machine/UI."
```

---

## PR B — Draw machine

**Branch:** `phase-13b-draw-pr-b` (off main after PR A merged)
**Scope:** `five-card-draw/machine.ts` + tests + placeholder page + route. ~40 tests.

### Task B.1: Branch + machine

**Files:** Create `src/games/poker/five-card-draw/machine.ts`

- [ ] **Step 1: Branch + read Hold'em machine**

```bash
git checkout main && git pull origin main
git checkout -b phase-13b-draw-pr-b
cat src/games/poker/holdem/machine.ts
```

- [ ] **Step 2: Build the machine** mirroring Hold'em's structure with these differences (full implementation; build incrementally + commit per green sub-step):
  - **Context** = the spec §4 `DrawContext` (no `board`; add `deckCursor`, per-seat `holeCards: Card[5]`, `discardCount`, `hasDrawn`; `street: 'predraw'|'draw'|'postdraw'`).
  - **Events** = spec §4 (adds `PLAYER_DISCARD`, `AI_DISCARD`; same betting/session events as Hold'em).
  - **States**: `idle`, `posting_blinds`, `bet_predraw`, `drawing`, `bet_postdraw`, `showdown`, `award_uncontested`, `hand_complete`, `bust_prompt`, `session_over`.
  - **Init** via XState `input` (same `MachineInput` shape as Hold'em + nothing extra): `{ sessionId, buyIn, tableSize, stakes, aiArchetypes }`.
  - **`startHand`**: `dealHand(seed, tableSize)` → 5 cards each + `deckCursor`; post blinds; set button + first-to-act (heads-up: button posts SB, acts first pre-draw). `street: 'predraw'`.
  - **Betting actions** (`applyFoldAction`/`applyCheckAction`/`applyCallAction`/`applyRaiseAction`/`applyAiAction`) + closure guard (`bettingRoundClosed`): copy the logic from Hold'em's machine verbatim, adapted to `DrawContext`. `lastAggressorSeat=null` at the start of each betting round so the last-to-act gets their option.
  - **Street transitions**: `bet_predraw` close → if ≥2 live `drawing` else `award_uncontested`. `bet_postdraw` close → if ≥2 live `showdown` else `award_uncontested`. Reset `committedThisStreet`, `lastAggressorSeat`, `actedSinceLastRaise`, and set first-to-act for the post-draw round on entering `bet_postdraw`.
  - **`drawing` actions**: `applyPlayerDiscard` + `applyAiDiscard` both call `applyDiscards(deck, deckCursor, seat.holeCards, indices)`, set `discardCount = indices.length` + `hasDrawn = true`, advance `deckCursor`, and move `toActSeat` to the next live seat that hasn't drawn. When all live seats `hasDrawn`, transition to `bet_postdraw`. Draw order starts from the first live seat clockwise of the button.
  - **`showdown`**: `resolveShowdown({ seats })` (no board); build `handResult` (same shape as Hold'em's `HandResult`: winners + sidePots + revealedHands); credit stacks.
  - **Session lifecycle** (`hand_complete` → `idle`/`bust_prompt`; `REBUY`; `LEAVE_TABLE` → `session_over`; `RESEAT_AI`; button rotation; `handsPlayed`/`biggestPotWon`): copy from Hold'em verbatim.
  - **Export**: `drawMachine`, `DrawContext`, `DrawSeatState`, `HandResult` (re-export or re-declare), `MachineInput`, `DrawEvent`.

- [ ] **Step 3: Write `machine.test.ts`** (~40 tests, mirror Hold'em's `machine.test.ts`): initial state; `START_HAND` deals 5 each + posts blinds + correct first-to-act (incl. heads-up); pre-draw betting closure (check-around / raise-reraise-call / all-fold); transition to `drawing`; `PLAYER_DISCARD`/`AI_DISCARD` replace cards + advance through seats + set draw labels; only after all live seats draw → `bet_postdraw`; post-draw betting; `showdown` awards main+side pots + split; uncontested win; bust → bust_prompt; rebuy; leave → session_over. Seeded decks + scripted `AI_ACTION`/`AI_DISCARD` (never call `decide`/`decideDiscard`).

- [ ] **Step 4: Run** — `pnpm exec vitest run src/games/poker/five-card-draw/machine.test.ts`.

### Task B.2: Placeholder page + route

**Files:** Create `src/games/poker/five-card-draw/FiveCardDrawPage.tsx` (placeholder); modify `src/router.tsx`

- [ ] **Step 1: Placeholder**

```typescript
import type { JSX } from 'react';
export default function FiveCardDrawPage(): JSX.Element {
  return <div className="p-8 text-white"><p className="text-xs text-white/50">Five-Card Draw — UI in PR C.</p></div>;
}
```

- [ ] **Step 2: Route** — add `const FiveCardDrawPage = lazy(() => import('@/games/poker/five-card-draw/FiveCardDrawPage'));` + a `/play/poker/five-card-draw` route mirroring the `/play/poker/holdem` route's Suspense pattern.
- [ ] **Step 3: DoD + commit + PR B**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
git add src/games/poker/five-card-draw/machine.ts src/games/poker/five-card-draw/machine.test.ts src/games/poker/five-card-draw/FiveCardDrawPage.tsx src/router.tsx
git commit -m "feat(poker): Five-Card Draw machine + route (PR B)"
git push -u origin phase-13b-draw-pr-b
gh pr create --title "phase-13b(poker): PR B — draw machine + route" --body "PR B of Phase 13b. XState machine with predraw/draw/postdraw streets reusing _shared + drawLogic. Betting/session logic mirrors Hold'em; Hold'em untouched. Placeholder page + /play/poker/five-card-draw route. ~40 tests."
```

---

## PR C — UI (full play surface)

**Branch:** `phase-13b-draw-pr-c` (off main after PR B merged)
**Scope:** `DiscardControls`, `DrawSeat`, `DrawTable` + full `FiveCardDrawPage` (wallet + AI driver) + reused Hold'em controls. Playable via direct URL. ~40 tests.

### Task C.1: Branch + DiscardControls

**Files:** Create `src/games/poker/five-card-draw/DiscardControls.tsx` + test

- [ ] **Step 1: Branch + read Hold'em UI for patterns**

```bash
git checkout main && git pull origin main
git checkout -b phase-13b-draw-pr-c
cat src/games/poker/holdem/BettingControls.tsx src/games/poker/holdem/Seat.tsx
```

- [ ] **Step 2: Write `DiscardControls.tsx`** (model A: tap-to-discard, cap 3, default stand pat):

```typescript
import type { JSX } from 'react';
import { useState } from 'react';
import PlayingCard from '../_shared/PlayingCard';
import type { Card } from '../_shared/types';

interface Props {
  holeCards: Card[]; // exactly 5
  onDraw: (indices: number[]) => void;
  disabled?: boolean;
}

export default function DiscardControls({ holeCards, onDraw, disabled = false }: Props): JSX.Element {
  const [marked, setMarked] = useState<number[]>([]);

  function toggle(i: number): void {
    if (disabled) return;
    setMarked((cur) => {
      if (cur.includes(i)) return cur.filter((x) => x !== i);
      if (cur.length >= 3) return cur; // cap 3 — block the 4th
      return [...cur, i];
    });
  }

  return (
    <div className="flex flex-col items-center gap-3" data-discard-controls>
      <div className="flex gap-2">
        {holeCards.map((card, i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggle(i)}
            disabled={disabled}
            aria-pressed={marked.includes(i)}
            className={`transition ${marked.includes(i) ? 'translate-y-2 opacity-50 grayscale' : 'hover:-translate-y-1'}`}
            data-card-index={i}
            data-marked={marked.includes(i)}
          >
            <PlayingCard card={card} size="hole" />
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onDraw(marked)}
        disabled={disabled}
        className="rounded-md border-2 border-gold bg-casino-red px-5 py-2 font-display text-sm tracking-wider text-white disabled:opacity-40"
        data-draw-button
      >
        {marked.length === 0 ? 'STAND PAT' : `DRAW ${marked.length}`}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Write `DiscardControls.test.tsx`**:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DiscardControls from './DiscardControls';
import type { Card } from '../_shared/types';

const hand: Card[] = [
  { rank: 14, suit: 'h' }, { rank: 9, suit: 'd' }, { rank: 7, suit: 'c' }, { rank: 4, suit: 's' }, { rank: 2, suit: 'h' },
];

describe('DiscardControls', () => {
  it('defaults to STAND PAT', () => {
    render(<DiscardControls holeCards={hand} onDraw={vi.fn()} />);
    expect(screen.getByRole('button', { name: /STAND PAT/ })).toBeInTheDocument();
  });
  it('tapping cards updates the DRAW count', async () => {
    render(<DiscardControls holeCards={hand} onDraw={vi.fn()} />);
    await userEvent.click(screen.getByText('7')); // approximate; query by data attr in practice
    expect(screen.getByRole('button', { name: /DRAW 1/ })).toBeInTheDocument();
  });
  it('caps at 3 discards (4th tap is blocked)', async () => {
    const { container } = render(<DiscardControls holeCards={hand} onDraw={vi.fn()} />);
    const cardButtons = container.querySelectorAll('[data-card-index]');
    for (let i = 0; i < 4; i += 1) await userEvent.click(cardButtons[i] as HTMLElement);
    expect(screen.getByRole('button', { name: /DRAW 3/ })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-marked="true"]')).toHaveLength(3);
  });
  it('DRAW fires the marked indices', async () => {
    const onDraw = vi.fn();
    const { container } = render(<DiscardControls holeCards={hand} onDraw={onDraw} />);
    await userEvent.click(container.querySelector('[data-card-index="0"]') as HTMLElement);
    await userEvent.click(screen.getByRole('button', { name: /DRAW 1/ }));
    expect(onDraw).toHaveBeenCalledWith([0]);
  });
});
```

- [ ] **Step 4: Run.**

### Task C.2: DrawSeat + DrawTable

- [ ] **Step 1: `DrawSeat.tsx`** — copy `holdem/Seat.tsx`, render 5 cards (face-down for AI until showdown), add a `drewLabel?: string` prop showing "drew N" / "stood pat" after the seat draws. Test: renders stack + draw label + face-down AI cards.
- [ ] **Step 2: `DrawTable.tsx`** — like `holdem/PokerTable.tsx` but no `CommunityBoard`; AI `DrawSeat`s top, your seat bottom, and `BettingControls` (betting rounds) or `DiscardControls` (during `drawing`) docked below your seat, `SessionBar` right rail. Pure presentational; takes the machine snapshot + callbacks.
- [ ] **Step 3: Run tests.**

### Task C.3: FiveCardDrawPage (orchestrator)

**Files:** Replace `FiveCardDrawPage.tsx`; create `FiveCardDrawPage.test.tsx`

- [ ] **Step 1: Build the page** mirroring `HoldemPage.tsx`:
  - Session-keyed sub-component mounting `useMachine(drawMachine, { input })` after `placeBet` resolves.
  - Wallet bridge: SIT DOWN (`placeBet(buyIn)` → session handle), REBUY (`placeBet`), LEAVE (`settleRound` with `details.variant: 'five-card-draw'`, `betAmount: totalBoughtIn`, `payout: finalStack`).
  - **AI driver `useEffect`** — when `toActSeat` is an AI seat:
    - In `bet_predraw`/`bet_postdraw`: build a `DecisionContext` with the AI's 5 hole cards as `holeCards`, **`board: []`**, and **`street: 'flop'`** (NOT `'preflop'`) so `decide` uses `postflopStrength(evaluateBest5(...))` on the full 5-card hand — see spec §5. Send `AI_ACTION`.
    - In `drawing`: call `decideDiscard(seat.holeCards, archetype, rng)` and send `AI_DISCARD { seatId, indices }`.
    - Both after a seeded thinking delay (`useReducedMotion` → ~0).
  - `START_HAND`/`RESEAT_AI` loops + `beforeunload` best-effort settle (copy from HoldemPage).
  - Renders SetupPanel (pre-sit; pass a "Five-Card Draw" variant label) → DrawTable (seated) → session-over summary.
  - Seed a `mulberry32` per session for AI jitter/reseat (no `Math.random`).

- [ ] **Step 2: `FiveCardDrawPage.test.tsx`** — e2e (fake-indexeddb + wallet hydration + seeded deck + `useReducedMotion` mocked true):
  - Sit down (table 2, Low) → SIT DOWN debits wallet + DrawTable renders.
  - Drive a full hand: pre-draw bet → discard → draw → post-draw bet → showdown (AI driver running under fake timers) → stacks change.
  - LEAVE TABLE → assert a `rounds` row: `game: 'poker'`, `details.variant: 'five-card-draw'`, `stake === totalBoughtIn`, `payout === finalStack`.

- [ ] **Step 3: Manual smoke** (if browser): `/play/poker/five-card-draw` → sit → play a hand incl. a discard → leave. Verify cards match the blackjack visual, the tap-to-discard works, AI shows draw counts. If headless, note it.

- [ ] **Step 4: DoD + commit + PR C**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
git add src/games/poker/five-card-draw/
git commit -m "feat(poker): Five-Card Draw UI + wallet/AI bridge (PR C)"
git push -u origin phase-13b-draw-pr-c
gh pr create --title "phase-13b(poker): PR C — UI (full play surface)" --body "PR C of Phase 13b. DiscardControls (tap-to-discard, cap 3) + DrawSeat + DrawTable + full FiveCardDrawPage (wallet bridge + AI betting/discard driver). Reuses Hold'em BettingControls/SessionBar/ShowdownReveal/SetupPanel. Playable via /play/poker/five-card-draw. ~40 tests."
```

---

## PR D — Variant modal + BUILD_GUIDE + release

**Branch:** `phase-13b-draw-pr-d` (off main after PR C merged)

### Task D.1: Activate the variant modal card

**Files:** `src/games/poker/_shared/PokerVariantModal.tsx` + test

- [ ] **Step 1: Branch + read the modal**

```bash
git checkout main && git pull origin main
git checkout -b phase-13b-draw-pr-d
cat src/games/poker/_shared/PokerVariantModal.tsx
```

- [ ] **Step 2: Flip the Five-Card Draw card** from greyed "COMING SOON" to active → `navigate('/play/poker/five-card-draw')`. Leave Omaha greyed.
- [ ] **Step 3: Update `PokerVariantModal.test.tsx`** — assert Five-Card Draw is now active + navigates; Omaha still coming-soon.

### Task D.2: BUILD_GUIDE

- [ ] **Step 1: Update §10.8** (Poker) to note Five-Card Draw is now live alongside Hold'em (single draw, cap 3, shared infra), and update the §12 roadmap row for 13b (✅ Shipped 2026-05-21 — `v0.13b-five-card-draw`). Reference the spec + plan paths.

### Task D.3: DoD + commit + PR D

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
git add src/games/poker/_shared/PokerVariantModal.tsx src/games/poker/_shared/PokerVariantModal.test.tsx BUILD_GUIDE.md
git commit -m "feat(poker): activate Five-Card Draw variant + BUILD_GUIDE (PR D)"
git push -u origin phase-13b-draw-pr-d
gh pr create --title "phase-13b(poker): PR D — activate variant + BUILD_GUIDE" --body "PR D of Phase 13b. Flip the Five-Card Draw card in PokerVariantModal to active (→ /play/poker/five-card-draw); BUILD_GUIDE §10.8 + §12 updated."
```

### Task D.4: Tag + Release + memory (post-merge, controller)

- [ ] **Step 1:** `git checkout main && git pull origin main`
- [ ] **Step 2:** `git tag -a v0.13b-five-card-draw -m "Phase 13b: No-Limit Five-Card Draw" && git push origin v0.13b-five-card-draw`
- [ ] **Step 3:** `gh release create v0.13b-five-card-draw` — highlights: NLHE Five-Card Draw 2-6 vs archetype AI, single draw cap 3, archetype-flavoured discard AI, reuses the entire poker `_shared/` core (Hold'em untouched), tap-to-discard UI. List PRs A-D + test delta.
- [ ] **Step 4: Memory** — update `project_localgamble_status.md`: top entry `v0.13b-five-card-draw`; next phase 13c (Omaha — uses `evaluateFrom(..., 'omaha')` already in `_shared`); milestones (poker variant reuse: a second variant in 4 PRs vs 13a's 6, validating the `_shared` split; `decideDiscard` heuristic). Append 13b deferred items to `localgamble-deferred-features`.

---

## Self-review checklist

After PR D:

- [ ] Spec §2-§8 each map to ≥1 task.
- [ ] No placeholders.
- [ ] Type/name consistency: `decideDiscard`, `dealHand`, `applyDiscards`, `resolveShowdown`, `drawMachine`, `DrawContext`, `DrawSeatState`, `DrawEvent`, `DiscardControls`, `DrawTable`, `FiveCardDrawPage`.
- [ ] The betting-AI street mapping (`street: 'flop'` + 5 holeCards + empty board) is implemented in the page's AI driver (spec §5).
- [ ] Manual smoke: 2 + 6 player tables, a discard + a stand-pat, an all-in side pot, rebuy, leave-and-settle.
- [ ] Cards match blackjack/baccarat; /stats + /leaderboard show the poker session.
