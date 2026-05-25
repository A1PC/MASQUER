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
  /** Per-card stagger delay in ms, indexed by card position. Length must
   *  match `cards.length`. Defaults to all-zeros (no stagger). Consumed only
   *  on mount (Framer Motion's `initial` is one-shot) — used by the opening
   *  deal to sequence P1/D1/P2/D2 cards as they all mount in one render. */
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
 *  overlap so corners remain visible. New cards animate on mount via Framer
 *  Motion's one-shot `initial` (managed inside AnimatedCard); cards already
 *  mounted from a prior render stay put. Card keys include rank+suit so a
 *  slot swap (e.g. split) remounts and re-animates. */
export default function HandView({
  cards,
  faceDownIdx,
  size = 'lg',
  delaysMs,
  highlights,
  onCardLanded,
}: Props): JSX.Element {
  const overlap = size === 'lg' ? '-ml-12' : size === 'md' ? '-ml-9' : '-ml-7';
  return (
    <div className="flex flex-row">
      {cards.map((c, i) => {
        const isFaceDown = i === faceDownIdx || !c.faceUp;
        const delayMs = delaysMs?.[i] ?? 0;
        const highlight = highlights?.[i] ?? false;
        return (
          <div key={`${i}-${c.rank}${c.suit}`} className={i === 0 ? '' : overlap}>
            <AnimatedCard
              rank={rankToNumber(c.rank)}
              suit={suitToLetter(c.suit)}
              faceUp={!isFaceDown}
              size={size}
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
