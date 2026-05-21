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
  // four cards each, dealt one at a time around the table (standard Omaha deal)
  for (let round = 0; round < 4; round += 1) {
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
