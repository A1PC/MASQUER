import type { JSX } from 'react';
import { motion } from 'framer-motion';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
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
  const reduce = useEffectiveReducedMotion();
  const count = visibleCount(street);

  return (
    <div className="flex flex-col items-center gap-3" data-community-board>
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => {
          const card = i < count ? (board[i] ?? null) : null;
          const isHighlight = highlightIndices.includes(i);
          if (i < count) {
            // Each new card uses the dramatic reveal variant — scale 0.6 →
            // 1.05 → 1, gold-glow ease-out, ~250ms inter-card stagger for the
            // flop. Reduced-motion users get an instant render.
            const variant = reduce
              ? { initial: false, animate: { scale: 1, opacity: 1 } }
              : {
                  initial: { scale: 0.6, opacity: 0 },
                  animate: { scale: [0.6, 1.05, 1], opacity: 1 },
                  transition: {
                    duration: 0.4,
                    // Stagger only applies to the flop (3 cards); turn / river
                    // append a single card and should animate immediately.
                    delay: street === 'flop' ? i * 0.25 : 0,
                    ease: [0.16, 1, 0.3, 1] as const,
                  },
                };
            return (
              <motion.div
                key={`${street}-${i}-${card?.rank}${card?.suit}`}
                data-board-card={i}
                {...variant}
              >
                <PlayingCard
                  card={card}
                  size="table"
                  {...(isHighlight ? { highlight: true } : {})}
                />
              </motion.div>
            );
          }
          // Placeholder slot for not-yet-dealt cards
          return (
            <div
              key={`slot-${i}`}
              data-board-slot={i}
              className="h-[182px] w-[130px] flex-shrink-0 rounded-[10px] border border-brass/40 bg-velvet-deep/40"
            />
          );
        })}
      </div>
      <div className="font-mono text-2xl tabular-nums text-gold-bright tracking-[0.18em]" data-pot>
        POT: {pot.toLocaleString()}
      </div>
    </div>
  );
}
