import type { JSX } from 'react';
import type { Card } from './types';

type Size = 'table' | 'hole' | 'mini';

interface Props {
  card: Card | null;
  faceDown?: boolean;
  size?: Size;
  highlight?: boolean;
}

/** Maps numeric rank to display string. */
function rankLabel(rank: number): string {
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  if (rank === 14) return 'A';
  return String(rank);
}

/** Maps suit letter to Unicode glyph. */
function suitGlyph(suit: string): string {
  if (suit === 'c') return '♣';
  if (suit === 'd') return '♦';
  if (suit === 'h') return '♥';
  return '♠';
}

const SIZE_DIMS: Record<Size, { w: number; h: number }> = {
  table: { w: 88, h: 124 },
  hole: { w: 72, h: 100 },
  mini: { w: 48, h: 68 },
};

const SIZE_RANK_TEXT: Record<Size, string> = {
  table: 'text-[18px]',
  hole: 'text-[15px]',
  mini: 'text-[10px]',
};

const SIZE_SUIT_TEXT: Record<Size, string> = {
  table: 'text-[12px]',
  hole: 'text-[10px]',
  mini: 'text-[8px]',
};

const SIZE_CENTER_TEXT: Record<Size, string> = {
  table: 'text-[38px]',
  hole: 'text-[30px]',
  mini: 'text-[18px]',
};

export default function PlayingCard({
  card,
  faceDown = false,
  size = 'table',
  highlight = false,
}: Props): JSX.Element {
  const { w, h } = SIZE_DIMS[size];

  if (!card || faceDown) {
    return <CardBack w={w} h={h} highlight={highlight} />;
  }

  const isRed = card.suit === 'd' || card.suit === 'h';
  const colorClass = isRed ? 'text-casino-red' : 'text-felt-deep';
  const glowClass = isRed
    ? 'drop-shadow-[0_0_4px_rgba(255,92,242,0.35)]'
    : 'drop-shadow-[0_0_4px_rgba(61,240,255,0.35)]';
  const rLabel = rankLabel(card.rank);
  const sGlyph = suitGlyph(card.suit);

  const highlightBox = highlight
    ? '0 4px 14px rgba(0,0,0,0.4), 0 0 16px rgba(212,175,55,0.7), inset 0 0 0 1.5px #d4af37, inset 0 0 0 2.5px rgba(255,255,255,0.6)'
    : '0 4px 14px rgba(0,0,0,0.4), inset 0 0 0 1.5px #d4af37, inset 0 0 0 2.5px rgba(255,255,255,0.6)';

  return (
    <div
      data-playing-card
      {...(highlight ? { 'data-highlight': '' } : {})}
      className={`relative flex-shrink-0 rounded-lg ${colorClass}`}
      style={{
        width: w,
        height: h,
        background: 'linear-gradient(160deg,#fff 0%,#fff 70%,#f8f3e3 100%)',
        boxShadow: highlightBox,
        fontFamily: 'Times New Roman, Times, serif',
        fontWeight: 'bold',
      }}
    >
      <Corner
        rank={rLabel}
        suit={sGlyph}
        glowClass={glowClass}
        position="tl"
        rankClass={SIZE_RANK_TEXT[size]}
        suitClass={SIZE_SUIT_TEXT[size]}
      />
      {size !== 'mini' && (
        <CenterArt
          rank={rLabel}
          suit={sGlyph}
          glowClass={glowClass}
          centerClass={SIZE_CENTER_TEXT[size]}
        />
      )}
      <Corner
        rank={rLabel}
        suit={sGlyph}
        glowClass={glowClass}
        position="br"
        rankClass={SIZE_RANK_TEXT[size]}
        suitClass={SIZE_SUIT_TEXT[size]}
      />
    </div>
  );
}

function Corner({
  rank,
  suit,
  glowClass,
  position,
  rankClass,
  suitClass,
}: {
  rank: string;
  suit: string;
  glowClass: string;
  position: 'tl' | 'br';
  rankClass: string;
  suitClass: string;
}) {
  const positionClasses =
    position === 'tl' ? 'top-[6px] left-[8px]' : 'bottom-[6px] right-[8px] rotate-180';
  return (
    <div className={`absolute flex flex-col items-center leading-none ${positionClasses}`}>
      <span className={rankClass}>{rank}</span>
      <span className={`mt-[1px] ${suitClass} ${glowClass}`}>{suit}</span>
    </div>
  );
}

function CenterArt({
  rank,
  suit,
  glowClass,
  centerClass,
}: {
  rank: string;
  suit: string;
  glowClass: string;
  centerClass: string;
}) {
  const isCourt = rank === 'J' || rank === 'Q' || rank === 'K';
  if (rank === 'A') {
    return (
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className={`${centerClass} ${glowClass}`}>{suit}</span>
      </div>
    );
  }
  if (isCourt) {
    return (
      <div
        className={`absolute inset-x-[12px] inset-y-[18px] flex items-center justify-center rounded-[3px] ${centerClass} ${glowClass}`}
        style={{ border: '1.5px solid currentColor' }}
      >
        {rank}
      </div>
    );
  }
  // Number cards: single pip in center
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <span className={`${centerClass} ${glowClass}`}>{suit}</span>
    </div>
  );
}

function CardBack({ w, h, highlight }: { w: number; h: number; highlight: boolean }) {
  const highlightGlow = highlight ? ', 0 0 16px rgba(212,175,55,0.7)' : '';
  return (
    <div
      data-playing-card
      data-face-down
      className="relative flex-shrink-0 rounded-lg"
      style={{
        width: w,
        height: h,
        background:
          'repeating-linear-gradient(45deg, transparent 0 3px, rgba(212,175,55,0.13) 3px 4px),' +
          'repeating-linear-gradient(-45deg, transparent 0 3px, rgba(212,175,55,0.13) 3px 4px),' +
          'radial-gradient(circle at 30% 30%, #c11d35 0%, #a3122a 40%, #6e0a1d 100%)',
        boxShadow: `0 4px 14px rgba(0,0,0,0.4), 0 0 16px rgba(212,175,55,0.3)${highlightGlow}, inset 0 0 0 3px #d4af37, inset 0 0 0 4.5px rgba(0,0,0,0.3)`,
      }}
    >
      <div
        className="absolute inset-[10px] flex flex-col items-center justify-center rounded font-display tracking-widest text-gold"
        style={{
          border: '1px solid rgba(212,175,55,0.6)',
          textShadow: '0 0 6px rgba(212,175,55,0.6), 0 0 12px rgba(212,175,55,0.3)',
        }}
      >
        <div className="text-[18px]">LG</div>
      </div>
    </div>
  );
}
