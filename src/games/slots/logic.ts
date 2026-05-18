import { pickSymbol } from './symbols';
import { SLOTS_CONFIG } from './config';
import type { SpinResult, WinTier } from './types';

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
