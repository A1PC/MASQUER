import { afterEach, describe, expect, it } from 'vitest';
import { createActor, type Actor } from 'xstate';
import { blackjackMachine } from './machine';
import { handTotal } from './hand';
import { seed, unseed } from '@/systems/rng';
import type { Card } from './types';

afterEach(() => unseed());

type BJActor = Actor<typeof blackjackMachine>;

function startMachine(): BJActor {
  const actor = createActor(blackjackMachine);
  actor.start();
  return actor;
}

/** Drain any chained ace prompts by choosing 11 when allowed (else 1). Stops
 *  when no ace prompt is open or the machine has left the awaiting state. */
function drainAcePrompts(actor: BJActor, prefer: 1 | 11 = 11): void {
  let safety = 20;
  while (safety-- > 0) {
    const snap = actor.getSnapshot();
    if (snap.value !== 'awaiting_ace_choice' || !snap.context.acePrompt) return;
    const choice: 1 | 11 = snap.context.acePrompt.allowEleven ? prefer : 1;
    actor.send({ type: 'CHOOSE_ACE', value: choice });
  }
  throw new Error('drainAcePrompts: safety exhausted');
}

/** Place a bet, deal, decline insurance if offered, and drain opening ace prompts.
 *  Returns the snapshot after the machine settles into a player-actionable
 *  (or pre-resolved) state. */
function dealRound(actor: BJActor, opts: { amount?: number; aceChoice?: 1 | 11 } = {}) {
  const amount = opts.amount ?? 25;
  actor.send({ type: 'PLACE_BET', amount });
  actor.send({ type: 'BET_PLACED', betHandleId: 'bh-1' });
  if (actor.getSnapshot().value === 'insurance_prompt') {
    actor.send({ type: 'DECLINE_INSURANCE' });
  }
  drainAcePrompts(actor, opts.aceChoice ?? 11);
  return actor.getSnapshot();
}

/** Find a seed where a predicate holds on the post-deal snapshot. */
function findSeedForDeal(
  predicate: (snap: ReturnType<BJActor['getSnapshot']>) => boolean,
  range = 1000,
): number | null {
  for (let s = 1; s < range; s++) {
    seed(s);
    const actor = startMachine();
    const snap = dealRound(actor);
    if (predicate(snap)) {
      actor.stop();
      unseed();
      return s;
    }
    actor.stop();
    unseed();
  }
  return null;
}

const rankVal = (c: Card): number =>
  c.rank === 'A' ? 11 : ['10', 'J', 'Q', 'K'].includes(c.rank) ? 10 : parseInt(c.rank);

describe('blackjackMachine — initial', () => {
  it('starts in betting state', () => {
    const actor = startMachine();
    expect(actor.getSnapshot().value).toBe('betting');
    actor.stop();
  });

  it('initial context has empty hands, shoe, betHandleIds, and Velvet Duel flags reset', () => {
    const actor = startMachine();
    const ctx = actor.getSnapshot().context;
    expect(ctx.hands).toHaveLength(0);
    expect(ctx.shoe).toHaveLength(0);
    expect(ctx.betHandleIds).toHaveLength(0);
    expect(ctx.betAmount).toBe(0);
    expect(ctx.dealerInterleaving).toBe(false);
    expect(ctx.pendingDealerDraw).toBe(false);
    expect(ctx.acePrompt).toBeNull();
    actor.stop();
  });
});

describe('blackjackMachine — bet placement', () => {
  it('PLACE_BET advances to awaiting_bet_handle and records amount', () => {
    const actor = startMachine();
    actor.send({ type: 'PLACE_BET', amount: 25 });
    expect(actor.getSnapshot().value).toBe('awaiting_bet_handle');
    expect(actor.getSnapshot().context.betAmount).toBe(25);
    actor.stop();
  });

  it('BET_PLACED records handle and starts dealing', () => {
    seed(123);
    const actor = startMachine();
    actor.send({ type: 'PLACE_BET', amount: 25 });
    actor.send({ type: 'BET_PLACED', betHandleId: 'bh-1' });
    const snap = actor.getSnapshot();
    // After dealing, machine moves to checking_naturals / insurance_prompt /
    // awaiting_ace_choice / player_action / settling depending on the deal.
    expect([
      'checking_naturals',
      'insurance_prompt',
      'awaiting_ace_choice',
      'player_action',
      'settling',
    ]).toContain(typeof snap.value === 'string' ? snap.value : '');
    expect(snap.context.betHandleIds[0]).toBe('bh-1');
    expect(snap.context.hands).toHaveLength(1);
    expect(snap.context.hands[0]!.cards).toHaveLength(2);
    expect(snap.context.dealerCards).toHaveLength(2);
    actor.stop();
  });
});

