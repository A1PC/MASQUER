import type { JSX } from 'react';
import { motion } from 'framer-motion';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';

interface Props {
  point: number | null;
}

/**
 * `PointPuck` — the ON/OFF disc on a craps table.
 *
 * Brand-tokened: gold-bright ON face (on-point) with felt-deep label; casino-red
 * OFF face (between points) with ivory label. Brass border throughout. Under
 * reduced motion the face/colour change is instant; otherwise Framer Motion
 * adds a subtle scale-flip across state transitions.
 */
export default function PointPuck({ point }: Props): JSX.Element {
  const reduce = useEffectiveReducedMotion();
  const isOn = point !== null;
  const label = isOn ? `ON ${point}` : 'OFF';
  const surfaceClass = isOn
    ? 'bg-gold-bright text-felt-deep border-brass'
    : 'bg-casino-red text-ivory border-brass';

  const initial = reduce ? false : { scale: 0.6, rotate: -20, opacity: 0 };
  const transition = reduce ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' as const };

  return (
    <motion.div
      key={isOn ? `on-${point}` : 'off'}
      initial={initial}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={transition}
      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-display text-[10px] font-bold tracking-[0.18em] shadow-lg ${surfaceClass}`}
      data-puck={isOn ? 'on' : 'off'}
      aria-label={isOn ? `Point is ON: ${point}` : 'Point is OFF'}
    >
      {isOn ? 'ON' : 'OFF'}
      <span className="sr-only">{label}</span>
    </motion.div>
  );
}
