import type { JSX } from 'react';
import PlayingCard, {
  type Rank as PCRank,
  type Suit as PCSuit,
  type CardSize,
} from '@/components/brand/PlayingCard';
import type { Card as CardType, Rank, Suit } from './types';

interface Props {
  cards: readonly CardType[];
  /** Index of a card to render face-down (typically dealer's hole card at index 1). */
  faceDownIdx?: number;
  /** Card size — `lg` for the centre table, `md` for split / smaller layouts. */
  size?: CardSize;
}

/** Adapter: blackjack rank ('A'|'2'..|'K') → MasquerCard rank (1..13). */
function rankToNumber(rank: Rank): PCRank {
  if (rank === 'A') return 1;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  return Number.parseInt(rank, 10) as PCRank;
}

/** Adapter: blackjack suit ('♠'|'♥'|'♦'|'♣') → MasquerCard suit ('s'|'h'|'d'|'c'). */
function suitToLetter(suit: Suit): PCSuit {
  if (suit === '♠') return 's';
  if (suit === '♥') return 'h';
  if (suit === '♦') return 'd';
  return 'c';
}

/** Renders a fanned stack of MasquerCards with overlap (corners still visible). */
export default function HandView({ cards, faceDownIdx, size = 'lg' }: Props): JSX.Element {
  const overlap = size === 'lg' ? '-ml-12' : size === 'md' ? '-ml-9' : '-ml-7';
  return (
    <div className="flex flex-row">
      {cards.map((c, i) => {
        const isFaceDown = i === faceDownIdx || !c.faceUp;
        return (
          <div key={i} className={i === 0 ? '' : overlap}>
            <PlayingCard
              rank={rankToNumber(c.rank)}
              suit={suitToLetter(c.suit)}
              faceDown={isFaceDown}
              size={size}
            />
          </div>
        );
      })}
    </div>
  );
}
