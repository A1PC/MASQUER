import type { JSX } from 'react';
import { useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ROW_COUNT, buildTrajectory } from './geometry';

interface Props {
  path: ('L' | 'R')[];
  bin: number;
  /** Called once after the ball "lands" (animation complete OR reduced-motion shortcut). */
  onLanded: () => void;
  /** Optional: called once per peg impact (rows 1..ROW_COUNT-1) during the
   *  animation. Use for sound; PlinkoPage debounces across all in-flight balls. */
  onPegHit?: () => void;
}

const ROW_DURATION_MS = 75;

/** Animates a ball down the pyramid along the path the RNG produced.
 *
 *  The keyframe array is built from `pathColumns(path)` so the ball arrives at
 *  the exact peg (row, col) it would land on per the deterministic walk, then
 *  drops one extra step to `binCentreX(bin)` at y=100%. This is the
 *  load-bearing invariant: the final-frame x equals `binCentreX(bin)` (pinned
 *  by FallingBall.test). If it drifts the visible bucket no longer matches
 *  the resolved outcome.
 *
 *  Per-row easing collapses to `easeIn`. A subtle `scaleY` keyframe (1 →
 *  0.85 → 1) per row gives the peg-squish "kinetic" read. Reduced motion
 *  skips the animation and fires `onLanded` immediately. */
export default function FallingBall({ path, bin, onLanded, onPegHit }: Props): JSX.Element | null {
  const reduceMotion = useReducedMotion();

  // Build the keyframe arrays via the pure helper (also tested directly).
  const { x: xKeyframes, y: yKeyframes } = useMemo(() => buildTrajectory(path, bin), [path, bin]);

  useEffect(() => {
    if (reduceMotion) {
      // Single batched peg-hit signal so the page can play one synthesized
      // batched sound if it wants to (per Phase 15 patterns §1.5).
      onPegHit?.();
      onLanded();
    }
  }, [reduceMotion, onLanded, onPegHit]);

  if (reduceMotion) return null;

  // Schedule per-peg hit callbacks via independent timeouts. We fire onPegHit
  // at each peg arrival (rows 1..ROW_COUNT-1) — apex (row 0) doesn't count as
  // an "impact". PlinkoPage debounces across all in-flight balls (max 1 / 30 ms).
  return (
    <motion.div
      className="pointer-events-none absolute h-3 w-3 rounded-full"
      style={{
        background: 'radial-gradient(circle at 30% 30%, #fff, #e8bd6d 65%, #b88a3c)',
        boxShadow: '0 0 6px rgba(232, 189, 109, 0.65)',
        top: 0,
        left: 0,
        translateX: '-50%',
        translateY: '-50%',
      }}
      initial={{ left: `${xKeyframes[0]}%`, top: `${yKeyframes[0]}%`, scaleY: 1 }}
      animate={{
        left: xKeyframes.slice(1).map((x) => `${x}%`),
        top: yKeyframes.slice(1).map((y) => `${y}%`),
        // Brief scaleY squash near the bottom of each row; springs back at the
        // top of the next. Length = xKeyframes.length - 1 (matches animate arrays).
        scaleY: xKeyframes.slice(1).map((_, idx) => (idx % 2 === 0 ? 0.85 : 1)),
      }}
      transition={{
        duration: (xKeyframes.length * ROW_DURATION_MS) / 1000,
        ease: 'easeIn',
        times: Array.from({ length: xKeyframes.length - 1 }, (_, i) => i / (xKeyframes.length - 2)),
      }}
      onUpdate={() => {
        /* per-frame updates aren't needed; per-peg signal is via the timer below */
      }}
      onAnimationStart={() => {
        if (!onPegHit) return;
        // Fire per-peg callbacks at the cadence of ROW_DURATION_MS. Rows
        // 1..ROW_COUNT-1 are real peg impacts (row 0 = apex spawn, last
        // keyframe = bucket landing — separate signal via onLanded).
        for (let row = 1; row < ROW_COUNT; row += 1) {
          window.setTimeout(() => onPegHit(), row * ROW_DURATION_MS);
        }
      }}
      onAnimationComplete={onLanded}
      data-falling-ball
      data-bin={bin}
    />
  );
}
