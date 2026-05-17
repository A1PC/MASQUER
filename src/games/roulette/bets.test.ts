import { describe, expect, it } from 'vitest';
import {
  RED_NUMBERS_ARRAY,
  BLACK_NUMBERS_ARRAY,
  ODD_NUMBERS,
  EVEN_NUMBERS,
  LOW_NUMBERS,
  HIGH_NUMBERS,
  COLUMN_NUMBERS,
  DOZEN_NUMBERS,
  columnOf,
  dozenOf,
  isValidSplit,
  isValidStreet,
  isValidCorner,
  isValidSixLine,
} from './bets';

describe('number-set constants', () => {
  it('RED_NUMBERS_ARRAY matches the canonical 18 reds in ascending order', () => {
    expect(RED_NUMBERS_ARRAY).toEqual([
      1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
    ]);
  });

  it('BLACK_NUMBERS_ARRAY is exactly the 18 blacks (1..36 minus reds)', () => {
    expect(BLACK_NUMBERS_ARRAY).toHaveLength(18);
    for (const n of BLACK_NUMBERS_ARRAY) {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(36);
      expect(RED_NUMBERS_ARRAY).not.toContain(n);
    }
    expect(new Set([...RED_NUMBERS_ARRAY, ...BLACK_NUMBERS_ARRAY]).size).toBe(36);
  });

  it('ODD_NUMBERS and EVEN_NUMBERS each have 18 elements and exclude 0', () => {
    expect(ODD_NUMBERS).toHaveLength(18);
    expect(EVEN_NUMBERS).toHaveLength(18);
    expect(ODD_NUMBERS).not.toContain(0);
    expect(EVEN_NUMBERS).not.toContain(0);
    for (const n of ODD_NUMBERS) expect(n % 2).toBe(1);
    for (const n of EVEN_NUMBERS) expect(n % 2).toBe(0);
  });

  it('LOW_NUMBERS = 1..18, HIGH_NUMBERS = 19..36', () => {
    expect(LOW_NUMBERS).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    expect(HIGH_NUMBERS).toEqual(Array.from({ length: 18 }, (_, i) => i + 19));
  });

  it('COLUMN_NUMBERS[1..3] each have 12 numbers, partitioning 1..36', () => {
    expect(COLUMN_NUMBERS[1]).toHaveLength(12);
    expect(COLUMN_NUMBERS[2]).toHaveLength(12);
    expect(COLUMN_NUMBERS[3]).toHaveLength(12);
    const union = new Set([...COLUMN_NUMBERS[1], ...COLUMN_NUMBERS[2], ...COLUMN_NUMBERS[3]]);
    expect(union.size).toBe(36);
    for (let n = 1; n <= 36; n++) expect(union.has(n)).toBe(true);
  });

  it('COLUMN_NUMBERS[1] = 1,4,7,…,34', () => {
    expect(COLUMN_NUMBERS[1]).toEqual([1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]);
  });

  it('DOZEN_NUMBERS[1..3] partition 1..36 into thirds', () => {
    expect(DOZEN_NUMBERS[1]).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    expect(DOZEN_NUMBERS[2]).toEqual(Array.from({ length: 12 }, (_, i) => i + 13));
    expect(DOZEN_NUMBERS[3]).toEqual(Array.from({ length: 12 }, (_, i) => i + 25));
  });
});

describe('columnOf', () => {
  it.each([
    [1, 1],
    [4, 1],
    [34, 1],
    [2, 2],
    [5, 2],
    [35, 2],
    [3, 3],
    [6, 3],
    [36, 3],
  ])('columnOf(%i) === %i', (n, expected) => {
    expect(columnOf(n)).toBe(expected);
  });

  it('throws on 0 and out-of-range', () => {
    expect(() => columnOf(0)).toThrow(RangeError);
    expect(() => columnOf(37)).toThrow(RangeError);
  });
});

