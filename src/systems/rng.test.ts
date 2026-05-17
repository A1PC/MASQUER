import { afterEach, describe, expect, it } from 'vitest';
import { isSeeded, pick, randomInt, seed, shuffle, unseed } from './rng';

afterEach(() => {
  unseed();
});

describe('seed / unseed', () => {
  it('isSeeded reflects current mode', () => {
    expect(isSeeded()).toBe(false);
    seed(42);
    expect(isSeeded()).toBe(true);
    unseed();
    expect(isSeeded()).toBe(false);
  });

  it('seed(N) followed by randomInt produces a deterministic sequence', () => {
    seed(1);
    const sequence = [
      randomInt(0, 9),
      randomInt(0, 9),
      randomInt(0, 9),
      randomInt(0, 9),
      randomInt(0, 9),
    ];
    unseed();
    seed(1);
    const repeat = [
      randomInt(0, 9),
      randomInt(0, 9),
      randomInt(0, 9),
      randomInt(0, 9),
      randomInt(0, 9),
    ];
    expect(repeat).toEqual(sequence);
  });

  it('different seeds produce different sequences', () => {
    seed(1);
    const a = [randomInt(0, 99), randomInt(0, 99), randomInt(0, 99)];
    unseed();
    seed(2);
    const b = [randomInt(0, 99), randomInt(0, 99), randomInt(0, 99)];
    expect(a).not.toEqual(b);
  });
});

describe('randomInt', () => {
  it('with equal bounds always returns that value', () => {
    for (let i = 0; i < 10; i++) expect(randomInt(5, 5)).toBe(5);
    seed(99);
    for (let i = 0; i < 10; i++) expect(randomInt(5, 5)).toBe(5);
  });

  it('produces values within [min, max] inclusive', () => {
    seed(42);
    for (let i = 0; i < 200; i++) {
      const v = randomInt(-3, 3);
      expect(v).toBeGreaterThanOrEqual(-3);
      expect(v).toBeLessThanOrEqual(3);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('over many seeded rolls, hits every value in the range', () => {
    seed(7);
    const counts = new Array(10).fill(0) as number[];
    for (let i = 0; i < 1000; i++) {
      counts[randomInt(0, 9)]! += 1;
    }
    for (const c of counts) expect(c).toBeGreaterThanOrEqual(50);
  });

  it('throws TypeError for non-integer bounds', () => {
    expect(() => randomInt(1.5, 9)).toThrow(TypeError);
    expect(() => randomInt(0, 9.9)).toThrow(TypeError);
  });

  it('throws RangeError when max < min', () => {
    expect(() => randomInt(10, 5)).toThrow(RangeError);
  });
});

describe('shuffle', () => {
  it('returns the same multiset of elements', () => {
    seed(123);
    const arr = [1, 2, 3, 4, 5, 6, 7];
    const shuffled = shuffle([...arr]);
    expect(shuffled.sort((a, b) => a - b)).toEqual(arr);
  });

  it('produces same order across runs with the same seed', () => {
    seed(123);
    const a = shuffle([1, 2, 3, 4, 5, 6, 7]);
    unseed();
    seed(123);
    const b = shuffle([1, 2, 3, 4, 5, 6, 7]);
    expect(a).toEqual(b);
  });
});

describe('pick', () => {
  it('throws RangeError on empty array', () => {
    expect(() => pick([])).toThrow(RangeError);
  });

  it('returns an element from the array', () => {
    seed(5);
    const arr = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 30; i++) {
      expect(arr).toContain(pick(arr));
    }
  });

  it('hits every element over many seeded picks', () => {
    seed(13);
    const arr = ['a', 'b', 'c'];
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) seen.add(pick(arr));
    expect(seen.size).toBe(3);
  });
});
