import { db } from '@/db';

/**
 * Account-level data utilities. Side-effecting (Dexie) and prefs-agnostic — the
 * Settings page + ProfileDropdown call these, never the games. Both delete rows
 * only; they never fabricate `rounds` (the one-row-per-round invariant holds —
 * clearing history removes rows, it does not re-write them).
 */

/**
 * Delete this user's play history (every `rounds` row keyed by `userId`).
 * Stats + leaderboard reflect the cleared data. Other users + global rows are
 * untouched.
 */
export async function clearHistory(userId: string): Promise<void> {
  await db.rounds.where('userId').equals(userId).delete();
}

/**
 * Permanently delete an account: the `users` row plus every user-keyed row
 * across the data model, in a single read-write transaction so the wipe is
 * all-or-nothing. Global rows (e.g. `lotteryDraws`) are deliberately left
 * intact — they are shared, not owned by one user.
 */
export async function deleteAccount(userId: string): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.users,
      db.balances,
      db.rounds,
      db.sessions,
      db.gameVisits,
      db.adjustments,
      db.lotteryTickets,
      db.lotteryLines,
      db.lotteryFavorites,
      db.prefs,
    ],
    async () => {
      await Promise.all([
        // `users`/`balances`/`prefs` are keyed by id/userId directly.
        db.users.delete(userId),
        db.balances.delete(userId),
        db.prefs.delete(userId),
        // The remaining tables carry a `userId` field — delete by query.
        db.rounds.where('userId').equals(userId).delete(),
        db.sessions.where('userId').equals(userId).delete(),
        db.gameVisits.where('userId').equals(userId).delete(),
        db.adjustments.where('userId').equals(userId).delete(),
        db.lotteryTickets.where('userId').equals(userId).delete(),
        db.lotteryLines.where('userId').equals(userId).delete(),
        db.lotteryFavorites.where('userId').equals(userId).delete(),
      ]);
    },
  );
}