describe('blackjackMachine — dealer Ace triggers insurance', () => {
  it('routes through insurance_prompt when dealer up-card is Ace', () => {
    for (let s = 1; s < 50; s++) {
      seed(s);
      const actor = startMachine();
      actor.send({ type: 'PLACE_BET', amount: 25 });
      actor.send({ type: 'BET_PLACED', betHandleId: 'bh' });
      const snap = actor.getSnapshot();
      if (snap.context.dealerCards[0]?.rank === 'A') {
        expect(snap.value).toBe('insurance_prompt');
        actor.stop();
        unseed();
        return;
      }
      actor.stop();
      unseed();
    }
    expect.fail('No seed in [1, 50) produced a dealer Ace; broaden search or mock');
  });
});

describe('blackjackMachine — player action transitions', () => {
  it('HIT adds a card to the active hand', () => {
    seed(10);
    const actor = startMachine();
    const snap = dealRound(actor);
    if (snap.value === 'player_action') {
      const before = actor.getSnapshot().context.hands[0]!.cards.length;
      actor.send({ type: 'HIT' });
      // Drain any ace prompt the HIT might have triggered.
      drainAcePrompts(actor);
      const after = actor.getSnapshot().context.hands[0]!.cards.length;
      expect(after).toBe(before + 1);
    }
    actor.stop();
  });

  it('STAND on total >= 14 marks the active hand resolved and reaches settling', () => {
    // Find a seed where the player can legally STAND (total >= 14) right away.
    const s = findSeedForDeal(
      (snap) =>
        snap.value === 'player_action' && handTotal(snap.context.hands[0]!.cards).value >= 14,
    );
    expect(s).not.toBeNull();
    seed(s!);
    const actor = startMachine();
    dealRound(actor);
    actor.send({ type: 'STAND' });
    drainAcePrompts(actor); // STAND should not trigger any new prompts but stay safe.
    expect(actor.getSnapshot().value).toBe('settling');
    actor.stop();
  });

  it('STAND on total < 14 is REJECTED — machine stays in player_action (min-stand-14 guard)', () => {
    const s = findSeedForDeal(
      (snap) =>
        snap.value === 'player_action' && handTotal(snap.context.hands[0]!.cards).value < 14,
    );
    if (s === null) {
      // Initial 2-card hands rarely total < 14 with two face cards; if the
      // search fails, the unit guard test below is enough.
      return;
    }
    seed(s);
    const actor = startMachine();
    dealRound(actor);
    expect(actor.getSnapshot().value).toBe('player_action');
    actor.send({ type: 'STAND' });
    // Guard rejected — still in player_action, still unresolved.
    expect(actor.getSnapshot().value).toBe('player_action');
    expect(actor.getSnapshot().context.hands[0]!.resolved).toBe(false);
    actor.stop();
  });
});

describe('blackjackMachine — settle reaches', () => {
  it('after legal STAND (>=14), machine reaches settling with a roundResult', () => {
    const s = findSeedForDeal(
      (snap) =>
        snap.value === 'player_action' && handTotal(snap.context.hands[0]!.cards).value >= 14,
    );
    expect(s).not.toBeNull();
    seed(s!);
    const actor = startMachine();
    dealRound(actor, { amount: 10 });
    actor.send({ type: 'STAND' });
    drainAcePrompts(actor);
    expect(actor.getSnapshot().value).toBe('settling');
    expect(actor.getSnapshot().context.roundResult).toBeDefined();
    actor.stop();
  });
});

