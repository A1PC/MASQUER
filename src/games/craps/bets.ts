import type { Roll } from './dice';

export type Phase = 'come-out' | 'point';

// FINAL shape — locked here in PR A; PRs B/C build on it WITHOUT changing it.
// `payout()` supplies winnings for fixed-odds bets. Roll-dependent bets (field,
// horn, C&E) instead set `multiplier` (winnings = amount * multiplier) or an exact
// integer `winnings` override on the `win` outcome. resolveRoll applies precedence:
//   winnings ?? (multiplier !== undefined ? amount*multiplier : payout()). See ADR-0042.
export type BetOutcome =
  | { kind: 'win'; multiplier?: number; winnings?: number }
  | { kind: 'lose' }
  | { kind: 'push' }
  | { kind: 'standing' }
  | { kind: 'move'; toPoint: number };

export interface BetContext {
  point: number | null;
}

export interface BetType {
  id: string;
  label: string;
  canPlace(phase: Phase, ctx: BetContext): boolean;
  isWorking(phase: Phase): boolean;
  // `amount` (the stake) is OPTIONAL — only composite bets (horn, C&E in PR B) read it to
  // compute their exact `winnings` override; fixed-odds resolvers omit the param entirely.
  // resolveRoll always passes bet.amount, so it is defined at runtime. Optional keeps the
  // 4-arg fixed-odds resolvers + their tests valid without a 5th argument.
  resolve(
    roll: Roll,
    phase: Phase,
    point: number | null,
    betPoint: number | null,
    amount?: number,
  ): BetOutcome;
  payout(amount: number, betPoint: number | null): number; // winnings only, floored
}

const POINT_NUMBERS = [4, 5, 6, 8, 9, 10];

/** True-odds winnings for a pass/come odds bet of `amount` on `betPoint`. */
function passOddsWinnings(amount: number, betPoint: number): number {
  if (betPoint === 4 || betPoint === 10) return amount * 2; // 2:1
  if (betPoint === 5 || betPoint === 9) return Math.floor((amount * 3) / 2); // 3:2
  return Math.floor((amount * 6) / 5); // 6/8 → 6:5
}
/** True-odds winnings for a don't-pass/don't-come LAY odds bet of `amount` on `betPoint`. */
function dontOddsWinnings(amount: number, betPoint: number): number {
  if (betPoint === 4 || betPoint === 10) return Math.floor(amount / 2); // lay 2:1 → win 1:2
  if (betPoint === 5 || betPoint === 9) return Math.floor((amount * 2) / 3); // lay 3:2 → win 2:3
  return Math.floor((amount * 5) / 6); // 6/8 → win 5:6
}

/** Place-bet winnings (winnings only, floored). */
function placeWinnings(amount: number, num: number): number {
  if (num === 4 || num === 10) return Math.floor((amount * 9) / 5); // 9:5
  if (num === 5 || num === 9) return Math.floor((amount * 7) / 5); // 7:5
  return Math.floor((amount * 7) / 6); // 6/8 → 7:6
}

