import { db } from '@/db';
import type { Round } from '@/db';
import type { RouletteRoundDetails } from '@/games/roulette/types';
import type { SlotsRoundDetails, Symbol as SlotsSymbol } from '@/games/slots/types';
import type { Winner as BaccaratWinner } from '@/games/baccarat/types';
import type { Risk as PlinkoRisk } from '@/games/plinko/logic';
import { BIN_COUNT as PLINKO_BIN_COUNT } from '@/games/plinko/geometry';
import { SLOTS_PAYTABLE } from '@/games/slots/config';
import { WALLET_CONFIG } from '@/systems/wallet';

/**
 * Shape of `rounds.details` for a baccarat row — flattened at persist time
 * in BaccaratPage.persistRound (not the nested in-memory `RoundResult`).
 * Mirrored in AdminBaccaratPage.tsx; if you change this, update both.
 */
interface PersistedBaccaratDetails {
  readonly winner: BaccaratWinner;
  readonly margin: number;
  readonly playerTotal: number;
  readonly bankerTotal: number;
  readonly playerPair: boolean;
  readonly bankerPair: boolean;
  readonly winnerNatural: boolean;
  readonly bothNatural: boolean;
  readonly totalCards: number;
}

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

export async function getUserNetFlowSeries(userId: string, game?: Game): Promise<NetFlowPoint[]> {
  const all = await db.rounds.where('userId').equals(userId).toArray();
  const rounds = game ? all.filter((r) => r.game === game) : all;
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

/** 7 core metrics (rounds, wagered, won, lost, net, RTP, time). Game-scoped if `game` provided; otherwise all-games aggregate. */
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

// ----- getUserPeaks (Phase 7 — A.4) -----

export type Peaks = {
  /** Most-positive single-round netChange. 0 when no rounds. */
  biggestWin: number;
  /** playedAt of the round that holds biggestWin. null when no rounds. */
  biggestWinAt: number | null;
  /** Most-negative single-round netChange (returned as a positive number). 0 when no rounds. */
  biggestLoss: number;
  /** playedAt of the round that holds biggestLoss. null when no rounds. */
  biggestLossAt: number | null;
  /** Max value of balanceAfter across all rounds + the starting chips. */
  highestBalance: number;
};

export async function getUserPeaks(userId: string, game?: Game): Promise<Peaks> {
  if (!userId) {
    return {
      biggestWin: 0,
      biggestWinAt: null,
      biggestLoss: 0,
      biggestLossAt: null,
      highestBalance: WALLET_CONFIG.STARTING_CHIPS,
    };
  }
  const rounds = await fetchUserRounds(userId, game);
  let biggestWin = 0;
  let biggestWinAt: number | null = null;
  let biggestLoss = 0;
  let biggestLossAt: number | null = null;
  let highestBalance: number = WALLET_CONFIG.STARTING_CHIPS;
  for (const r of rounds) {
    if (r.netChange > biggestWin) {
      biggestWin = r.netChange;
      biggestWinAt = r.playedAt;
    }
    if (r.netChange < -biggestLoss) {
      biggestLoss = -r.netChange;
      biggestLossAt = r.playedAt;
    }
    if (r.balanceAfter > highestBalance) highestBalance = r.balanceAfter;
  }
  return { biggestWin, biggestWinAt, biggestLoss, biggestLossAt, highestBalance };
}

// ----- getUserSessionStats (Phase 7 — A.5) -----

export type SessionStats = {
  /** Highest sum of netChange across rounds within one session row. */
  best: number;
  /** Lowest sum (most negative). */
  worst: number;
  /** Number of sessions with at least one round. */
  count: number;
};

/** Best/worst session by net change. Game-scoped if provided. */
export async function getUserSessionStats(userId: string, game?: Game): Promise<SessionStats> {
  if (!userId) return { best: 0, worst: 0, count: 0 };
  const [sessions, rounds] = await Promise.all([
    db.sessions.where('userId').equals(userId).toArray(),
    fetchUserRounds(userId, game),
  ]);
  if (sessions.length === 0 || rounds.length === 0) {
    return { best: 0, worst: 0, count: 0 };
  }
  let best = 0;
  let worst = 0;
  let count = 0;
  for (const s of sessions) {
    const end = s.logoutAt ?? Number.MAX_SAFE_INTEGER;
    const sessionRounds = rounds.filter((r) => r.playedAt >= s.loginAt && r.playedAt <= end);
    if (sessionRounds.length === 0) continue;
    count += 1;
    const net = sessionRounds.reduce((sum, r) => sum + r.netChange, 0);
    if (net > best) best = net;
    if (net < worst) worst = net;
  }
  return { best, worst, count };
}

// ----- getUserExtras (Phase 7 — A.5) -----

export type ExtraStats = {
  /** Mean bet size (rounded to integer chips). 0 when no rounds. */
  avgBetSize: number;
  /** Win rate %, excluding pushes from denominator. null when no non-push rounds. */
  winRate: number | null;
};

export async function getUserExtras(userId: string, game?: Game): Promise<ExtraStats> {
  if (!userId) return { avgBetSize: 0, winRate: null };
  const rounds = await fetchUserRounds(userId, game);
  if (rounds.length === 0) return { avgBetSize: 0, winRate: null };
  const totalWagered = rounds.reduce((s, r) => s + r.betAmount, 0);
  const avgBetSize = Math.round(totalWagered / rounds.length);
  const nonPush = rounds.filter((r) => r.outcome !== 'push');
  const winRate =
    nonPush.length === 0
      ? null
      : (nonPush.filter((r) => r.outcome === 'win').length / nonPush.length) * 100;
  return { avgBetSize, winRate };
}

// ----- getUserStreaks (Phase 7 — Stats Cards) -----

export type StreakStats = { longestWin: number; longestLoss: number };

/** Longest consecutive run of wins / losses, scanned oldest-to-newest.
 *  Pushes break neither streak (they're "neutral"). Game-scoped if provided. */
export async function getUserStreaks(userId: string, game?: Game): Promise<StreakStats> {
  if (!userId) return { longestWin: 0, longestLoss: 0 };
  const rounds = await fetchUserRounds(userId, game);
  // fetchUserRounds returns oldest-first via the [userId+playedAt] index.
  let longestWin = 0;
  let longestLoss = 0;
  let curWin = 0;
  let curLoss = 0;
  for (const r of rounds) {
    if (r.outcome === 'win') {
      curWin += 1;
      curLoss = 0;
      if (curWin > longestWin) longestWin = curWin;
    } else if (r.outcome === 'loss') {
      curLoss += 1;
      curWin = 0;
      if (curLoss > longestLoss) longestLoss = curLoss;
    }
    // push: neither streak resets, neither increments
  }
  return { longestWin, longestLoss };
}

// ----- getLeaderboard (Phase 7 — A.7) -----

export type LeaderboardMetric =
  | 'netWinner'
  | 'mostRounds'
  | 'biggestSingleWin'
  | 'longestWinStreak'
  | 'mostVariety';

export type LeaderboardRow = {
  rank: number;
  userId: string;
  username: string;
  value: number;
  /** Secondary text shown beside the value (e.g. round timestamp for biggest win). */
  sub?: string;
};

const HARD_LIMIT = 100;

/** Ranked rows for a leaderboard metric. Excludes banned users.
 *  Game-scoped if provided (per-game leaderboards). */
export async function getLeaderboard(
  metric: LeaderboardMetric,
  game?: Game,
  limit = 10,
): Promise<LeaderboardRow[]> {
  const cap = Math.min(limit, HARD_LIMIT);
  const users = await db.users.toArray();
  const eligible = users.filter((u) => u.isBanned !== true);
  type Scored = {
    userId: string;
    username: string;
    value: number;
    sub?: string;
    createdAt: number;
  };
  const scored: Scored[] = [];
  for (const u of eligible) {
    const rounds = await fetchUserRounds(u.id, game);
    if (rounds.length === 0 && metric !== 'mostVariety') continue;

    let value = 0;
    let sub: string | undefined;
    switch (metric) {
      case 'netWinner':
        value = rounds.reduce((s, r) => s + r.netChange, 0);
        break;
      case 'mostRounds':
        value = rounds.length;
        break;
      case 'biggestSingleWin': {
        let maxWin = 0;
        let at: number | null = null;
        for (const r of rounds) {
          if (r.netChange > maxWin) {
            maxWin = r.netChange;
            at = r.playedAt;
          }
        }
        if (maxWin === 0) continue;
        value = maxWin;
        sub = at ? new Date(at).toISOString().slice(0, 10) : undefined;
        break;
      }
      case 'longestWinStreak': {
        let longest = 0;
        let cur = 0;
        for (const r of rounds) {
          if (r.outcome === 'win') {
            cur += 1;
            if (cur > longest) longest = cur;
          } else if (r.outcome === 'loss') {
            cur = 0;
          }
        }
        if (longest === 0) continue;
        value = longest;
        break;
      }
      case 'mostVariety': {
        const all = await fetchUserRounds(u.id);
        const games = new Set(all.map((r) => r.game));
        value = games.size;
        sub = `${all.length} rounds total`;
        if (value === 0) continue;
        break;
      }
    }
    scored.push({
      userId: u.id,
      username: u.username,
      value,
      createdAt: u.createdAt,
      ...(sub !== undefined ? { sub } : {}),
    });
  }

  scored.sort((a, b) => (b.value !== a.value ? b.value - a.value : a.createdAt - b.createdAt));

  return scored.slice(0, cap).map((s, i) => ({
    rank: i + 1,
    userId: s.userId,
    username: s.username,
    value: s.value,
    ...(s.sub !== undefined ? { sub: s.sub } : {}),
  }));
}

// ----- getUserWinLossTimeline + getUserBetSizeHistogram (Phase 7 — A.6) -----

export type WinLossTimelinePoint = {
  playedAt: number;
  outcome: 'win' | 'loss' | 'push';
  netChange: number;
};

/** Up to `limit` most-recent rounds, newest-first, scoped to game if provided. */
export async function getUserWinLossTimeline(
  userId: string,
  game?: Game,
  limit = 50,
): Promise<WinLossTimelinePoint[]> {
  if (!userId) return [];
  const all = await fetchUserRounds(userId, game);
  const trimmed = all.slice(-limit).reverse();
  return trimmed.map((r) => ({
    playedAt: r.playedAt,
    outcome: r.outcome,
    netChange: r.netChange,
  }));
}

export type HistogramBin = { binMin: number; binMax: number; count: number };

/** 5 equal-width bins from min(bet) to max(bet). Empty array when no rounds. */
export async function getUserBetSizeHistogram(
  userId: string,
  game?: Game,
): Promise<HistogramBin[]> {
  if (!userId) return [];
  const rounds = await fetchUserRounds(userId, game);
  if (rounds.length === 0) return [];
  const bets = rounds.map((r) => r.betAmount);
  const min = Math.min(...bets);
  const max = Math.max(...bets);
  if (min === max) {
    // Single bin if all bets equal.
    return [{ binMin: min, binMax: max, count: bets.length }];
  }
  const binCount = 5;
  const binWidth = (max - min) / binCount;
  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => ({
    binMin: Math.round(min + i * binWidth),
    binMax: Math.round(min + (i + 1) * binWidth),
    count: 0,
  }));
  for (const b of bets) {
    // Inclusive-low, exclusive-high (except for the last bin which captures max).
    let idx = Math.floor((b - min) / binWidth);
    if (idx >= binCount) idx = binCount - 1;
    bins[idx]!.count += 1;
  }
  return bins;
}

