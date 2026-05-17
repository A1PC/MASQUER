import { randomInt } from '@/systems/rng';
import type { RoundResult } from '@/systems/wallet';

export type CoinSide = 'heads' | 'tails';

export interface CoinFlipDetails {
  call: CoinSide;
  landed: CoinSide;
}

/** Decides the outcome of a single coin flip round. Pure given RNG state. */
export function playRound(input: { call: CoinSide; betAmount: number }): RoundResult {
  const landed: CoinSide = randomInt(0, 1) === 0 ? 'heads' : 'tails';
  const won = landed === input.call;
  const payout = won ? input.betAmount * 2 : 0; // 1:1 → bet back + winnings
  const details: CoinFlipDetails = { call: input.call, landed };
  return {
    outcome: won ? 'win' : 'loss',
    betAmount: input.betAmount,
    payout,
    netChange: payout - input.betAmount,
    details,
  };
}

export const COIN_FLIP_CONFIG = {
  MIN_BET: 1,
  MAX_BET: 500,
} as const;
