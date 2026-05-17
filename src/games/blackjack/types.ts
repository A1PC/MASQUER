export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  readonly rank: Rank;
  readonly suit: Suit;
  /** True after the card is revealed (dealer's hole card flips to true). */
  readonly faceUp: boolean;
}

export interface Hand {
  readonly cards: readonly Card[];
  /** True if this hand was created by splitting (cannot be a natural blackjack). */
  readonly fromSplit: boolean;
  /** True if this hand was a result of splitting Aces (only one card each, no further actions). */
  readonly fromSplitAces: boolean;
  /** True after the player commits a DOUBLE on this hand. */
  readonly doubled: boolean;
  /** Bet handle id from wallet.placeBet for this specific hand. */
  readonly betHandleId: string;
  /** Bet amount on this specific hand (including double if doubled). */
  readonly betAmount: number;
  /** True if player has finished acting on this hand (stand, bust, or 21 reached). */
  readonly resolved: boolean;
}

export interface HandTotal {
  value: number;
  /** Soft means the hand contains an Ace currently counted as 11. */
  soft: boolean;
}

export type Action = 'hit' | 'stand' | 'double' | 'split';

export type Outcome =
  | 'player-blackjack' // 3:2 payout
  | 'player-win' // 1:1
  | 'push' // bet returned
  | 'player-loss' // 0
  | 'player-bust'; // 0 (subset of loss; tracked separately for stats)

export interface HandResult {
  readonly handIdx: number;
  readonly outcome: Outcome;
  readonly playerTotal: number;
  readonly dealerTotal: number;
  /** Payout (gross return to player including bet). 0 on loss/bust. */
  readonly payout: number;
}

export type InsuranceStatus = 'not-offered' | 'declined' | 'won' | 'lost';

export interface InsuranceState {
  readonly status: InsuranceStatus;
  readonly bet: number; // 0 if not taken
  readonly payout: number; // gross return to player from insurance
}

export interface BlackjackRoundDetails {
  readonly dealerCards: readonly Card[];
  readonly hands: ReadonlyArray<{
    readonly cards: readonly Card[];
    readonly bet: number;
    readonly doubled: boolean;
    readonly fromSplit: boolean;
    readonly fromSplitAces: boolean;
    readonly outcome: Outcome;
    readonly payout: number;
  }>;
  readonly insurance: InsuranceState;
  /** All bet handle IDs placed during this round (for traceability; see ADR-0028). */
  readonly betHandleIds: readonly string[];
  /** Snapshot of the rules in effect at the time of the round. */
  readonly config: {
    readonly h17: boolean;
    readonly maxHands: number;
    readonly das: boolean;
  };
}
