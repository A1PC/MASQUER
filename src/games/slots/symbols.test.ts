import { afterEach, describe, expect, it } from 'vitest';
import { seed, unseed } from '@/systems/rng';
import { pickSymbol, SYMBOL_DISPLAY } from './symbols';
import { SLOTS_WEIGHTS, SLOTS_WEIGHT_TOTAL } from './config';
import { NEON_SYMBOLS } from './types';
import type { Symbol } from './types';

describe('pickSymbol', () => {
  afterEach(() => unseed());

  it('returns one of the 5 valid symbols', () => {
    seed(1);
    const valid: ReadonlySet<Symbol> = new Set(['cherry', 'lemon', 'bell', 'bar', 'seven']);
    for (let i = 0; i < 100; i++) {
      const s = pickSymbol();
      expect(valid.has(s)).toBe(true);
    }
  });

  it('is deterministic under a fixed seed', () => {
    seed(42);
    const sequence1 = Array.from({ length: 10 }, () => pickSymbol());
    seed(42);
    const sequence2 = Array.from({ length: 10 }, () => pickSymbol());
    expect(sequence1).toEqual(sequence2);
  });

  it('over many draws, symbol frequencies approximate the weights (±2% per symbol)', () => {
    seed(1);
    const N = 30_000;
    const counts: Record<Symbol, number> = { cherry: 0, lemon: 0, bell: 0, bar: 0, seven: 0 };
    for (let i = 0; i < N; i++) {
      counts[pickSymbol()]++;
    }
    for (const sym of ['cherry', 'lemon', 'bell', 'bar', 'seven'] as const) {
      const expected = SLOTS_WEIGHTS[sym] / SLOTS_WEIGHT_TOTAL;
      const observed = counts[sym] / N;
      expect(Math.abs(observed - expected)).toBeLessThan(0.02);
    }
  });

  it('every symbol appears at least once in 1000 draws (no symbol is unreachable)', () => {
    seed(1);
    const seen = new Set<Symbol>();
    for (let i = 0; i < 1000; i++) seen.add(pickSymbol());
    expect(seen.size).toBe(5);
  });
});

describe('SYMBOL_DISPLAY', () => {
  it('has an entry for every symbol', () => {
    for (const sym of ['cherry', 'lemon', 'bell', 'bar', 'seven'] as const) {
      expect(SYMBOL_DISPLAY[sym]).toBeDefined();
      expect(SYMBOL_DISPLAY[sym].key).toBe(sym);
    }
  });

  it('marks bell/bar/seven as neon, cherry/lemon as not', () => {
    expect(SYMBOL_DISPLAY.cherry.neon).toBe(false);
    expect(SYMBOL_DISPLAY.lemon.neon).toBe(false);
    expect(SYMBOL_DISPLAY.bell.neon).toBe(true);
    expect(SYMBOL_DISPLAY.bar.neon).toBe(true);
    expect(SYMBOL_DISPLAY.seven.neon).toBe(true);
  });

  it('SYMBOL_DISPLAY[sym].neon agrees with NEON_SYMBOLS membership', () => {
    for (const sym of ['cherry', 'lemon', 'bell', 'bar', 'seven'] as const) {
      expect(SYMBOL_DISPLAY[sym].neon).toBe(NEON_SYMBOLS.has(sym));
    }
  });

  it('label for each symbol is human-readable', () => {
    expect(SYMBOL_DISPLAY.cherry.label).toBe('Cherry');
    expect(SYMBOL_DISPLAY.lemon.label).toBe('Lemon');
    expect(SYMBOL_DISPLAY.bell.label).toBe('Bell');
    expect(SYMBOL_DISPLAY.bar.label).toBe('BAR');
    expect(SYMBOL_DISPLAY.seven.label).toBe('7');
  });
});
