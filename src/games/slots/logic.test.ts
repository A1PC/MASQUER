import { afterEach, describe, expect, it } from 'vitest';
import { seed, unseed } from '@/systems/rng';
import { spin, winTierOf } from './logic';

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
