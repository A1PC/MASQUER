import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { plinkoMachine } from './machine';

function makeManualEvent(
  overrides: Partial<{ ballId: string; sessionId: string; bin: number; payout: number }> = {},
) {
  return {
    type: 'DROP_MANUAL' as const,
    bet: 50,
    risk: 'low' as const,
    betHandleId: 'handle-' + (overrides.ballId ?? 'm1'),
    path: Array(26).fill('L') as ('L' | 'R')[],
    bin: overrides.bin ?? 0,
    multiplier: 110,
    payout: overrides.payout ?? 5500,
    ballId: overrides.ballId ?? 'm1',
    sessionId: overrides.sessionId ?? 's1',
  };
}

function makeAutoStartEvent(
  overrides: Partial<{ ballsRequested: number; intervalMs: number; sessionId: string }> = {},
) {
  return {
    type: 'START_AUTO' as const,
    bet: 50,
    risk: 'low' as const,
    ballsRequested: overrides.ballsRequested ?? 3,
    intervalMs: overrides.intervalMs ?? 500,
    sessionId: overrides.sessionId ?? 'auto-1',
  };
}

function makeAutoTickEvent(ballId: string, bin = 5, payout = 75) {
  return {
    type: 'AUTO_TICK' as const,
    betHandleId: 'handle-' + ballId,
    path: Array(26).fill('R') as ('L' | 'R')[],
    bin,
    multiplier: 1.5,
    payout,
    ballId,
  };
}

describe('plinkoMachine — initial state', () => {
  it('starts in idle with empty context', () => {
    const actor = createActor(plinkoMachine).start();
    const snap = actor.getSnapshot();
    expect(snap.value).toBe('idle');
    expect(snap.context.inFlightBalls).toEqual([]);
    expect(snap.context.history).toEqual([]);
    expect(snap.context.autoStopReason).toBeNull();
    actor.stop();
  });
});

describe('plinkoMachine — manual drop', () => {
  it('DROP_MANUAL records in-flight ball, stays idle', () => {
    const actor = createActor(plinkoMachine).start();
    actor.send(makeManualEvent());
    const snap = actor.getSnapshot();
    expect(snap.value).toBe('idle');
    expect(snap.context.inFlightBalls).toHaveLength(1);
    expect(snap.context.inFlightBalls[0]!.ballId).toBe('m1');
    expect(snap.context.history).toHaveLength(0);
    actor.stop();
  });

  it('two DROP_MANUALs before BALL_LANDED: both in-flight', () => {
    const actor = createActor(plinkoMachine).start();
    actor.send(makeManualEvent({ ballId: 'm1' }));
    actor.send(makeManualEvent({ ballId: 'm2' }));
    expect(actor.getSnapshot().context.inFlightBalls).toHaveLength(2);
    actor.stop();
  });

  it('BALL_LANDED removes ball, appends history', () => {
    const actor = createActor(plinkoMachine).start();
    actor.send(makeManualEvent({ ballId: 'm1', bin: 7, payout: 35 }));
    actor.send({ type: 'BALL_LANDED', ballId: 'm1' });
    const snap = actor.getSnapshot();
    expect(snap.context.inFlightBalls).toHaveLength(0);
    expect(snap.context.history).toHaveLength(1);
    expect(snap.context.history[0]!.bin).toBe(7);
    expect(snap.context.history[0]!.payout).toBe(35);
    actor.stop();
  });

  it('history caps at 50 entries (rolling)', () => {
    const actor = createActor(plinkoMachine).start();
    for (let i = 0; i < 60; i += 1) {
      actor.send(makeManualEvent({ ballId: `m${i}` }));
      actor.send({ type: 'BALL_LANDED', ballId: `m${i}` });
    }
    expect(actor.getSnapshot().context.history).toHaveLength(50);
    // Newest first.
    expect(actor.getSnapshot().context.history[0]!.ballId).toBe('m59');
    actor.stop();
  });
});

