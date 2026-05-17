import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { useWalletStore } from './walletStore';

const u = 'user-w';

beforeEach(async () => {
  await resetDb();
  useWalletStore.setState({ balance: null, nextDailyEligibleAt: null, hydrating: false });
});
afterEach(async () => {
  await resetDb();
});

async function seedBalance(chips: number, lastDailyClaimAt?: number): Promise<void> {
  await db.balances.put({
    userId: u,
    chips,
    updatedAt: Date.now(),
    ...(lastDailyClaimAt !== undefined && { lastDailyClaimAt }),
  });
}

describe('walletStore', () => {
  it('initial state: balance and nextDailyEligibleAt are null; hydrating false', () => {
    const s = useWalletStore.getState();
    expect(s.balance).toBeNull();
    expect(s.nextDailyEligibleAt).toBeNull();
    expect(s.hydrating).toBe(false);
  });

  it('hydrate populates balance and nextDailyEligibleAt', async () => {
    await seedBalance(250, 1_000);
    await useWalletStore.getState().hydrate(u);
    expect(useWalletStore.getState().balance).toBe(250);
    expect(useWalletStore.getState().nextDailyEligibleAt).toBe(1_000 + 86_400_000);
    expect(useWalletStore.getState().hydrating).toBe(false);
  });

  it('clear resets to null', () => {
    useWalletStore.setState({ balance: 100, nextDailyEligibleAt: 999, hydrating: false });
    useWalletStore.getState().clear();
    const s = useWalletStore.getState();
    expect(s.balance).toBeNull();
    expect(s.nextDailyEligibleAt).toBeNull();
  });

  it('placeBet success updates balance', async () => {
    await seedBalance(100);
    const r = await useWalletStore
      .getState()
      .placeBet({ userId: u, game: 'coin-flip', amount: 25, min: 1, max: 500 });
    expect(r.ok).toBe(true);
    expect(useWalletStore.getState().balance).toBe(75);
  });

  it('placeBet failure leaves balance unchanged', async () => {
    useWalletStore.setState({ balance: 100, nextDailyEligibleAt: null, hydrating: false });
    const r = await useWalletStore
      .getState()
      .placeBet({ userId: '', game: 'coin-flip', amount: 25, min: 1, max: 500 });
    expect(r.ok).toBe(false);
    expect(useWalletStore.getState().balance).toBe(100);
  });

  it('settleRound success updates balance', async () => {
    await seedBalance(100);
    const place = await useWalletStore
      .getState()
      .placeBet({ userId: u, game: 'coin-flip', amount: 25, min: 1, max: 500 });
    if (!place.ok) throw new Error();
    const settle = await useWalletStore.getState().settleRound({
      handle: place.handle,
      result: { outcome: 'win', betAmount: 25, payout: 50, netChange: 25, details: {} },
    });
    expect(settle.ok).toBe(true);
    expect(useWalletStore.getState().balance).toBe(125);
  });

  it('claimDaily success updates balance + nextDailyEligibleAt', async () => {
    await seedBalance(100);
    const r = await useWalletStore.getState().claimDaily(u);
    expect(r.ok).toBe(true);
    expect(useWalletStore.getState().balance).toBe(150);
    expect(useWalletStore.getState().nextDailyEligibleAt).toBeGreaterThan(Date.now());
  });

  it('claimDaily not_yet_eligible updates nextDailyEligibleAt only', async () => {
    const now = Date.now();
    await seedBalance(100, now - 1_000);
    useWalletStore.setState({ balance: 100 });
    const r = await useWalletStore.getState().claimDaily(u);
    expect(r.ok).toBe(false);
    expect(useWalletStore.getState().balance).toBe(100); // unchanged
    expect(useWalletStore.getState().nextDailyEligibleAt).toBe(now - 1_000 + 86_400_000);
  });
});
