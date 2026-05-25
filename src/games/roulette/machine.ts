import { assign, setup } from 'xstate';
import { ROULETTE_CONFIG } from './config';
import { buildRoundResult, spin } from './logic';
import type { BetPositionKey, PlacedBet, SpinResult } from './types';

interface Context {
  bets: PlacedBet[];
  spinResult: SpinResult | null;
  roundResult: ReturnType<typeof buildRoundResult> | null;
  spinDurationMs: number;
  /** When non-null, the wallclock ms at which the current timer state's
   *  auto-spin fires. The page reads this to drive the countdown ring +
   *  remaining-seconds text. Set on entry to placing_bets / between_rounds;
   *  cleared on exit. */
  betWindowEndsAt: number | null;
  /** When non-null, the wallclock ms when PAUSE_TIMER fired. RESUME_TIMER
   *  extends betWindowEndsAt by (now - pausedAt). */
  pausedAt: number | null;
}

type MachineEvent =
  | { type: 'PLACE_BET'; bet: PlacedBet }
  | { type: 'REMOVE_BET'; key: BetPositionKey }
  | { type: 'CLEAR_ALL' }
  | { type: 'SPIN_NOW' }
  | { type: 'PAUSE_TIMER' }
  | { type: 'RESUME_TIMER' };

type MachineInput =
  | {
      spinDurationMs?: number;
    }
  | undefined;

export const rouletteMachine = setup({
  types: {
    context: {} as Context,
    events: {} as MachineEvent,
    input: undefined as MachineInput,
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
        // ADR-0030 amendment (Phase 15 #6) — no position cap.
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
    setSpinResult: assign({ spinResult: () => spin() }),
    setRoundResult: assign({
      roundResult: ({ context }) => {
        if (!context.spinResult) return null;
        return buildRoundResult(context.bets, context.spinResult);
      },
    }),
    prepareNextRound: assign({
      bets: ({ context }) => {
        if (!context.spinResult) return [];
        const winningNumber = context.spinResult.number;
        return context.bets
          .filter((b) => !b.numbers.includes(winningNumber))
          .map((b) => ({ ...b, betHandleId: '' }));
      },
      spinResult: () => null,
      roundResult: () => null,
    }),
    armInitialBetWindow: assign({
      betWindowEndsAt: () => Date.now() + ROULETTE_CONFIG.INITIAL_BET_WINDOW_MS,
      pausedAt: () => null,
    }),
    armBetweenRoundsWindow: assign({
      betWindowEndsAt: () => Date.now() + ROULETTE_CONFIG.BETWEEN_ROUNDS_MS,
      pausedAt: () => null,
    }),
    clearWindow: assign({ betWindowEndsAt: () => null, pausedAt: () => null }),
    pause: assign({ pausedAt: () => Date.now() }),
    resume: assign({
      betWindowEndsAt: ({ context }) => {
        if (context.betWindowEndsAt === null || context.pausedAt === null)
          return context.betWindowEndsAt;
        const pausedFor = Date.now() - context.pausedAt;
        return context.betWindowEndsAt + pausedFor;
      },
      pausedAt: () => null,
    }),
  },
  delays: {
    spinDuration: ({ context }) => context.spinDurationMs,
    initialBetWindow: () => ROULETTE_CONFIG.INITIAL_BET_WINDOW_MS,
    betweenRoundsWindow: () => ROULETTE_CONFIG.BETWEEN_ROUNDS_MS,
    resultDisplay: () => ROULETTE_CONFIG.RESULT_DISPLAY_MS,
  },
}).createMachine({
  id: 'roulette',
  initial: 'placing_bets',
  context: ({ input }) => ({
    bets: [],
    spinResult: null,
    roundResult: null,
    spinDurationMs: input?.spinDurationMs ?? ROULETTE_CONFIG.SPIN_DURATION_MS,
    betWindowEndsAt: null,
    pausedAt: null,
  }),
  states: {
    placing_bets: {
      entry: 'armInitialBetWindow',
      exit: 'clearWindow',
      on: {
        PLACE_BET: { actions: 'addBet' },
        REMOVE_BET: { actions: 'removeBet' },
        CLEAR_ALL: { actions: 'clearAll' },
        SPIN_NOW: { target: 'spinning' },
        PAUSE_TIMER: { actions: 'pause' },
        RESUME_TIMER: { actions: 'resume' },
      },
      after: {
        initialBetWindow: { target: 'spinning' },
      },
    },
    spinning: {
      entry: 'setSpinResult',
      after: {
        spinDuration: { target: 'settled', actions: 'setRoundResult' },
      },
    },
    settled: {
      after: {
        resultDisplay: { target: 'between_rounds', actions: 'prepareNextRound' },
      },
    },
    between_rounds: {
      entry: 'armBetweenRoundsWindow',
      exit: 'clearWindow',
      on: {
        PLACE_BET: { actions: 'addBet' },
        REMOVE_BET: { actions: 'removeBet' },
        CLEAR_ALL: { actions: 'clearAll' },
        SPIN_NOW: { target: 'spinning' },
        PAUSE_TIMER: { actions: 'pause' },
        RESUME_TIMER: { actions: 'resume' },
      },
      after: {
        betweenRoundsWindow: { target: 'spinning' },
      },
    },
  },
});
