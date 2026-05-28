import type { JSX } from 'react';
import { motion } from 'framer-motion';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
import type { Variant } from './logic';
import { VARIANTS } from './logic';
import { ballPaletteFor } from './ballPalette';

interface Props {
  calledSoFar: number[];
  callCount: number;
  variant: Variant;
}

/**
 * Brass-framed call board: the current ball gets a dramatic scale-in + gold
 * glow flash (~250 ms — mirrors the lottery hero reveal from #255 task A.5).
 * Reduced motion short-circuits both the scale animation and the glow.
 */
export default function CallBoard({ calledSoFar, callCount, variant }: Props): JSX.Element {
  const reduceMotion = useEffectiveReducedMotion();
  const ballCount = VARIANTS[variant].ballCount;
  const current = calledSoFar[calledSoFar.length - 1] ?? null;
  const recent = calledSoFar.slice(-11, -1).reverse(); // 10 most recent excluding current

  return (
    <section
      className="flex flex-col items-center gap-3 rounded-md border border-brass/60 bg-felt-table-deep p-4 shadow-velvet-panel"
      data-call-board
      data-reduce-motion={reduceMotion}
    >
      <div className="flex items-center gap-4">
        {current !== null ? (
          <motion.div
            key={current}
            data-current-ball
            initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
            animate={{
              scale: reduceMotion ? 1 : [0.6, 1.05, 1],
              opacity: 1,
            }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={reduceMotion ? undefined : 'shadow-gold-glow rounded-full'}
          >
            <BingoBall value={current} variant={variant} size="large" />
          </motion.div>
        ) : (
          <div className="text-xs text-ivory/40">Waiting for first call&hellip;</div>
        )}
        <div className="flex gap-1.5">
          {recent.map((v) => (
            <BingoBall key={`recent-${v}`} value={v} variant={variant} size="small" />
          ))}
        </div>
      </div>
      <div className="font-display text-[10px] tracking-[0.18em] text-ivory/55">
        Ball {callCount} of {ballCount}
      </div>
    </section>
  );
}

/** American 5-column letter mapping (1–15 → B, 16–30 → I, …, 61–75 → O).
 *  Mirrors the column boundaries in `ballPalette.ts#americanBallStyle`. The
 *  letter is shown next to the called number on the hero ball so the variant
 *  reads as canonical "B-7" / "G-52" American bingo. British returns `null`
 *  (no column letter — UK deciles are colour-coded, not letter-coded). */
function americanLetter(value: number): 'B' | 'I' | 'N' | 'G' | 'O' | null {
  if (value <= 15) return 'B';
  if (value <= 30) return 'I';
  if (value <= 45) return 'N';
  if (value <= 60) return 'G';
  return 'O';
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
  // VARIANT-BRANCH (American-only, audit §2.8 cold-look): prefix the hero
  // ball with its column letter so the call reads as "B-7" rather than a
  // bare "7". Skipped on small recent-ball chips to keep them legible.
  const letter = variant === 'american' && size === 'large' ? americanLetter(value) : null;
  return (
    <div
      className={`${dim} flex items-center justify-center rounded-full border-2 font-display tabular-nums shadow-md`}
      style={{ background: palette.fill, borderColor: palette.ring, color: palette.textColor }}
      data-bingo-ball
      data-ball-value={value}
      {...(letter ? { 'data-ball-letter': letter } : {})}
    >
      {letter ? `${letter}-${value}` : value}
    </div>
  );
}
