import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { LocalGambleDB } from './schema';

describe('prefs table (v5)', () => {
  let db: LocalGambleDB;
  beforeEach(() => {
    db = new LocalGambleDB(`t-${crypto.randomUUID()}`);
  });

  it('round-trips a prefs row', async () => {
    await db.prefs.put({
      userId: 'u1',
      soundEnabled: true,
      masterVolume: 0.7,
      muteUi: false,
      muteGame: false,
      muteAmbience: true,
      motionPref: 'system',
    });
    expect((await db.prefs.get('u1'))?.masterVolume).toBe(0.7);
  });

  it('keeps existing tables openable alongside the new prefs store', async () => {
    // Touching a v4-era table confirms the v5 migration is additive.
    await db.balances.put({ userId: 'u2', chips: 100, updatedAt: Date.now() });
    expect((await db.balances.get('u2'))?.chips).toBe(100);
    expect(await db.prefs.get('missing')).toBeUndefined();
  });
});
