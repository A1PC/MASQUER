import { assign, setup } from 'xstate';
import type { Card } from '@/games/blackjack/types';
import type { BetZoneKey, Bets, RoundResult, ShoeState } from './types';
import { EMPTY_BETS } from './types';
import {
  build8DeckShoe,
  drawFromShoe,
  markCutIfPassed,
  shouldReshuffleBeforeNextRound,
} from './shoe';
import { bankerDrawsThird, cardValue, makeHand, playerDrawsThird, resolveRound } from './logic';

export interface Ctx {
  bets: Bets;
  shoe: ShoeState;
  playerCards: Card[];
  bankerCards: Card[];
  roundResult: RoundResult | null;
  roundCount: number;
  /** When true, the upcoming round will start with a fresh shoe banner. */
  freshShoeBanner: boolean;
  /** When true, suppress all card-reveal animations (machine resolves dealing instantly). */
  reducedMotion: boolean;
}

export type Event =
  | { type: 'PLACE_CHIP'; zone: BetZoneKey; amount: number }
  | { type: 'CLEAR_ZONE'; zone: BetZoneKey }
  | { type: 'CLEAR_ALL' }
  | { type: 'DEAL' };

export interface MachineInput {
  reducedMotion?: boolean;
}

export const baccaratMachine = setup({
  types: {
    context: {} as Ctx,
    events: {} as Event,
    input: undefined as unknown as MachineInput,
  },
  actions: {
    placeChip: assign(({ context, event }) => {
      if (event.type !== 'PLACE_CHIP') return {};
      const cur = context.bets[event.zone];
      return { bets: { ...context.bets, [event.zone]: cur + event.amount } };
    }),
    clearZone: assign(({ context, event }) => {
      if (event.type !== 'CLEAR_ZONE') return {};
      return { bets: { ...context.bets, [event.zone]: 0 } };
    }),
    clearAll: assign({ bets: () => ({ ...EMPTY_BETS }) }),
    reshuffleIfNeeded: assign(({ context }) => {
      if (shouldReshuffleBeforeNextRound(context.shoe)) {
        return { shoe: build8DeckShoe(), freshShoeBanner: true };
      }
      return { freshShoeBanner: false };
    }),
    dealInitialFour: assign(({ context }) => {
      let s = context.shoe;
      const player: Card[] = [];
      const banker: Card[] = [];
      // Order: P1, B1, P2, B2.
      ({ card: player[0], shoe: s } = drawFromShoe(s));
      ({ card: banker[0], shoe: s } = drawFromShoe(s));
      ({ card: player[1], shoe: s } = drawFromShoe(s));
      ({ card: banker[1], shoe: s } = drawFromShoe(s));
      return { shoe: s, playerCards: player, bankerCards: banker };
    }),
    dealPlayerThird: assign(({ context }) => {
      const { card, shoe } = drawFromShoe(context.shoe);
      return { shoe, playerCards: [...context.playerCards, card] };
    }),
    dealBankerThird: assign(({ context }) => {
      const { card, shoe } = drawFromShoe(context.shoe);
      return { shoe, bankerCards: [...context.bankerCards, card] };
    }),
    settleRound: assign(({ context }) => {
      const result = resolveRound(context.playerCards, context.bankerCards);
      // Mark cut now that the round's cards have all been drawn.
      const newShoe = markCutIfPassed(context.shoe);
      return { roundResult: result, shoe: newShoe };
    }),
    clearLosingBets: assign(({ context }) => {
      if (!context.roundResult) return {};
      const r = context.roundResult;
      const next: Bets = { ...context.bets };
      // Each zone independent: zero out the ones that lost. Push (Player/Banker on tie) keeps the chip.
      next.player = r.winner === 'banker' ? 0 : next.player;
      next.banker = r.winner === 'player' ? 0 : next.banker;
      next.tie = r.winner === 'tie' ? next.tie : 0;
      next.playerPair = r.playerPair ? next.playerPair : 0;
      next.bankerPair = r.bankerPair ? next.bankerPair : 0;
      next.big = r.totalCards === 5 || r.totalCards === 6 ? next.big : 0;
      next.small = r.totalCards === 4 ? next.small : 0;
      // Dragon: keep stake if it won OR pushed; clear otherwise.
      next.playerDragon = dragonKept('player', r) ? next.playerDragon : 0;
      next.bankerDragon = dragonKept('banker', r) ? next.bankerDragon : 0;
      return { bets: next };
    }),
    resetForNextRound: assign(({ context }) => ({
      playerCards: [] as Card[],
      bankerCards: [] as Card[],
      roundResult: null,
      roundCount: context.roundCount + 1,
    })),
  },
  guards: {
    hasAnyBet: ({ context }) => totalBet(context.bets) > 0,
    isNatural: ({ context }) =>
      makeHand(context.playerCards).total >= 8 || makeHand(context.bankerCards).total >= 8,
    playerWillDraw: ({ context }) => {
      const pTotal = makeHand(context.playerCards).total;
      if (pTotal === 8 || pTotal === 9) return false;
      return playerDrawsThird(pTotal);
    },
    bankerWillDraw: ({ context }) => {
      const bTotal = makeHand(context.bankerCards).total;
      if (bTotal === 8 || bTotal === 9) return false;
      const playerThird =
        context.playerCards.length === 3 ? cardValue(context.playerCards[2]!) : null;
      return bankerDrawsThird(bTotal, playerThird);
    },
  },
  delays: {
    bannerDisplay: ({ context }) => (context.reducedMotion ? 0 : 2000),
  },
}).createMachine({
  id: 'baccarat',
  context: ({ input }) => ({
    bets: { ...EMPTY_BETS },
    shoe: build8DeckShoe(),
    playerCards: [],
    bankerCards: [],
    roundResult: null,
    roundCount: 0,
    freshShoeBanner: false,
    reducedMotion: input?.reducedMotion === true,
  }),
  initial: 'betting',
  states: {
    betting: {
      on: {
        PLACE_CHIP: { actions: 'placeChip' },
        CLEAR_ZONE: { actions: 'clearZone' },
        CLEAR_ALL: { actions: 'clearAll' },
        DEAL: {
          guard: 'hasAnyBet',
          target: 'preDealReshuffle',
        },
      },
    },
    preDealReshuffle: {
      entry: 'reshuffleIfNeeded',
      always: { target: 'dealing' },
    },
    dealing: {
      entry: 'dealInitialFour',
      always: [{ guard: 'isNatural', target: 'settling' }, { target: 'playerThird' }],
    },
    playerThird: {
      always: [
        { guard: 'playerWillDraw', actions: 'dealPlayerThird', target: 'bankerThird' },
        { target: 'bankerThird' },
      ],
    },
    bankerThird: {
      always: [
        { guard: 'bankerWillDraw', actions: 'dealBankerThird', target: 'settling' },
        { target: 'settling' },
      ],
    },
    settling: {
      entry: ['settleRound', 'clearLosingBets'],
      always: { target: 'showingResult' },
    },
    showingResult: {
      after: {
        bannerDisplay: { target: 'betting', actions: 'resetForNextRound' },
      },
    },
  },
});

// ----- helpers -----

function totalBet(bets: Bets): number {
  return Object.values(bets).reduce((s, n) => s + n, 0);
}

function dragonKept(side: 'player' | 'banker', r: RoundResult): boolean {
  if (r.bothNatural && r.winner === 'tie') return true; // push
  if (r.winner === 'tie') return false;
  return r.winner === side;
}
