import type { JSX } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
import type { SpinResult } from './types';

interface Props {
  visible: boolean;
  spin: SpinResult | null;
  netChange: number;
}

const COLOR_LABEL: Record<'red' | 'black' | 'green', string> = {
  red: 'RED',
  black: 'BLACK',
  green: 'GREEN',
};

/**
 * Token-driven verdict colour. `red` numbers ride the velvet-deep token (the
 * MASQUER oxblood); `black` ride the bright ivory for legibility on the dark
 * banner; `green` (the zero) rides the jewel-emerald.
 */
const COLOR_STYLE: Record<'red' | 'black' | 'green', string> = {
  red: 'text-velvet-deep bg-ivory/95 px-2 py-0.5 rounded-sm',
  black: 'text-ivory',
  green: 'text-jewel-emerald',
};

export default function ResultBanner({ visible, spin, netChange }: Props): JSX.Element | null {
  const reduce = useEffectiveReducedMotion();
  if (!visible || !spin) return null;

  const verdict =
    netChange > 0
      ? `You won $${netChange}`
      : netChange < 0
        ? `You lost $${Math.abs(netChange)}`
        : 'Even — $0';

  const verdictTone =
    netChange > 0 ? 'text-gold-bright' : netChange < 0 ? 'text-velvet-deep' : 'text-ivory/75';

  return (
    <AnimatePresence>
      <motion.div
        key="result-banner"
        initial={reduce ? { opacity: 1 } : { opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16 }}
        transition={{ duration: reduce ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] as const }}
        role="status"
        aria-live="polite"
        className={[
          'mx-auto mb-3 flex max-w-[520px] items-center justify-between',
          'rounded-md border border-brass/70 bg-felt-table-deep px-4 py-2.5',
          'font-display text-sm tracking-[0.14em] shadow-gold-glow',
        ].join(' ')}
      >
        <span className="flex items-center gap-2 text-ivory">
          <span className={COLOR_STYLE[spin.color]}>{spin.number}</span>
          <span className="text-ivory/35">·</span>
          <span className={COLOR_STYLE[spin.color]}>{COLOR_LABEL[spin.color]}</span>
        </span>
        <span className={verdictTone}>{verdict}</span>
      </motion.div>
    </AnimatePresence>
  );
}
