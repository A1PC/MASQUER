import type { JSX } from 'react';
import type { BingoCard as BingoCardType, Variant } from './logic';
import { VARIANTS } from './logic';

interface Props {
  card: BingoCardType;
  daubed: boolean[][];
  variant: Variant;
  size?: 'large' | 'mini';
  onCellClick?: (row: number, col: number) => void;
  manualMode?: boolean;
  /** Visual highlight when this card has been the latest claimant. */
  highlight?: 'tier1' | 'tier2' | 'tier3' | null;
}

export default function BingoCard({
  card,
  daubed,
  variant,
  size = 'large',
  onCellClick,
  manualMode = false,
  highlight = null,
}: Props): JSX.Element {
  const { rows, cols } = VARIANTS[variant];
  const isLarge = size === 'large';
  const cellSize = isLarge ? 'w-12 h-12 text-base' : 'w-3 h-3 text-[0px]';
  const gap = isLarge ? 'gap-1.5' : 'gap-0.5';
  const padding = isLarge ? 'p-3' : 'p-1';
  const highlightBorder =
    highlight === 'tier3'
      ? 'border-gold-bright shadow-[0_0_12px_rgba(255,215,0,0.6)]'
      : highlight === 'tier2'
        ? 'border-neon-cyan'
        : highlight === 'tier1'
          ? 'border-green-400'
          : 'border-white/20';

  return (
    <div
      className={`grid ${gap} ${padding} bg-felt-deep border-2 rounded ${highlightBorder}`}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      data-bingo-card
      data-variant={variant}
      data-size={size}
    >
      {card.cells.map((row, r) =>
        row.map((cell, c) => {
          const isDaubed = daubed[r]?.[c] ?? false;
          const isFree = cell.free === true;
          const isEmpty = cell.value === null && !isFree;
          const interactive =
            manualMode && !isDaubed && !isFree && cell.value !== null && onCellClick;
          const bg = isFree
            ? 'bg-gold/30 text-gold-bright'
            : isDaubed
              ? 'bg-gold text-felt-deep'
              : isEmpty
                ? 'bg-transparent text-transparent'
                : 'bg-white/5 text-white';

          if (isEmpty) {
            return <div key={`${r}-${c}`} className={`${cellSize} ${bg}`} data-cell-empty />;
          }

          const content = isFree ? (isLarge ? '★' : '') : cell.value;
          const className = `${cellSize} ${bg} font-display flex items-center justify-center rounded tabular-nums ${
            interactive ? 'cursor-pointer hover:ring-2 hover:ring-gold' : ''
          }`;

          if (interactive && onCellClick) {
            const handleClick = () => onCellClick(r, c);
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={handleClick}
                className={className}
                data-cell-value={cell.value}
              >
                {content}
              </button>
            );
          }
          return (
            <div
              key={`${r}-${c}`}
              className={className}
              data-cell-value={cell.value ?? 'free'}
              data-daubed={isDaubed}
            >
              {rows && cols && content}
            </div>
          );
        }),
      )}
    </div>
  );
}
