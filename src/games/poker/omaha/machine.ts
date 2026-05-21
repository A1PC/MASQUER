import { setup, assign } from 'xstate';
import type { Card } from '../_shared/types';
import type { HandRank } from '../_shared/types';
import type { SidePot } from '../_shared/sidePots';
import type { Archetype } from '../_shared/ai/archetypes';
import type { Decision } from '../_shared/ai/decide';
import { evaluateFrom } from '../_shared/handEvaluator';
import { dealHand, nextActiveSeat, resolveShowdown } from './omahaLogic';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SeatStatus = 'active' | 'folded' | 'all-in' | 'busted' | 'empty';

export interface OmahaSeatState {
  seatId: number; // 0 = you; 1..5 = AI
  occupant: 'you' | { archetype: Archetype; name: string };
  stack: number;
  holeCards: Card[];
  committedThisStreet: number;
  committedThisHand: number; // for side-pot math
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

export interface OmahaContext {
  sessionId: string;
  handNumber: number;
  variant: 'omaha';
  stakes: { sb: number; bb: number };
  tableSize: number;
  seats: OmahaSeatState[];
  buttonSeat: number;
  board: Card[];
  street: 'preflop' | 'flop' | 'turn' | 'river';
  pot: number;
  currentBet: number;
  minRaise: number;
  toActSeat: number;
  lastAggressorSeat: number | null;
  actedSinceLastRaise: number[]; // seatIds who've acted since last raise
  sidePots: SidePot[];
  handResult: HandResult | null;
  // session-level:
  totalBoughtIn: number;
  rebuys: number;
  handsPlayed: number;
  biggestPotWon: number;
}

export type OmahaEvent =
  | { type: 'START_HAND' }
  | { type: 'PLAYER_ACTION'; action: 'fold' | 'check' | 'call' }
  | { type: 'PLAYER_RAISE'; amount: number }
  | { type: 'AI_ACTION'; seatId: number; decision: Decision }
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

function makeInitialSeats(input: MachineInput): OmahaSeatState[] {
  const seats: OmahaSeatState[] = [];
  // Seat 0 = player
  seats.push({
    seatId: 0,
    occupant: 'you',
    stack: input.buyIn,
    holeCards: [],
    committedThisStreet: 0,
    committedThisHand: 0,
    status: 'active',
  });
  // Seats 1..tableSize-1 = AI
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
      status: 'active',
    });
  }
  return seats;
}

function countActiveSeats(seats: OmahaSeatState[]): number {
  return seats.filter((s) => s.status === 'active').length;
}

/** Get toCall amount for a given seat. */
function toCallForSeat(seat: OmahaSeatState, currentBet: number): number {
  return Math.max(0, currentBet - seat.committedThisStreet);
}

/**
 * Determine if the betting round is closed.
 * Closed when every live, non-all-in seat has matched currentBet or folded
 * AND the action has returned to lastAggressorSeat (or all checked around).
 */
function isBettingRoundClosed(context: OmahaContext): boolean {
  const { seats, currentBet, lastAggressorSeat, actedSinceLastRaise } = context;
  const activeSeats = seats.filter((s) => s.status === 'active');
  if (activeSeats.length === 0) return true;
  // Everyone must have matched currentBet
  for (const s of activeSeats) {
    if (s.committedThisStreet < currentBet) return false;
  }
  // If there was no bet (currentBet = 0 or only blinds preflop matched), all must have acted
  if (lastAggressorSeat === null) {
    // Check-around: all active seats must appear in actedSinceLastRaise
    for (const s of activeSeats) {
      if (!actedSinceLastRaise.includes(s.seatId)) return false;
    }
    return true;
  }
  // There was a bet/raise — all active seats except the lastAggressor must have acted since
  for (const s of activeSeats) {
    if (s.seatId === lastAggressorSeat) continue;
    if (!actedSinceLastRaise.includes(s.seatId)) return false;
  }
  return true;
}

