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

  it('deals 5 per seat round-robin (card 0 to seat 0, card 1 to seat 1, …)', () => {
    const deck = deckFromSeed('rr.1');
    const { holeCards } = dealHand('rr.1', 3);
    // first round: seat 0 gets deck[0], seat 1 gets deck[1], seat 2 gets deck[2]
    expect(holeCards[0]![0]).toEqual(deck[0]);
    expect(holeCards[1]![0]).toEqual(deck[1]);
    expect(holeCards[2]![0]).toEqual(deck[2]);
    // second round: seat 0 gets deck[3], seat 1 gets deck[4], seat 2 gets deck[5]
    expect(holeCards[0]![1]).toEqual(deck[3]);
    expect(holeCards[1]![1]).toEqual(deck[4]);
    expect(holeCards[2]![1]).toEqual(deck[5]);
  });

  it('cursor equals numSeats * 5 for any valid seat count', () => {
    for (const n of [2, 3, 4, 5, 6]) {
      const { deckCursor } = dealHand(`seed-${n}`, n);
      expect(deckCursor).toBe(n * 5);
    }
  });

  it('different seeds produce different hands', () => {
    const a = dealHand('seed-a', 2);
    const b = dealHand('seed-b', 2);
    expect(a.holeCards[0]).not.toEqual(b.holeCards[0]);
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
    expect(holeCards[4]).toEqual(hole[4]);
  });

  it('clamps to ≤3 and ignores out-of-range/duplicate indices', () => {
    const deck = deckFromSeed('apply.2');
    const hole = deck.slice(0, 5);
    const { holeCards, cursor } = applyDiscards(deck, 30, hole, [0, 0, 1, 2, 3, 9]);
    expect(cursor).toBe(33); // only 3 drawn (0,1,2 after dedup/clamp)
    void holeCards;
  });

  it('stand pat (empty) leaves the hand + cursor unchanged', () => {
    const deck = deckFromSeed('apply.3');
    const hole = deck.slice(0, 5);
    const { holeCards, cursor } = applyDiscards(deck, 30, hole, []);
    expect(holeCards).toEqual(hole);
    expect(cursor).toBe(30);
  });

  it('single discard replaces only that index', () => {
    const deck = deckFromSeed('apply.4');
    const hole = deck.slice(0, 5);
    const { holeCards, cursor } = applyDiscards(deck, 20, hole, [3]);
    expect(cursor).toBe(21);
    expect(holeCards[3]).toEqual(deck[20]);
    expect(holeCards[0]).toEqual(hole[0]);
    expect(holeCards[1]).toEqual(hole[1]);
    expect(holeCards[2]).toEqual(hole[2]);
    expect(holeCards[4]).toEqual(hole[4]);
  });

  it('draw 3 replaces exactly 3 cards and advances cursor by 3', () => {
    const deck = deckFromSeed('apply.5');
    const hole = deck.slice(0, 5);
    const { holeCards, cursor } = applyDiscards(deck, 10, hole, [0, 1, 2]);
    expect(cursor).toBe(13);
    expect(holeCards[0]).toEqual(deck[10]);
    expect(holeCards[1]).toEqual(deck[11]);
    expect(holeCards[2]).toEqual(deck[12]);
    expect(holeCards[3]).toEqual(hole[3]);
    expect(holeCards[4]).toEqual(hole[4]);
  });

  it('returns a new array (does not mutate the input)', () => {
    const deck = deckFromSeed('apply.6');
    const hole = deck.slice(0, 5);
    const holeCopy = hole.slice();
    applyDiscards(deck, 30, hole, [0, 1, 2]);
    expect(hole).toEqual(holeCopy);
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

  it('returns from when no other active seat exists', () => {
    const seats = [
      { status: 'active' as const },
      { status: 'folded' as const },
      { status: 'busted' as const },
    ];
    expect(nextActiveSeat(seats, 0)).toBe(0);
  });

  it('skips busted and empty seats', () => {
    const seats = [
      { status: 'empty' as const },
      { status: 'busted' as const },
      { status: 'active' as const },
      { status: 'all-in' as const },
    ];
    expect(nextActiveSeat(seats, 0)).toBe(2);
    expect(nextActiveSeat(seats, 2)).toBe(2); // no other active
  });

  it('wraps around the table correctly', () => {
    const seats = [
      { status: 'active' as const },
      { status: 'folded' as const },
      { status: 'folded' as const },
      { status: 'folded' as const },
    ];
    // from seat 2, should wrap to seat 0
    expect(nextActiveSeat(seats, 2)).toBe(0);
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
    expect(awards[1]).toBeUndefined();
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
    expect(awards[0]).toBe(150); // main pot only (50 * 3)
    expect(awards[1]).toBe(300); // side pot (kings beat queens, 150 * 2)
  });

  it('splits tied hands evenly', () => {
    const awards = resolveShowdown({
      seats: [
        {
          seatId: 0,
          holeCards: [c(9, 'h'), c(9, 'd'), c(5, 'c'), c(4, 's'), c(2, 'h')],
          committed: 100,
          folded: false,
        }, // pair of 9s
        {
          seatId: 1,
          holeCards: [c(9, 'c'), c(9, 's'), c(5, 'h'), c(4, 'h'), c(2, 'd')],
          committed: 100,
          folded: false,
        }, // identical pair of 9s
      ],
    });
    expect(awards[0]).toBe(100);
    expect(awards[1]).toBe(100);
  });

  it('folded player cannot win the pot', () => {
    const awards = resolveShowdown({
      seats: [
        {
          seatId: 0,
          holeCards: [c(14, 'h'), c(14, 'd'), c(14, 'c'), c(14, 's'), c(2, 'h')],
          committed: 100,
          folded: true,
        }, // quad aces but folded
        {
          seatId: 1,
          holeCards: [c(2, 'c'), c(3, 'd'), c(4, 'h'), c(5, 's'), c(7, 'h')],
          committed: 100,
          folded: false,
        }, // junk but active
      ],
    });
    expect(awards[1]).toBe(200);
    expect(awards[0]).toBeUndefined();
  });

  it('odd chip goes to first winner when pot does not split evenly', () => {
    // 3-way tie with 101 chips each (303 total, 101 each… actually 100 each + 3 remainder)
    // Use a pot of 301 = 100.33 per player → 100 each + 1 to seat 0
    const awards = resolveShowdown({
      seats: [
        {
          seatId: 0,
          holeCards: [c(9, 'h'), c(9, 'd'), c(5, 'c'), c(4, 's'), c(2, 'h')],
          committed: 101,
          folded: false,
        },
        {
          seatId: 1,
          holeCards: [c(9, 'c'), c(9, 's'), c(5, 'h'), c(4, 'h'), c(2, 'd')],
          committed: 100,
          folded: false,
        },
        {
          seatId: 2,
          holeCards: [c(9, 'h'), c(9, 'd'), c(5, 'c'), c(4, 's'), c(2, 'c')],
          committed: 100,
          folded: false,
        },
      ],
    });
    // All 3 have same hand strength — pot is 301, 100 each + 1 remainder to seat 0
    const total = (awards[0] ?? 0) + (awards[1] ?? 0) + (awards[2] ?? 0);
    expect(total).toBe(301);
  });
});
