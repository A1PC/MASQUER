import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { resetDb } from '@/test/db-helpers';
import { getOrCreatePrefs } from '@/systems/prefs';
import { DEFAULT_PREFS } from '@/systems/prefs';
import { usePrefsStore, effectivePrefs } from './prefsStore';

const u = 'user-p';

beforeEach(async () => {
  await resetDb();
  usePrefsStore.setState({ prefs: null });
});
afterEach(async () => {
  await resetDb();
});

describe('prefsStore', () => {
  it('starts with null prefs', () => {
    expect(usePrefsStore.getState().prefs).toBeNull();
  });

  it('hydrate seeds defaults for a new user', async () => {
    await usePrefsStore.getState().hydrate(u);
    const prefs = usePrefsStore.getState().prefs;
    expect(prefs).toEqual({ userId: u, ...DEFAULT_PREFS });
  });

  it('update patches in memory and persists to Dexie', async () => {
    await usePrefsStore.getState().hydrate(u);
    await usePrefsStore.getState().update({ masterVolume: 0.3, soundEnabled: false });
    expect(usePrefsStore.getState().prefs?.masterVolume).toBe(0.3);
    expect(usePrefsStore.getState().prefs?.soundEnabled).toBe(false);
    // A fresh read reflects the persisted change.
    const fresh = await getOrCreatePrefs(u);
    expect(fresh.masterVolume).toBe(0.3);
    expect(fresh.soundEnabled).toBe(false);
  });

  it('update is a no-op before hydrate (no prefs yet)', async () => {
    await usePrefsStore.getState().update({ masterVolume: 0.1 });
    expect(usePrefsStore.getState().prefs).toBeNull();
  });

  it('clear resets prefs to null', async () => {
    await usePrefsStore.getState().hydrate(u);
    usePrefsStore.getState().clear();
    expect(usePrefsStore.getState().prefs).toBeNull();
  });

  it('effectivePrefs applies defaults when prefs is null', () => {
    expect(effectivePrefs(null)).toEqual({ userId: '', ...DEFAULT_PREFS });
  });
});
