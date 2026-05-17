import { db } from '@/db';
import type { Balance, Round } from '@/db';

const STARTING_CHIPS = 1_000;
const DAILY_CLAIM_AMOUNT = 50;
const DAILY_CLAIM_INTERVAL_MS = 24 * 60 * 60 * 1_000;

export const WALLET_CONFIG = {
  STARTING_CHIPS,
  DAILY_CLAIM_AMOUNT,
  DAILY_CLAIM_INTERVAL_MS,
} as const;

export type Game = Round['game'];
export type Outcome = Round['outcome'];

export interface BetHandle {
  betId: string;
  userId: string;
  game: Game;
  amount: number;
  placedAt: number;
}

export interface RoundResult {
  outcome: Outcome;
  betAmount: number;
  payout: number;
  netChange: number;
  details: unknown;
}

export type PlaceBetError =
  | 'insufficient_chips'
  | 'below_minimum'
  | 'above_maximum'
  | 'not_integer'
  | 'no_user'
  | 'unknown';

export type PlaceBetResult =
  | { ok: true; handle: BetHandle; newBalance: number }
  | { ok: false; error: PlaceBetError };

export type SettleResult =
  | { ok: true; newBalance: number; round: Round }
  | { ok: false; error: 'unknown' };

export type ClaimDailyError = 'no_user' | 'not_yet_eligible' | 'unknown';
export type ClaimDailyResult =
  | { ok: true; newBalance: number; nextEligibleAt: number }
  | { ok: false; error: ClaimDailyError; nextEligibleAt?: number };

export async function getBalance(userId: string): Promise<number> {
  const row = await db.balances.get(userId);
  return row?.chips ?? 0;
}

export async function getBalanceRow(userId: string): Promise<Balance | undefined> {
  return db.balances.get(userId);
}

export async function getDailyEligibleAt(userId: string): Promise<number> {
  const row = await db.balances.get(userId);
  if (!row?.lastDailyClaimAt) return 0;
  return row.lastDailyClaimAt + DAILY_CLAIM_INTERVAL_MS;
}

export async function placeBet(input: {
  userId: string;
  game: Game;
  amount: number;
  min: number;
  max: number;
}): Promise<PlaceBetResult> {
  if (!input.userId) return { ok: false, error: 'no_user' };
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    return { ok: false, error: 'not_integer' };
  }
  if (input.amount < input.min) return { ok: false, error: 'below_minimum' };
  if (input.amount > input.max) return { ok: false, error: 'above_maximum' };

  try {
    const newBalance = await db.transaction('rw', db.balances, async () => {
      const row = await db.balances.get(input.userId);
      const current = row?.chips ?? 0;
      if (current < input.amount) throw new InsufficientChipsError();
      const after = current - input.amount;
      await db.balances.put({
        userId: input.userId,
        chips: after,
        updatedAt: Date.now(),
        ...(row?.lastDailyClaimAt !== undefined && {
          lastDailyClaimAt: row.lastDailyClaimAt,
        }),
      });
      return after;
    });
    return {
      ok: true,
      handle: {
        betId: crypto.randomUUID(),
        userId: input.userId,
        game: input.game,
        amount: input.amount,
        placedAt: Date.now(),
      },
      newBalance,
    };
  } catch (e) {
    if (e instanceof InsufficientChipsError) {
      return { ok: false, error: 'insufficient_chips' };
    }
    return { ok: false, error: 'unknown' };
  }
}

class InsufficientChipsError extends Error {}

export async function settleRound(input: {
  handle: BetHandle;
  result: RoundResult;
}): Promise<SettleResult> {
  const { handle, result } = input;
  try {
    const { newBalance, round } = await db.transaction('rw', db.balances, db.rounds, async () => {
      const existing = await db.rounds.get(handle.betId);
      if (existing) {
        const row = await db.balances.get(handle.userId);
        return { newBalance: row?.chips ?? 0, round: existing };
      }
      const balanceRow = await db.balances.get(handle.userId);
      const balanceAfter = (balanceRow?.chips ?? 0) + result.payout;
      await db.balances.put({
        userId: handle.userId,
        chips: balanceAfter,
        updatedAt: Date.now(),
        ...(balanceRow?.lastDailyClaimAt !== undefined && {
          lastDailyClaimAt: balanceRow.lastDailyClaimAt,
        }),
      });
      const round: Round = {
        id: handle.betId,
        userId: handle.userId,
        game: handle.game,
        betAmount: result.betAmount,
        payout: result.payout,
        netChange: result.netChange,
        outcome: result.outcome,
        details: result.details,
        balanceAfter,
        playedAt: Date.now(),
      };
      await db.rounds.add(round);
      return { newBalance: balanceAfter, round };
    });
    return { ok: true, newBalance, round };
  } catch {
    return { ok: false, error: 'unknown' };
  }
}

export async function claimDaily(userId: string): Promise<ClaimDailyResult> {
  if (!userId) return { ok: false, error: 'no_user' };
  try {
    const result = await db.transaction('rw', db.balances, async () => {
      const row = await db.balances.get(userId);
      const now = Date.now();
      const eligibleAt = row?.lastDailyClaimAt ? row.lastDailyClaimAt + DAILY_CLAIM_INTERVAL_MS : 0;
      if (now < eligibleAt) {
        return { eligible: false as const, nextEligibleAt: eligibleAt };
      }
      const newBalance = (row?.chips ?? 0) + DAILY_CLAIM_AMOUNT;
      await db.balances.put({
        userId,
        chips: newBalance,
        updatedAt: now,
        lastDailyClaimAt: now,
      });
      return {
        eligible: true as const,
        newBalance,
        nextEligibleAt: now + DAILY_CLAIM_INTERVAL_MS,
      };
    });
    if (!result.eligible) {
      return { ok: false, error: 'not_yet_eligible', nextEligibleAt: result.nextEligibleAt };
    }
    return { ok: true, newBalance: result.newBalance, nextEligibleAt: result.nextEligibleAt };
  } catch {
    return { ok: false, error: 'unknown' };
  }
}
