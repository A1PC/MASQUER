import { setup, assign, fromCallback, sendTo } from 'xstate';
import {
  BUY_IN,
  CALL_SPEEDS,
  DIFFICULTY,
  drawCallSequence,
  emptyDaubGrid,
  findCellByValue,
  generateCard,
  detectNewClaims,
  payoutFor,
  potFor,
  type BingoCard,
  type BingoSpeed,
  type Difficulty,
  type Tier,
  type Variant,
} from './logic';

export interface UserCardState {
  card: BingoCard;
  daubed: boolean[][];
}

export interface CpuCardState {
  card: BingoCard;
  daubed: boolean[][];
  latencyMs: number;
  /** Tiers this CPU has claimed (not the same as the global claimedTiers — used for cleanup logic). */
  claimedTiers: Set<Tier>;
}

export interface ClaimLogEntry {
  tier: Tier;
  source: 'user' | 'cpu';
  /** Defined when source === 'cpu'. */
  cpuIdx?: number;
  /** Chip delta credited to user (0 if cpu claim or if user already claimed tier 3). */
  chipDelta: number;
}

export interface BingoContext {
  gameId: string;
  variant: Variant;
  difficulty: Difficulty;
  speed: BingoSpeed;
  daubMode: 'auto' | 'manual';
  pot: number;
  callSequence: number[];
  callIndex: number;
  userCard: UserCardState;
  cpuCards: CpuCardState[];
  claimedTiers: Set<Tier>;
  userTier1: boolean;
  userTier2: boolean;
  userTier3: boolean;
  bonusesEarned: number;
  cpuTier3Winner: number | null;
  winner: 'user' | 'cpu' | null;
  betHandleId: string | null;
  betAmount: number;
  claimLog: ClaimLogEntry[];
}

export type BingoEvent =
  | {
      type: 'BUY_AND_START';
      variant: Variant;
      difficulty: Difficulty;
      speed: BingoSpeed;
      daubMode: 'auto' | 'manual';
      rngSeed?: number;
    }
  | { type: 'BET_PLACED'; betHandleId: string }
  | { type: 'CALL' }
  | { type: 'MANUAL_DAUB'; row: number; col: number }
  | { type: 'TOGGLE_DAUB' }
  | { type: 'CPU_DAUB'; cpuIdx: number }
  | { type: 'CLAIM'; tier: Tier; source: 'user' | 'cpu'; cpuIdx?: number }
  | { type: 'SETTLED' }
  | { type: 'PLAY_AGAIN' };

function makeInitialContext(): BingoContext {
  return {
    gameId: '',
    variant: 'british',
    difficulty: 'easy',
    speed: 'normal',
    daubMode: 'auto',
    pot: 0,
    callSequence: [],
    callIndex: 0,
    userCard: { card: { id: '', cells: [] }, daubed: [] },
    cpuCards: [],
    claimedTiers: new Set(),
    userTier1: false,
    userTier2: false,
    userTier3: false,
    bonusesEarned: 0,
    cpuTier3Winner: null,
    winner: null,
    betHandleId: null,
    betAmount: 0,
    claimLog: [],
  };
}

// Suppress unused-import warning — CALL_SPEEDS is re-exported for consumers.
void CALL_SPEEDS;

/** The event the CPU scheduler actor receives from the parent machine. */
type CpuSchedulerInput = { context: BingoContext };
type CpuSchedulerEvent = { type: 'SCHEDULE_CPU_EVALS' };

const cpuSchedulerLogic = fromCallback<CpuSchedulerEvent, CpuSchedulerInput>(
  ({ input, sendBack, receive }) => {
    const timeouts = new Set<ReturnType<typeof setTimeout>>();
    receive((evt) => {
      if (evt.type !== 'SCHEDULE_CPU_EVALS') return;
      for (let i = 0; i < input.context.cpuCards.length; i += 1) {
        const cpu = input.context.cpuCards[i]!;
        const handle = setTimeout(() => {
          sendBack({ type: 'CPU_DAUB', cpuIdx: i });
          timeouts.delete(handle);
        }, cpu.latencyMs);
        timeouts.add(handle);
      }
    });
    return () => {
      for (const h of timeouts) clearTimeout(h);
      timeouts.clear();
    };
  },
);

