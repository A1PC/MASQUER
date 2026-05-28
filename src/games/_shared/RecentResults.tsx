import type { JSX } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export interface RecentResultItem {
  /** Stable key — typically the round.id from Dexie. */
  key: string;
  /** Short badge text (e.g. "H" / "T", "23 R", "🃏"). */
  badgeText: string;
  /** CSS color for the badge background. */
  badgeColor: string;
  /** CSS color for the badge text. */
  badgeTextColor: string;
  /** Bet amount label (e.g. "25"). */
  betLabel: string;
  /** Signed net change in chips (e.g. +25 or -10). */
  netChips: number;
  /** Outcome accent: drives the win/loss/push color on the net text. */
  accent: 'win' | 'loss' | 'push';
}

interface Props {
  items: readonly RecentResultItem[];
  emptyText?: string;
}

export default function RecentResults({ items, emptyText = 'No rounds yet.' }: Props): JSX.Element {
  const reduce = useReducedMotion();
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between px-1">
        <span className="font-display text-[10px] tracking-[0.18em] text-gold-bright">RECENT</span>
        <span className="font-mono text-[10px] text-ivory/40">last {items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="px-1 text-[11px] text-ivory/55">{emptyText}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <AnimatePresence initial={false}>
            {items.map((item, index) => (
              <motion.div
                key={item.key}
                layout
                initial={reduce ? { opacity: 1 } : { opacity: 0, y: -12 }}
                animate={{ opacity: 1 - index * 0.06, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="flex items-center justify-between rounded-md bg-velvet/30 px-2.5 py-2"
              >
                <span className="flex items-center gap-1.5 text-[13px] text-ivory">
                  <span
                    className="inline-grid h-[18px] w-[18px] place-items-center rounded-full font-display text-[9px] font-bold"
                    style={{ background: item.badgeColor, color: item.badgeTextColor }}
                  >
                    {item.badgeText}
                  </span>
                  <span className="font-mono text-[11px] opacity-70">{item.betLabel}</span>
                </span>
                <span
                  className={`font-mono text-[13px] font-bold ${
                    item.accent === 'win'
                      ? 'text-chip-win'
                      : item.accent === 'loss'
                        ? 'text-chip-loss'
                        : 'text-chip-push'
                  }`}
                >
                  {item.netChips > 0 ? '+' : ''}
                  {item.netChips}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
