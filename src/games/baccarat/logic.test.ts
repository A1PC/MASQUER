import { describe, expect, it } from 'vitest';
import {
  bankerDrawsThird,
  cardValue,
  handTotal,
  isPair,
  makeHand,
  playerDrawsThird,
} from './logic';
import type { Card, HandTotal, Rank, Suit } from './types';

function card(rank: Rank, suit: Suit = '♠'): Card {
  return { rank, suit, faceUp: true };
}

describe('cardValue', () => {
  it('A=1', () => expect(cardValue(card('A'))).toBe(1));
  it.each(['2', '3', '4', '5', '6', '7', '8', '9'] as Rank[])('%s = face', (r) => {
    expect(cardValue(card(r))).toBe(Number(r));
  });
  it.each(['10', 'J', 'Q', 'K'] as Rank[])('%s = 0', (r) => {
    expect(cardValue(card(r))).toBe(0);
  });
});

describe('handTotal', () => {
  it('empty hand = 0', () => expect(handTotal([])).toBe(0));
  it('single A = 1', () => expect(handTotal([card('A')])).toBe(1));
  it('two cards under 10 (3 + 4) = 7', () => expect(handTotal([card('3'), card('4')])).toBe(7));
  it('7 + 8 = 15 → ones digit 5', () => expect(handTotal([card('7'), card('8')])).toBe(5));
  it('K + Q = 0 (both worth 0)', () => expect(handTotal([card('K'), card('Q')])).toBe(0));
  it('A + 9 = 10 → ones digit 0', () => expect(handTotal([card('A'), card('9')])).toBe(0));
  it('9 + 9 + 9 = 27 → ones digit 7', () =>
    expect(handTotal([card('9'), card('9'), card('9')])).toBe(7));
});

describe('makeHand', () => {
  it('returns cards + total', () => {
    const h = makeHand([card('7'), card('8')]);
    expect(h.cards).toHaveLength(2);
    expect(h.total).toBe(5);
  });
});

describe('isPair', () => {
  it('two same-rank cards = pair', () =>
    expect(isPair([card('7', '♠'), card('7', '♥')])).toBe(true));
  it('two different ranks = not a pair', () => expect(isPair([card('7'), card('8')])).toBe(false));
  it('10 + J = not a pair (rank-based, not value-based)', () =>
    expect(isPair([card('10'), card('J')])).toBe(false));
  it('J + Q = not a pair', () => expect(isPair([card('J'), card('Q')])).toBe(false));
  it('K + K = pair', () => expect(isPair([card('K', '♠'), card('K', '♦')])).toBe(true));
  it('A + A = pair', () => expect(isPair([card('A', '♣'), card('A', '♥')])).toBe(true));
  it('1 card = not a pair', () => expect(isPair([card('7')])).toBe(false));
  it('0 cards = not a pair', () => expect(isPair([])).toBe(false));
  it('ignores the third card if present', () =>
    expect(isPair([card('7'), card('7'), card('K')])).toBe(true));
});

describe('playerDrawsThird', () => {
  it.each([0, 1, 2, 3, 4, 5] as HandTotal[])('total %i → draws', (t) => {
    expect(playerDrawsThird(t)).toBe(true);
  });
  it.each([6, 7] as HandTotal[])('total %i → stands', (t) => {
    expect(playerDrawsThird(t)).toBe(false);
  });
  it.each([8, 9] as HandTotal[])('throws on natural (%i) — caller bug', (t) => {
    expect(() => playerDrawsThird(t)).toThrow(/natural pre-empted/);
  });
});

describe('bankerDrawsThird — Player stood (playerThirdValue=null)', () => {
  it.each([0, 1, 2, 3, 4, 5] as HandTotal[])('banker %i → draws', (t) => {
    expect(bankerDrawsThird(t, null)).toBe(true);
  });
  it.each([6, 7] as HandTotal[])('banker %i → stands', (t) => {
    expect(bankerDrawsThird(t, null)).toBe(false);
  });
});

describe('bankerDrawsThird — Player drew (canonical tableau cells)', () => {
  // For each banker total 0..7, exhaustive over playerThirdValue 0..9.
  const TABLE: Array<{ banker: HandTotal; expected: ReadonlyArray<boolean> }> = [
    // index 0..9 = playerThirdValue
    { banker: 0, expected: [true, true, true, true, true, true, true, true, true, true] },
    { banker: 1, expected: [true, true, true, true, true, true, true, true, true, true] },
    { banker: 2, expected: [true, true, true, true, true, true, true, true, true, true] },
    { banker: 3, expected: [true, true, true, true, true, true, true, true, false, true] },
    { banker: 4, expected: [false, false, true, true, true, true, true, true, false, false] },
    { banker: 5, expected: [false, false, false, false, true, true, true, true, false, false] },
    { banker: 6, expected: [false, false, false, false, false, false, true, true, false, false] },
    { banker: 7, expected: [false, false, false, false, false, false, false, false, false, false] },
  ];

  for (const { banker, expected } of TABLE) {
    describe(`banker ${banker}`, () => {
      for (let v = 0; v <= 9; v++) {
        const want = expected[v]!;
        it(`player third = ${v} → ${want ? 'draws' : 'stands'}`, () => {
          expect(bankerDrawsThird(banker, v)).toBe(want);
        });
      }
    });
  }
});

describe('bankerDrawsThird — input validation', () => {
  it.each([8, 9] as HandTotal[])('throws on natural banker (%i)', (t) => {
    expect(() => bankerDrawsThird(t, 0)).toThrow(/natural pre-empted/);
  });
  it('throws on non-integer playerThirdValue', () => {
    expect(() => bankerDrawsThird(3, 1.5)).toThrow(/invalid playerThirdValue/);
  });
  it('throws on negative playerThirdValue', () => {
    expect(() => bankerDrawsThird(3, -1)).toThrow(/invalid playerThirdValue/);
  });
  it('throws on playerThirdValue > 9', () => {
    expect(() => bankerDrawsThird(3, 10)).toThrow(/invalid playerThirdValue/);
  });
});