export const bingoMachine = setup({
  types: {
    context: {} as BingoContext,
    events: {} as BingoEvent,
  },
  actors: {
    cpuScheduler: cpuSchedulerLogic,
  },
  actions: {
    setupGame: assign(({ event }) => {
      if (event.type !== 'BUY_AND_START') return {};
      const gameId = crypto.randomUUID();
      const seedBase = event.rngSeed ?? Date.now();
      const userCard: UserCardState = {
        card: generateCard(`${gameId}.user`, event.variant),
        daubed: emptyDaubGrid(event.variant),
      };
      const cfg = DIFFICULTY[event.difficulty];
      // Deterministic mulberry32-ish for CPU latency rolls so tests can pin them.
      let s = seedBase >>> 0;
      const rng = (): number => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      const [latMin, latMax] = cfg.cpuLatencyMs;
      const cpuCards: CpuCardState[] = [];
      for (let i = 0; i < cfg.cpuCount; i += 1) {
        cpuCards.push({
          card: generateCard(`${gameId}.cpu.${i}`, event.variant),
          daubed: emptyDaubGrid(event.variant),
          latencyMs:
            latMin === latMax ? latMin : Math.floor(rng() * (latMax - latMin + 1)) + latMin,
          claimedTiers: new Set(),
        });
      }
      return {
        gameId,
        variant: event.variant,
        difficulty: event.difficulty,
        speed: event.speed,
        daubMode: cfg.forceManual ? ('manual' as const) : event.daubMode,
        pot: potFor(event.difficulty),
        callSequence: drawCallSequence(gameId, event.variant),
        callIndex: 0,
        userCard,
        cpuCards,
        claimedTiers: new Set<Tier>(),
        userTier1: false,
        userTier2: false,
        userTier3: false,
        bonusesEarned: 0,
        cpuTier3Winner: null,
        winner: null,
        betHandleId: null,
        betAmount: BUY_IN,
        claimLog: [],
      };
    }),

    storeBetHandle: assign(({ event }) => {
      if (event.type !== 'BET_PLACED') return {};
      return { betHandleId: event.betHandleId };
    }),

    processCall: assign(({ context }) => {
      if (context.callIndex >= context.callSequence.length) return {};
      const ballNumber = context.callSequence[context.callIndex]!;
      const newCallIndex = context.callIndex + 1;
      let userCard = context.userCard;
      const updates: Partial<BingoContext> = { callIndex: newCallIndex };

      // Auto-daub user card if applicable.
      if (context.daubMode === 'auto') {
        const cell = findCellByValue(userCard.card, context.variant, ballNumber);
        if (cell) {
          const newDaubed = userCard.daubed.map((row, r) =>
            r === cell.row ? row.map((d, c) => (c === cell.col ? true : d)) : row,
          );
          userCard = { ...userCard, daubed: newDaubed };
          updates.userCard = userCard;
        }
      }
      return updates;
    }),

    /** Pure helper: daubs all called balls so far on the given CPU's card. */
    processCpuDaub: assign(({ context, event }) => {
      if (event.type !== 'CPU_DAUB') return {};
      const cpu = context.cpuCards[event.cpuIdx];
      if (!cpu) return {};
      // Daub all called balls on this CPU's card (idempotent).
      const calledSet = new Set(context.callSequence.slice(0, context.callIndex));
      let changed = false;
      const newDaubed = cpu.daubed.map((row, r) =>
        row.map((d, c) => {
          if (d) return d;
          const v = cpu.card.cells[r]![c]!.value;
          if (v !== null && calledSet.has(v)) {
            changed = true;
            return true;
          }
          return d;
        }),
      );
      if (!changed) return {};
      const updatedCpu: CpuCardState = { ...cpu, daubed: newDaubed };
      const newCpus = context.cpuCards.slice();
      newCpus[event.cpuIdx] = updatedCpu;
      return { cpuCards: newCpus };
    }),

    processManualDaub: assign(({ context, event }) => {
      if (event.type !== 'MANUAL_DAUB') return {};
      if (context.daubMode !== 'manual') return {};
      const { row, col } = event;
      const cell = context.userCard.card.cells[row]?.[col];
      if (!cell || cell.value === null) return {};
      if (context.userCard.daubed[row]![col]) return {};
      const calledSet = new Set(context.callSequence.slice(0, context.callIndex));
      if (!calledSet.has(cell.value)) return {};
      const newDaubed = context.userCard.daubed.map((rowArr, r) =>
        r === row ? rowArr.map((d, c) => (c === col ? true : d)) : rowArr,
      );
      return { userCard: { ...context.userCard, daubed: newDaubed } };
    }),

    processClaim: assign(({ context, event }) => {
      if (event.type !== 'CLAIM') return {};
      if (context.claimedTiers.has(event.tier)) return {};
      const newClaimed = new Set(context.claimedTiers).add(event.tier);
      const updates: Partial<BingoContext> = { claimedTiers: newClaimed };
      let chipDelta = 0;
      if (event.source === 'user') {
        chipDelta = payoutFor(event.tier, context.pot);
        if (event.tier === 'tier1') updates.userTier1 = true;
        else if (event.tier === 'tier2') updates.userTier2 = true;
        else updates.userTier3 = true;
        if (event.tier !== 'tier3') updates.bonusesEarned = context.bonusesEarned + chipDelta;
      } else {
        if (event.tier === 'tier3') updates.cpuTier3Winner = event.cpuIdx ?? null;
      }
      if (event.tier === 'tier3') updates.winner = event.source;
      updates.claimLog = [
        ...context.claimLog,
        {
          tier: event.tier,
          source: event.source,
          ...(event.cpuIdx !== undefined ? { cpuIdx: event.cpuIdx } : {}),
          chipDelta,
        },
      ];
      return updates;
    }),

    toggleDaub: assign(({ context }) => {
      if (DIFFICULTY[context.difficulty].forceManual) return {};
      if (context.daubMode === 'manual') {
        // Auto-daub all currently-called balls on user card.
        const calledSet = new Set(context.callSequence.slice(0, context.callIndex));
        const newDaubed = context.userCard.daubed.map((row, r) =>
          row.map((d, c) => {
            if (d) return d;
            const v = context.userCard.card.cells[r]![c]!.value;
            return v !== null && calledSet.has(v) ? true : d;
          }),
        );
        return {
          daubMode: 'auto' as const,
          userCard: { ...context.userCard, daubed: newDaubed },
        };
      }
      return { daubMode: 'manual' as const };
    }),

    resetForPlayAgain: assign(() => makeInitialContext()),
  },
}).createMachine({
  id: 'bingo',
  initial: 'setup',
  context: makeInitialContext(),
  states: {
    setup: {
      on: {
        BUY_AND_START: { target: 'awaiting_bet_handle', actions: 'setupGame' },
      },
    },
    awaiting_bet_handle: {
      on: {
        BET_PLACED: { target: 'playing', actions: 'storeBetHandle' },
      },
    },
    playing: {
      // CPU scheduler runs the whole time we're in playing.
      invoke: {
        id: 'cpuScheduler',
        src: 'cpuScheduler',
        input: ({ context }: { context: BingoContext }) => ({ context }),
      },
      on: {
        CALL: {
          actions: [
            'processCall',
            // Evaluate user card synchronously (auto mode) — emit any new claims.
            ({ context, self }) => {
              if (context.userTier3) return; // already won, no further claims for user
              if (context.daubMode !== 'auto') return;
              const claims = detectNewClaims(
                context.userCard.card,
                context.userCard.daubed,
                context.variant,
                context.claimedTiers,
              );
              for (const tier of claims) {
                self.send({ type: 'CLAIM', tier, source: 'user' });
              }
            },
            // Forward to the cpuScheduler actor so it schedules per-CPU setTimeouts.
            sendTo('cpuScheduler', { type: 'SCHEDULE_CPU_EVALS' }),
          ],
        },
        MANUAL_DAUB: {
          actions: [
            'processManualDaub',
            ({ context, self }) => {
              if (context.daubMode !== 'manual') return;
              const claims = detectNewClaims(
                context.userCard.card,
                context.userCard.daubed,
                context.variant,
                context.claimedTiers,
              );
              for (const tier of claims) {
                self.send({ type: 'CLAIM', tier, source: 'user' });
              }
            },
          ],
        },
        TOGGLE_DAUB: {
          actions: [
            'toggleDaub',
            ({ context, self }) => {
              // Only emit claims if we just switched TO auto mode.
              if (context.daubMode !== 'auto') return;
              const claims = detectNewClaims(
                context.userCard.card,
                context.userCard.daubed,
                context.variant,
                context.claimedTiers,
              );
              for (const tier of claims) {
                self.send({ type: 'CLAIM', tier, source: 'user' });
              }
            },
          ],
        },
        CPU_DAUB: {
          actions: [
            'processCpuDaub',
            ({ context, event, self }) => {
              if (event.type !== 'CPU_DAUB') return;
              const cpu = context.cpuCards[event.cpuIdx];
              if (!cpu) return {};
              const claims = detectNewClaims(
                cpu.card,
                cpu.daubed,
                context.variant,
                context.claimedTiers,
              );
              for (const tier of claims) {
                self.send({ type: 'CLAIM', tier, source: 'cpu', cpuIdx: event.cpuIdx });
              }
            },
          ],
        },
        CLAIM: [
          {
            guard: ({ event }) => event.type === 'CLAIM' && event.tier === 'tier3',
            target: 'settling',
            actions: 'processClaim',
          },
          {
            actions: 'processClaim',
          },
        ],
      },
    },
    settling: {
      on: { SETTLED: 'done' },
    },
    done: {
      on: { PLAY_AGAIN: { target: 'setup', actions: 'resetForPlayAgain' } },
    },
  },
});
