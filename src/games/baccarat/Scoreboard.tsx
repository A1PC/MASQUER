import type { JSX } from 'react';
import BeadPlate from './BeadPlate';
import BigRoad from './BigRoad';
import { getBeadPlate, getBigRoad, type ScoreboardEntry } from './logic';

interface Props {
  /** Round history, oldest-first. */
  history: readonly ScoreboardEntry[];
}

export default function Scoreboard({ history }: Props): JSX.Element {
  const bead = getBeadPlate(history);
  const bigRoad = getBigRoad(history);
  return (
    <div className="flex flex-col gap-3 rounded border border-white/15 bg-felt-deep p-3">
      <div>
        <div className="mb-1 font-display text-[10px] tracking-[0.2em] text-gold">BEAD PLATE</div>
        <BeadPlate cells={bead} />
      </div>
      <div>
        <div className="mb-1 font-display text-[10px] tracking-[0.2em] text-gold">BIG ROAD</div>
        <BigRoad columns={bigRoad} />
      </div>
    </div>
  );
}
