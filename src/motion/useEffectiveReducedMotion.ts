import { useReducedMotion } from 'framer-motion';
import { usePrefsStore, effectivePrefs } from '@/store/prefsStore';

/**
 * The single source of truth for "should this animation collapse to instant?".
 *
 * Combines the OS `prefers-reduced-motion: reduce` signal (via Framer's
 * `useReducedMotion`) with the per-user `motionPref`:
 * - `motionPref === 'reduced'` → always reduce (overrides the OS).
 * - `motionPref === 'full'`    → never reduce (overrides the OS).
 * - `motionPref === 'system'`  → follow the OS setting.
 *
 * Returns `true` when motion should be reduced.
 */
export function useEffectiveReducedMotion(): boolean {
  const osReduce = useReducedMotion() ?? false;
  const pref = effectivePrefs(usePrefsStore((s) => s.prefs)).motionPref;
  if (pref === 'reduced') return true;
  if (pref === 'full') return false;
  return osReduce;
}
