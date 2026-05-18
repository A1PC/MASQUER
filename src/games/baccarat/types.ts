import type { Card, Rank, Suit } from '@/games/blackjack/types';

export type { Card, Rank, Suit };

/** The 9 bet zones in priority/UI order (Player, Banker, Tie, then sides). */
export type BetZoneKey =
  | 'player'
  | 'banker'
  | 'tie'
  | 'playerPair'
  | 'bankerPair'
  | 'big'
  | 'small'
  | 'playerDragon'
  | 'bankerDragon';

export const BET_ZONE_KEYS: readonly BetZoneKey[] = [
  'player',
  'banker',
  'tie',
  'playerPair',
  'bankerPair',
  'big',
  'small',
  'playerDragon',
  'bankerDragon',
] as const;

/** Chip amount per zone. Default for unbet zones is 0. */
export type Bets = Record<BetZoneKey, number>;

export const EMPTY_BETS: Bets = {
  player: 0,
  banker: 0,
  tie: 0,
  playerPair: 0,
  bankerPair: 0,
  big: 0,
  small: 0,
  playerDragon: 0,
  bankerDragon: 0,
};

/** Hand totals are always 0-9 (ones digit of card-value sum). */
export type HandTotal = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface Hand {
  readonly cards: readonly Card[];
  readonly total: HandTotal;
}

/** Side that won the round. */
export type Winner = 'player' | 'banker' | 'tie';

/** Persistent shoe state. */
export interface ShoeState {
  /** Remaining cards in dealing order (index 0 is next to be drawn). */
  readonly cards: readonly Card[];
  /** Total cards in the shoe when it was last shuffled (= 416 for an 8-deck shoe). */
  readonly initialSize: number;
  /** Cards remaining behind the cut card (drawn cards beyond `initialSize - cutPosition` triggers reshuffle next round). */
  readonly cutPosition: number;
  /** True when the cut card has been crossed in this shoe — set after a round completes. */
  readonly cutCardPassed: boolean;
}

/** Aggregated round outcome — written into rounds.details. */
export interface RoundResult {
  readonly player: Hand;
  readonly banker: Hand;
  readonly winner: Winner;
  /** Margin of victory (0 for tie). */
  readonly margin: number;
  /** True when the winner won on a 2-card 8 or 9. */
  readonly winnerNatural: boolean;
  /** True when BOTH sides went natural (only meaningful on a tie or close win). */
  readonly bothNatural: boolean;
  /** First-two-card pair status per side. */
  readonly playerPair: boolean;
  readonly bankerPair: boolean;
  /** Total number of cards drawn across both hands (used for Big/Small). */
  readonly totalCards: number;
}

/** Per-zone chip change after the round. Sums to the user's net change for the round. */
export type Payouts = Record<BetZoneKey, number>;

/** Bead-plate cell: one round's outcome + decorations. */
export interface BeadCell {
  readonly winner: Winner;
  readonly playerPair: boolean;
  readonly bankerPair: boolean;
}

/** Big-road cell: either a winner (Player/Banker) with optional tie-count, or empty. */
export interface BigRoadCell {
  readonly winner: 'player' | 'banker';
  /** Number of consecutive ties layered on top of this cell. */
  readonly ties: number;
  /** True when this cell got a Player Pair on its source round. */
  readonly playerPair: boolean;
  /** True when this cell got a Banker Pair on its source round. */
  readonly bankerPair: boolean;
}