// ----- getUserWinRateByGame (Phase 7 — C.5) -----

export async function getUserWinRateByGame(
  userId: string,
): Promise<Array<{ game: Game; winRate: number }>> {
  if (!userId) return [];
  const rounds = await fetchUserRounds(userId);
  if (rounds.length === 0) return [];
  const byGame = new Map<Game, { wins: number; nonPush: number }>();
  for (const r of rounds) {
    if (r.outcome === 'push') continue;
    const cur = byGame.get(r.game) ?? { wins: 0, nonPush: 0 };
    cur.nonPush += 1;
    if (r.outcome === 'win') cur.wins += 1;
    byGame.set(r.game, cur);
  }
  return [...byGame.entries()]
    .map(([game, v]) => ({ game, winRate: v.nonPush === 0 ? 0 : (v.wins / v.nonPush) * 100 }))
    .sort((a, b) => b.winRate - a.winRate);
}

// ─── Phase 15 #6 — Roulette all-time admin stats ────────────────────────

export interface RouletteAllTimeStats {
  ballsSpun: number;
  netHouseChips: number; // positive = house won
  netPlayerChips: number; // mirror of netHouseChips
  redCount: number;
  blackCount: number;
  greenCount: number;
  oddCount: number;
  evenCount: number;
  lowCount: number;
  highCount: number;
  dozenCounts: [number, number, number];
  columnCounts: [number, number, number];
}

/** Column membership of each number per BUILD_GUIDE §8.2.
 *  Column 1: 1,4,7,10,...,34 (n mod 3 === 1)
 *  Column 2: 2,5,8,11,...,35 (n mod 3 === 2)
 *  Column 3: 3,6,9,12,...,36 (n mod 3 === 0, n !== 0)
 */
export function columnOf(n: number): 0 | 1 | 2 | 3 {
  if (n === 0) return 0; // not in any column
  const m = n % 3;
  if (m === 1) return 1;
  if (m === 2) return 2;
  return 3;
}

export function dozenOf(n: number): 0 | 1 | 2 | 3 {
  if (n === 0) return 0;
  if (n <= 12) return 1;
  if (n <= 24) return 2;
  return 3;
}

export async function getRouletteAllTimeStats(sinceMs?: number): Promise<RouletteAllTimeStats> {
  let rows = await db.rounds.where('game').equals('roulette').toArray();
  if (sinceMs !== undefined) rows = rows.filter((r) => r.playedAt > sinceMs);
  let ballsSpun = 0;
  let netHouseChips = 0;
  let redCount = 0;
  let blackCount = 0;
  let greenCount = 0;
  let oddCount = 0;
  let evenCount = 0;
  let lowCount = 0;
  let highCount = 0;
  const dozenCounts: [number, number, number] = [0, 0, 0];
  const columnCounts: [number, number, number] = [0, 0, 0];

  for (const r of rows) {
    const d = r.details as RouletteRoundDetails | undefined;
    if (!d?.spin) continue;
    ballsSpun += 1;
    netHouseChips += r.betAmount - r.payout;
    const n = d.spin.number;
    const c = d.spin.color;
    if (c === 'red') redCount += 1;
    else if (c === 'black') blackCount += 1;
    else greenCount += 1;
    if (n !== 0) {
      if (n % 2 === 1) oddCount += 1;
      else evenCount += 1;
      if (n <= 18) lowCount += 1;
      else highCount += 1;
      const dz = dozenOf(n);
      if (dz > 0) dozenCounts[dz - 1]! += 1;
      const col = columnOf(n);
      if (col > 0) columnCounts[col - 1]! += 1;
    }
  }

  return {
    ballsSpun,
    netHouseChips,
    // Add zero to normalise `-0` (e.g. `-(0)`) to `+0` for strict equality assertions.
    netPlayerChips: -netHouseChips + 0,
    redCount,
    blackCount,
    greenCount,
    oddCount,
    evenCount,
    lowCount,
    highCount,
    dozenCounts,
    columnCounts,
  };
}

export interface RouletteDistributionPoint {
  number: number; // 0..36
  count: number;
  color: 'red' | 'black' | 'green';
}

