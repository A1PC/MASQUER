export const BLACKJACK_CONFIG = {
  /** Hit-on-soft-17 (true) vs Stand-on-all-17 (false). ADR-0021. */
  H17: true,
  /** Maximum number of hands per round (resplit). ADR-0022. */
  MAX_HANDS: 4,
  /** Double after split allowed. ADR-0022. */
  DAS: true,
  /** Number of decks in the shoe. ADR-0024. */
  DECKS: 6,
  /** Cut card position (cards dealt from start of shoe before reshuffle). ADR-0024. */
  CUT_CARD_AT: 156,
  /** Min bet per hand. ADR-0025. */
  MIN_BET: 5,
  /** Max bet per hand. ADR-0025. */
  MAX_BET: 1_000,
  /** Insurance bet as a fraction of the main bet. ADR-0023. */
  INSURANCE_RATIO: 0.5,
} as const;

export type BlackjackConfig = typeof BLACKJACK_CONFIG;
