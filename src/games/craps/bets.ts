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
};

export { POINT_NUMBERS };