/** Static red-pocket set per ADR-0029 (mirrors wheel.ts RED_NUMBERS). */
const ROULETTE_RED = new Set<number>([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export async function getRouletteNumberDistribution(): Promise<RouletteDistributionPoint[]> {
  const rows = await db.rounds.where('game').equals('roulette').toArray();
  const counts = new Array<number>(37).fill(0);
  for (const r of rows) {
    const d = r.details as RouletteRoundDetails | undefined;
    if (!d?.spin) continue;
    counts[d.spin.number]! += 1;
  }
  return Array.from({ length: 37 }, (_, n) => ({
    number: n,
    count: counts[n]!,
    color: n === 0 ? 'green' : ROULETTE_RED.has(n) ? 'red' : 'black',
  }));
}

// ─── Phase 15 #7 — Slots all-time admin stats ─────────────────────────

export interface SlotsAllTimeStats {
  /** Count of slots rounds with valid spin details. */
  spinsRun: number;
  /** Sum of betAmount across all valid spins. */
  totalWagered: number;
  /** Sum of payout across all valid spins. */
  totalPaid: number;
  /** totalWagered - totalPaid (positive = house won). */
  netHouseChips: number;
  /** Mirror of netHouseChips. */
  netPlayerChips: number;
  /** totalPaid / totalWagered (null if no wagering). */
  actualRtp: number | null;
  /** Target RTP from ADR-0032. */
  targetRtp: number;
  /** Win-tier breakdown counts. */
  tierCounts: {
    none: number;
    small: number;
    medium: number;
    jackpot: number;
  };
  /** Alias for tierCounts.jackpot — used by the headline stat card. */
  jackpotsHit: number;
}

export async function getSlotsAllTimeStats(sinceMs?: number): Promise<SlotsAllTimeStats> {
  let rows = await db.rounds.where('game').equals('slots').toArray();
  if (sinceMs !== undefined) rows = rows.filter((r) => r.playedAt > sinceMs);
  let spinsRun = 0;
  let totalWagered = 0;
  let totalPaid = 0;
  const tierCounts = { none: 0, small: 0, medium: 0, jackpot: 0 };
  for (const r of rows) {
    const d = r.details as SlotsRoundDetails | undefined;
    if (!d?.spin) continue;
    spinsRun += 1;
    totalWagered += r.betAmount;
    totalPaid += r.payout;
    const tier = d.winTier ?? 'none';
    if (tier in tierCounts) tierCounts[tier] += 1;
  }
  const netHouseChips = totalWagered - totalPaid;
  return {
    spinsRun,
    totalWagered,
    totalPaid,
    netHouseChips,
    // Add zero to normalise `-0` (e.g. `-(0)`) to `+0` for strict equality assertions.
    netPlayerChips: -netHouseChips + 0,
    actualRtp: totalWagered > 0 ? totalPaid / totalWagered : null,
    targetRtp: 0.86,
    tierCounts,
    jackpotsHit: tierCounts.jackpot,
  };
}

export interface SlotsCombinationCount {
  /** Payout key from SLOTS_PAYTABLE (e.g. 'seven-seven-seven'). */
  key: string;
  /** Human-readable label (e.g. '3× 7'). */
  label: string;
  /** Payout multiple from SLOTS_PAYTABLE. */
  payoutMultiple: number;
  /** Win-tier this combo belongs to. */
  tier: 'small' | 'medium' | 'jackpot';
  /** Number of times this combo hit. */
  count: number;
  /** Sum of payouts where this combo hit. */
  totalPaid: number;
}

/** Map a payout multiple to its win tier (mirrors slots/logic.ts#winTierOf). */
function slotsComboTier(multiple: number): 'small' | 'medium' | 'jackpot' {
  if (multiple <= 2) return 'small';
  if (multiple <= 20) return 'medium';
  return 'jackpot';
}

/** Human-readable labels for each paytable combo. */
const SLOTS_COMBO_LABELS: Readonly<Record<string, string>> = {
  'seven-seven-seven': '3× 7',
  'bar-bar-bar': '3× BAR',
  'bell-bell-bell': '3× Bell',
  'lemon-lemon-lemon': '3× Lemon',
  'cherry-cherry-cherry': '3× Cherry',
  'two-cherry': '2× Cherry',
};

export async function getSlotsCombinationDistribution(): Promise<SlotsCombinationCount[]> {
  const rows = await db.rounds.where('game').equals('slots').toArray();
  // Initialise every paytable combo with count 0 so the chart always shows every combo.
  const map = new Map<string, SlotsCombinationCount>();
  for (const [key, payoutMultiple] of Object.entries(SLOTS_PAYTABLE)) {
    map.set(key, {
      key,
      label: SLOTS_COMBO_LABELS[key] ?? key,
      payoutMultiple,
      tier: slotsComboTier(payoutMultiple),
      count: 0,
      totalPaid: 0,
    });
  }
  for (const r of rows) {
    const d = r.details as SlotsRoundDetails | undefined;
    if (!d?.payout?.key) continue;
    const entry = map.get(d.payout.key);
    if (!entry) continue;
    entry.count += 1;
    entry.totalPaid += r.payout;
  }
  // Return in paytable order (highest payout first).
  return Array.from(map.values()).sort((a, b) => b.payoutMultiple - a.payoutMultiple);
}

export interface SlotsSymbolDistribution {
  symbol: SlotsSymbol;
  /** Count of times this symbol landed on reel 0. */
  reel0: number;
  /** Count of times this symbol landed on reel 1. */
  reel1: number;
  /** Count of times this symbol landed on reel 2. */
  reel2: number;
  /** reel0 + reel1 + reel2. */
  total: number;
}

const SLOTS_SYMBOLS_ORDER: readonly SlotsSymbol[] = ['cherry', 'lemon', 'bell', 'bar', 'seven'];

export async function getSlotsSymbolDistribution(): Promise<SlotsSymbolDistribution[]> {
  const rows = await db.rounds.where('game').equals('slots').toArray();
  const dist: Record<SlotsSymbol, SlotsSymbolDistribution> = {
    cherry: { symbol: 'cherry', reel0: 0, reel1: 0, reel2: 0, total: 0 },
    lemon: { symbol: 'lemon', reel0: 0, reel1: 0, reel2: 0, total: 0 },
    bell: { symbol: 'bell', reel0: 0, reel1: 0, reel2: 0, total: 0 },
    bar: { symbol: 'bar', reel0: 0, reel1: 0, reel2: 0, total: 0 },
    seven: { symbol: 'seven', reel0: 0, reel1: 0, reel2: 0, total: 0 },
  };
  for (const r of rows) {
    const d = r.details as SlotsRoundDetails | undefined;
    if (!d?.spin?.reels) continue;
    d.spin.reels.forEach((symbol, i) => {
      if (!(symbol in dist)) return;
      const e = dist[symbol];
      if (i === 0) e.reel0 += 1;
      else if (i === 1) e.reel1 += 1;
      else if (i === 2) e.reel2 += 1;
      e.total += 1;
    });
  }
  return SLOTS_SYMBOLS_ORDER.map((s) => dist[s]);
}

// ─── Phase 15 #8 — Baccarat all-time admin stats ──────────────────────

export interface BaccaratAllTimeStats {
  /** Count of baccarat rounds with valid winner details. */
  roundsPlayed: number;
  /** Sum of betAmount across all valid rounds. */
  totalWagered: number;
  /** Sum of payout across all valid rounds. */
  totalPaid: number;
  /** totalWagered - totalPaid (positive = house won). */
  netHouseChips: number;
  /** Mirror of netHouseChips. */
  netPlayerChips: number;
  /** totalPaid / totalWagered (null if no wagering). */
  actualRtp: number | null;
  /** Outcome distribution. */
  playerWins: number;
  bankerWins: number;
  ties: number;
  /** Winner won on a 2-card 8/9. */
  naturalWins: number;
  /** Both sides went natural (typically a tie or close win). */
  doubleNaturals: number;
  /** First-two-card pair status per side. */
  playerPairs: number;
  bankerPairs: number;
  /** Big = 5–6 cards (one side took a third card); Small = 4 cards (both stood). */
  bigCount: number;
  smallCount: number;
  /** Dragon = winner won by ≥ 4 with a non-natural. */
  playerDragons: number;
  bankerDragons: number;
  // Phase 15 #14.5 PR B — additive KPIs (see spec §4.3.3).
  /** playerWins / roundsPlayed. null when no rounds. */
  playerWinRate: number | null;
  /** bankerWins / roundsPlayed. null when no rounds. */
  bankerWinRate: number | null;
  /** ties / roundsPlayed. null when no rounds. */
  tieRate: number | null;
  /** Mean `totalCards` across all rounds (proxy for shoe-length). null when no rounds. */
  avgShoeLength: number | null;
  /** Biggest single round net win. 0 when no positive rounds. */
  biggestSingleWin: number;
}

export async function getBaccaratAllTimeStats(sinceMs?: number): Promise<BaccaratAllTimeStats> {
  let rows = await db.rounds.where('game').equals('baccarat').toArray();
  if (sinceMs !== undefined) rows = rows.filter((r) => r.playedAt > sinceMs);
  let roundsPlayed = 0;
  let totalWagered = 0;
  let totalPaid = 0;
  let playerWins = 0;
  let bankerWins = 0;
  let ties = 0;
  let naturalWins = 0;
  let doubleNaturals = 0;
  let playerPairs = 0;
  let bankerPairs = 0;
  let bigCount = 0;
  let smallCount = 0;
  let playerDragons = 0;
  let bankerDragons = 0;
  let totalCardsSum = 0;
  let biggestSingleWin = 0;
  for (const r of rows) {
    const d = r.details as PersistedBaccaratDetails | undefined;
    if (!d?.winner) continue;
    roundsPlayed += 1;
    totalWagered += r.betAmount;
    totalPaid += r.payout;
    if (r.netChange > biggestSingleWin) biggestSingleWin = r.netChange;
    if (d.winner === 'player') playerWins += 1;
    else if (d.winner === 'banker') bankerWins += 1;
    else ties += 1;
    if (d.winnerNatural) naturalWins += 1;
    if (d.bothNatural) doubleNaturals += 1;
    if (d.playerPair) playerPairs += 1;
    if (d.bankerPair) bankerPairs += 1;
    // Big = 5–6 cards (one side took a third); Small = 4 cards (both stood).
    if (d.totalCards === 4) smallCount += 1;
    else if (d.totalCards >= 5) bigCount += 1;
    totalCardsSum += d.totalCards;
    // Dragon = winning side wins by ≥ 4 with a non-natural.
    if (d.margin >= 4 && !d.winnerNatural) {
      if (d.winner === 'player') playerDragons += 1;
      else if (d.winner === 'banker') bankerDragons += 1;
    }
  }
  const netHouseChips = totalWagered - totalPaid;
  return {
    roundsPlayed,
    totalWagered,
    totalPaid,
    netHouseChips,
    // Add zero to normalise `-0` (e.g. `-(0)`) to `+0` for strict equality assertions.
    netPlayerChips: -netHouseChips + 0,
    actualRtp: totalWagered > 0 ? totalPaid / totalWagered : null,
    playerWins,
    bankerWins,
    ties,
    naturalWins,
    doubleNaturals,
    playerPairs,
    bankerPairs,
    bigCount,
    smallCount,
    playerDragons,
    bankerDragons,
    // Phase 15 #14.5 PR B — additive KPIs (see spec §4.3.3).
    playerWinRate: roundsPlayed > 0 ? playerWins / roundsPlayed : null,
    bankerWinRate: roundsPlayed > 0 ? bankerWins / roundsPlayed : null,
    tieRate: roundsPlayed > 0 ? ties / roundsPlayed : null,
    avgShoeLength: roundsPlayed > 0 ? Math.round((totalCardsSum / roundsPlayed) * 10) / 10 : null,
    biggestSingleWin,
  };
}

export interface BaccaratWinnerCount {
  winner: 'player' | 'banker' | 'tie';
  count: number;
}

const BACCARAT_WINNER_ORDER: readonly BaccaratWinnerCount['winner'][] = [
  'player',
  'banker',
  'tie',
] as const;

export async function getBaccaratWinnerDistribution(): Promise<BaccaratWinnerCount[]> {
  const rows = await db.rounds.where('game').equals('baccarat').toArray();
  const counts: Record<BaccaratWinnerCount['winner'], number> = { player: 0, banker: 0, tie: 0 };
  for (const r of rows) {
    const d = r.details as PersistedBaccaratDetails | undefined;
    if (!d?.winner) continue;
    counts[d.winner] += 1;
  }
  return BACCARAT_WINNER_ORDER.map((winner) => ({ winner, count: counts[winner] }));
}

export interface BaccaratStreakStats {
  longestPlayerStreak: number;
  longestBankerStreak: number;
  longestTieStreak: number;
}

/** Walk rows chronologically and track the current run; reset on winner change.
 *  Shoe-life metrics (cut-card-passed events) are deferred — those aren't
 *  necessarily logged in `rounds.details`, so streaks ship instead. */
export async function getBaccaratStreakStats(): Promise<BaccaratStreakStats> {
  const rows = await db.rounds.where('game').equals('baccarat').toArray();
  rows.sort((a, b) => a.playedAt - b.playedAt);
  let curWinner: BaccaratWinner | null = null;
  let curRun = 0;
  let longestPlayer = 0;
  let longestBanker = 0;
  let longestTie = 0;
  for (const r of rows) {
    const d = r.details as PersistedBaccaratDetails | undefined;
    if (!d?.winner) continue;
    if (d.winner === curWinner) {
      curRun += 1;
    } else {
      curWinner = d.winner;
      curRun = 1;
    }
    if (curWinner === 'player' && curRun > longestPlayer) longestPlayer = curRun;
    else if (curWinner === 'banker' && curRun > longestBanker) longestBanker = curRun;
    else if (curWinner === 'tie' && curRun > longestTie) longestTie = curRun;
  }
  return {
    longestPlayerStreak: longestPlayer,
    longestBankerStreak: longestBanker,
    longestTieStreak: longestTie,
  };
}

// ─── Phase 15 #10.v1 — Bingo all-time admin stats ─────────────────────

export type BingoVariant = 'british' | 'american';
export type BingoDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Shape of `rounds.details` for a bingo row — verified against the settle
 * bridge in `src/games/bingo/BingoPage.tsx` (~line 117). Mirrored in the
 * admin page + stats test fixtures; if you change this, update all three.
 *
 * Notably absent: `cardCount` (the 1-4 cards the player chose at setup).
 * The spec §4.8.5 card-count usage stat isn't derivable from the
 * persisted details, so this PR ships the stats that ARE derivable and
 * documents the gap in the PR description. Extending the details write
 * is logic-side and out of scope per the plan's hard rules.
 */
interface PersistedBingoDetails {
  readonly variant: BingoVariant;
  readonly difficulty: BingoDifficulty;
  readonly finalCallCount: number;
  readonly userTier1: boolean;
  readonly userTier2: boolean;
  readonly userTier3: boolean;
  readonly cpuTier3Winner: number | null;
  readonly bonusesEarned: number;
  readonly pot: number;
}

/** True when the row's details look like a settled bingo round. We require
 *  `variant` + `difficulty` + numeric `finalCallCount` so the aggregator
 *  can skip half-written / legacy rows without throwing. */
function isBingoDetails(d: unknown): d is PersistedBingoDetails {
  if (typeof d !== 'object' || d === null) return false;
  const obj = d as Record<string, unknown>;
  return (
    (obj.variant === 'british' || obj.variant === 'american') &&
    (obj.difficulty === 'easy' || obj.difficulty === 'medium' || obj.difficulty === 'hard') &&
    typeof obj.finalCallCount === 'number'
  );
}

export interface BingoAllTimeStats {
  /** Settled bingo rounds (excludes legacy / half-written rows). */
  gamesPlayed: number;
  totalWagered: number;
  totalPaid: number;
  /** `totalWagered - totalPaid` (positive = house won). */
  netHouseChips: number;
  /** Mirror of `netHouseChips` (sign-flipped, zero normalised). */
  netPlayerChips: number;
  /** `totalPaid / totalWagered` (null when no wagering). */
  actualRtp: number | null;
  /** Count of games where the player won the tier-3 BINGO. */
  playerTier3Wins: number;
  /** Count of games where a CPU won the tier-3 BINGO (player loss). */
  cpuTier3Wins: number;
  /** `playerTier3Wins / gamesPlayed` (0 when no games yet). */
  playerBingoCapturePct: number;
  /** Player tier-3 wins with `finalCallCount ≤ 40` (the FAST BINGO kicker). */
  fastBingoPlayerWins: number;
  /** `fastBingoPlayerWins / playerTier3Wins` (0 when no player tier-3 wins). */
  fastBingoHitRate: number;
  /** Games where `userTier1 === true` (player won a LINE). */
  lineWins: number;
  /** Games where `userTier2 === true` (DOUBLE LINE / FOUR CORNERS — the
   *  persisted details collapse both into the tier-2 flag, spec §4.8.7
   *  acknowledges the limitation). */
  doubleLineWins: number;
  /** Total bonus chips paid across tier-1 + tier-2 (sum of `bonusesEarned`). */
  totalBonusesPaid: number;
  /** Sum of `pot` across games the player won (tier-3 take). */
  totalPotsWonByPlayer: number;
  // Phase 15 #14.5 PR B — additive KPIs (see spec §4.3.3).
  /** Mean `finalCallCount` across all settled games. null when no games. */
  avgCallCount: number | null;
  /** Biggest single net win across games. 0 when no positive wins. */
  biggestSingleWin: number;
}

export async function getBingoAllTimeStats(sinceMs?: number): Promise<BingoAllTimeStats> {
  let rows = await db.rounds.where('game').equals('bingo').toArray();
  if (sinceMs !== undefined) rows = rows.filter((r) => r.playedAt > sinceMs);
  let gamesPlayed = 0;
  let totalWagered = 0;
  let totalPaid = 0;
  let playerTier3Wins = 0;
  let cpuTier3Wins = 0;
  let fastBingoPlayerWins = 0;
  let lineWins = 0;
  let doubleLineWins = 0;
  let totalBonusesPaid = 0;
  let totalPotsWonByPlayer = 0;
  let callCountSum = 0;
  let biggestSingleWin = 0;

  for (const r of rows) {
    if (!isBingoDetails(r.details)) continue;
    const d = r.details;
    gamesPlayed += 1;
    totalWagered += r.betAmount;
    totalPaid += r.payout;
    if (r.netChange > biggestSingleWin) biggestSingleWin = r.netChange;
    callCountSum += d.finalCallCount;
    if (d.userTier3) {
      playerTier3Wins += 1;
      totalPotsWonByPlayer += d.pot;
      if (d.finalCallCount <= 40) fastBingoPlayerWins += 1;
    } else if (d.cpuTier3Winner !== null) {
      cpuTier3Wins += 1;
    }
    if (d.userTier1) lineWins += 1;
    if (d.userTier2) doubleLineWins += 1;
    totalBonusesPaid += d.bonusesEarned;
  }

  const netHouseChips = totalWagered - totalPaid;
  return {
    gamesPlayed,
    totalWagered,
    totalPaid,
    netHouseChips,
    // Add zero to normalise `-0` (e.g. `-(0)`) to `+0` for strict assertions.
    netPlayerChips: -netHouseChips + 0,
    actualRtp: totalWagered > 0 ? totalPaid / totalWagered : null,
    playerTier3Wins,
    cpuTier3Wins,
    playerBingoCapturePct: gamesPlayed > 0 ? playerTier3Wins / gamesPlayed : 0,
    fastBingoPlayerWins,
    fastBingoHitRate: playerTier3Wins > 0 ? fastBingoPlayerWins / playerTier3Wins : 0,
    lineWins,
    doubleLineWins,
    totalBonusesPaid,
    totalPotsWonByPlayer,
    // Phase 15 #14.5 PR B — additive KPIs (see spec §4.3.3).
    avgCallCount: gamesPlayed > 0 ? Math.round(callCountSum / gamesPlayed) : null,
    biggestSingleWin,
  };
}

export interface BingoVariantDifficultyCount {
  variant: BingoVariant;
  difficulty: BingoDifficulty;
  count: number;
}

/** Canonical row order for the stacked-bar chart + tests. */
const BINGO_VARIANT_DIFFICULTY_ORDER: readonly {
  variant: BingoVariant;
  difficulty: BingoDifficulty;
}[] = [
  { variant: 'british', difficulty: 'easy' },
  { variant: 'british', difficulty: 'medium' },
  { variant: 'british', difficulty: 'hard' },
  { variant: 'american', difficulty: 'easy' },
  { variant: 'american', difficulty: 'medium' },
  { variant: 'american', difficulty: 'hard' },
];

export async function getBingoVariantDifficultyDistribution(): Promise<
  BingoVariantDifficultyCount[]
> {
  const rows = await db.rounds.where('game').equals('bingo').toArray();
  const counts = new Map<string, number>();
  const key = (v: BingoVariant, d: BingoDifficulty) => `${v}|${d}`;
  for (const r of rows) {
    if (!isBingoDetails(r.details)) continue;
    const k = key(r.details.variant, r.details.difficulty);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return BINGO_VARIANT_DIFFICULTY_ORDER.map(({ variant, difficulty }) => ({
    variant,
    difficulty,
    count: counts.get(key(variant, difficulty)) ?? 0,
  }));
}

export interface BingoBallsToBingo {
  difficulty: BingoDifficulty;
  /** Mean `finalCallCount` over games where the player won the tier-3.
   *  `null` when no player wins at that difficulty yet (so the admin UI
   *  can render '—' instead of dividing by zero). */
  averageCalls: number | null;
}

const BINGO_DIFFICULTY_ORDER: readonly BingoDifficulty[] = ['easy', 'medium', 'hard'];

export async function getBingoBallsToBingo(): Promise<BingoBallsToBingo[]> {
  const rows = await db.rounds.where('game').equals('bingo').toArray();
  const sums: Record<BingoDifficulty, { total: number; count: number }> = {
    easy: { total: 0, count: 0 },
    medium: { total: 0, count: 0 },
    hard: { total: 0, count: 0 },
  };
  for (const r of rows) {
    if (!isBingoDetails(r.details)) continue;
    const d = r.details;
    if (!d.userTier3) continue;
    const slot = sums[d.difficulty];
    slot.total += d.finalCallCount;
    slot.count += 1;
  }
  return BINGO_DIFFICULTY_ORDER.map((difficulty) => {
    const { total, count } = sums[difficulty];
    return {
      difficulty,
      averageCalls: count > 0 ? total / count : null,
    };
  });
}

// Phase 15 #14.5 PR B — additive call-count histogram. Buckets every
// settled bingo game's `finalCallCount` into 10-call-wide bins (0-9,
// 10-19, …, 80+). Each bin is always returned so the histogram has a
// fixed x-axis.
export interface BingoCallCountBin {
  /** Inclusive lower bound (multiples of 10). */
  binMin: number;
  /** Inclusive upper bound (binMin + 9, or `Infinity` for the catch-all). */
  binMax: number;
  count: number;
}

export async function getBingoCallCountHistogram(sinceMs?: number): Promise<BingoCallCountBin[]> {
  let rows = await db.rounds.where('game').equals('bingo').toArray();
  if (sinceMs !== undefined) rows = rows.filter((r) => r.playedAt > sinceMs);
  const BINS: BingoCallCountBin[] = [
    { binMin: 0, binMax: 9, count: 0 },
    { binMin: 10, binMax: 19, count: 0 },
    { binMin: 20, binMax: 29, count: 0 },
    { binMin: 30, binMax: 39, count: 0 },
    { binMin: 40, binMax: 49, count: 0 },
    { binMin: 50, binMax: 59, count: 0 },
    { binMin: 60, binMax: 69, count: 0 },
    { binMin: 70, binMax: 79, count: 0 },
    { binMin: 80, binMax: Number.POSITIVE_INFINITY, count: 0 },
  ];
  for (const r of rows) {
    if (!isBingoDetails(r.details)) continue;
    const calls = r.details.finalCallCount;
    const idx = Math.min(Math.floor(calls / 10), BINS.length - 1);
    BINS[idx]!.count += 1;
  }
  return BINS;
}

// ─── Phase 15 #11 — Plinko all-time admin stats ───────────────────────

/** Re-export the game-side Risk union under a namespaced name so the admin
 *  page, chart wrapper, and tests can import it from stats without reaching
 *  into the games sandbox at type-import time. (Internal-only — game UI keeps
 *  importing the alias from `@/games/plinko/logic` directly.) */
export type { PlinkoRisk };

/**
 * Shape of `rounds.details` for a plinko row — flattened at persist time
 * in PlinkoPage (see the `settle` call site). Mirrored in
 * `AdminPlinkoPage.tsx` and the stats test fixtures; if you change this,
 * update all three. (See the baccarat #249 nested-vs-flat regression for
 * the why.)
 *
 * `sessionId` is also persisted but not consumed by any aggregator yet, so
 * we leave it out of the type to keep the surface honest.
 */
interface PersistedPlinkoDetails {
  readonly risk: PlinkoRisk;
  readonly bin: number; // 0..(BIN_COUNT - 1) = 0..26
  readonly multiplier: number;
}

/** Type guard for plinko round details. Skips half-written / legacy rows so
 *  the aggregators stay defensive against schema drift. */
function isPlinkoDetails(d: unknown): d is PersistedPlinkoDetails {
  if (typeof d !== 'object' || d === null) return false;
  const obj = d as Record<string, unknown>;
  const risk = obj.risk;
  const bin = obj.bin;
  const multiplier = obj.multiplier;
  return (
    (risk === 'safe' || risk === 'low' || risk === 'medium' || risk === 'high') &&
    typeof bin === 'number' &&
    Number.isInteger(bin) &&
    bin >= 0 &&
    bin < PLINKO_BIN_COUNT &&
    typeof multiplier === 'number'
  );
}

const PLINKO_RISKS_ORDER: readonly PlinkoRisk[] = ['safe', 'low', 'medium', 'high'];

/** Bin indices that count as "edge" (the leftmost / rightmost bucket).
 *  With BIN_COUNT = 27 these are 0 and 26. */
const PLINKO_EDGE_BINS = new Set<number>([0, PLINKO_BIN_COUNT - 1]);
/** Centre bin index. With BIN_COUNT = 27 this is 13 — the worst-payout
 *  bucket. */
const PLINKO_CENTRE_BIN = Math.floor(PLINKO_BIN_COUNT / 2);

export interface PlinkoAllTimeStats {
  /** Settled plinko rounds (excludes legacy / half-written rows). */
  ballsDropped: number;
  /** Sum of betAmount across all valid drops. */
  totalWagered: number;
  /** Sum of payout across all valid drops. */
  totalPaid: number;
  /** `totalWagered - totalPaid` (positive = house won). */
  netHouseChips: number;
  /** Mirror of `netHouseChips` (sign-flipped, zero normalised). */
  netPlayerChips: number;
  /** `totalPaid / totalWagered` (null when no wagering). */
  actualRtp: number | null;
  /** Per-risk breakdown — drops / wagered / paid / rtp. */
  perRisk: Record<
    PlinkoRisk,
    {
      drops: number;
      wagered: number;
      paid: number;
      rtp: number | null;
    }
  >;
  /** Headline event: landed in an edge bin at High risk (the 60,000× tier). */
  jackpotHits: number;
  /** Landed in an edge bin at any risk. */
  edgeBinHits: number;
  /** Landed in the centre bin (worst payout). */
  centreBinHits: number;
  // Phase 15 #14.5 PR B — additive KPIs (see spec §4.3.3).
  /** Average bet per ball (rounded). 0 when no drops. */
  avgBallDrop: number;
  /** edgeBinHits / ballsDropped (null when no drops). */
  edgeBinHitRate: number | null;
  /** Biggest single-ball net win. 0 when no positive drops. */
  biggestSingleBall: number;
}

export interface PlinkoBinDistribution {
  /** Bin index (0..BIN_COUNT - 1 = 0..26). */
  bin: number;
  /** Number of balls that landed in this bin across all risks. */
  count: number;
}

export interface PlinkoRiskDistribution {
  risk: PlinkoRisk;
  count: number;
}

export async function getPlinkoAllTimeStats(sinceMs?: number): Promise<PlinkoAllTimeStats> {
  let rows = await db.rounds.where('game').equals('plinko').toArray();
  if (sinceMs !== undefined) rows = rows.filter((r) => r.playedAt > sinceMs);
  let ballsDropped = 0;
  let totalWagered = 0;
  let totalPaid = 0;
  let jackpotHits = 0;
  let edgeBinHits = 0;
  let centreBinHits = 0;
  let biggestSingleBall = 0;
  const perRisk: Record<PlinkoRisk, { drops: number; wagered: number; paid: number }> = {
    safe: { drops: 0, wagered: 0, paid: 0 },
    low: { drops: 0, wagered: 0, paid: 0 },
    medium: { drops: 0, wagered: 0, paid: 0 },
    high: { drops: 0, wagered: 0, paid: 0 },
  };
  for (const r of rows) {
    if (!isPlinkoDetails(r.details)) continue;
    const d = r.details;
    ballsDropped += 1;
    totalWagered += r.betAmount;
    totalPaid += r.payout;
    if (r.netChange > biggestSingleBall) biggestSingleBall = r.netChange;
    const bucket = perRisk[d.risk];
    bucket.drops += 1;
    bucket.wagered += r.betAmount;
    bucket.paid += r.payout;
    if (PLINKO_EDGE_BINS.has(d.bin)) {
      edgeBinHits += 1;
      if (d.risk === 'high') jackpotHits += 1;
    }
    if (d.bin === PLINKO_CENTRE_BIN) centreBinHits += 1;
  }
  const netHouseChips = totalWagered - totalPaid;
  // Build the `perRisk` shape the page consumes (with derived RTP per risk).
  const perRiskOut: PlinkoAllTimeStats['perRisk'] = {
    safe: {
      drops: perRisk.safe.drops,
      wagered: perRisk.safe.wagered,
      paid: perRisk.safe.paid,
      rtp: perRisk.safe.wagered > 0 ? perRisk.safe.paid / perRisk.safe.wagered : null,
    },
    low: {
      drops: perRisk.low.drops,
      wagered: perRisk.low.wagered,
      paid: perRisk.low.paid,
      rtp: perRisk.low.wagered > 0 ? perRisk.low.paid / perRisk.low.wagered : null,
    },
    medium: {
      drops: perRisk.medium.drops,
      wagered: perRisk.medium.wagered,
      paid: perRisk.medium.paid,
      rtp: perRisk.medium.wagered > 0 ? perRisk.medium.paid / perRisk.medium.wagered : null,
    },
    high: {
      drops: perRisk.high.drops,
      wagered: perRisk.high.wagered,
      paid: perRisk.high.paid,
      rtp: perRisk.high.wagered > 0 ? perRisk.high.paid / perRisk.high.wagered : null,
    },
  };
  return {
    ballsDropped,
    totalWagered,
    totalPaid,
    netHouseChips,
    // Add zero to normalise `-0` (e.g. `-(0)`) to `+0` for strict equality assertions.
    netPlayerChips: -netHouseChips + 0,
    actualRtp: totalWagered > 0 ? totalPaid / totalWagered : null,
    perRisk: perRiskOut,
    jackpotHits,
    edgeBinHits,
    centreBinHits,
    avgBallDrop: ballsDropped > 0 ? Math.round(totalWagered / ballsDropped) : 0,
    edgeBinHitRate: ballsDropped > 0 ? edgeBinHits / ballsDropped : null,
    biggestSingleBall,
  };
}

export async function getPlinkoBinDistribution(): Promise<PlinkoBinDistribution[]> {
  const rows = await db.rounds.where('game').equals('plinko').toArray();
  const counts = new Array<number>(PLINKO_BIN_COUNT).fill(0);
  for (const r of rows) {
    if (!isPlinkoDetails(r.details)) continue;
    counts[r.details.bin]! += 1;
  }
  return Array.from({ length: PLINKO_BIN_COUNT }, (_, bin) => ({
    bin,
    count: counts[bin]!,
  }));
}

export async function getPlinkoRiskDistribution(): Promise<PlinkoRiskDistribution[]> {
  const rows = await db.rounds.where('game').equals('plinko').toArray();
  const counts: Record<PlinkoRisk, number> = { safe: 0, low: 0, medium: 0, high: 0 };
  for (const r of rows) {
    if (!isPlinkoDetails(r.details)) continue;
    counts[r.details.risk] += 1;
  }
  return PLINKO_RISKS_ORDER.map((risk) => ({ risk, count: counts[risk] }));
}

// ─── Phase 15 #12.v1 — Poker (Hold'em / Five-Card Draw / Omaha) admin stats ─

export type PokerVariant = 'holdem' | 'five-card-draw' | 'omaha';

/**
 * Shape of `rounds.details` for a poker row — flattened at persist time in
 * HoldemPage's `doSettle` (see `src/games/poker/holdem/HoldemPage.tsx`).
 * Mirrored in AdminPokerPage.tsx and the stats test fixtures; if you change
 * this, update all three. (Mirrors the baccarat #249 / plinko flat-shape
 * lesson — the persisted shape is FLAT, not the nested in-memory context.)
 */
interface PersistedPokerDetails {
  readonly variant: PokerVariant;
  readonly tableSize: number;
  readonly stakes: { sb: number; bb: number };
  readonly handsPlayed: number;
  readonly rebuys: number;
  readonly biggestPotWon: number;
  readonly sessionId: string;
}

/** Type guard for poker round details. Skips half-written / legacy rows so
 *  the aggregators stay defensive against schema drift. */
function isPokerDetails(d: unknown): d is PersistedPokerDetails {
  if (typeof d !== 'object' || d === null) return false;
  const obj = d as Record<string, unknown>;
  const variant = obj.variant;
  const tableSize = obj.tableSize;
  const handsPlayed = obj.handsPlayed;
  const rebuys = obj.rebuys;
  const biggestPotWon = obj.biggestPotWon;
  const stakes = obj.stakes;
  if (variant !== 'holdem' && variant !== 'five-card-draw' && variant !== 'omaha') return false;
  if (typeof tableSize !== 'number' || !Number.isInteger(tableSize)) return false;
  if (typeof handsPlayed !== 'number' || !Number.isInteger(handsPlayed)) return false;
  if (typeof rebuys !== 'number' || !Number.isInteger(rebuys)) return false;
  if (typeof biggestPotWon !== 'number') return false;
  if (typeof stakes !== 'object' || stakes === null) return false;
  const s = stakes as Record<string, unknown>;
  return typeof s.sb === 'number' && typeof s.bb === 'number';
}

export interface PokerAllTimeStats {
  /** Settled poker sessions (one row per session — ADR-0041). */
  sessions: number;
  /** Total hands played across all sessions. */
  hands: number;
  /** Sum of bought-in chips (initial buy-in + rebuys, persisted as `betAmount`). */
  totalWagered: number;
  /** Sum of final stacks (persisted as `payout`). */
  totalPaid: number;
  /** `totalWagered - totalPaid` (positive = house won). */
  netHouseChips: number;
  /** Mirror of `netHouseChips` (sign-flipped, zero normalised). */
  netPlayerChips: number;
  /** `totalPaid / totalWagered` (null when no wagering). */
  actualRtp: number | null;
  /** Maximum `biggestPotWon` value across all sessions. */
  biggestPotEver: number;
  // Phase 15 #14.5 PR B — additive KPIs (see spec §4.3.3).
  /** hands / sessions (rounded). 0 when no sessions. */
  avgHandsPerSession: number;
  /** Fraction of sessions where netChange > 0. null when no sessions. */
  winRate: number | null;
  /** totalWagered / sessions (rounded). 0 when no sessions. */
  avgBuyIn: number;
  /** All-in frequency — not tracked in persisted details, exposed as null. */
  allInFrequency: number | null;
}

export interface PokerSessionsByVariantDay {
  /** YYYY-MM-DD in UTC. */
  date: string;
  holdem: number;
  fiveCardDraw: number;
  omaha: number;
}

export interface PokerBiggestPot {
  playedAt: number;
  variant: PokerVariant;
  amount: number;
}

/** Aggregates all poker sessions, optionally filtered to a single variant.
 *  Phase 15 #14 PR B — accepts an optional `sinceMs` epoch threshold
 *  (exclusive lower-bound on `playedAt`); when omitted the aggregator
 *  behaves exactly as before (back-compatible). */
export async function getPokerAllTimeStats(
  variant?: PokerVariant,
  sinceMs?: number,
): Promise<PokerAllTimeStats> {
  let rows = await db.rounds.where('game').equals('poker').toArray();
  if (sinceMs !== undefined) rows = rows.filter((r) => r.playedAt > sinceMs);
  let sessions = 0;
  let hands = 0;
  let totalWagered = 0;
  let totalPaid = 0;
  let biggestPotEver = 0;
  let winningSessions = 0;
  for (const r of rows) {
    if (!isPokerDetails(r.details)) continue;
    if (variant !== undefined && r.details.variant !== variant) continue;
    sessions += 1;
    hands += r.details.handsPlayed;
    totalWagered += r.betAmount;
    totalPaid += r.payout;
    if (r.netChange > 0) winningSessions += 1;
    if (r.details.biggestPotWon > biggestPotEver) {
      biggestPotEver = r.details.biggestPotWon;
    }
  }
  const netHouseChips = totalWagered - totalPaid;
  return {
    sessions,
    hands,
    totalWagered,
    totalPaid,
    netHouseChips,
    // Add zero to normalise `-0` (e.g. `-(0)`) to `+0` for strict assertions.
    netPlayerChips: -netHouseChips + 0,
    actualRtp: totalWagered > 0 ? totalPaid / totalWagered : null,
    biggestPotEver,
    avgHandsPerSession: sessions > 0 ? Math.round(hands / sessions) : 0,
    winRate: sessions > 0 ? winningSessions / sessions : null,
    avgBuyIn: sessions > 0 ? Math.round(totalWagered / sessions) : 0,
    // Not derivable from current persisted details — spec §4.3.3 lists it
    // as a target KPI; surface as null + render '—' until details extends.
    allInFrequency: null,
  };
}

// Phase 15 #14.5 PR B — table-size win-rate (degraded proxy for the spec's
// "win rate by seat position"; per-seat data isn't persisted). One row per
// observed tableSize value, sorted ascending.
export interface PokerWinRateByTableSize {
  tableSize: number;
  sessions: number;
  winRate: number;
}

export async function getPokerWinRateByTableSize(
  sinceMs?: number,
): Promise<PokerWinRateByTableSize[]> {
  let rows = await db.rounds.where('game').equals('poker').toArray();
  if (sinceMs !== undefined) rows = rows.filter((r) => r.playedAt > sinceMs);
  const byTable = new Map<number, { sessions: number; wins: number }>();
  for (const r of rows) {
    if (!isPokerDetails(r.details)) continue;
    const cur = byTable.get(r.details.tableSize) ?? { sessions: 0, wins: 0 };
    cur.sessions += 1;
    if (r.netChange > 0) cur.wins += 1;
    byTable.set(r.details.tableSize, cur);
  }
  return [...byTable.entries()]
    .map(([tableSize, v]) => ({
      tableSize,
      sessions: v.sessions,
      winRate: v.sessions > 0 ? v.wins / v.sessions : 0,
    }))
    .sort((a, b) => a.tableSize - b.tableSize);
}

/** YYYY-MM-DD in UTC for an epoch-ms timestamp. */
function utcDateKey(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear().toString().padStart(4, '0');
  const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = d.getUTCDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Returns the last `days` UTC days (inclusive of today, oldest first) with
 *  per-variant session counts. Days with no sessions return zeroed entries
 *  so the stacked-bar chart always has a full N-day spine. */
export async function getPokerSessionsByVariant(
  days: number,
): Promise<PokerSessionsByVariantDay[]> {
  if (days <= 0) return [];
  const rows = await db.rounds.where('game').equals('poker').toArray();
  // Build the canonical N-day window first so the chart's x-axis is fixed
  // regardless of which days had data.
  const todayUtcMs = startOfUtcDay(Date.now());
  const ONE_DAY_MS = 86_400_000;
  const window: PokerSessionsByVariantDay[] = [];
  const keyToIndex = new Map<string, number>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const dayMs = todayUtcMs - i * ONE_DAY_MS;
    const key = utcDateKey(dayMs);
    keyToIndex.set(key, window.length);
    window.push({ date: key, holdem: 0, fiveCardDraw: 0, omaha: 0 });
  }
  for (const r of rows) {
    if (!isPokerDetails(r.details)) continue;
    const key = utcDateKey(r.playedAt);
    const idx = keyToIndex.get(key);
    if (idx === undefined) continue;
    const day = window[idx]!;
    if (r.details.variant === 'holdem') day.holdem += 1;
    else if (r.details.variant === 'five-card-draw') day.fiveCardDraw += 1;
    else day.omaha += 1;
  }
  return window;
}

/** Top-N biggest pots ever won, optionally filtered by variant. Returned
 *  newest-tiebreaker first via stable `sort` on a descending amount. */
export async function getPokerBiggestPots(
  limit: number,
  variant?: PokerVariant,
): Promise<PokerBiggestPot[]> {
  if (limit <= 0) return [];
  const rows = await db.rounds.where('game').equals('poker').toArray();
  const all: PokerBiggestPot[] = [];
  for (const r of rows) {
    if (!isPokerDetails(r.details)) continue;
    if (variant !== undefined && r.details.variant !== variant) continue;
    if (r.details.biggestPotWon <= 0) continue;
    all.push({
      playedAt: r.playedAt,
      variant: r.details.variant,
      amount: r.details.biggestPotWon,
    });
  }
  all.sort((a, b) => {
    if (b.amount !== a.amount) return b.amount - a.amount;
    // Tie-break by most-recent first for stable display.
    return b.playedAt - a.playedAt;
  });
  return all.slice(0, limit);
}

// ─── Phase 15 #13 — Craps admin aggregations ──────────────────────────────

export type CrapsTier = 'low' | 'mid' | 'high';

/**
 * Shape of `rounds.details` for a craps row — flattened at persist time in
 * `src/games/craps/CrapsPage.tsx`'s `doSettle`. Mirrored in
 * AdminCrapsPage.tsx and the stats test fixtures; if you change this,
 * update all three. (Same FLAT-shape lesson as baccarat #249 / plinko /
 * poker.)
 *
 * `betTypeWagered` is an additive field shipped in Phase 15 #13 PR A —
 * pre-PR-A sessions lack it, so every consumer must treat it as optional
 * and degrade gracefully when undefined.
 */
interface PersistedCrapsDetails {
  readonly tier: CrapsTier;
  readonly rollsPlayed: number;
  readonly rebuys: number;
  readonly biggestRollWin: number;
  readonly sessionId: string;
  /** Additive PR-A field — `Record<betId, totalChipsWagered>`. May be undefined. */
  readonly betTypeWagered?: Record<string, number>;
}

/** Type guard for craps round details. Skips half-written / legacy rows so
 *  the aggregators stay defensive against schema drift. */
function isCrapsDetails(d: unknown): d is PersistedCrapsDetails {
  if (typeof d !== 'object' || d === null) return false;
  const obj = d as Record<string, unknown>;
  const tier = obj.tier;
  const rollsPlayed = obj.rollsPlayed;
  const rebuys = obj.rebuys;
  const biggestRollWin = obj.biggestRollWin;
  const sessionId = obj.sessionId;
  if (tier !== 'low' && tier !== 'mid' && tier !== 'high') return false;
  if (typeof rollsPlayed !== 'number' || !Number.isInteger(rollsPlayed)) return false;
  if (typeof rebuys !== 'number' || !Number.isInteger(rebuys)) return false;
  if (typeof biggestRollWin !== 'number') return false;
  if (typeof sessionId !== 'string') return false;
  // `betTypeWagered` is optional — if present, must be a plain object whose
  // values are finite numbers. Non-conforming rows have their bet-type log
  // ignored but the row still counts toward the headline aggregations.
  return true;
}

/** Narrower predicate for the bet-type frequency aggregator: returns the
 *  `betTypeWagered` record when present + well-formed, otherwise null. */
function readCrapsBetTypeWagered(d: PersistedCrapsDetails): Record<string, number> | null {
  const raw = d.betTypeWagered;
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'object') return null;
  const out: Record<string, number> = {};
  let any = false;
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) continue;
    out[key] = value;
    any = true;
  }
  return any ? out : null;
}

