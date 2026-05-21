import { setup, assign } from 'xstate';
import type { Card } from '../_shared/types';
import type { HandRank } from '../_shared/types';
import type { SidePot } from '../_shared/sidePots';
import type { Archetype } from '../_shared/ai/archetypes';
import type { Decision } from '../_shared/ai/decide';
import { evaluateBest5 } from '../_shared/handEvaluator';
import {
  dealHand,
  nextActiveSeat,
  resolveShowdown,
  deckFromSeed,
  applyDiscards,
} from './drawLogic';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SeatStatus = 'active' | 'folded' | 'all-in' | 'busted' | 'empty';
export type DrawStreet = 'predraw' | 'draw' | 'postdraw';

export interface DrawSeatState {
  seatId: number; // 0 = you; 1..5 = AI
  occupant: 'you' | { archetype: Archetype; name: string };
  stack: number;
  holeCards: Card[]; // exactly 5 during/after deal
  committedThisStreet: number;
  committedThisHand: number;
  discardCount: number; // -1 = not yet drawn this hand
  hasDrawn: boolean;
  status: SeatStatus;
}

export interface HandResult {
  winners: Array<{
    seatId: number;
    awarded: number;
    handRank?: HandRank;
  }>;
  sidePots: SidePot[];
  revealedHands: Array<{ seatId: number; holeCards: Card[]; handRank?: HandRank }>;
}

export interface DrawContext {
  sessionId: string;
  handNumber: number;
  variant: 'five-card-draw';
  stakes: { sb: number; bb: number };
  tableSize: number;
  seats: DrawSeatState[];
  buttonSeat: number;
  deck: Card[]; // seeded per hand
  deckCursor: number; // next undealt index
  street: DrawStreet;
  pot: number;
  currentBet: number;
  minRaise: number;
  toActSeat: number;
  lastAggressorSeat: number | null;
  actedSinceLastRaise: number[];
  sidePots: SidePot[];
  handResult: HandResult | null;
  // session-level:
  totalBoughtIn: number;
  rebuys: number;
  handsPlayed: number;
  biggestPotWon: number;
}

export type DrawEvent =
  | { type: 'START_HAND' }
  | { type: 'PLAYER_ACTION'; action: 'fold' | 'check' | 'call' }
  | { type: 'PLAYER_RAISE'; amount: number }
  | { type: 'AI_ACTION'; seatId: number; decision: Decision }
  | { type: 'PLAYER_DISCARD'; indices: number[] }
  | { type: 'AI_DISCARD'; seatId: number; indices: number[] }
  | { type: 'REBUY'; amount: number }
  | { type: 'LEAVE_TABLE' }
  | { type: 'RESEAT_AI'; seatId: number; archetype: Archetype; name: string; stack: number };

