import type { JSX } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { Card } from '../_shared/types';
import PlayingCard from '../_shared/PlayingCard';

type Street = 'preflop' | 'flop' | 'turn' | 'river';

interface Props {
  /** Always 5 cards (from machine); street determines how many to SHOW. */
  board: Card[];
  street: Street;
  pot: number;
  /** Card indices that are part of winning best-5 */
  highlightIndices?: number[];
}

function visibleCount(street: Street): number {
  if (street === 'preflop') return 0;
  if (street === 'flop') return 3;
  if (street === 'turn') return 4;
  return 5;
}

export default function CommunityBoard({
  board,
  street,
  pot,
  highlightIndices = [],
}: Props): JSX.Element {
  const reduce = useReducedMotion();
  const count = visibleCount(street);

  return (
    <div className="flex flex-col items-center gap-2" data-community-board>
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => {
          const card = i < count ? (board[i] ?? null) : null;
          const isHighlight = highlightIndices.includes(i);
          if (i < count) {
            return (
              <div
                key={i}
                data-board-card={i}
                className={reduce ? '' : 'transition-all duration-300'}
              >
                <PlayingCard
                  card={card}
                  size="table"
                  {...(isHighlight ? { highlight: true } : {})}
                />
              </div>
            );
          }
          // Placeholder slot for not-yet-dealt cards
          return (
            <div
              key={i}
              data-board-slot={i}
              className="h-[124px] w-[88px] flex-shrink-0 rounded-lg border border-gold/20 bg-felt-deep/50"
            />
          );
        })}
      </div>
      <div className="font-display text-sm tracking-widest text-gold" data-pot>
        POT: {pot.toLocaleString()}
      </div>
    </div>
  );
}
