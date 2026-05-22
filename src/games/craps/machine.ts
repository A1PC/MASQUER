import { setup, assign } from 'xstate';
import type { StakesConfig } from './stakes';
import type { Roll } from './dice';
import { BET_TYPES, type Phase } from './bets';
import { resolveRoll, type ActiveBet, type RollResolution } from './resolveRoll';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CrapsContext {
  sessionId: string;
  rollNumber: number;
  stakes: StakesConfig;
  bankroll: number;
  phase: Phase;
  point: number | null;
  bets: ActiveBet[];
  lastRoll: Roll | null;
  lastResolution: RollResolution | null;
  totalBoughtIn: number;
  rebuys: number;
  rollsPlayed: number;
  biggestWin: number;
}

export type CrapsEvent =
  | { type: 'PLACE_BET'; betId: string; amount: number; betPoint?: number }
  | { type: 'REMOVE_BET'; betId: string; betPoint?: number }
  | { type: 'ROLL'; roll: Roll }
  | { type: 'REBUY'; amount: number }
  | { type: 'LEAVE_TABLE' };

export interface MachineInput {
  sessionId: string;
  buyIn: number;
  stakes: StakesConfig;
}

// IDs of bet types that are NOT removable once placed
const NON_REMOVABLE = new Set(['pass', 'dont-pass', 'come', 'dont-come']);

// IDs of odds bet types (for the cap guard)
const ODDS_BET_IDS = new Set(['odds-pass', 'odds-dont']);

