import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { slotsMachine } from './machine';

function startMachine() {
  const actor = createActor(slotsMachine);
  actor.start();
  return actor;
}

describe('slotsMachine — initial state', () => {
  it('starts in betting with bet=0, betHandleId="", spinResult=null', () => {
    const a = startMachine();
    expect(a.getSnapshot().value).toBe('betting');
    expect(a.getSnapshot().context.bet).toBe(0);
    expect(a.getSnapshot().context.betHandleId).toBe('');
    expect(a.getSnapshot().context.spinResult).toBeNull();
    expect(a.getSnapshot().context.roundResult).toBeNull();
  });
});

describe('slotsMachine — PLACE_BET', () => {
  it('stores bet + handle in context', () => {
    const a = startMachine();
    a.send({ type: 'PLACE_BET', bet: 25, betHandleId: 'h1' });
    expect(a.getSnapshot().context.bet).toBe(25);
    expect(a.getSnapshot().context.betHandleId).toBe('h1');
  });

  it('latest PLACE_BET overwrites earlier one', () => {
    const a = startMachine();
    a.send({ type: 'PLACE_BET', bet: 25, betHandleId: 'h1' });
    a.send({ type: 'PLACE_BET', bet: 100, betHandleId: 'h2' });
    expect(a.getSnapshot().context.bet).toBe(100);
    expect(a.getSnapshot().context.betHandleId).toBe('h2');
  });
});

describe('slotsMachine — SPIN gate', () => {
  it('SPIN is rejected when bet < MIN_BET', () => {
    const a = startMachine();
    a.send({ type: 'SPIN' });
    expect(a.getSnapshot().value).toBe('betting');
  });

  it('SPIN transitions to spinning when bet >= MIN_BET', () => {
    const a = startMachine();
    a.send({ type: 'PLACE_BET', bet: 5, betHandleId: 'h' });
    a.send({ type: 'SPIN' });
    expect(a.getSnapshot().value).toBe('spinning');
    expect(a.getSnapshot().context.spinResult).not.toBeNull();
    expect(a.getSnapshot().context.spinResult?.reels).toHaveLength(3);
  });
});
