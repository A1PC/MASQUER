import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { rouletteMachine } from './machine';
import { makeBet } from './bets';
import type { PlacedBet } from './types';

function placed(bet: ReturnType<typeof makeBet>, amount: number, handleId = 'h'): PlacedBet {
  return { ...bet, amount, betHandleId: handleId };
}

function startMachine() {
  const actor = createActor(rouletteMachine);
  actor.start();
  return actor;
}

describe('rouletteMachine — initial state', () => {
  it('starts in betting with no bets', () => {
    const a = startMachine();
    expect(a.getSnapshot().value).toBe('betting');
    expect(a.getSnapshot().context.bets).toEqual([]);
    expect(a.getSnapshot().context.spinResult).toBeNull();
    expect(a.getSnapshot().context.roundResult).toBeNull();
  });
});

describe('rouletteMachine — PLACE_BET', () => {
  it('adds a bet to context', () => {
    const a = startMachine();
    a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'straight', n: 17 }), 5, 'h1') });
    expect(a.getSnapshot().context.bets).toHaveLength(1);
    expect(a.getSnapshot().context.bets[0]).toMatchObject({
      key: 'straight:17',
      amount: 5,
      betHandleId: 'h1',
    });
  });

  it('stacking: second PLACE_BET on same key adds to amount, preserves first handle', () => {
    const a = startMachine();
    a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'straight', n: 17 }), 5, 'h1') });
    a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'straight', n: 17 }), 25, 'h2') });
    const bets = a.getSnapshot().context.bets;
    expect(bets).toHaveLength(1);
    expect(bets[0]).toMatchObject({ amount: 30, betHandleId: 'h1' });
  });

  it('enforces 10-position cap; 11th new position is dropped (stacking always allowed)', () => {
    const a = startMachine();
    for (let n = 1; n <= 10; n++) {
      a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'straight', n }), 5, `h${n}`) });
    }
    expect(a.getSnapshot().context.bets).toHaveLength(10);
    a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'straight', n: 11 }), 5, 'h11') });
    expect(a.getSnapshot().context.bets).toHaveLength(10);

    // Stacking on an existing position still works.
    a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'straight', n: 5 }), 25, 'h-stack') });
    const stacked = a.getSnapshot().context.bets.find((b) => b.key === 'straight:5')!;
    expect(stacked.amount).toBe(30);
  });
});

describe('rouletteMachine — REMOVE_BET and CLEAR_ALL', () => {
  it('REMOVE_BET drops by key', () => {
    const a = startMachine();
    a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'red' }), 5, 'h-red') });
    a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'black' }), 5, 'h-black') });
    a.send({ type: 'REMOVE_BET', key: 'red' });
    expect(a.getSnapshot().context.bets.map((b) => b.key)).toEqual(['black']);
  });

  it('CLEAR_ALL wipes bets', () => {
    const a = startMachine();
    a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'red' }), 5, 'h-red') });
    a.send({ type: 'CLEAR_ALL' });
    expect(a.getSnapshot().context.bets).toEqual([]);
  });
});

describe('rouletteMachine — SPIN gate', () => {
  it('SPIN is rejected when there are no bets', () => {
    const a = startMachine();
    a.send({ type: 'SPIN' });
    expect(a.getSnapshot().value).toBe('betting');
  });

  it('SPIN transitions to spinning when at least one bet exists', () => {
    const a = startMachine();
    a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'red' }), 5, 'h') });
    a.send({ type: 'SPIN' });
    expect(a.getSnapshot().value).toBe('spinning');
    expect(a.getSnapshot().context.spinResult).not.toBeNull();
  });
});