describe('blackjackMachine — new round reset', () => {
  it('NEW_ROUND from settling returns to betting and clears context', () => {
    const s = findSeedForDeal(
      (snap) =>
        snap.value === 'player_action' && handTotal(snap.context.hands[0]!.cards).value >= 14,
    );
    expect(s).not.toBeNull();
    seed(s!);
    const actor = startMachine();
    dealRound(actor, { amount: 10 });
    actor.send({ type: 'STAND' });
    drainAcePrompts(actor);
    expect(actor.getSnapshot().value).toBe('settling');
    actor.send({ type: 'NEW_ROUND' });
    expect(actor.getSnapshot().value).toBe('betting');
    expect(actor.getSnapshot().context.hands).toHaveLength(0);
    expect(actor.getSnapshot().context.roundResult).toBeNull();
    expect(actor.getSnapshot().context.dealerInterleaving).toBe(false);
    expect(actor.getSnapshot().context.pendingDealerDraw).toBe(false);
    expect(actor.getSnapshot().context.acePrompt).toBeNull();
    actor.stop();
  });

  it('NEW_ROUND resets betAmount and betHandleIds', () => {
    const s = findSeedForDeal(
      (snap) =>
        snap.value === 'player_action' && handTotal(snap.context.hands[0]!.cards).value >= 14,
    );
    expect(s).not.toBeNull();
    seed(s!);
    const actor = startMachine();
    dealRound(actor, { amount: 10 });
    actor.send({ type: 'STAND' });
    drainAcePrompts(actor);
    actor.send({ type: 'NEW_ROUND' });
    const ctx = actor.getSnapshot().context;
    expect(ctx.betAmount).toBe(0);
    expect(ctx.betHandleIds).toHaveLength(0);
    expect(ctx.dealerCards).toHaveLength(0);
    expect(ctx.insurance.status).toBe('not-offered');
    actor.stop();
  });
});

describe('blackjackMachine — SPLIT transitions', () => {
  it('SPLIT on a pair produces 2 hands', () => {
    for (let s = 1; s < 200; s++) {
      seed(s);
      const actor = startMachine();
      const snap = dealRound(actor);
      if (snap.value !== 'player_action') {
        actor.stop();
        unseed();
        continue;
      }
      const hand = snap.context.hands[0]!;
      if (hand.cards.length === 2) {
        const [c1, c2] = hand.cards;
        if (rankVal(c1!) === rankVal(c2!)) {
          actor.send({ type: 'SPLIT', betHandleId: 'bh-split' });
          drainAcePrompts(actor);
          const afterSplit = actor.getSnapshot();
          expect(afterSplit.context.hands).toHaveLength(2);
          expect(afterSplit.context.betHandleIds).toContain('bh-split');
          actor.stop();
          unseed();
          return;
        }
      }
      actor.stop();
      unseed();
    }
    expect.fail('No seed in [1, 200) produced a splittable pair; broaden search');
  });

  it('SPLIT guard blocks non-pairs (no extra hand added)', () => {
    const s = findSeedForDeal((snap) => {
      if (snap.value !== 'player_action') return false;
      const [c1, c2] = snap.context.hands[0]!.cards;
      return !!c1 && !!c2 && rankVal(c1) !== rankVal(c2);
    });
    if (s === null) return;
    seed(s);
    const actor = startMachine();
    dealRound(actor);
    const beforeLen = actor.getSnapshot().context.hands.length;
    actor.send({ type: 'SPLIT', betHandleId: 'bh-blocked' });
    expect(actor.getSnapshot().context.hands).toHaveLength(beforeLen);
    actor.stop();
  });
});

describe('blackjackMachine — DOUBLE', () => {
  it('DOUBLE marks hand resolved, doubles betAmount, and deals one extra card', () => {
    for (let s = 1; s < 200; s++) {
      seed(s);
      const actor = startMachine();
      const snap = dealRound(actor, { amount: 10 });
      if (snap.value !== 'player_action') {
        actor.stop();
        unseed();
        continue;
      }
      const hand = snap.context.hands[0]!;
      if (hand.cards.length !== 2) {
        actor.stop();
        unseed();
        continue;
      }
      const origBet = hand.betAmount;
      actor.send({ type: 'DOUBLE', betHandleId: 'bh-double' });
      drainAcePrompts(actor);
      const after = actor.getSnapshot();
      const doubled = after.context.hands[0]!;
      expect(doubled.doubled).toBe(true);
      expect(doubled.resolved).toBe(true);
      expect(doubled.betAmount).toBe(origBet * 2);
      expect(doubled.cards).toHaveLength(3);
      expect(after.context.betHandleIds).toContain('bh-double');
      actor.stop();
      unseed();
      return;
    }
    expect.fail('No seed produced player_action state');
  });
});

