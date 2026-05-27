import type { JSX } from 'react';
import type { Card } from './types';
import MasquerCard, { type Rank, type Suit, type CardSize } from '@/components/brand/PlayingCard';

type Size = 'table' | 'hole' | 'mini';

interface Props {
  card: Card | null;
  faceDown?: boolean;
  size?: Size;
  highlight?: boolean;
}

// Poker uses Ace=14, brand card uses Ace=1. Convert.
function adaptRank(pokerRank: number): Rank {
  if (pokerRank === 14) return 1;
  if (pokerRank >= 2 && pokerRank <= 13) return pokerRank as Rank;
  throw new RangeError(`unsupported poker rank ${pokerRank}`);
}

function adaptSuit(pokerSuit: string): Suit {
  if (pokerSuit === 'h' || pokerSuit === 'd' || pokerSuit === 'c' || pokerSuit === 's') {
    return pokerSuit;
  }
  throw new RangeError(`unsupported suit ${pokerSuit}`);
}

const SIZE_MAP: Record<Size, CardSize> = {
  table: 'lg',
  hole: 'md',
  mini: 'sm',
};

const EMPTY_DIMS: Record<Size, { w: number; h: number }> = {
  table: { w: 130, h: 182 },
  hole: { w: 100, h: 140 },
  mini: { w: 64, h: 90 },
};

/**
 * Adapter — converts poker's `Card` (Ace=14) shape to the brand `MasquerCard`
 * (Ace=1) so the entire poker UI inherits the unified MASQUER porcelain card
 * visual for free. Existing call sites (Seat / CommunityBoard / ShowdownReveal
 * / DrawSeat / DiscardControls / OmahaSeat) are unchanged — they get the new
 * look automatically.
 */
export default function PlayingCard({
  card,
  faceDown = false,
  size = 'hole',
  highlight = false,
}: Props): JSX.Element {
  // Empty slot placeholder when no card is dealt.
  if (card === null && !faceDown) {
    const { w, h } = EMPTY_DIMS[size];
    return (
      <div
        className="rounded-[10px] border border-brass/30 bg-velvet-deep/40"
        style={{ width: w, height: h }}
        data-playing-card
        data-card-empty
      />
    );
  }

  // Face-down render — use brand back. Default to a stable rank/suit pair
  // when the card isn't supplied (the rank/suit values aren't visible on
  // the back).
  const wrapperClass = highlight
    ? 'inline-block rounded-[12px] ring-2 ring-gold-bright shadow-[0_0_8px_rgba(232,189,109,0.7)]'
    : 'inline-block';

  if (faceDown || card === null) {
    return (
      <div className={wrapperClass} data-playing-card data-face-down>
        <MasquerCard rank={1} suit="s" faceDown size={SIZE_MAP[size]} />
      </div>
    );
  }

  return (
    <div
      className={wrapperClass}
      data-playing-card
      {...(highlight ? { 'data-highlight': '' } : {})}
    >
      <MasquerCard rank={adaptRank(card.rank)} suit={adaptSuit(card.suit)} size={SIZE_MAP[size]} />
    </div>
  );
}
