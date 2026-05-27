import type { JSX } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { HistoryEntry } from './machine';

interface Props {
  history: HistoryEntry[];
}

function pillTier(multi: number): string {
  if (multi >= 100) return 'bg-jewel-magenta/50 text-ivory border-brass';
  if (multi >= 5) return 'bg-velvet text-gold-bright border-brass/80';
  if (multi >= 1) return 'bg-felt-table-deep text-gold border-brass/60';
  if (multi >= 0.85) return 'bg-felt-table-deep/70 text-ivory/80 border-brass/40';
  return 'bg-felt-table-deep/50 text-ivory/55 border-brass/30';
}

export default function HistoryStrip({ history }: Props): JSX.Element {
  const last5 = history.slice(0, 5);
  return (
    <div className="flex flex-col gap-1.5" data-history-strip>
      <div className="font-display text-[10px] uppercase tracking-[0.18em] text-ivory/55">
        History
      </div>
      <AnimatePresence initial={false}>
        {last5.map((entry) => (
          <motion.div
            key={entry.ballId}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={`rounded-md border px-2 py-1 font-mono text-[10px] tabular-nums ${pillTier(entry.multiplier)}`}
            data-history-pill
          >
            {entry.multiplier}x{' '}
            <span className="opacity-75">
              {entry.payout >= entry.bet
                ? `+${(entry.payout - entry.bet).toLocaleString()}`
                : `−${(entry.bet - entry.payout).toLocaleString()}`}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