describe('dozenOf', () => {
  it.each([
    [1, 1],
    [12, 1],
    [13, 2],
    [24, 2],
    [25, 3],
    [36, 3],
  ])('dozenOf(%i) === %i', (n, expected) => {
    expect(dozenOf(n)).toBe(expected);
  });

  it('returns null for 0', () => {
    expect(dozenOf(0)).toBeNull();
  });

  it('throws on out-of-range', () => {
    expect(() => dozenOf(37)).toThrow(RangeError);
    expect(() => dozenOf(-1)).toThrow(RangeError);
  });
});

describe('isValidSplit', () => {
  it('accepts the three 0-splits regardless of order', () => {
    expect(isValidSplit(0, 1)).toBe(true);
    expect(isValidSplit(1, 0)).toBe(true);
    expect(isValidSplit(0, 2)).toBe(true);
    expect(isValidSplit(0, 3)).toBe(true);
  });

  it('rejects (0, 4) and other non-adjacent 0-splits', () => {
    expect(isValidSplit(0, 4)).toBe(false);
    expect(isValidSplit(0, 36)).toBe(false);
  });

  it('accepts vertical splits within a street row', () => {
    expect(isValidSplit(1, 2)).toBe(true);
    expect(isValidSplit(2, 3)).toBe(true);
    expect(isValidSplit(4, 5)).toBe(true);
    expect(isValidSplit(34, 35)).toBe(true);
  });

  it('rejects vertical pairs that cross street rows', () => {
    expect(isValidSplit(3, 4)).toBe(false);
    expect(isValidSplit(6, 7)).toBe(false);
    expect(isValidSplit(33, 34)).toBe(false);
  });

  it('accepts horizontal splits within a visual row', () => {
    expect(isValidSplit(1, 4)).toBe(true);
    expect(isValidSplit(2, 5)).toBe(true);
    expect(isValidSplit(3, 6)).toBe(true);
    expect(isValidSplit(31, 34)).toBe(true);
  });

  it('rejects horizontal pairs out of range or in the wrong visual row', () => {
    expect(isValidSplit(34, 37)).toBe(false);
    expect(isValidSplit(1, 5)).toBe(false);
  });

  it('there are exactly 60 valid splits in total (3 + 24 + 33)', () => {
    let count = 0;
    for (let a = 0; a <= 36; a++) {
      for (let b = a + 1; b <= 36; b++) {
        if (isValidSplit(a, b)) count++;
      }
    }
    expect(count).toBe(60);
  });
});

describe('isValidStreet', () => {
  it('accepts the 12 row starts', () => {
    for (const s of [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]) {
      expect(isValidStreet(s)).toBe(true);
    }
  });

  it('rejects everything else', () => {
    expect(isValidStreet(0)).toBe(false);
    expect(isValidStreet(2)).toBe(false);
    expect(isValidStreet(3)).toBe(false);
    expect(isValidStreet(35)).toBe(false);
    expect(isValidStreet(37)).toBe(false);
  });
});

describe('isValidCorner', () => {
  it('accepts all valid top-lefts', () => {
    const valid: number[] = [];
    for (let n = 1; n <= 32; n++) if (n % 3 !== 0) valid.push(n);
    expect(valid).toHaveLength(22);
    for (const t of valid) expect(isValidCorner(t)).toBe(true);
  });

  it('rejects every n % 3 === 0', () => {
    for (const t of [3, 6, 9, 12, 15, 18, 21, 24, 27, 30]) {
      expect(isValidCorner(t)).toBe(false);
    }
  });

  it('rejects out-of-range top-lefts (≤ 0, ≥ 33, > 36)', () => {
    expect(isValidCorner(0)).toBe(false);
    expect(isValidCorner(33)).toBe(false);
    expect(isValidCorner(36)).toBe(false);
  });
});

describe('isValidSixLine', () => {
  it('accepts the 11 valid row starts (1..31 stepping by 3)', () => {
    for (const s of [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31]) {
      expect(isValidSixLine(s)).toBe(true);
    }
  });

  it('rejects 34 (last street has no street to pair with)', () => {
    expect(isValidSixLine(34)).toBe(false);
  });

  it('rejects non-row-starts', () => {
    expect(isValidSixLine(2)).toBe(false);
    expect(isValidSixLine(3)).toBe(false);
  });
});
