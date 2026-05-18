import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGameVisit } from './useGameVisit';
import { useSessionStore } from '@/store/sessionStore';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';

function resetStore() {
  useSessionStore.setState({
    currentUser: null,
    isAdmin: false,
    currentSessionId: null,
    bootstrapping: false,
  });
}

describe('useGameVisit', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('localGamble.session.userId');
    resetStore();
  });
  afterEach(() => {
    resetStore();
  });

  it('writes a gameVisit row on mount with enteredAt set', async () => {
    const reg = await useSessionStore
      .getState()
      .register({ username: 'amy', password: 'password123' });
    if (!reg.ok) return;
    await useSessionStore.getState().logout();
    await useSessionStore.getState().login({ username: 'amy', password: 'password123' });

    const { unmount } = renderHook(() => useGameVisit('blackjack'));
    await new Promise((r) => setTimeout(r, 10));

    const visits = await db.gameVisits.where('userId').equals(reg.user.id).toArray();
    expect(visits).toHaveLength(1);
    expect(visits[0]!.game).toBe('blackjack');
    expect(visits[0]!.exitedAt).toBeNull();
    expect(visits[0]!.durationMs).toBeNull();
    expect(visits[0]!.enteredAt).toBeGreaterThan(0);

    unmount();
    await new Promise((r) => setTimeout(r, 10));

    const after = await db.gameVisits.get(visits[0]!.id);
    expect(after?.exitedAt).toBeGreaterThanOrEqual(visits[0]!.enteredAt);
    expect(after?.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('does nothing when no user is logged in', async () => {
    const { unmount } = renderHook(() => useGameVisit('slots'));
    await new Promise((r) => setTimeout(r, 10));
    const visits = await db.gameVisits.toArray();
    expect(visits).toHaveLength(0);
    unmount();
  });

  it('does nothing when no currentSessionId is set (defensive)', async () => {
    const reg = await useSessionStore
      .getState()
      .register({ username: 'ben', password: 'password123' });
    if (!reg.ok) return;
    useSessionStore.setState({ currentSessionId: null });
    const { unmount } = renderHook(() => useGameVisit('roulette'));
    await new Promise((r) => setTimeout(r, 10));
    const visits = await db.gameVisits.toArray();
    expect(visits).toHaveLength(0);
    unmount();
  });
});
