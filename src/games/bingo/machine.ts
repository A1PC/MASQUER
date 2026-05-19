import { setup, assign } from 'xstate';
import {
  BINGO_CONFIG,
  generateCard,
  drawCallSequence,
  emptyDaubGrid,
  type BingoCard,
  type BingoSpeed,
  type BingoTier,
} from './logic';

export interface BingoCardState {
  card: BingoCard;
  /** 3×9 grid of daub state. */
  daubed: boolean[][];
  /** Tiers already credited on this card. */
  achievedTiers: Set<BingoTier>;
}

export interface BingoContext {
  /** UUID; regenerated on each PLAY_AGAIN. */
  gameId: string;
  cardCount: number;
  speed: BingoSpeed;
  cards: BingoCardState[];
  callSequence: number[];
  /** Number of balls already called (0..90). */
  callIndex: number;
  betHandleId: string | null;
  betAmount: number;
  daubMode: 'auto' | 'manual';
  wins: Array<{ cardId: string; tier: BingoTier; payout: number }>;
}

export type BingoEvent =
  | { type: 'BUY_AND_START'; cardCount: number; speed: BingoSpeed }
  | { type: 'BET_PLACED'; betHandleId: string }
  | { type: 'CALL' } // PR C
  | { type: 'MANUAL_DAUB'; cardId: string; row: number; col: number } // PR D
  | { type: 'TOGGLE_DAUB' } // PR D
  | { type: 'SETTLED' } // PR C
  | { type: 'PLAY_AGAIN' }; // PR C

function makeInitialContext(): BingoContext {
  return {
    gameId: crypto.randomUUID(),
    cardCount: 1,
    speed: 'normal',
    cards: [],
    callSequence: [],
    callIndex: 0,
    betHandleId: null,
    betAmount: 0,
    daubMode: 'auto',
    wins: [],
  };
}

export const bingoMachine = setup({
  types: {
    context: {} as BingoContext,
    events: {} as BingoEvent,
  },
  actions: {
    setupGame: assign(({ event }) => {
      if (event.type !== 'BUY_AND_START') return {};
      const gameId = crypto.randomUUID();
      const cards: BingoCardState[] = [];
      for (let i = 0; i < event.cardCount; i += 1) {
        const cardId = `${gameId}.card.${i}`;
        cards.push({
          card: generateCard(cardId),
          daubed: emptyDaubGrid(),
          achievedTiers: new Set<BingoTier>(),
        });
      }
      const callSequence = drawCallSequence(gameId);
      return {
        gameId,
        cardCount: event.cardCount,
        speed: event.speed,
        cards,
        callSequence,
        callIndex: 0,
        betHandleId: null,
        betAmount: event.cardCount * BINGO_CONFIG.CARD_COST,
        daubMode: 'auto',
        wins: [],
      };
    }),
    storeBetHandle: assign(({ event }) => {
      if (event.type !== 'BET_PLACED') return {};
      return { betHandleId: event.betHandleId };
    }),
  },
}).createMachine({
  id: 'bingo',
  initial: 'setup',
  context: makeInitialContext(),
  states: {
    setup: {
      on: {
        BUY_AND_START: {
          target: 'awaiting_bet_handle',
          actions: 'setupGame',
        },
      },
    },
    awaiting_bet_handle: {
      // The page-side wallet bridge listens for this state and calls placeBet.
      on: {
        BET_PLACED: {
          target: 'playing',
          actions: 'storeBetHandle',
        },
      },
    },
    playing: {
      // CALL + settling + done all land in PR C.
    },
  },
});
