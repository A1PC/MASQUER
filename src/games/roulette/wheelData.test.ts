import { describe, expect, it } from 'vitest';
import { POCKET_ORDER, RED_NUMBERS, colorOf, pocketIndexOf } from './wheelData';

describe('POCKET_ORDER', () => {
  it('contains exactly 37 unique numbers, 0..36', () => {
    expect(POCKET_ORDER).toHaveLength(37);
    expect(new Set(POCKET_ORDER).size).toBe(37);
    for (const n of POCKET_ORDER) {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(36);
      expect(Number.isInteger(n)).toBe(true);
    }
  });

  it('starts with 0', () => {
    expect(POCKET_ORDER[0]).toBe(0);
  });

  it('matches the real European single-zero sequence (ADR-0029)', () => {
    expect([...POCKET_ORDER]).toEqual([
      0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20,
      14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
    ]);
  });
});

describe('RED_NUMBERS', () => {
  it('contains the 18 standard reds', () => {
    expect(RED_NUMBERS.size).toBe(18);
    for (const n of [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]) {
      expect(RED_NUMBERS.has(n)).toBe(true);
    }
  });

  it('does not contain 0', () => {
    expect(RED_NUMBERS.has(0)).toBe(false);
  });
});

describe('colorOf', () => {
  it('returns green for 0', () => {
    expect(colorOf(0)).toBe('green');
  });

  it('returns red for canonical reds', () => {
    for (const n of [1, 7, 18, 19, 36]) expect(colorOf(n)).toBe('red');
  });

  it('returns black for canonical blacks', () => {
    for (const n of [2, 4, 17, 26, 35]) expect(colorOf(n)).toBe('black');
  });

  it('colors balance to 18 red + 18 black + 1 green over 0..36', () => {
    let r = 0,
      b = 0,
      g = 0;
    for (let n = 0; n <= 36; n++) {
      const c = colorOf(n);
      if (c === 'red') r++;
      else if (c === 'black') b++;
      else g++;
    }
    expect(r).toBe(18);
    expect(b).toBe(18);
    expect(g).toBe(1);
  });
});

describe('pocketIndexOf', () => {
  it('returns 0 for the number 0', () => {
    expect(pocketIndexOf(0)).toBe(0);
  });

  it('round-trips through POCKET_ORDER for every number', () => {
    for (let n = 0; n <= 36; n++) {
      const idx = pocketIndexOf(n);
      expect(POCKET_ORDER[idx]).toBe(n);
    }
  });

  it('throws on out-of-range input', () => {
    expect(() => pocketIndexOf(-1)).toThrow(RangeError);
    expect(() => pocketIndexOf(37)).toThrow(RangeError);
  });
});
