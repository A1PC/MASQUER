import type { JSX } from 'react';
import { motion } from 'framer-motion';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
import type { Roll } from './dice';

// Pip positions for each face value (row,col in a 3x3 grid; 0-indexed)
const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2],
  ],
  5: [
    [0, 0],
    [0, 2],
    [1, 1],
    [2, 0],
    [2, 2],
  ],
  6: [
    [0, 0],
    [0, 2],
    [1, 0],
    [1, 2],
    [2, 0],
    [2, 2],
  ],
};

interface DieFaceProps {
  face: number;
  'data-die'?: string;
}

function DieFace({ face, 'data-die': dataDie }: DieFaceProps): JSX.Element {
  const pips = PIP_LAYOUTS[face] ?? PIP_LAYOUTS[1]!;
  return (
    <div
      className="relative h-14 w-14 rounded-lg border-2 border-brass bg-gradient-to-br from-ivory via-ivory to-[#e2d4b6] shadow-lg"
      data-die={dataDie}
      data-face={face}
      style={{ boxShadow: '0 3px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.8)' }}
    >
      {/* 3×3 grid for pip placement */}
      <div className="absolute inset-[8px] grid grid-cols-3 grid-rows-3">
        {Array.from({ length: 9 }, (_, i) => {
          const row = Math.floor(i / 3);
          const col = i % 3;
          const hasPip = pips.some(([r, c]) => r === row && c === col);
          return (
            <div key={i} className="flex items-center justify-center">
              {hasPip && <div className="h-2.5 w-2.5 rounded-full bg-gold-bright" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface DiceProps {
  roll: Roll | null;
}

export default function Dice({ roll }: DiceProps): JSX.Element {
  const reduce = useEffectiveReducedMotion();

  const d1 = roll?.d1 ?? 1;
  const d2 = roll?.d2 ?? 1;

  // Key-based re-mount triggers animation on each new roll
  const rollKey = roll ? `${roll.d1}-${roll.d2}-${roll.total}` : 'init';

  const initial = reduce ? false : ({ rotate: 0, scale: 1.2, opacity: 0.6 } as const);
  const transitionProps = reduce
    ? ({ duration: 0 } as const)
    : ({ duration: 0.35, ease: 'easeOut' as const } as const);

  return (
    <div
      className="flex items-center gap-3"
      aria-label={roll ? `Rolled ${d1} and ${d2}` : 'No roll yet'}
    >
      <motion.div
        key={`d1-${rollKey}`}
        initial={initial}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        transition={transitionProps}
      >
        <DieFace face={d1} data-die="d1" />
      </motion.div>
      <motion.div
        key={`d2-${rollKey}`}
        initial={initial}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        transition={transitionProps}
      >
        <DieFace face={d2} data-die="d2" />
      </motion.div>
    </div>
  );
}
