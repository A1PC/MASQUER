import type { JSX } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ShoeState } from './types';
import { cardsToCut } from './shoe';

interface Props {
  shoe: ShoeState;
  /** True only on the round that just started with a fresh shoe. */
  freshShoeBanner: boolean;
}

/**
 * Shoe-depth indicator. Three states swap by the same brass-on-felt pill:
 *   FRESH SHOE        — green emerald accent (just-shuffled).
 *   CUT — RESHUFFLING — velvet/scoreboard-banker red (cut card crossed).
 *   Shoe: N cards     — neutral ivory (default).
 */
export default function ShoeIndicator({ shoe, freshShoeBanner }: Props): JSX.Element {
  const remaining = shoe.cards.length;
  const toCut = cardsToCut(shoe);

  return (
    <div
      className="flex items-center gap-2 text-xs tabular-nums text-ivory/70"
      data-baccarat-shoe-indicator
    >
      <AnimatePresence mode="wait">
        {freshShoeBanner ? (
          <motion.span
            key="fresh"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="rounded bg-scoreboard-tie/20 px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.2em] text-scoreboard-tie"
          >
            FRESH SHOE
          </motion.span>
        ) : shoe.cutCardPassed ? (
          <motion.span
            key="cut"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded bg-scoreboard-banker/20 px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.2em] text-scoreboard-banker"
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
