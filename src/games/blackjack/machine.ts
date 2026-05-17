import { setup, assign } from 'xstate';
import { drawCard, freshShoe, needsReshuffle } from './cards';
import { dealerShouldHit } from './dealer';
import { canDouble, canSplit, handTotal, isBust, isNaturalBlackjack } from './hand';
import { buildRoundDetails, settleInsurance } from './settle';
import { BLACKJACK_CONFIG } from './config';
import type { Card, Hand, InsuranceState } from './types';

interface Context {
  shoe: Card[];
  shoeOriginalSize: number;
  dealerCards: Card[];
  hands: Hand[];
  activeHandIdx: number;
  insurance: InsuranceState;
  betAmount: number;
  betHandleIds: string[];
  /** Result of buildRoundDetails — consumed by the page to call wallet.settleRound. Null when no round has been settled yet. */
  roundResult: ReturnType<typeof buildRoundDetails> | null;
}

const initialContext = (): Context => ({
  shoe: [],
  shoeOriginalSize: 0,
  dealerCards: [],
  hands: [],
  activeHandIdx: 0,
  insurance: { status: 'not-offered', bet: 0, payout: 0 },
  betAmount: 0,
  betHandleIds: [],
  roundResult: null,
});

export const blackjackMachine = setup({
  types: {
    context: {} as Context,
    events: {} as
      | { type: 'PLACE_BET'; amount: number }
      | { type: 'BET_PLACED'; betHandleId: string }
      | { type: 'TAKE_INSURANCE'; betHandleId: string; bet: number }
      | { type: 'DECLINE_INSURANCE' }
      | { type: 'HIT' }
      | { type: 'STAND' }
      | { type: 'DOUBLE'; betHandleId: string }
      | { type: 'SPLIT'; betHandleId: string }
      | { type: 'NEW_ROUND' },
  },
  guards: {
    dealerShowsAce: ({ context }) => context.dealerCards[0]?.rank === 'A',
    dealerHasBlackjack: ({ context }) => {
      if (context.dealerCards.length !== 2) return false;
      return handTotal(context.dealerCards).value === 21;
    },
    playerHasBlackjack: ({ context }) =>
      context.hands.length === 1 && isNaturalBlackjack(context.hands[0]!),
    canHitActive: ({ context }) => {
      const h = context.hands[context.activeHandIdx];
      if (!h) return false;
      return !h.resolved && !h.fromSplitAces;
    },
    canDoubleActive: ({ context }) => {
      const h = context.hands[context.activeHandIdx];
      if (!h) return false;
      return canDouble(h, BLACKJACK_CONFIG.DAS);
    },
    canSplitActive: ({ context }) => {
      const h = context.hands[context.activeHandIdx];
      if (!h) return false;
      return canSplit(h, context.hands.length, BLACKJACK_CONFIG.MAX_HANDS);
    },
    allHandsResolved: ({ context }) => context.hands.every((h) => h.resolved),
    allHandsBust: ({ context }) => context.hands.every((h) => isBust(h.cards)),
    dealerShouldHit: ({ context }) => dealerShouldHit(context.dealerCards),
  },
  actions: {
    initShoe: assign(({ context }) => {
      const needs =
        context.shoe.length === 0 ||
        needsReshuffle(context.shoe, context.shoeOriginalSize, BLACKJACK_CONFIG.CUT_CARD_AT);
      if (needs) {
        const fresh = freshShoe(BLACKJACK_CONFIG.DECKS);
        return { shoe: fresh, shoeOriginalSize: fresh.length };
      }
      return {};
    }),
    dealOpening: assign(({ context }) => {
      const shoe = [...context.shoe];
      const p1 = drawCard(shoe);
      const d1 = drawCard(shoe);
      const p2 = drawCard(shoe);
      const dHole = { ...drawCard(shoe), faceUp: false };
      const initialHand: Hand = {
        cards: [p1, p2],
        fromSplit: false,
        fromSplitAces: false,
        doubled: false,
        betHandleId: context.betHandleIds[0] ?? '',
        betAmount: context.betAmount,
        resolved: false,
      };
      return {
        shoe,
        dealerCards: [d1, dHole],
        hands: [initialHand],
        activeHandIdx: 0,
      };
    }),
    revealHoleCard: assign(({ context }) => ({
      dealerCards: context.dealerCards.map((c, i) => (i === 1 ? { ...c, faceUp: true } : c)),
    })),
    dealerHit: assign(({ context }) => {
      const shoe = [...context.shoe];
      const c = drawCard(shoe);
      return { shoe, dealerCards: [...context.dealerCards, c] };
    }),
    hitActive: assign(({ context }) => {
      const shoe = [...context.shoe];
      const c = drawCard(shoe);
      const hands = context.hands.map((h, i) =>
        i === context.activeHandIdx ? { ...h, cards: [...h.cards, c] } : h,
      );
      const active = hands[context.activeHandIdx]!;
      const total = handTotal(active.cards).value;
      if (total >= 21) {
        hands[context.activeHandIdx] = { ...active, resolved: true };
      }
      return { shoe, hands };
    }),
    standActive: assign(({ context }) => {
      const hands = context.hands.map((h, i) =>
        i === context.activeHandIdx ? { ...h, resolved: true } : h,
      );
      return { hands };
    }),
    doubleActive: assign(({ context, event }) => {
      if (event.type !== 'DOUBLE') return {};
      const shoe = [...context.shoe];
      const c = drawCard(shoe);
      const hands = context.hands.map((h, i) => {
        if (i !== context.activeHandIdx) return h;
        return {
          ...h,
          cards: [...h.cards, c],
          betAmount: h.betAmount * 2,
          betHandleId: event.betHandleId, // additional handle for the doubled bet
          doubled: true,
          resolved: true, // exactly one card after doubling, hand ends
        };
      });
      const betHandleIds = [...context.betHandleIds, event.betHandleId];
      return { shoe, hands, betHandleIds };
    }),
    splitActive: assign(({ context, event }) => {
      if (event.type !== 'SPLIT') return {};
      const active = context.hands[context.activeHandIdx]!;
      const shoe = [...context.shoe];
      const isSplittingAces = active.cards[0]?.rank === 'A';
      // Each split hand gets one of the original two cards, then one new card.
      const newCardForHandA = drawCard(shoe);
      const newCardForHandB = drawCard(shoe);
      const handA: Hand = {
        cards: [active.cards[0]!, newCardForHandA],
        fromSplit: true,
        fromSplitAces: isSplittingAces,
        doubled: false,
        betHandleId: active.betHandleId,
        betAmount: active.betAmount,
        resolved: isSplittingAces, // split-Ace hands cannot take further action
      };
      const handB: Hand = {
        cards: [active.cards[1]!, newCardForHandB],
        fromSplit: true,
        fromSplitAces: isSplittingAces,
        doubled: false,
        betHandleId: event.betHandleId,
        betAmount: active.betAmount,
        resolved: isSplittingAces,
      };
      const hands = [
        ...context.hands.slice(0, context.activeHandIdx),
        handA,
        handB,
        ...context.hands.slice(context.activeHandIdx + 1),
      ];
      return {
        shoe,
        hands,
        betHandleIds: [...context.betHandleIds, event.betHandleId],
      };
    }),
    recordInsurance: assign(({ event }) => {
      if (event.type !== 'TAKE_INSURANCE') return {};
      return {
        insurance: { status: 'declined' as const, bet: event.bet, payout: 0 },
        // status will be flipped to 'won' or 'lost' in `resolveInsurance`
      };
    }),
    resolveInsurance: assign(({ context }) => ({
      insurance: settleInsurance({
        taken: context.insurance.bet > 0,
        bet: context.insurance.bet,
        dealerCards: context.dealerCards,
      }),
    })),
    advanceToNextHand: assign(({ context }) => {
      const next = context.hands.findIndex((h, i) => i > context.activeHandIdx && !h.resolved);
      return { activeHandIdx: next === -1 ? context.activeHandIdx : next };
    }),
    composeRoundResult: assign(({ context }) => ({
      roundResult: buildRoundDetails({
        dealerCards: context.dealerCards,
        hands: context.hands,
        insurance: context.insurance,
        betHandleIds: context.betHandleIds,
        config: {
          h17: BLACKJACK_CONFIG.H17,
          maxHands: BLACKJACK_CONFIG.MAX_HANDS,
          das: BLACKJACK_CONFIG.DAS,
        },
      }),
    })),
    resetRound: assign(() => {
      const fresh = initialContext();
      return {
        dealerCards: fresh.dealerCards,
        hands: fresh.hands,
        activeHandIdx: 0,
        insurance: fresh.insurance,
        betAmount: 0,
        betHandleIds: [],
        roundResult: null,
      };
    }),
  },
}).createMachine({
  id: 'blackjack',
  initial: 'betting',
  context: initialContext(),
  states: {
    betting: {
      on: {
        PLACE_BET: {
          target: 'awaiting_bet_handle',
          actions: assign(({ event }) => ({ betAmount: event.amount })),
        },
      },
    },
    awaiting_bet_handle: {
      on: {
        BET_PLACED: {
          target: 'dealing',
          actions: assign(({ event }) => ({ betHandleIds: [event.betHandleId] })),
        },
      },
    },
    dealing: {
      entry: ['initShoe', 'dealOpening'],
      always: [
        { guard: 'dealerShowsAce', target: 'insurance_prompt' },
        { target: 'checking_naturals' },
      ],
    },
    insurance_prompt: {
      on: {
        TAKE_INSURANCE: {
          target: 'checking_naturals',
          actions: assign(({ event, context }) => ({
            insurance: { status: 'declined', bet: event.bet, payout: 0 },
            betHandleIds: [...context.betHandleIds, event.betHandleId],
          })),
        },
        DECLINE_INSURANCE: { target: 'checking_naturals' },
      },
    },
    checking_naturals: {
      entry: ['revealHoleCard', 'resolveInsurance'],
      always: [
        {
          guard: 'dealerHasBlackjack',
          target: 'settling',
          actions: assign(({ context }) => ({
            hands: context.hands.map((h) => ({ ...h, resolved: true })),
          })),
        },
        {
          guard: 'playerHasBlackjack',
          target: 'settling',
          actions: assign(({ context }) => ({
            hands: context.hands.map((h) => ({ ...h, resolved: true })),
          })),
        },
        { target: 'player_action' },
      ],
    },
    player_action: {
      always: [
        // If active hand is already resolved (e.g., split-Aces), advance.
        { guard: 'allHandsResolved', target: 'dealer_check' },
      ],
      on: {
        HIT: { actions: ['hitActive'], target: 'after_action' },
        STAND: { actions: ['standActive'], target: 'after_action' },
        DOUBLE: { guard: 'canDoubleActive', actions: ['doubleActive'], target: 'after_action' },
        SPLIT: { guard: 'canSplitActive', actions: ['splitActive'], target: 'after_action' },
      },
    },
    after_action: {
      always: [
        { guard: 'allHandsResolved', target: 'dealer_check' },
        { actions: ['advanceToNextHand'], target: 'player_action' },
      ],
    },
    dealer_check: {
      // If all hands busted, dealer doesn't draw — go straight to settling.
      always: [{ guard: 'allHandsBust', target: 'settling' }, { target: 'dealer_action' }],
    },
    dealer_action: {
      // dealer draws per H17 rule; this loops via re-entry
      always: [
        {
          guard: 'dealerShouldHit',
          actions: ['dealerHit'],
          target: 'dealer_action',
          reenter: true,
        },
        { target: 'settling' },
      ],
    },
    settling: {
      entry: ['composeRoundResult'],
      on: {
        NEW_ROUND: { target: 'betting', actions: ['resetRound'] },
      },
    },
  },
});
