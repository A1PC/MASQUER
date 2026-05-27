import type { JSX } from 'react';

interface Props {
  bankroll: number;
  totalBoughtIn: number;
  rollsPlayed: number;
  canLeave: boolean;
  onLeave: () => void;
}

/**
 * `SessionBar` — top-of-table strip showing live bankroll, net P/L, and the
 * LEAVE TABLE CTA. Brand-tokened: velvet-deep surface with a brass hairline
 * frame, gold-bright bankroll display, ivory secondary labels, casino-red
 * LEAVE button.
 */
export default function SessionBar({
  bankroll,
  totalBoughtIn,
  rollsPlayed,
  canLeave,
  onLeave,
}: Props): JSX.Element {
  const net = bankroll - totalBoughtIn;
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-lg border border-brass/60 bg-velvet-deep px-4 py-2"
      data-session-bar
    >
      <div className="flex items-center gap-4 text-[11px]">
        <div className="flex flex-col items-start">
          <span className="font-display uppercase tracking-[0.18em] text-ivory/55">Bankroll</span>
          <span className="font-mono tabular-nums text-gold-bright" data-session-bankroll>
            {bankroll.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-col items-start">
          <span className="font-display uppercase tracking-[0.18em] text-ivory/55">Net</span>
          <span
            className={`font-mono tabular-nums ${net >= 0 ? 'text-chip-win' : 'text-casino-red'}`}
            data-session-net
          >
            {net >= 0 ? '+' : ''}
            {net.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-col items-start">
          <span className="font-display uppercase tracking-[0.18em] text-ivory/55">Rolls</span>
          <span className="font-mono tabular-nums text-ivory/85" data-rolls-played>
            {rollsPlayed}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="rounded-md border border-casino-red/60 px-4 py-1.5 font-display text-[11px] tracking-[0.18em] text-casino-red hover:bg-casino-red/10 disabled:opacity-40"
        disabled={!canLeave}
        onClick={onLeave}
        data-leave-button
      >
        LEAVE TABLE
      </button>
    </div>
  );
}
