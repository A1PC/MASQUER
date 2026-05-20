import type { JSX } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { HistoryEntry } from './machine';

interface Props {
  history: HistoryEntry[];
}

function pillColor(multi: number): string {
  if (multi >= 100) return 'bg-casino-red text-white';
  if (multi >= 5) return 'bg-gold text-felt-deep';
  if (multi >= 1) return 'bg-neon-cyan text-felt-deep';
  if (multi >= 0.5) return 'bg-white/10 text-white/70';
  return 'bg-casino-red-deep text-white/70';
}

export default function HistoryStrip({ history }: Props): JSX.Element {
  const last5 = history.slice(0, 5);
  return (
    <div className="flex flex-col gap-1.5" data-history-strip>
      <div className="text-[9px] text-white/40 uppercase tracking-wider">History</div>
      <AnimatePresence initial={false}>
        {last5.map((entry) => (
          <motion.div
            key={entry.ballId}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={`rounded-md px-2 py-1 text-[10px] font-display tabular-nums ${pillColor(entry.multiplier)}`}
            data-history-pill
          >
            {entry.multiplier}x{' '}
            <span className="opacity-75">
              {entry.payout >= entry.bet
                ? `+${entry.payout - entry.bet}`
                : `−${entry.bet - entry.payout}`}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
