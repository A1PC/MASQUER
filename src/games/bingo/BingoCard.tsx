import type { JSX } from 'react';
import { motion } from 'framer-motion';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
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

/**
 * Player + CPU card surface. Brass-framed velvet panel with daubed cells
 * marked by a `bg-jewel-magenta` ring (instead of the old gold fill that
 * obscured the underlying number). Manual-mode taps fire a small scale
 * punch (1.0 → 1.05 → 1.0) per spec §4.4; reduced-motion collapses to
 * instant via `useEffectiveReducedMotion`.
 */
export default function BingoCard({
  card,
  daubed,
  variant,
  size = 'large',
  onCellClick,
  manualMode = false,
  highlight = null,
}: Props): JSX.Element {
  const reduceMotion = useEffectiveReducedMotion();
  const { rows, cols } = VARIANTS[variant];
  const isLarge = size === 'large';
  const cellSize = isLarge ? 'w-12 h-12 text-base' : 'w-3 h-3 text-[0px]';
  const gap = isLarge ? 'gap-1.5' : 'gap-0.5';
  const padding = isLarge ? 'p-3' : 'p-1';
  // Highlight border per latest-claim tier — tier-3 wins the jewel-magenta
  // signature; tier-2 brass; tier-1 emerald hint.
  const highlightBorder =
    highlight === 'tier3'
      ? 'border-jewel-magenta shadow-[0_0_12px_rgba(232,74,140,0.55)]'
      : highlight === 'tier2'
        ? 'border-brass'
        : highlight === 'tier1'
          ? 'border-jewel-emerald'
          : 'border-brass/40';

  return (
    <div
      className={`grid ${gap} ${padding} rounded-md border-2 bg-velvet ${highlightBorder}`}
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
          // Layered chrome: undaubed = ivory on a darker felt; daubed = ivory
          // on a deep felt with a magenta inset ring so the number still
          // reads. Free centre stays gold so it's instantly recognisable.
          const bg = isFree
            ? 'bg-gold/30 text-gold-bright'
            : isDaubed
              ? 'bg-felt-table-deep text-ivory ring-2 ring-jewel-magenta ring-inset'
              : isEmpty
                ? 'bg-transparent text-transparent'
                : 'bg-felt-table-deep/60 text-ivory';

          if (isEmpty) {
            return <div key={`${r}-${c}`} className={`${cellSize} ${bg}`} data-cell-empty />;
          }

          const content = isFree ? (isLarge ? '★' : '') : cell.value;
          const className = `${cellSize} ${bg} flex items-center justify-center rounded-sm font-display tabular-nums ${
            interactive
              ? 'cursor-pointer hover:ring-2 hover:ring-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold'
              : ''
          }`;

          if (interactive && onCellClick) {
            const handleClick = () => onCellClick(r, c);
            return (
              <motion.button
                key={`${r}-${c}`}
                type="button"
                onClick={handleClick}
                className={className}
                data-cell-value={cell.value}
                whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.15 }}
              >
                {content}
              </motion.button>
            );
          }
          // Animate freshly daubed cells: a quick punch-in (0.95 → 1.05 → 1.0)
          // so the player sees the daub register. Auto-mode benefits most.
          return (
            <motion.div
              key={`${r}-${c}`}
              className={className}
              data-cell-value={cell.value ?? 'free'}
              data-daubed={isDaubed}
              {...(isDaubed && !reduceMotion
                ? {
                    initial: { scale: 0.95 },
                    animate: { scale: [0.95, 1.05, 1] },
                    transition: { duration: 0.15 },
                  }
                : {})}
            >
              {rows && cols && content}
            </motion.div>
          );
        }),
      )}
    </div>
  );
}
