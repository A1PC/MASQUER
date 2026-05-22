import { db } from '@/db';
import type { Prefs } from '@/db';

/**
 * Side-effecting data layer for per-user preferences (sound + motion). Reads and
 * writes the Dexie `prefs` table; rows are created lazily with `DEFAULT_PREFS`
 * on first access. Pure data — no React, no Web Audio (see `prefsStore` for the
 * reactive layer and `useSound` for the consumer).
 */

export const DEFAULT_PREFS: Omit<Prefs, 'userId'> = {
  soundEnabled: true,
  masterVolume: 0.7,
  muteUi: false,
  muteGame: false,
  muteAmbience: true,
  motionPref: 'system',
};

export async function getOrCreatePrefs(userId: string): Promise<Prefs> {
  const existing = await db.prefs.get(userId);
  if (existing) return existing;
  const created: Prefs = { userId, ...DEFAULT_PREFS };
  await db.prefs.put(created);
  return created;
}

export async function savePrefs(prefs: Prefs): Promise<void> {
  await db.prefs.put(prefs);
}
