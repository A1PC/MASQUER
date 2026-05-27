import type { JSX } from 'react';

interface Props {
  stack: number;
  totalBoughtIn: number;
  handsPlayed: number;
  inHand: boolean;
  onLeave: () => void;
}

export default function SessionBar({
  stack,
  totalBoughtIn,
  handsPlayed,
  inHand,
  onLeave,
}: Props): JSX.Element {
  const net = stack - totalBoughtIn;
  const isPositive = net >= 0;
  const netColor = isPositive ? 'text-chip-win' : 'text-casino-red';
  const netPrefix = net > 0 ? '+' : '';

  return (
    <div
      className="flex flex-col gap-3 rounded-md border border-brass/60 bg-velvet-deep p-3"
      data-session-bar
    >
      <div className="flex flex-col gap-1">
        <span className="font-display text-[10px] tracking-[0.18em] text-ivory/55">SESSION</span>

        {/* Net P&L */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-ivory/70">Net</span>
          <span className={`font-mono text-sm tabular-nums font-bold ${netColor}`} data-net>
            {netPrefix}
            {net.toLocaleString()}
          </span>
        </div>

        {/* Stack */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-ivory/70">Stack</span>
          <span className="font-mono text-sm tabular-nums text-gold-bright" data-stack>
            {stack.toLocaleString()}
          </span>
        </div>

        {/* Bought in */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-ivory/70">Bought in</span>
          <span className="font-mono text-sm tabular-nums text-ivory/85" data-bought-in>
            {totalBoughtIn.toLocaleString()}
          </span>
        </div>

        {/* Hands played */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-ivory/70">Hands</span>
          <span className="font-mono text-sm tabular-nums text-ivory/85" data-hands>
            {handsPlayed}
          </span>
        </div>
      </div>

      {/* Leave button */}
      <div className="group relative">
        <button
          className="w-full rounded border border-brass/40 py-2 font-display text-xs tracking-[0.18em]
            text-ivory hover:bg-velvet disabled:cursor-not-allowed disabled:opacity-40"
          disabled={inHand}
          onClick={onLeave}
          data-leave-table
        >
          LEAVE TABLE
        </button>
        {inHand && (
          <div
            className="absolute -top-8 left-0 right-0 hidden rounded border border-brass/40 bg-velvet-deep
              px-2 py-1 text-center text-[10px] text-ivory/70 group-hover:block"
            role="tooltip"
          >
            Leave between hands
          </div>
        )}
      </div>
    </div>
  );
}
