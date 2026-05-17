import type { PocketColor } from './types';

/** Counter-clockwise pocket sequence starting from 0. Real European wheel. ADR-0029. */
export const POCKET_ORDER: readonly number[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const;

export const RED_NUMBERS: ReadonlySet<number> = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export function colorOf(n: number): PocketColor {
  if (n === 0) return 'green';
  return RED_NUMBERS.has(n) ? 'red' : 'black';
}

/** Index of N in POCKET_ORDER. Throws if N is not 0..36. */
export function pocketIndexOf(n: number): number {
  if (!Number.isInteger(n) || n < 0 || n > 36) {
    throw new RangeError(`pocketIndexOf: ${n} is not a valid roulette number`);
  }
  const i = POCKET_ORDER.indexOf(n);
  if (i < 0) {
    throw new RangeError(`pocketIndexOf: ${n} not present in POCKET_ORDER (data integrity bug)`);
  }
  return i;
}