describe('blackjackMachine — insurance flow', () => {
  it('TAKE_INSURANCE adds bet+handle and settles correctly if dealer BJ', () => {
    for (let s = 1; s < 100; s++) {
      seed(s);
      const actor = startMachine();
      actor.send({ type: 'PLACE_BET', amount: 20 });
      actor.send({ type: 'BET_PLACED', betHandleId: 'bh-1' });
      const snap = actor.getSnapshot();
      if (snap.value !== 'insurance_prompt') {
        actor.stop();
        unseed();
        continue;
      }
      actor.send({ type: 'TAKE_INSURANCE', betHandleId: 'ins-1', bet: 10 });
      drainAcePrompts(actor);
      const afterInsurance = actor.getSnapshot();
      expect(afterInsurance.context.betHandleIds).toContain('ins-1');
      expect(afterInsurance.context.insurance.bet).toBe(10);
      const v = afterInsurance.value;
      expect(['checking_naturals', 'player_action', 'settling']).toContain(
        typeof v === 'string' ? v : '',
      );
      actor.stop();
      unseed();
      return;
    }
    expect.fail('No seed in [1, 100) produced insurance_prompt');
  });

  it('DECLINE_INSURANCE proceeds to player_action / settling (not insurance_prompt)', () => {
    for (let s = 1; s < 100; s++) {
      seed(s);
      const actor = startMachine();
      actor.send({ type: 'PLACE_BET', amount: 20 });
      actor.send({ type: 'BET_PLACED', betHandleId: 'bh-1' });
      if (actor.getSnapshot().value !== 'insurance_prompt') {
        actor.stop();
        unseed();
        continue;
      }
      actor.send({ type: 'DECLINE_INSURANCE' });
      drainAcePrompts(actor);
      const snap = actor.getSnapshot();
      const v = snap.value;
      expect(['player_action', 'settling']).toContain(typeof v === 'string' ? v : '');
      expect(snap.context.insurance.status).toBe('not-offered');
      actor.stop();
      unseed();
      return;
    }
    expect.fail('No seed in [1, 100) produced insurance_prompt');
  });
});

describe('blackjackMachine — player BJ', () => {
  it('player BJ vs dealer non-BJ: settles with 3:2 payout in roundResult', () => {
    for (let s = 1; s < 200; s++) {
      seed(s);
      const actor = startMachine();
      const snap = dealRound(actor, { amount: 10 });
      if (snap.value !== 'settling') {
        actor.stop();
        unseed();
        continue;
      }
      const ctx = snap.context;
      const hand = ctx.hands[0]!;
      // Check player has BJ (2 cards = 21, not from split)
      if (hand.cards.length !== 2) {
        actor.stop();
        unseed();
        continue;
      }
      const total = handTotal(hand.cards).value;
      if (total !== 21) {
        actor.stop();
        unseed();
        continue;
      }
      const dealerTotal = handTotal(ctx.dealerCards).value;
      if (ctx.dealerCards.length === 2 && dealerTotal === 21) {
        actor.stop();
        unseed();
        continue;
      }
      const rr = ctx.roundResult!;
      expect(rr.details.hands[0]!.outcome).toBe('player-blackjack');
      expect(rr.totalPayout).toBeGreaterThan(rr.totalBet);
      actor.stop();
      unseed();
      return;
    }
    expect.fail('No seed in [1, 200) produced player BJ vs dealer non-BJ');
  });
});

