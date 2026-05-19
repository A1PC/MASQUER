import { db } from '@/db';
import type { Round } from '@/db';

export type UserStatsRow = {
  userId: string;
  username: string;
  currentBalance: number;
  totalWagered: number;
  totalPaidOut: number;
  totalNetChange: number;
  totalRounds: number;
  loginCount: number;
  lastLoginAt: number | null;
  isBanned: boolean;
  createdAt: number;
};

export async function getAllUserStats(): Promise<UserStatsRow[]> {
  const users = await db.users.toArray();
  const out: UserStatsRow[] = [];
  for (const u of users) {
    const rounds = await db.rounds.where('userId').equals(u.id).toArray();
    const bal = await db.balances.get(u.id);
    out.push({
      userId: u.id,
      username: u.username,
      currentBalance: bal?.chips ?? 0,
      totalWagered: sumBy(rounds, (r) => r.betAmount),
      totalPaidOut: sumBy(rounds, (r) => r.payout),
      totalNetChange: sumBy(rounds, (r) => r.netChange),
      totalRounds: rounds.length,
      loginCount: u.loginCount ?? 0,
      lastLoginAt: u.lastLoginAt ?? null,
      isBanned: u.isBanned === true,
      createdAt: u.createdAt,
    });
  }
  return out;
}

export type SiteWideStats = {
  userCount: number;
  totalWagered: number;
  totalPaidOut: number;
  totalNetChange: number;
  totalRounds: number;
};

export async function getSiteWideStats(): Promise<SiteWideStats> {
  const [userCount, rounds] = await Promise.all([db.users.count(), db.rounds.toArray()]);
  return {
    userCount,
    totalRounds: rounds.length,
    totalWagered: sumBy(rounds, (r) => r.betAmount),
    totalPaidOut: sumBy(rounds, (r) => r.payout),
    totalNetChange: sumBy(rounds, (r) => r.netChange),
  };
}

export type NetFlowPoint = { dayStartMs: number; netChange: number };

export async function getNetFlowSeries(): Promise<NetFlowPoint[]> {
  const rounds = await db.rounds.toArray();
  if (rounds.length === 0) return [];
  const byDay = new Map<number, number>();
  for (const r of rounds) {
    const day = startOfUtcDay(r.playedAt);
    byDay.set(day, (byDay.get(day) ?? 0) + r.netChange);
  }
  return [...byDay.entries()]
    .map(([dayStartMs, netChange]) => ({ dayStartMs, netChange }))
    .sort((a, b) => a.dayStartMs - b.dayStartMs);
}

export type GameDistributionPoint = {
  game: Round['game'];
  rounds: number;
  netChange: number;
};

export async function getGameDistribution(): Promise<GameDistributionPoint[]> {
  const rounds = await db.rounds.toArray();
  const byGame = new Map<Round['game'], { rounds: number; netChange: number }>();
  for (const r of rounds) {
    const cur = byGame.get(r.game) ?? { rounds: 0, netChange: 0 };
    byGame.set(r.game, { rounds: cur.rounds + 1, netChange: cur.netChange + r.netChange });
  }
  return [...byGame.entries()].map(([game, v]) => ({ game, ...v }));
}

export async function getTopWinners(limit: number): Promise<UserStatsRow[]> {
  const all = await getAllUserStats();
  return all
    .filter((u) => u.totalNetChange > 0)
    .sort((a, b) => b.totalNetChange - a.totalNetChange)
    .slice(0, limit);
}

export async function getTopLosers(limit: number): Promise<UserStatsRow[]> {
  const all = await getAllUserStats();
  return all
    .filter((u) => u.totalNetChange < 0)
    .sort((a, b) => a.totalNetChange - b.totalNetChange)
    .slice(0, limit);
}

// ----- per-user helpers (used by PR E) -----

export async function getUserStatsRow(userId: string): Promise<UserStatsRow | null> {
  const u = await db.users.get(userId);
  if (!u) return null;
  const rounds = await db.rounds.where('userId').equals(userId).toArray();
  const bal = await db.balances.get(userId);
  return {
    userId: u.id,
    username: u.username,
    currentBalance: bal?.chips ?? 0,
    totalWagered: sumBy(rounds, (r) => r.betAmount),
    totalPaidOut: sumBy(rounds, (r) => r.payout),
    totalNetChange: sumBy(rounds, (r) => r.netChange),
    totalRounds: rounds.length,
    loginCount: u.loginCount ?? 0,
    lastLoginAt: u.lastLoginAt ?? null,
    isBanned: u.isBanned === true,
    createdAt: u.createdAt,
  };
}

