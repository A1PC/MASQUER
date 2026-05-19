import type { JSX } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Tier } from './logic';
import { VARIANTS, type Variant } from './logic';

interface Props {
  source: 'user' | 'cpu';
  cpuIdx?: number;
  tier: Tier;
  variant: Variant;
  bannerKey: string;
  onDismiss: () => void;
}

export default function WinBanner({
  source,
  cpuIdx,
  tier,
  variant,
  onDismiss,
}: Props): JSX.Element {
  const reduceMotion = useReducedMotion();
  const label =
    tier === 'tier1'
      ? VARIANTS[variant].tier1Label
      : tier === 'tier2'
        ? VARIANTS[variant].tier2Label
        : VARIANTS[variant].tier3Label;
  const isUser = source === 'user';
  const prefix = isUser ? '' : `Computer ${(cpuIdx ?? 0) + 1} got `;
  const colors = isUser
    ? 'bg-gradient-to-r from-gold to-gold-bright text-felt-deep border-gold'
    : 'bg-felt-deep/90 text-white/70 border-white/20';

  return (
    <motion.div
      initial={reduceMotion ? false : { y: -16, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { y: -8, opacity: 0, scale: 0.95 }}
      transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 280, damping: 22 }}
      onAnimationComplete={() => {
        setTimeout(onDismiss, 2200);
      }}
      data-win-banner
      data-source={source}
      data-tier={tier}
      className={`px-5 py-2 rounded-full font-display text-sm tracking-wider border-2 shadow-lg ${colors}`}
    >
      {prefix}
      {label}
    </motion.div>
  );
}
