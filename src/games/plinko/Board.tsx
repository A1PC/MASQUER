import type { JSX, ReactNode } from 'react';
import { ROW_COUNT, pegPosition } from './geometry';

interface Props {
  children?: ReactNode; // FallingBall overlays
}

/** Triangular peg pyramid — row R renders R+1 brass pegs, positioned via
 *  `pegPosition(row, col)` (percentages of the absolute container). Row 0 is
 *  a single peg at the apex; row 25 is the 26-peg base. Children (typically
 *  one or more `<FallingBall>`s) overlay the same coordinate space so their
 *  keyframes consume the same geometry helpers.
 *
 *  The wrapper sets `h-[78vh]` to fill ~70-80% of the viewport (the focal
 *  piece of the screen) and `aspect-square` so width tracks height and the
 *  geometry stays equilateral. Pegs render absolutely-positioned inside the
 *  inner `.relative` field; `data-row` + `data-col` are exposed for tests. */
export default function Board({ children }: Props): JSX.Element {
  const pegs: JSX.Element[] = [];
  for (let row = 0; row < ROW_COUNT; row += 1) {
    for (let col = 0; col <= row; col += 1) {
      const { x, y } = pegPosition(row, col);
      pegs.push(
        <span
          key={`${row}-${col}`}
          className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brass shadow-[0_0_2px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,236,179,0.7)]"
          style={{ left: `${x}%`, top: `${y}%` }}
          data-peg
          data-row={row}
          data-col={col}
        />,
      );
    }
  }

  // The container fits the pyramid (height-bound) and provides the brass-framed
  // velvet panel that wraps both the peg field and any bin row a parent renders
  // beneath. We render a separate inner `.relative` for the pegs so the percent
  // coordinates are interpreted within the actual peg-field box.
  return (
    <div
      className="relative mx-auto h-[78vh] aspect-square rounded-lg border border-brass/60 bg-felt-table p-2 shadow-[0_2px_0_rgba(0,0,0,0.4)]"
      data-plinko-board
    >
      <div className="relative h-full w-full" data-peg-field>
        {pegs}
        {children}
      </div>
    </div>
  );
}
