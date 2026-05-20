import type { JSX } from 'react';
import { useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ROW_COUNT } from './logic';

interface Props {
  path: ('L' | 'R')[];
  bin: number;
  /** Called once after the ball "lands" (animation complete OR reduced-motion shortcut). */
  onLanded: () => void;
}

const ROW_DURATION_MS = 75;

/** Animates a ball down ROW_COUNT rows along `path`. At each row, the ball
 *  translates a constant horizontal step (left or right) and one row's height
 *  down. We use percent units so it scales with the Board's width. */
export default function FallingBall({ path, bin, onLanded }: Props): JSX.Element | null {
  const reduceMotion = useReducedMotion();

  // Build per-row x positions in percent (0-100). Centre column at top = 50%.
  // Each row, the ball moves ±2% horizontally.
  const xKeyframes = useMemo(() => {
    const xs: number[] = [50];
    let x = 50;
    for (let r = 0; r < ROW_COUNT; r += 1) {
      x += path[r] === 'R' ? 2 : -2;
      xs.push(x);
    }
    return xs;
  }, [path]);

  const yKeyframes = useMemo(() => {
    const ys: number[] = [0];
    for (let r = 0; r < ROW_COUNT; r += 1) {
      ys.push(((r + 1) / ROW_COUNT) * 90); // 0 → 90% of board height
    }
    return ys;
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      onLanded();
    }
    // Animation onComplete handles the non-reduced case.
  }, [reduceMotion, onLanded]);

  if (reduceMotion) return null;

  return (
    <motion.div
      className="absolute w-2.5 h-2.5 rounded-full pointer-events-none"
      style={{
        background: 'radial-gradient(circle at 30% 30%, #fff, #ff60ff)',
        boxShadow: '0 0 6px rgba(255, 96, 255, 0.7)',
        top: 0,
        left: 0,
        translateX: '-50%',
        translateY: '-50%',
      }}
      initial={{ left: `${xKeyframes[0]}%`, top: `${yKeyframes[0]}%` }}
      animate={{
        left: xKeyframes.slice(1).map((x) => `${x}%`),
        top: yKeyframes.slice(1).map((y) => `${y}%`),
      }}
      transition={{
        duration: (ROW_COUNT * ROW_DURATION_MS) / 1000,
        ease: 'easeIn',
        times: Array.from({ length: ROW_COUNT }, (_, i) => i / (ROW_COUNT - 1)),
      }}
      onAnimationComplete={onLanded}
      data-falling-ball
      data-bin={bin}
    />
  );
}
