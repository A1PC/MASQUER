export const ROULETTE_CONFIG = {
  /** Per-bet-position chip minimum. Matches Blackjack via ADR-0025. */
  MIN_BET: 5,
  /** Per-bet-position chip maximum. Matches Blackjack via ADR-0025. */
  MAX_BET: 1_000,
  /** Maximum number of distinct bet positions on the felt per round. ADR-0030. */
  MAX_POSITIONS_PER_ROUND: 10,
  /** Chip denominations shown in the selector (left → right). ADR-0030. */
  CHIP_DENOMINATIONS: [5, 25, 100, 250, 500, 1_000] as const,
  /** Spin animation duration in ms. ADR-0031. */
  SPIN_DURATION_MS: 5_000,
  /** Result-banner / pocket-pulse duration in ms. ADR-0031. */
  RESULT_PULSE_MS: 600,
} as const;

export type RouletteConfig = typeof ROULETTE_CONFIG;
export type ChipDenomination = (typeof ROULETTE_CONFIG.CHIP_DENOMINATIONS)[number];