export interface CrapsAllTimeStats {
  /** Settled craps sessions (one row per session — ADR-0041). */
  sessions: number;
  /** Sum of `details.rollsPlayed` across all sessions. */
  totalRolls: number;
  /** Sum of bought-in chips (initial buy-in + rebuys, persisted as `betAmount`). */
  totalWagered: number;
  /** Sum of final bankrolls (persisted as `payout`). */
  totalPaid: number;
  /** `totalWagered - totalPaid` (positive = house won). */
  netHouseChips: number;
  /** Mirror of `netHouseChips` (sign-flipped, zero normalised). */
  netPlayerChips: number;
  /** `totalPaid / totalWagered` (null when no wagering). */
  actualRtp: number | null;
  /** Maximum `biggestRollWin` value across all sessions. */
  biggestRollWin: number;
}

export interface CrapsBetTypeWagered {
  /** Canonical bet id from `src/games/craps/bets.ts` (e.g. `pass`, `field`). */
  betType: string;
  /** Total chips wagered on this bet type across all sessions. */
  totalWagered: number;
}

export interface CrapsBiggestSession {
  playedAt: number;
  tier: CrapsTier;
  net: number;
}

/** Aggregates all craps sessions into the headline operator metrics. */
export async function getCrapsAllTimeStats(sinceMs?: number): Promise<CrapsAllTimeStats> {
  let rows = await db.rounds.where('game').equals('craps').toArray();
  if (sinceMs !== undefined) rows = rows.filter((r) => r.playedAt > sinceMs);
  let sessions = 0;
  let totalRolls = 0;
  let totalWagered = 0;
  let totalPaid = 0;
  let biggestRollWin = 0;
  for (const r of rows) {
    if (!isCrapsDetails(r.details)) continue;
    sessions += 1;
    totalRolls += r.details.rollsPlayed;
    totalWagered += r.betAmount;
    totalPaid += r.payout;
    if (r.details.biggestRollWin > biggestRollWin) {
      biggestRollWin = r.details.biggestRollWin;
    }
  }
  const netHouseChips = totalWagered - totalPaid;
  return {
    sessions,
    totalRolls,
    totalWagered,
    totalPaid,
    netHouseChips,
    // Add zero to normalise `-0` (e.g. `-(0)`) to `+0` for strict assertions.
    netPlayerChips: -netHouseChips + 0,
    actualRtp: totalWagered > 0 ? totalPaid / totalWagered : null,
    biggestRollWin,
  };
}

