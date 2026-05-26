import type { JSX } from 'react';
import BetZone from './BetZone';
import BigSmallZone from './BigSmallZone';
import { PAYOUT_LABELS } from './config';
import type { BetZoneKey, Bets } from './types';

interface Props {
  bets: Bets;
  disabled?: boolean;
  onAddChip: (zone: BetZoneKey) => void;
  onClearZone: (zone: BetZoneKey) => void;
}

const ZONE_LABELS: Record<BetZoneKey, string> = {
  player: 'PLAYER',
  banker: 'BANKER',
  tie: 'TIE',
  playerPair: 'P PAIR',
  bankerPair: 'B PAIR',
  big: 'BIG',
  small: 'SMALL',
  playerDragon: 'P DRAGON',
  bankerDragon: 'B DRAGON',
};

export default function BetArea({
  bets,
  disabled = false,
  onAddChip,
  onClearZone,
}: Props): JSX.Element {
  const zoneProps = (zone: BetZoneKey) => ({
    label: ZONE_LABELS[zone],
    payoutText: PAYOUT_LABELS[zone],
    amount: bets[zone],
    onAddChip: () => onAddChip(zone),
    onClear: () => onClearZone(zone),
    disabled,
  });

  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-brass/60 bg-felt-table/60 p-2 shadow-velvet-panel"
      data-baccarat-bet-area
    >
      {/* Pairs + Big/Small row */}
      <div className="grid h-[72px] grid-cols-3 gap-2">
        <BetZone {...zoneProps('playerPair')} variant="side" />
        <BigSmallZone
          smallAmount={bets.small}
          bigAmount={bets.big}
          disabled={disabled}
          onAddSmall={() => onAddChip('small')}
          onAddBig={() => onAddChip('big')}
          onClearSmall={() => onClearZone('small')}
          onClearBig={() => onClearZone('big')}
        />
        <BetZone {...zoneProps('bankerPair')} variant="side" />
      </div>

      {/* Main row */}
      <div className="grid h-[96px] grid-cols-3 gap-2">
        <BetZone {...zoneProps('player')} variant="main" />
        <BetZone {...zoneProps('tie')} variant="tie" />
        <BetZone {...zoneProps('banker')} variant="main" />
      </div>

      {/* Dragon row */}
      <div className="grid h-[72px] grid-cols-2 gap-2">
        <BetZone {...zoneProps('playerDragon')} variant="side" />
        <BetZone {...zoneProps('bankerDragon')} variant="side" />
      </div>
    </div>
  );
}
