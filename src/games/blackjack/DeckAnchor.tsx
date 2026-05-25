import type { JSX } from 'react';
import MaskMark from '@/components/brand/MaskMark';
import { cn } from '@/components/ui';

interface Props {
  className?: string;
}

/**
 * `DeckAnchor` — a small stylised stack of three face-down MasquerCards
 * pinned to the top-right of the felt. Visually anchors the "deck" the
 * `AnimatedCard` cards fly out of — the deck doesn't physically shrink
 * (Velvet Duel shoe is many decks deep), but the static stack gives players
 * a clear spatial origin for every dealt card, satisfying the ui-ux-pro-max
 * "motion conveys meaning" guideline.
 *
 * Decorative — `aria-hidden`. Each new card's animation is the load-bearing
 * accessibility signal (cards announce themselves through MasquerCard's own
 * face/back roles).
 */
export default function DeckAnchor({ className }: Props): JSX.Element {
  return (
    <div className={cn('pointer-events-none relative h-[90px] w-[80px]', className)} aria-hidden>
      {/* Three offset card backs stacked at slight angles — gives the deck
       *  visible depth without the bulk of a full visual stack. */}
      <DeckCardBack rotate={-4} offsetX={-2} offsetY={2} />
      <DeckCardBack rotate={2} offsetX={1} offsetY={-1} />
      <DeckCardBack rotate={0} offsetX={3} offsetY={-3} top />
    </div>
  );
}

interface DeckCardBackProps {
  rotate: number;
  offsetX: number;
  offsetY: number;
  top?: boolean;
}

/** A scaled-down face-down MasquerCard back. Mirrors the back-face artwork in
 *  `@/components/brand/PlayingCard` (oxblood weave + gold inset + Mask glyph). */
function DeckCardBack({ rotate, offsetX, offsetY, top }: DeckCardBackProps): JSX.Element {
  return (
    <div
      className={cn(
        'absolute inset-0 rounded-[6px] border border-gold/80',
        'bg-[repeating-linear-gradient(45deg,#5a1320_0_5px,#4a0f1a_5px_10px)]',
        'shadow-[0_2px_6px_rgba(0,0,0,0.45)]',
      )}
      style={{ transform: `translate(${offsetX}px, ${offsetY}px) rotate(${rotate}deg)` }}
    >
      <div className="absolute inset-1 rounded-[4px] border border-gold/40" />
      {top && (
        <div className="absolute inset-0 flex items-center justify-center">
          <MaskMark variant="simple" size={36} title="MASQUER deck" />
        </div>
      )}
    </div>
  );
}
