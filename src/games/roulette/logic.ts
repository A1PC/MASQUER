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

import type { RouletteRoundDetails } from './types';

export function buildRoundResult(
  bets: readonly PlacedBet[],
  spinResult: SpinResult,
): {
  outcome: 'win' | 'loss' | 'push';
  betAmount: number;
  payout: number;
  netChange: number;
  details: RouletteRoundDetails;
} {
  const outcomes = bets.map((b) => settleOne(b, spinResult));
  const betAmount = bets.reduce((sum, b) => sum + b.amount, 0);
  const payout = outcomes.reduce((sum, o) => sum + o.payout, 0);
  const netChange = payout - betAmount;
  const outcome: 'win' | 'loss' | 'push' = netChange > 0 ? 'win' : netChange < 0 ? 'loss' : 'push';

  const details: RouletteRoundDetails = {
    spin: spinResult,
    bets: bets.map((b, i) => ({
      key: b.key,
      type: b.type,
      numbers: b.numbers,
      amount: b.amount,
      payout: outcomes[i]!.payout,
    })),
  };

  return { outcome, betAmount, payout, netChange, details };
}
