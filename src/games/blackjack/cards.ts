import { shuffle } from '@/systems/rng';
import type { Card, Rank, Suit } from './types';

const RANKS: readonly Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS: readonly Suit[] = ['♠', '♥', '♦', '♣'];

/** A multi-deck shoe of `decks * 52` cards in canonical order. Caller is responsible for shuffling. */
export function buildShoe(decks = 6): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ rank, suit, faceUp: true });
      }
    }
  }
  return cards;
}

/** Builds a fresh shuffled shoe of `decks` decks. Uses systems/rng (seedable in tests). */
export function freshShoe(decks = 6): Card[] {
  return shuffle(buildShoe(decks));
}

/** Mutating draw — removes and returns the top card of the shoe. Throws RangeError if empty. */
export function drawCard(shoe: Card[]): Card {
  const c = shoe.pop();
  if (!c) throw new RangeError('drawCard: shoe is empty');
  return c;
}

/** True when the shoe has had `cutAt` or more cards dealt (measured from `originalSize`).
 *  Used to trigger a reshuffle BEFORE the next round starts. */
export function needsReshuffle(shoe: Card[], originalSize: number, cutAt: number): boolean {
  const dealt = originalSize - shoe.length;
  return dealt >= cutAt;
}