/** Walks every craps round, merges `details.betTypeWagered` into a single
 *  per-bet-type total. Sessions missing the field (pre-PR-A) are silently
 *  skipped. Returns an array sorted descending by `totalWagered` so the
 *  chart's stacking order reflects bet popularity at a glance. If NO row
 *  carries the field, the returned array is empty — the chart wrapper
 *  surfaces a friendly empty-state UI in that case. */
export async function getCrapsBetTypeFrequency(): Promise<CrapsBetTypeWagered[]> {
  const rows = await db.rounds.where('game').equals('craps').toArray();
  const totals = new Map<string, number>();
  for (const r of rows) {
    if (!isCrapsDetails(r.details)) continue;
    const wagered = readCrapsBetTypeWagered(r.details);
    if (wagered === null) continue;
    for (const [betType, amount] of Object.entries(wagered)) {
      totals.set(betType, (totals.get(betType) ?? 0) + amount);
    }
  }
  const out: CrapsBetTypeWagered[] = [];
  for (const [betType, totalWagered] of totals) {
    out.push({ betType, totalWagered });
  }
  out.sort((a, b) => {
    if (b.totalWagered !== a.totalWagered) return b.totalWagered - a.totalWagered;
    // Tie-break alphabetically for stable display.
    return a.betType.localeCompare(b.betType);
  });
  return out;
}

