import { beforeEach, describe, expect, it } from 'vitest';
import { adjustBalance, banUser, unbanUser } from './admin';
import { register } from '@/systems/auth';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { WALLET_CONFIG } from '@/systems/wallet';

const SESSION_KEY = 'localGamble.session.userId';

describe('admin.banUser / admin.unbanUser', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('banUser flips isBanned to true on the user row', async () => {
    const reg = await register({ username: 'alice', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    await banUser(reg.user.id);
    const row = await db.users.get(reg.user.id);
    expect(row?.isBanned).toBe(true);
  });

  it('unbanUser flips isBanned to false', async () => {
    const reg = await register({ username: 'bob', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    await banUser(reg.user.id);
    await unbanUser(reg.user.id);
    const row = await db.users.get(reg.user.id);
    expect(row?.isBanned).toBe(false);
  });

  it('banUser is idempotent', async () => {
    const reg = await register({ username: 'carol', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    await banUser(reg.user.id);
    await banUser(reg.user.id);
    const row = await db.users.get(reg.user.id);
    expect(row?.isBanned).toBe(true);
  });

  it('unbanUser is idempotent', async () => {
    const reg = await register({ username: 'dave', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    await unbanUser(reg.user.id);
    await unbanUser(reg.user.id);
    const row = await db.users.get(reg.user.id);
    expect(row?.isBanned).toBe(false);
  });
});

describe('admin.adjustBalance', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('credits the user balance and writes an audit row (transactional)', async () => {
    const reg = await register({ username: 'eve', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    const r = await adjustBalance({ userId: reg.user.id, amount: 500, reason: 'test grant' });
    expect(r).toEqual({ ok: true, newBalance: WALLET_CONFIG.STARTING_CHIPS + 500 });

    const bal = await db.balances.get(reg.user.id);
    expect(bal?.chips).toBe(WALLET_CONFIG.STARTING_CHIPS + 500);

    const adjustments = await db.adjustments.where('userId').equals(reg.user.id).toArray();
    expect(adjustments).toHaveLength(1);
    expect(adjustments[0]).toMatchObject({
      userId: reg.user.id,
      amount: 500,
      reason: 'test grant',
    });
    expect(adjustments[0]!.id).toBeTypeOf('string');
    expect(adjustments[0]!.adjustedAt).toBeGreaterThan(0);
  });

  it('debits the user balance (negative amount)', async () => {
    const reg = await register({ username: 'frank', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    const r = await adjustBalance({ userId: reg.user.id, amount: -200, reason: 'rollback' });
    expect(r).toEqual({ ok: true, newBalance: WALLET_CONFIG.STARTING_CHIPS - 200 });
  });

  it('trims whitespace from reason before storing', async () => {
    const reg = await register({ username: 'gail', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    await adjustBalance({ userId: reg.user.id, amount: 5, reason: '  hello  ' });
    const adjustments = await db.adjustments.where('userId').equals(reg.user.id).toArray();
    expect(adjustments[0]!.reason).toBe('hello');
  });

  it('rejects non-integer amount', async () => {
    const reg = await register({ username: 'hank', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    const r = await adjustBalance({ userId: reg.user.id, amount: 1.5, reason: 'nope' });
    expect(r).toEqual({ ok: false, error: 'invalid_amount' });
  });

  it('rejects zero amount', async () => {
    const reg = await register({ username: 'iris', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    const r = await adjustBalance({ userId: reg.user.id, amount: 0, reason: 'no-op' });
    expect(r).toEqual({ ok: false, error: 'invalid_amount' });
  });

  it('rejects reason shorter than 3 trimmed chars', async () => {
    const reg = await register({ username: 'jack', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    const r = await adjustBalance({ userId: reg.user.id, amount: 5, reason: 'ab' });
    expect(r).toEqual({ ok: false, error: 'invalid_reason' });
  });

  it('rejects when userId has no balance row', async () => {
    const r = await adjustBalance({ userId: 'ghost', amount: 100, reason: 'noone' });
    expect(r).toEqual({ ok: false, error: 'no_user' });
  });

  it('rejects when the resulting balance would go negative', async () => {
    const reg = await register({ username: 'kate', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    const r = await adjustBalance({
      userId: reg.user.id,
      amount: -(WALLET_CONFIG.STARTING_CHIPS + 1),
      reason: 'over-debit',
    });
    expect(r).toEqual({ ok: false, error: 'would_go_negative' });

    const bal = await db.balances.get(reg.user.id);
    expect(bal?.chips).toBe(WALLET_CONFIG.STARTING_CHIPS);
    const adjustments = await db.adjustments.where('userId').equals(reg.user.id).toArray();
    expect(adjustments).toHaveLength(0);
  });
});
