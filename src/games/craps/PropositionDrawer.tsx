import type { JSX } from 'react';
import { useState } from 'react';
import BetSpot from './BetSpot';
import { BET_TYPES } from './bets';
import type { Phase } from './bets';
import type { ActiveBet } from './resolveRoll';

const PROP_BET_IDS = [
  'hard-4',
  'hard-6',
  'hard-8',
  'hard-10',
  'any-7',
  'any-craps',
  'prop-2',
  'prop-3',
  'prop-11',
  'prop-12',
  'horn',
  'c-and-e',
] as const;

interface Props {
  phase: Phase;
  point: number | null;
  bets: ActiveBet[];
  onPlace: (betId: string) => void;
  onRemove: (betId: string) => void;
}

export default function PropositionDrawer({
  phase,
  point,
  bets,
  onPlace,
  onRemove,
}: Props): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded border border-purple-500/30 bg-purple-900/20">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 font-display text-[10px] uppercase tracking-wider text-purple-300 hover:bg-purple-900/30"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        data-prop-drawer-toggle
      >
        <span>Proposition Bets</span>
        <span>{open ? '▴' : '▸'}</span>
      </button>

      {open && (
        <div className="grid grid-cols-4 gap-1.5 px-2 pb-2 sm:grid-cols-6">
          {PROP_BET_IDS.map((betId) => {
            const betType = BET_TYPES[betId];
            if (!betType) return null;
            const canPlace = betType.canPlace(phase, { point });
            const spotBets = bets.filter((b) => b.betId === betId);
            const isRemovable = !['pass', 'dont-pass', 'come', 'dont-come'].includes(betId);
            return (
              <BetSpot
                key={betId}
                betId={betId}
                label={betType.label}
                chips={spotBets}
                canPlace={canPlace}
                onPlace={() => onPlace(betId)}
                onRemove={isRemovable && spotBets.length > 0 ? () => onRemove(betId) : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
