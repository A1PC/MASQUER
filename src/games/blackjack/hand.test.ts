import { describe, expect, it } from 'vitest';
import { canDouble, canSplit, handTotal, isBust, isNaturalBlackjack } from './hand';
import type { Card, Hand, Rank, Suit } from './types';

const card = (rank: Rank, suit: Suit = '♠', faceUp = true): Card => ({ rank, suit, faceUp });

function makeHand(overrides: Partial<Hand> = {}): Hand {
  return {
    cards: [],
    fromSplit: false,
    fromSplitAces: false,
    doubled: false,
    betHandleId: 'bh-x',
    betAmount: 10,
    resolved: false,
    ...overrides,
  };
}

describe('handTotal', () => {
  it('returns 0 for empty', () => {
    expect(handTotal([])).toEqual({ value: 0, soft: false });
  });

  it('K = 10 hard', () => {
    expect(handTotal([card('K')])).toEqual({ value: 10, soft: false });
  });

  it('A alone = 11 soft', () => {
    expect(handTotal([card('A')])).toEqual({ value: 11, soft: true });
  });

  it('A-A = 12 soft (one Ace as 11, one as 1)', () => {
    expect(handTotal([card('A'), card('A')])).toEqual({ value: 12, soft: true });
  });

  it('A-K = 21 soft (natural BJ value)', () => {
    expect(handTotal([card('A'), card('K')])).toEqual({ value: 21, soft: true });
  });

  it('A-7 = 18 soft', () => {
    expect(handTotal([card('A'), card('7')])).toEqual({ value: 18, soft: true });
  });

  it('A-7-5 = 13 hard (Ace converts to 1)', () => {
    expect(handTotal([card('A'), card('7'), card('5')])).toEqual({ value: 13, soft: false });
  });

  it('A-A-9 = 21 soft (one Ace stays at 11)', () => {
    expect(handTotal([card('A'), card('A'), card('9')])).toEqual({ value: 21, soft: true });
  });

  it('A-A-A-A-7 = 21 soft (one Ace stays 11, three convert to 1)', () => {
    expect(handTotal([card('A'), card('A'), card('A'), card('A'), card('7')])).toEqual({
      value: 21,
      soft: true,
    });
  });

  it('5-7-Q = 22 bust', () => {
    expect(handTotal([card('5'), card('7'), card('Q')])).toEqual({ value: 22, soft: false });
  });

  it('10-J = 20 hard', () => {
    expect(handTotal([card('10'), card('J')])).toEqual({ value: 20, soft: false });
  });

  it('respects a player-locked aceValue=1 when computing total', () => {
    const cards: Card[] = [
      { rank: 'A', suit: '♠', faceUp: true, aceValue: 1 },
      { rank: '5', suit: '♥', faceUp: true },
    ];
    expect(handTotal(cards)).toEqual({ value: 6, soft: false });
  });

  it('respects a player-locked aceValue=11 when computing total', () => {
    const cards: Card[] = [
      { rank: 'A', suit: '♠', faceUp: true, aceValue: 11 },
      { rank: '5', suit: '♥', faceUp: true },
    ];
    expect(handTotal(cards)).toEqual({ value: 16, soft: false });
  });

  it('keeps soft-auto when aceValue is not locked (dealer/unresolved)', () => {
    const cards: Card[] = [
      { rank: 'A', suit: '♠', faceUp: true },
      { rank: '5', suit: '♥', faceUp: true },
    ];
    expect(handTotal(cards)).toEqual({ value: 16, soft: true });
  });

  it('locked-11 Ace is NEVER demoted even when it would bust', () => {
    // Player deliberately chose 11; respect that even at 12+11 = 23.
    const cards: Card[] = [
      { rank: 'Q', suit: '♠', faceUp: true },
      { rank: '2', suit: '♥', faceUp: true },
      { rank: 'A', suit: '♦', faceUp: true, aceValue: 11 },
    ];
    expect(handTotal(cards)).toEqual({ value: 23, soft: false });
  });

  it('mix of locked + unlocked aces — unlocked one demotes, locked one stays', () => {
    // Locked-11 + unlocked-11 + 9 = 31 → unlocked demotes to 1 → 21
    const cards: Card[] = [
      { rank: 'A', suit: '♠', faceUp: true, aceValue: 11 },
      { rank: 'A', suit: '♥', faceUp: true },
      { rank: '9', suit: '♦', faceUp: true },
    ];
    expect(handTotal(cards)).toEqual({ value: 21, soft: false });
  });
});

