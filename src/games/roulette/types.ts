/** All bet categories from BUILD_GUIDE §8.2. */
export type BetType =
  | 'straight'
  | 'split'
  | 'street'
  | 'corner'
  | 'six-line'
  | 'column'
  | 'dozen'
  | 'red'
  | 'black'
  | 'odd'
  | 'even'
  | 'low'
  | 'high';

/**
 * Canonical position key. Encoded as a string so it can be a Map key, a React
 * key, and a stable identifier across renders. Format per type:
 *   straight:N        N ∈ 0..36
 *   split:N1-N2       N1 < N2, valid wheel-adjacent pair (incl. 0-1, 0-2, 0-3)
 *   street:N          N is the lowest of the row of 3 (1,4,7,…,34)
 *   corner:N          N is the top-left of the 2×2 block
 *   six-line:N        N is the lowest of two adjacent rows of 3
 *   column:1|2|3
 *   dozen:1|2|3
 *   red | black | odd | even | low | high
 */
export type BetPositionKey = string;

export interface BetPosition {
  readonly key: BetPositionKey;
  readonly type: BetType;
  /** The numbers this position covers. 1 element for straight, up to 18 for even-money. */
  readonly numbers: readonly number[];
  /** Profit multiple per unit staked: 35 / 17 / 11 / 8 / 5 / 2 / 1 (matches §8.2). */
  readonly payoutMultiple: 1 | 2 | 5 | 8 | 11 | 17 | 35;
}

export interface PlacedBet extends BetPosition {
  /** Total chips staked on this position this round (sum of all chip clicks). Integer ≥ 1. */
  readonly amount: number;
  /** Canonical wallet bet-handle id for this position (the FIRST placeBet for this key). */
  readonly betHandleId: string;
}

export type PocketColor = 'red' | 'black' | 'green';

export interface SpinResult {
  /** 0..36 inclusive — winning pocket number. */
  readonly number: number;
  readonly color: PocketColor;
  /** Index into POCKET_ORDER (0..36). Used for ball positioning. */
  readonly pocketIndex: number;
}

export interface BetOutcome {
  readonly key: BetPositionKey;
  readonly type: BetType;
  readonly amount: number;
  readonly won: boolean;
  /** Gross return to player on this position. 0 on loss; `amount + amount * payoutMultiple` on win. */
  readonly payout: number;
}

export interface RouletteRoundDetails {
  readonly spin: SpinResult;
  readonly bets: ReadonlyArray<{
    readonly key: BetPositionKey;
    readonly type: BetType;
    readonly numbers: readonly number[];
    readonly amount: number;
    readonly payout: number;
  }>;
}