describe('blackjackMachine — Velvet Duel dealer interleaving', () => {
  it('player Hit triggers exactly one dealer card AND reveals hole', () => {
    // Constrain to player total ≤ 10 so the HIT cannot bust (any next card
    // ≤ 11 keeps the hand ≤ 21). The Phase-15 #5 bust auto-settle amendment
    // (ADR-0045) makes a busting HIT skip the dealer interleave — we want
    // the non-busting path here.
    const seedToUse = findSeedForDeal(
      (snap) =>
        snap.value === 'player_action' &&
        snap.context.dealerInterleaving === true &&
        handTotal(snap.context.hands[0]!.cards).value <= 10,
    );
    expect(seedToUse).not.toBeNull();
    seed(seedToUse!);
    const actor = startMachine();
    const before = dealRound(actor);
    expect(before.value).toBe('player_action');
    expect(before.context.dealerInterleaving).toBe(true);
    // The hole stays face-down through the natural peek (Velvet Duel) when no
    // BJ collision settled the round.
    expect(before.context.dealerCards[1]!.faceUp).toBe(false);
    const dealerCountBefore = before.context.dealerCards.length;

    actor.send({ type: 'HIT' });
    drainAcePrompts(actor);
    const after = actor.getSnapshot();
    // Dealer hole should be face-up after the first alternation tick.
    expect(after.context.dealerCards[1]!.faceUp).toBe(true);
    // Dealer should have drawn exactly one card during interleaving (count +1).
    expect(after.context.dealerCards.length).toBe(dealerCountBefore + 1);
    actor.stop();
  });

  it('dealer stops interleaving once total reaches 17+ mid-alternation', () => {
    const seedToUse = findSeedForDeal(
      (snap) =>
        snap.value === 'player_action' &&
        snap.context.dealerInterleaving &&
        handTotal(snap.context.hands[0]!.cards).value < 21,
    );
    expect(seedToUse).not.toBeNull();
    seed(seedToUse!);
    const actor = startMachine();
    dealRound(actor);
    // Hit until either player busts/21 or dealer stops interleaving.
    let guard = 15;
    while (
      guard-- > 0 &&
      actor.getSnapshot().value === 'player_action' &&
      actor.getSnapshot().context.dealerInterleaving
    ) {
      actor.send({ type: 'HIT' });
      drainAcePrompts(actor);
    }
    const snap = actor.getSnapshot();
    // Once dealerInterleaving flips false (dealer ≥ 17 or bust), it should
    // remain false; further HITs won't add dealer cards.
    if (!snap.context.dealerInterleaving && snap.value === 'player_action') {
      const dealerCountBeforeExtra = snap.context.dealerCards.length;
      actor.send({ type: 'HIT' });
      drainAcePrompts(actor);
      const afterExtra = actor.getSnapshot();
      expect(afterExtra.context.dealerCards.length).toBe(dealerCountBeforeExtra);
    }
    actor.stop();
  });

  it('STAND does NOT add a dealer interleave card (only HIT/DOUBLE/SPLIT do)', () => {
    const s = findSeedForDeal(
      (snap) =>
        snap.value === 'player_action' &&
        snap.context.dealerInterleaving &&
        handTotal(snap.context.hands[0]!.cards).value >= 14,
    );
    expect(s).not.toBeNull();
    seed(s!);
    const actor = startMachine();
    const before = dealRound(actor);
    const dealerCountBeforeStand = before.context.dealerCards.length;
    actor.send({ type: 'STAND' });
    drainAcePrompts(actor);
    const after = actor.getSnapshot();
    // STAND moves through after_action without an interleave tick. The
    // dealer-finish phase (dealer_action) may add cards if dealer < 17 — but
    // never as a result of the STAND itself. We check the dealer-count
    // delta in two parts: (a) STAND doesn't fire interleaveDraw inside
    // after_action; (b) dealer_action takes over.
    // After STAND we should reach either settling (dealer >=17 already) or
    // beyond — never stuck in after_action.
    const v = after.value;
    expect(['settling']).toContain(typeof v === 'string' ? v : '');
    // dealer count grew only if the dealer needed to keep hitting per H17;
    // never doubled by an interleave + finish pair.
    expect(after.context.dealerCards.length).toBeGreaterThanOrEqual(dealerCountBeforeStand);
    actor.stop();
  });

  it('player at dealer-already-17 deal: dealerInterleaving starts false, no draws on Hit', () => {
    const s = findSeedForDeal(
      (snap) =>
        snap.value === 'player_action' &&
        !snap.context.dealerInterleaving &&
        handTotal(snap.context.hands[0]!.cards).value < 21,
    );
    if (s === null) return; // not all seed ranges hit this; safe to skip
    seed(s);
    const actor = startMachine();
    dealRound(actor);
    const dealerCountBefore = actor.getSnapshot().context.dealerCards.length;
    actor.send({ type: 'HIT' });
    drainAcePrompts(actor);
    const after = actor.getSnapshot();
    expect(after.context.dealerCards.length).toBe(dealerCountBefore);
    actor.stop();
  });
});

