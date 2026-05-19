import { describe, expect, it } from 'vitest';
import type { BingoCard, BingoTier } from './logic';
import { generateCard, columnRange, drawCallSequence, evaluateCardWins } from './logic';

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

describe('drawCallSequence', () => {
  it('returns 90 numbers', () => {
    const seq = drawCallSequence('game-1');
    expect(seq).toHaveLength(90);
  });

  it('contains every number from 1 to 90 exactly once', () => {
    const seq = drawCallSequence('game-1');
    expect(new Set(seq).size).toBe(90);
    for (const n of seq) {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(90);
    }
  });

  it('is deterministic for the same gameId', () => {
    const a = drawCallSequence('game-1');
    const b = drawCallSequence('game-1');
    expect(a).toEqual(b);
  });

  it('produces different sequences for different gameIds', () => {
    const a = drawCallSequence('game-1');
    const b = drawCallSequence('game-2');
    expect(a).not.toEqual(b);
  });
});

function buildCard(rows: Array<Array<number | null>>): BingoCard {
  return {
    id: 'test',
    cells: rows.map((row) => row.map((v) => ({ value: v }))),
  };
}

const EMPTY_TIERS = new Set<BingoTier>();

describe('evaluateCardWins', () => {
  const card = buildCard([
    [1, 11, 21, null, 41, 51, null, null, 81],
    [2, 12, null, 31, 42, null, 61, 71, null],
    [null, 13, 22, 32, null, 52, 62, null, 82],
  ]);
  const daubAll: boolean[][] = [
    [true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true],
  ];
  const daubNone: boolean[][] = [
    [false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false],
  ];

  it('returns no tiers when nothing daubed', () => {
    expect(
      evaluateCardWins({ card, daubed: daubNone, callCount: 5, previouslyAchieved: EMPTY_TIERS }),
    ).toEqual([]);
  });

  it('fires 1-line when first row fully daubed', () => {
    const daub: boolean[][] = JSON.parse(JSON.stringify(daubNone));
    for (let c = 0; c < 9; c += 1) {
      if (card.cells[0]![c]!.value !== null) daub[0]![c] = true;
    }
    const result = evaluateCardWins({
      card,
      daubed: daub,
      callCount: 25,
      previouslyAchieved: EMPTY_TIERS,
    });
    expect(result).toEqual(['1-line']);
  });

  it('fires 2-line when two rows fully daubed', () => {
    const daub: boolean[][] = JSON.parse(JSON.stringify(daubNone));
    for (let r = 0; r < 2; r += 1) {
      for (let c = 0; c < 9; c += 1) {
        if (card.cells[r]![c]!.value !== null) daub[r]![c] = true;
      }
    }
    const result = evaluateCardWins({
      card,
      daubed: daub,
      callCount: 50,
      previouslyAchieved: new Set(['1-line']),
    });
    expect(result).toEqual(['2-line']);
  });

  it('fires full-house when all rows daubed and callCount > FAST_FH_THRESHOLD', () => {
    const result = evaluateCardWins({
      card,
      daubed: daubAll,
      callCount: 85,
      previouslyAchieved: new Set(['1-line', '2-line']),
    });
    expect(result).toEqual(['full-house']);
  });

  it('fires fast-full-house when all rows daubed and callCount <= FAST_FH_THRESHOLD', () => {
    const result = evaluateCardWins({
      card,
      daubed: daubAll,
      callCount: 40,
      previouslyAchieved: new Set(['1-line', '2-line']),
    });
    expect(result).toEqual(['fast-full-house']);
  });

  it('fast-FH threshold is inclusive at 40, exclusive at 41', () => {
    const r40 = evaluateCardWins({
      card,
      daubed: daubAll,
      callCount: 40,
      previouslyAchieved: new Set(['1-line', '2-line']),
    });
    expect(r40).toEqual(['fast-full-house']);
    const r41 = evaluateCardWins({
      card,
      daubed: daubAll,
      callCount: 41,
      previouslyAchieved: new Set(['1-line', '2-line']),
    });
    expect(r41).toEqual(['full-house']);
  });

  it('does not re-fire a previously achieved tier', () => {
    const result = evaluateCardWins({
      card,
      daubed: daubAll,
      callCount: 85,
      previouslyAchieved: new Set(['1-line', '2-line', 'full-house']),
    });
    expect(result).toEqual([]);
  });
});
