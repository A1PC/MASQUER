import type { JSX } from 'react';
import { BEAD_PLATE_ROWS, BEAD_PLATE_VISIBLE_COLS } from './config';
import type { BeadCell } from './types';

interface Props {
  cells: readonly BeadCell[];
}

const COLOR: Record<BeadCell['winner'], string> = {
  player: 'bg-casino-red',
  banker: 'bg-blue-500',
  tie: 'bg-chip-win',
};

export default function BeadPlate({ cells }: Props): JSX.Element {
  const visibleCols = BEAD_PLATE_VISIBLE_COLS;
  const totalSlots = BEAD_PLATE_ROWS * visibleCols;
  const drawn = cells.slice(-totalSlots);

  return (
    <div
      className="grid gap-[2px]"
      style={{
        gridTemplateColumns: `repeat(${visibleCols}, 16px)`,
        gridTemplateRows: `repeat(${BEAD_PLATE_ROWS}, 16px)`,
        gridAutoFlow: 'column',
      }}
      data-baccarat-board="bead-plate"
    >
      {Array.from({ length: totalSlots }).map((_, i) => {
        const cell = drawn[i];
        if (!cell) {
          return <div key={i} className="rounded-sm bg-white/[0.03]" />;
        }
        return (
          <div
            key={i}
            className={`relative rounded-full ${COLOR[cell.winner]}`}
            aria-label={`Round ${i + 1}: ${cell.winner}`}
            data-bead-winner={cell.winner}
          >
            {cell.playerPair && (
              <div className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-casino-red ring-1 ring-white" />
            )}
            {cell.bankerPair && (
              <div className="absolute right-0 top-0 h-1.5 w-1.5 rounded-full bg-blue-500 ring-1 ring-white" />
            )}
          </div>
        );
      })}
    </div>
  );
}
