import type { JSX } from 'react';
import BeadPlate from './BeadPlate';
import BigRoad from './BigRoad';
import { getBeadPlate, getBigRoad, type ScoreboardEntry } from './logic';

interface Props {
  /** Round history, oldest-first. */
  history: readonly ScoreboardEntry[];
}

/**
 * Scoreboard panel — bead plate above, big road below. Tokenised
 * brass-on-felt to sit beside the table without competing with the
 * card-reveal stage.
 */
export default function Scoreboard({ history }: Props): JSX.Element {
  const bead = getBeadPlate(history);
  const bigRoad = getBigRoad(history);
  return (
    <div
      className="flex flex-col gap-3 rounded-md border border-brass/40 bg-felt-table-deep p-3 shadow-velvet-panel"
      data-baccarat-scoreboard
    >
      <div>
        <div className="mb-1 font-display text-[10px] uppercase tracking-[0.2em] text-gold">
          BEAD PLATE
        </div>
        <BeadPlate cells={bead} />
      </div>
      <div>
        <div className="mb-1 font-display text-[10px] uppercase tracking-[0.2em] text-gold">
          BIG ROAD
        </div>
        <BigRoad columns={bigRoad} />
      </div>
    </div>
  );
}
