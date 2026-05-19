// STUB: WinBanner simplified for PR A (BingoTier removed).
// PR C will rewrite with Tier type from new logic.
import type { JSX } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface Props {
  tier: string;
  cardId: string;
  onDismiss?: () => void;
}

export default function WinBanner({ tier, cardId, onDismiss }: Props): JSX.Element {
  const reduce = useReducedMotion();
  const duration = reduce ? 0.2 : 1.5;

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
      transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 300, damping: 18 }}
      onAnimationComplete={() => {
        if (onDismiss) {
          const ms = duration * 1000;
          setTimeout(onDismiss, ms);
        }
      }}
      className="pointer-events-none rounded-md bg-gold px-4 py-2 text-center font-display text-base tracking-[0.18em] text-felt-deep"
      data-win-banner
      data-tier={tier}
      data-card-id={cardId}
    >
      {tier.toUpperCase()}
    </motion.div>
  );
}
