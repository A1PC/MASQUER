import type { JSX } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ShoeState } from './types';
import { cardsToCut } from './shoe';

interface Props {
  shoe: ShoeState;
  /** True only on the round that just started with a fresh shoe. */
  freshShoeBanner: boolean;
}

export default function ShoeIndicator({ shoe, freshShoeBanner }: Props): JSX.Element {
  const remaining = shoe.cards.length;
  const toCut = cardsToCut(shoe);

  return (
    <div className="flex items-center gap-2 text-xs tabular-nums text-white/70">
      <AnimatePresence mode="wait">
        {freshShoeBanner ? (
          <motion.span
            key="fresh"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="rounded bg-chip-win/20 px-2 py-0.5 font-display text-[10px] tracking-[0.2em] text-chip-win"
          >
            FRESH SHOE
          </motion.span>
        ) : shoe.cutCardPassed ? (
          <motion.span
            key="cut"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded bg-casino-red/20 px-2 py-0.5 font-display text-[10px] tracking-[0.2em] text-casino-red"
          >
            CUT — RESHUFFLING NEXT ROUND
          </motion.span>
        ) : (
          <motion.span
            key="depth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            data-shoe-depth
          >
            Shoe: {remaining} cards · cut in {Math.max(toCut, 0)}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
