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

  it('opens at version 6', () => {
    expect(db.verno).toBe(6);
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

describe('schema v5 → v6 wipes the four lottery tables (Phase 15 #9)', () => {
  it('clears lotteryDraws/Tickets/Lines/Favorites while preserving other tables', async () => {
    const dbName = 'masquer-v5-to-v6-test';
    // Seed a v5 database with rows in every relevant table.
    const v5 = new Dexie(dbName);
    v5.version(5).stores({
      users: 'id, &usernameLower, createdAt',
      balances: 'userId',
      rounds: 'id, userId, game, playedAt, [userId+playedAt]',
      sessions: 'id, userId, loginAt, [userId+loginAt]',
      gameVisits: 'id, userId, game, sessionId, [userId+game], [userId+enteredAt]',
      adjustments: 'id, userId, adjustedAt, [userId+adjustedAt]',
      lotteryDraws: 'id, drawAt',
      lotteryTickets: 'id, userId, drawId, purchasedAt, [userId+drawId]',
      lotteryLines: 'id, ticketId, userId, drawId, settled, [userId+drawId], [drawId+settled]',
      lotteryFavorites: 'id, userId, createdAt, [userId+createdAt]',
      bingoConfig: '&difficulty',
      prefs: 'userId',
    });
    await v5.open();
    // Lottery rows (must be wiped).
    await v5.table('lotteryDraws').add({
      id: '2026-05-19',
      drawAt: 100,
      mainNumbers: [1, 2, 3, 4, 5],
      bonus: 1,
      totalLines: 1,
      totalRevenue: 10,
      totalPayout: 0,
    });
    await v5.table('lotteryTickets').add({
      id: 't-1',
      userId: 'u-1',
      drawId: '2026-05-19',
      purchasedAt: 100,
      totalCost: 10,
      lineCount: 1,
    });
    await v5.table('lotteryLines').add({
      id: 'l-1',
      ticketId: 't-1',
      userId: 'u-1',
      drawId: '2026-05-19',
      mainNumbers: [1, 2, 3, 4, 5],
      bonusNumber: 1,
      isLuckyDip: false,
      isFreeReentry: false,
      settled: true,
      matchTier: null,
      payout: 0,
    });
    await v5.table('lotteryFavorites').add({
      id: 'f-1',
      userId: 'u-1',
      name: 'mine',
      mainNumbers: [1, 2, 3, 4, 5],
      bonusNumber: 1,
      createdAt: 100,
    });
    // Non-lottery rows (must survive).
    await v5.table('users').add({
      id: 'u-1',
      username: 'a',
      usernameLower: 'a',
      passwordHash: 'h',
      passwordSalt: 's',
      pbkdf2Iterations: 1,
      avatarColor: '#fff',
      createdAt: 1,
    });
    await v5.table('balances').add({ userId: 'u-1', chips: 100, updatedAt: 1 });
    await v5.table('rounds').add({
      id: 'r-1',
      userId: 'u-1',
      game: 'lottery',
      betAmount: 10,
      payout: 0,
      netChange: -10,
      outcome: 'loss',
      details: {},
      balanceAfter: 90,
      playedAt: 100,
    });
    await v5.table('prefs').add({
      userId: 'u-1',
      soundEnabled: true,
      masterVolume: 1,
      muteUi: false,
      muteGame: false,
      muteAmbience: false,
      motionPref: 'system',
    });
    v5.close();

    // Re-open at v6 — the destructive upgrade should run.
    const v6 = new Dexie(dbName);
    v6.version(5).stores({
      users: 'id, &usernameLower, createdAt',
      balances: 'userId',
      rounds: 'id, userId, game, playedAt, [userId+playedAt]',
      sessions: 'id, userId, loginAt, [userId+loginAt]',
      gameVisits: 'id, userId, game, sessionId, [userId+game], [userId+enteredAt]',
      adjustments: 'id, userId, adjustedAt, [userId+adjustedAt]',
      lotteryDraws: 'id, drawAt',
      lotteryTickets: 'id, userId, drawId, purchasedAt, [userId+drawId]',
      lotteryLines: 'id, ticketId, userId, drawId, settled, [userId+drawId], [drawId+settled]',
      lotteryFavorites: 'id, userId, createdAt, [userId+createdAt]',
      bingoConfig: '&difficulty',
      prefs: 'userId',
    });
    v6.version(6)
      .stores({
        users: 'id, &usernameLower, createdAt',
        balances: 'userId',
        rounds: 'id, userId, game, playedAt, [userId+playedAt]',
        sessions: 'id, userId, loginAt, [userId+loginAt]',
        gameVisits: 'id, userId, game, sessionId, [userId+game], [userId+enteredAt]',
        adjustments: 'id, userId, adjustedAt, [userId+adjustedAt]',
        lotteryDraws: 'id, drawAt',
        lotteryTickets: 'id, userId, drawId, purchasedAt, [userId+drawId]',
        lotteryLines: 'id, ticketId, userId, drawId, settled, [userId+drawId], [drawId+settled]',
        lotteryFavorites: 'id, userId, createdAt, [userId+createdAt]',
        bingoConfig: '&difficulty',
        prefs: 'userId',
      })
      .upgrade(async (tx) => {
        await tx.table('lotteryDraws').clear();
        await tx.table('lotteryTickets').clear();
        await tx.table('lotteryLines').clear();
        await tx.table('lotteryFavorites').clear();
      });
    await v6.open();
    // Lottery tables wiped.
    expect(await v6.table('lotteryDraws').count()).toBe(0);
    expect(await v6.table('lotteryTickets').count()).toBe(0);
    expect(await v6.table('lotteryLines').count()).toBe(0);
    expect(await v6.table('lotteryFavorites').count()).toBe(0);
    // Non-lottery tables preserved.
    expect(await v6.table('users').count()).toBe(1);
    expect(await v6.table('balances').count()).toBe(1);
    expect(await v6.table('rounds').count()).toBe(1);
    expect(await v6.table('prefs').count()).toBe(1);
    v6.close();
    await Dexie.delete(dbName);
  });
});

describe('schema v1 → v2 upgrade preserves existing data', () => {
  it('a user row created under v1 is still readable under v2', async () => {
    const tmp = new Dexie('masquer-upgrade-test');
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

    const upgraded = new Dexie('masquer-upgrade-test');
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
    await Dexie.delete('masquer-upgrade-test');
  });
});
