import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  mulberry32,
  stringSeed,
  pickArchetype,
  buildMachineInput,
  makeSessionId,
  pickWinTier,
} from './sessionBootstrap';

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('differs across seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  it('returns values in [0, 1)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 100; i += 1) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('stringSeed', () => {
  it('is deterministic for the same input', () => {
    expect(stringSeed('poker-123-456')).toBe(stringSeed('poker-123-456'));
  });

  it('differs across inputs', () => {
    expect(stringSeed('a')).not.toBe(stringSeed('b'));
  });

  it('returns a uint32', () => {
    const s = stringSeed('any input');
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(0xffffffff);
  });
});

describe('pickArchetype', () => {
  it('returns one of the four canonical archetypes', () => {
    const r = mulberry32(stringSeed('archetype-test'));
    for (let i = 0; i < 50; i += 1) {
      const a = pickArchetype(r);
      expect(['rock', 'station', 'maniac', 'shark']).toContain(a);
    }
  });

  it('is deterministic for a deterministic rng', () => {
    const a = pickArchetype(mulberry32(stringSeed('p-1')));
    const b = pickArchetype(mulberry32(stringSeed('p-1')));
    expect(a).toBe(b);
  });
});

describe('buildMachineInput', () => {
  it('returns the supplied scalars verbatim', () => {
    const rng = mulberry32(stringSeed('s'));
    const input = buildMachineInput('sid-1', 4000, 4, { sb: 5, bb: 10 }, rng);
    expect(input.sessionId).toBe('sid-1');
    expect(input.buyIn).toBe(4000);
    expect(input.tableSize).toBe(4);
    expect(input.stakes).toEqual({ sb: 5, bb: 10 });
  });

  it('creates exactly tableSize - 1 AI seats', () => {
    const rng = mulberry32(stringSeed('s'));
    const input = buildMachineInput('sid-2', 4000, 6, { sb: 5, bb: 10 }, rng);
    expect(input.aiArchetypes).toHaveLength(5);
  });

  it('gives every AI seat stack = bb * 80', () => {
    const rng = mulberry32(stringSeed('s'));
    const input = buildMachineInput('sid-3', 4000, 4, { sb: 5, bb: 10 }, rng);
    for (const seat of input.aiArchetypes) {
      expect(seat.stack).toBe(800);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = buildMachineInput('sid', 1000, 4, { sb: 1, bb: 2 }, mulberry32(stringSeed('x')));
    const b = buildMachineInput('sid', 1000, 4, { sb: 1, bb: 2 }, mulberry32(stringSeed('x')));
    expect(a).toEqual(b);
  });
});

describe('makeSessionId', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-28T12:00:00Z'));
  });

  it('prefixes the id with the variant tag', () => {
    expect(makeSessionId('poker').startsWith('poker-')).toBe(true);
    expect(makeSessionId('omaha').startsWith('omaha-')).toBe(true);
    expect(makeSessionId('draw').startsWith('draw-')).toBe(true);
  });

  it('includes the timestamp ms', () => {
    const id = makeSessionId('poker');
    const ts = new Date('2026-05-28T12:00:00Z').getTime();
    expect(id).toContain(`-${ts}-`);
  });
});

describe('pickWinTier', () => {
  it('classifies wonAmount <= 0 as loss', () => {
    expect(pickWinTier(0, 100)).toBe('loss');
    expect(pickWinTier(-5, 100)).toBe('loss');
  });

  it('classifies ratio < 2 as small', () => {
    expect(pickWinTier(50, 100)).toBe('small');
    expect(pickWinTier(199, 100)).toBe('small');
  });

  it('classifies 2 <= ratio < 20 as medium', () => {
    expect(pickWinTier(200, 100)).toBe('medium');
    expect(pickWinTier(1999, 100)).toBe('medium');
  });

  it('classifies ratio >= 20 as jackpot', () => {
    expect(pickWinTier(2000, 100)).toBe('jackpot');
    expect(pickWinTier(10000, 100)).toBe('jackpot');
  });

  it('treats committed < 1 as committed = 1 for ratio calc', () => {
    // wonAmount=10, committed=0 → ratio = 10 / max(1, 0) = 10 → 'medium'
    expect(pickWinTier(10, 0)).toBe('medium');
  });
});
