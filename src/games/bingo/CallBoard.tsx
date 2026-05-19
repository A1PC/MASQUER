import type { JSX } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Variant } from './logic';
import { VARIANTS } from './logic';
import { ballPaletteFor } from './ballPalette';

interface Props {
  calledSoFar: number[];
  callCount: number;
  variant: Variant;
}

export default function CallBoard({ calledSoFar, callCount, variant }: Props): JSX.Element {
  const reduceMotion = useReducedMotion();
  const ballCount = VARIANTS[variant].ballCount;
  const current = calledSoFar[calledSoFar.length - 1] ?? null;
  const recent = calledSoFar.slice(-11, -1).reverse(); // 10 most recent excluding current

  return (
    <section
      className="flex flex-col items-center gap-3 rounded-md border border-gold/20 bg-felt-deep/70 p-4"
      data-call-board
    >
      <div className="flex items-center gap-4">
        {current !== null ? (
          <motion.div
            key={current}
            initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={
              reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 18 }
            }
          >
            <BingoBall value={current} variant={variant} size="large" />
          </motion.div>
        ) : (
          <div className="text-white/40 text-xs">Waiting for first call…</div>
        )}
        <div className="flex gap-1.5">
          {recent.map((v) => (
            <BingoBall key={`recent-${v}`} value={v} variant={variant} size="small" />
          ))}
        </div>
      </div>
      <div className="text-[10px] font-display tracking-wider text-white/50">
        Ball {callCount} of {ballCount}
      </div>
    </section>
  );
}

function BingoBall({
  value,
  variant,
  size,
}: {
  value: number;
  variant: Variant;
  size: 'large' | 'small';
}): JSX.Element {
  const palette = ballPaletteFor(value, variant);
  const dim = size === 'large' ? 'w-16 h-16 text-2xl' : 'w-6 h-6 text-[10px]';
  return (
    <div
      className={`${dim} rounded-full font-display flex items-center justify-center tabular-nums border-2 shadow-md`}
      style={{ background: palette.fill, borderColor: palette.ring, color: palette.textColor }}
      data-bingo-ball
      data-ball-value={value}
    >
      {value}
    </div>
  );
}
