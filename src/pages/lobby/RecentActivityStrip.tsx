import type { JSX } from 'react';
import { motion } from 'framer-motion';
import { Panel, Icon, Text } from '@/components/ui';
import { useRecentRounds } from '@/systems/hooks/useRecentRounds';
import { useCurrentUser } from '@/store/sessionStore';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
import { staggerContainer, staggerItem } from '@/motion/variants';

const OUTCOME_CLASS = {
  win: 'text-chip-win',
  loss: 'text-chip-loss',
  push: 'text-chip-push',
} as const;

/** Recent-activity strip — the last few rounds, re-skinned on the design system
 *  with a deco Panel, lucide section icon, and a reduced-motion-aware staggered
 *  reveal of the round rows. */
export default function RecentActivityStrip(): JSX.Element {
  const user = useCurrentUser();
  const rounds = useRecentRounds(user?.id, undefined, 5);
  const reduce = useEffectiveReducedMotion();
  // Omit `variants` when reduced (exactOptionalPropertyTypes rejects `undefined`).
  const itemProps = reduce ? {} : { variants: staggerItem };

  return (
    <Panel surface="felt" className="mt-6">
      <div className="mb-2 flex items-center gap-2">
        <Icon name="History" size={15} className="text-gold" />
        <span className="font-display text-[13px] uppercase tracking-[0.1em] text-gold">
          Recent Activity
        </span>
      </div>
      {rounds.length === 0 ? (
        <Text tone="muted" size="sm">
          No rounds played yet. Try the Coin Flip!
        </Text>
      ) : (
        <motion.ul
          className="space-y-1"
          variants={staggerContainer}
          initial={reduce ? false : 'hidden'}
          animate="visible"
        >
          {rounds.map((r) => (
            <motion.li
              key={r.id}
              {...itemProps}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-ivory/80">
                <span className="font-display uppercase tracking-[0.06em] text-ivory/90">
                  {r.game}
                </span>{' '}
                <span className="text-ivory/55">· bet {r.betAmount}</span>
              </span>
              <span className={`font-numeral tabular-nums ${OUTCOME_CLASS[r.outcome]}`}>
                {r.netChange > 0 ? '+' : ''}
                {r.netChange}
              </span>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </Panel>
  );
}
