import type { BetZoneKey } from './types';

/** Per-zone min / max bet (chips). Spec §6. */
export const BET_LIMITS: Record<BetZoneKey, { min: number; max: number }> = {
  player: { min: 5, max: 2000 },
  banker: { min: 5, max: 2000 },
  tie: { min: 5, max: 2000 },
  playerPair: { min: 5, max: 1000 },
  bankerPair: { min: 5, max: 1000 },
  big: { min: 5, max: 1000 },
  small: { min: 5, max: 1000 },
  playerDragon: { min: 5, max: 1000 },
  bankerDragon: { min: 5, max: 1000 },
};

/** Display strings for the payout ratio shown on each zone label. Spec §4.4, §4.5, §6. */
export const PAYOUT_LABELS: Record<BetZoneKey, string> = {
  player: '1 : 1',
  banker: '1 : 1 − 5%',
  tie: '8 : 1',
  playerPair: '11 : 1',
  bankerPair: '11 : 1',
  big: '0.54 : 1',
  small: '1.5 : 1',
  playerDragon: 'up to 30 : 1',
  bankerDragon: 'up to 30 : 1',
};

/** Banker commission fraction. Commission = floor(winnings * COMMISSION_RATE). */
export const COMMISSION_RATE = 0.05;

/** Big-side payout: floor(bet * BIG_PAYOUT_RATE). Spec §4.5. */
export const BIG_PAYOUT_RATE = 0.54;
/** Small-side payout: floor(bet * SMALL_PAYOUT_RATE). Spec §4.5. */
export const SMALL_PAYOUT_RATE = 1.5;

/** Dragon Bonus payout ladder. Spec §4.5.
 *  Key is winning margin (4..9) plus the 'natural' case. */
export const DRAGON_PAYOUT: Record<'natural' | 4 | 5 | 6 | 7 | 8 | 9, number> = {
  natural: 1, // Win with 2-card 8 or 9
  4: 1,
  5: 2,
  6: 4,
  7: 6,
  8: 10,
  9: 30,
};

/** Shoe model — spec §5. */
export const DECKS_PER_SHOE = 8;
/** Cut card lands uniformly between this many cards from the END (inclusive). */
export const CUT_CARD_RANGE_FROM_END: { min: number; max: number } = { min: 14, max: 28 };

/** Reveal timing — spec §7.2. All durations in milliseconds. */
export const REVEAL_TIMING = {
  cardSlideIn: 200,
  cornerPeek: 150,
  flip: 250,
  pauseBetweenCards: 150,
  pauseBeforeTotal: 400,
  pauseBeforeThirdCard: 800,
  bannerDisplay: 2000,
  reducedMotionBanner: 1000,
} as const;

/** Bead plate grid dimensions (rows × visible columns). */
export const BEAD_PLATE_ROWS = 6;
export const BEAD_PLATE_VISIBLE_COLS = 10;
/** Big road grid dimensions. */
export const BIG_ROAD_ROWS = 6;
export const BIG_ROAD_VISIBLE_COLS = 10;
/** Maximum number of past rounds tracked in scoreboard memory. Older drops silently. */
export const SCOREBOARD_HISTORY_CAP = 60;
