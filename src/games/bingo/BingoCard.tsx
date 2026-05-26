import type { JSX } from 'react';
import { motion } from 'framer-motion';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
import MaskMark from '@/components/brand/MaskMark';
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

/** US 5-column B-I-N-G-O letter palette — kept as raw hex because the
 *  variant-intrinsic colours (red B / blue I / yellow N / green G /
 *  purple O) don't have clean brand-token equivalents. The Velvet Deco
 *  palette is felt/velvet/gold/brass-centric with jewel-ruby/sapphire/
 *  emerald/magenta accents — none of which read as the literal BINGO
 *  column colours every American player expects. Forcing tokens here
 *  would dilute the brand without improving the variant's signature.
 *  Each letter matches the `base` hex of its column's `americanBallStyle`
 *  in `ballPalette.ts` (the dominant visible ball colour) so the header
 *  row stays consistent with the called balls. Contrast on bg-velvet
 *  (#5a1320) verified ≥ 4.5:1 with the bump to text-2xl + drop-shadow. */
const BINGO_LETTER_COLORS = [
  '#ff5050', // B — red (1-15)
  '#5080d0', // I — blue (16-30)
  '#fff070', // N — yellow (31-45)
  '#60d060', // G — green (46-60)
  '#a060c0', // O — purple (61-75)
] as const;

/**
 * Player + CPU card surface. Brass-framed velvet panel with daubed cells
 * marked by a gold ring around a darker felt body so the underlying number
 * still reads. Manual-mode taps fire a small scale punch (1.0 → 1.05 → 1.0)
 * per spec §4.4; reduced-motion collapses to instant via
 * `useEffectiveReducedMotion`.
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

  const showColumnHeaders = variant === 'american' && isLarge;

  return (
    <div
      className={`flex flex-col ${gap} ${padding} rounded-md border-2 bg-velvet ${highlightBorder}`}
      data-bingo-card
      data-variant={variant}
      data-size={size}
    >
      {showColumnHeaders && (
        <div
          aria-hidden="true"
          data-bingo-column-headers
          className={`grid ${gap} pb-1 font-display tracking-[0.18em]`}
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {(['B', 'I', 'N', 'G', 'O'] as const).map((letter, i) => (
            <div
              key={letter}
              data-column-letter={letter}
              className="flex items-center justify-center text-2xl [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]"
              style={{ color: BINGO_LETTER_COLORS[i] }}
            >
              {letter}
            </div>
          ))}
        </div>
      )}
      <div
        className={`grid ${gap}`}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        data-bingo-grid
      >
        {card.cells.map((row, r) =>
          row.map((cell, c) => {
            const isDaubed = daubed[r]?.[c] ?? false;
            const isFree = cell.free === true;
            const isEmpty = cell.value === null && !isFree;
            const interactive =
              manualMode && !isDaubed && !isFree && cell.value !== null && onCellClick;
            // Layered chrome: undaubed = ivory on a darker felt; daubed = gold-
            // bright on a deep felt with a gold inset ring so the number still
            // reads. Free centre is the signature focal anchor — brass ring +
            // gold-glow framed by `ring-inset` so it sits inside the cell and
            // never bleeds onto the brass card border around the grid.
            const bg = isFree
              ? 'bg-gold/25 text-gold-bright ring-2 ring-brass ring-inset shadow-[0_0_8px_rgba(232,189,109,0.45)]'
              : isDaubed
                ? 'bg-felt-table-deep text-gold-bright ring-2 ring-gold ring-inset'
                : isEmpty
                  ? 'bg-transparent text-transparent'
                  : 'bg-felt-table-deep/60 text-ivory';

            if (isEmpty) {
              return <div key={`${r}-${c}`} className={`${cellSize} ${bg}`} data-cell-empty />;
            }

            // Free centre = the MASQUER Colombina mask — ties the brand to
            // the card's focal anchor. `simple` variant has the silhouette +
            // inner rule + eyes + crest only (no fine filigree); reads
            // cleanly at the cell size. Minicard stays blank for room.
            const content = isFree ? (
              isLarge ? (
                <MaskMark variant="simple" size={36} title="Free centre" />
              ) : (
                ''
              )
            ) : (
              cell.value
            );
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
                  {...(reduceMotion
                    ? { transition: { duration: 0 } }
                    : { whileTap: { scale: 0.95 }, transition: { duration: 0.15 } })}
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
    </div>
  );
}
