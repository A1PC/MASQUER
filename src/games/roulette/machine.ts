import { assign, setup } from 'xstate';
import { ROULETTE_CONFIG } from './config';
import { spin } from './logic';
import type { buildRoundResult } from './logic';
import type { BetPositionKey, PlacedBet, SpinResult } from './types';

interface Context {
  bets: PlacedBet[];
  spinResult: SpinResult | null;
  roundResult: ReturnType<typeof buildRoundResult> | null;
  spinDurationMs: number;
}

type MachineEvent =
  | { type: 'PLACE_BET'; bet: PlacedBet }
  | { type: 'REMOVE_BET'; key: BetPositionKey }
  | { type: 'CLEAR_ALL' }
  | { type: 'SPIN' }
  | { type: 'NEW_ROUND' };

type MachineInput = { spinDurationMs?: number } | undefined;

export const rouletteMachine = setup({
  types: {
    context: {} as Context,
    events: {} as MachineEvent,
    input: undefined as MachineInput,
  },
  guards: {
    hasAtLeastOneBet: ({ context }) => context.bets.length > 0,
  },
  actions: {
    addBet: assign({
      bets: ({ context, event }) => {
        if (event.type !== 'PLACE_BET') return context.bets;
        const idx = context.bets.findIndex((b) => b.key === event.bet.key);
        if (idx >= 0) {
          const existing = context.bets[idx]!;
          const next = [...context.bets];
          next[idx] = { ...existing, amount: existing.amount + event.bet.amount };
          return next;
        }
        if (context.bets.length >= ROULETTE_CONFIG.MAX_POSITIONS_PER_ROUND) return context.bets;
        return [...context.bets, event.bet];
      },
    }),
    removeBet: assign({
      bets: ({ context, event }) => {
        if (event.type !== 'REMOVE_BET') return context.bets;
        return context.bets.filter((b) => b.key !== event.key);
      },
    }),
    clearAll: assign({ bets: () => [] }),
    setSpinResult: assign({
      spinResult: () => spin(),
    }),
  },
}).createMachine({
  id: 'roulette',
  initial: 'betting',
  context: ({ input }) => ({
    bets: [],
    spinResult: null,
    roundResult: null,
    spinDurationMs: input?.spinDurationMs ?? ROULETTE_CONFIG.SPIN_DURATION_MS,
  }),
  states: {
    betting: {
      on: {
        PLACE_BET: { actions: 'addBet' },
        REMOVE_BET: { actions: 'removeBet' },
        CLEAR_ALL: { actions: 'clearAll' },
        SPIN: {
          guard: 'hasAtLeastOneBet',
          target: 'spinning',
        },
      },
    },
    spinning: {
      entry: 'setSpinResult',
      // 'after' transition + setRoundResult action filled in by Task A.10
    },
    settled: {
      // 'NEW_ROUND' transition + prepareNextRound action filled in by Task A.11
    },
  },
});
