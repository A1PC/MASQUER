import type { JSX } from 'react';
import { Link } from 'react-router';
import { BIN_COUNT } from './geometry';
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
  const edgeHits = entries.filter((e) => e.bin === 0 || e.bin === BIN_COUNT - 1).length;

  return (
    <div
      className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-lg border border-brass/60 bg-velvet-deep p-6"
      data-end-screen
    >
      <h2 className="font-display text-xl tracking-[0.18em] text-gold-bright">
        {reasonLabel(reason)}
      </h2>

      <div className="max-h-[60vh] w-full overflow-y-auto pr-1">
        <div className="grid w-full grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-ivory/55">Balls</span>
            <span className="text-ivory tabular-nums">{balls}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ivory/55">Stake</span>
            <span className="text-ivory tabular-nums">−{totalStake.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ivory/55">Payout</span>
            <span className="text-gold-bright tabular-nums">+{totalPayout.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-display">
            <span>Net</span>
            <span className={`tabular-nums ${net >= 0 ? 'text-gold-bright' : 'text-casino-red'}`}>
              {net >= 0 ? '+' : ''}
              {net.toLocaleString()}
            </span>
          </div>
          {biggest.bin >= 0 && (
            <div className="col-span-2 flex justify-between border-t border-brass/30 pt-2">
              <span className="text-ivory/55">Biggest win</span>
              <span className="text-gold-bright tabular-nums">
                {biggest.multiplier}x → +{biggest.payout.toLocaleString()}
              </span>
            </div>
          )}
          {edgeHits > 0 && (
            <div className="col-span-2 flex justify-between border-t border-brass/30 pt-2">
              <span className="text-ivory/55">Edge bin hits</span>
              <span className="font-display tabular-nums text-jewel-magenta">{edgeHits}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2">
        <button
          type="button"
          onClick={onPlayMore}
          className="w-full rounded-md border-2 border-brass bg-velvet py-2 font-display text-sm tracking-[0.18em] text-ivory"
          data-play-more
        >
          DROP MORE
        </button>
        <Link
          to="/lobby"
          className="w-full rounded-md border border-brass/40 bg-felt-table-deep py-2 text-center text-xs text-ivory/70 hover:border-brass"
        >
          BACK TO LOBBY
        </Link>
      </div>
    </div>
  );
}