describe('plinkoMachine — auto session', () => {
  it('START_AUTO transitions to playing-auto, initialises counters', () => {
    const actor = createActor(plinkoMachine).start();
    actor.send(makeAutoStartEvent({ ballsRequested: 5 }));
    const snap = actor.getSnapshot();
    expect(snap.value).toBe('playing-auto');
    expect(snap.context.autoBallsRequested).toBe(5);
    expect(snap.context.autoBallsSpawned).toBe(0);
    expect(snap.context.mode).toBe('auto');
    expect(snap.context.autoStopReason).toBeNull();
    actor.stop();
  });

  it('AUTO_TICK increments spawned + adds to inFlightBalls', () => {
    const actor = createActor(plinkoMachine).start();
    actor.send(makeAutoStartEvent({ ballsRequested: 3 }));
    actor.send(makeAutoTickEvent('a1'));
    actor.send(makeAutoTickEvent('a2'));
    const snap = actor.getSnapshot();
    expect(snap.context.autoBallsSpawned).toBe(2);
    expect(snap.context.inFlightBalls).toHaveLength(2);
    actor.stop();
  });

  it('AUTO_TICK ignored after autoBallsSpawned reaches requested', () => {
    const actor = createActor(plinkoMachine).start();
    actor.send(makeAutoStartEvent({ ballsRequested: 2 }));
    actor.send(makeAutoTickEvent('a1'));
    actor.send(makeAutoTickEvent('a2'));
    // Third tick should be ignored.
    actor.send(makeAutoTickEvent('a3'));
    expect(actor.getSnapshot().context.autoBallsSpawned).toBe(2);
    expect(actor.getSnapshot().context.inFlightBalls).toHaveLength(2);
    actor.stop();
  });

  it('completed: all spawned + all landed → idle with autoStopReason=completed', () => {
    const actor = createActor(plinkoMachine).start();
    actor.send(makeAutoStartEvent({ ballsRequested: 2 }));
    actor.send(makeAutoTickEvent('a1'));
    actor.send(makeAutoTickEvent('a2'));
    actor.send({ type: 'BALL_LANDED', ballId: 'a1' });
    expect(actor.getSnapshot().value).toBe('playing-auto'); // still in-flight a2
    actor.send({ type: 'BALL_LANDED', ballId: 'a2' });
    const snap = actor.getSnapshot();
    expect(snap.value).toBe('idle');
    expect(snap.context.autoStopReason).toBe('completed');
    expect(snap.context.history).toHaveLength(2);
    actor.stop();
  });

  it('AUTO_STOP transitions to stopping; subsequent BALL_LANDEDs drain', () => {
    const actor = createActor(plinkoMachine).start();
    actor.send(makeAutoStartEvent({ ballsRequested: 5 }));
    actor.send(makeAutoTickEvent('a1'));
    actor.send(makeAutoTickEvent('a2'));
    actor.send({ type: 'AUTO_STOP', reason: 'user-stop' });
    expect(actor.getSnapshot().value).toBe('playing-auto-stopping');
    expect(actor.getSnapshot().context.autoStopReason).toBe('user-stop');
    actor.send({ type: 'BALL_LANDED', ballId: 'a1' });
    expect(actor.getSnapshot().value).toBe('playing-auto-stopping'); // a2 still in flight
    actor.send({ type: 'BALL_LANDED', ballId: 'a2' });
    expect(actor.getSnapshot().value).toBe('idle');
    expect(actor.getSnapshot().context.autoStopReason).toBe('user-stop'); // preserved
    actor.stop();
  });

  it('insufficient-chips AUTO_STOP records that reason', () => {
    const actor = createActor(plinkoMachine).start();
    actor.send(makeAutoStartEvent({ ballsRequested: 5 }));
    actor.send(makeAutoTickEvent('a1'));
    actor.send({ type: 'AUTO_STOP', reason: 'insufficient-chips' });
    actor.send({ type: 'BALL_LANDED', ballId: 'a1' });
    expect(actor.getSnapshot().context.autoStopReason).toBe('insufficient-chips');
    actor.stop();
  });

  it('DROP_MANUAL during playing-auto: ignored', () => {
    const actor = createActor(plinkoMachine).start();
    actor.send(makeAutoStartEvent({ ballsRequested: 3 }));
    actor.send(makeManualEvent({ ballId: 'm1' }));
    expect(actor.getSnapshot().value).toBe('playing-auto');
    expect(actor.getSnapshot().context.inFlightBalls).toHaveLength(0);
    actor.stop();
  });
});

describe('plinkoMachine — reset', () => {
  it('RESET clears all state to initial', () => {
    const actor = createActor(plinkoMachine).start();
    actor.send(makeManualEvent({ ballId: 'm1' }));
    actor.send({ type: 'BALL_LANDED', ballId: 'm1' });
    actor.send({ type: 'RESET' });
    const snap = actor.getSnapshot();
    expect(snap.context.inFlightBalls).toEqual([]);
    expect(snap.context.history).toEqual([]);
    expect(snap.context.autoStopReason).toBeNull();
    actor.stop();
  });
});
