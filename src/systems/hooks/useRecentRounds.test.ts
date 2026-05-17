import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { useRecentRounds } from './useRecentRounds';
import type { Round } from '@/db';

let counter = 0;
function addRound(userId: string, overrides: Partial<Round> = {}): Promise<string> {
  counter += 1;
  const round: Round = {
    id: `r-${counter}`,
    userId,
    game: 'coin-flip',
    betAmount: 10,
    payout: 0,
    netChange: -10,
    outcome: 'loss',
    details: null,
    balanceAfter: 90,
    playedAt: Date.now() + counter, // strictly increasing
    ...overrides,
  };
  return db.rounds.add(round).then(() => round.id);
}

beforeEach(async () => {
  await resetDb();
  counter = 0;
});
afterEach(async () => {
  await resetDb();
});

describe('useRecentRounds', () => {
  it('returns [] for undefined userId', async () => {
    const { result } = renderHook(() => useRecentRounds(undefined, 'coin-flip', 5));
    await waitFor(() => expect(result.current).toEqual([]));
  });

  it('returns matching rounds newest-first for the user+game', async () => {
    await addRound('u1', { game: 'coin-flip', id: 'r-a' });
    await addRound('u1', { game: 'coin-flip', id: 'r-b' });
    const { result } = renderHook(() => useRecentRounds('u1', 'coin-flip', 5));
    await waitFor(() => expect(result.current).toHaveLength(2));
    expect(result.current.map((r) => r.id)).toEqual(['r-b', 'r-a']);
  });

  it('filters by game', async () => {
    await addRound('u1', { game: 'coin-flip', id: 'r-c' });
    await addRound('u1', { game: 'blackjack', id: 'r-bj' });
    const { result } = renderHook(() => useRecentRounds('u1', 'coin-flip', 5));
    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0]!.id).toBe('r-c');
  });

  it('returns all games when game === undefined', async () => {
    await addRound('u1', { game: 'coin-flip', id: 'r-1' });
    await addRound('u1', { game: 'blackjack', id: 'r-2' });
    const { result } = renderHook(() => useRecentRounds('u1', undefined, 5));
    await waitFor(() => expect(result.current).toHaveLength(2));
  });

  it('respects limit', async () => {
    for (let i = 0; i < 8; i++) await addRound('u1');
    const { result } = renderHook(() => useRecentRounds('u1', 'coin-flip', 3));
    await waitFor(() => expect(result.current).toHaveLength(3));
  });

  it('re-renders when a new round is added', async () => {
    await addRound('u1');
    const { result } = renderHook(() => useRecentRounds('u1', 'coin-flip', 5));
    await waitFor(() => expect(result.current).toHaveLength(1));
    await addRound('u1');
    await waitFor(() => expect(result.current).toHaveLength(2));
  });

  it("does not return another user's rounds", async () => {
    await addRound('u1');
    await addRound('u2');
    const { result } = renderHook(() => useRecentRounds('u1', 'coin-flip', 5));
    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0]!.userId).toBe('u1');
  });
});
