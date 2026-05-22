import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Prefs } from '@/db';
import { usePrefsStore } from '@/store/prefsStore';
import { DEFAULT_PREFS } from '@/systems/prefs';

// Mock Framer's OS-level signal so the test controls `prefers-reduced-motion`.
const useReducedMotion = vi.fn<() => boolean | null>();
vi.mock('framer-motion', () => ({ useReducedMotion: () => useReducedMotion() }));

// Imported after the mock is registered.
import { useEffectiveReducedMotion } from './useEffectiveReducedMotion';

function seedMotionPref(motionPref: Prefs['motionPref']): void {
  usePrefsStore.setState({ prefs: { userId: 'u1', ...DEFAULT_PREFS, motionPref } });
}

describe('useEffectiveReducedMotion', () => {
  beforeEach(() => {
    usePrefsStore.setState({ prefs: null });
    useReducedMotion.mockReset();
  });

  // (osReduce) × (motionPref) → expected effective-reduced result.
  const cases: Array<{ os: boolean; pref: Prefs['motionPref']; expected: boolean }> = [
    { os: false, pref: 'system', expected: false },
    { os: true, pref: 'system', expected: true },
    { os: false, pref: 'full', expected: false },
    { os: true, pref: 'full', expected: false },
    { os: false, pref: 'reduced', expected: true },
    { os: true, pref: 'reduced', expected: true },
  ];

  it.each(cases)('os=$os pref=$pref → reduce=$expected', ({ os, pref, expected }) => {
    useReducedMotion.mockReturnValue(os);
    seedMotionPref(pref);
    const { result } = renderHook(() => useEffectiveReducedMotion());
    expect(result.current).toBe(expected);
  });

  it('treats a null OS signal as no-reduce under system pref', () => {
    useReducedMotion.mockReturnValue(null);
    seedMotionPref('system');
    const { result } = renderHook(() => useEffectiveReducedMotion());
    expect(result.current).toBe(false);
  });
});
