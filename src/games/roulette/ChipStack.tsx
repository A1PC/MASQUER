// eslint-disable-next-line react-refresh/only-export-components
export { breakdown } from './chipBreakdown';
import type { JSX } from 'react';
import { motion } from 'framer-motion';
import type { ChipDenomination } from './config';
import { breakdown } from './chipBreakdown';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';

/**
 * Per-denomination Tailwind class triplet — keeps the placed-chip palette in
 * lock-step with `ChipSelector` (Phase 15 #6 re-skin, MASQUER Velvet Deco
 * tokens). Tokens come from `tailwind.config.ts` → `src/theme/tokens.ts`.
 */
const CHIP_STYLE: Record<ChipDenomination, { bg: string; ring: string; text: string }> = {
  5: { bg: 'bg-roulette-pocket-red', ring: 'border-porcelain', text: 'text-porcelain' },
  25: { bg: 'bg-jewel-emerald', ring: 'border-porcelain', text: 'text-porcelain' },
  100: { bg: 'bg-roulette-pocket', ring: 'border-brass', text: 'text-gold-bright' },
  250: { bg: 'bg-brass', ring: 'border-roulette-pocket', text: 'text-base' },
  500: { bg: 'bg-velvet-deep', ring: 'border-brass', text: 'text-ivory' },
  1000: { bg: 'bg-velvet', ring: 'border-brass', text: 'text-ivory' },
};

interface Props {
  amount: number;
  /** Optional fixed size for the chip. Default 24px. */
  size?: number;
}

const OVERFLOW_THRESHOLD = 6;

export default function ChipStack({ amount, size = 24 }: Props): JSX.Element | null {
  const reduce = useEffectiveReducedMotion();
  const chips = breakdown(amount);
  if (chips.length === 0) return null;

  // Phase 15 #6 — short scale/opacity entry animation on the *topmost* chip
  // so adding a chip feels tactile. Suppressed under reduced motion.
  const enter = reduce
    ? { initial: { scale: 1, opacity: 1 }, animate: { scale: 1, opacity: 1 } }
    : {
        initial: { scale: 0.6, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const },
      };

  if (chips.length <= OVERFLOW_THRESHOLD) {
    const lastIndex = chips.length - 1;
    return (
      <div
        className="pointer-events-none relative"
        style={{ width: size, height: size + chips.length * 3 }}
      >
        {chips.map((d, i) => {
          const palette = CHIP_STYLE[d];
          const isTop = i === lastIndex;
          const common = {
            'data-chip-denom': d,
            className: [
              'absolute left-0 grid place-items-center rounded-full border-2 text-[9px] font-bold',
              palette.bg,
              palette.ring,
              palette.text,
              'shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
            ].join(' '),
            style: { width: size, height: size, bottom: i * 3 },
          } as const;
          if (isTop) {
            return (
              <motion.div
                key={`${d}-${i}-top`}
                {...common}
                initial={enter.initial}
                animate={enter.animate}
                {...(enter.transition ? { transition: enter.transition } : {})}
              >
                {d}
              </motion.div>
            );
          }
          return (
            <div key={`${d}-${i}`} {...common}>
              {d}
            </div>
          );
        })}
      </div>
    );
  }

  // Overflow: top chip + total badge below
  const top = chips[0]!;
  const palette = CHIP_STYLE[top];
  return (
    <motion.div
      data-chip-stack-overflow
      initial={enter.initial}
      animate={enter.animate}
      {...(enter.transition ? { transition: enter.transition } : {})}
      className={[
        'pointer-events-none relative grid place-items-center rounded-full border-2 font-bold',
        palette.bg,
        palette.ring,
        palette.text,
        'shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
      ].join(' ')}
      style={{ width: size, height: size, fontSize: 9 }}
    >
      {top}
      <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded border border-brass bg-felt-table-deep px-1 text-[9px] text-gold-bright">
        {amount}
      </span>
    </motion.div>
  );
}