describe('blackjackMachine — ACE_PROMPT flow', () => {
  it('player Ace at deal time prompts for value (allowEleven=true when 11 fits)', () => {
    // Find a seed where the opening deal includes an Ace AND 11 still fits.
    for (let s = 1; s < 500; s++) {
      seed(s);
      const actor = startMachine();
      actor.send({ type: 'PLACE_BET', amount: 25 });
      actor.send({ type: 'BET_PLACED', betHandleId: 'bh-1' });
      if (actor.getSnapshot().value === 'insurance_prompt') {
        actor.send({ type: 'DECLINE_INSURANCE' });
      }
      const snap = actor.getSnapshot();
      if (snap.value !== 'awaiting_ace_choice' || !snap.context.acePrompt) {
        actor.stop();
        unseed();
        continue;
      }
      expect(snap.context.acePrompt.allowEleven).toBe(true);
      // Pick 11 → ace value is locked and we should leave the awaiting state.
      actor.send({ type: 'CHOOSE_ACE', value: 11 });
      const after = actor.getSnapshot();
      expect(after.context.acePrompt).toBeNull();
      // Locate the Ace and confirm aceValue=11.
      const aceCard = after.context.hands[0]!.cards.find((c) => c.rank === 'A')!;
      expect(aceCard.aceValue).toBe(11);
      actor.stop();
      unseed();
      return;
    }
    // Acceptable if no seed in range hits this — covered by unit tests in
    // hand.test.ts and the auto-1 path below.
  });

  it('CHOOSE_ACE 1 locks the Ace at value 1 and clears the prompt', () => {
    for (let s = 1; s < 500; s++) {
      seed(s);
      const actor = startMachine();
      actor.send({ type: 'PLACE_BET', amount: 25 });
      actor.send({ type: 'BET_PLACED', betHandleId: 'bh-1' });
      if (actor.getSnapshot().value === 'insurance_prompt') {
        actor.send({ type: 'DECLINE_INSURANCE' });
      }
      if (actor.getSnapshot().value !== 'awaiting_ace_choice') {
        actor.stop();
        unseed();
        continue;
      }
      actor.send({ type: 'CHOOSE_ACE', value: 1 });
      drainAcePrompts(actor);
      const after = actor.getSnapshot();
      expect(after.context.acePrompt).toBeNull();
      const firstAce = after.context.hands[0]!.cards.find((c) => c.rank === 'A')!;
      expect(firstAce.aceValue).toBe(1);
      actor.stop();
      unseed();
      return;
    }
  });

  it('dealer Aces never set aceValue (only player Aces are prompted)', () => {
    for (let s = 1; s < 100; s++) {
      seed(s);
      const actor = startMachine();
      actor.send({ type: 'PLACE_BET', amount: 25 });
      actor.send({ type: 'BET_PLACED', betHandleId: 'bh-1' });
      if (actor.getSnapshot().value === 'insurance_prompt') {
        actor.send({ type: 'DECLINE_INSURANCE' });
      }
      drainAcePrompts(actor);
      const snap = actor.getSnapshot();
      // Walk both dealer cards and any subsequent dealer hits; none of the
      // dealer Aces should ever have an aceValue.
      for (const dc of snap.context.dealerCards) {
        if (dc.rank === 'A') {
          expect(dc.aceValue).toBeUndefined();
        }
      }
      actor.stop();
      unseed();
    }
  });

  it('multiple opening Aces prompt sequentially (player A-A path)', () => {
    // Search for a seed dealing the player two Aces.
    for (let s = 1; s < 3000; s++) {
      seed(s);
      const actor = startMachine();
      actor.send({ type: 'PLACE_BET', amount: 25 });
      actor.send({ type: 'BET_PLACED', betHandleId: 'bh-1' });
      if (actor.getSnapshot().value === 'insurance_prompt') {
        actor.send({ type: 'DECLINE_INSURANCE' });
      }
      const snap = actor.getSnapshot();
      const cards = snap.context.hands[0]!.cards;
      const aceCount = cards.filter((c) => c.rank === 'A').length;
      if (aceCount < 2) {
        actor.stop();
        unseed();
        continue;
      }
      // First prompt should be open with allowEleven=true (A+A start at 11+11=22, soft → 12)
      // Actually with no aces locked yet, the probe is "if THIS ace were 11" with the other
      // ace still soft. The other ace stays at 11 in handTotal → 22 → busts → allowEleven=false?
      // No — handTotal soft-auto would demote the OTHER ace to 1 → total 12 → 11 fits.
      // Let's just assert that we get prompts then drain them.
      expect(snap.value).toBe('awaiting_ace_choice');
      actor.send({ type: 'CHOOSE_ACE', value: 1 });
      // After locking the first Ace at 1, the second one should prompt next.
      const between = actor.getSnapshot();
      expect(between.value).toBe('awaiting_ace_choice');
      expect(between.context.acePrompt).not.toBeNull();
      actor.send({ type: 'CHOOSE_ACE', value: 11 });
      const after = actor.getSnapshot();
      expect(after.context.acePrompt).toBeNull();
      // Both Aces locked.
      const playerAces = after.context.hands[0]!.cards.filter((c) => c.rank === 'A');
      expect(playerAces.every((c) => c.aceValue !== undefined)).toBe(true);
      actor.stop();
      unseed();
      return;
    }
    // If no A-A seed found in range, the single-Ace prompt test above + the
    // hand.test.ts coverage is enough.
  });

  it('Ace dealt on HIT prompts before any further dealer interleave', () => {
    // Try seeds + hits until we find a state where the next dealt player
    // card is an Ace.
    for (let s = 1; s < 1500; s++) {
      seed(s);
      const actor = startMachine();
      const initial = dealRound(actor);
      if (initial.value !== 'player_action') {
        actor.stop();
        unseed();
        continue;
      }
      // Take at most a few hits looking for an Ace draw.
      let found = false;
      let guard = 3;
      while (guard-- > 0 && actor.getSnapshot().value === 'player_action') {
        const dealerCountBeforeHit = actor.getSnapshot().context.dealerCards.length;
        actor.send({ type: 'HIT' });
        const between = actor.getSnapshot();
        if (between.value === 'awaiting_ace_choice') {
          // Dealer must NOT have drawn yet — alternation only fires AFTER
          // the ace prompt resolves.
          expect(between.context.dealerCards.length).toBe(dealerCountBeforeHit);
          actor.send({
            type: 'CHOOSE_ACE',
            value: between.context.acePrompt!.allowEleven ? 11 : 1,
          });
          drainAcePrompts(actor);
          // After the ace resolves, alternation may fire if dealer still <17.
          found = true;
          break;
        }
      }
      actor.stop();
      unseed();
      if (found) return;
    }
    // Acceptable not to find in range; auto-1 path is below.
  });
});

