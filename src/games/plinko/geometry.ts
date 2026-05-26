/**
 * Plinko peg-pyramid geometry — pure math, no React.
 *
 * The board is a triangular peg pyramid: row R has R+1 pegs, with row 0 a
 * single peg at the apex (x=50%) and row 25 a base of 26 pegs. Each peg sits
 * in the gap between two pegs in the row above. The 27 buckets sit immediately
 * below the bottom peg row (row 25), each bucket centred on a peg gap.
 *
 * Coordinates are in board-relative percentages (0..100), where x=0 is the
 * board's left edge and y=0 is the apex (top). This lets `pegPosition` and
 * `binCentreX` agree with `FallingBall`'s keyframes regardless of the
 * physical pixel size of the board.
 *
 * Critical invariant (pinned in tests): for any drop, the final-frame x of
 * the ball must equal `binCentreX(bin)` where bin = count of 'R' choices.
 * If this drifts, the visible bucket no longer matches the resolved outcome.
 */

export const ROW_COUNT = 26;
export const BIN_COUNT = ROW_COUNT + 1; // 27

/** Peg position (x%, y%) for row R, column C (0 ≤ C ≤ R).
 *
 *  Layout: row R has R+1 pegs spanning `R / (ROW_COUNT - 1)` of the board width,
 *  centred. Row 0 has a single peg at x=50% (apex). Row R=ROW_COUNT-1 spans
 *  the full width with ROW_COUNT pegs. Step between adjacent pegs in row R
 *  is the constant `stepX = 100 / (ROW_COUNT - 1)` (4% for ROW_COUNT=26).
 *  Y is linear from 0 (apex) to 100% (bottom of peg field). */
export function pegPosition(row: number, col: number): { x: number; y: number } {
  if (row < 0 || row >= ROW_COUNT)
    throw new RangeError(`row ${row} out of range [0, ${ROW_COUNT})`);
  if (col < 0 || col > row) throw new RangeError(`col ${col} out of range for row ${row}`);
  // Constant horizontal step between adjacent pegs (and between adjacent rows
  // shifted by half a step — classic equilateral triangle layout).
  const stepX = 100 / (ROW_COUNT - 1);
  const rowWidth = row * stepX;
  const startX = 50 - rowWidth / 2;
  const x = startX + col * stepX;
  const y = (row / (ROW_COUNT - 1)) * 100;
  return { x, y };
}

/** Bin centre x% — bin B sits in the gap between peg(lastRow, B-1) and peg(lastRow, B).
 *
 *  The bottom peg row (row 25) has ROW_COUNT pegs that create ROW_COUNT + 1 = 27 gaps
 *  (one to the left of the leftmost peg, one between each adjacent pair, and one to
 *  the right of the rightmost peg). Bin B's centre is at the midpoint of the gap
 *  between peg(lastRow, B-1) and peg(lastRow, B), where peg(lastRow, -1) and
 *  peg(lastRow, lastRow + 1) are the virtual outside-edge anchors at startX - stepX
 *  and startX + (lastRow + 1) * stepX respectively. */
export function binCentreX(bin: number): number {
  if (bin < 0 || bin >= BIN_COUNT)
    throw new RangeError(`bin ${bin} out of range [0, ${BIN_COUNT})`);
  const stepX = 100 / (ROW_COUNT - 1);
  // Bottom row (R = ROW_COUNT-1 = 25) has ROW_COUNT pegs at x = 0, stepX, 2*stepX,
  // ..., (ROW_COUNT-1)*stepX = 100, plus virtual outside anchors at -stepX and
  // 100 + stepX. Bin B sits at midpoint of peg (lastRow, B-1) and peg (lastRow, B),
  // = (B-1)*stepX + stepX/2 = (B - 0.5) * stepX.
  return (bin - 0.5) * stepX;
}

/** Resolve a drop path to per-row peg columns. path[r] is the bounce DIRECTION
 *  taken at peg (r, col), so the next peg is (r+1, col + (path[r] === 'R' ? 1 : 0)).
 *  Returns an array of length ROW_COUNT + 1 giving the column the ball
 *  OCCUPIES at each row (col[0] = 0 at the apex, col[ROW_COUNT] = bin index). */
export function pathColumns(path: readonly ('L' | 'R')[]): number[] {
  if (path.length !== ROW_COUNT) {
    throw new RangeError(`path length ${path.length} != ROW_COUNT ${ROW_COUNT}`);
  }
  const cols: number[] = [0];
  let col = 0;
  for (let r = 0; r < ROW_COUNT; r += 1) {
    if (path[r] === 'R') col += 1;
    cols.push(col);
  }
  return cols;
}
