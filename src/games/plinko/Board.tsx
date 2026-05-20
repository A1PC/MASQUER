import type { JSX, ReactNode } from 'react';
import { ROW_COUNT } from './logic';

interface Props {
  children?: ReactNode; // FallingBall overlays
}

/** Static peg layout. Row r has (r + 3) pegs.
 *  Pegs render as 6px gold dots; geometry is calibrated so the bin row aligns
 *  perfectly beneath. Children are absolutely-positioned overlays (FallingBalls). */
export default function Board({ children }: Props): JSX.Element {
  const rows = [];
  for (let r = 0; r < ROW_COUNT; r += 1) {
    const pegs = [];
    const pegCount = r + 3;
    for (let p = 0; p < pegCount; p += 1) {
      pegs.push(
        <span key={p} className="inline-block w-1.5 h-1.5 rounded-full bg-gold" data-peg />,
      );
    }
    rows.push(
      <div
        key={r}
        className="flex justify-center"
        style={{ gap: '14px', marginTop: r === 0 ? 0 : '10px' }}
        data-peg-row={r}
      >
        {pegs}
      </div>,
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-[600px]" data-plinko-board>
      <div className="p-4">{rows}</div>
      {children}
    </div>
  );
}
