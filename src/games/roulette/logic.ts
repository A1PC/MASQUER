import { randomInt } from '@/systems/rng';
import { colorOf, pocketIndexOf } from './wheel';
import type { BetOutcome, PlacedBet, SpinResult } from './types';

export function spin(): SpinResult {
  const n = randomInt(0, 36);
  return { number: n, color: colorOf(n), pocketIndex: pocketIndexOf(n) };
}

export function settleOne(bet: PlacedBet, spinResult: SpinResult): BetOutcome {
  const won = bet.numbers.includes(spinResult.number);
  const payout = won ? bet.amount + bet.amount * bet.payoutMultiple : 0;
  return { key: bet.key, type: bet.type, amount: bet.amount, won, payout };
}
