import { describe, expect, it } from 'vitest';
import type { BingoCard } from './logic';
import {
  VARIANTS,
  DIFFICULTY,
  BUY_IN,
  LINE_BONUS,
  TWO_LINE_OR_4CORNERS_BONUS,
  CALL_SPEEDS,
  potFor,
  columnRange,
  generateCard,
  drawCallSequence,
  evaluateCardWins,
  detectNewClaims,
  payoutFor,
  emptyDaubGrid,
  findCellByValue,
} from './logic';

// ---------------------------------------------------------------------------
// VARIANTS config
// ---------------------------------------------------------------------------

describe('VARIANTS config', () => {
  it('british has 3×9 grid with 15 cells, 90 balls', () => {
    const v = VARIANTS.british;
    expect(v.cols).toBe(9);
    expect(v.rows).toBe(3);
    expect(v.cellsPerCard).toBe(15);
    expect(v.ballCount).toBe(90);
    expect(v.hasFreeCenter).toBe(false);
    expect(v.columnRanges).toHaveLength(9);
    expect(v.columnRanges[0]).toEqual([1, 9]);
    expect(v.columnRanges[8]).toEqual([80, 90]);
  });

  it('american has 5×5 grid with 24 cells + free centre, 75 balls', () => {
    const v = VARIANTS.american;
    expect(v.cols).toBe(5);
    expect(v.rows).toBe(5);
    expect(v.cellsPerCard).toBe(24);
    expect(v.ballCount).toBe(75);
    expect(v.hasFreeCenter).toBe(true);
    expect(v.columnRanges).toHaveLength(5);
    expect(v.columnRanges[0]).toEqual([1, 15]);
    expect(v.columnRanges[4]).toEqual([61, 75]);
  });

  it('tier labels are variant-specific', () => {
    expect(VARIANTS.british.tier2Label).toBe('DOUBLE LINE!');
    expect(VARIANTS.american.tier2Label).toBe('FOUR CORNERS!');
    expect(VARIANTS.british.tier3Label).toBe('BINGO!');
    expect(VARIANTS.american.tier3Label).toBe('BLACKOUT!');
  });
});

// ---------------------------------------------------------------------------
// DIFFICULTY config + economy constants
// ---------------------------------------------------------------------------

describe('DIFFICULTY config', () => {
  it('easy has 2 CPUs, pot multiplier 2, slow latency, auto allowed', () => {
    expect(DIFFICULTY.easy.cpuCount).toBe(2);
    expect(DIFFICULTY.easy.potMultiplier).toBe(2);
    expect(DIFFICULTY.easy.cpuLatencyMs).toEqual([200, 500]);
    expect(DIFFICULTY.easy.forceManual).toBe(false);
  });

  it('hard has 9 CPUs, instant latency, manual forced', () => {
    expect(DIFFICULTY.hard.cpuCount).toBe(9);
    expect(DIFFICULTY.hard.cpuLatencyMs).toEqual([0, 0]);
    expect(DIFFICULTY.hard.forceManual).toBe(true);
  });

  it('potFor computes BUY_IN * multiplier', () => {
    expect(potFor('easy')).toBe(100);
    expect(potFor('medium')).toBe(200);
    expect(potFor('hard')).toBe(400);
  });

  it('economy constants', () => {
    expect(BUY_IN).toBe(50);
    expect(LINE_BONUS).toBe(10);
    expect(TWO_LINE_OR_4CORNERS_BONUS).toBe(20);
  });

  it('CALL_SPEEDS values', () => {
    expect(CALL_SPEEDS).toEqual({ slow: 3000, normal: 2000, fast: 1000 });
  });
});

// ---------------------------------------------------------------------------
// columnRange
// ---------------------------------------------------------------------------

describe('columnRange', () => {
  it('british col 0 → [1,9], col 4 → [40,49], col 8 → [80,90]', () => {
    expect(columnRange('british', 0)).toEqual({ min: 1, max: 9 });
    expect(columnRange('british', 4)).toEqual({ min: 40, max: 49 });
    expect(columnRange('british', 8)).toEqual({ min: 80, max: 90 });
  });

  it('american col 0 → [1,15], col 4 → [61,75]', () => {
    expect(columnRange('american', 0)).toEqual({ min: 1, max: 15 });
    expect(columnRange('american', 2)).toEqual({ min: 31, max: 45 });
    expect(columnRange('american', 4)).toEqual({ min: 61, max: 75 });
  });

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
  ])('british column %i → %o', (col, expected) => {
    expect(columnRange('british', col)).toEqual(expected);
  });
});

