import { describe, expect, it, vi } from 'vitest';
import { createActor } from 'xstate';
import { rouletteMachine } from './machine';
import { makeBet } from './bets';
import type { PlacedBet } from './types';
import { ROULETTE_CONFIG } from './config';
import { seed, unseed } from '@/systems/rng';

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

describe('rouletteMachine — spinning delay → settled', () => {
  it('after SPIN_DURATION_MS, transitions to settled with roundResult populated', async () => {
    vi.useFakeTimers();
    try {
      const a = startMachine();
      a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'red' }), 5, 'h') });
      a.send({ type: 'SPIN' });
      expect(a.getSnapshot().value).toBe('spinning');
      await vi.advanceTimersByTimeAsync(ROULETTE_CONFIG.SPIN_DURATION_MS);
      expect(a.getSnapshot().value).toBe('settled');
      expect(a.getSnapshot().context.roundResult).not.toBeNull();
      expect(a.getSnapshot().context.roundResult!.betAmount).toBe(5);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reduced-motion override (spinDurationMs=0) settles immediately', async () => {
    vi.useFakeTimers();
    try {
      const actor = createActor(rouletteMachine, { input: { spinDurationMs: 0 } });
      actor.start();
      actor.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'red' }), 5, 'h') });
      actor.send({ type: 'SPIN' });
      await vi.advanceTimersByTimeAsync(0);
      expect(actor.getSnapshot().value).toBe('settled');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('rouletteMachine — NEW_ROUND prepareNextRound', () => {
  it('clears winning positions, keeps losing ones with cleared handle IDs', async () => {
    vi.useFakeTimers();
    try {
      seed(1);
      const a = startMachine();

      // Bet red, black, and a straight: at least one will lose for any non-0 spin.
      a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'red' }), 5, 'h-red') });
      a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'black' }), 7, 'h-black') });
      a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'straight', n: 19 }), 3, 'h-19') });

      a.send({ type: 'SPIN' });
      await vi.advanceTimersByTimeAsync(ROULETTE_CONFIG.SPIN_DURATION_MS);

      const settled = a.getSnapshot();
      expect(settled.value).toBe('settled');
      const winningNumber = settled.context.spinResult!.number;

      a.send({ type: 'NEW_ROUND' });
      const next = a.getSnapshot();
      expect(next.value).toBe('betting');
      expect(next.context.spinResult).toBeNull();
      expect(next.context.roundResult).toBeNull();

      // Each preserved bet should have its key + amount + numbers intact, but betHandleId cleared.
      for (const bet of next.context.bets) {
        expect(bet.betHandleId).toBe('');
        expect(bet.numbers).not.toContain(winningNumber);
      }
    } finally {
      vi.useRealTimers();
      unseed();
    }
  });

  it('drops all bets when every position wins', async () => {
    vi.useFakeTimers();
    try {
      // Discover the spin number for this seed via a dry-run actor first.
      seed(1);
      const dryActor = startMachine();
      dryActor.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'red' }), 5, 'h') });
      dryActor.send({ type: 'SPIN' });
      await vi.advanceTimersByTimeAsync(ROULETTE_CONFIG.SPIN_DURATION_MS);
      const n = dryActor.getSnapshot().context.spinResult!.number;
      dryActor.stop();

      // Now actually bet only on that exact straight number — guaranteed win.
      seed(1);
      const a = startMachine();
      a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'straight', n }), 5, 'h-s') });
      a.send({ type: 'SPIN' });
      await vi.advanceTimersByTimeAsync(ROULETTE_CONFIG.SPIN_DURATION_MS);
      expect(a.getSnapshot().context.roundResult!.outcome).toBe('win');

      a.send({ type: 'NEW_ROUND' });
      expect(a.getSnapshot().context.bets).toEqual([]);
    } finally {
      vi.useRealTimers();
      unseed();
    }
  });
});
