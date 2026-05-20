import { setup, assign } from 'xstate';
import type { Risk } from './logic';

export type Mode = 'manual' | 'auto';

export type AutoStopReason = 'completed' | 'user-stop' | 'insufficient-chips';

export interface FallingBallState {
  ballId: string;
  betHandleId: string;
  bet: number;
  risk: Risk;
  path: ('L' | 'R')[];
  bin: number;
  multiplier: number;
  payout: number;
  spawnedAt: number;
}

export interface HistoryEntry {
  ballId: string;
  risk: Risk;
  bin: number;
  multiplier: number;
  bet: number;
  payout: number;
}

export interface PlinkoContext {
  // Auto session config (only meaningful when state === 'playing-auto' or '-stopping'):
  risk: Risk;
  bet: number;
  mode: Mode;
  autoBallsRequested: number;
  autoBallsSpawned: number;
  autoIntervalMs: number;
  sessionId: string;
  // Live state:
  inFlightBalls: FallingBallState[];
  history: HistoryEntry[]; // rolling last 50
  autoStopReason: AutoStopReason | null;
}

export type PlinkoEvent =
  | {
      type: 'DROP_MANUAL';
      bet: number;
      risk: Risk;
      betHandleId: string;
      path: ('L' | 'R')[];
      bin: number;
      multiplier: number;
      payout: number;
      ballId: string;
      sessionId: string;
    }
  | {
      type: 'START_AUTO';
      bet: number;
      risk: Risk;
      ballsRequested: number;
      intervalMs: number;
      sessionId: string;
    }
  | {
      type: 'AUTO_TICK';
      betHandleId: string;
      path: ('L' | 'R')[];
      bin: number;
      multiplier: number;
      payout: number;
      ballId: string;
    }
  | { type: 'AUTO_STOP'; reason: AutoStopReason }
  | { type: 'BALL_LANDED'; ballId: string }
  | { type: 'RESET' };

const HISTORY_CAP = 50;

function makeInitialContext(): PlinkoContext {
  return {
    risk: 'low',
    bet: 50,
    mode: 'manual',
    autoBallsRequested: 0,
    autoBallsSpawned: 0,
    autoIntervalMs: 500,
    sessionId: '',
    inFlightBalls: [],
    history: [],
    autoStopReason: null,
  };
}

function appendHistory(history: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  const next = [entry, ...history];
  return next.length > HISTORY_CAP ? next.slice(0, HISTORY_CAP) : next;
}

export const plinkoMachine = setup({
  types: {
    context: {} as PlinkoContext,
    events: {} as PlinkoEvent,
  },
  actions: {
    spawnManualBall: assign(({ context, event }) => {
      if (event.type !== 'DROP_MANUAL') return {};
      const ball: FallingBallState = {
        ballId: event.ballId,
        betHandleId: event.betHandleId,
        bet: event.bet,
        risk: event.risk,
        path: event.path,
        bin: event.bin,
        multiplier: event.multiplier,
        payout: event.payout,
        spawnedAt: Date.now(),
      };
      return {
        risk: event.risk,
        bet: event.bet,
        mode: 'manual' as const,
        sessionId: event.sessionId,
        inFlightBalls: [...context.inFlightBalls, ball],
      };
    }),

    startAutoSession: assign(({ event }) => {
      if (event.type !== 'START_AUTO') return {};
      return {
        risk: event.risk,
        bet: event.bet,
        mode: 'auto' as const,
        autoBallsRequested: event.ballsRequested,
        autoBallsSpawned: 0,
        autoIntervalMs: event.intervalMs,
        sessionId: event.sessionId,
        autoStopReason: null,
      };
    }),

    spawnAutoBall: assign(({ context, event }) => {
      if (event.type !== 'AUTO_TICK') return {};
      const ball: FallingBallState = {
        ballId: event.ballId,
        betHandleId: event.betHandleId,
        bet: context.bet,
        risk: context.risk,
        path: event.path,
        bin: event.bin,
        multiplier: event.multiplier,
        payout: event.payout,
        spawnedAt: Date.now(),
      };
      return {
        inFlightBalls: [...context.inFlightBalls, ball],
        autoBallsSpawned: context.autoBallsSpawned + 1,
      };
    }),

    landBall: assign(({ context, event }) => {
      if (event.type !== 'BALL_LANDED') return {};
      const ball = context.inFlightBalls.find((b) => b.ballId === event.ballId);
      if (!ball) return {};
      const newInFlight = context.inFlightBalls.filter((b) => b.ballId !== event.ballId);
      const entry: HistoryEntry = {
        ballId: ball.ballId,
        risk: ball.risk,
        bin: ball.bin,
        multiplier: ball.multiplier,
        bet: ball.bet,
        payout: ball.payout,
      };
      return {
        inFlightBalls: newInFlight,
        history: appendHistory(context.history, entry),
      };
    }),

    recordAutoStop: assign(({ event }) => {
      if (event.type !== 'AUTO_STOP') return {};
      return { autoStopReason: event.reason };
    }),

    markCompleted: assign({
      autoStopReason: 'completed' as const,
    }),

    reset: assign(makeInitialContext),
  },
  guards: {
    isAutoSessionFinished: ({ context, event }) => {
      if (event.type !== 'BALL_LANDED') return false;
      // Guard fires BEFORE landBall action runs, so inFlightBalls still contains
      // the ball being landed. Compute what in-flight count will be after landing.
      const inFlightAfter = context.inFlightBalls.filter((b) => b.ballId !== event.ballId).length;
      return context.autoBallsSpawned >= context.autoBallsRequested && inFlightAfter === 0;
    },
    isStoppingFinished: ({ context, event }) => {
      if (event.type !== 'BALL_LANDED') return false;
      const inFlightAfter = context.inFlightBalls.filter((b) => b.ballId !== event.ballId).length;
      return inFlightAfter === 0;
    },
    isAutoAtCap: ({ context }) => context.autoBallsSpawned >= context.autoBallsRequested,
  },
}).createMachine({
  id: 'plinko',
  initial: 'idle',
  context: makeInitialContext(),
  states: {
    idle: {
      on: {
        DROP_MANUAL: { actions: 'spawnManualBall' },
        START_AUTO: { target: 'playing-auto', actions: 'startAutoSession' },
        BALL_LANDED: { actions: 'landBall' },
        RESET: { actions: 'reset' },
      },
    },
    'playing-auto': {
      on: {
        AUTO_TICK: [{ guard: 'isAutoAtCap' }, { actions: 'spawnAutoBall' }],
        BALL_LANDED: [
          {
            guard: 'isAutoSessionFinished',
            actions: ['landBall', 'markCompleted'],
            target: 'idle',
          },
          { actions: 'landBall' },
        ],
        AUTO_STOP: { target: 'playing-auto-stopping', actions: 'recordAutoStop' },
      },
    },
    'playing-auto-stopping': {
      on: {
        BALL_LANDED: [
          {
            guard: 'isStoppingFinished',
            actions: 'landBall',
            target: 'idle',
          },
          { actions: 'landBall' },
        ],
      },
    },
  },
});
