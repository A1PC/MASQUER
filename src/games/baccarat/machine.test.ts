import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { baccaratMachine } from './machine';
import { seed, unseed } from '@/systems/rng';
import { handTotal } from './logic';

function startMachine(reducedMotion = true) {
  const actor = createActor(baccaratMachine, { input: { reducedMotion } });
  actor.start();
  return actor;
}

beforeEach(() => seed(424242));
afterEach(() => unseed());

describe('baccaratMachine — happy paths', () => {
  it('starts in betting with no bets', () => {
    const actor = startMachine();
    const snap = actor.getSnapshot();
    expect(snap.matches('betting')).toBe(true);
    expect(snap.context.bets.player).toBe(0);
    expect(snap.context.roundCount).toBe(0);
  });

  it('PLACE_CHIP accumulates on a zone', () => {
    const actor = startMachine();
    actor.send({ type: 'PLACE_CHIP', zone: 'player', amount: 25 });
    actor.send({ type: 'PLACE_CHIP', zone: 'player', amount: 50 });
    expect(actor.getSnapshot().context.bets.player).toBe(75);
  });

  it('CLEAR_ZONE zeros a single zone', () => {
    const actor = startMachine();
    actor.send({ type: 'PLACE_CHIP', zone: 'player', amount: 25 });
    actor.send({ type: 'CLEAR_ZONE', zone: 'player' });
    expect(actor.getSnapshot().context.bets.player).toBe(0);
  });

  it('CLEAR_ALL zeros every zone', () => {
    const actor = startMachine();
    actor.send({ type: 'PLACE_CHIP', zone: 'player', amount: 25 });
    actor.send({ type: 'PLACE_CHIP', zone: 'tie', amount: 10 });
    actor.send({ type: 'CLEAR_ALL' });
    const b = actor.getSnapshot().context.bets;
    expect(b.player).toBe(0);
    expect(b.tie).toBe(0);
  });

  it('DEAL with no bets is rejected (hasAnyBet guard)', () => {
    const actor = startMachine();
    actor.send({ type: 'DEAL' });
    expect(actor.getSnapshot().matches('betting')).toBe(true);
  });

  it('DEAL with a bet runs a full round and returns to betting (reducedMotion=true)', async () => {
    const actor = startMachine(true);
    actor.send({ type: 'PLACE_CHIP', zone: 'player', amount: 25 });
    actor.send({ type: 'DEAL' });
    await new Promise((r) => setTimeout(r, 20));
    const snap = actor.getSnapshot();
    expect(snap.matches('betting')).toBe(true);
    expect(snap.context.roundResult).not.toBeNull();
    expect(snap.context.roundCount).toBe(1);
  });

  it('settled round writes a non-null roundResult into context', async () => {
    const actor = startMachine(true);
    actor.send({ type: 'PLACE_CHIP', zone: 'tie', amount: 10 });
    actor.send({ type: 'DEAL' });
    await new Promise((r) => setTimeout(r, 20));
    const r = actor.getSnapshot().context.roundResult;
    expect(r).not.toBeNull();
    expect(['player', 'banker', 'tie']).toContain(r!.winner);
  });

  it('shoe cards count drops by exactly 4–6 per round', async () => {
    const actor = startMachine(true);
    const before = actor.getSnapshot().context.shoe.cards.length;
    actor.send({ type: 'PLACE_CHIP', zone: 'player', amount: 5 });
    actor.send({ type: 'DEAL' });
    await new Promise((r) => setTimeout(r, 20));
    const after = actor.getSnapshot().context.shoe.cards.length;
    const drawn = before - after;
    expect(drawn).toBeGreaterThanOrEqual(4);
    expect(drawn).toBeLessThanOrEqual(6);
  });
});

describe('baccaratMachine — reshuffle on cut card', () => {
  it('marks cutCardPassed once the shoe crosses the cut', async () => {
    const actor = startMachine(true);
    actor.send({ type: 'PLACE_CHIP', zone: 'player', amount: 5 });
    let safety = 200;
    while (!actor.getSnapshot().context.shoe.cutCardPassed && safety-- > 0) {
      actor.send({ type: 'DEAL' });
      await new Promise((r) => setTimeout(r, 5));
      actor.send({ type: 'PLACE_CHIP', zone: 'player', amount: 5 });
    }
    expect(actor.getSnapshot().context.shoe.cutCardPassed).toBe(true);
  });

  it('reshuffles on the NEXT round after cut is crossed and shows freshShoeBanner', async () => {
    const actor = startMachine(true);
    actor.send({ type: 'PLACE_CHIP', zone: 'player', amount: 5 });
    let safety = 200;
    while (!actor.getSnapshot().context.shoe.cutCardPassed && safety-- > 0) {
      actor.send({ type: 'DEAL' });
      await new Promise((r) => setTimeout(r, 5));
      actor.send({ type: 'PLACE_CHIP', zone: 'player', amount: 5 });
    }
    const sizeAfterCutRound = actor.getSnapshot().context.shoe.cards.length;
    expect(sizeAfterCutRound).toBeLessThan(60);
    // Trigger the next round.
    actor.send({ type: 'DEAL' });
    await new Promise((r) => setTimeout(r, 20));
    const snap = actor.getSnapshot();
    expect(snap.context.shoe.initialSize).toBe(416);
    expect(snap.context.shoe.cards.length).toBeGreaterThan(400);
    expect(snap.context.freshShoeBanner).toBe(true);
  });
});

describe('baccaratMachine — natural and third-card paths', () => {
  it('when both 2-card hands are non-natural, totalCards lands on 4, 5, or 6', async () => {
    const actor = startMachine(true);
    actor.send({ type: 'PLACE_CHIP', zone: 'player', amount: 5 });
    actor.send({ type: 'DEAL' });
    await new Promise((r) => setTimeout(r, 20));
    const r = actor.getSnapshot().context.roundResult!;
    expect([4, 5, 6]).toContain(r.totalCards);
  });

  it('when winner is natural, exactly 4 cards are dealt', async () => {
    let foundNatural = false;
    let safety = 200;
    while (!foundNatural && safety-- > 0) {
      const actor = startMachine(true);
      actor.send({ type: 'PLACE_CHIP', zone: 'player', amount: 5 });
      actor.send({ type: 'DEAL' });
      await new Promise((r) => setTimeout(r, 5));
      const r = actor.getSnapshot().context.roundResult!;
      if (r.winnerNatural) {
        expect(r.totalCards).toBe(4);
        foundNatural = true;
      }
    }
    expect(foundNatural).toBe(true);
  });

  it('player 6/7 → player stands → totalCards ∈ {4, 5}', async () => {
    let foundPlayerStand = false;
    let safety = 200;
    while (!foundPlayerStand && safety-- > 0) {
      const actor = startMachine(true);
      actor.send({ type: 'PLACE_CHIP', zone: 'player', amount: 5 });
      actor.send({ type: 'DEAL' });
      await new Promise((r) => setTimeout(r, 5));
      const r = actor.getSnapshot().context.roundResult!;
      const playerInitialTotal = handTotal(r.player.cards.slice(0, 2));
      if ((playerInitialTotal === 6 || playerInitialTotal === 7) && r.player.cards.length === 2) {
        expect([4, 5]).toContain(r.totalCards);
        foundPlayerStand = true;
      }
    }
    expect(foundPlayerStand).toBe(true);
  });
});
