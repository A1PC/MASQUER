import { db } from '@/db';

/**
 * Admin operations on user records. ADR-0034 / ADR-0035.
 *
 * Imported by AdminUserPage and AdjustCreditsModal. Not exposed via
 * sessionStore — the admin pages call these directly.
 */

export async function banUser(userId: string): Promise<void> {
  await db.users.update(userId, { isBanned: true });
}

export async function unbanUser(userId: string): Promise<void> {
  await db.users.update(userId, { isBanned: false });
}

export type AdjustBalanceError =
  | 'invalid_amount'
  | 'invalid_reason'
  | 'no_user'
  | 'would_go_negative'
  | 'unknown';

export type AdjustBalanceResult =
  | { ok: true; newBalance: number }
  | { ok: false; error: AdjustBalanceError };

/**
 * Admin chip adjustment. Writes the new balance AND an audit row atomically.
 * Negative amount = debit, positive = credit. Reason min 3 chars (trimmed).
 */
export async function adjustBalance(input: {
  userId: string;
  amount: number;
  reason: string;
}): Promise<AdjustBalanceResult> {
  if (!Number.isInteger(input.amount) || input.amount === 0) {
    return { ok: false, error: 'invalid_amount' };
  }
  const reason = input.reason.trim();
  if (reason.length < 3) {
    return { ok: false, error: 'invalid_reason' };
  }
  try {
    return await db.transaction('rw', db.balances, db.adjustments, async () => {
      const balance = await db.balances.get(input.userId);
      if (!balance) return { ok: false, error: 'no_user' as const };
      const newChips = balance.chips + input.amount;
      if (newChips < 0) return { ok: false, error: 'would_go_negative' as const };
      await db.balances.put({ ...balance, chips: newChips, updatedAt: Date.now() });
      await db.adjustments.add({
        id: crypto.randomUUID(),
        userId: input.userId,
        amount: input.amount,
        reason,
        adjustedAt: Date.now(),
      });
      return { ok: true as const, newBalance: newChips };
    });
  } catch {
    return { ok: false, error: 'unknown' };
  }
}
