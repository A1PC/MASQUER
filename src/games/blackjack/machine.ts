import { setup, assign } from 'xstate';
import { drawCard, freshShoe, needsReshuffle } from './cards';
import { dealerShouldHit } from './dealer';
import { canDouble, canSplit, handTotal, isBust, isNaturalBlackjack } from './hand';
import { buildRoundDetails, settleInsurance } from './settle';
import { BLACKJACK_CONFIG } from './config';
import type { Card, Hand, InsuranceState } from './types';

/** Step to resume after the player resolves an ACE_PROMPT. */
type PendingAfterAce = 'after_naturals' | 'after_action';

interface Context {
  shoe: Card[];
  shoeOriginalSize: number;
  dealerCards: Card[];
  hands: Hand[];
  activeHandIdx: number;
  insurance: InsuranceState;
  betAmount: number;
  betHandleIds: string[];
  /** Velvet Duel — true while the dealer is drawing one card per player action.
   *  Flips to false the first time the dealer's total reaches 17+ (per H17). */
  dealerInterleaving: boolean;
  /** Set true on player Hit/Double/Split-first-card; consumed by `after_action`
   *  to deal exactly one dealer card when `dealerInterleaving` is true. */
  pendingDealerDraw: boolean;
  /** When non-null, the player must resolve a CHOOSE_ACE event before any
   *  other progress (alternation, settling, next player action). */
  acePrompt: { handIdx: number; cardIdx: number; allowEleven: boolean } | null;
  /** Step to resume once acePrompt clears. */
  pendingAfterAce: PendingAfterAce;
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
  dealerInterleaving: false,
  pendingDealerDraw: false,
  acePrompt: null,
  pendingAfterAce: 'after_naturals',
  roundResult: null,
});

/** Find the first un-locked Ace on any player hand (deal order: by hand then by card). */
function findPendingPlayerAce(hands: readonly Hand[]): { handIdx: number; cardIdx: number } | null {
  for (let h = 0; h < hands.length; h++) {
    const hand = hands[h]!;
    for (let c = 0; c < hand.cards.length; c++) {
      const card = hand.cards[c]!;
      if (card.rank === 'A' && card.aceValue === undefined) {
        return { handIdx: h, cardIdx: c };
      }
    }
  }
  return null;
}

/** Compute hand total assuming the specified Ace card were treated as 11.
 *  Used to decide whether `allowEleven` should be offered in an ACE_PROMPT. */
function totalIfAceWereEleven(hands: readonly Hand[], handIdx: number, cardIdx: number): number {
  const hand = hands[handIdx]!;
  const probed: Card[] = hand.cards.map((c, i) =>
    i === cardIdx ? { ...c, aceValue: 11 as const } : c,
  );
  return handTotal(probed).value;
}