describe('isBust', () => {
  it('returns true for total > 21', () => {
    expect(isBust([card('K'), card('Q'), card('5')])).toBe(true);
  });
  it('returns false for total <= 21', () => {
    expect(isBust([card('K'), card('A')])).toBe(false);
  });
});

describe('isNaturalBlackjack', () => {
  it('A-K, 2 cards, not from split → true', () => {
    expect(isNaturalBlackjack(makeHand({ cards: [card('A'), card('K')] }))).toBe(true);
  });

  it('A-K from a split → false', () => {
    expect(isNaturalBlackjack(makeHand({ cards: [card('A'), card('K')], fromSplit: true }))).toBe(
      false,
    );
  });

  it('A-7-3 = 21 in 3 cards → false', () => {
    expect(isNaturalBlackjack(makeHand({ cards: [card('A'), card('7'), card('3')] }))).toBe(false);
  });

  it('K-Q = 20 → false', () => {
    expect(isNaturalBlackjack(makeHand({ cards: [card('K'), card('Q')] }))).toBe(false);
  });
});

describe('canSplit', () => {
  it('two same-rank cards, room for another hand → true', () => {
    expect(canSplit(makeHand({ cards: [card('8'), card('8')] }), 1, 4)).toBe(true);
  });

  it('two cards with same value but different ranks (10 and J) → true (10-value rule)', () => {
    expect(canSplit(makeHand({ cards: [card('10'), card('J')] }), 1, 4)).toBe(true);
  });

  it('mismatched ranks → false', () => {
    expect(canSplit(makeHand({ cards: [card('8'), card('7')] }), 1, 4)).toBe(false);
  });

  it('three cards → false', () => {
    expect(canSplit(makeHand({ cards: [card('8'), card('8'), card('5')] }), 1, 4)).toBe(false);
  });

  it('at max hands → false', () => {
    expect(canSplit(makeHand({ cards: [card('8'), card('8')] }), 4, 4)).toBe(false);
  });

  it('hand created from split-Aces → false', () => {
    expect(canSplit(makeHand({ cards: [card('A'), card('A')], fromSplitAces: true }), 1, 4)).toBe(
      false,
    );
  });
});

describe('canDouble', () => {
  it('2 cards, DAS enabled, from main hand → true', () => {
    expect(canDouble(makeHand({ cards: [card('5'), card('6')] }), true)).toBe(true);
  });

  it('3 cards → false', () => {
    expect(canDouble(makeHand({ cards: [card('5'), card('5'), card('1' as Rank)] }), true)).toBe(
      false,
    );
  });

  it('already doubled → false', () => {
    expect(canDouble(makeHand({ cards: [card('5'), card('6')], doubled: true }), true)).toBe(false);
  });

  it('split-Ace hand → false', () => {
    expect(canDouble(makeHand({ cards: [card('A'), card('5')], fromSplitAces: true }), true)).toBe(
      false,
    );
  });

  it('split hand with DAS disabled → false', () => {
    expect(canDouble(makeHand({ cards: [card('5'), card('6')], fromSplit: true }), false)).toBe(
      false,
    );
  });

  it('split hand with DAS enabled → true', () => {
    expect(canDouble(makeHand({ cards: [card('5'), card('6')], fromSplit: true }), true)).toBe(
      true,
    );
  });
});
