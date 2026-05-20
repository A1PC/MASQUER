import type { JSX } from 'react';
import { Link } from 'react-router';
import type { AutoStopReason, HistoryEntry } from './machine';

interface Props {
  reason: AutoStopReason;
  entries: HistoryEntry[]; // only the entries from this session
  onPlayMore: () => void;
}

function reasonLabel(r: AutoStopReason): string {
  if (r === 'completed') return 'AUTO SESSION COMPLETE';
  if (r === 'user-stop') return 'AUTO STOPPED';
  return 'AUTO STOPPED — INSUFFICIENT CHIPS';
}

export default function EndScreen({ reason, entries, onPlayMore }: Props): JSX.Element {
  const balls = entries.length;
  const totalStake = entries.reduce((s, e) => s + e.bet, 0);
  const totalPayout = entries.reduce((s, e) => s + e.payout, 0);
  const net = totalPayout - totalStake;
  const biggest: { payout: number; bin: number; multiplier: number } = entries.reduce(
    (best, e) => (e.payout > best.payout ? e : best),
    { payout: 0, bin: -1, multiplier: 0 },
  );

  return (
    <div
      className="flex flex-col items-center gap-4 rounded border border-gold/30 bg-felt-deep p-6 max-w-md mx-auto"
      data-end-screen
    >
      <h2 className="font-display text-xl tracking-wider text-gold-bright">
        {reasonLabel(reason)}
      </h2>

      <div className="w-full grid grid-cols-2 gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-white/60">Balls</span>
          <span className="tabular-nums text-white">{balls}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/60">Stake</span>
          <span className="tabular-nums text-white">−{totalStake.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/60">Payout</span>
          <span className="tabular-nums text-gold-bright">+{totalPayout.toLocaleString()}</span>
        </div>
        <div className="flex justify-between font-display">
          <span>Net</span>
          <span className={`tabular-nums ${net >= 0 ? 'text-gold-bright' : 'text-casino-red'}`}>
            {net >= 0 ? '+' : ''}
            {net.toLocaleString()}
          </span>
        </div>
        {biggest.bin >= 0 && (
          <div className="col-span-2 flex justify-between border-t border-white/10 pt-2">
            <span className="text-white/60">Biggest win</span>
            <span className="tabular-nums text-gold-bright">
              {biggest.multiplier}x → +{biggest.payout.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 w-full max-w-xs">
        <button
          type="button"
          onClick={onPlayMore}
          className="w-full rounded-md border-2 border-gold bg-casino-red py-2 font-display text-sm tracking-wider text-white"
          data-play-more
        >
          DROP MORE
        </button>
        <Link
          to="/lobby"
          className="w-full text-center rounded-md border border-white/20 bg-felt-deep py-2 text-xs text-white/60 hover:border-white/60"
        >
          BACK TO LOBBY
        </Link>
      </div>
    </div>
  );
}