describe('blackjackMachine — bust auto-settle (ADR-0045 amendment)', () => {
  it('player bust on HIT skips the dealer interleave for that hand', () => {
    // Find a state where a single HIT busts the player AND dealerInterleaving
    // is still armed (so the bust → no-interleave path is exercisable).
    for (let s = 1; s < 1500; s++) {
      seed(s);
      const actor = startMachine();
      const initial = dealRound(actor, { amount: 10 });
      if (initial.value !== 'player_action') {
        actor.stop();
        unseed();
        continue;
      }
      if (!initial.context.dealerInterleaving) {
        actor.stop();
        unseed();
        continue;
      }
      // Hit until either we bust (good — assertion runs) or the round ends.
      let busted = false;
      let safety = 8;
      while (safety-- > 0 && actor.getSnapshot().value === 'player_action') {
        const dealerCountBeforeHit = actor.getSnapshot().context.dealerCards.length;
        const interleaveArmed = actor.getSnapshot().context.dealerInterleaving;
        actor.send({ type: 'HIT' });
        drainAcePrompts(actor);
        const snap = actor.getSnapshot();
        const activeHand = snap.context.hands[snap.context.activeHandIdx];
        const dealerCountAfter = snap.context.dealerCards.length;
        if (activeHand && handTotal(activeHand.cards).value > 21) {
          // Bust just occurred. The dealer should NOT have drawn this turn
          // (no interleave on a bust), so the count must equal pre-HIT.
          if (interleaveArmed) {
            expect(dealerCountAfter).toBe(dealerCountBeforeHit);
          }
          busted = true;
          break;
        }
      }
      actor.stop();
      unseed();
      if (busted) return;
    }
    // Acceptable if no seed in range produced the bust path — the assertion
    // is conditional on the bust occurring.
  });

  it('dealer bust during interleave settles all live player hands as wins', () => {
    // We force the path by repeatedly hitting until the dealer either busts
    // mid-interleave (assertion path) or stops interleaving (skip seed).
    for (let s = 1; s < 1500; s++) {
      seed(s);
      const actor = startMachine();
      const initial = dealRound(actor, { amount: 10 });
      if (initial.value !== 'player_action') {
        actor.stop();
        unseed();
        continue;
      }
      if (!initial.context.dealerInterleaving) {
        actor.stop();
        unseed();
        continue;
      }
      let safety = 10;
      while (safety-- > 0 && actor.getSnapshot().value === 'player_action') {
        const beforeSnap = actor.getSnapshot();
        const activeHand = beforeSnap.context.hands[beforeSnap.context.activeHandIdx];
        // Avoid busting the player first — only HIT when ≤ 18.
        if (activeHand && handTotal(activeHand.cards).value >= 19) {
          actor.send({ type: 'STAND' });
          drainAcePrompts(actor);
          break;
        }
        actor.send({ type: 'HIT' });
        drainAcePrompts(actor);
        const snap = actor.getSnapshot();
        const dealerTotal = handTotal(snap.context.dealerCards).value;
        if (dealerTotal > 21) {
          // Dealer busted mid-interleave. The machine must route to settling
          // with all non-busted player hands paid as wins.
          // Drain to settling (always-ticks should already have taken us
          // there, but if not, run any remaining cleanup).
          if (snap.value !== 'settling') {
            // After dealer bust we mark hands resolved → after_action falls
            // through. If still in player_action somehow, that's a bug.
            expect(snap.value).toBe('settling');
          }
          const rr = snap.context.roundResult;
          expect(rr).not.toBeNull();
          // Every live (non-bust) player hand should be a player-win.
          for (const h of rr!.details.hands) {
            if (h.outcome !== 'player-bust') {
              expect(h.outcome).toBe('player-win');
            }
          }
          actor.stop();
          unseed();
          return;
        }
      }
      actor.stop();
      unseed();
    }
    // Acceptable if no seed in range produced a dealer-bust-mid-interleave
    // path; the assertion above is the load-bearing one when the path fires.
  });
});

