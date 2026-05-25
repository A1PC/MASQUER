import { db } from '@/db';
import type { Round } from '@/db';
import type { RouletteRoundDetails } from '@/games/roulette/types';
import { WALLET_CONFIG } from '@/systems/wallet';

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

export async function getRouletteAllTimeStats(): Promise<RouletteAllTimeStats> {
  const rows = await db.rounds.where('game').equals('roulette').toArray();
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