/** Reset per-street state, keeping committedThisHand. */
function resetStreetState(seats: OmahaSeatState[]): OmahaSeatState[] {
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

// ─── Machine ──────────────────────────────────────────────────────────────────

export const omahaMachine = setup({
  types: {
    context: {} as OmahaContext,
    events: {} as OmahaEvent,
    input: {} as MachineInput,
  },
  actions: {
    /** Deal a new hand: shuffle, deal 4 hole cards each, post blinds, set action. */
    startHand: assign(({ context }) => {
      const { seats: rawSeats, buttonSeat, stakes, sessionId, handNumber } = context;
      const newHandNumber = handNumber + 1;
      const seed = `${sessionId}.${newHandNumber}`;

      // Eligible seats (not busted, not empty) participate in the hand
      const eligibleSeats = rawSeats.filter(
        (s) => s.status !== 'busted' && s.status !== 'empty' && s.stack > 0,
      );
      const numEligible = eligibleSeats.length;

      // Reset all seats for new hand
      const seats: OmahaSeatState[] = rawSeats.map((s) => ({
        ...s,
        holeCards: [],
        committedThisStreet: 0,
        committedThisHand: 0,
        status:
          s.status === 'busted' || s.status === 'empty' || s.stack === 0 ? s.status : 'active',
      }));

      // Deal 4 hole cards to eligible seats + 5-card board
      const { holeCards, board } = dealHand(seed, numEligible);
      let dealIdx = 0;
      for (const seat of seats) {
        if (seat.status === 'active') {
          seat.holeCards = holeCards[dealIdx]!;
          dealIdx += 1;
        }
      }

      // Heads-up vs multi-player blind posting
      const isHeadsUp = numEligible === 2;
      let sbSeat: number;
      let bbSeat: number;
      let firstToAct: number;

      if (isHeadsUp) {
        // Button posts SB, non-button posts BB
        sbSeat = buttonSeat;
        // Find the other eligible seat
        const otherSeat = eligibleSeats.find((s) => s.seatId !== buttonSeat);
        bbSeat = otherSeat ? otherSeat.seatId : (buttonSeat + 1) % seats.length;
        // Button (SB) acts first preflop
        firstToAct = sbSeat;
      } else {
        // Standard: button+1 = SB, button+2 = BB
        // Find the two eligible seats after the button
        const eligibleIds = eligibleSeats.map((s) => s.seatId);
        const buttonIdx = eligibleIds.indexOf(buttonSeat);
        sbSeat = eligibleIds[(buttonIdx + 1) % eligibleIds.length]!;
        bbSeat = eligibleIds[(buttonIdx + 2) % eligibleIds.length]!;
        firstToAct = eligibleIds[(buttonIdx + 3) % eligibleIds.length]!;
      }

      // Post SB
      const sbChips = Math.min(stakes.sb, seats[sbSeat]!.stack);
      seats[sbSeat]!.committedThisStreet = sbChips;
      seats[sbSeat]!.committedThisHand = sbChips;
      seats[sbSeat]!.stack -= sbChips;
      if (seats[sbSeat]!.stack === 0) seats[sbSeat]!.status = 'all-in';

      // Post BB
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
        // board stores all 5 cards; street determines how many are visible to the UI
        board,
        street: 'preflop' as const,
        pot,
        currentBet,
        minRaise: stakes.bb,
        toActSeat: firstToAct,
        // null = no one has explicitly bet/raised yet; the BB amount is just the forced blind.
        // With lastAggressorSeat=null, ALL active seats (including BB) must appear in
        // actedSinceLastRaise before the round closes, giving BB their check/raise option.
        lastAggressorSeat: null,
        actedSinceLastRaise: [],
        sidePots: [],
        handResult: null,
        handsPlayed: context.handsPlayed + 1,
      };
    }),

    /** Apply a fold action. */
    applyFold: assign(({ context }) => {
      const { seats, toActSeat, actedSinceLastRaise } = context;
      const newSeats = seats.map((s) =>
        s.seatId === toActSeat ? { ...s, status: 'folded' as const } : s,
      );
      const newActed = actedSinceLastRaise.includes(toActSeat)
        ? actedSinceLastRaise
        : [...actedSinceLastRaise, toActSeat];
      const nextSeat = nextActiveSeat(newSeats, toActSeat);
      return { seats: newSeats, toActSeat: nextSeat, actedSinceLastRaise: newActed };
    }),

    /** Apply a check action. */
    applyCheck: assign(({ context }) => {
      const { seats, toActSeat, actedSinceLastRaise } = context;
      const newActed = actedSinceLastRaise.includes(toActSeat)
        ? actedSinceLastRaise
        : [...actedSinceLastRaise, toActSeat];
      const nextSeat = nextActiveSeat(seats, toActSeat);
      return { toActSeat: nextSeat, actedSinceLastRaise: newActed };
    }),

    /** Apply a call action. */
    applyCall: assign(({ context }) => {
      const { seats, toActSeat, currentBet, pot, actedSinceLastRaise } = context;
      const seat = seats.find((s) => s.seatId === toActSeat)!;
      const toCall = Math.min(toCallForSeat(seat, currentBet), seat.stack);
      const newSeats = seats.map((s) => {
        if (s.seatId !== toActSeat) return s;
        const newStack = s.stack - toCall;
        return {
          ...s,
          stack: newStack,
          committedThisStreet: s.committedThisStreet + toCall,
          committedThisHand: s.committedThisHand + toCall,
          status: newStack === 0 ? ('all-in' as const) : s.status,
        };
      });
      const newActed = actedSinceLastRaise.includes(toActSeat)
        ? actedSinceLastRaise
        : [...actedSinceLastRaise, toActSeat];
      const nextSeat = nextActiveSeat(newSeats, toActSeat);
      return {
        seats: newSeats,
        pot: pot + toCall,
        toActSeat: nextSeat,
        actedSinceLastRaise: newActed,
      };
    }),

    /** Apply a raise action (from player). */
    applyPlayerRaise: assign(({ context, event }) => {
      if (event.type !== 'PLAYER_RAISE') return {};
      return applyRaiseAction(context, context.toActSeat, event.amount);
    }),

    /** Apply an AI action (validated). */
    applyAiAction: assign(({ context, event }) => {
      if (event.type !== 'AI_ACTION') return {};
      const { seatId, decision } = event;
      const seat = context.seats.find((s) => s.seatId === seatId);
      if (!seat) return {};

      const toCall = toCallForSeat(seat, context.currentBet);
      let resolvedDecision = decision;

      // Validate: illegal check when toCall > 0 → treat as call
      if (decision.action === 'check' && toCall > 0) {
        resolvedDecision = { action: 'call' };
      }

      if (resolvedDecision.action === 'fold') {
        return applyFoldAction(context, seatId);
      }
      if (resolvedDecision.action === 'check') {
        return applyCheckAction(context, seatId);
      }
      if (resolvedDecision.action === 'call') {
        return applyCallAction(context, seatId);
      }
      if (resolvedDecision.action === 'raise') {
        // Validate raise: clamp to [toCall + minRaise, stack]; over-stack → all-in
        const maxRaiseTotal = context.currentBet + seat.stack;
        // decision.amount is total committed this street (like toCall + raise increment)
        let raiseAmount = resolvedDecision.amount;
        raiseAmount = Math.max(raiseAmount, context.currentBet + context.minRaise);
        raiseAmount = Math.min(raiseAmount, context.currentBet + seat.stack);
        // If raiseAmount > what the seat can afford, go all-in
        if (raiseAmount >= maxRaiseTotal) {
          raiseAmount = context.currentBet + seat.stack;
        }
        return applyRaiseAction(context, seatId, raiseAmount);
      }
      return {};
    }),

    /** Advance to the next street (deal flop/turn/river cards). */
    advanceStreet: assign(({ context }) => {
      const { street, seats, board } = context;
      // board always stores all 5 cards; street determines which slice is "revealed"
      // The UI uses street to know how many cards to show (3/4/5)
      let newStreet: 'flop' | 'turn' | 'river';

      if (street === 'preflop') {
        newStreet = 'flop';
      } else if (street === 'flop') {
        newStreet = 'turn';
      } else if (street === 'turn') {
        newStreet = 'river';
      } else {
        return {};
      }

      // Reset per-street state
      const newSeats = resetStreetState(seats);

      // Determine first to act postflop:
      // Non-heads-up: first active seat after button (SB position)
      // Heads-up: non-button acts first postflop (BB = non-button)
      const { buttonSeat } = context;
      const isHeadsUp =
        newSeats.filter((s) => s.status !== 'busted' && s.status !== 'empty').length === 2;
      let firstToAct: number;
      if (isHeadsUp) {
        // Non-button (BB) acts first postflop
        // Find the first active seat that is NOT the button
        const active = newSeats.filter((s) => s.status === 'active' || s.status === 'all-in');
        const nonButton = active.find((s) => s.seatId !== buttonSeat);
        firstToAct = nonButton ? nonButton.seatId : buttonSeat;
      } else {
        // First active seat clockwise from button
        firstToAct = nextActiveSeat(newSeats, buttonSeat);
      }

      return {
        street: newStreet,
        // board unchanged — full 5 cards already stored; street controls revealed count
        board,
        seats: newSeats,
        currentBet: 0,
        minRaise: context.stakes.bb,
        toActSeat: firstToAct,
        lastAggressorSeat: null,
        actedSinceLastRaise: [],
      };
    }),

    /** Run showdown: compute side pots, evaluate hands, award chips. */
    runShowdown: assign(({ context }) => {
      const { seats, board } = context;
      const liveSeatInputs = seats
        .filter((s) => s.status !== 'busted' && s.status !== 'empty')
        .map((s) => ({
          seatId: s.seatId,
          holeCards: s.holeCards,
          committed: s.committedThisHand,
          folded: s.status === 'folded',
        }));

      const awards = resolveShowdown({ board, seats: liveSeatInputs });

      // Build hand result for UI
      const revealedHands: HandResult['revealedHands'] = liveSeatInputs
        .filter((s) => !s.folded)
        .map((s) => {
          const base = { seatId: s.seatId, holeCards: s.holeCards };
          if (board.length === 5) {
            return { ...base, handRank: evaluateFrom(s.holeCards, board, 'omaha') };
          }
          return base;
        });

      const winners: HandResult['winners'] = Object.entries(awards).map(([seatIdStr, awarded]) => {
        const seatId = Number(seatIdStr);
        const s = liveSeatInputs.find((x) => x.seatId === seatId);
        const base = { seatId, awarded };
        if (s && !s.folded && board.length === 5) {
          return { ...base, handRank: evaluateFrom(s.holeCards, board, 'omaha') };
        }
        return base;
      });

      // Update stacks
      const newSeats = seats.map((s) => {
        const award = awards[s.seatId] ?? 0;
        return { ...s, stack: s.stack + award };
      });

      // Track biggest pot won
      const maxAward = Math.max(0, ...Object.values(awards));
      const biggestPotWon = Math.max(context.biggestPotWon, maxAward);

      const handResult: HandResult = {
        winners,
        sidePots: context.sidePots,
        revealedHands,
      };

      return {
        seats: newSeats,
        handResult,
        biggestPotWon,
        pot: 0,
      };
    }),

    /** Award uncontested pot (everyone else folded). */
    awardUncontested: assign(({ context }) => {
      const { seats, pot } = context;
      // Find the one live seat
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

    /** Move button clockwise to next eligible seat. */
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

    /** Flag busted seats (stack = 0, non-player). */
    flagBustedSeats: assign(({ context }) => {
      const newSeats = context.seats.map((s) => {
        // Only flag AI seats that are now at 0 stack
        if (s.seatId !== 0 && s.stack === 0 && s.status !== 'busted' && s.status !== 'empty') {
          return { ...s, status: 'busted' as const };
        }
        return s;
      });
      return { seats: newSeats };
    }),

    /** Apply a rebuy. */
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

    /** Reseat an AI (fresh archetype + house stack). */
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
              status: 'active' as const,
            }
          : s,
      );
      return { seats: newSeats };
    }),
  },

  guards: {
    /** Betting round is closed: all live non-all-in seats matched bet or folded + aggressor cycle complete. */
    bettingRoundClosed: ({ context }) => isBettingRoundClosed(context),

    /** Only one live (non-folded) seat remains — uncontested win. */
    onlyOneLive: ({ context }) => {
      const live = context.seats.filter((s) => s.status === 'active' || s.status === 'all-in');
      return live.length === 1;
    },

    /** Current street is the river (last street). */
    streetIsRiver: ({ context }) => context.street === 'river',

    /** Player seat (seatId=0) has busted. */
    playerBusted: ({ context }) => {
      const player = context.seats.find((s) => s.seatId === 0);
      return player !== undefined && player.stack === 0;
    },

    /** AI is acting (not the player). */
    isAiSeat: ({ context, event }) => {
      if (event.type === 'AI_ACTION') return event.seatId !== 0;
      return context.toActSeat !== 0;
    },

    /** Player seat is acting. */
    isPlayerSeat: ({ context }) => context.toActSeat === 0,

    /** At least 2 active seats can still bet (not all-in). */
    bettingCanContinue: ({ context }) => countActiveSeats(context.seats) >= 1,
  },
}).createMachine({
  id: 'omaha',
  initial: 'idle',
  context: ({ input }) => {
    return {
      sessionId: input.sessionId,
      handNumber: 0,
      variant: 'omaha' as const,
      stakes: input.stakes,
      tableSize: input.tableSize,
      seats: makeInitialSeats(input),
      buttonSeat: 0,
      board: [],
      street: 'preflop' as const,
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
    };
  },

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
        target: 'betting',
        actions: 'startHand',
      },
    },

    betting: {
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
        PLAYER_RAISE: {
          actions: 'applyPlayerRaise',
        },
        AI_ACTION: {
          actions: 'applyAiAction',
        },
      },
      always: [
        // After any action, check if round is over
        {
          guard: 'onlyOneLive',
          target: 'award_uncontested',
        },
        {
          guard: ({ context }) => isBettingRoundClosed(context) && context.street === 'river',
          target: 'showdown',
        },
        {
          guard: ({ context }) => isBettingRoundClosed(context) && context.street !== 'river',
          target: 'advance_street',
        },
      ],
    },

    advance_street: {
      always: {
        target: 'betting',
        actions: 'advanceStreet',
      },
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
        REBUY: {
          target: 'idle',
          actions: 'applyRebuy',
        },
        LEAVE_TABLE: { target: 'session_over' },
      },
    },

    session_over: {
      type: 'final',
    },
  },
});

// ─── Internal action helpers ───────────────────────────────────────────────────

function applyFoldAction(context: OmahaContext, seatId: number): Partial<OmahaContext> {
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

function applyCheckAction(context: OmahaContext, seatId: number): Partial<OmahaContext> {
  const { seats, actedSinceLastRaise } = context;
  const newActed = actedSinceLastRaise.includes(seatId)
    ? actedSinceLastRaise
    : [...actedSinceLastRaise, seatId];
  const nextSeat = nextActiveSeat(seats, seatId);
  return { toActSeat: nextSeat, actedSinceLastRaise: newActed };
}

function applyCallAction(context: OmahaContext, seatId: number): Partial<OmahaContext> {
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
  context: OmahaContext,
  seatId: number,
  raiseToAmount: number,
): Partial<OmahaContext> {
  const { seats, pot, currentBet, minRaise } = context;
  const seat = seats.find((s) => s.seatId === seatId)!;

  // raiseToAmount = total committed this street after this raise
  // Clamp to valid raise range
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
  // minRaise for next raise = at least the same increment
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
