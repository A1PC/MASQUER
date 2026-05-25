import type { JSX } from 'react';
import AnimatedCard from './AnimatedCard';
import {
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
  /** Number of cards already present before this render. Cards at indexes
   *  `[firstAnimatedIdx, cards.length)` are treated as newly dealt and will
   *  fly in from the deck anchor; earlier indexes render statically.
   *  Defaults to 0 (animate every card — used on first mount). */
  firstAnimatedIdx?: number;
  /** Per-card stagger delay in ms, indexed by card position. Length must
   *  match `cards.length`. Defaults to all-zeros (no stagger). Only consulted
   *  for cards in the animated window (i.e. indexes ≥ firstAnimatedIdx). */
  delaysMs?: readonly number[];
  /** Per-card "highlight" flag — adds a gold pulsing ring around the card.
   *  Used by the inline Ace panel to mark the card being valued. Indexed
   *  alongside `cards`. Defaults to all-false. */
  highlights?: readonly boolean[];
  /** Called when a specific card's flight segment completes (the card has
   *  LANDED at its slot). Fires once per dealt card; used by the page to play
   *  `card.deal` on landing rather than on diff. Skipped in reduced-motion
   *  (the page batches a single sound in that path). */
  onCardLanded?: (idx: number) => void;
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

/** Renders a fanned stack of MasquerCards (wrapped in AnimatedCard) with
 *  overlap so corners remain visible. Cards beyond `firstAnimatedIdx` fly in
 *  from the deck anchor (animation handled by `AnimatedCard`). */
export default function HandView({
  cards,
  faceDownIdx,
  size = 'lg',
  firstAnimatedIdx = 0,
  delaysMs,
  highlights,
  onCardLanded,
}: Props): JSX.Element {
  const overlap = size === 'lg' ? '-ml-12' : size === 'md' ? '-ml-9' : '-ml-7';
  return (
    <div className="flex flex-row">
      {cards.map((c, i) => {
        const isFaceDown = i === faceDownIdx || !c.faceUp;
        const animateIn = i >= firstAnimatedIdx;
        const delayMs = delaysMs?.[i] ?? 0;
        const highlight = highlights?.[i] ?? false;
        return (
          <div key={i} className={i === 0 ? '' : overlap}>
            <AnimatedCard
              rank={rankToNumber(c.rank)}
              suit={suitToLetter(c.suit)}
              faceUp={!isFaceDown}
              size={size}
              animateIn={animateIn}
              delayMs={delayMs}
              highlight={highlight}
              {...(onCardLanded ? { onLanded: () => onCardLanded(i) } : {})}
            />
          </div>
        );
      })}
    </div>
  );
}
