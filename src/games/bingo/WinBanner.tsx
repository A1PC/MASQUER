import type { JSX } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { BingoTier } from './logic';

interface Props {
  tier: BingoTier;
  cardId: string;
  onDismiss?: () => void;
}

const TIER_TEXT: Record<BingoTier, string> = {
  '1-line': 'LINE!',
  '2-line': 'DOUBLE LINE!',
  'full-house': 'BINGO!',
  'fast-full-house': 'FAST BINGO!',
};

const TIER_COLOR: Record<BingoTier, string> = {
  '1-line': 'bg-gold text-felt-deep',
  '2-line': 'bg-gold text-felt-deep ring-2 ring-chip-win',
  'full-house':
    'bg-gold text-felt-deep ring-4 ring-gold-bright shadow-[0_0_30px_rgba(212,175,55,0.7)]',
  'fast-full-house':
    'bg-neon-magenta text-felt-deep ring-4 ring-gold-bright shadow-[0_0_36px_rgba(232,74,140,0.7)]',
};

export default function WinBanner({ tier, cardId, onDismiss }: Props): JSX.Element {
  const reduce = useReducedMotion();
  const text = TIER_TEXT[tier];
  const colorClasses = TIER_COLOR[tier];
  const duration = reduce
    ? 0.2
    : tier === 'fast-full-house'
      ? 2.5
      : tier === 'full-house'
        ? 2
        : tier === '2-line'
          ? 1.2
          : 1;

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
      className={`pointer-events-none rounded-md px-4 py-2 text-center font-display text-base tracking-[0.18em] ${colorClasses}`}
      data-win-banner
      data-tier={tier}
      data-card-id={cardId}
    >
      {text}
    </motion.div>
  );
}
