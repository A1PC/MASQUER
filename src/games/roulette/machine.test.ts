import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  it('starts in placing_bets with no bets and an armed betWindowEndsAt', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    try {
      const a = startMachine();
      const snap = a.getSnapshot();
      expect(snap.value).toBe('placing_bets');
      expect(snap.context.bets).toEqual([]);
      expect(snap.context.spinResult).toBeNull();
      expect(snap.context.roundResult).toBeNull();
      expect(snap.context.betWindowEndsAt).toBe(
        1_700_000_000_000 + ROULETTE_CONFIG.INITIAL_BET_WINDOW_MS,
      );
      expect(snap.context.pausedAt).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('rouletteMachine — PLACE_BET / REMOVE_BET / CLEAR_ALL', () => {
  it('PLACE_BET adds a bet', () => {
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

  it('ADR-0030 amendment — unlimited bet positions; 15 distinct positions all accepted', () => {
    const a = startMachine();
    for (let n = 1; n <= 15; n++) {
      a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'straight', n }), 5, `h${n}`) });
    }
    expect(a.getSnapshot().context.bets).toHaveLength(15);
  });

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

describe('rouletteMachine — SPIN_NOW transitions', () => {
  it('SPIN_NOW from placing_bets transitions immediately to spinning + clears window', () => {
    const a = startMachine();
    a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'red' }), 5, 'h') });
    a.send({ type: 'SPIN_NOW' });
    const snap = a.getSnapshot();
    expect(snap.value).toBe('spinning');
    expect(snap.context.spinResult).not.toBeNull();
    expect(snap.context.betWindowEndsAt).toBeNull();
  });

  it('SPIN_NOW with zero bets still transitions to spinning (no guard)', () => {
    const a = startMachine();
    a.send({ type: 'SPIN_NOW' });
    expect(a.getSnapshot().value).toBe('spinning');
    expect(a.getSnapshot().context.bets).toEqual([]);
    expect(a.getSnapshot().context.spinResult).not.toBeNull();
  });
});

