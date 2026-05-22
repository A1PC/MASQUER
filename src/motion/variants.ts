import type { Variants, Transition } from 'framer-motion';

/**
 * Shared Framer Motion variant library — the single source of truth for
 * MASQUER's motion vocabulary (the #0 motion principles). Every animation here
 * touches only `transform`/`opacity` (no layout-thrashing width/height/top/left),
 * stays inside the 150–300ms window, and pairs an ease-out enter with a shorter
 * ease-in exit (~70% of the enter duration) so navigation/dismissal feels snappy.
 *
 * Components consult `useEffectiveReducedMotion()` to collapse these to instant
 * when the user prefers reduced motion — the variants themselves are unconditional.
 */

/** Decelerating ease-out for elements entering rest (200ms). */
export const EASE_OUT: Transition = { duration: 0.2, ease: [0.16, 1, 0.3, 1] };
/** Accelerating ease-in for elements leaving (140ms ≈ 70% of enter). */
export const EASE_IN: Transition = { duration: 0.14, ease: [0.7, 0, 0.84, 0] };

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: EASE_OUT },
  exit: { opacity: 0, transition: EASE_IN },
};

/** Cards / modals — a subtle scale + fade from the trigger's spatial context. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: EASE_OUT },
  exit: { opacity: 0, scale: 0.97, transition: EASE_IN },
};

/** Forward navigation / surfacing content — rises into place, exits upward. */
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: EASE_OUT },
  exit: { opacity: 0, y: -8, transition: EASE_IN },
};

/** Drawers / side sheets — slide in from the right edge. */
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: EASE_OUT },
  exit: { opacity: 0, x: 24, transition: EASE_IN },
};

/** Orchestrates staggered child reveals (~40ms cadence). */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

/** Child of `staggerContainer` — reuses `slideUp` for a consistent rhythm. */
export const staggerItem: Variants = slideUp;
