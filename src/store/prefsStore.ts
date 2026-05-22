import { create } from 'zustand';
import type { Prefs } from '@/db';
import { getOrCreatePrefs, savePrefs, DEFAULT_PREFS } from '@/systems/prefs';

/**
 * Per-user preferences store (sound + motion). Mirrors `walletStore`'s
 * hydrate/clear lifecycle — `AppBootstrap` hydrates on login and clears on
 * logout. `update` patches the in-memory prefs optimistically, then persists.
 */

interface PrefsState {
  prefs: Prefs | null;
  hydrate: (userId: string) => Promise<void>;
  clear: () => void;
  update: (patch: Partial<Omit<Prefs, 'userId'>>) => Promise<void>;
}

export const usePrefsStore = create<PrefsState>((set, get) => ({
  prefs: null,
  hydrate: async (userId) => set({ prefs: await getOrCreatePrefs(userId) }),
  clear: () => set({ prefs: null }),
  update: async (patch) => {
    const cur = get().prefs;
    if (!cur) return;
    const next = { ...cur, ...patch };
    set({ prefs: next });
    await savePrefs(next);
  },
}));

/** Effective prefs with defaults applied (safe before hydrate). */
export const effectivePrefs = (p: Prefs | null): Prefs => ({
  userId: p?.userId ?? '',
  ...DEFAULT_PREFS,
  ...(p ?? {}),
});
