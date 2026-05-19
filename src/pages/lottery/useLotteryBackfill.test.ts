import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLotteryBackfill } from './useLotteryBackfill';
import { buyTicket } from '@/systems/lottery';
import { register } from '@/systems/auth';
import { resetDb } from '@/test/db-helpers';

describe('useLotteryBackfill', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('returns no fresh draws when nothing is pending', async () => {
    const { result } = renderHook(() => useLotteryBackfill());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.freshDraws).toEqual([]);
  });

  it('completes loading without error after a buyTicket call', async () => {
    const r = await register({ username: 'a', password: 'password123' });
    if (!r.ok) throw new Error();
    await buyTicket({
      userId: r.user.id,
      lines: [{ kind: 'manual', mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 }],
    });
    // The hook runs settleMissedDraws() with now=Date.now(). Time-travel tests for
    // backfill behavior are in the settleMissedDraws unit tests (PR A); here we just
    // verify the hook completes cleanly.
    const { result } = renderHook(() => useLotteryBackfill());
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});
