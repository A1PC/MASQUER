import type { Card } from '../types';
import { evaluateBest5 } from '../handEvaluator';
import { ARCHETYPES, type Archetype } from './archetypes';

/** Defensive cap: dedupe, drop out-of-range, cap at 3. */
function clampDiscard(indices: number[]): number[] {
  return [...new Set(indices)].filter((i) => i >= 0 && i < 5).slice(0, 3);
}

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
      return clampDiscard([4]);
    }
    return clampDiscard([]);
  }

  const baseline = baselineDiscard(holeCards);

  // Archetype flavour:
  if (archetype === 'maniac' && rng() < profile.bluffFactor) {
    // bluff: stand pat on a weak hand (rep strength)
    return clampDiscard([]);
  }
  if ((archetype === 'station' || archetype === 'shark') && baseline.length > 0 && rng() < 0.15) {
    // keep one extra high kicker → draw one fewer (drop the highest discard index whose card is a high card)
    return clampDiscard(baseline.slice(0, baseline.length - 1));
  }
  return clampDiscard(baseline);
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

/** If 4 of the 5 cards form 4 consecutive distinct ranks, return the indices
 *  of those 4 cards to KEEP. Returns null if no such group exists. */
function fourToStraight(ranks: number[]): number[] | null {
  const uniq = [...new Set(ranks)].sort((a, b) => a - b);
  if (uniq.length < 4) return null;
  for (let start = 0; start + 4 <= uniq.length; start += 1) {
    const window = uniq.slice(start, start + 4);
    if (window[3]! - window[0]! === 3) {
      // 4 consecutive ranks → return the indices of these 4 cards to KEEP
      const keepRanks = new Set(window);
      const keepIdx: number[] = [];
      ranks.forEach((r, i) => {
        if (keepRanks.has(r) && keepIdx.length < 4) keepIdx.push(i);
      });
      return keepIdx;
    }
  }
  return null;
}
