import { assign, setup } from 'xstate';
import { SLOTS_CONFIG } from './config';
import { buildRoundResult, spin } from './logic';
import type { SpinResult } from './types';

interface Context {
  bet: number;
  betHandleId: string;
  spinResult: SpinResult | null;
  roundResult: ReturnType<typeof buildRoundResult> | null;
  totalSpinDurationMs: number;
  /** Increments once per completed spin (i.e. each time `setRoundResult`
   *  runs). The page uses this as a stable React key to remount the
   *  BettingPanel between rounds without a useEffect + setState chain. */
  spinCount: number;
}

type MachineEvent = { type: 'PLACE_BET'; bet: number; betHandleId: string } | { type: 'SPIN' };

type MachineInput = { totalSpinDurationMs?: number } | undefined;

const DEFAULT_TOTAL_SPIN_MS =
  SLOTS_CONFIG.REEL_STOP_TIMES_MS[SLOTS_CONFIG.REEL_STOP_TIMES_MS.length - 1]!;

/**
 * Two-state machine: `betting → spinning → betting` (no separate `settled`).
 *
 * The previous version had a `settled` state that required a `NEW_ROUND` event
 * to return to `betting`. UX feedback: players want the next bet to be
 * immediately placeable after each spin. So the machine now auto-transitions
 * from `spinning` straight back to `betting` once the spin animation
 * completes, and the round result lives in `context.roundResult` until the
 * next `PLACE_BET` clears it.
 *
 * The page renders the win celebration based on `roundResult !== null`
 * (not on a settled state), and dismisses it via a timeout. The wallet's
 * `settleRound` is called via the page's settle bridge when `roundResult`
 * transitions from null → set.
 */
export const slotsMachine = setup({
  types: {
    context: {} as Context,
    events: {} as MachineEvent,
    input: undefined as MachineInput,
  },
  guards: {
    hasBet: ({ context }) => context.bet >= SLOTS_CONFIG.MIN_BET,
  },
  actions: {
    applyBet: assign({
      bet: ({ context, event }) => (event.type === 'PLACE_BET' ? event.bet : context.bet),
      betHandleId: ({ context, event }) =>
        event.type === 'PLACE_BET' ? event.betHandleId : context.betHandleId,
      // Clear the previous round's outcome as soon as a new bet is placed.
      // The celebration overlay (driven by roundResult) disappears at the
      // same moment the player commits to the next spin.
      spinResult: () => null,
      roundResult: () => null,
    }),
    setSpinResult: assign({
      spinResult: () => spin(),
    }),
    setRoundResult: assign({
      roundResult: ({ context }) => {
        if (!context.spinResult) return null;
        return buildRoundResult({ spin: context.spinResult, bet: context.bet });
      },
      spinCount: ({ context }) => context.spinCount + 1,
    }),
  },
  delays: {
    totalSpin: ({ context }) => context.totalSpinDurationMs,
  },
}).createMachine({
  id: 'slots',
  initial: 'betting',
  context: ({ input }) => ({
    bet: 0,
    betHandleId: '',
    spinResult: null,
    roundResult: null,
    totalSpinDurationMs: input?.totalSpinDurationMs ?? DEFAULT_TOTAL_SPIN_MS,
    spinCount: 0,
  }),
  states: {
    betting: {
      on: {
        PLACE_BET: { actions: 'applyBet' },
        SPIN: {
          guard: 'hasBet',
          target: 'spinning',
        },
      },
    },
    spinning: {
      entry: 'setSpinResult',
      after: {
        totalSpin: {
          target: 'betting',
          actions: 'setRoundResult',
        },
      },
    },
  },
});
