import { randomInt, shuffle } from '@/systems/rng';
import { buildShoe } from '@/games/blackjack/cards';
import type { Card } from '@/games/blackjack/types';
import { DECKS_PER_SHOE, CUT_CARD_RANGE_FROM_END } from './config';
import type { ShoeState } from './types';

/**
 * Build a fresh 8-deck shoe with a uniformly-random cut-card position.
 * Reuses Phase 3's buildShoe (which builds an N-deck array of Cards) and
 * shuffles with the project RNG.
 */
export function build8DeckShoe(): ShoeState {
  const cards = shuffle(buildShoe(DECKS_PER_SHOE));
  const initialSize = cards.length; // 416
  const fromEnd = randomInt(CUT_CARD_RANGE_FROM_END.min, CUT_CARD_RANGE_FROM_END.max);
  // cutPosition = "draw this many cards before the cut card is reached".
  const cutPosition = initialSize - fromEnd;
  return {
    cards,
    initialSize,
    cutPosition,
    cutCardPassed: false,
  };
}

/**
 * Draw the next card off the shoe. Returns the drawn card + the new ShoeState
 * with that card removed. Throws if shoe is empty (caller bug).
 *
 * Note: cutCardPassed is NOT updated here. It's only updated AFTER a round
 * completes (one-round-delayed reshuffle per ADR-0037). Call markCutIfPassed
 * once at end of round.
 */
export function drawFromShoe(shoe: ShoeState): { card: Card; shoe: ShoeState } {
  if (shoe.cards.length === 0) {
    throw new RangeError('drawFromShoe: shoe is empty');
  }
  const [card, ...rest] = shoe.cards;
  return { card: card!, shoe: { ...shoe, cards: rest } };
}

/**
 * After a round, check whether we've crossed the cut card. If so, mark
 * the shoe so the NEXT round triggers a reshuffle.
 */
export function markCutIfPassed(shoe: ShoeState): ShoeState {
  const dealt = shoe.initialSize - shoe.cards.length;
  if (dealt >= shoe.cutPosition && !shoe.cutCardPassed) {
    return { ...shoe, cutCardPassed: true };
  }
  return shoe;
}

/** Returns true if the next round should start with a fresh shoe. */
export function shouldReshuffleBeforeNextRound(shoe: ShoeState): boolean {
  return shoe.cutCardPassed;
}

/** Cards remaining before the cut card. May be negative if cut was already crossed. */
export function cardsToCut(shoe: ShoeState): number {
  return shoe.cutPosition - (shoe.initialSize - shoe.cards.length);
}
