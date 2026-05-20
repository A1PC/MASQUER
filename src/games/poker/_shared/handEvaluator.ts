import type { Card, HandCategory, HandRank, Rank } from './types';
import { CATEGORY_VALUE } from './types';

/** Generate all k-combinations of items in arr. */
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
    idx[i] = (idx[i] ?? 0) + 1;
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