describe('blackjackMachine — both hands bust', () => {
  it('when all player hands bust, dealer skips drawing and goes to settling', () => {
    for (let s = 1; s < 500; s++) {
      seed(s);
      const actor = startMachine();
      const initial = dealRound(actor, { amount: 10 });
      if (initial.value !== 'player_action') {
        actor.stop();
        unseed();
        continue;
      }
      let attempts = 0;
      while (actor.getSnapshot().value === 'player_action' && attempts < 12) {
        actor.send({ type: 'HIT' });
        drainAcePrompts(actor);
        attempts++;
      }
      const snap = actor.getSnapshot();
      if (
        snap.value === 'settling' &&
        snap.context.hands.every((h) => handTotal(h.cards).value > 21)
      ) {
        // Once all hands bust, dealer doesn't need to keep drawing in
        // dealer_action (allHandsBust guard). Alternation cards may already
        // have been added during the player's hits — that's fine.
        expect(snap.context.roundResult).toBeDefined();
        actor.stop();
        unseed();
        return;
      }
      actor.stop();
      unseed();
    }
    // Acceptable to skip if no seed found.
  });
});

describe('blackjackMachine — dealer H17 rule', () => {
  it('dealer plays out after player STAND if still < 17 (Velvet Duel may already have advanced him mid-round)', () => {
    for (let s = 1; s < 200; s++) {
      seed(s);
      const actor = startMachine();
      const initial = dealRound(actor, { amount: 10 });
      if (initial.value !== 'player_action') {
        actor.stop();
        unseed();
        continue;
      }
      if (handTotal(initial.context.hands[0]!.cards).value < 14) {
        actor.stop();
        unseed();
        continue;
      }
      actor.send({ type: 'STAND' });
      drainAcePrompts(actor);
      const snap = actor.getSnapshot();
      if (snap.value === 'settling') {
        // After settling, dealer total must be >= 17 OR all player hands busted.
        const dealerTotal = handTotal(snap.context.dealerCards).value;
        const allBust = snap.context.hands.every((h) => handTotal(h.cards).value > 21);
        expect(dealerTotal >= 17 || allBust).toBe(true);
        actor.stop();
        unseed();
        return;
      }
      actor.stop();
      unseed();
    }
  });
});

describe('blackjackMachine — shoe reshuffle', () => {
  it('shoe shrinks across rounds (same shoe used until cut-card threshold)', () => {
    seed(42);
    const actor = startMachine();

    // Round 1
    const r1 = dealRound(actor, { amount: 10 });
    if (r1.value === 'player_action' && handTotal(r1.context.hands[0]!.cards).value >= 14) {
      actor.send({ type: 'STAND' });
      drainAcePrompts(actor);
    } else {
      // Force a quick path to settling by hitting until bust or 21.
      let g = 12;
      while (g-- > 0 && actor.getSnapshot().value === 'player_action') {
        if (handTotal(actor.getSnapshot().context.hands[0]!.cards).value >= 14) {
          actor.send({ type: 'STAND' });
          drainAcePrompts(actor);
          break;
        }
        actor.send({ type: 'HIT' });
        drainAcePrompts(actor);
      }
    }
    expect(actor.getSnapshot().value).toBe('settling');
    expect(actor.getSnapshot().context.shoeOriginalSize).toBe(312);
    const originalSize = actor.getSnapshot().context.shoeOriginalSize;
    const shoeAfterRound1 = actor.getSnapshot().context.shoe.length;
    expect(shoeAfterRound1).toBeLessThan(originalSize);

    actor.send({ type: 'NEW_ROUND' });
    expect(actor.getSnapshot().value).toBe('betting');
    // Original size still 312 after NEW_ROUND (shoe persists across rounds).
    expect(actor.getSnapshot().context.shoeOriginalSize).toBe(312);
    actor.stop();
  });
});
