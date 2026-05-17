import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import {
  WALLET_CONFIG,
  claimDaily,
  getBalance,
  getDailyEligibleAt,
  placeBet,
  settleRound,
  type BetHandle,
  type RoundResult,
} from './wallet';

const u = 'user-a';

async function seedUser(chips: number, lastDailyClaimAt?: number): Promise<void> {
  await db.balances.put({
    userId: u,
    chips,
    updatedAt: Date.now(),
    ...(lastDailyClaimAt !== undefined && { lastDailyClaimAt }),
  });
}

async function placeAndGetHandle(amount: number): Promise<BetHandle> {
  const r = await placeBet({ userId: u, game: 'coin-flip', amount, min: 1, max: 500 });
  if (!r.ok) throw new Error(`placeBet failed: ${r.error}`);
  return r.handle;
}

beforeEach(async () => {
  await resetDb();
});
afterEach(async () => {
  await resetDb();
});

describe('WALLET_CONFIG', () => {
  it('exports STARTING_CHIPS = 1000', () => {
    expect(WALLET_CONFIG.STARTING_CHIPS).toBe(1_000);
  });
  it('exports DAILY_CLAIM_AMOUNT = 50', () => {
    expect(WALLET_CONFIG.DAILY_CLAIM_AMOUNT).toBe(50);
  });
  it('exports DAILY_CLAIM_INTERVAL_MS = 86_400_000', () => {
    expect(WALLET_CONFIG.DAILY_CLAIM_INTERVAL_MS).toBe(86_400_000);
  });
});

describe('getBalance', () => {
  it('returns 0 for missing user', async () => {
    expect(await getBalance('nobody')).toBe(0);
  });
  it('returns chips when row exists', async () => {
    await seedUser(123);
    expect(await getBalance(u)).toBe(123);
  });
});