describe('rouletteMachine — auto-spin via after delays', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('after INITIAL_BET_WINDOW_MS in placing_bets, auto-spins (even with zero bets)', async () => {
    const a = startMachine();
    expect(a.getSnapshot().value).toBe('placing_bets');
    await vi.advanceTimersByTimeAsync(ROULETTE_CONFIG.INITIAL_BET_WINDOW_MS);
    expect(a.getSnapshot().value).toBe('spinning');
    expect(a.getSnapshot().context.bets).toEqual([]);
    expect(a.getSnapshot().context.spinResult).not.toBeNull();
  });

  it('spinning → settled after SPIN_DURATION_MS; roundResult populated', async () => {
    const a = startMachine();
    a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'red' }), 5, 'h') });
    a.send({ type: 'SPIN_NOW' });
    expect(a.getSnapshot().value).toBe('spinning');
    await vi.advanceTimersByTimeAsync(ROULETTE_CONFIG.SPIN_DURATION_MS);
    expect(a.getSnapshot().value).toBe('settled');
    expect(a.getSnapshot().context.roundResult).not.toBeNull();
    expect(a.getSnapshot().context.roundResult!.betAmount).toBe(5);
  });

  it('settled → between_rounds after RESULT_DISPLAY_MS; prunes winning bets + clears spinResult', async () => {
    seed(1);
    try {
      const a = startMachine();
      a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'red' }), 5, 'h-red') });
      a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'black' }), 7, 'h-black') });
      a.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'straight', n: 19 }), 3, 'h-19') });
      a.send({ type: 'SPIN_NOW' });
      await vi.advanceTimersByTimeAsync(ROULETTE_CONFIG.SPIN_DURATION_MS);
      const winningNumber = a.getSnapshot().context.spinResult!.number;
      await vi.advanceTimersByTimeAsync(ROULETTE_CONFIG.RESULT_DISPLAY_MS);
      const next = a.getSnapshot();
      expect(next.value).toBe('between_rounds');
      expect(next.context.spinResult).toBeNull();
      expect(next.context.roundResult).toBeNull();
      for (const bet of next.context.bets) {
        expect(bet.betHandleId).toBe('');
        expect(bet.numbers).not.toContain(winningNumber);
      }
    } finally {
      unseed();
    }
  });

  it('between_rounds arms a BETWEEN_ROUNDS_MS window; auto-spins when it elapses', async () => {
    vi.setSystemTime(1_700_000_000_000);
    const a = startMachine();
    a.send({ type: 'SPIN_NOW' });
    await vi.advanceTimersByTimeAsync(ROULETTE_CONFIG.SPIN_DURATION_MS);
    await vi.advanceTimersByTimeAsync(ROULETTE_CONFIG.RESULT_DISPLAY_MS);
    expect(a.getSnapshot().value).toBe('between_rounds');
    const endsAt = a.getSnapshot().context.betWindowEndsAt;
    expect(endsAt).not.toBeNull();
    expect(endsAt! - Date.now()).toBe(ROULETTE_CONFIG.BETWEEN_ROUNDS_MS);

    await vi.advanceTimersByTimeAsync(ROULETTE_CONFIG.BETWEEN_ROUNDS_MS);
    expect(a.getSnapshot().value).toBe('spinning');
  });

  it('SPIN_NOW from between_rounds transitions immediately to spinning', async () => {
    const a = startMachine();
    a.send({ type: 'SPIN_NOW' });
    await vi.advanceTimersByTimeAsync(ROULETTE_CONFIG.SPIN_DURATION_MS);
    await vi.advanceTimersByTimeAsync(ROULETTE_CONFIG.RESULT_DISPLAY_MS);
    expect(a.getSnapshot().value).toBe('between_rounds');
    a.send({ type: 'SPIN_NOW' });
    expect(a.getSnapshot().value).toBe('spinning');
    expect(a.getSnapshot().context.betWindowEndsAt).toBeNull();
  });

  it('reduced-motion override (spinDurationMs=0) still settles via the same flow', async () => {
    const actor = createActor(rouletteMachine, { input: { spinDurationMs: 0 } });
    actor.start();
    actor.send({ type: 'PLACE_BET', bet: placed(makeBet({ type: 'red' }), 5, 'h') });
    actor.send({ type: 'SPIN_NOW' });
    await vi.advanceTimersByTimeAsync(0);
    expect(actor.getSnapshot().value).toBe('settled');
  });
});

describe('rouletteMachine — pause / resume', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('PAUSE_TIMER snapshots pausedAt; RESUME_TIMER extends betWindowEndsAt by paused duration', () => {
    vi.setSystemTime(1_700_000_000_000);
    const a = startMachine();
    const originalEndsAt = a.getSnapshot().context.betWindowEndsAt!;
    expect(originalEndsAt).toBe(1_700_000_000_000 + ROULETTE_CONFIG.INITIAL_BET_WINDOW_MS);

    // Player opens the rules modal 5s in → PAUSE_TIMER.
    vi.setSystemTime(1_700_000_005_000);
    a.send({ type: 'PAUSE_TIMER' });
    expect(a.getSnapshot().context.pausedAt).toBe(1_700_000_005_000);
    // betWindowEndsAt unchanged by pause alone.
    expect(a.getSnapshot().context.betWindowEndsAt).toBe(originalEndsAt);

    // Player reads for 8s and closes the modal → RESUME_TIMER.
    vi.setSystemTime(1_700_000_013_000);
    a.send({ type: 'RESUME_TIMER' });
    expect(a.getSnapshot().context.pausedAt).toBeNull();
    expect(a.getSnapshot().context.betWindowEndsAt).toBe(originalEndsAt + 8_000);
  });

  it('RESUME_TIMER with no pause in flight is a no-op on betWindowEndsAt', () => {
    vi.setSystemTime(1_700_000_000_000);
    const a = startMachine();
    const before = a.getSnapshot().context.betWindowEndsAt;
    a.send({ type: 'RESUME_TIMER' });
    expect(a.getSnapshot().context.betWindowEndsAt).toBe(before);
  });
});
