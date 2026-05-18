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

/** Spec §4.3: Player draws a third card iff two-card total is 0..5. */
export function playerDrawsThird(playerTotal: HandTotal): boolean {
  if (playerTotal === 8 || playerTotal === 9) {
    throw new Error('playerDrawsThird: natural pre-empted; caller bug');
  }
  return playerTotal <= 5;
}

/**
 * Spec §4.3: Banker draws iff their two-card total + player's third-card
 * outcome match the canonical tableau.
 *
 * `playerThirdValue` is the Baccarat value (0-9) of Player's third card, or
 * `null` if Player did not draw (stood on 6/7).
 *
 * Naturals are pre-empted upstream; this function throws if banker total is 8/9.
 */
export function bankerDrawsThird(bankerTotal: HandTotal, playerThirdValue: number | null): boolean {
  if (bankerTotal === 8 || bankerTotal === 9) {
    throw new Error('bankerDrawsThird: natural pre-empted; caller bug');
  }

  // Player stood on 6/7 → Banker uses the simpler two-card-total rule.
  if (playerThirdValue === null) {
    return bankerTotal <= 5;
  }

  // Player drew. Validate input is in 0-9.
  if (!Number.isInteger(playerThirdValue) || playerThirdValue < 0 || playerThirdValue > 9) {
    throw new Error(`bankerDrawsThird: invalid playerThirdValue ${playerThirdValue}`);
  }

  // Canonical Baccarat tableau — spec §4.3.
  switch (bankerTotal) {
    case 0:
    case 1:
    case 2:
      return true;
    case 3:
      return playerThirdValue !== 8;
    case 4:
      return playerThirdValue >= 2 && playerThirdValue <= 7;
    case 5:
      return playerThirdValue >= 4 && playerThirdValue <= 7;
    case 6:
      return playerThirdValue === 6 || playerThirdValue === 7;
    case 7:
      return false;
    default:
      throw new Error(`bankerDrawsThird: impossible bankerTotal ${String(bankerTotal)}`);
  }
}
