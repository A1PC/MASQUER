import { RED_NUMBERS } from './wheel';

export const RED_NUMBERS_ARRAY: readonly number[] = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
];

export const BLACK_NUMBERS_ARRAY: readonly number[] = (() => {
  const blacks: number[] = [];
  for (let n = 1; n <= 36; n++) {
    if (!RED_NUMBERS.has(n)) blacks.push(n);
  }
  return blacks;
})();

export const ODD_NUMBERS: readonly number[] = Array.from({ length: 18 }, (_, i) => i * 2 + 1);
export const EVEN_NUMBERS: readonly number[] = Array.from({ length: 18 }, (_, i) => (i + 1) * 2);
export const LOW_NUMBERS: readonly number[] = Array.from({ length: 18 }, (_, i) => i + 1);
export const HIGH_NUMBERS: readonly number[] = Array.from({ length: 18 }, (_, i) => i + 19);

export const COLUMN_NUMBERS: Readonly<Record<1 | 2 | 3, readonly number[]>> = {
  1: Array.from({ length: 12 }, (_, i) => i * 3 + 1),
  2: Array.from({ length: 12 }, (_, i) => i * 3 + 2),
  3: Array.from({ length: 12 }, (_, i) => i * 3 + 3),
};

export const DOZEN_NUMBERS: Readonly<Record<1 | 2 | 3, readonly number[]>> = {
  1: Array.from({ length: 12 }, (_, i) => i + 1),
  2: Array.from({ length: 12 }, (_, i) => i + 13),
  3: Array.from({ length: 12 }, (_, i) => i + 25),
};

export function columnOf(n: number): 1 | 2 | 3 {
  if (!Number.isInteger(n) || n < 1 || n > 36) {
    throw new RangeError(`columnOf: ${n} must be an integer in 1..36`);
  }
  const c = n % 3;
  return (c === 0 ? 3 : c) as 1 | 2 | 3;
}

export function dozenOf(n: number): 1 | 2 | 3 | null {
  if (n === 0) return null;
  if (!Number.isInteger(n) || n < 1 || n > 36) {
    throw new RangeError(`dozenOf: ${n} must be 0..36`);
  }
  return Math.ceil(n / 12) as 1 | 2 | 3;
}

export function isValidSplit(a: number, b: number): boolean {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a === b) return false;
  const [lo, hi] = a < b ? [a, b] : [b, a];
  if (lo < 0 || hi > 36) return false;
  if (lo === 0) return hi === 1 || hi === 2 || hi === 3;
  // Vertical: same street row, adjacent within the column of 3.
  if (hi === lo + 1) return lo % 3 !== 0;
  // Horizontal: same visual row, adjacent across street rows.
  if (hi === lo + 3) return lo >= 1 && lo <= 33;
  return false;
}

export function isValidStreet(rowStart: number): boolean {
  if (!Number.isInteger(rowStart)) return false;
  return rowStart >= 1 && rowStart <= 34 && rowStart % 3 === 1;
}

export function isValidCorner(topLeft: number): boolean {
  if (!Number.isInteger(topLeft)) return false;
  return topLeft >= 1 && topLeft <= 32 && topLeft % 3 !== 0;
}

export function isValidSixLine(rowStart: number): boolean {
  if (!Number.isInteger(rowStart)) return false;
  return rowStart >= 1 && rowStart <= 31 && rowStart % 3 === 1;
}

import type { BetPosition } from './types';

type MakeBetInput =
  | { type: 'straight'; n: number }
  | { type: 'split'; a: number; b: number }
  | { type: 'street'; rowStart: number }
  | { type: 'corner'; topLeft: number }
  | { type: 'six-line'; rowStart: number }
  | { type: 'column'; col: 1 | 2 | 3 }
  | { type: 'dozen'; dozen: 1 | 2 | 3 }
  | { type: 'red' }
  | { type: 'black' }
  | { type: 'odd' }
  | { type: 'even' }
  | { type: 'low' }
  | { type: 'high' };

export function makeBet(input: MakeBetInput): BetPosition {
  switch (input.type) {
    case 'straight': {
      if (!Number.isInteger(input.n) || input.n < 0 || input.n > 36) {
        throw new RangeError(`makeBet straight: n=${input.n} must be 0..36`);
      }
      return {
        key: `straight:${input.n}`,
        type: 'straight',
        numbers: [input.n],
        payoutMultiple: 35,
      };
    }
    case 'split': {
      const [lo, hi] = input.a < input.b ? [input.a, input.b] : [input.b, input.a];
      if (!isValidSplit(lo, hi)) {
        throw new RangeError(`makeBet split: ${lo}-${hi} is not a valid split`);
      }
      return {
        key: `split:${lo}-${hi}`,
        type: 'split',
        numbers: [lo, hi],
        payoutMultiple: 17,
      };
    }
    case 'street': {
      if (!isValidStreet(input.rowStart)) {
        throw new RangeError(`makeBet street: rowStart=${input.rowStart} invalid`);
      }
      return {
        key: `street:${input.rowStart}`,
        type: 'street',
        numbers: [input.rowStart, input.rowStart + 1, input.rowStart + 2],
        payoutMultiple: 11,
      };
    }
    case 'corner': {
      if (!isValidCorner(input.topLeft)) {
        throw new RangeError(`makeBet corner: topLeft=${input.topLeft} invalid`);
      }
      const t = input.topLeft;
      return {
        key: `corner:${t}`,
        type: 'corner',
        numbers: [t, t + 1, t + 3, t + 4],
        payoutMultiple: 8,
      };
    }
    case 'six-line': {
      if (!isValidSixLine(input.rowStart)) {
        throw new RangeError(`makeBet six-line: rowStart=${input.rowStart} invalid`);
      }
      const s = input.rowStart;
      return {
        key: `six-line:${s}`,
        type: 'six-line',
        numbers: [s, s + 1, s + 2, s + 3, s + 4, s + 5],
        payoutMultiple: 5,
      };
    }
    case 'column':
      return {
        key: `column:${input.col}`,
        type: 'column',
        numbers: COLUMN_NUMBERS[input.col],
        payoutMultiple: 2,
      };
    case 'dozen':
      return {
        key: `dozen:${input.dozen}`,
        type: 'dozen',
        numbers: DOZEN_NUMBERS[input.dozen],
        payoutMultiple: 2,
      };
    case 'red':
      return { key: 'red', type: 'red', numbers: RED_NUMBERS_ARRAY, payoutMultiple: 1 };
    case 'black':
      return { key: 'black', type: 'black', numbers: BLACK_NUMBERS_ARRAY, payoutMultiple: 1 };
    case 'odd':
      return { key: 'odd', type: 'odd', numbers: ODD_NUMBERS, payoutMultiple: 1 };
    case 'even':
      return { key: 'even', type: 'even', numbers: EVEN_NUMBERS, payoutMultiple: 1 };
    case 'low':
      return { key: 'low', type: 'low', numbers: LOW_NUMBERS, payoutMultiple: 1 };
    case 'high':
      return { key: 'high', type: 'high', numbers: HIGH_NUMBERS, payoutMultiple: 1 };
  }
}
