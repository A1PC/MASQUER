import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { getLastSeenDraw, lotterySeenKey, markDrawSeen, useUnreadDot } from './lottery-unread';
import type { LotteryDraw } from '@/db';

function makeDraw(id: string): LotteryDraw {
  return {
    id,
    drawAt: Date.now(),
    mainNumbers: [1, 2, 3, 4, 5],
    bonus: 3,
    totalLines: 0,
    totalRevenue: 0,
    totalPayout: 0,
  };
}

beforeEach(async () => {
  await resetDb();
  localStorage.clear();
});
afterEach(async () => {
  await resetDb();
  localStorage.clear();
});

describe('lotterySeenKey', () => {
  it('returns a namespaced key for the user', () => {
    expect(lotterySeenKey('u-abc')).toBe('localGamble.lottery.lastSeenDraw.u-abc');
  });
});

describe('getLastSeenDraw / markDrawSeen', () => {
  it('returns null when nothing has been stored', () => {
    expect(getLastSeenDraw('u1')).toBeNull();
  });

  it('returns the draw ID after markDrawSeen is called', () => {
    markDrawSeen('u1', '2026-05-01');
    expect(getLastSeenDraw('u1')).toBe('2026-05-01');
  });
});

describe('useUnreadDot', () => {
  it('returns false when userId is null', async () => {
    const { result } = renderHook(() => useUnreadDot(null));
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('returns false when there are no draws in the DB', async () => {
    const { result } = renderHook(() => useUnreadDot('u1'));
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('returns true when a draw exists and has not been seen', async () => {
    await db.lotteryDraws.add(makeDraw('2026-05-18'));
    const { result } = renderHook(() => useUnreadDot('u1'));
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('returns false when the draw has already been seen', async () => {
    await db.lotteryDraws.add(makeDraw('2026-05-18'));
    markDrawSeen('u1', '2026-05-18');
    const { result } = renderHook(() => useUnreadDot('u1'));
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('becomes true reactively when a new draw is added', async () => {
    await db.lotteryDraws.add(makeDraw('2026-05-18'));
    markDrawSeen('u1', '2026-05-18');
    const { result } = renderHook(() => useUnreadDot('u1'));
    await waitFor(() => expect(result.current).toBe(false));
    // New draw arrives — user hasn't seen it yet
    await db.lotteryDraws.add(makeDraw('2026-05-19'));
    await waitFor(() => expect(result.current).toBe(true));
  });
});
