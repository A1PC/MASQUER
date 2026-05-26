import type { JSX } from 'react';
import { BIG_ROAD_ROWS, BIG_ROAD_VISIBLE_COLS } from './config';
import type { BigRoadCell } from './types';

interface Props {
  columns: readonly (readonly BigRoadCell[])[];
}

/**
 * Big-road ring colour: scoreboard tokens promoted in Phase 15 #8 so the
 * canonical Banker-red / Player-blue convention is brand-tweakable
 * without touching components.
 */
const RING: Record<BigRoadCell['winner'], string> = {
  player: 'ring-scoreboard-player text-scoreboard-player',
  banker: 'ring-scoreboard-banker text-scoreboard-banker',
};

export default function BigRoad({ columns }: Props): JSX.Element {
  const visible = columns.slice(-BIG_ROAD_VISIBLE_COLS);
  return (
    <div
      className="grid gap-[2px]"
      style={{
        gridTemplateColumns: `repeat(${BIG_ROAD_VISIBLE_COLS}, 18px)`,
        gridTemplateRows: `repeat(${BIG_ROAD_ROWS}, 18px)`,
        gridAutoFlow: 'column',
      }}
      data-baccarat-board="big-road"
    >
      {Array.from({ length: BIG_ROAD_VISIBLE_COLS }).map((_, colIdx) => {
        const col = visible[colIdx] ?? [];
        return Array.from({ length: BIG_ROAD_ROWS }).map((__, rowIdx) => {
          const cell = col[rowIdx];
          if (!cell) {
            return <div key={`${colIdx}-${rowIdx}`} className="rounded-sm bg-ivory/[0.04]" />;
          }
          return (
            <div
              key={`${colIdx}-${rowIdx}`}
              data-big-road-winner={cell.winner}
              className={`relative grid place-items-center rounded-full bg-felt-table-deep text-[10px] font-bold ring-2 ${RING[cell.winner]}`}
            >
              {cell.ties > 0 && <span className="leading-none">{cell.ties}</span>}
            </div>
          );
        });
      })}
    </div>
  );
}
