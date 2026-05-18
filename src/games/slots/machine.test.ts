import { describe, expect, it, vi } from 'vitest';
import { createActor } from 'xstate';
import { slotsMachine } from './machine';
import { SLOTS_CONFIG } from './config';

function startMachine() {
  const actor = createActor(slotsMachine);
  actor.start();
  return actor;
}

describe('slotsMachine — initial state', () => {
  it('starts in betting with bet=0, betHandleId="", spinResult=null, roundResult=null', () => {
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

  it('PLACE_BET clears any previous roundResult and spinResult (fresh round)', async () => {
    vi.useFakeTimers();
    try {
      const a = startMachine();
      a.send({ type: 'PLACE_BET', bet: 25, betHandleId: 'h1' });
      a.send({ type: 'SPIN' });
      await vi.advanceTimersByTimeAsync(
        SLOTS_CONFIG.REEL_STOP_TIMES_MS[SLOTS_CONFIG.REEL_STOP_TIMES_MS.length - 1]!,
      );
      // Now back in betting with roundResult populated.
      expect(a.getSnapshot().value).toBe('betting');
      expect(a.getSnapshot().context.roundResult).not.toBeNull();

      // Placing a new bet clears the previous result.
      a.send({ type: 'PLACE_BET', bet: 50, betHandleId: 'h2' });
      expect(a.getSnapshot().context.roundResult).toBeNull();
      expect(a.getSnapshot().context.spinResult).toBeNull();
      expect(a.getSnapshot().context.bet).toBe(50);
    } finally {
      vi.useRealTimers();
    }
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

const DEFAULT_TOTAL_SPIN_MS =
  SLOTS_CONFIG.REEL_STOP_TIMES_MS[SLOTS_CONFIG.REEL_STOP_TIMES_MS.length - 1]!;

describe('slotsMachine — spinning auto-transitions back to betting', () => {
  it('after totalSpinDurationMs, transitions to betting with roundResult populated', async () => {
    vi.useFakeTimers();
    try {
      const a = startMachine();
      a.send({ type: 'PLACE_BET', bet: 25, betHandleId: 'h' });
      a.send({ type: 'SPIN' });
      expect(a.getSnapshot().value).toBe('spinning');
      await vi.advanceTimersByTimeAsync(DEFAULT_TOTAL_SPIN_MS);
      // The auto-transition lands back in betting (no separate settled state).
      expect(a.getSnapshot().value).toBe('betting');
      const result = a.getSnapshot().context.roundResult;
      expect(result).not.toBeNull();
      expect(result!.betAmount).toBe(25);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reduced-motion override (totalSpinDurationMs=0) auto-transitions immediately', async () => {
    vi.useFakeTimers();
    try {
      const actor = createActor(slotsMachine, { input: { totalSpinDurationMs: 0 } });
      actor.start();
      actor.send({ type: 'PLACE_BET', bet: 5, betHandleId: 'h' });
      actor.send({ type: 'SPIN' });
      await vi.advanceTimersByTimeAsync(0);
      expect(actor.getSnapshot().value).toBe('betting');
      expect(actor.getSnapshot().context.roundResult).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('after spin, the player can place a new bet immediately (no NEW_ROUND needed)', async () => {
    vi.useFakeTimers();
    try {
      const a = startMachine();
      a.send({ type: 'PLACE_BET', bet: 25, betHandleId: 'h1' });
      a.send({ type: 'SPIN' });
      await vi.advanceTimersByTimeAsync(DEFAULT_TOTAL_SPIN_MS);
      expect(a.getSnapshot().value).toBe('betting');

      // Place a new bet straight away — the machine accepts it.
      a.send({ type: 'PLACE_BET', bet: 50, betHandleId: 'h2' });
      expect(a.getSnapshot().context.bet).toBe(50);
      expect(a.getSnapshot().context.betHandleId).toBe('h2');

      // And SPIN works on the new bet without any intermediate event.
      a.send({ type: 'SPIN' });
      expect(a.getSnapshot().value).toBe('spinning');
    } finally {
      vi.useRealTimers();
    }
  });
});
