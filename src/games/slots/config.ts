import type { Symbol } from './types';

/** Symbol weights — the rarer the symbol, the higher the payout.
 *  Tuned for ~86% RTP, ~22% any-win rate. ADR-0032.
 *  Easy to tune: change these numbers, rerun tests, ship. */
export const SLOTS_WEIGHTS: Readonly<Record<Symbol, number>> = {
  cherry: 4,
  lemon: 5,
  bell: 3,
  bar: 2,
  seven: 1,
};

/** Sum of weights — used as the upper bound for the per-reel RNG draw. */
export const SLOTS_WEIGHT_TOTAL = 15; // sum of SLOTS_WEIGHTS values

/** Paytable — BUILD_GUIDE §8.3.
 *  Keyed by payout key (matches PayoutHit['key']). */
export const SLOTS_PAYTABLE = {
  'seven-seven-seven': 50,
  'bar-bar-bar': 20,
  'bell-bell-bell': 12,
  'lemon-lemon-lemon': 8,
  'cherry-cherry-cherry': 5,
  'two-cherry': 2,
} as const;

export const SLOTS_CONFIG = {
  /** Per-spin chip minimum. Matches Blackjack via ADR-0025. */
  MIN_BET: 5,
  /** Per-spin chip maximum. */
  MAX_BET: 1_000,
  /** Number of reels. */
  REEL_COUNT: 3 as const,
  /** Reel stop timings in ms, left → right. ADR-0033 (incl. suspense gap). */
  REEL_STOP_TIMES_MS: [1_200, 2_000, 3_000] as const,
  /** Cells visible per reel — top, centre (payline), bottom. */
  REEL_VISIBLE_CELLS: 3 as const,
  /** Small-win celebration duration (ms). */
  CELEBRATION_SMALL_MS: 600,
  /** Medium-win celebration duration (ms). */
  CELEBRATION_MEDIUM_MS: 800,
  /** Jackpot celebration duration (ms). */
  CELEBRATION_JACKPOT_MS: 1_500,
  /** Win-tier thresholds (payout multiple). */
  WIN_TIER_THRESHOLDS: {
    /** Multiple ≤ this is `small`. */
    SMALL_MAX: 2,
    /** Multiple ≤ this (and > SMALL_MAX) is `medium`; > this is `jackpot`. */
    MEDIUM_MAX: 20,
  },
} as const;

export type SlotsConfig = typeof SLOTS_CONFIG;
