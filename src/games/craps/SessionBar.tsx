import type { JSX } from 'react';

interface Props {
  bankroll: number;
  totalBoughtIn: number;
  rollsPlayed: number;
  canLeave: boolean;
  onLeave: () => void;
}

export default function SessionBar({
  bankroll,
  totalBoughtIn,
  rollsPlayed,
  canLeave,
  onLeave,
}: Props): JSX.Element {
  const net = bankroll - totalBoughtIn;
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-gold/20 bg-felt-deep/80 px-4 py-2">
      <div className="flex items-center gap-4 text-[11px]">
        <div className="flex flex-col items-start">
          <span className="uppercase tracking-wider text-white/40">Bankroll</span>
          <span className="font-mono tabular-nums text-gold" data-session-bankroll>
            {bankroll.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-col items-start">
          <span className="uppercase tracking-wider text-white/40">Net</span>
          <span
            className={`font-mono tabular-nums ${net >= 0 ? 'text-chip-win' : 'text-casino-red'}`}
            data-session-net
          >
            {net >= 0 ? '+' : ''}
            {net.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-col items-start">
          <span className="uppercase tracking-wider text-white/40">Rolls</span>
          <span className="font-mono tabular-nums text-white/80" data-rolls-played>
            {rollsPlayed}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="rounded border border-casino-red/50 px-4 py-1.5 font-display text-[11px] tracking-widest text-casino-red hover:bg-casino-red/10 disabled:opacity-40"
        disabled={!canLeave}
        onClick={onLeave}
        data-leave-button
      >
        LEAVE TABLE
      </button>
    </div>
  );
}