export async function getUserGameDistribution(userId: string): Promise<GameDistributionPoint[]> {
  const rounds = await db.rounds.where('userId').equals(userId).toArray();
  const byGame = new Map<Round['game'], { rounds: number; netChange: number }>();
  for (const r of rounds) {
    const cur = byGame.get(r.game) ?? { rounds: 0, netChange: 0 };
    byGame.set(r.game, { rounds: cur.rounds + 1, netChange: cur.netChange + r.netChange });
  }
  return [...byGame.entries()].map(([game, v]) => ({ game, ...v }));
}

export async function getUserGameTime(
  userId: string,
): Promise<{ game: Round['game']; durationMs: number }[]> {
  const visits = await db.gameVisits.where('userId').equals(userId).toArray();
  const byGame = new Map<Round['game'], number>();
  for (const v of visits) {
    const dur = v.durationMs ?? 0;
    byGame.set(v.game, (byGame.get(v.game) ?? 0) + dur);
  }
  return [...byGame.entries()].map(([game, durationMs]) => ({ game, durationMs }));
}

export async function getUserSessionTime(userId: string): Promise<number> {
  const sessions = await db.sessions.where('userId').equals(userId).toArray();
  return sessions.reduce((s, sess) => s + (sess.durationMs ?? 0), 0);
}

export async function getUserNetFlowSeries(userId: string): Promise<NetFlowPoint[]> {
  const rounds = await db.rounds.where('userId').equals(userId).toArray();
  if (rounds.length === 0) return [];
  const byDay = new Map<number, number>();
  for (const r of rounds) {
    const day = startOfUtcDay(r.playedAt);
    byDay.set(day, (byDay.get(day) ?? 0) + r.netChange);
  }
  return [...byDay.entries()]
    .map(([dayStartMs, netChange]) => ({ dayStartMs, netChange }))
    .sort((a, b) => a.dayStartMs - b.dayStartMs);
}

// ----- helpers -----

function sumBy<T>(items: readonly T[], f: (t: T) => number): number {
  let s = 0;
  for (const it of items) s += f(it);
  return s;
}

function startOfUtcDay(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

// ----- getUserMetrics (Phase 7 — Stats Cards) -----

type Game = Round['game'];

export type UserMetrics = {
  totalRounds: number;
  totalWagered: number;
  totalWon: number;
  totalLost: number;
  netChange: number;
  /** Returns-to-player percentage, or null when totalWagered is 0. */
  rtp: number | null;
  /** Time spent on this game's page (or all pages if game omitted), ms. */
  timePlayedMs: number;
};

const EMPTY_METRICS: UserMetrics = {
  totalRounds: 0,
  totalWagered: 0,
  totalWon: 0,
  totalLost: 0,
  netChange: 0,
  rtp: null,
  timePlayedMs: 0,
};

/** 16-metric core. Game-scoped if `game` provided; otherwise all-games aggregate. */
export async function getUserMetrics(userId: string, game?: Game): Promise<UserMetrics> {
  if (!userId) return EMPTY_METRICS;
  const rounds = await fetchUserRounds(userId, game);
  const visits = await db.gameVisits.where('userId').equals(userId).toArray();
  const scopedVisits = game ? visits.filter((v) => v.game === game) : visits;

  let totalWagered = 0;
  let totalWon = 0;
  let totalLost = 0;
  let netChange = 0;
  for (const r of rounds) {
    totalWagered += r.betAmount;
    totalWon += r.payout;
    netChange += r.netChange;
    if (r.netChange < 0) totalLost += -r.netChange;
  }
  const timePlayedMs = scopedVisits.reduce((s, v) => s + (v.durationMs ?? 0), 0);
  const rtp = totalWagered === 0 ? null : (totalWon / totalWagered) * 100;
  return {
    totalRounds: rounds.length,
    totalWagered,
    totalWon,
    totalLost,
    netChange,
    rtp,
    timePlayedMs,
  };
}

async function fetchUserRounds(userId: string, game?: Game): Promise<Round[]> {
  const all = await db.rounds
    .where('[userId+playedAt]')
    .between([userId, 0], [userId, Number.MAX_SAFE_INTEGER])
    .toArray();
  return game ? all.filter((r) => r.game === game) : all;
}
