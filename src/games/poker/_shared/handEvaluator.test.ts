import { describe, it, expect } from 'vitest';
import { evaluateBest5, compareHands, evaluateFrom } from './handEvaluator';
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
  it('enumerates C(7,5)=21 combos to find the best hand', () => {
    // 7-card hand where best is a straight (not obvious without enumeration)
    // A K Q J T 2 3 — best 5 is A-K-Q-J-T straight-flush? No, mixed suits. best straight.
    const hr = evaluateBest5(hand('Ah', 'Kd', 'Qc', 'Js', 'Th', '2d', '3c'));
    expect(hr.category).toBe('straight');
    expect(hr.tiebreakers[0]).toBe(14);
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
  it('straight-flush beats quads', () => {
    const sf = evaluateBest5(hand('5h', '4h', '3h', '2h', 'Ah'));
    const quads = evaluateBest5(hand('Ah', 'Ad', 'Ac', 'As', 'Kh'));
    expect(compareHands(sf, quads)).toBeGreaterThan(0);
  });
  it('quads beats full house', () => {
    const q = evaluateBest5(hand('2h', '2d', '2c', '2s', 'Kh'));
    const fh = evaluateBest5(hand('Ah', 'Ad', 'Ac', 'Ks', 'Kh'));
    expect(compareHands(q, fh)).toBeGreaterThan(0);
  });
  it('higher high card wins', () => {
    const aceHigh = evaluateBest5(hand('Ah', 'Jd', '8c', '5s', '2h'));
    const kingHigh = evaluateBest5(hand('Kh', 'Jd', '8c', '5s', '2h'));
    expect(compareHands(aceHigh, kingHigh)).toBeGreaterThan(0);
  });
  it('two-pair resolved by higher pair first', () => {
    const aAndK = evaluateBest5(hand('Ah', 'Ad', 'Kc', 'Ks', '2h'));
    const aAndQ = evaluateBest5(hand('Ah', 'Ad', 'Qc', 'Qs', '2h'));
    expect(compareHands(aAndK, aAndQ)).toBeGreaterThan(0);
  });
  it('higher straight wins', () => {
    const ten = evaluateBest5(hand('Th', '9d', '8c', '7s', '6h'));
    const nine = evaluateBest5(hand('9h', '8d', '7c', '6s', '5h'));
    expect(compareHands(ten, nine)).toBeGreaterThan(0);
  });
  it('wheel straight loses to 6-high straight', () => {
    const wheel = evaluateBest5(hand('Ah', '2d', '3c', '4s', '5h'));
    const sixHigh = evaluateBest5(hand('6h', '5d', '4c', '3s', '2h'));
    expect(compareHands(wheel, sixHigh)).toBeLessThan(0);
  });
});

describe('tiebreakers shape', () => {
  it('high-card has 5 tiebreakers (all 5 ranks desc)', () => {
    const hr = evaluateBest5(hand('Ah', 'Jd', '8c', '5s', '2h'));
    expect(hr.tiebreakers).toEqual([14, 11, 8, 5, 2]);
  });
  it('pair has 4 tiebreakers: pair rank + 3 kickers', () => {
    const hr = evaluateBest5(hand('9h', '9d', 'Kc', '5s', '2h'));
    expect(hr.tiebreakers).toHaveLength(4);
    expect(hr.tiebreakers[0]).toBe(9);
    expect(hr.tiebreakers[1]).toBe(13); // K kicker first
  });
  it('trips has 3 tiebreakers: trip rank + 2 kickers', () => {
    const hr = evaluateBest5(hand('9h', '9d', '9c', 'Ks', '2h'));
    expect(hr.tiebreakers).toHaveLength(3);
    expect(hr.tiebreakers[0]).toBe(9);
  });
  it('full house has 2 tiebreakers', () => {
    const hr = evaluateBest5(hand('9h', '9d', '9c', '2s', '2h'));
    expect(hr.tiebreakers).toEqual([9, 2]);
  });
  it('straight has 1 tiebreaker (high card)', () => {
    const hr = evaluateBest5(hand('9h', '8d', '7c', '6s', '5h'));
    expect(hr.tiebreakers).toEqual([9]);
  });
  it('quads has 2 tiebreakers: quad rank + kicker', () => {
    const hr = evaluateBest5(hand('9h', '9d', '9c', '9s', '2h'));
    expect(hr.tiebreakers).toEqual([9, 2]);
  });
});

describe('evaluateFrom', () => {
  it("'any' mode uses all cards like evaluateBest5", () => {
    const hole = hand('Ah', 'Kh');
    const board = hand('Qh', 'Jh', 'Th', '2d', '3c');
    const result = evaluateFrom(hole, board, 'any');
    expect(result.category).toBe('straight-flush');
  });
  it("'omaha' mode requires exactly 2 hole + 3 board", () => {
    // Omaha: hole Ah Ad, board Kh Qh Jh Th 2c
    // Must use exactly 2 hole (Ah Ad) + 3 board — best is pair of aces + KQJ kickers
    // NOT a flush because must use 2 hole cards
    const hole = hand('Ah', 'Ad');
    const board = hand('Kh', 'Qh', 'Jh', 'Th', '2c');
    const result = evaluateFrom(hole, board, 'omaha');
    // Best with exactly 2 hole (Ah,Ad) + 3 board: pair of aces is category
    // e.g. Ah Ad Kh Qh Jh = pair of aces, or Ad Ah + Th,Jh,Qh = pair of aces
    expect(result.category).toBe('pair');
    expect(result.tiebreakers[0]).toBe(14); // aces
  });
  it("'omaha' mode throws when insufficient cards", () => {
    expect(() => evaluateFrom(hand('Ah'), hand('Kh', 'Qh'), 'omaha')).toThrow();
  });
});
