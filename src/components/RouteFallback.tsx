import type { JSX } from 'react';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';

interface Props {
  /** Caller-supplied label, e.g. "Loading admin…" or "Loading craps…". */
  label?: string;
}

/**
 * Brand-matching Suspense fallback for lazy-loaded routes.
 *
 * - `h-full` (NOT `min-h-screen`) so it composes correctly inside `AppLayout`
 *   without forcing the page past 100vh once `TopBar` sits above `main`.
 * - `bg-velvet-deep` + `text-ivory/40` continues the velvet stage palette
 *   while the next chunk streams in, avoiding a white flash.
 * - Animation: a small brass-tinted ring spins above the label. Under
 *   reduced-motion (either OS or per-user pref), the ring renders as a
 *   static brass glow so we still anchor the eye but never animate.
 *
 * The `data-route-fallback` attribute exists for E2E/test selectors.
 */
export default function RouteFallback({ label = 'Loading…' }: Props): JSX.Element {
  const reduce = useEffectiveReducedMotion();
  return (
    <div
      data-route-fallback
      className="flex h-full flex-col items-center justify-center gap-3 bg-velvet-deep text-xs text-ivory/40"
    >
      {reduce ? (
        <span
          aria-hidden="true"
          className="h-6 w-6 rounded-full border-2 border-brass/60 shadow-brass-glow"
        />
      ) : (
        <span
          aria-hidden="true"
          className="h-6 w-6 animate-spin rounded-full border-2 border-brass/30 border-t-brass shadow-brass-glow"
        />
      )}
      <span className="font-display tracking-[0.18em] uppercase">{label}</span>
    </div>
  );
}
