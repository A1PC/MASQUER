import type { Card, Hand, HandTotal, Rank } from './types';

/** Compute hand value, picking the best (highest, not busting) Ace interpretation.
 *  Returns the value AND whether it's "soft" (contains an Ace counted as 11). */
export function handTotal(cards: readonly Card[]): HandTotal {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === 'A') {
      aces += 1;
      total += 11;
    } else {
      total += rankValue(c.rank);
    }
  }
  let acesAsEleven = aces;
  while (total > 21 && acesAsEleven > 0) {
    total -= 10;
    acesAsEleven -= 1;
  }
  return { value: total, soft: acesAsEleven > 0 };
}

export function isBust(cards: readonly Card[]): boolean {
  return handTotal(cards).value > 21;
}

/** A natural blackjack: exactly 2 cards, totaling 21, not from a split. */
export function isNaturalBlackjack(hand: Hand): boolean {
  if (hand.fromSplit) return false;
  if (hand.cards.length !== 2) return false;
  return handTotal(hand.cards).value === 21;
}

/** Player can split if hand has exactly 2 cards of the same RANK VALUE
 *  (10-value cards split with each other: 10-J, J-Q, etc., per common house rule). */
export function canSplit(hand: Hand, currentHandCount: number, maxHands: number): boolean {
  if (hand.cards.length !== 2) return false;
  if (currentHandCount >= maxHands) return false;
  if (hand.fromSplitAces) return false;
  const [a, b] = hand.cards;
  if (!a || !b) return false;
  return rankValue(a.rank) === rankValue(b.rank);
}

/** Player can double on a 2-card hand. Can double after split only if DAS is enabled.
 *  Split-Ace hands cannot double (no further actions per standard rule). */
export function canDouble(hand: Hand, dasEnabled: boolean): boolean {
  if (hand.cards.length !== 2) return false;
  if (hand.doubled) return false;
  if (hand.fromSplitAces) return false;
  if (hand.fromSplit && !dasEnabled) return false;
  return true;
}

function rankValue(rank: Rank): number {
  if (rank === 'A') return 11;
  if (rank === '10' || rank === 'J' || rank === 'Q' || rank === 'K') return 10;
  return Number.parseInt(rank, 10);
}
