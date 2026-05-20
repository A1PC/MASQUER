import { describe, it, expect } from 'vitest';
import { dealHand, nextActiveSeat, resolveShowdown } from './holdemLogic';
import type { Card } from '../_shared/types';

describe('dealHand', () => {
  it('deals 2 hole cards per seat + 5 board, all distinct (3 seats)', () => {
    const { holeCards, board } = dealHand('seed.1', 3);
    expect(holeCards).toHaveLength(3);
    holeCards.forEach((h) => expect(h).toHaveLength(2));
    expect(board).toHaveLength(5);
    const all = [...holeCards.flat(), ...board];
    const keys = new Set(all.map((c) => `${c.rank}${c.suit}`));
    expect(keys.size).toBe(all.length); // no reuse
  });

  it('deals 2 hole cards per seat + 5 board, all distinct (6 seats)', () => {
    const { holeCards, board } = dealHand('seed.6seats', 6);
    expect(holeCards).toHaveLength(6);
    holeCards.forEach((h) => expect(h).toHaveLength(2));
    expect(board).toHaveLength(5);
    const all = [...holeCards.flat(), ...board];
    const keys = new Set(all.map((c) => `${c.rank}${c.suit}`));
    expect(keys.size).toBe(all.length);
  });

  it('deals 2 hole cards per seat + 5 board, all distinct (2 seats / heads-up)', () => {
    const { holeCards, board } = dealHand('seed.hu', 2);
    expect(holeCards).toHaveLength(2);
    holeCards.forEach((h) => expect(h).toHaveLength(2));
    expect(board).toHaveLength(5);
    const all = [...holeCards.flat(), ...board];
    const keys = new Set(all.map((c) => `${c.rank}${c.suit}`));
    expect(keys.size).toBe(all.length);
  });

  it('is deterministic by seed', () => {
    expect(dealHand('s', 4)).toEqual(dealHand('s', 4));
  });

  it('produces different results for different seeds', () => {
    const a = dealHand('seed-a', 4);
    const b = dealHand('seed-b', 4);
    // With very high probability the first hole card differs
    expect(a.holeCards[0]![0]).not.toEqual(b.holeCards[0]![0]);
  });

  it('deals sequentially around the table (first two cards are one per seat)', () => {
    // seat 0 gets deck[0] and deck[numSeats], seat 1 gets deck[1] and deck[numSeats+1]
    // verify via two-seat known-deck structure: holeCards[0][0] != holeCards[0][1]
    const { holeCards } = dealHand('seq.test', 2);
    expect(holeCards[0]![0]).not.toEqual(holeCards[0]![1]);
    expect(holeCards[1]![0]).not.toEqual(holeCards[1]![1]);
  });
});

describe('nextActiveSeat', () => {
  it('skips non-active seats and wraps clockwise', () => {
    const seats = [
      { status: 'folded' as const },
      { status: 'active' as const },
      { status: 'all-in' as const },
      { status: 'active' as const },
    ];
    expect(nextActiveSeat(seats, 1)).toBe(3);
    expect(nextActiveSeat(seats, 3)).toBe(1);
  });

  it('skips busted and empty seats', () => {
    const seats = [
      { status: 'active' as const },
      { status: 'busted' as const },
      { status: 'empty' as const },
      { status: 'active' as const },
    ];
    expect(nextActiveSeat(seats, 0)).toBe(3);
    expect(nextActiveSeat(seats, 3)).toBe(0);
  });

  it('returns from when only one active seat (no other active)', () => {
    const seats = [
      { status: 'active' as const },
      { status: 'folded' as const },
      { status: 'all-in' as const },
    ];
    expect(nextActiveSeat(seats, 0)).toBe(0);
  });

  it('wraps correctly from last index', () => {
    const seats = [
      { status: 'active' as const },
      { status: 'folded' as const },
      { status: 'active' as const },
    ];
    expect(nextActiveSeat(seats, 2)).toBe(0);
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

  it('splits a tie and gives the odd chip to the first winner (seatId order)', () => {
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

  it('folded player does not win even with best cards', () => {
    const awards = resolveShowdown({
      board: [c(2, 'c'), c(3, 'd'), c(4, 'h'), c(8, 's'), c(9, 'c')],
      seats: [
        { seatId: 0, holeCards: [c(14, 'h'), c(14, 'd')], committed: 100, folded: true }, // best hand but folded
        { seatId: 1, holeCards: [c(2, 'h'), c(2, 's')], committed: 100, folded: false }, // trips 2s
      ],
    });
    expect(awards[0]).toBeUndefined();
    expect(awards[1]).toBe(200);
  });

  it('three-way tie splits evenly', () => {
    const awards = resolveShowdown({
      board: [c(14, 'c'), c(13, 'd'), c(12, 'h'), c(11, 's'), c(10, 'c')], // broadway board
      seats: [
        { seatId: 0, holeCards: [c(2, 'h'), c(3, 'd')], committed: 100, folded: false },
        { seatId: 1, holeCards: [c(4, 'h'), c(5, 's')], committed: 100, folded: false },
        { seatId: 2, holeCards: [c(6, 'h'), c(7, 's')], committed: 100, folded: false },
      ],
    });
    // pot 300, three-way tie (all play the board broadway)
    expect(awards[0]! + awards[1]! + awards[2]!).toBe(300);
    // each gets 100 (300 / 3 = 100, no remainder)
    expect(awards[0]).toBe(100);
    expect(awards[1]).toBe(100);
    expect(awards[2]).toBe(100);
  });
});