describe('placeBet', () => {
  it('returns no_user when userId is empty', async () => {
    const r = await placeBet({ userId: '', game: 'coin-flip', amount: 10, min: 1, max: 500 });
    expect(r).toEqual({ ok: false, error: 'no_user' });
  });
  it('returns not_integer for fractional amount', async () => {
    await seedUser(100);
    const r = await placeBet({ userId: u, game: 'coin-flip', amount: 1.5, min: 1, max: 500 });
    expect(r).toEqual({ ok: false, error: 'not_integer' });
  });
  it('returns not_integer for zero or negative', async () => {
    await seedUser(100);
    const a = await placeBet({ userId: u, game: 'coin-flip', amount: 0, min: 1, max: 500 });
    const b = await placeBet({ userId: u, game: 'coin-flip', amount: -5, min: 1, max: 500 });
    expect(a).toEqual({ ok: false, error: 'not_integer' });
    expect(b).toEqual({ ok: false, error: 'not_integer' });
  });
  it('returns below_minimum when amount < min', async () => {
    await seedUser(100);
    const r = await placeBet({ userId: u, game: 'coin-flip', amount: 1, min: 5, max: 500 });
    expect(r).toEqual({ ok: false, error: 'below_minimum' });
  });
  it('returns above_maximum when amount > max', async () => {
    await seedUser(1_000);
    const r = await placeBet({ userId: u, game: 'coin-flip', amount: 600, min: 1, max: 500 });
    expect(r).toEqual({ ok: false, error: 'above_maximum' });
  });
  it('returns insufficient_chips when amount > balance', async () => {
    await seedUser(5);
    const r = await placeBet({ userId: u, game: 'coin-flip', amount: 10, min: 1, max: 500 });
    expect(r).toEqual({ ok: false, error: 'insufficient_chips' });
  });
  it('success: deducts chips and returns a handle', async () => {
    await seedUser(100);
    const r = await placeBet({ userId: u, game: 'coin-flip', amount: 25, min: 1, max: 500 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.newBalance).toBe(75);
    expect(r.handle.amount).toBe(25);
    expect(r.handle.userId).toBe(u);
    expect(r.handle.game).toBe('coin-flip');
    expect(await getBalance(u)).toBe(75);
  });
  it('success: preserves lastDailyClaimAt on the balance row', async () => {
    await seedUser(100, 12_345);
    await placeBet({ userId: u, game: 'coin-flip', amount: 10, min: 1, max: 500 });
    const row = await db.balances.get(u);
    expect(row?.lastDailyClaimAt).toBe(12_345);
  });
});

describe('settleRound', () => {
  const makeResult = (overrides?: Partial<RoundResult>): RoundResult => ({
    outcome: 'win',
    betAmount: 25,
    payout: 50,
    netChange: 25,
    details: { call: 'heads', landed: 'heads' },
    ...overrides,
  });

  it('win: credits payout and writes rounds row', async () => {
    await seedUser(100);
    const h = await placeAndGetHandle(25); // balance: 75
    const r = await settleRound({
      handle: h,
      result: makeResult({ outcome: 'win', payout: 50, netChange: 25 }),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.newBalance).toBe(125);
    const round = await db.rounds.get(h.betId);
    expect(round?.outcome).toBe('win');
    expect(round?.balanceAfter).toBe(125);
  });

  it('loss: credits 0 and writes rounds row', async () => {
    await seedUser(100);
    const h = await placeAndGetHandle(25); // balance: 75
    const r = await settleRound({
      handle: h,
      result: makeResult({ outcome: 'loss', payout: 0, netChange: -25 }),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.newBalance).toBe(75);
  });

  it('push: credits bet back', async () => {
    await seedUser(100);
    const h = await placeAndGetHandle(25); // balance: 75
    const r = await settleRound({
      handle: h,
      result: makeResult({ outcome: 'push', payout: 25, netChange: 0 }),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.newBalance).toBe(100);
  });

  it('idempotent: second call with same handle returns existing row', async () => {
    await seedUser(100);
    const h = await placeAndGetHandle(25);
    const a = await settleRound({ handle: h, result: makeResult() });
    const b = await settleRound({ handle: h, result: makeResult() });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(b.newBalance).toBe(a.newBalance); // no double credit
      expect(b.round.id).toBe(a.round.id);
    }
  });

  it('preserves lastDailyClaimAt', async () => {
    await seedUser(100, 54_321);
    const h = await placeAndGetHandle(10);
    await settleRound({ handle: h, result: makeResult({ payout: 20, netChange: 10 }) });
    const row = await db.balances.get(u);
    expect(row?.lastDailyClaimAt).toBe(54_321);
  });
});

describe('getDailyEligibleAt', () => {
  it('returns 0 for user that never claimed (lastDailyClaimAt undefined)', async () => {
    await seedUser(100);
    expect(await getDailyEligibleAt(u)).toBe(0);
  });
  it('returns lastClaim + 24h', async () => {
    await seedUser(100, 1_000_000);
    expect(await getDailyEligibleAt(u)).toBe(1_000_000 + 86_400_000);
  });
});

describe('claimDaily', () => {
  it('returns no_user when userId empty', async () => {
    const r = await claimDaily('');
    expect(r).toEqual({ ok: false, error: 'no_user' });
  });
  it('first time: credits 50, sets lastDailyClaimAt, returns nextEligibleAt', async () => {
    await seedUser(100);
    const now = Date.now();
    const r = await claimDaily(u);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.newBalance).toBe(150);
    expect(r.nextEligibleAt).toBeGreaterThanOrEqual(now + 86_400_000 - 1_000);
    const row = await db.balances.get(u);
    expect(row?.lastDailyClaimAt).toBeGreaterThanOrEqual(now);
  });
  it('within 24h returns not_yet_eligible with nextEligibleAt', async () => {
    const now = Date.now();
    await seedUser(100, now - 1_000); // claimed 1s ago
    const r = await claimDaily(u);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('not_yet_eligible');
    expect(r.nextEligibleAt).toBe(now - 1_000 + 86_400_000);
  });
  it('after 24h elapsed: credits 50 again', async () => {
    const longAgo = Date.now() - 86_400_000 - 5_000;
    await seedUser(100, longAgo);
    const r = await claimDaily(u);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.newBalance).toBe(150);
  });
});

describe('placeBet + settleRound + claimDaily interleave', () => {
  it('preserves all relevant fields across operations', async () => {
    await seedUser(100); // no lastDailyClaimAt yet
    // 1. claimDaily → +50, lastDailyClaimAt set
    const claim = await claimDaily(u);
    expect(claim.ok).toBe(true);
    expect(await getBalance(u)).toBe(150);
    // 2. placeBet → -10
    const h = await placeAndGetHandle(10);
    expect(await getBalance(u)).toBe(140);
    // 3. settleRound win → +20
    await settleRound({
      handle: h,
      result: { outcome: 'win', betAmount: 10, payout: 20, netChange: 10, details: {} },
    });
    expect(await getBalance(u)).toBe(160);
    // 4. lastDailyClaimAt preserved
    const row = await db.balances.get(u);
    expect(row?.lastDailyClaimAt).toBeDefined();
  });
});