// ---------------------------------------------------------------------------
// generateCard — british
// ---------------------------------------------------------------------------

describe('generateCard - british', () => {
  it('produces 3×9 grid with exactly 15 filled cells', () => {
    const card = generateCard('test-br-1', 'british');
    expect(card.cells).toHaveLength(3);
    card.cells.forEach((row) => expect(row).toHaveLength(9));
    const filled = card.cells.flat().filter((c) => c.value !== null);
    expect(filled).toHaveLength(15);
  });

  it('each row has exactly 5 filled cells', () => {
    const card = generateCard('test-br-2', 'british');
    card.cells.forEach((row) => {
      expect(row.filter((c) => c.value !== null)).toHaveLength(5);
    });
  });

  it('column values within column range and sorted ascending', () => {
    const card = generateCard('test-br-3', 'british');
    for (let c = 0; c < 9; c += 1) {
      const { min, max } = columnRange('british', c);
      const colValues: number[] = [];
      for (let r = 0; r < 3; r += 1) {
        const v = card.cells[r]![c]!.value;
        if (v !== null) {
          expect(v).toBeGreaterThanOrEqual(min);
          expect(v).toBeLessThanOrEqual(max);
          colValues.push(v);
        }
      }
      const sorted = [...colValues].sort((a, b) => a - b);
      expect(colValues).toEqual(sorted);
    }
  });

  it('deterministic by cardId', () => {
    const a = generateCard('seed-x', 'british');
    const b = generateCard('seed-x', 'british');
    expect(a).toEqual(b);
  });

  it('no `free` flag on any british cell', () => {
    const card = generateCard('test-br-5', 'british');
    card.cells.flat().forEach((c) => expect(c.free).toBeFalsy());
  });

  it('all 15 numbers are distinct', () => {
    const card = generateCard('card-1', 'british');
    const all = card.cells.flat();
    const numbers = all.filter((cell) => cell.value !== null).map((cell) => cell.value!);
    expect(new Set(numbers).size).toBe(15);
  });

  it('produces 100 cards each with 15 distinct numbers within global bounds', () => {
    for (let i = 0; i < 100; i += 1) {
      const c = generateCard('card-' + i, 'british');
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

  it('returns different cards for different cardIds', () => {
    const a = generateCard('card-1', 'british');
    const b = generateCard('card-2', 'british');
    expect(a.cells).not.toEqual(b.cells);
  });
});

// ---------------------------------------------------------------------------
// generateCard — american
// ---------------------------------------------------------------------------

describe('generateCard - american', () => {
  it('produces 5×5 grid', () => {
    const card = generateCard('test-am-1', 'american');
    expect(card.cells).toHaveLength(5);
    card.cells.forEach((row) => expect(row).toHaveLength(5));
  });

  it('centre cell (2,2) is free and has null value', () => {
    const card = generateCard('test-am-2', 'american');
    const centre = card.cells[2]![2]!;
    expect(centre.free).toBe(true);
    expect(centre.value).toBeNull();
  });

  it('non-centre cells have non-null values within column range', () => {
    const card = generateCard('test-am-3', 'american');
    for (let r = 0; r < 5; r += 1) {
      for (let c = 0; c < 5; c += 1) {
        if (r === 2 && c === 2) continue;
        const cell = card.cells[r]![c]!;
        expect(cell.value).not.toBeNull();
        expect(cell.free).toBeFalsy();
        const { min, max } = columnRange('american', c);
        expect(cell.value!).toBeGreaterThanOrEqual(min);
        expect(cell.value!).toBeLessThanOrEqual(max);
      }
    }
  });

  it('all 24 non-centre values are distinct', () => {
    const card = generateCard('test-am-4', 'american');
    const values: number[] = [];
    for (let r = 0; r < 5; r += 1) {
      for (let c = 0; c < 5; c += 1) {
        if (r === 2 && c === 2) continue;
        values.push(card.cells[r]![c]!.value!);
      }
    }
    expect(new Set(values).size).toBe(24);
  });

  it('deterministic by cardId', () => {
    const a = generateCard('seed-y', 'american');
    const b = generateCard('seed-y', 'american');
    expect(a).toEqual(b);
  });
});

// ---------------------------------------------------------------------------
// drawCallSequence
// ---------------------------------------------------------------------------

describe('drawCallSequence', () => {
  it('british returns shuffle of 1..90', () => {
    const seq = drawCallSequence('g1', 'british');
    expect(seq).toHaveLength(90);
    expect(new Set(seq).size).toBe(90);
    expect(Math.min(...seq)).toBe(1);
    expect(Math.max(...seq)).toBe(90);
  });

  it('american returns shuffle of 1..75', () => {
    const seq = drawCallSequence('g2', 'american');
    expect(seq).toHaveLength(75);
    expect(new Set(seq).size).toBe(75);
    expect(Math.min(...seq)).toBe(1);
    expect(Math.max(...seq)).toBe(75);
  });

  it('deterministic by gameId + variant', () => {
    expect(drawCallSequence('s', 'british')).toEqual(drawCallSequence('s', 'british'));
    expect(drawCallSequence('s', 'american')).toEqual(drawCallSequence('s', 'american'));
    expect(drawCallSequence('s', 'british')).not.toEqual(drawCallSequence('s', 'american'));
  });

  it('produces different sequences for different gameIds', () => {
    const a = drawCallSequence('game-1', 'british');
    const b = drawCallSequence('game-2', 'british');
    expect(a).not.toEqual(b);
  });
});

// ---------------------------------------------------------------------------
// emptyDaubGrid
// ---------------------------------------------------------------------------

describe('emptyDaubGrid', () => {
  it('british: 3×9 grid of false', () => {
    const g = emptyDaubGrid('british');
    expect(g).toHaveLength(3);
    g.forEach((row) => {
      expect(row).toHaveLength(9);
      expect(row.every((v) => v === false)).toBe(true);
    });
  });

  it('american: 5×5 grid with centre (2,2) true', () => {
    const g = emptyDaubGrid('american');
    expect(g).toHaveLength(5);
    g.forEach((row) => expect(row).toHaveLength(5));
    expect(g[2]![2]).toBe(true);
    let trueCount = 0;
    g.forEach((row) =>
      row.forEach((v) => {
        if (v) trueCount += 1;
      }),
    );
    expect(trueCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// findCellByValue
// ---------------------------------------------------------------------------

describe('findCellByValue', () => {
  it('british: finds a value on the card', () => {
    const card = generateCard('find-br', 'british');
    const firstFilled = card.cells.flat().find((c) => c.value !== null)!;
    const loc = findCellByValue(card, 'british', firstFilled.value!);
    expect(loc).not.toBeNull();
    expect(card.cells[loc!.row]![loc!.col]!.value).toBe(firstFilled.value);
  });

  it('returns null for value not on card', () => {
    const card = generateCard('find-br-2', 'british');
    expect(findCellByValue(card, 'british', 999)).toBeNull();
  });

  it('american: finds a value on the card', () => {
    const card = generateCard('find-am', 'american');
    const firstFilled = card.cells.flat().find((c) => c.value !== null)!;
    const loc = findCellByValue(card, 'american', firstFilled.value!);
    expect(loc).not.toBeNull();
  });

  it('returns null when the number is not on the card (british)', () => {
    const card = generateCard('card-find-2', 'british');
    const used = new Set(
      card.cells
        .flat()
        .filter((cell) => cell.value !== null)
        .map((cell) => cell.value!),
    );
    let absent = 0;
    for (let n = 1; n <= 90; n += 1) {
      if (!used.has(n)) {
        absent = n;
        break;
      }
    }
    expect(findCellByValue(card, 'british', absent)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// evaluateCardWins — british
// ---------------------------------------------------------------------------

describe('evaluateCardWins - british', () => {
  function fullyDaubed(card: BingoCard): boolean[][] {
    const g = emptyDaubGrid('british');
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 9; c += 1) {
        if (card.cells[r]![c]!.value !== null) g[r]![c] = true;
      }
    }
    return g;
  }

  it('no daubs = no tiers', () => {
    const card = generateCard('eval-br-1', 'british');
    expect(evaluateCardWins(card, emptyDaubGrid('british'), 'british')).toEqual({
      tier1: false,
      tier2: false,
      tier3: false,
    });
  });

  it('one full row = tier1 only', () => {
    const card = generateCard('eval-br-2', 'british');
    const g = emptyDaubGrid('british');
    for (let c = 0; c < 9; c += 1) {
      if (card.cells[0]![c]!.value !== null) g[0]![c] = true;
    }
    const wins = evaluateCardWins(card, g, 'british');
    expect(wins.tier1).toBe(true);
    expect(wins.tier2).toBe(false);
    expect(wins.tier3).toBe(false);
  });

  it('two full rows = tier1 + tier2', () => {
    const card = generateCard('eval-br-3', 'british');
    const g = emptyDaubGrid('british');
    for (let r = 0; r < 2; r += 1) {
      for (let c = 0; c < 9; c += 1) {
        if (card.cells[r]![c]!.value !== null) g[r]![c] = true;
      }
    }
    const wins = evaluateCardWins(card, g, 'british');
    expect(wins.tier1).toBe(true);
    expect(wins.tier2).toBe(true);
    expect(wins.tier3).toBe(false);
  });

  it('all rows = all tiers', () => {
    const card = generateCard('eval-br-4', 'british');
    expect(evaluateCardWins(card, fullyDaubed(card), 'british')).toEqual({
      tier1: true,
      tier2: true,
      tier3: true,
    });
  });
});

// ---------------------------------------------------------------------------
// evaluateCardWins — american
// ---------------------------------------------------------------------------

describe('evaluateCardWins - american', () => {
  function row(grid: boolean[][], r: number): void {
    for (let c = 0; c < 5; c += 1) grid[r]![c] = true;
  }
  function col(grid: boolean[][], c: number): void {
    for (let r = 0; r < 5; r += 1) grid[r]![c] = true;
  }

  it('only free centre daubed = no tiers', () => {
    const card = generateCard('eval-am-1', 'american');
    const g = emptyDaubGrid('american');
    const wins = evaluateCardWins(card, g, 'american');
    expect(wins).toEqual({ tier1: false, tier2: false, tier3: false });
  });

  it('full row 0 = tier1', () => {
    const card = generateCard('eval-am-2', 'american');
    const g = emptyDaubGrid('american');
    row(g, 0);
    expect(evaluateCardWins(card, g, 'american').tier1).toBe(true);
  });

  it('full column 4 = tier1', () => {
    const card = generateCard('eval-am-3', 'american');
    const g = emptyDaubGrid('american');
    col(g, 4);
    expect(evaluateCardWins(card, g, 'american').tier1).toBe(true);
  });

  it('diagonal NW-SE = tier1 (free centre helps)', () => {
    const card = generateCard('eval-am-4', 'american');
    const g = emptyDaubGrid('american');
    for (let i = 0; i < 5; i += 1) g[i]![i] = true;
    expect(evaluateCardWins(card, g, 'american').tier1).toBe(true);
  });

  it('four corners daubed = tier2 (not tier1 alone)', () => {
    const card = generateCard('eval-am-5', 'american');
    const g = emptyDaubGrid('american');
    g[0]![0] = true;
    g[0]![4] = true;
    g[4]![0] = true;
    g[4]![4] = true;
    const wins = evaluateCardWins(card, g, 'american');
    expect(wins.tier1).toBe(false);
    expect(wins.tier2).toBe(true);
  });

  it('all 24 non-free cells = tier3 (blackout)', () => {
    const card = generateCard('eval-am-6', 'american');
    const g = emptyDaubGrid('american');
    for (let r = 0; r < 5; r += 1) {
      for (let c = 0; c < 5; c += 1) {
        if (r === 2 && c === 2) continue;
        g[r]![c] = true;
      }
    }
    const wins = evaluateCardWins(card, g, 'american');
    expect(wins.tier1).toBe(true);
    expect(wins.tier2).toBe(true);
    expect(wins.tier3).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// detectNewClaims
// ---------------------------------------------------------------------------

describe('detectNewClaims', () => {
  it('returns only unclaimed tiers in order', () => {
    const card = generateCard('claim-1', 'british');
    const g = emptyDaubGrid('british');
    for (let r = 0; r < 2; r += 1) {
      for (let c = 0; c < 9; c += 1) {
        if (card.cells[r]![c]!.value !== null) g[r]![c] = true;
      }
    }
    expect(detectNewClaims(card, g, 'british', new Set())).toEqual(['tier1', 'tier2']);
    expect(detectNewClaims(card, g, 'british', new Set(['tier1']))).toEqual(['tier2']);
    expect(detectNewClaims(card, g, 'british', new Set(['tier1', 'tier2']))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// payoutFor
// ---------------------------------------------------------------------------

describe('payoutFor', () => {
  it('tier1 → 10, tier2 → 20, tier3 → pot', () => {
    expect(payoutFor('tier1', 999)).toBe(10);
    expect(payoutFor('tier2', 999)).toBe(20);
    expect(payoutFor('tier3', 400)).toBe(400);
    expect(payoutFor('tier3', 100)).toBe(100);
  });
});
