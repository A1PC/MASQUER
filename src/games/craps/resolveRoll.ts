import type { Roll } from './dice';
import { BET_TYPES, type Phase, type BetOutcome } from './bets';

export interface ActiveBet {
  betId: string;
  amount: number;
  betPoint: number | null;
}

export interface RollResolution {
  perBet: Array<{ bet: ActiveBet; outcome: BetOutcome }>;
  netReturned: number; // chips returned to bankroll this roll (stake-returns + winnings; losers contribute 0)
}

export function resolveRoll(
  bets: ActiveBet[],
  roll: Roll,
  phase: Phase,
  point: number | null,
): RollResolution {
  const perBet: Array<{ bet: ActiveBet; outcome: BetOutcome }> = [];
  let netReturned = 0;
  for (const bet of bets) {
    const type = BET_TYPES[bet.betId];
    if (!type) {
      perBet.push({ bet, outcome: { kind: 'standing' } });
      continue;
    }
    if (!type.isWorking(phase)) {
      perBet.push({ bet, outcome: { kind: 'standing' } });
      continue;
    }
    const outcome = type.resolve(roll, phase, point, bet.betPoint, bet.amount);
    if (outcome.kind === 'win') {
      // precedence: explicit integer winnings → multiplier → fixed payout()
      const winnings =
        outcome.winnings ??
        (outcome.multiplier !== undefined
          ? bet.amount * outcome.multiplier
          : type.payout(bet.amount, bet.betPoint));
      netReturned += bet.amount + winnings; // stake back + winnings
    } else if (outcome.kind === 'push') {
      netReturned += bet.amount; // stake back
    }
    perBet.push({ bet, outcome });
  }
  return { perBet, netReturned };
}