// Come-out point numbers (4,5,6,8,9,10)
const POINT_NUMBERS = new Set([4, 5, 6, 8, 9, 10]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * For an odds bet, find the backing line bet amount so we can cap odds at
 * oddsMultiple × the line bet.
 * 'odds-pass' backs 'pass' (or 'come' with matching betPoint).
 * 'odds-dont' backs 'dont-pass' (or 'dont-come' with matching betPoint).
 */
function backingLineBetAmount(betId: string, betPoint: number | null, bets: ActiveBet[]): number {
  if (betId === 'odds-pass') {
    if (betPoint !== null) {
      // behind a come bet that has travelled to betPoint
      const come = bets.find((b) => b.betId === 'come' && b.betPoint === betPoint);
      if (come) return come.amount;
    }
    // behind the pass line
    const pass = bets.find((b) => b.betId === 'pass');
    return pass ? pass.amount : 0;
  }
  if (betId === 'odds-dont') {
    if (betPoint !== null) {
      const dc = bets.find((b) => b.betId === 'dont-come' && b.betPoint === betPoint);
      if (dc) return dc.amount;
    }
    const dp = bets.find((b) => b.betId === 'dont-pass');
    return dp ? dp.amount : 0;
  }
  return 0;
}

// ─── Machine ──────────────────────────────────────────────────────────────────

export const crapsMachine = setup({
  types: {
    context: {} as CrapsContext,
    events: {} as CrapsEvent,
    input: {} as MachineInput,
  },

  actions: {
    /** Place a bet: debit bankroll, push ActiveBet. Guard runs before this. */
    placeBet: assign(({ context, event }) => {
      if (event.type !== 'PLACE_BET') return {};
      const { betId, amount } = event;
      const betPoint = event.betPoint ?? null;
      const newBet: ActiveBet = { betId, amount, betPoint };
      return {
        bankroll: context.bankroll - amount,
        bets: [...context.bets, newBet],
      };
    }),

    /** Remove a bet: refund stake to bankroll, drop from list. Guard runs before this. */
    removeBet: assign(({ context, event }) => {
      if (event.type !== 'REMOVE_BET') return {};
      const { betId } = event;
      const betPoint = event.betPoint ?? null;
      const idx = context.bets.findIndex((b) => b.betId === betId && b.betPoint === betPoint);
      if (idx === -1) return {};
      const removed = context.bets[idx]!;
      const newBets = [...context.bets.slice(0, idx), ...context.bets.slice(idx + 1)];
      return {
        bankroll: context.bankroll + removed.amount,
        bets: newBets,
      };
    }),

    /**
     * Apply a roll:
     * 1. Run resolveRoll.
     * 2. Credit bankroll += netReturned.
     * 3. Rebuild bets: drop win/lose/push, keep standing, relocate move bets.
     * 4. Update biggestWin.
     * 5. Phase transition.
     * 6. Increment rollNumber + rollsPlayed, set lastRoll / lastResolution.
     */
    applyRoll: assign(({ context, event }) => {
      if (event.type !== 'ROLL') return {};
      const { roll } = event;
      const { bets, phase, point, biggestWin, rollNumber, rollsPlayed } = context;

      const resolution = resolveRoll(bets, roll, phase, point);
      const { netReturned, perBet } = resolution;

      // Rebuild bets
      const newBets: ActiveBet[] = [];
      let sessionBiggestWin = biggestWin;

      for (const { bet, outcome } of perBet) {
        if (outcome.kind === 'standing') {
          newBets.push(bet);
        } else if (outcome.kind === 'move') {
          // Come/don't-come travels to the rolled number
          newBets.push({ ...bet, betPoint: outcome.toPoint });
        } else if (outcome.kind === 'win') {
          // Compute winnings for biggestWin tracking
          const betType = BET_TYPES[bet.betId];
          let winnings = 0;
          if (betType) {
            winnings =
              outcome.winnings ??
              (outcome.multiplier !== undefined
                ? bet.amount * outcome.multiplier
                : betType.payout(bet.amount, bet.betPoint));
          }
          if (winnings > sessionBiggestWin) {
            sessionBiggestWin = winnings;
          }
          // win/lose/push bets are NOT kept
        }
        // lose, push → dropped (not pushed to newBets)
      }

      // Phase transition
      let newPhase: Phase = phase;
      let newPoint: number | null = point;

      if (phase === 'come-out') {
        if (POINT_NUMBERS.has(roll.total)) {
          // Point established
          newPhase = 'point';
          newPoint = roll.total;
        }
        // 7/11 → win, stay come-out; 2/3/12 → craps, stay come-out
      } else {
        // point phase
        if (point !== null && roll.total === point) {
          // Point made
          newPhase = 'come-out';
          newPoint = null;
        } else if (roll.total === 7) {
          // Seven-out
          newPhase = 'come-out';
          newPoint = null;
        }
      }

      return {
        bankroll: context.bankroll + netReturned,
        bets: newBets,
        phase: newPhase,
        point: newPoint,
        biggestWin: sessionBiggestWin,
        rollNumber: rollNumber + 1,
        rollsPlayed: rollsPlayed + 1,
        lastRoll: roll,
        lastResolution: resolution,
      };
    }),

    /** Add chips to bankroll, increment rebuys + totalBoughtIn. */
    applyRebuy: assign(({ context, event }) => {
      if (event.type !== 'REBUY') return {};
      return {
        bankroll: context.bankroll + event.amount,
        totalBoughtIn: context.totalBoughtIn + event.amount,
        rebuys: context.rebuys + 1,
      };
    }),
  },

  guards: {
    /** Placement is valid: canPlace, amount in [tableMin, tableMax], bankroll sufficient, odds within cap. */
    canPlaceBet: ({ context, event }) => {
      if (event.type !== 'PLACE_BET') return false;
      const { betId, amount } = event;
      const betPoint = event.betPoint ?? null;
      const { phase, point, stakes, bankroll, bets } = context;

      const betType = BET_TYPES[betId];
      if (!betType) return false;

      if (!betType.canPlace(phase, { point })) return false;
      if (amount < stakes.tableMin || amount > stakes.tableMax) return false;
      if (bankroll < amount) return false;

      // Odds cap guard
      if (ODDS_BET_IDS.has(betId)) {
        const lineAmount = backingLineBetAmount(betId, betPoint, bets);
        if (lineAmount === 0) return false; // no backing bet
        if (amount > stakes.oddsMultiple * lineAmount) return false;
      }

      return true;
    },

    /** Removal is valid: bet exists + is removable in this phase. */
    canRemoveBet: ({ context, event }) => {
      if (event.type !== 'REMOVE_BET') return false;
      const { betId } = event;
      const betPoint = event.betPoint ?? null;
      const { bets } = context;

      const idx = bets.findIndex((b) => b.betId === betId && b.betPoint === betPoint);
      if (idx === -1) return false;

      // Non-removable bets: pass, dont-pass (once on come-out), come/dont-come (once travelling)
      if (NON_REMOVABLE.has(betId)) return false;

      return true;
    },
  },
}).createMachine({
  id: 'craps',
  initial: 'idle',
  context: ({ input }) => ({
    sessionId: input.sessionId,
    rollNumber: 0,
    stakes: input.stakes,
    bankroll: input.buyIn,
    phase: 'come-out',
    point: null,
    bets: [],
    lastRoll: null,
    lastResolution: null,
    totalBoughtIn: input.buyIn,
    rebuys: 0,
    rollsPlayed: 0,
    biggestWin: 0,
  }),

  states: {
    idle: {
      // Machine is created with input → go straight to table
      always: { target: 'table' },
    },

    table: {
      on: {
        PLACE_BET: {
          guard: 'canPlaceBet',
          actions: 'placeBet',
        },
        REMOVE_BET: {
          guard: 'canRemoveBet',
          actions: 'removeBet',
        },
        ROLL: {
          actions: 'applyRoll',
        },
        REBUY: {
          actions: 'applyRebuy',
        },
        LEAVE_TABLE: {
          target: 'settling',
        },
      },
    },

    settling: {
      always: { target: 'session_over' },
    },

    session_over: {
      type: 'final',
    },
  },
});
