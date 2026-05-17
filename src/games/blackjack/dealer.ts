import { handTotal } from './hand';
import type { Card } from './types';

/** H17: dealer hits on soft 17 (e.g. A-6, A-2-4), stands on hard 17 and higher. */
export function dealerShouldHit(cards: readonly Card[]): boolean {
  const total = handTotal(cards);
  if (total.value < 17) return true;
  if (total.value === 17 && total.soft) return true;
  return false;
}
