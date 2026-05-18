import { afterEach, describe, expect, it } from 'vitest';
import { seed, unseed } from '@/systems/rng';
import { spin, winTierOf, settleSpin } from './logic';
import type { Symbol } from './types';

function spinOf(a: Symbol, b: Symbol, c: Symbol) {
  return { reels: [a, b, c] as const };
}

describe('spin', () => {
  afterEach(() => unseed());

  it('returns 3 reels each with a valid symbol', () => {
    seed(1);
    const r = spin();
    expect(r.reels).toHaveLength(3);
    for (const s of r.reels) {
      expect(['cherry', 'lemon', 'bell', 'bar', 'seven']).toContain(s);
    }
  });

  it('is deterministic under a fixed seed', () => {
    seed(99);
    const a = spin();
    seed(99);
    const b = spin();
    expect(a).toEqual(b);
  });

  it('over many spins, hits every symbol on every reel at least once', () => {
    seed(1);
    const reelSymbols: Array<Set<string>> = [new Set(), new Set(), new Set()];
    for (let i = 0; i < 2000; i++) {
      const r = spin();
      reelSymbols[0]!.add(r.reels[0]);
      reelSymbols[1]!.add(r.reels[1]);
      reelSymbols[2]!.add(r.reels[2]);
    }
    for (const reel of reelSymbols) {
      expect(reel.size).toBe(5);
    }
  });
});

describe('winTierOf', () => {
  it('returns "none" for null', () => {
    expect(winTierOf(null)).toBe('none');
  });

  it('returns "small" for multiple ≤ 2', () => {
    expect(winTierOf(1)).toBe('small');
    expect(winTierOf(2)).toBe('small');
  });

  it('returns "medium" for multiple 5 / 8 / 12 / 20', () => {
    expect(winTierOf(5)).toBe('medium');
    expect(winTierOf(8)).toBe('medium');
    expect(winTierOf(12)).toBe('medium');
    expect(winTierOf(20)).toBe('medium');
  });

  it('returns "jackpot" for multiple > 20', () => {
    expect(winTierOf(21)).toBe('jackpot');
    expect(winTierOf(50)).toBe('jackpot');
  });

  it('returns "medium" exactly at MEDIUM_MAX boundary (20)', () => {
    expect(winTierOf(20)).toBe('medium');
  });

  it('returns "jackpot" just past MEDIUM_MAX boundary (21)', () => {
    expect(winTierOf(21)).toBe('jackpot');
  });
});

describe('settleSpin', () => {
  it('returns null when all three symbols differ', () => {
    expect(settleSpin(spinOf('cherry', 'lemon', 'bell'))).toBeNull();
    expect(settleSpin(spinOf('bar', 'seven', 'bell'))).toBeNull();
  });

  it('returns null when only 1 cherry is present', () => {
    expect(settleSpin(spinOf('cherry', 'lemon', 'bell'))).toBeNull();
    expect(settleSpin(spinOf('bar', 'cherry', 'lemon'))).toBeNull();
  });

  it('returns 2-cherry payout when exactly 2 cherries are present (any 2 positions)', () => {
    const r1 = settleSpin(spinOf('cherry', 'cherry', 'lemon'));
    expect(r1).toEqual({
      key: 'two-cherry',
      multiple: 2,
      winningReelIndices: [0, 1],
    });

    const r2 = settleSpin(spinOf('cherry', 'lemon', 'cherry'));
    expect(r2).toEqual({
      key: 'two-cherry',
      multiple: 2,
      winningReelIndices: [0, 2],
    });

    const r3 = settleSpin(spinOf('lemon', 'cherry', 'cherry'));
    expect(r3).toEqual({
      key: 'two-cherry',
      multiple: 2,
      winningReelIndices: [1, 2],
    });
  });

  it('returns 3-cherry payout (NOT 2-cherry) when all three are cherries', () => {
    const r = settleSpin(spinOf('cherry', 'cherry', 'cherry'));
    expect(r).toEqual({
      key: 'cherry-cherry-cherry',
      multiple: 5,
      winningReelIndices: [0, 1, 2],
    });
  });

  it.each([
    ['lemon', 'lemon-lemon-lemon', 8],
    ['bell', 'bell-bell-bell', 12],
    ['bar', 'bar-bar-bar', 20],
    ['seven', 'seven-seven-seven', 50],
  ] as const)('3-of-a-kind %s → %s (%i×)', (sym, key, mult) => {
    const r = settleSpin(spinOf(sym, sym, sym));
    expect(r).toEqual({
      key,
      multiple: mult,
      winningReelIndices: [0, 1, 2],
    });
  });
});
