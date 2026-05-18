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
}

type MachineEvent =
  | { type: 'PLACE_BET'; bet: number; betHandleId: string }
  | { type: 'SPIN' }
  | { type: 'NEW_ROUND' };

type MachineInput = { totalSpinDurationMs?: number } | undefined;

const DEFAULT_TOTAL_SPIN_MS =
  SLOTS_CONFIG.REEL_STOP_TIMES_MS[SLOTS_CONFIG.REEL_STOP_TIMES_MS.length - 1]!;

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
    }),
    setSpinResult: assign({
      spinResult: () => spin(),
    }),
    setRoundResult: assign({
      roundResult: ({ context }) => {
        if (!context.spinResult) return null;
        return buildRoundResult({ spin: context.spinResult, bet: context.bet });
      },
    }),
    clearForNextRound: assign({
      bet: () => 0,
      betHandleId: () => '',
      spinResult: () => null,
      roundResult: () => null,
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
          target: 'settled',
          actions: 'setRoundResult',
        },
      },
    },
    settled: {
      on: {
        NEW_ROUND: {
          target: 'betting',
          actions: 'clearForNextRound',
        },
      },
    },
  },
});
