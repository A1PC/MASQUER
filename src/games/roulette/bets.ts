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
