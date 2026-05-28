import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';

/** Per-user localStorage key that stores the draw ID the user last saw. */
export function lotterySeenKey(userId: string): string {
  return `masquer.lottery.lastSeenDraw.${userId}`;
}

/** Read the stored "last seen" draw ID from localStorage. Returns null when
 *  unavailable (SSR, private-mode restrictions, or no user). */
export function getLastSeenDraw(userId: string): string | null {
  try {
    return localStorage.getItem(lotterySeenKey(userId));
  } catch {
    return null;
  }
}

/** Write the most-recently-seen draw ID to localStorage. */
export function markDrawSeen(userId: string, drawId: string): void {
  try {
    localStorage.setItem(lotterySeenKey(userId), drawId);
  } catch {
    /* localStorage unavailable */
  }
}

/** Reactive hook: returns the latest draw ID from the DB, or null. */
export function useLatestDrawId(): string | null {
  return (
    useLiveQuery(async () => (await db.lotteryDraws.orderBy('id').last())?.id ?? null, [], null) ??
    null
  );
}

/** Reactive hook: returns `true` when there is at least one draw in the DB
 *  that the given user hasn't seen yet. Pass `null` when no user is logged in
 *  (returns `false`). */
export function useUnreadDot(userId: string | null): boolean {
  const lastDrawId = useLatestDrawId();

  if (userId === null || lastDrawId === null) return false;
  return getLastSeenDraw(userId) !== lastDrawId;
}