export interface MachineInput {
  sessionId: string;
  buyIn: number;
  tableSize: number;
  stakes: { sb: number; bb: number };
  aiArchetypes: Array<{ archetype: Archetype; name: string; stack: number }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeInitialSeats(input: MachineInput): DrawSeatState[] {
  const seats: DrawSeatState[] = [];
  seats.push({
    seatId: 0,
    occupant: 'you',
    stack: input.buyIn,
    holeCards: [],
    committedThisStreet: 0,
    committedThisHand: 0,
    discardCount: -1,
    hasDrawn: false,
    status: 'active',
  });
  for (let i = 1; i < input.tableSize; i += 1) {
    const ai = input.aiArchetypes[i - 1];
    seats.push({
      seatId: i,
      occupant: ai
        ? { archetype: ai.archetype, name: ai.name }
        : { archetype: 'rock' as const, name: `Player ${i}` },
      stack: ai ? ai.stack : input.stakes.bb * 80,
      holeCards: [],
      committedThisStreet: 0,
      committedThisHand: 0,
      discardCount: -1,
      hasDrawn: false,
      status: 'active',
    });
  }
  return seats;
}

function toCallForSeat(seat: DrawSeatState, currentBet: number): number {
  return Math.max(0, currentBet - seat.committedThisStreet);
}

function isBettingRoundClosed(context: DrawContext): boolean {
  const { seats, currentBet, lastAggressorSeat, actedSinceLastRaise } = context;
  const activeSeats = seats.filter((s) => s.status === 'active');
  if (activeSeats.length === 0) return true;
  for (const s of activeSeats) {
    if (s.committedThisStreet < currentBet) return false;
  }
  if (lastAggressorSeat === null) {
    for (const s of activeSeats) {
      if (!actedSinceLastRaise.includes(s.seatId)) return false;
    }
    return true;
  }
  for (const s of activeSeats) {
    if (s.seatId === lastAggressorSeat) continue;
    if (!actedSinceLastRaise.includes(s.seatId)) return false;
  }
  return true;
}

function allLiveSeatsHaveDrawn(context: DrawContext): boolean {
  const live = context.seats.filter((s) => s.status === 'active' || s.status === 'all-in');
  return live.length > 0 && live.every((s) => s.hasDrawn);
}

function resetStreetState(seats: DrawSeatState[]): DrawSeatState[] {
  return seats.map((s) => ({
    ...s,
    committedThisStreet: 0,
    status:
      s.status === 'folded' ||
      s.status === 'all-in' ||
      s.status === 'busted' ||
      s.status === 'empty'
        ? s.status
        : 'active',
  }));
}

/** First live seat clockwise from the button (for draw order and postdraw first-to-act). */
function firstSeatAfterButton(seats: DrawSeatState[], buttonSeat: number): number {
  const n = seats.length;
  for (let step = 1; step <= n; step += 1) {
    const i = (buttonSeat + step) % n;
    if (seats[i]!.status === 'active' || seats[i]!.status === 'all-in') return i;
  }
  return buttonSeat;
}

// ─── Internal action helpers (used by both inline and named actions) ──────────

function applyFoldAction(context: DrawContext, seatId: number): Partial<DrawContext> {
  const { seats, actedSinceLastRaise } = context;
  const newSeats = seats.map((s) =>
    s.seatId === seatId ? { ...s, status: 'folded' as const } : s,
  );
  const newActed = actedSinceLastRaise.includes(seatId)
    ? actedSinceLastRaise
    : [...actedSinceLastRaise, seatId];
  const nextSeat = nextActiveSeat(newSeats, seatId);
  return { seats: newSeats, toActSeat: nextSeat, actedSinceLastRaise: newActed };
}

function applyCheckAction(context: DrawContext, seatId: number): Partial<DrawContext> {
  const { seats, actedSinceLastRaise } = context;
  const newActed = actedSinceLastRaise.includes(seatId)
    ? actedSinceLastRaise
    : [...actedSinceLastRaise, seatId];
  const nextSeat = nextActiveSeat(seats, seatId);
  return { toActSeat: nextSeat, actedSinceLastRaise: newActed };
}

function applyCallAction(context: DrawContext, seatId: number): Partial<DrawContext> {
  const { seats, currentBet, pot, actedSinceLastRaise } = context;
  const seat = seats.find((s) => s.seatId === seatId)!;
  const toCall = Math.min(toCallForSeat(seat, currentBet), seat.stack);
  const newSeats = seats.map((s) => {
    if (s.seatId !== seatId) return s;
    const newStack = s.stack - toCall;
    return {
      ...s,
      stack: newStack,
      committedThisStreet: s.committedThisStreet + toCall,
      committedThisHand: s.committedThisHand + toCall,
      status: newStack === 0 ? ('all-in' as const) : s.status,
    };
  });
  const newActed = actedSinceLastRaise.includes(seatId)
    ? actedSinceLastRaise
    : [...actedSinceLastRaise, seatId];
  const nextSeat = nextActiveSeat(newSeats, seatId);
  return {
    seats: newSeats,
    pot: pot + toCall,
    toActSeat: nextSeat,
    actedSinceLastRaise: newActed,
  };
}

function applyRaiseAction(
  context: DrawContext,
  seatId: number,
  raiseToAmount: number,
): Partial<DrawContext> {
  const { seats, pot, currentBet, minRaise } = context;
  const seat = seats.find((s) => s.seatId === seatId)!;
  const minTotal = currentBet + minRaise;
  const maxTotal = currentBet + seat.stack;
  const clampedTotal = Math.max(minTotal, Math.min(maxTotal, raiseToAmount));
  const additional = Math.min(clampedTotal - seat.committedThisStreet, seat.stack);
  const newCommitted = seat.committedThisStreet + additional;
  const newStack = seat.stack - additional;
  const newSeats = seats.map((s) => {
    if (s.seatId !== seatId) return s;
    return {
      ...s,
      stack: newStack,
      committedThisStreet: newCommitted,
      committedThisHand: s.committedThisHand + additional,
      status: newStack === 0 ? ('all-in' as const) : s.status,
    };
  });
  const newCurrentBet = newCommitted;
  const raiseIncrement = newCurrentBet - currentBet;
  const newMinRaise = Math.max(minRaise, raiseIncrement);
  const nextSeat = nextActiveSeat(newSeats, seatId);
  return {
    seats: newSeats,
    pot: pot + additional,
    currentBet: newCurrentBet,
    minRaise: newMinRaise,
    toActSeat: nextSeat,
    lastAggressorSeat: seatId,
    actedSinceLastRaise: [seatId],
  };
}

function applyDiscardAction(
  context: DrawContext,
  seatId: number,
  indices: number[],
): Partial<DrawContext> {
  const { seats, deck, deckCursor } = context;
  const seat = seats.find((s) => s.seatId === seatId);
  if (!seat) return {};

  const { holeCards: newHoleCards, cursor: newCursor } = applyDiscards(
    deck,
    deckCursor,
    seat.holeCards,
    indices,
  );

  const clean = [...new Set(indices)].filter((i) => i >= 0 && i < 5).slice(0, 3);
  const discardCount = clean.length;

  const newSeats = seats.map((s) =>
    s.seatId === seatId ? { ...s, holeCards: newHoleCards, discardCount, hasDrawn: true } : s,
  );

  // Find the next live seat that hasn't drawn yet (clockwise from current seatId)
  const drawOrderStart = seatId;
  let nextDrawSeat = seatId; // default: stay (all drawn)
  const n = newSeats.length;
  for (let step = 1; step <= n; step += 1) {
    const i = (drawOrderStart + step) % n;
    const s = newSeats[i]!;
    if ((s.status === 'active' || s.status === 'all-in') && !s.hasDrawn) {
      nextDrawSeat = i;
      break;
    }
  }

  return {
    seats: newSeats,
    deckCursor: newCursor,
    toActSeat: nextDrawSeat,
  };
}

// ─── Machine ──────────────────────────────────────────────────────────────────

export const drawMachine = setup({
  types: {
    context: {} as DrawContext,
    events: {} as DrawEvent,
    input: {} as MachineInput,
  },
  actions: {
    startHand: assign(({ context }) => {
      const { seats: rawSeats, buttonSeat, stakes, sessionId, handNumber } = context;
      const newHandNumber = handNumber + 1;
      const seed = `${sessionId}.${newHandNumber}`;

      const eligibleSeats = rawSeats.filter(
        (s) => s.status !== 'busted' && s.status !== 'empty' && s.stack > 0,
      );
      const numEligible = eligibleSeats.length;

      const seats: DrawSeatState[] = rawSeats.map((s) => ({
        ...s,
        holeCards: [],
        committedThisStreet: 0,
        committedThisHand: 0,
        discardCount: -1,
        hasDrawn: false,
        status:
          s.status === 'busted' || s.status === 'empty' || s.stack === 0 ? s.status : 'active',
      }));

      const deck = deckFromSeed(seed);
      const { holeCards, deckCursor } = dealHand(seed, numEligible);

      let dealIdx = 0;
      for (const seat of seats) {
        if (seat.status === 'active') {
          seat.holeCards = holeCards[dealIdx]!;
          dealIdx += 1;
        }
      }

      const isHeadsUp = numEligible === 2;
      let sbSeat: number;
      let bbSeat: number;
      let firstToAct: number;

      if (isHeadsUp) {
        sbSeat = buttonSeat;
        const otherSeat = eligibleSeats.find((s) => s.seatId !== buttonSeat);
        bbSeat = otherSeat ? otherSeat.seatId : (buttonSeat + 1) % seats.length;
        firstToAct = sbSeat; // button (SB) acts first pre-draw in heads-up
      } else {
        const eligibleIds = eligibleSeats.map((s) => s.seatId);
        const buttonIdx = eligibleIds.indexOf(buttonSeat);
        sbSeat = eligibleIds[(buttonIdx + 1) % eligibleIds.length]!;
        bbSeat = eligibleIds[(buttonIdx + 2) % eligibleIds.length]!;
        firstToAct = eligibleIds[(buttonIdx + 3) % eligibleIds.length]!;
      }

      const sbChips = Math.min(stakes.sb, seats[sbSeat]!.stack);
      seats[sbSeat]!.committedThisStreet = sbChips;
      seats[sbSeat]!.committedThisHand = sbChips;
      seats[sbSeat]!.stack -= sbChips;
      if (seats[sbSeat]!.stack === 0) seats[sbSeat]!.status = 'all-in';

      const bbChips = Math.min(stakes.bb, seats[bbSeat]!.stack);
      seats[bbSeat]!.committedThisStreet = bbChips;
      seats[bbSeat]!.committedThisHand = bbChips;
      seats[bbSeat]!.stack -= bbChips;
      if (seats[bbSeat]!.stack === 0) seats[bbSeat]!.status = 'all-in';

      const pot = sbChips + bbChips;
      const currentBet = bbChips;

      return {
        handNumber: newHandNumber,
        seats,
        deck,
        deckCursor,
        street: 'predraw' as const,
        pot,
        currentBet,
        minRaise: stakes.bb,
        toActSeat: firstToAct,
        lastAggressorSeat: null,
        actedSinceLastRaise: [],
        sidePots: [],
        handResult: null,
        handsPlayed: context.handsPlayed + 1,
      };
    }),

    applyFold: assign(({ context }) => {
      const { toActSeat } = context;
      return applyFoldAction(context, toActSeat);
    }),

    applyCheck: assign(({ context }) => {
      const { toActSeat } = context;
      return applyCheckAction(context, toActSeat);
    }),

    applyCall: assign(({ context }) => {
      const { toActSeat } = context;
      return applyCallAction(context, toActSeat);
    }),

    applyPlayerRaise: assign(({ context, event }) => {
      if (event.type !== 'PLAYER_RAISE') return {};
      return applyRaiseAction(context, context.toActSeat, event.amount);
    }),

    applyAiAction: assign(({ context, event }) => {
      if (event.type !== 'AI_ACTION') return {};
      const { seatId, decision } = event;
      const seat = context.seats.find((s) => s.seatId === seatId);
      if (!seat) return {};

      const toCall = toCallForSeat(seat, context.currentBet);
      let resolvedDecision = decision;

      if (decision.action === 'check' && toCall > 0) {
        resolvedDecision = { action: 'call' };
      }

      if (resolvedDecision.action === 'fold') return applyFoldAction(context, seatId);
      if (resolvedDecision.action === 'check') return applyCheckAction(context, seatId);
      if (resolvedDecision.action === 'call') return applyCallAction(context, seatId);
      if (resolvedDecision.action === 'raise') {
        const minRaiseTotal = context.currentBet + context.minRaise;
        const maxRaiseTotal = context.currentBet + seat.stack;
        let raiseAmount = resolvedDecision.amount;
        raiseAmount = Math.max(raiseAmount, minRaiseTotal);
        raiseAmount = Math.min(raiseAmount, context.currentBet + seat.stack);
        if (raiseAmount >= maxRaiseTotal) {
          raiseAmount = context.currentBet + seat.stack;
        }
        return applyRaiseAction(context, seatId, raiseAmount);
      }
      return {};
    }),

    applyPlayerDiscard: assign(({ context, event }) => {
      if (event.type !== 'PLAYER_DISCARD') return {};
      return applyDiscardAction(context, 0, event.indices);
    }),

    applyAiDiscard: assign(({ context, event }) => {
      if (event.type !== 'AI_DISCARD') return {};
      return applyDiscardAction(context, event.seatId, event.indices);
    }),

    enterDrawing: assign(({ context }) => {
      const { seats, buttonSeat } = context;
      // Reset hasDrawn for all seats; set draw order starting from first live seat after button
      const resetSeats: DrawSeatState[] = seats.map((s) => ({
        ...s,
        committedThisStreet: 0,
        hasDrawn: false,
        discardCount: -1,
        status:
          s.status === 'folded' ||
          s.status === 'all-in' ||
          s.status === 'busted' ||
          s.status === 'empty'
            ? s.status
            : ('active' as const),
      }));
      const firstDrawSeat = firstSeatAfterButton(resetSeats, buttonSeat);
      return {
        seats: resetSeats,
        street: 'draw' as const,
        toActSeat: firstDrawSeat,
        lastAggressorSeat: null,
        actedSinceLastRaise: [],
      };
    }),

    enterPostdraw: assign(({ context }) => {
      const { seats, buttonSeat, stakes } = context;
      const newSeats = resetStreetState(seats);

      // Post-draw first-to-act: same as postflop in Hold'em
      // Non-heads-up: first active seat clockwise from button
      // Heads-up: non-button acts first
      const eligible = newSeats.filter((s) => s.status !== 'busted' && s.status !== 'empty');
      const isHeadsUp = eligible.length === 2;
      let firstToAct: number;
      if (isHeadsUp) {
        const active = newSeats.filter((s) => s.status === 'active' || s.status === 'all-in');
        const nonButton = active.find((s) => s.seatId !== buttonSeat);
        firstToAct = nonButton ? nonButton.seatId : buttonSeat;
      } else {
        firstToAct = firstSeatAfterButton(newSeats, buttonSeat);
      }

      return {
        seats: newSeats,
        street: 'postdraw' as const,
        currentBet: 0,
        minRaise: stakes.bb,
        toActSeat: firstToAct,
        lastAggressorSeat: null,
        actedSinceLastRaise: [],
      };
    }),

    runShowdown: assign(({ context }) => {
      const { seats } = context;
      const liveSeatInputs = seats
        .filter((s) => s.status !== 'busted' && s.status !== 'empty')
        .map((s) => ({
          seatId: s.seatId,
          holeCards: s.holeCards,
          committed: s.committedThisHand,
          folded: s.status === 'folded',
        }));

      const awards = resolveShowdown({ seats: liveSeatInputs });

      const revealedHands: HandResult['revealedHands'] = liveSeatInputs
        .filter((s) => !s.folded)
        .map((s) => {
          const rank = evaluateBest5(s.holeCards);
          return { seatId: s.seatId, holeCards: s.holeCards, handRank: rank };
        });

      const winners: HandResult['winners'] = Object.entries(awards).map(([seatIdStr, awarded]) => {
        const seatId = Number(seatIdStr);
        const s = liveSeatInputs.find((x) => x.seatId === seatId);
        const base = { seatId, awarded };
        if (s && !s.folded) {
          return { ...base, handRank: evaluateBest5(s.holeCards) };
        }
        return base;
      });

      const newSeats = seats.map((s) => {
        const award = awards[s.seatId] ?? 0;
        return { ...s, stack: s.stack + award };
      });

      const maxAward = Math.max(0, ...Object.values(awards));
      const biggestPotWon = Math.max(context.biggestPotWon, maxAward);

      const handResult: HandResult = {
        winners,
        sidePots: context.sidePots,
        revealedHands,
      };

      return { seats: newSeats, handResult, biggestPotWon, pot: 0 };
    }),

    awardUncontested: assign(({ context }) => {
      const { seats, pot } = context;
      const winner = seats.find((s) => s.status === 'active' || s.status === 'all-in');
      if (!winner) return {};

      const newSeats = seats.map((s) =>
        s.seatId === winner.seatId ? { ...s, stack: s.stack + pot } : s,
      );
      const biggestPotWon = Math.max(context.biggestPotWon, pot);
      const handResult: HandResult = {
        winners: [{ seatId: winner.seatId, awarded: pot }],
        sidePots: [],
        revealedHands: [],
      };
      return { seats: newSeats, handResult, biggestPotWon, pot: 0 };
    }),

    moveButton: assign(({ context }) => {
      const { seats, buttonSeat } = context;
      const eligibleIds = seats
        .filter((s) => s.status !== 'busted' && s.status !== 'empty')
        .map((s) => s.seatId);
      if (eligibleIds.length === 0) return {};
      const currentIdx = eligibleIds.indexOf(buttonSeat);
      const newButton = eligibleIds[(currentIdx + 1) % eligibleIds.length]!;
      return { buttonSeat: newButton };
    }),

    flagBustedSeats: assign(({ context }) => {
      const newSeats = context.seats.map((s) => {
        if (s.seatId !== 0 && s.stack === 0 && s.status !== 'busted' && s.status !== 'empty') {
          return { ...s, status: 'busted' as const };
        }
        return s;
      });
      return { seats: newSeats };
    }),

    applyRebuy: assign(({ context, event }) => {
      if (event.type !== 'REBUY') return {};
      const { amount } = event;
      const newSeats = context.seats.map((s) =>
        s.seatId === 0 ? { ...s, stack: s.stack + amount, status: 'active' as const } : s,
      );
      return {
        seats: newSeats,
        totalBoughtIn: context.totalBoughtIn + amount,
        rebuys: context.rebuys + 1,
      };
    }),

    reseatAi: assign(({ context, event }) => {
      if (event.type !== 'RESEAT_AI') return {};
      const { seatId, archetype, name, stack } = event;
      const newSeats = context.seats.map((s) =>
        s.seatId === seatId
          ? {
              ...s,
              occupant: { archetype, name },
              stack,
              holeCards: [],
              committedThisStreet: 0,
              committedThisHand: 0,
              discardCount: -1,
              hasDrawn: false,
              status: 'active' as const,
            }
          : s,
      );
      return { seats: newSeats };
    }),
  },

  guards: {
    bettingRoundClosed: ({ context }) => isBettingRoundClosed(context),

    onlyOneLive: ({ context }) => {
      const live = context.seats.filter((s) => s.status === 'active' || s.status === 'all-in');
      return live.length === 1;
    },

    allDrawn: ({ context }) => allLiveSeatsHaveDrawn(context),

    playerBusted: ({ context }) => {
      const player = context.seats.find((s) => s.seatId === 0);
      return player !== undefined && player.stack === 0;
    },
  },
}).createMachine({
  id: 'draw',
  initial: 'idle',
  context: ({ input }) => ({
    sessionId: input.sessionId,
    handNumber: 0,
    variant: 'five-card-draw' as const,
    stakes: input.stakes,
    tableSize: input.tableSize,
    seats: makeInitialSeats(input),
    buttonSeat: 0,
    deck: [],
    deckCursor: 0,
    street: 'predraw' as const,
    pot: 0,
    currentBet: 0,
    minRaise: input.stakes.bb,
    toActSeat: 0,
    lastAggressorSeat: null,
    actedSinceLastRaise: [],
    sidePots: [],
    handResult: null,
    totalBoughtIn: input.buyIn,
    rebuys: 0,
    handsPlayed: 0,
    biggestPotWon: 0,
  }),

  states: {
    idle: {
      on: {
        START_HAND: { target: 'posting_blinds' },
        LEAVE_TABLE: { target: 'session_over' },
        RESEAT_AI: { actions: 'reseatAi' },
      },
    },

    posting_blinds: {
      always: {
        target: 'bet_predraw',
        actions: 'startHand',
      },
    },

    bet_predraw: {
      on: {
        PLAYER_ACTION: [
          {
            guard: ({ event }) => event.type === 'PLAYER_ACTION' && event.action === 'fold',
            actions: 'applyFold',
          },
          {
            guard: ({ event }) => event.type === 'PLAYER_ACTION' && event.action === 'check',
            actions: 'applyCheck',
          },
          {
            guard: ({ event }) => event.type === 'PLAYER_ACTION' && event.action === 'call',
            actions: 'applyCall',
          },
        ],
        PLAYER_RAISE: { actions: 'applyPlayerRaise' },
        AI_ACTION: { actions: 'applyAiAction' },
      },
      always: [
        { guard: 'onlyOneLive', target: 'award_uncontested' },
        { guard: 'bettingRoundClosed', target: 'drawing' },
      ],
    },

    drawing: {
      entry: 'enterDrawing',
      on: {
        PLAYER_DISCARD: { actions: 'applyPlayerDiscard' },
        AI_DISCARD: { actions: 'applyAiDiscard' },
      },
      always: [{ guard: 'allDrawn', target: 'bet_postdraw' }],
    },

    bet_postdraw: {
      entry: 'enterPostdraw',
      on: {
        PLAYER_ACTION: [
          {
            guard: ({ event }) => event.type === 'PLAYER_ACTION' && event.action === 'fold',
            actions: 'applyFold',
          },
          {
            guard: ({ event }) => event.type === 'PLAYER_ACTION' && event.action === 'check',
            actions: 'applyCheck',
          },
          {
            guard: ({ event }) => event.type === 'PLAYER_ACTION' && event.action === 'call',
            actions: 'applyCall',
          },
        ],
        PLAYER_RAISE: { actions: 'applyPlayerRaise' },
        AI_ACTION: { actions: 'applyAiAction' },
      },
      always: [
        { guard: 'onlyOneLive', target: 'award_uncontested' },
        { guard: 'bettingRoundClosed', target: 'showdown' },
      ],
    },

    showdown: {
      always: {
        target: 'hand_complete',
        actions: 'runShowdown',
      },
    },

    award_uncontested: {
      always: {
        target: 'hand_complete',
        actions: 'awardUncontested',
      },
    },

    hand_complete: {
      always: [
        {
          guard: 'playerBusted',
          target: 'bust_prompt',
          actions: ['moveButton', 'flagBustedSeats'],
        },
        {
          target: 'idle',
          actions: ['moveButton', 'flagBustedSeats'],
        },
      ],
    },

    bust_prompt: {
      on: {
        REBUY: { target: 'idle', actions: 'applyRebuy' },
        LEAVE_TABLE: { target: 'session_over' },
      },
    },

    session_over: {
      type: 'final',
    },
  },
});