/** Top-N biggest session NET wins (final bankroll − total bought-in) across
 *  all craps sessions. Rounds with non-positive net are filtered out — the
 *  panel reads "biggest WINS", not "biggest sessions overall". Stable
 *  tie-break by most-recent first. */
export async function getCrapsBiggestSessionWins(limit: number): Promise<CrapsBiggestSession[]> {
  if (limit <= 0) return [];
  const rows = await db.rounds.where('game').equals('craps').toArray();
  const all: CrapsBiggestSession[] = [];
  for (const r of rows) {
    if (!isCrapsDetails(r.details)) continue;
    const net = r.payout - r.betAmount;
    if (net <= 0) continue;
    all.push({
      playedAt: r.playedAt,
      tier: r.details.tier,
      net,
    });
  }
  all.sort((a, b) => {
    if (b.net !== a.net) return b.net - a.net;
    return b.playedAt - a.playedAt;
  });
  return all.slice(0, limit);
}

// ─── Phase 15 #14 — Admin Overview augmentation ───────────────────────────

export interface TopGameRow {
  game:
    | 'blackjack'
    | 'roulette'
    | 'slots'
    | 'baccarat'
    | 'bingo'
    | 'lottery'
    | 'plinko'
    | 'poker'
    | 'craps'
    | 'coin-flip';
  sessions: number;
  houseNet: number;
}

