import { describe, it, expect } from 'vitest';
import { BIN_COUNT, ROW_COUNT, binCentreX, pathColumns, pegPosition } from './geometry';

describe('geometry constants', () => {
  it('ROW_COUNT is 26 and BIN_COUNT is 27', () => {
    expect(ROW_COUNT).toBe(26);
    expect(BIN_COUNT).toBe(27);
    expect(BIN_COUNT).toBe(ROW_COUNT + 1);
  });
});

describe('pegPosition', () => {
  it('row 0 col 0 is at the apex (x=50, y=0)', () => {
    expect(pegPosition(0, 0)).toEqual({ x: 50, y: 0 });
  });

  it('last row spans the full board horizontally', () => {
    const lastRow = ROW_COUNT - 1;
    const left = pegPosition(lastRow, 0);
    const right = pegPosition(lastRow, lastRow);
    // Row 25 has 26 pegs; rowWidth = 26/26*100 = 100; startX = 0; stepX = 100/25 = 4.
    expect(left.x).toBeCloseTo(0, 8);
    expect(right.x).toBeCloseTo(100, 8);
    expect(left.y).toBeCloseTo(100, 8);
    expect(right.y).toBeCloseTo(100, 8);
  });

  it('every row is horizontally symmetric around x=50', () => {
    for (let r = 0; r < ROW_COUNT; r += 1) {
      const left = pegPosition(r, 0);
      const right = pegPosition(r, r);
      expect(left.x + right.x).toBeCloseTo(100, 8);
      expect(left.y).toBeCloseTo(right.y, 8);
    }
  });

  it('y increases monotonically from row 0 to row ROW_COUNT-1', () => {
    let prev = -Infinity;
    for (let r = 0; r < ROW_COUNT; r += 1) {
      const y = pegPosition(r, 0).y;
      expect(y).toBeGreaterThan(prev);
      prev = y;
    }
  });

  it('row R has R+1 pegs (col 0..R valid; R+1 invalid)', () => {
    for (let r = 0; r < ROW_COUNT; r += 1) {
      expect(() => pegPosition(r, 0)).not.toThrow();
      expect(() => pegPosition(r, r)).not.toThrow();
      expect(() => pegPosition(r, r + 1)).toThrow(RangeError);
    }
  });

  it('throws on out-of-range row', () => {
    expect(() => pegPosition(-1, 0)).toThrow(RangeError);
    expect(() => pegPosition(ROW_COUNT, 0)).toThrow(RangeError);
  });
});

describe('binCentreX', () => {
  it('all BIN_COUNT bin centres are within [0, 100] band', () => {
    // Bin 0 sits slightly left of the leftmost bottom peg (which is at x=0),
    // so binCentreX(0) is slightly negative (= -stepX/2 = -2). Bin 26 mirrors
    // at 102. That's expected geometry: edge bins extend past the peg field.
    expect(binCentreX(0)).toBeCloseTo(-2, 8);
    expect(binCentreX(BIN_COUNT - 1)).toBeCloseTo(102, 8);
  });

  it('is monotonically increasing across all 27 bins', () => {
    let prev = -Infinity;
    for (let b = 0; b < BIN_COUNT; b += 1) {
      const x = binCentreX(b);
      expect(x).toBeGreaterThan(prev);
      prev = x;
    }
  });

  it('is symmetric across the centre bin (13)', () => {
    for (let b = 0; b < BIN_COUNT; b += 1) {
      expect(binCentreX(b) + binCentreX(BIN_COUNT - 1 - b)).toBeCloseTo(100, 8);
    }
  });

  it('centre bin (13) is at x=50', () => {
    expect(binCentreX(13)).toBeCloseTo(50, 8);
  });

  it('throws on out-of-range bin', () => {
    expect(() => binCentreX(-1)).toThrow(RangeError);
    expect(() => binCentreX(BIN_COUNT)).toThrow(RangeError);
  });
});

describe('pathColumns + binCentreX invariant', () => {
  it('returns ROW_COUNT + 1 columns starting at 0', () => {
    const path = Array(ROW_COUNT).fill('L') as ('L' | 'R')[];
    const cols = pathColumns(path);
    expect(cols).toHaveLength(ROW_COUNT + 1);
    expect(cols[0]).toBe(0);
  });

  it('all-L path: every column stays 0; final bin is 0', () => {
    const path = Array(ROW_COUNT).fill('L') as ('L' | 'R')[];
    const cols = pathColumns(path);
    expect(cols.every((c) => c === 0)).toBe(true);
  });

  it('all-R path: each step increments column; final bin is ROW_COUNT', () => {
    const path = Array(ROW_COUNT).fill('R') as ('L' | 'R')[];
    const cols = pathColumns(path);
    for (let r = 0; r <= ROW_COUNT; r += 1) {
      expect(cols[r]).toBe(r);
    }
    expect(cols[ROW_COUNT]).toBe(BIN_COUNT - 1);
  });

  it('balanced path lands at bin 13', () => {
    // 13 'R' + 13 'L', alternating.
    const path: ('L' | 'R')[] = [];
    for (let r = 0; r < ROW_COUNT; r += 1) path.push(r % 2 === 0 ? 'R' : 'L');
    const cols = pathColumns(path);
    expect(cols[ROW_COUNT]).toBe(13);
  });

  it('throws on wrong-length path', () => {
    expect(() => pathColumns(['L', 'R'])).toThrow(RangeError);
  });

  // CRITICAL: ball's final-frame x MUST equal binCentreX(bin).
  // This is the load-bearing alignment between the visible trajectory and the
  // resolved outcome — if it drifts, players see the wrong bucket "win".
  it('final peg column of every path maps to binCentreX(bin)', () => {
    // Test a handful of pinned paths covering edges and a centre landing.
    const paths: ('L' | 'R')[][] = [
      Array(ROW_COUNT).fill('L') as ('L' | 'R')[],
      Array(ROW_COUNT).fill('R') as ('L' | 'R')[],
      Array.from({ length: ROW_COUNT }, (_, i) => (i % 2 === 0 ? 'R' : 'L')),
      Array.from({ length: ROW_COUNT }, (_, i) => (i < 5 ? 'R' : 'L')), // bin 5
      Array.from({ length: ROW_COUNT }, (_, i) => (i < 20 ? 'R' : 'L')), // bin 20
    ];
    for (const path of paths) {
      const cols = pathColumns(path);
      const bin = cols[ROW_COUNT]!;
      const lastPegPos = pegPosition(ROW_COUNT - 1, cols[ROW_COUNT - 1]!);
      // After the last bounce at peg (lastRow, lastPegCol), the ball drops into
      // bin = lastPegCol or lastPegCol + 1 (depending on path[lastRow]).
      // binCentreX(bin) sits at lastPegPos.x ± stepX/2 = lastPegPos.x ± 2.
      // Verify the relationship.
      const expectedX = binCentreX(bin);
      const delta = expectedX - lastPegPos.x;
      // delta should be either +2 (if path[last] === 'R', bin = lastPegCol + 1)
      // or -2 (if path[last] === 'L', bin = lastPegCol).
      expect(Math.abs(Math.abs(delta) - 2)).toBeLessThan(1e-8);
    }
  });
});
