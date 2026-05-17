import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { renderHook, act } from '@testing-library/react';
import { useGameRound } from './useGameRound';
import { resetDb } from '@/test/db-helpers';
import { db } from '@/db';
import type { User } from '@/db';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';

const testUser: User = {
  id: 'u',
  username: 'A',
  usernameLower: 'a',
  passwordHash: '',
  passwordSalt: '',
  pbkdf2Iterations: 600_000,
  avatarColor: '#a3122a',
  createdAt: Date.now(),
};

beforeEach(async () => {
  await resetDb();
  useSessionStore.setState({
    currentUser: testUser,
    bootstrapping: false,
  });
  await db.balances.put({ userId: 'u', chips: 100, updatedAt: Date.now() });
  await useWalletStore.getState().hydrate('u');
});

describe('useGameRound', () => {
  it('placeBet returns no_user when not logged in', async () => {
    useSessionStore.setState({ currentUser: null, bootstrapping: false });
    const { result } = renderHook(() => useGameRound('coin-flip'));
    const r = await act(() => result.current.placeBet(10, { min: 1, max: 500 }));
    expect(r).toEqual({ ok: false, error: 'no_user' });
  });

  it('placeBet success returns handle', async () => {
    const { result } = renderHook(() => useGameRound('coin-flip'));
    const r = await act(() => result.current.placeBet(25, { min: 1, max: 500 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.handle.amount).toBe(25);
  });

  it('settle records a round and clears resolving', async () => {
    const { result } = renderHook(() => useGameRound('coin-flip'));
    const r = await act(() => result.current.placeBet(25, { min: 1, max: 500 }));
    if (!r.ok) throw new Error();
    await act(() =>
      result.current.settle(r.handle, {
        outcome: 'win',
        betAmount: 25,
        payout: 50,
        netChange: 25,
        details: {},
      }),
    );
    expect(result.current.resolving).toBe(false);
    const row = await db.rounds.get(r.handle.betId);
    expect(row).toBeDefined();
  });
});
