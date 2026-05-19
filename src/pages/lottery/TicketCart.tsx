import type { JSX } from 'react';

export type CartLine =
  | { kind: 'manual'; mainNumbers: number[]; bonusNumber: number }
  | { kind: 'lucky-dip' };

interface Props {
  lines: CartLine[];
  lineCost: number;
  onRemoveLine: (index: number) => void;
  onBuy: () => void;
  buyDisabled?: boolean;
  buyDisabledReason?: string;
}

export default function TicketCart({
  lines,
  lineCost,
  onRemoveLine,
  onBuy,
  buyDisabled,
  buyDisabledReason,
}: Props): JSX.Element {
  const totalCost = lines.length * lineCost;
  return (
    <div className="rounded border border-gold/30 bg-felt-deep p-3" data-ticket-cart>
      <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">
        TICKET ({lines.length} {lines.length === 1 ? 'line' : 'lines'})
      </h3>
      {lines.length === 0 ? (
        <p className="py-4 text-center text-xs text-white/40">
          No lines yet — pick numbers or add a lucky dip.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {lines.map((line, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded border border-white/10 bg-black/20 px-2 py-1.5 text-xs"
              data-cart-line-kind={line.kind}
            >
              <span className="tabular-nums">
                {line.kind === 'manual'
                  ? `${line.mainNumbers
                      .slice()
                      .sort((a, b) => a - b)
                      .join(' · ')} | ${line.bonusNumber}`
                  : '🎰 LUCKY DIP'}
              </span>
              <button
                type="button"
                aria-label={`Remove line ${i + 1}`}
                onClick={() => onRemoveLine(i)}
                className="rounded px-1.5 py-0.5 text-white/40 hover:bg-white/10 hover:text-white"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex items-center justify-between text-xs text-white/70">
        <span>Total cost</span>
        <span className="font-display tabular-nums text-gold-bright">
          {totalCost.toLocaleString()} chips
        </span>
      </div>
      <button
        type="button"
        onClick={onBuy}
        disabled={buyDisabled || lines.length === 0}
        className="mt-3 w-full rounded-md border-2 border-gold bg-casino-red py-3 font-display text-sm tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        BUY TICKET
      </button>
      {buyDisabledReason && (
        <p className="mt-1 text-center text-[10px] text-casino-red">{buyDisabledReason}</p>
      )}
    </div>
  );
}