export interface DailyActivityPoint {
  /** YYYY-MM-DD (UTC). */
  date: string;
  sessions: number;
}

export interface RecentAdjustmentRow {
  id: string;
  adjustedAt: number;
  /** Resolved username; `<deleted>` when the target user row has been removed. */
  targetUser: string;
  /** Signed integer chips (positive = credit, negative = debit). */
  amount: number;
  reason: string;
}

/**
 * Top N games by total session count. A "session" here = one `rounds` row.
 * Poker + Craps persist session-level rows (ADR-0041), so for them this
 * equals literal sessions; for other games it equals discrete rounds.
 * House net = sum(betAmount - payout) — positive when the house is ahead
 * (casino-operator perspective; matches the Net house StatCard tone).
 */
export async function getTopGamesBySessions(limit: number): Promise<TopGameRow[]> {
  if (limit <= 0) return [];
  const rows = await db.rounds.toArray();
  const byGame = new Map<TopGameRow['game'], { sessions: number; houseNet: number }>();
  for (const r of rows) {
    const game = r.game;
    const cur = byGame.get(game) ?? { sessions: 0, houseNet: 0 };
    cur.sessions += 1;
    cur.houseNet += r.betAmount - r.payout;
    byGame.set(game, cur);
  }
  return [...byGame.entries()]
    .map(([game, v]) => ({ game, sessions: v.sessions, houseNet: v.houseNet }))
    .sort((a, b) => {
      if (b.sessions !== a.sessions) return b.sessions - a.sessions;
      return a.game.localeCompare(b.game);
    })
    .slice(0, limit);
}

/**
 * Sessions per UTC calendar day for the last `days` days, ending **today**
 * inclusive (sparkline series). Pre-seeds every day in the range with 0 so
 * the line renders gaps as zeros instead of collapsing the x-axis. Returns
 * chronological (ascending) order.
 */
export async function getDailyActivity(days: number): Promise<DailyActivityPoint[]> {
  if (days <= 0) return [];
  const dayMs = 86_400_000;
  const now = Date.now();
  // Align to UTC midnight of the latest day in the window (= today UTC).
  const todayUtcStart = Math.floor(now / dayMs) * dayMs;
  const earliestUtcStart = todayUtcStart - (days - 1) * dayMs;
  const rows = await db.rounds.where('playedAt').aboveOrEqual(earliestUtcStart).toArray();
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const date = new Date(earliestUtcStart + i * dayMs).toISOString().slice(0, 10);
    buckets.set(date, 0);
  }
  for (const r of rows) {
    const date = new Date(r.playedAt).toISOString().slice(0, 10);
    if (buckets.has(date)) buckets.set(date, (buckets.get(date) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, sessions]) => ({ date, sessions }));
}

/**
 * Last N adjustments (chip credits/debits applied by an admin), most recent
 * first, with target-user resolution. `Adjustment` has no `adminId` field —
 * see spec §4.2 — so this row intentionally omits admin attribution.
 */
export async function getRecentAdjustments(limit: number): Promise<RecentAdjustmentRow[]> {
  if (limit <= 0) return [];
  const adjustments = await db.adjustments.toArray();
  adjustments.sort((a, b) => b.adjustedAt - a.adjustedAt);
  const sliced = adjustments.slice(0, limit);
  const userIds = [...new Set(sliced.map((a) => a.userId))];
  const users = await db.users.bulkGet(userIds);
  const usernameById = new Map<string, string>();
  users.forEach((u, i) => {
    const id = userIds[i];
    if (u && id !== undefined) usernameById.set(id, u.username);
  });
  return sliced.map((a) => ({
    id: a.id,
    adjustedAt: a.adjustedAt,
    targetUser: usernameById.get(a.userId) ?? '<deleted>',
    amount: a.amount,
    reason: a.reason,
  }));
}

// ── Cross-game leaderboard (Phase 15 #14 PR C) ─────────────────────────────
//
// Four cross-game admin aggregations powering `/admin/leaderboard`. All four
// accept an optional `sinceMs` UTC-epoch lower bound (strictly greater than)
// so a future date-range filter (PR B) can be wired in without changing the
// signatures. When `sinceMs` is undefined the aggregator considers every
// recorded round.

export interface LeaderboardWinnerRow {
  username: string;
  netChips: number;
  rounds: number;
}

export interface LeaderboardVolumeRow {
  username: string;
  totalWagered: number;
  rounds: number;
}

export interface LeaderboardSingleWinRow {
  username: string;
  game: Round['game'];
  payout: number;
  netChange: number;
  playedAt: number;
}

export interface LeaderboardStreakRow {
  username: string;
  streakLength: number;
  game: Round['game'];
}

async function loadFilteredRoundsForLeaderboard(sinceMs?: number): Promise<Round[]> {
  const rows = await db.rounds.toArray();
  if (sinceMs === undefined) return rows;
  return rows.filter((r) => r.playedAt > sinceMs);
}

async function resolveUsernamesForLeaderboard(userIds: string[]): Promise<Map<string, string>> {
  const users = await db.users.bulkGet(userIds);
  const m = new Map<string, string>();
  users.forEach((u, i) => {
    const id = userIds[i];
    if (u && id !== undefined) m.set(id, u.username);
  });
  return m;
}

export async function getLeaderboardTopWinners(
  limit: number,
  sinceMs?: number,
): Promise<LeaderboardWinnerRow[]> {
  if (limit <= 0) return [];
  const rows = await loadFilteredRoundsForLeaderboard(sinceMs);
  const byUser = new Map<string, { netChips: number; rounds: number }>();
  for (const r of rows) {
    const cur = byUser.get(r.userId) ?? { netChips: 0, rounds: 0 };
    cur.netChips += r.netChange;
    cur.rounds += 1;
    byUser.set(r.userId, cur);
  }
  const usernames = await resolveUsernamesForLeaderboard([...byUser.keys()]);
  return [...byUser.entries()]
    .map(([userId, v]) => ({
      username: usernames.get(userId) ?? '<deleted>',
      netChips: v.netChips,
      rounds: v.rounds,
    }))
    .sort((a, b) => b.netChips - a.netChips)
    .slice(0, limit);
}

export async function getLeaderboardTopVolume(
  limit: number,
  sinceMs?: number,
): Promise<LeaderboardVolumeRow[]> {
  if (limit <= 0) return [];
  const rows = await loadFilteredRoundsForLeaderboard(sinceMs);
  const byUser = new Map<string, { totalWagered: number; rounds: number }>();
  for (const r of rows) {
    const cur = byUser.get(r.userId) ?? { totalWagered: 0, rounds: 0 };
    cur.totalWagered += r.betAmount;
    cur.rounds += 1;
    byUser.set(r.userId, cur);
  }
  const usernames = await resolveUsernamesForLeaderboard([...byUser.keys()]);
  return [...byUser.entries()]
    .map(([userId, v]) => ({
      username: usernames.get(userId) ?? '<deleted>',
      totalWagered: v.totalWagered,
      rounds: v.rounds,
    }))
    .sort((a, b) => b.totalWagered - a.totalWagered)
    .slice(0, limit);
}

export async function getLeaderboardBiggestSingleWins(
  limit: number,
  sinceMs?: number,
): Promise<LeaderboardSingleWinRow[]> {
  if (limit <= 0) return [];
  const rows = await loadFilteredRoundsForLeaderboard(sinceMs);
  const wins = rows.filter((r) => r.netChange > 0);
  wins.sort((a, b) => b.netChange - a.netChange);
  const sliced = wins.slice(0, limit);
  const usernames = await resolveUsernamesForLeaderboard([...new Set(sliced.map((r) => r.userId))]);
  return sliced.map((r) => ({
    username: usernames.get(r.userId) ?? '<deleted>',
    game: r.game,
    payout: r.payout,
    netChange: r.netChange,
    playedAt: r.playedAt,
  }));
}

export async function getLeaderboardLongestStreaks(
  limit: number,
  sinceMs?: number,
): Promise<LeaderboardStreakRow[]> {
  if (limit <= 0) return [];
  const rows = await loadFilteredRoundsForLeaderboard(sinceMs);
  // Group by user, sort each user's rounds by playedAt asc, walk for longest
  // run of positive netChange. The game recorded is the game that pushed
  // the streak to its peak length.
  const byUser = new Map<
    string,
    Array<{ playedAt: number; netChange: number; game: Round['game'] }>
  >();
  for (const r of rows) {
    const arr = byUser.get(r.userId) ?? [];
    arr.push({ playedAt: r.playedAt, netChange: r.netChange, game: r.game });
    byUser.set(r.userId, arr);
  }
  const usernames = await resolveUsernamesForLeaderboard([...byUser.keys()]);
  const streaks: LeaderboardStreakRow[] = [];
  for (const [userId, arr] of byUser) {
    arr.sort((a, b) => a.playedAt - b.playedAt);
    let curStreak = 0;
    let curGame: Round['game'] | '' = '';
    let bestStreak = 0;
    let bestGame: Round['game'] | '' = '';
    for (const r of arr) {
      if (r.netChange > 0) {
        curStreak += 1;
        curGame = r.game;
        if (curStreak > bestStreak) {
          bestStreak = curStreak;
          bestGame = curGame;
        }
      } else {
        curStreak = 0;
      }
    }
    if (bestStreak > 0 && bestGame !== '') {
      streaks.push({
        username: usernames.get(userId) ?? '<deleted>',
        streakLength: bestStreak,
        game: bestGame,
      });
    }
  }
  return streaks.sort((a, b) => b.streakLength - a.streakLength).slice(0, limit);
}

// ─── Phase 15 #14.5 PR B — Blackjack admin stats ──────────────────────────
//
// New admin page for Blackjack (the game shipped pre-Phase 15 so it never
// got an admin page on the original /admin sidebar). Aggregations read the
// `BlackjackRoundDetails` shape persisted by BlackjackPage.tsx's
// `wallet.settleRound` calls; outcomes are derived from each hand's
// `outcome` field (`player-blackjack` / `player-win` / `push` /
// `player-loss` / `player-bust`).
//
// Multi-hand rounds (splits) — a single round can contain N hands. We
// expand each hand into its own outcome tally so the chart bar counts
// hands, not rounds. Win-rate / bust-rate / split-rate KPIs are computed
// from the same expansion.

export type BlackjackOutcomeKey = 'blackjack' | 'win' | 'lose' | 'push' | 'bust';

