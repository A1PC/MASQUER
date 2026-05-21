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

/** Index of the next seat (clockwise) with status 'active'. */
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
    // odd chip(s) go to the first winner(s) clockwise
    let i = 0;
    while (remainder > 0) {
      awards[winners[i % winners.length]!] = (awards[winners[i % winners.length]!] ?? 0) + 1;
      remainder -= 1;
      i += 1;
    }
  }
  return awards;
}

/** Re-export deckFromSeed so machine.ts can access deck for cursor-based draws. */
export { deckFromSeed };
