import type { JSX } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
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

const COLOR_STYLE: Record<'red' | 'black' | 'green', string> = {
  red: 'text-casino-red',
  black: 'text-white',
  green: 'text-chip-win',
};

export default function ResultBanner({ visible, spin, netChange }: Props): JSX.Element | null {
  const reduce = useReducedMotion();
  if (!visible || !spin) return null;

  const verdict =
    netChange > 0
      ? `You won $${netChange}`
      : netChange < 0
        ? `You lost $${Math.abs(netChange)}`
        : 'Even — $0';

  return (
    <AnimatePresence>
      <motion.div
        key="result-banner"
        initial={reduce ? { opacity: 1 } : { opacity: 0, y: -32 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -32 }}
        transition={{ duration: reduce ? 0 : 0.25, ease: 'easeOut' }}
        role="status"
        aria-live="polite"
        className="mx-auto mb-3 flex max-w-[520px] items-center justify-between rounded-md border border-gold/40 bg-felt-deep px-4 py-2 font-display text-sm tracking-wider"
      >
        <span className="text-gold-bright">
          <span className={COLOR_STYLE[spin.color]}>{spin.number}</span>
          <span className="mx-2 text-white/40">·</span>
          <span className={COLOR_STYLE[spin.color]}>{COLOR_LABEL[spin.color]}</span>
        </span>
        <span
          className={
            netChange > 0 ? 'text-chip-win' : netChange < 0 ? 'text-chip-loss' : 'text-chip-push'
          }
        >
          {verdict}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