/** Lock an Ace's value on a player hand and return the new hands[] array. */
function lockAce(hands: readonly Hand[], handIdx: number, cardIdx: number, value: 1 | 11): Hand[] {
  return hands.map((h, hi) => {
    if (hi !== handIdx) return h;
    const cards = h.cards.map((c, ci) => (ci === cardIdx ? { ...c, aceValue: value } : c));
    const total = handTotal(cards).value;
    // If locking the Ace pushes the hand to 21+ (e.g. locked-11 busts or
    // hits 21), mark the hand resolved so no further player actions apply.
    const resolved = h.resolved || total >= 21;
    return { ...h, cards, resolved };
  });
}

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
      | { type: 'CHOOSE_ACE'; value: 1 | 11 }
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
    /** Velvet Duel min-stand-14: Stand is illegal on totals below 14. */
    canStandActive: ({ context }) => {
      const h = context.hands[context.activeHandIdx];
      if (!h) return false;
      return handTotal(h.cards).value >= 14;
    },
    allHandsResolved: ({ context }) => context.hands.every((h) => h.resolved),
    allHandsBust: ({ context }) => context.hands.every((h) => isBust(h.cards)),
    dealerShouldHit: ({ context }) => dealerShouldHit(context.dealerCards),
    hasPendingPlayerAce: ({ context }) => findPendingPlayerAce(context.hands) !== null,
    /** Dealer reached H17 stand threshold mid-interleaving — stop drawing. */
    dealerInterleaveDone: ({ context }) =>
      !context.dealerInterleaving || !dealerShouldHit(context.dealerCards),
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
      // Velvet Duel: alternation only fires while the dealer's current total
      // is still below the H17 stand threshold. Compute against both cards
      // (the hole is dealt but face-down; the alternation tick will flip it
      // on first fire). Dealer at hard 17+ from the deal → no interleaving.
      const dealerCards = [d1, dHole];
      const dealerInterleaving = dealerShouldHit(dealerCards);
      return {
        shoe,
        dealerCards,
        hands: [initialHand],
        activeHandIdx: 0,
        dealerInterleaving,
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
    /** Velvet Duel: dealer draws ONE card during interleaving. Reveals hole
     *  first (idempotent), consumes the pendingDealerDraw flag, and recomputes
     *  whether further alternation should keep firing on future player actions.
     *
     *  Bust auto-settle (ADR-0045 amendment): if the dealer busts on this
     *  interleave draw, alternation stops immediately and all still-live
     *  (non-bust) player hands are flagged resolved so `after_action` falls
     *  through directly to settling (which pays them as wins). Already-busted
     *  hands stay busted. */
    dealerInterleaveDraw: assign(({ context }) => {
      const shoe = [...context.shoe];
      const dealerCards = context.dealerCards.map((c, i) =>
        i === 1 && !c.faceUp ? { ...c, faceUp: true } : c,
      );
      const drawn = drawCard(shoe);
      const newDealer = [...dealerCards, drawn];
      const dealerBust = isBust(newDealer);
      const keepInterleaving = !dealerBust && dealerShouldHit(newDealer);
      // When dealer busts mid-interleave, mark every still-live player hand
      // resolved so we go straight to settling on the next always-tick. Hands
      // that have already busted remain resolved (they don't win retroactively).
      const hands = dealerBust
        ? context.hands.map((h) => (isBust(h.cards) ? h : { ...h, resolved: true }))
        : context.hands;
      return {
        shoe,
        dealerCards: newDealer,
        dealerInterleaving: keepInterleaving,
        pendingDealerDraw: false,
        hands,
      };
    }),
    /** Arm the next dealer alternation tick (after a player Hit/Double/Split).
     *  Bust auto-settle (ADR-0045): if the action that ran immediately before
     *  this one busted the active hand, do NOT arm — the player can't win this
     *  hand any more, so the dealer interleave is skipped (`after_action` will
     *  fall through to the next hand / dealer_check). */
    armDealerDraw: assign(({ context }) => {
      const active = context.hands[context.activeHandIdx];
      if (active && isBust(active.cards)) return {};
      return { pendingDealerDraw: true };
    }),
    /** Clear any pending alternation tick — used by STAND/SURRENDER, where the
     *  dealer's interleave does NOT fire (per Velvet Duel spec). */
    clearPendingDealerDraw: assign(() => ({ pendingDealerDraw: false })),
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
    /** Compute + set the acePrompt for the first pending player Ace.
     *  If 11 would bust the hand, auto-locks at 1 and leaves acePrompt null
     *  (the always-block will re-enter and find the next pending Ace or proceed). */
    resolveNextAcePrompt: assign(({ context }) => {
      const pending = findPendingPlayerAce(context.hands);
      if (!pending) return { acePrompt: null };
      const elevenTotal = totalIfAceWereEleven(context.hands, pending.handIdx, pending.cardIdx);
      const allowEleven = elevenTotal <= 21;
      if (!allowEleven) {
        // Auto-lock at 1, no prompt. Always-block will recurse to find more aces.
        return {
          hands: lockAce(context.hands, pending.handIdx, pending.cardIdx, 1),
          acePrompt: null,
        };
      }
      return {
        acePrompt: {
          handIdx: pending.handIdx,
          cardIdx: pending.cardIdx,
          allowEleven: true,
        },
      };
    }),
    /** Write the chosen Ace value onto the prompted card, clear the prompt. */
    applyChosenAce: assign(({ context, event }) => {
      if (event.type !== 'CHOOSE_ACE' || !context.acePrompt) return {};
      const { handIdx, cardIdx } = context.acePrompt;
      return {
        hands: lockAce(context.hands, handIdx, cardIdx, event.value),
        acePrompt: null,
      };
    }),
    setPendingAfterAceNaturals: assign(() => ({ pendingAfterAce: 'after_naturals' as const })),
    setPendingAfterAceAction: assign(() => ({ pendingAfterAce: 'after_action' as const })),
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
        dealerInterleaving: false,
        pendingDealerDraw: false,
        acePrompt: null,
        pendingAfterAce: 'after_naturals' as const,
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
      // Velvet Duel: the dealer's hole stays face-DOWN through the natural-
      // peek (the dealer secretly peeks). We only reveal it here if the peek
      // shows a natural BJ (round settles immediately). Otherwise the hole
      // stays down and flips on the first alternation tick in after_action.
      entry: ['resolveInsurance'],
      always: [
        {
          guard: 'dealerHasBlackjack',
          target: 'settling',
          actions: [
            'revealHoleCard',
            assign(({ context }) => ({
              hands: context.hands.map((h) => ({ ...h, resolved: true })),
              dealerInterleaving: false,
            })),
          ],
        },
        {
          guard: 'playerHasBlackjack',
          target: 'settling',
          actions: [
            'revealHoleCard',
            assign(({ context }) => ({
              hands: context.hands.map((h) => ({ ...h, resolved: true })),
              dealerInterleaving: false,
            })),
          ],
        },
        { target: 'checking_player_aces', actions: ['setPendingAfterAceNaturals'] },
      ],
    },
    /** Velvet Duel — resolve any pending player Aces from the opening deal
     *  (or a HIT/DOUBLE/SPLIT that drew an Ace) before resuming the next step.
     *  Auto-locks at 1 silently when 11 would bust; otherwise prompts. */
    checking_player_aces: {
      entry: ['resolveNextAcePrompt'],
      always: [
        // If resolveNextAcePrompt set acePrompt, wait for the player.
        {
          guard: ({ context }) => context.acePrompt !== null,
          target: 'awaiting_ace_choice',
        },
        // No prompt set — either we auto-locked one Ace (recurse) or there
        // are no more pending Aces and we resume the pending step.
        {
          guard: 'hasPendingPlayerAce',
          target: 'checking_player_aces',
          reenter: true,
        },
        // No pending Aces — resume.
        {
          guard: ({ context }) => context.pendingAfterAce === 'after_naturals',
          target: 'player_action',
        },
        { target: 'after_action' },
      ],
    },
    awaiting_ace_choice: {
      on: {
        CHOOSE_ACE: {
          actions: ['applyChosenAce'],
          target: 'checking_player_aces',
        },
      },
    },
    player_action: {
      always: [
        // If active hand is already resolved (e.g., split-Aces, locked-11 made 21), advance.
        { guard: 'allHandsResolved', target: 'dealer_check' },
      ],
      on: {
        HIT: {
          guard: 'canHitActive',
          actions: ['hitActive', 'armDealerDraw'],
          target: 'checking_player_aces_then_action',
        },
        STAND: {
          guard: 'canStandActive',
          actions: ['standActive', 'clearPendingDealerDraw'],
          target: 'after_action',
        },
        DOUBLE: {
          guard: 'canDoubleActive',
          actions: ['doubleActive', 'armDealerDraw'],
          target: 'checking_player_aces_then_action',
        },
        SPLIT: {
          guard: 'canSplitActive',
          actions: ['splitActive', 'armDealerDraw'],
          target: 'checking_player_aces_then_action',
        },
      },
    },
    /** Bridge state — after a HIT/DOUBLE/SPLIT that dealt a player card,
     *  resolve any pending Aces FIRST (Velvet Duel: no dealer interleave
     *  between deal and ace prompt) then fall through to after_action. */
    checking_player_aces_then_action: {
      entry: ['setPendingAfterAceAction'],
      always: [{ target: 'checking_player_aces' }],
    },
    after_action: {
      always: [
        // Velvet Duel: one alternation tick per player action — and only while
        // the dealer is still interleaving (< 17). pendingDealerDraw guards
        // against re-firing within the same player turn.
        {
          guard: ({ context }) => context.dealerInterleaving && context.pendingDealerDraw,
          actions: ['dealerInterleaveDraw'],
          target: 'after_action',
          reenter: true,
        },
        { guard: 'allHandsResolved', target: 'dealer_check' },
        { actions: ['advanceToNextHand'], target: 'player_action' },
      ],
    },
    dealer_check: {
      // Ensure the hole is face-up before the dealer's finishing draws or
      // settling — covers paths where alternation never fired (e.g. player
      // stood on their first action without hitting).
      entry: ['revealHoleCard'],
      always: [
        { guard: 'allHandsBust', target: 'settling' },
        // If the dealer already finished interleaving (≥17), no further draws.
        {
          guard: ({ context }) => !dealerShouldHit(context.dealerCards),
          target: 'settling',
        },
        { target: 'dealer_action' },
      ],
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
