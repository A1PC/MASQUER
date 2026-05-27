import type { JSX, ReactNode } from 'react';
import { ROW_COUNT, pegPosition } from './geometry';

interface Props {
  children?: ReactNode; // FallingBall overlays
}

// Bound the board by the smaller of (vh, vw) so it always fits on screen
// without scrolling in either direction. Tuned to leave headroom for the
// AppLayout TopBar/Sidebar chrome, page header, bin row, and drop controls.
const BOARD_SIZE = 'min(60vh, 50vw)';

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

  return (
    <div
      className="relative mx-auto"
      style={{ width: BOARD_SIZE, height: BOARD_SIZE }}
      data-plinko-board
    >
      <div className="relative h-full w-full" data-peg-field>
        {pegs}
        {children}
      </div>
    </div>
  );
}
