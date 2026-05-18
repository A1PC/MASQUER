import type { Card, Hand, HandTotal, Rank } from './types';

const RANK_VALUE: Record<Rank, number> = {
  A: 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 0,
  J: 0,
  Q: 0,
  K: 0,
};

/** Baccarat card value: A=1, 2-9 face, 10/J/Q/K = 0. */
export function cardValue(card: Card): number {
  return RANK_VALUE[card.rank];
}

/** Hand total = ones digit of sum of card values. Always 0-9. */
export function handTotal(cards: readonly Card[]): HandTotal {
  const sum = cards.reduce((s, c) => s + cardValue(c), 0);
  return (sum % 10) as HandTotal;
}

/** Build a Hand from cards (computes total). */
export function makeHand(cards: readonly Card[]): Hand {
  return { cards, total: handTotal(cards) };
}

/** Are the first two cards of `cards` the same RANK? (10 and J do NOT pair.) */
export function isPair(cards: readonly Card[]): boolean {
  return cards.length >= 2 && cards[0]!.rank === cards[1]!.rank;
}
