/** The 5 base symbols, in payout-ascending order. */
export type Symbol = 'cherry' | 'lemon' | 'bell' | 'bar' | 'seven';

/** Set of symbols rendered with neon-glow visual treatment (rarer = more "premium"). */
export const NEON_SYMBOLS: ReadonlySet<Symbol> = new Set(['bell', 'bar', 'seven']);

/** Spin result — final symbol on each reel, left to right. */
export interface SpinResult {
  readonly reels: readonly [Symbol, Symbol, Symbol];
}

/** Discriminated payout — which combo fired, if any. `null` on a losing spin. */
export interface PayoutHit {
  readonly key:
    | 'seven-seven-seven'
    | 'bar-bar-bar'
    | 'bell-bell-bell'
    | 'lemon-lemon-lemon'
    | 'cherry-cherry-cherry'
    | 'two-cherry';
  /** Payout multiple — applied to bet to get the gross return. */
  readonly multiple: 50 | 20 | 12 | 8 | 5 | 2;
  /** Reel indices forming the winning line. For 2-cherry, the two cherry positions;
   *  for any 3-of-kind, [0, 1, 2]. Used by the page to highlight winning cells. */
  readonly winningReelIndices: readonly number[];
}

/** Win-celebration tier — derived from PayoutHit.multiple. */
export type WinTier = 'none' | 'small' | 'medium' | 'jackpot';

/** The shape written into Round.details for slot rounds. */
export interface SlotsRoundDetails {
  readonly spin: SpinResult;
  readonly payout: PayoutHit | null;
  readonly bet: number;
  readonly winTier: WinTier;
  /** Snapshot of the rules in effect at the time of the round. */
  readonly config: {
    readonly weights: Record<Symbol, number>;
    readonly minBet: number;
    readonly maxBet: number;
  };
}
