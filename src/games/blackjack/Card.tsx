import type { JSX } from 'react';
import type { Card as CardType, Rank } from './types';
import { PIP_LAYOUTS } from './PIP_LAYOUT';

interface Props {
  card: CardType | null;
  /** When true, render the back of the card regardless of `card.faceUp`. */
  faceDown?: boolean;
}

const COURT_RANKS: ReadonlySet<Rank> = new Set(['J', 'Q', 'K']);

export default function Card({ card, faceDown = false }: Props): JSX.Element {
  if (!card || faceDown || !card.faceUp) {
    return <CardBack />;
  }
  const isRed = card.suit === '♥' || card.suit === '♦';
  const colorClass = isRed ? 'text-casino-red' : 'text-felt-deep';
  const glowClass = isRed
    ? 'drop-shadow-[0_0_4px_rgba(255,92,242,0.35)]'
    : 'drop-shadow-[0_0_4px_rgba(61,240,255,0.35)]';

  return (
    <div
      className={`relative h-[124px] w-[88px] flex-shrink-0 rounded-lg ${colorClass}`}
      style={{
        background: 'linear-gradient(160deg,#fff 0%,#fff 70%,#f8f3e3 100%)',
        boxShadow:
          '0 4px 14px rgba(0,0,0,0.4), inset 0 0 0 1.5px #d4af37, inset 0 0 0 2.5px rgba(255,255,255,0.6)',
        fontFamily: 'Times New Roman, Times, serif',
        fontWeight: 'bold',
      }}
    >
      <Corner rank={card.rank} suit={card.suit} glowClass={glowClass} position="tl" />
      <CenterArt card={card} glowClass={glowClass} />
      <Corner rank={card.rank} suit={card.suit} glowClass={glowClass} position="br" />
    </div>
  );
}

function Corner({
  rank,
  suit,
  glowClass,
  position,
}: {
  rank: Rank;
  suit: string;
  glowClass: string;
  position: 'tl' | 'br';
}) {
  const positionClasses =
    position === 'tl' ? 'top-[6px] left-[8px]' : 'bottom-[6px] right-[8px] rotate-180';
  return (
    <div className={`absolute flex flex-col items-center leading-none ${positionClasses}`}>
      <span className="text-[18px]">{rank}</span>
      <span className={`mt-[1px] text-[12px] ${glowClass}`}>{suit}</span>
    </div>
  );
}

function CenterArt({ card, glowClass }: { card: CardType; glowClass: string }) {
  const { rank, suit } = card;
  if (rank === 'A') {
    return (
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className={`text-[50px] ${glowClass}`}>{suit}</span>
      </div>
    );
  }
  if (COURT_RANKS.has(rank)) {
    return (
      <div
        className={`absolute inset-x-[12px] inset-y-[18px] flex items-center justify-center rounded-[3px] text-[38px] ${glowClass}`}
        style={{ border: '1.5px solid currentColor' }}
      >
        {rank}
      </div>
    );
  }
  const positions = PIP_LAYOUTS[rank] ?? [];
  return (
    <div
      className="absolute inset-x-[16px] inset-y-[18px] grid items-center justify-items-center"
      style={{
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(7, 1fr)',
        lineHeight: 0.9,
      }}
    >
      {positions.map((pos, i) => (
        <span
          key={i}
          className={`text-[16px] ${glowClass}`}
          style={{ gridRow: pos.row + 1, gridColumn: pos.col + 1 }}
        >
          {suit}
        </span>
      ))}
    </div>
  );
}

function CardBack(): JSX.Element {
  return (
    <div
      className="relative h-[124px] w-[88px] flex-shrink-0 rounded-lg"
      style={{
        background:
          'repeating-linear-gradient(45deg, transparent 0 3px, rgba(212,175,55,0.13) 3px 4px),' +
          'repeating-linear-gradient(-45deg, transparent 0 3px, rgba(212,175,55,0.13) 3px 4px),' +
          'radial-gradient(circle at 30% 30%, #c11d35 0%, #a3122a 40%, #6e0a1d 100%)',
        boxShadow:
          '0 4px 14px rgba(0,0,0,0.4), 0 0 16px rgba(212,175,55,0.3), inset 0 0 0 3px #d4af37, inset 0 0 0 4.5px rgba(0,0,0,0.3)',
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
