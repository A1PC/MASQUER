// STUB: BingoCard is intentionally simplified for PR A.
// PR C will rewrite this for variant-aware rendering (3×9 and 5×5).
import type { JSX } from 'react';
import type { BingoCard as BingoCardType } from './logic';

interface Props {
  card: BingoCardType;
  daubed: boolean[][];
  achievedTiers: ReadonlySet<string>;
  /** Called when a cell is clicked. Only enabled in manual mode. */
  onCellClick?: (row: number, col: number) => void;
  /** Whether manual mode is active (shows the click hint). */
  manualMode?: boolean;
}

export default function BingoCard({
  card,
  daubed,
  achievedTiers,
  onCellClick,
  manualMode,
}: Props): JSX.Element {
  return (
    <div className="flex flex-col gap-2" data-bingo-card data-card-id={card.id}>
      <div
        className="grid grid-cols-9 gap-0.5 rounded border border-gold/40 bg-felt-deep p-1"
        role="grid"
        aria-label="Bingo card"
      >
        {card.cells.map((row, r) =>
          row.map((cell, c) => {
            const isDaubed = daubed[r]![c]!;
            if (cell.value === null) {
              return (
                <div
                  key={`${r}-${c}`}
                  role="gridcell"
                  className="flex h-10 w-10 items-center justify-center bg-black/40"
                  data-blank
                />
              );
            }
            const value = cell.value;
            const classes = isDaubed
              ? 'flex h-10 w-10 items-center justify-center rounded-sm bg-gold font-display text-base font-bold text-felt-deep'
              : 'flex h-10 w-10 items-center justify-center rounded-sm bg-felt-deep text-sm tabular-nums text-white';
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                role="gridcell"
                aria-label={`${value}${isDaubed ? ' daubed' : ''}`}
                aria-pressed={isDaubed}
                disabled={!onCellClick}
                onClick={() => onCellClick?.(r, c)}
                className={classes}
                data-value={value}
                data-daubed={isDaubed || undefined}
              >
                {value}
              </button>
            );
          }),
        )}
      </div>
      {achievedTiers.size > 0 && (
        <div className="flex gap-1 text-[10px]" data-tier-indicators>
          {Array.from(achievedTiers).map((tier) => (
            <span
              key={tier}
              className="rounded bg-gold/30 px-1.5 py-0.5 text-gold-bright"
              data-tier={tier}
            >
              {tier}
            </span>
          ))}
        </div>
      )}
      {manualMode && <p className="text-[10px] text-white/40">Click called numbers to daub</p>}
    </div>
  );
}
