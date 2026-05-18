import { pickSymbol } from './symbols';
import { SLOTS_CONFIG, SLOTS_PAYTABLE, SLOTS_WEIGHTS } from './config';
import type { PayoutHit, SlotsRoundDetails, SpinResult, WinTier } from './types';

/** Spin all 3 reels independently. Pure modulo `rng`. */
export function spin(): SpinResult {
  return { reels: [pickSymbol(), pickSymbol(), pickSymbol()] };
}

/** Map a payout multiple to its visual celebration tier. */
export function winTierOf(multiple: number | null): WinTier {
  if (multiple === null) return 'none';
  if (multiple <= SLOTS_CONFIG.WIN_TIER_THRESHOLDS.SMALL_MAX) return 'small';
  if (multiple <= SLOTS_CONFIG.WIN_TIER_THRESHOLDS.MEDIUM_MAX) return 'medium';
  return 'jackpot';
}

/** Examine a spin and return the winning combo (or null).
 *  Order of checks: 3-of-a-kind first; then exactly-2-cherry. */
export function settleSpin(spinResult: SpinResult): PayoutHit | null {
  const [a, b, c] = spinResult.reels;

  if (a === b && b === c) {
    const key = `${a}-${b}-${c}` as PayoutHit['key'];
    return {
      key,
      multiple: SLOTS_PAYTABLE[key],
      winningReelIndices: [0, 1, 2],
    };
  }

  // Exactly-2-cherry (excludes 3-cherry, handled above).
  const cherryPositions = spinResult.reels
    .map((s, i) => (s === 'cherry' ? i : -1))
    .filter((i) => i >= 0);
  if (cherryPositions.length === 2) {
    return {
      key: 'two-cherry',
      multiple: SLOTS_PAYTABLE['two-cherry'],
      winningReelIndices: cherryPositions,
    };
  }

  return null;
}

export function buildRoundResult(input: { spin: SpinResult; bet: number }): {
  outcome: 'win' | 'loss' | 'push';
  betAmount: number;
  payout: number;
  netChange: number;
  details: SlotsRoundDetails;
} {
  const hit = settleSpin(input.spin);
  const grossReturn = hit ? input.bet * hit.multiple : 0;
  const netChange = grossReturn - input.bet;
  // Slots can never push exactly (multiples are 0/2/5/8/12/20/50). The 'push'
  // branch exists for RoundResult.outcome type compatibility only.
  const outcome: 'win' | 'loss' | 'push' = netChange > 0 ? 'win' : netChange < 0 ? 'loss' : 'push';

  return {
    outcome,
    betAmount: input.bet,
    payout: grossReturn,
    netChange,
    details: {
      spin: input.spin,
      payout: hit,
      bet: input.bet,
      winTier: winTierOf(hit?.multiple ?? null),
      config: {
        weights: SLOTS_WEIGHTS,
        minBet: SLOTS_CONFIG.MIN_BET,
        maxBet: SLOTS_CONFIG.MAX_BET,
      },
    },
  };
}
