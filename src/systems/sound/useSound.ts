import { useCallback } from 'react';
import { usePrefsStore, effectivePrefs } from '@/store/prefsStore';
import { soundEngine } from './engine';
import { SOUND_CATEGORY, type SoundId } from './ids';

/**
 * React entry point for playing sounds. Subscribes to `prefsStore` so plays are
 * gated by the user's effective prefs (global enable, per-category mute, master
 * volume) and routed through the prefs-agnostic `soundEngine`. Returns a stable
 * `play(id, { volume })` callback.
 */
export function useSound(): { play: (id: SoundId, opts?: { volume?: number }) => void } {
  const prefs = usePrefsStore((s) => s.prefs);
  const play = useCallback(
    (id: SoundId, opts?: { volume?: number }) => {
      const p = effectivePrefs(prefs);
      if (!p.soundEnabled) return;
      const cat = SOUND_CATEGORY[id];
      if (
        (cat === 'ui' && p.muteUi) ||
        (cat === 'game' && p.muteGame) ||
        (cat === 'ambience' && p.muteAmbience)
      ) {
        return;
      }
      soundEngine.play(id, (opts?.volume ?? 1) * p.masterVolume);
    },
    [prefs],
  );
  return { play };
}