interface PersistedBlackjackHand {
  readonly bet: number;
  readonly doubled: boolean;
  readonly fromSplit: boolean;
  readonly outcome: 'player-blackjack' | 'player-win' | 'push' | 'player-loss' | 'player-bust';
  readonly payout: number;
}

interface PersistedBlackjackDetails {
  readonly hands: readonly PersistedBlackjackHand[];
}

function isBlackjackDetails(d: unknown): d is PersistedBlackjackDetails {
  if (typeof d !== 'object' || d === null) return false;
  const obj = d as Record<string, unknown>;
  return Array.isArray(obj.hands);
}

function mapBlackjackOutcome(outcome: PersistedBlackjackHand['outcome']): BlackjackOutcomeKey {
  switch (outcome) {
    case 'player-blackjack':
      return 'blackjack';
    case 'player-win':
      return 'win';
    case 'push':
      return 'push';
    case 'player-bust':
      return 'bust';
    case 'player-loss':
      return 'lose';
  }
}

export interface BlackjackAllTimeStats {
  /** Settled blackjack rounds (multi-hand rounds count as one round). */
  hands: number;
  totalWagered: number;
  totalPaid: number;
  /** `totalWagered - totalPaid` (positive = house won). */
  netHouseChips: number;
  netPlayerChips: number;
  actualRtp: number | null;
  /** Win rate over decisive (non-push) hands. null when no decisive hands. */
  winRate: number | null;
  /** Player-bust rate over all hands. null when no hands. */
  bustRate: number | null;
  /** Fraction of rounds that involved a split (one round contributes >= 2
   *  hands when at least one of them has `fromSplit === true`). */
  splitRate: number | null;
  /** Biggest net win on a single round (sum across that round's hands). */
  biggestHandWon: number;
  /** Average bet across all hands (rounded). 0 when no hands. */
  avgHandValue: number;
}

export interface BlackjackHandOutcome {
  outcome: BlackjackOutcomeKey;
  count: number;
}

const BLACKJACK_OUTCOME_ORDER: readonly BlackjackOutcomeKey[] = [
  'blackjack',
  'win',
  'push',
  'lose',
  'bust',
];

export async function getBlackjackAllTimeStats(sinceMs?: number): Promise<BlackjackAllTimeStats> {
  let rows = await db.rounds.where('game').equals('blackjack').toArray();
  if (sinceMs !== undefined) rows = rows.filter((r) => r.playedAt > sinceMs);
  let roundsCounted = 0;
  let totalWagered = 0;
  let totalPaid = 0;
  let handCount = 0;
  let handBetSum = 0;
  let wins = 0;
  let busts = 0;
  let decisiveHands = 0;
  let splitRounds = 0;
  let biggestHandWon = 0;

  for (const r of rows) {
    roundsCounted += 1;
    totalWagered += r.betAmount;
    totalPaid += r.payout;
    if (r.netChange > biggestHandWon) biggestHandWon = r.netChange;
    if (!isBlackjackDetails(r.details)) continue;
    let roundHadSplit = false;
    for (const h of r.details.hands) {
      handCount += 1;
      handBetSum += h.bet;
      const key = mapBlackjackOutcome(h.outcome);
      if (key === 'bust') busts += 1;
      if (key !== 'push') decisiveHands += 1;
      if (key === 'win' || key === 'blackjack') wins += 1;
      if (h.fromSplit) roundHadSplit = true;
    }
    if (roundHadSplit) splitRounds += 1;
  }

  const netHouseChips = totalWagered - totalPaid;
  return {
    hands: roundsCounted,
    totalWagered,
    totalPaid,
    netHouseChips,
    // Add zero to normalise `-0` to `+0` for strict assertions.
    netPlayerChips: -netHouseChips + 0,
    actualRtp: totalWagered > 0 ? totalPaid / totalWagered : null,
    winRate: decisiveHands > 0 ? wins / decisiveHands : null,
    bustRate: handCount > 0 ? busts / handCount : null,
    splitRate: roundsCounted > 0 ? splitRounds / roundsCounted : null,
    biggestHandWon,
    avgHandValue: handCount > 0 ? Math.round(handBetSum / handCount) : 0,
  };
}

export async function getBlackjackHandOutcomeDistribution(
  sinceMs?: number,
): Promise<BlackjackHandOutcome[]> {
  let rows = await db.rounds.where('game').equals('blackjack').toArray();
  if (sinceMs !== undefined) rows = rows.filter((r) => r.playedAt > sinceMs);
  const counts: Record<BlackjackOutcomeKey, number> = {
    blackjack: 0,
    win: 0,
    push: 0,
    lose: 0,
    bust: 0,
  };
  for (const r of rows) {
    if (!isBlackjackDetails(r.details)) {
      // Fallback for legacy rows: classify by netChange / payout ratio.
      if (r.netChange === 0) counts.push += 1;
      else if (r.netChange > 0) {
        if (r.payout >= r.betAmount * 2.4) counts.blackjack += 1;
        else counts.win += 1;
      } else counts.lose += 1;
      continue;
    }
    for (const h of r.details.hands) {
      counts[mapBlackjackOutcome(h.outcome)] += 1;
    }
  }
  return BLACKJACK_OUTCOME_ORDER.map((outcome) => ({ outcome, count: counts[outcome] }));
}

// ─── Phase 15 #14.5 PR B — Coin-flip admin stats ──────────────────────────

export type CoinSide = 'heads' | 'tails';

interface PersistedCoinFlipDetails {
  readonly call: CoinSide;
  readonly landed: CoinSide;
}

function isCoinFlipDetails(d: unknown): d is PersistedCoinFlipDetails {
  if (typeof d !== 'object' || d === null) return false;
  const obj = d as Record<string, unknown>;
  return (
    (obj.call === 'heads' || obj.call === 'tails') &&
    (obj.landed === 'heads' || obj.landed === 'tails')
  );
}

export interface CoinFlipAllTimeStats {
  flips: number;
  totalWagered: number;
  totalPaid: number;
  netHouseChips: number;
  netPlayerChips: number;
  actualRtp: number | null;
  /** Longest consecutive run of any single landed face. */
  longestStreak: number;
  /** Fraction of all flips where the call was heads. null when no flips. */
  headsCallRate: number | null;
  /** Fraction of all flips where the call was tails. null when no flips. */
  tailsCallRate: number | null;
  /** Average bet across all flips (rounded). 0 when no flips. */
  avgBet: number;
  /** Biggest net single-flip win. 0 when no positive flips. */
  biggestSingleWin: number;
}

export interface CoinFlipFaceCount {
  outcome: CoinSide;
  count: number;
}

const COIN_FLIP_FACES: readonly CoinSide[] = ['heads', 'tails'];

export async function getCoinFlipAllTimeStats(sinceMs?: number): Promise<CoinFlipAllTimeStats> {
  let rows = await db.rounds.where('game').equals('coin-flip').toArray();
  if (sinceMs !== undefined) rows = rows.filter((r) => r.playedAt > sinceMs);
  rows.sort((a, b) => a.playedAt - b.playedAt);
  let flips = 0;
  let totalWagered = 0;
  let totalPaid = 0;
  let betSum = 0;
  let headsCalls = 0;
  let tailsCalls = 0;
  let biggestSingleWin = 0;
  let curStreak = 0;
  let curFace: CoinSide | null = null;
  let longestStreak = 0;

  for (const r of rows) {
    flips += 1;
    totalWagered += r.betAmount;
    totalPaid += r.payout;
    betSum += r.betAmount;
    if (r.netChange > biggestSingleWin) biggestSingleWin = r.netChange;
    if (!isCoinFlipDetails(r.details)) continue;
    if (r.details.call === 'heads') headsCalls += 1;
    else tailsCalls += 1;
    if (r.details.landed === curFace) {
      curStreak += 1;
    } else {
      curFace = r.details.landed;
      curStreak = 1;
    }
    if (curStreak > longestStreak) longestStreak = curStreak;
  }
  const netHouseChips = totalWagered - totalPaid;
  return {
    flips,
    totalWagered,
    totalPaid,
    netHouseChips,
    netPlayerChips: -netHouseChips + 0,
    actualRtp: totalWagered > 0 ? totalPaid / totalWagered : null,
    longestStreak,
    headsCallRate: flips > 0 ? headsCalls / flips : null,
    tailsCallRate: flips > 0 ? tailsCalls / flips : null,
    avgBet: flips > 0 ? Math.round(betSum / flips) : 0,
    biggestSingleWin,
  };
}

export async function getCoinFlipFaceDistribution(sinceMs?: number): Promise<CoinFlipFaceCount[]> {
  let rows = await db.rounds.where('game').equals('coin-flip').toArray();
  if (sinceMs !== undefined) rows = rows.filter((r) => r.playedAt > sinceMs);
  const counts: Record<CoinSide, number> = { heads: 0, tails: 0 };
  for (const r of rows) {
    if (!isCoinFlipDetails(r.details)) continue;
    counts[r.details.landed] += 1;
  }
  return COIN_FLIP_FACES.map((outcome) => ({ outcome, count: counts[outcome] }));
}

// ─── Phase 15 #14.5 PR B — Per-game top-players drill-down ────────────────
//
// Shared aggregation powering the new `TopPlayersPanel` rendered on every
// game admin page. Returns the top-N net-chip earners scoped to a single
// game, optionally filtered by `sinceMs` (UTC-epoch exclusive lower bound).
// Mirrors the leaderboard aggregations' username-resolution pattern.

export interface TopPlayerRow {
  userId: string;
  username: string;
  rounds: number;
  netChips: number;
  biggestWin: number;
}

export async function getTopPlayersForGame(
  game: Round['game'],
  limit: number,
  sinceMs?: number,
): Promise<TopPlayerRow[]> {
  if (limit <= 0) return [];
  let rows = await db.rounds.where('game').equals(game).toArray();
  if (sinceMs !== undefined) rows = rows.filter((r) => r.playedAt > sinceMs);
  const byUser = new Map<string, { rounds: number; netChips: number; biggestWin: number }>();
  for (const r of rows) {
    const cur = byUser.get(r.userId) ?? { rounds: 0, netChips: 0, biggestWin: 0 };
    cur.rounds += 1;
    cur.netChips += r.netChange;
    if (r.netChange > cur.biggestWin) cur.biggestWin = r.netChange;
    byUser.set(r.userId, cur);
  }
  const usernames = await resolveUsernamesForLeaderboard([...byUser.keys()]);
  return [...byUser.entries()]
    .map(([userId, v]) => ({
      userId,
      username: usernames.get(userId) ?? '<deleted>',
      rounds: v.rounds,
      netChips: v.netChips,
      biggestWin: v.biggestWin,
    }))
    .sort((a, b) => {
      if (b.netChips !== a.netChips) return b.netChips - a.netChips;
      // Stable tie-break by username for deterministic test output.
      return a.username.localeCompare(b.username);
    })
    .slice(0, limit);
}
