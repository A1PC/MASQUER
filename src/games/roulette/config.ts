export const ROULETTE_CONFIG = {
  /** Per-bet-position chip minimum. Matches Blackjack via ADR-0025. */
  MIN_BET: 5,
  /** Per-bet-position chip maximum. Matches Blackjack via ADR-0025. */
  MAX_BET: 1_000,
  /** Chip denominations shown in the selector (left → right). ADR-0030. */
  CHIP_DENOMINATIONS: [5, 25, 100, 250, 500, 1_000] as const,
  /** Spin animation duration in ms. ADR-0031. */
  SPIN_DURATION_MS: 5_000,
  /** Result-banner / pocket-pulse duration in ms. ADR-0031. */
  RESULT_PULSE_MS: 600,
  /** ADR-0046 — initial betting window after page mount. */
  INITIAL_BET_WINDOW_MS: 30_000,
  /** ADR-0046 — re-betting window between rounds. */
  BETWEEN_ROUNDS_MS: 10_000,
  /** ADR-0046 — how long the settled banner lingers before between_rounds starts. */
  RESULT_DISPLAY_MS: 1_500,
} as const;

export type RouletteConfig = typeof ROULETTE_CONFIG;
export type ChipDenomination = (typeof ROULETTE_CONFIG.CHIP_DENOMINATIONS)[number];
