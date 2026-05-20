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
      className="flex flex-col gap-3 rounded-lg border border-gold/20 bg-felt-deep/90 p-3"
      data-session-bar
    >
      <div className="flex flex-col gap-1">
        <span className="font-display text-[10px] tracking-wider text-white/50">SESSION</span>

        {/* Net P&L */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-white/60">Net</span>
          <span className={`font-mono text-sm tabular-nums font-bold ${netColor}`} data-net>
            {netPrefix}
            {net.toLocaleString()}
          </span>
        </div>

        {/* Stack */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-white/60">Stack</span>
          <span className="font-mono text-sm tabular-nums text-gold" data-stack>
            {stack.toLocaleString()}
          </span>
        </div>

        {/* Bought in */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-white/60">Bought in</span>
          <span className="font-mono text-sm tabular-nums text-white/70" data-bought-in>
            {totalBoughtIn.toLocaleString()}
          </span>
        </div>

        {/* Hands played */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-white/60">Hands</span>
          <span className="font-mono text-sm tabular-nums text-white/70" data-hands>
            {handsPlayed}
          </span>
        </div>
      </div>

      {/* Leave button */}
      <div className="relative group">
        <button
          className="w-full rounded border border-casino-red/50 py-2 font-display text-xs
            tracking-widest text-casino-red hover:bg-casino-red/10
            disabled:cursor-not-allowed disabled:opacity-40"
          disabled={inHand}
          onClick={onLeave}
          data-leave-table
        >
          LEAVE TABLE
        </button>
        {inHand && (
          <div
            className="absolute -top-8 left-0 right-0 hidden group-hover:block
              rounded bg-felt-deep border border-gold/20 px-2 py-1 text-center
              text-[10px] text-white/60"
            role="tooltip"
          >
            Leave between hands
          </div>
        )}
      </div>
    </div>
  );
}
