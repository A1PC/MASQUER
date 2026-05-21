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

describe('resolveShowdown — omaha 2+3 rule', () => {
  function c(r: Card['rank'], s: Card['suit']): Card {
    return { rank: r, suit: s };
  }
  it("awards via exactly-2-hole + 3-board (a Hold'em-rules winner can LOSE under Omaha)", () => {
    // Board has 4 hearts. Seat 0 has ONE heart (would be a flush in Hold'em using 1 hole card —
    // illegal in Omaha). Seat 1 has TWO hearts (a legal Omaha flush).
    const board = [c(2, 'h'), c(7, 'h'), c(9, 'h'), c(11, 'h'), c(3, 's')];
    const awards = resolveShowdown({
      board,
      seats: [
        {
          seatId: 0,
          holeCards: [c(14, 'h'), c(14, 's'), c(13, 's'), c(12, 'c')],
          committed: 100,
          folded: false,
        }, // 1 heart → no flush in Omaha; best is a pair of aces
        {
          seatId: 1,
          holeCards: [c(5, 'h'), c(6, 'h'), c(13, 'c'), c(12, 'd')],
          committed: 100,
          folded: false,
        }, // 2 hearts → legal heart flush
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
        {
          seatId: 0,
          holeCards: [c(2, 'h'), c(7, 's'), c(14, 'c'), c(13, 'd')],
          committed: 50,
          folded: false,
        }, // two pair (2s+7s) using 2 hole
        {
          seatId: 1,
          holeCards: [c(9, 'c'), c(9, 's'), c(11, 'h'), c(12, 'd')],
          committed: 200,
          folded: false,
        }, // trip nines
        {
          seatId: 2,
          holeCards: [c(3, 'h'), c(3, 'd'), c(10, 'c'), c(11, 's')],
          committed: 200,
          folded: false,
        }, // trip threes
      ],
    });
    // main pot 150 → seat 1 (trips beat two pair); side pot 300 → seat 1 (trip nines > trip threes)
    expect(awards[1]).toBe(450);
  });
});
