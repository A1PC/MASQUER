import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { db } from '@/db';
import type { Adjustment, GameVisit, Session } from '@/db';

async function freshDb() {
  await db.delete();
  await db.open();
}

describe('schema v2', () => {
  beforeEach(async () => {
    await freshDb();
  });
  afterEach(async () => {
    await freshDb();
  });

  it('opens at version 5', () => {
    expect(db.verno).toBe(5);
  });

  it('has the new tables: sessions, gameVisits, adjustments', () => {
    const names = db.tables.map((t) => t.name).sort();
    expect(names).toContain('sessions');
    expect(names).toContain('gameVisits');
    expect(names).toContain('adjustments');
  });

  it('accepts a Session row insert + read', async () => {
    const row: Session = {
      id: 'sess-1',
      userId: 'u-1',
      loginAt: 1000,
      logoutAt: null,
      durationMs: null,
    };
    await db.sessions.add(row);
    const got = await db.sessions.get('sess-1');
    expect(got).toEqual(row);
  });

  it('accepts a GameVisit row insert + read', async () => {
    const row: GameVisit = {
      id: 'gv-1',
      userId: 'u-1',
      sessionId: 'sess-1',
      game: 'blackjack',
      enteredAt: 2000,
      exitedAt: null,
      durationMs: null,
    };
    await db.gameVisits.add(row);
    const got = await db.gameVisits.get('gv-1');
    expect(got).toEqual(row);
  });

  it('accepts an Adjustment row insert + read', async () => {
    const row: Adjustment = {
      id: 'adj-1',
      userId: 'u-1',
      amount: 500,
      reason: 'test grant',
      adjustedAt: 3000,
    };
    await db.adjustments.add(row);
    const got = await db.adjustments.get('adj-1');
    expect(got).toEqual(row);
  });

  it('queries sessions by [userId+loginAt] compound index', async () => {
    await db.sessions.bulkAdd([
      { id: 's-1', userId: 'u-1', loginAt: 100, logoutAt: 200, durationMs: 100 },
      { id: 's-2', userId: 'u-1', loginAt: 300, logoutAt: null, durationMs: null },
      { id: 's-3', userId: 'u-2', loginAt: 150, logoutAt: 250, durationMs: 100 },
    ]);
    const u1Sessions = await db.sessions
      .where('[userId+loginAt]')
      .between(['u-1', 0], ['u-1', Infinity])
      .toArray();
    expect(u1Sessions).toHaveLength(2);
    expect(u1Sessions.map((s) => s.id).sort()).toEqual(['s-1', 's-2']);
  });

  it('User isBanned is filterable (boolean filter, not native IndexedDB key)', async () => {
    await db.users.bulkAdd([
      {
        id: 'u-1',
        username: 'a',
        usernameLower: 'a',
        passwordHash: 'h',
        passwordSalt: 's',
        pbkdf2Iterations: 1,
        avatarColor: '#fff',
        createdAt: 1,
        isBanned: true,
      },
      {
        id: 'u-2',
        username: 'b',
        usernameLower: 'b',
        passwordHash: 'h',
        passwordSalt: 's',
        pbkdf2Iterations: 1,
        avatarColor: '#fff',
        createdAt: 2,
      },
    ]);
    const banned = await db.users.filter((u) => u.isBanned === true).toArray();
    expect(banned).toHaveLength(1);
    expect(banned[0]!.id).toBe('u-1');
  });
});

describe('schema v1 → v2 upgrade preserves existing data', () => {
  it('a user row created under v1 is still readable under v2', async () => {
    const tmp = new Dexie('localGamble-upgrade-test');
    tmp.version(1).stores({
      users: 'id, &usernameLower, createdAt',
      balances: 'userId',
      rounds: 'id, userId, game, playedAt, [userId+playedAt]',
    });
    await tmp.open();
    await tmp.table('users').add({
      id: 'legacy-1',
      username: 'Legacy',
      usernameLower: 'legacy',
      passwordHash: 'h',
      passwordSalt: 's',
      pbkdf2Iterations: 1,
      avatarColor: '#fff',
      createdAt: 1234,
    });
    tmp.close();

    const upgraded = new Dexie('localGamble-upgrade-test');
    upgraded.version(1).stores({
      users: 'id, &usernameLower, createdAt',
      balances: 'userId',
      rounds: 'id, userId, game, playedAt, [userId+playedAt]',
    });
    upgraded.version(2).stores({
      users: 'id, &usernameLower, createdAt',
      balances: 'userId',
      rounds: 'id, userId, game, playedAt, [userId+playedAt]',
      sessions: 'id, userId, loginAt, [userId+loginAt]',
      gameVisits: 'id, userId, game, sessionId, [userId+game], [userId+enteredAt]',
      adjustments: 'id, userId, adjustedAt, [userId+adjustedAt]',
    });
    await upgraded.open();
    const row = await upgraded.table('users').get('legacy-1');
    expect(row).toBeDefined();
    expect(row.username).toBe('Legacy');
    expect(row.isBanned).toBeUndefined();
    expect(row.loginCount).toBeUndefined();
    expect(row.lastLoginAt).toBeUndefined();
    upgraded.close();
    await Dexie.delete('localGamble-upgrade-test');
  });
});
