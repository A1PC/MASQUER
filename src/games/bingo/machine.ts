import { setup, assign } from 'xstate';
import {
  BINGO_CONFIG,
  generateCard,
  drawCallSequence,
  emptyDaubGrid,
  evaluateCardWins,
  findCellByValue,
  payoutFor,
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
    processCall: assign(({ context }) => {
      if (context.callIndex >= context.callSequence.length) return {};
      const ballNumber = context.callSequence[context.callIndex]!;
      const newCallIndex = context.callIndex + 1;
      const newWins = [...context.wins];
      const updatedCards = context.cards.map((cardState) => {
        let nextDaubed = cardState.daubed;
        if (context.daubMode === 'auto') {
          const cell = findCellByValue(cardState.card, ballNumber);
          if (cell) {
            nextDaubed = cardState.daubed.map((row, r) =>
              r === cell.row ? row.map((d, c) => (c === cell.col ? true : d)) : row,
            );
          }
        }
        const fired = evaluateCardWins({
          card: cardState.card,
          daubed: nextDaubed,
          callCount: newCallIndex,
          previouslyAchieved: cardState.achievedTiers,
        });
        if (fired.length === 0 && nextDaubed === cardState.daubed) return cardState;
        const nextTiers = new Set(cardState.achievedTiers);
        for (const tier of fired) {
          nextTiers.add(tier);
          newWins.push({ cardId: cardState.card.id, tier, payout: payoutFor(tier) });
        }
        return { ...cardState, daubed: nextDaubed, achievedTiers: nextTiers };
      });
      return { callIndex: newCallIndex, cards: updatedCards, wins: newWins };
    }),
    resetForPlayAgain: assign(() => ({
      gameId: crypto.randomUUID(),
      cardCount: 1,
      speed: 'normal' as const,
      cards: [],
      callSequence: [],
      callIndex: 0,
      betHandleId: null,
      betAmount: 0,
      daubMode: 'auto' as const,
      wins: [],
    })),
    toggleDaub: assign(({ context }) => {
      if (context.daubMode === 'manual') {
        // manual → auto: daub all called cells on every card, evaluate new wins
        const calledSet = new Set(context.callSequence.slice(0, context.callIndex));
        const newWins = [...context.wins];
        const updatedCards = context.cards.map((cardState) => {
          let changed = false;
          const newDaubed = cardState.daubed.map((row, r) =>
            row.map((d, c) => {
              if (d) return d;
              const value = cardState.card.cells[r]![c]!.value;
              if (value !== null && calledSet.has(value)) {
                changed = true;
                return true;
              }
              return d;
            }),
          );
          if (!changed) return { ...cardState, daubed: newDaubed };
          const fired = evaluateCardWins({
            card: cardState.card,
            daubed: newDaubed,
            callCount: context.callIndex,
            previouslyAchieved: cardState.achievedTiers,
          });
          const nextTiers = new Set(cardState.achievedTiers);
          for (const tier of fired) {
            nextTiers.add(tier);
            newWins.push({ cardId: cardState.card.id, tier, payout: payoutFor(tier) });
          }
          return { ...cardState, daubed: newDaubed, achievedTiers: nextTiers };
        });
        return { daubMode: 'auto' as const, cards: updatedCards, wins: newWins };
      }
      // auto → manual: just flip the mode (called cells stay daubed)
      return { daubMode: 'manual' as const };
    }),
    manualDaub: assign(({ context, event }) => {
      if (event.type !== 'MANUAL_DAUB') return {};
      if (context.daubMode !== 'manual') return {};
      const calledSet = new Set(context.callSequence.slice(0, context.callIndex));
      const newWins = [...context.wins];
      const updatedCards = context.cards.map((cardState) => {
        if (cardState.card.id !== event.cardId) return cardState;
        const cell = cardState.card.cells[event.row]![event.col]!;
        if (cell.value === null) return cardState;
        if (!calledSet.has(cell.value)) return cardState;
        if (cardState.daubed[event.row]![event.col]!) return cardState;
        const newDaubed = cardState.daubed.map((row, r) =>
          r === event.row ? row.map((d, c) => (c === event.col ? true : d)) : row,
        );
        const fired = evaluateCardWins({
          card: cardState.card,
          daubed: newDaubed,
          callCount: context.callIndex,
          previouslyAchieved: cardState.achievedTiers,
        });
        const nextTiers = new Set(cardState.achievedTiers);
        for (const tier of fired) {
          nextTiers.add(tier);
          newWins.push({ cardId: cardState.card.id, tier, payout: payoutFor(tier) });
        }
        return { ...cardState, daubed: newDaubed, achievedTiers: nextTiers };
      });
      return { cards: updatedCards, wins: newWins };
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
      on: {
        CALL: [
          {
            target: 'settling',
            actions: 'processCall',
            guard: ({ context }) => {
              if (context.callIndex >= context.callSequence.length) return true;
              const ballNumber = context.callSequence[context.callIndex]!;
              const next = context.callIndex + 1;
              for (const cardState of context.cards) {
                let tempDaubed = cardState.daubed;
                if (context.daubMode === 'auto') {
                  const cell = findCellByValue(cardState.card, ballNumber);
                  if (cell) {
                    tempDaubed = cardState.daubed.map((row, r) =>
                      r === cell.row ? row.map((d, c) => (c === cell.col ? true : d)) : row,
                    );
                  }
                }
                const fired = evaluateCardWins({
                  card: cardState.card,
                  daubed: tempDaubed,
                  callCount: next,
                  previouslyAchieved: cardState.achievedTiers,
                });
                if (fired.includes('full-house') || fired.includes('fast-full-house')) return true;
              }
              return false;
            },
          },
          { actions: 'processCall' },
        ],
        TOGGLE_DAUB: { actions: 'toggleDaub' },
        MANUAL_DAUB: [
          {
            target: 'settling',
            actions: 'manualDaub',
            guard: ({ context, event }) => {
              if (event.type !== 'MANUAL_DAUB') return false;
              const calledSet = new Set(context.callSequence.slice(0, context.callIndex));
              const card = context.cards.find((c) => c.card.id === event.cardId);
              if (!card) return false;
              const cell = card.card.cells[event.row]![event.col]!;
              if (
                cell.value === null ||
                !calledSet.has(cell.value) ||
                card.daubed[event.row]![event.col]!
              ) {
                return false;
              }
              const tempDaubed = card.daubed.map((row, r) =>
                r === event.row ? row.map((d, c) => (c === event.col ? true : d)) : row,
              );
              const fired = evaluateCardWins({
                card: card.card,
                daubed: tempDaubed,
                callCount: context.callIndex,
                previouslyAchieved: card.achievedTiers,
              });
              return fired.includes('full-house') || fired.includes('fast-full-house');
            },
          },
          { actions: 'manualDaub' },
        ],
      },
    },
    settling: {
      on: {
        SETTLED: 'done',
      },
    },
    done: {
      on: {
        PLAY_AGAIN: {
          target: 'setup',
          actions: 'resetForPlayAgain',
        },
      },
    },
  },
});
