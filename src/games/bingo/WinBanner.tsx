import type { JSX } from 'react';
import { motion } from 'framer-motion';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
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

/** Floating banner above the call board. Tier-3 user win wears the jewel
 *  magenta signature; tier-1/2 user wins keep the gold-on-velvet treatment.
 *  CPU banners stay subdued so they don't compete with player celebrations. */
export default function WinBanner({
  source,
  cpuIdx,
  tier,
  variant,
  onDismiss,
}: Props): JSX.Element {
  const reduceMotion = useEffectiveReducedMotion();
  const label =
    tier === 'tier1'
      ? VARIANTS[variant].tier1Label
      : tier === 'tier2'
        ? VARIANTS[variant].tier2Label
        : VARIANTS[variant].tier3Label;
  const isUser = source === 'user';
  const prefix = isUser ? '' : `Computer ${(cpuIdx ?? 0) + 1} got `;
  const colors = isUser
    ? tier === 'tier3'
      ? 'bg-velvet text-gold-bright border-jewel-magenta shadow-[0_0_18px_rgba(232,74,140,0.55)]'
      : 'bg-gradient-to-r from-gold to-gold-bright text-velvet-deep border-gold'
    : 'bg-felt-table-deep text-ivory/70 border-brass/40';

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
      className={`rounded-full border-2 px-5 py-2 font-display text-sm tracking-[0.18em] shadow-lg ${colors}`}
    >
      {prefix}
      {label}
    </motion.div>
  );
}
