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

/**
 * TicketCart — the side-rail showing the lines the player is about to buy.
 * Reskinned for MASQUER / Velvet Deco in Phase 15 #9: tokens only, scrollable
 * list body (`max-h-[60vh] overflow-y-auto`) so long carts don't overflow the
 * viewport, and a brass-bordered velvet surface to match the rest of the
 * lottery surfaces.
 */
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
    <div
      className="rounded-lg border border-brass/60 bg-felt-table-deep p-3 shadow-velvet-panel"
      data-ticket-cart
    >
      <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">
        TICKET ({lines.length} {lines.length === 1 ? 'line' : 'lines'})
      </h3>
      {lines.length === 0 ? (
        <p className="py-4 text-center text-xs text-ivory/50">
          No lines yet — pick numbers or add a lucky dip.
        </p>
      ) : (
        <ul data-ticket-cart-body className="max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
          {lines.map((line, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded border border-brass/40 bg-velvet-deep px-2 py-1.5 text-xs text-ivory"
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
                className="rounded px-1.5 py-0.5 text-ivory/40 hover:bg-ivory/10 hover:text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex items-center justify-between text-xs text-ivory/80">
        <span>Total cost</span>
        <span className="font-display tabular-nums text-gold-bright">
          {totalCost.toLocaleString()} chips
        </span>
      </div>
      <button
        type="button"
        onClick={onBuy}
        disabled={buyDisabled || lines.length === 0}
        className="mt-3 min-h-[44px] w-full rounded-md border-2 border-brass bg-velvet py-3 font-display text-sm tracking-[0.18em] text-ivory hover:bg-velvet-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-not-allowed disabled:opacity-40"
      >
        BUY TICKET
      </button>
      {buyDisabledReason && (
        <p className="mt-1 text-center text-[10px] text-state-loss">{buyDisabledReason}</p>
      )}
    </div>
  );
}
