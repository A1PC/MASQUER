import type { JSX } from 'react';
import { BEAD_PLATE_ROWS, BEAD_PLATE_VISIBLE_COLS } from './config';
import type { BeadCell } from './types';

interface Props {
  cells: readonly BeadCell[];
}

/**
 * Bead-plate cell colour: scoreboard tokens promoted in Phase 15 #8
 * (`scoreboard-banker / -player / -tie`) so the brand can swap the
 * red / blue / green casino convention without touching components.
 */
const COLOR: Record<BeadCell['winner'], string> = {
  player: 'bg-scoreboard-player',
  banker: 'bg-scoreboard-banker',
  tie: 'bg-scoreboard-tie',
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
          return <div key={i} className="rounded-sm bg-ivory/[0.04]" />;
        }
        return (
          <div
            key={i}
            className={`relative rounded-full ${COLOR[cell.winner]}`}
            aria-label={`Round ${i + 1}: ${cell.winner}`}
            data-bead-winner={cell.winner}
          >
            {cell.playerPair && (
              <div className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-scoreboard-player ring-1 ring-ivory" />
            )}
            {cell.bankerPair && (
              <div className="absolute right-0 top-0 h-1.5 w-1.5 rounded-full bg-scoreboard-banker ring-1 ring-ivory" />
            )}
          </div>
        );
      })}
    </div>
  );
}