export const BET_TYPES: Record<string, BetType> = {
  pass: {
    id: 'pass',
    label: 'Pass Line',
    canPlace: (phase) => phase === 'come-out',
    isWorking: () => true,
    resolve(roll, phase, point) {
      if (phase === 'come-out') {
        if (roll.total === 7 || roll.total === 11) return { kind: 'win' };
        if (roll.total === 2 || roll.total === 3 || roll.total === 12) return { kind: 'lose' };
        return { kind: 'standing' }; // point established; pass rides
      }
      if (point !== null && roll.total === point) return { kind: 'win' };
      if (roll.total === 7) return { kind: 'lose' };
      return { kind: 'standing' };
    },
    payout: (amount) => amount, // 1:1
  },

  'dont-pass': {
    id: 'dont-pass',
    label: "Don't Pass",
    canPlace: (phase) => phase === 'come-out',
    isWorking: () => true,
    resolve(roll, phase, point) {
      if (phase === 'come-out') {
        if (roll.total === 7 || roll.total === 11) return { kind: 'lose' };
        if (roll.total === 2 || roll.total === 3) return { kind: 'win' };
        if (roll.total === 12) return { kind: 'push' }; // bar 12
        return { kind: 'standing' };
      }
      if (roll.total === 7) return { kind: 'win' };
      if (point !== null && roll.total === point) return { kind: 'lose' };
      return { kind: 'standing' };
    },
    payout: (amount) => amount, // 1:1
  },

  come: {
    id: 'come',
    label: 'Come',
    canPlace: (phase) => phase === 'point',
    isWorking: () => true,
    resolve(roll, _phase, _point, betPoint) {
      if (betPoint === null) {
        // freshly placed come bet, awaiting its own come-point
        if (roll.total === 7 || roll.total === 11) return { kind: 'win' };
        if (roll.total === 2 || roll.total === 3 || roll.total === 12) return { kind: 'lose' };
        return { kind: 'move', toPoint: roll.total };
      }
      if (roll.total === betPoint) return { kind: 'win' };
      if (roll.total === 7) return { kind: 'lose' };
      return { kind: 'standing' };
    },
    payout: (amount) => amount,
  },

  'dont-come': {
    id: 'dont-come',
    label: "Don't Come",
    canPlace: (phase) => phase === 'point',
    isWorking: () => true,
    resolve(roll, _phase, _point, betPoint) {
      if (betPoint === null) {
        if (roll.total === 7 || roll.total === 11) return { kind: 'lose' };
        if (roll.total === 2 || roll.total === 3) return { kind: 'win' };
        if (roll.total === 12) return { kind: 'push' };
        return { kind: 'move', toPoint: roll.total };
      }
      if (roll.total === 7) return { kind: 'win' };
      if (roll.total === betPoint) return { kind: 'lose' };
      return { kind: 'standing' };
    },
    payout: (amount) => amount,
  },

  'odds-pass': {
    id: 'odds-pass',
    label: 'Pass Odds',
    canPlace: (phase, ctx) => phase === 'point' && ctx.point !== null, // also used behind come points
    isWorking: (phase) => phase === 'point', // odds off on come-out
    resolve(roll, _phase, point, betPoint) {
      const num = betPoint ?? point;
      if (num === null) return { kind: 'standing' };
      if (roll.total === num) return { kind: 'win' };
      if (roll.total === 7) return { kind: 'lose' };
      return { kind: 'standing' };
    },
    payout: (amount, betPoint) => passOddsWinnings(amount, betPoint ?? 4),
  },

  'odds-dont': {
    id: 'odds-dont',
    label: "Don't Odds",
    canPlace: (phase, ctx) => phase === 'point' && ctx.point !== null,
    isWorking: () => true, // lay odds work on come-out too, but simplest: always working in point phase contexts
    resolve(roll, _phase, point, betPoint) {
      const num = betPoint ?? point;
      if (num === null) return { kind: 'standing' };
      if (roll.total === 7) return { kind: 'win' };
      if (roll.total === num) return { kind: 'lose' };
      return { kind: 'standing' };
    },
    payout: (amount, betPoint) => dontOddsWinnings(amount, betPoint ?? 4),
  },

  // --- Place bets (off on come-out) ---
  'place-4': {
    id: 'place-4',
    label: 'Place 4',
    canPlace: (phase) => phase === 'point',
    isWorking: (phase) => phase === 'point',
    resolve: (roll) =>
      roll.total === 4
        ? { kind: 'win' }
        : roll.total === 7
          ? { kind: 'lose' }
          : { kind: 'standing' },
    payout: (amount) => placeWinnings(amount, 4),
  },
  'place-5': {
    id: 'place-5',
    label: 'Place 5',
    canPlace: (phase) => phase === 'point',
    isWorking: (phase) => phase === 'point',
    resolve: (roll) =>
      roll.total === 5
        ? { kind: 'win' }
        : roll.total === 7
          ? { kind: 'lose' }
          : { kind: 'standing' },
    payout: (amount) => placeWinnings(amount, 5),
  },
  'place-6': {
    id: 'place-6',
    label: 'Place 6',
    canPlace: (phase) => phase === 'point',
    isWorking: (phase) => phase === 'point',
    resolve: (roll) =>
      roll.total === 6
        ? { kind: 'win' }
        : roll.total === 7
          ? { kind: 'lose' }
          : { kind: 'standing' },
    payout: (amount) => placeWinnings(amount, 6),
  },
  'place-8': {
    id: 'place-8',
    label: 'Place 8',
    canPlace: (phase) => phase === 'point',
    isWorking: (phase) => phase === 'point',
    resolve: (roll) =>
      roll.total === 8
        ? { kind: 'win' }
        : roll.total === 7
          ? { kind: 'lose' }
          : { kind: 'standing' },
    payout: (amount) => placeWinnings(amount, 8),
  },
  'place-9': {
    id: 'place-9',
    label: 'Place 9',
    canPlace: (phase) => phase === 'point',
    isWorking: (phase) => phase === 'point',
    resolve: (roll) =>
      roll.total === 9
        ? { kind: 'win' }
        : roll.total === 7
          ? { kind: 'lose' }
          : { kind: 'standing' },
    payout: (amount) => placeWinnings(amount, 9),
  },
  'place-10': {
    id: 'place-10',
    label: 'Place 10',
    canPlace: (phase) => phase === 'point',
    isWorking: (phase) => phase === 'point',
    resolve: (roll) =>
      roll.total === 10
        ? { kind: 'win' }
        : roll.total === 7
          ? { kind: 'lose' }
          : { kind: 'standing' },
    payout: (amount) => placeWinnings(amount, 10),
  },

  // --- Field (always working) ---
  field: {
    id: 'field',
    label: 'Field',
    canPlace: () => true,
    isWorking: () => true,
    resolve(roll) {
      const t = roll.total;
      if (t === 2) return { kind: 'win', multiplier: 2 }; // 2:1
      if (t === 12) return { kind: 'win', multiplier: 3 }; // 3:1
      if (t === 3 || t === 4 || t === 9 || t === 10 || t === 11) return { kind: 'win' }; // 1:1 via payout()
      return { kind: 'lose' }; // 5, 6, 7, 8
    },
    payout: (amount) => amount, // 1:1 fallback; 2× / 3× cases set multiplier in resolve()
  },

  // --- Hardways (off on come-out) ---
  'hard-4': {
    id: 'hard-4',
    label: 'Hard 4',
    canPlace: () => true,
    isWorking: (phase) => phase === 'point',
    resolve: (roll) =>
      roll.total === 4
        ? roll.isHard
          ? { kind: 'win' }
          : { kind: 'lose' }
        : roll.total === 7
          ? { kind: 'lose' }
          : { kind: 'standing' },
    payout: (amount) => amount * 7, // 7:1
  },
  'hard-6': {
    id: 'hard-6',
    label: 'Hard 6',
    canPlace: () => true,
    isWorking: (phase) => phase === 'point',
    resolve: (roll) =>
      roll.total === 6
        ? roll.isHard
          ? { kind: 'win' }
          : { kind: 'lose' }
        : roll.total === 7
          ? { kind: 'lose' }
          : { kind: 'standing' },
    payout: (amount) => amount * 9, // 9:1
  },
  'hard-8': {
    id: 'hard-8',
    label: 'Hard 8',
    canPlace: () => true,
    isWorking: (phase) => phase === 'point',
    resolve: (roll) =>
      roll.total === 8
        ? roll.isHard
          ? { kind: 'win' }
          : { kind: 'lose' }
        : roll.total === 7
          ? { kind: 'lose' }
          : { kind: 'standing' },
    payout: (amount) => amount * 9, // 9:1
  },
  'hard-10': {
    id: 'hard-10',
    label: 'Hard 10',
    canPlace: () => true,
    isWorking: (phase) => phase === 'point',
    resolve: (roll) =>
      roll.total === 10
        ? roll.isHard
          ? { kind: 'win' }
          : { kind: 'lose' }
        : roll.total === 7
          ? { kind: 'lose' }
          : { kind: 'standing' },
    payout: (amount) => amount * 7, // 7:1
  },

  // --- One-roll proposition bets ---
  'any-7': {
    id: 'any-7',
    label: 'Any 7',
    canPlace: () => true,
    isWorking: () => true,
    resolve: (roll) => (roll.total === 7 ? { kind: 'win' } : { kind: 'lose' }),
    payout: (amount) => amount * 4, // 4:1
  },
  'any-craps': {
    id: 'any-craps',
    label: 'Any Craps',
    canPlace: () => true,
    isWorking: () => true,
    resolve: (roll) =>
      roll.total === 2 || roll.total === 3 || roll.total === 12
        ? { kind: 'win' }
        : { kind: 'lose' },
    payout: (amount) => amount * 7, // 7:1
  },
  'prop-2': {
    id: 'prop-2',
    label: '2 (Aces)',
    canPlace: () => true,
    isWorking: () => true,
    resolve: (roll) => (roll.total === 2 ? { kind: 'win' } : { kind: 'lose' }),
    payout: (amount) => amount * 30, // 30:1
  },
  'prop-3': {
    id: 'prop-3',
    label: '3',
    canPlace: () => true,
    isWorking: () => true,
    resolve: (roll) => (roll.total === 3 ? { kind: 'win' } : { kind: 'lose' }),
    payout: (amount) => amount * 15, // 15:1
  },
  'prop-11': {
    id: 'prop-11',
    label: '11 (Yo)',
    canPlace: () => true,
    isWorking: () => true,
    resolve: (roll) => (roll.total === 11 ? { kind: 'win' } : { kind: 'lose' }),
    payout: (amount) => amount * 15, // 15:1
  },
  'prop-12': {
    id: 'prop-12',
    label: '12 (Boxcars)',
    canPlace: () => true,
    isWorking: () => true,
    resolve: (roll) => (roll.total === 12 ? { kind: 'win' } : { kind: 'lose' }),
    payout: (amount) => amount * 30, // 30:1
  },

  // --- Composite bets (split-stake; winnings override sized so amount+winnings = true total return) ---
  horn: {
    id: 'horn',
    label: 'Horn',
    canPlace: () => true,
    isWorking: () => true,
    resolve(roll, _phase, _point, _betPoint, amount = 0) {
      const q = Math.floor(amount / 4);
      if (roll.total === 2 || roll.total === 12) return { kind: 'win', winnings: 31 * q - amount };
      if (roll.total === 3 || roll.total === 11) return { kind: 'win', winnings: 16 * q - amount };
      return { kind: 'lose' };
    },
    payout: (amount) => amount, // unused — winnings override always set on win
  },
  'c-and-e': {
    id: 'c-and-e',
    label: 'C & E',
    canPlace: () => true,
    isWorking: () => true,
    resolve(roll, _phase, _point, _betPoint, amount = 0) {
      const h = Math.floor(amount / 2);
      if (roll.total === 2 || roll.total === 3 || roll.total === 12)
        return { kind: 'win', winnings: 8 * h - amount };
      if (roll.total === 11) return { kind: 'win', winnings: 16 * h - amount };
      return { kind: 'lose' };
    },
    payout: (amount) => amount, // unused — winnings override always set on win
  },
};

export { POINT_NUMBERS };
