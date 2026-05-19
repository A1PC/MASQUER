import { describe, expect, it } from 'vitest';
import { generateCard, columnRange } from './logic';

describe('columnRange', () => {
  it.each([
    [0, { min: 1, max: 9 }],
    [1, { min: 10, max: 19 }],
    [2, { min: 20, max: 29 }],
    [3, { min: 30, max: 39 }],
    [4, { min: 40, max: 49 }],
    [5, { min: 50, max: 59 }],
    [6, { min: 60, max: 69 }],
    [7, { min: 70, max: 79 }],
    [8, { min: 80, max: 90 }],
  ])('column %i → %o', (col, expected) => {
    expect(columnRange(col)).toEqual(expected);
  });
});

describe('generateCard — structural invariants', () => {
  it('has 3 rows × 9 columns', () => {
    const c = generateCard('card-1');
    expect(c.cells).toHaveLength(3);
    for (const row of c.cells) expect(row).toHaveLength(9);
  });

  it('each row has exactly 5 filled cells', () => {
    const c = generateCard('card-1');
    for (const row of c.cells) {
      const filled = row.filter((cell) => cell.value !== null);
      expect(filled).toHaveLength(5);
    }
  });

  it('has exactly 15 filled cells total', () => {
    const c = generateCard('card-1');
    const all = c.cells.flat();
    const filled = all.filter((cell) => cell.value !== null);
    expect(filled).toHaveLength(15);
  });

  it('all 15 numbers are distinct', () => {
    const c = generateCard('card-1');
    const all = c.cells.flat();
    const numbers = all.filter((cell) => cell.value !== null).map((cell) => cell.value!);
    expect(new Set(numbers).size).toBe(15);
  });

  it('column number ranges are respected', () => {
    const c = generateCard('card-1');
    for (let col = 0; col < 9; col += 1) {
      const { min, max } = columnRange(col);
      for (let row = 0; row < 3; row += 1) {
        const value = c.cells[row]![col]!.value;
        if (value === null) continue;
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThanOrEqual(max);
      }
    }
  });

  it('numbers within each column are sorted ascending top-to-bottom', () => {
    const c = generateCard('card-1');
    for (let col = 0; col < 9; col += 1) {
      const colValues: number[] = [];
      for (let row = 0; row < 3; row += 1) {
        const value = c.cells[row]![col]!.value;
        if (value !== null) colValues.push(value);
      }
      const sorted = [...colValues].sort((a, b) => a - b);
      expect(colValues).toEqual(sorted);
    }
  });
});

describe('generateCard — determinism', () => {
  it('returns the same card for the same cardId', () => {
    const a = generateCard('card-1');
    const b = generateCard('card-1');
    expect(a).toEqual(b);
  });

  it('returns different cards for different cardIds', () => {
    const a = generateCard('card-1');
    const b = generateCard('card-2');
    expect(a.cells).not.toEqual(b.cells);
  });
});

describe('generateCard — multiple cards distribution sanity', () => {
  it('produces 100 cards each with 15 distinct numbers within global bounds', () => {
    for (let i = 0; i < 100; i += 1) {
      const c = generateCard('card-' + i);
      const numbers = c.cells
        .flat()
        .filter((cell) => cell.value !== null)
        .map((cell) => cell.value!);
      expect(numbers).toHaveLength(15);
      expect(new Set(numbers).size).toBe(15);
      for (const n of numbers) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(90);
      }
    }
  });
});
