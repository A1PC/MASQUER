import type { JSX } from 'react';
import { motion } from 'framer-motion';
import MaskMark from '@/components/brand/MaskMark';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
import { cn } from '@/components/ui';

interface BrandCoinProps {
  /** Which face should be showing once any flip animation lands. */
  side: 'heads' | 'tails';
  /** Diameter in px. Defaults to 160. */
  size?: number;
  /** When true, the coin spins 3x and lands on `side`. Honors reduced motion. */
  flipping?: boolean;
  className?: string;
}

/**
 * The MASQUER coin: porcelain mask for heads, Cinzel Decorative "M" for tails,
 * on a gold-gradient disc with bevel + drop shadow. The flip animation is a 3D
 * rotateY (transform-only, preserve-3d, backface-visibility hidden) so the
 * visible face crossfades-via-rotate cleanly. Under reduced motion the face
 * changes instantly (no animation). Pure presentational — no state, no I/O.
 *
 * Tails sits on the back face (pre-rotated 180deg) so we offset the base
 * rotation by 180 when side === 'tails'. The active spin lays three full
 * turns (1080deg) on top of that baseline.
 */
export default function BrandCoin({
  side,
  size = 160,
  flipping = false,
  className,
}: BrandCoinProps): JSX.Element {
  const reduce = useEffectiveReducedMotion();
  const spinning = flipping && !reduce;
  const baseRotation = side === 'tails' ? 180 : 0;
  const glyphPx = Math.round(size * 0.5);

  return (
    <div
      className={cn(
        'relative grid place-items-center rounded-full',
        // Coin gradient + bevel + outer glow. Intrinsically colour-bearing
        // brand art (documented exception to the tokens-only rule).
        'bg-[radial-gradient(circle_at_30%_30%,#fbe6a0,#d4af37_55%,#8a6620)]',
        'shadow-[0_0_28px_rgba(212,175,55,0.35),inset_0_4px_12px_rgba(255,255,255,0.35),inset_0_-4px_12px_rgba(0,0,0,0.35)]',
        className,
      )}
      style={{ width: size, height: size, perspective: 800 }}
      data-flipping={spinning ? 'true' : 'false'}
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: spinning ? baseRotation + 1080 : baseRotation }}
        transition={spinning ? { duration: 0.9, ease: [0.16, 1, 0.3, 1] } : { duration: 0 }}
      >
        {/* Heads face (front) */}
        <div
          className="absolute inset-0 grid place-items-center [backface-visibility:hidden]"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <MaskMark size={Math.round(size * 0.62)} variant="simple" title="MASQUER mask" />
        </div>
        {/* Tails face (back, pre-rotated) */}
        <div
          className="absolute inset-0 grid place-items-center [backface-visibility:hidden]"
          style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
        >
          <span
            aria-hidden
            className="font-display font-bold leading-none text-[#5b4310]"
            style={{ fontSize: glyphPx }}
          >
            M
          </span>
        </div>
      </motion.div>
    </div>
  );
}
