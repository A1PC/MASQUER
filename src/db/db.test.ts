import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';

describe('LocalGambleDB schema', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('opens cleanly', () => {
    expect(db.isOpen()).toBe(true);
  });

  it('enforces unique usernameLower index on users', async () => {
    const base = {
      passwordHash: 'h',
      passwordSalt: 's',
      pbkdf2Iterations: 600_000,
      avatarColor: '#a3122a',
      createdAt: Date.now(),
    };
    await db.users.add({
      id: 'a',
      username: 'Adam',
      usernameLower: 'adam',
      ...base,
    });
    await expect(
      db.users.add({
        id: 'b',
        username: 'aDaM',
        usernameLower: 'adam',
        ...base,
      }),
    ).rejects.toMatchObject({ name: 'ConstraintError' });
  });

  it('round-trips a balance row', async () => {
    await db.balances.add({ userId: 'u1', chips: 1000, updatedAt: 123 });
    const got = await db.balances.get('u1');
    expect(got).toEqual({ userId: 'u1', chips: 1000, updatedAt: 123 });
  });

  it('queries rounds by [userId+playedAt] compound index', async () => {
    await db.rounds.bulkAdd([
      {
        id: 'r1',
        userId: 'u1',
        game: 'blackjack',
        betAmount: 10,
        payout: 20,
        netChange: 10,
        outcome: 'win',
        details: null,
        balanceAfter: 1010,
        playedAt: 100,
      },
      {
        id: 'r2',
        userId: 'u1',
        game: 'roulette',
        betAmount: 5,
        payout: 0,
        netChange: -5,
        outcome: 'loss',
        details: null,
        balanceAfter: 1005,
        playedAt: 200,
      },
      {
        id: 'r3',
        userId: 'u2',
        game: 'slots',
        betAmount: 1,
        payout: 0,
        netChange: -1,
        outcome: 'loss',
        details: null,
        balanceAfter: 999,
        playedAt: 150,
      },
    ]);
    const u1Rounds = await db.rounds
      .where('[userId+playedAt]')
      .between(['u1', 0], ['u1', Number.MAX_SAFE_INTEGER])
      .toArray();
    expect(u1Rounds.map((r) => r.id)).toEqual(['r1', 'r2']);
  });

  it('resetDb empties all tables', async () => {
    await db.users.add({
      id: 'a',
      username: 'Adam',
      usernameLower: 'adam',
      passwordHash: 'h',
      passwordSalt: 's',
      pbkdf2Iterations: 600_000,
      avatarColor: '#a3122a',
      createdAt: Date.now(),
    });
    await resetDb();
    expect(await db.users.count()).toBe(0);
  });
});
