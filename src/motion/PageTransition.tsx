import type { JSX, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router';
import { slideUp } from './variants';
import { useEffectiveReducedMotion } from './useEffectiveReducedMotion';

/**
 * Cross-route transition wrapper for the `AppLayout` `<Outlet/>`. Keyed by the
 * current pathname so `AnimatePresence` plays the `slideUp` exit of the leaving
 * route before the new route enters (forward = rise up, matching the #0
 * direction rule). When effective-reduced-motion is on, children render
 * directly — no motion wrapper, no exit wait — so navigation is instant.
 */
export function PageTransition({ children }: { children: ReactNode }): JSX.Element {
  const reduce = useEffectiveReducedMotion();
  const { pathname } = useLocation();

  if (reduce) return <>{children}</>;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={slideUp}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
