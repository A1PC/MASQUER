import { beforeEach, describe, expect, it } from 'vitest';
import { register } from '@/systems/auth';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { WALLET_CONFIG } from '@/systems/wallet';
import {
  getAllUserStats,
  getGameDistribution,
  getLeaderboard,
  getNetFlowSeries,
  getSiteWideStats,
  getTopLosers,
  getTopWinners,
  getUserBetSizeHistogram,
  getUserExtras,
  getUserMetrics,
  getUserPeaks,
  getUserSessionStats,
  getUserStreaks,
  getUserWinLossTimeline,
  getUserWinRateByGame,
} from './stats';

const SESSION_KEY = 'localGamble.session.userId';

async function seedTwoUsersWithRounds() {
  await resetDb();
  localStorage.removeItem(SESSION_KEY);
  const a = await register({ username: 'alice', password: 'password123' });
  const b = await register({ username: 'bob', password: 'password123' });
  if (!a.ok || !b.ok) throw new Error('register failed');

  await db.rounds.bulkAdd([
    {
      id: 'r-1',
      userId: a.user.id,
      game: 'blackjack',
      betAmount: 100,
      payout: 200,
      netChange: 100,
      outcome: 'win',
      details: {},
      balanceAfter: 1100,
      playedAt: 1000,
    },
    {
      id: 'r-2',
      userId: a.user.id,
      game: 'blackjack',
      betAmount: 50,
      payout: 100,
      netChange: 50,
      outcome: 'win',
      details: {},
      balanceAfter: 1150,
      playedAt: 2000,
    },
    {
      id: 'r-3',
      userId: a.user.id,
      game: 'blackjack',
      betAmount: 50,
      payout: 100,
      netChange: 50,
      outcome: 'win',
      details: {},
      balanceAfter: 1200,
      playedAt: 3000,
    },
  ]);

  await db.rounds.bulkAdd([
    {
      id: 'r-4',
      userId: b.user.id,
      game: 'roulette',
      betAmount: 100,
      payout: 0,
      netChange: -100,
      outcome: 'loss',
      details: {},
      balanceAfter: 900,
      playedAt: 1500,
    },
    {
      id: 'r-5',
      userId: b.user.id,
      game: 'slots',
      betAmount: 50,
      payout: 0,
      netChange: -50,
      outcome: 'loss',
      details: {},
      balanceAfter: 850,
      playedAt: 2500,
    },
  ]);

  return { aliceId: a.user.id, bobId: b.user.id };
}

describe('queries.getSiteWideStats', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('returns zeros when no users exist', async () => {
    const s = await getSiteWideStats();
    expect(s).toEqual({
      userCount: 0,
      totalWagered: 0,
      totalPaidOut: 0,
      totalNetChange: 0,
      totalRounds: 0,
    });
  });

  it('aggregates wagered / paid / net / rounds across all users', async () => {
    await seedTwoUsersWithRounds();
    const s = await getSiteWideStats();
    expect(s.userCount).toBe(2);
    expect(s.totalRounds).toBe(5);
    expect(s.totalWagered).toBe(100 + 50 + 50 + 100 + 50);
    expect(s.totalPaidOut).toBe(200 + 100 + 100 + 0 + 0);
    expect(s.totalNetChange).toBe(100 + 50 + 50 - 100 - 50);
  });
});

describe('queries.getAllUserStats', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('returns one row per user with totals + balance', async () => {
    const { aliceId, bobId } = await seedTwoUsersWithRounds();
    const rows = await getAllUserStats();
    expect(rows).toHaveLength(2);
    const alice = rows.find((r) => r.userId === aliceId)!;
    const bob = rows.find((r) => r.userId === bobId)!;
    expect(alice.username).toBe('alice');
    expect(alice.totalNetChange).toBe(200);
    expect(alice.totalRounds).toBe(3);
    expect(bob.totalNetChange).toBe(-150);
    expect(bob.totalRounds).toBe(2);
  });
});

describe('queries.getNetFlowSeries', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('returns a daily-bucketed net-change series', async () => {
    await seedTwoUsersWithRounds();
    const series = await getNetFlowSeries();
    expect(series.length).toBeGreaterThan(0);
    const totalFromSeries = series.reduce((s, p) => s + p.netChange, 0);
    expect(totalFromSeries).toBe(50);
    for (const p of series) {
      expect(typeof p.dayStartMs).toBe('number');
      expect(typeof p.netChange).toBe('number');
    }
  });

  it('returns empty array when no rounds', async () => {
    const s = await getNetFlowSeries();
    expect(s).toEqual([]);
  });
});

describe('queries.getGameDistribution', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('counts rounds per game', async () => {
    await seedTwoUsersWithRounds();
    const d = await getGameDistribution();
    expect(d.find((g) => g.game === 'blackjack')?.rounds).toBe(3);
    expect(d.find((g) => g.game === 'roulette')?.rounds).toBe(1);
    expect(d.find((g) => g.game === 'slots')?.rounds).toBe(1);
  });
});

describe('queries.getTopWinners / getTopLosers', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('top winners is sorted descending by netChange', async () => {
    await seedTwoUsersWithRounds();
    const w = await getTopWinners(5);
    expect(w[0]!.username).toBe('alice');
    expect(w[0]!.totalNetChange).toBe(200);
  });

  it('top losers is sorted ascending (most negative first)', async () => {
    await seedTwoUsersWithRounds();
    const l = await getTopLosers(5);
    expect(l[0]!.username).toBe('bob');
    expect(l[0]!.totalNetChange).toBe(-150);
  });
});

describe('getUserMetrics — core', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('returns EMPTY_METRICS for a user with no rounds', async () => {
    const r = await register({ username: 'alice', password: 'password123' });
    if (!r.ok) throw new Error();
    const m = await getUserMetrics(r.user.id);
    expect(m).toEqual({
      totalRounds: 0,
      totalWagered: 0,
      totalWon: 0,
      totalLost: 0,
      netChange: 0,
      rtp: null,
      timePlayedMs: 0,
    });
  });

  it('aggregates wagered / won / lost / net across all rounds', async () => {
    const r = await register({ username: 'bob', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.rounds.bulkAdd([
      {
        id: 'r-1',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 100,
        payout: 200,
        netChange: 100,
        outcome: 'win',
        details: {},
        balanceAfter: 1100,
        playedAt: 1000,
      },
      {
        id: 'r-2',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 50,
        payout: 0,
        netChange: -50,
        outcome: 'loss',
        details: {},
        balanceAfter: 1050,
        playedAt: 2000,
      },
    ]);
    const m = await getUserMetrics(r.user.id);
    expect(m.totalRounds).toBe(2);
    expect(m.totalWagered).toBe(150);
    expect(m.totalWon).toBe(200);
    expect(m.totalLost).toBe(50);
    expect(m.netChange).toBe(50);
    expect(m.rtp).toBeCloseTo(133.33, 1);
  });

  it('RTP is null when wagered is 0', async () => {
    const r = await register({ username: 'carol', password: 'password123' });
    if (!r.ok) throw new Error();
    const m = await getUserMetrics(r.user.id);
    expect(m.rtp).toBeNull();
  });

  it('game-scoped query filters to that game only', async () => {
    const r = await register({ username: 'dave', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.rounds.bulkAdd([
      {
        id: 'b-1',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 100,
        payout: 200,
        netChange: 100,
        outcome: 'win',
        details: {},
        balanceAfter: 1100,
        playedAt: 1000,
      },
      {
        id: 's-1',
        userId: r.user.id,
        game: 'slots',
        betAmount: 50,
        payout: 0,
        netChange: -50,
        outcome: 'loss',
        details: {},
        balanceAfter: 1050,
        playedAt: 2000,
      },
    ]);
    const m = await getUserMetrics(r.user.id, 'blackjack');
    expect(m.totalRounds).toBe(1);
    expect(m.netChange).toBe(100);
  });

  it('timePlayedMs sums gameVisits.durationMs (game-scoped if provided)', async () => {
    const r = await register({ username: 'eve', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.gameVisits.bulkAdd([
      {
        id: 'v-1',
        userId: r.user.id,
        sessionId: 's-1',
        game: 'blackjack',
        enteredAt: 1000,
        exitedAt: 4000,
        durationMs: 3000,
      },
      {
        id: 'v-2',
        userId: r.user.id,
        sessionId: 's-1',
        game: 'roulette',
        enteredAt: 5000,
        exitedAt: 12000,
        durationMs: 7000,
      },
    ]);
    expect((await getUserMetrics(r.user.id)).timePlayedMs).toBe(10000);
    expect((await getUserMetrics(r.user.id, 'blackjack')).timePlayedMs).toBe(3000);
  });
});

describe('getUserStreaks', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  async function userWithRounds(outcomes: Array<'win' | 'loss' | 'push'>): Promise<string> {
    const r = await register({ username: 'streak', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.rounds.bulkAdd(
      outcomes.map((o, i) => ({
        id: `r-${i}`,
        userId: r.user.id,
        game: 'blackjack' as const,
        betAmount: 10,
        payout: o === 'win' ? 20 : o === 'push' ? 10 : 0,
        netChange: o === 'win' ? 10 : o === 'push' ? 0 : -10,
        outcome: o,
        details: {},
        balanceAfter: 1000,
        playedAt: i * 1000 + 1000,
      })),
    );
    return r.user.id;
  }

  it('empty rounds → 0/0', async () => {
    const r = await register({ username: 'empty', password: 'password123' });
    if (!r.ok) throw new Error();
    expect(await getUserStreaks(r.user.id)).toEqual({ longestWin: 0, longestLoss: 0 });
  });

  it('all wins → win streak = count, loss streak = 0', async () => {
    const uid = await userWithRounds(['win', 'win', 'win', 'win']);
    expect(await getUserStreaks(uid)).toEqual({ longestWin: 4, longestLoss: 0 });
  });

  it('all losses → loss streak = count, win streak = 0', async () => {
    const uid = await userWithRounds(['loss', 'loss', 'loss']);
    expect(await getUserStreaks(uid)).toEqual({ longestWin: 0, longestLoss: 3 });
  });

  it('alternating wins/losses → streaks of 1 each', async () => {
    const uid = await userWithRounds(['win', 'loss', 'win', 'loss', 'win']);
    expect(await getUserStreaks(uid)).toEqual({ longestWin: 1, longestLoss: 1 });
  });

  it('multiple win runs → longest reported', async () => {
    const uid = await userWithRounds(['win', 'win', 'loss', 'win', 'win', 'win', 'loss']);
    expect(await getUserStreaks(uid)).toEqual({ longestWin: 3, longestLoss: 1 });
  });

  it('pushes break NEITHER streak (continue, do not reset)', async () => {
    const uid = await userWithRounds(['win', 'push', 'win']);
    // Expected: pushes don't increment win-count, but also don't reset it.
    // Spec §5.2: "pushes break neither streak"
    // Implementation: push is neutral — neither incremented nor reset.
    // So the 'win' counter stays at 1 after push, then 'win' bumps to 2.
    expect(await getUserStreaks(uid)).toEqual({ longestWin: 2, longestLoss: 0 });
  });

  it('game-scoped streak is independent of other games', async () => {
    const r = await register({ username: 'cross', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.rounds.bulkAdd([
      {
        id: 'b-1',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 10,
        payout: 20,
        netChange: 10,
        outcome: 'win',
        details: {},
        balanceAfter: 1010,
        playedAt: 1000,
      },
      {
        id: 's-1',
        userId: r.user.id,
        game: 'slots',
        betAmount: 10,
        payout: 0,
        netChange: -10,
        outcome: 'loss',
        details: {},
        balanceAfter: 1000,
        playedAt: 2000,
      },
      {
        id: 'b-2',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 10,
        payout: 20,
        netChange: 10,
        outcome: 'win',
        details: {},
        balanceAfter: 1010,
        playedAt: 3000,
      },
    ]);
    const bj = await getUserStreaks(r.user.id, 'blackjack');
    expect(bj).toEqual({ longestWin: 2, longestLoss: 0 });
    const slots = await getUserStreaks(r.user.id, 'slots');
    expect(slots).toEqual({ longestWin: 0, longestLoss: 1 });
  });
});

describe('getUserPeaks', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('no rounds → all 0 / starting balance', async () => {
    const r = await register({ username: 'empty', password: 'password123' });
    if (!r.ok) throw new Error();
    expect(await getUserPeaks(r.user.id)).toEqual({
      biggestWin: 0,
      biggestWinAt: null,
      biggestLoss: 0,
      biggestLossAt: null,
      highestBalance: WALLET_CONFIG.STARTING_CHIPS,
    });
  });

  it('biggest win + loss captured with timestamps', async () => {
    const r = await register({ username: 'peaks', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.rounds.bulkAdd([
      {
        id: 'r-1',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 100,
        payout: 200,
        netChange: 100,
        outcome: 'win',
        details: {},
        balanceAfter: 1100,
        playedAt: 1000,
      },
      {
        id: 'r-2',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 500,
        payout: 0,
        netChange: -500,
        outcome: 'loss',
        details: {},
        balanceAfter: 600,
        playedAt: 2000,
      },
      {
        id: 'r-3',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 100,
        payout: 400,
        netChange: 300,
        outcome: 'win',
        details: {},
        balanceAfter: 900,
        playedAt: 3000,
      },
    ]);
    const p = await getUserPeaks(r.user.id);
    expect(p.biggestWin).toBe(300);
    expect(p.biggestWinAt).toBe(3000);
    expect(p.biggestLoss).toBe(500);
    expect(p.biggestLossAt).toBe(2000);
    expect(p.highestBalance).toBe(1100);
  });

  it('highest balance never goes below starting chips', async () => {
    const r = await register({ username: 'down', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.rounds.add({
      id: 'r-1',
      userId: r.user.id,
      game: 'blackjack',
      betAmount: 100,
      payout: 0,
      netChange: -100,
      outcome: 'loss',
      details: {},
      balanceAfter: 900,
      playedAt: 1000,
    });
    const p = await getUserPeaks(r.user.id);
    expect(p.highestBalance).toBe(WALLET_CONFIG.STARTING_CHIPS);
  });

  it('ties on biggest win: first-encountered wins (oldest)', async () => {
    const r = await register({ username: 'tie', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.rounds.bulkAdd([
      {
        id: 'r-1',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 100,
        payout: 200,
        netChange: 100,
        outcome: 'win',
        details: {},
        balanceAfter: 1100,
        playedAt: 1000,
      },
      {
        id: 'r-2',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 100,
        payout: 200,
        netChange: 100,
        outcome: 'win',
        details: {},
        balanceAfter: 1200,
        playedAt: 2000,
      },
    ]);
    const p = await getUserPeaks(r.user.id);
    expect(p.biggestWin).toBe(100);
    expect(p.biggestWinAt).toBe(1000); // older wins ties
  });
});

describe('getUserSessionStats', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('returns zeros when there are no sessions OR no rounds', async () => {
    const r = await register({ username: 'a', password: 'password123' });
    if (!r.ok) throw new Error();
    expect(await getUserSessionStats(r.user.id)).toEqual({ best: 0, worst: 0, count: 0 });
  });

  it('groups rounds by session window and returns best/worst sums', async () => {
    const r = await register({ username: 'b', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.sessions.bulkAdd([
      { id: 's-1', userId: r.user.id, loginAt: 1000, logoutAt: 5000, durationMs: 4000 },
      { id: 's-2', userId: r.user.id, loginAt: 10000, logoutAt: 20000, durationMs: 10000 },
    ]);
    await db.rounds.bulkAdd([
      // Session 1: net +30
      {
        id: 'r-1',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 10,
        payout: 30,
        netChange: 20,
        outcome: 'win',
        details: {},
        balanceAfter: 1020,
        playedAt: 1500,
      },
      {
        id: 'r-2',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 10,
        payout: 20,
        netChange: 10,
        outcome: 'win',
        details: {},
        balanceAfter: 1030,
        playedAt: 2500,
      },
      // Session 2: net -50
      {
        id: 'r-3',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 50,
        payout: 0,
        netChange: -50,
        outcome: 'loss',
        details: {},
        balanceAfter: 980,
        playedAt: 12000,
      },
    ]);
    const s = await getUserSessionStats(r.user.id);
    expect(s.best).toBe(30);
    expect(s.worst).toBe(-50);
    expect(s.count).toBe(2);
  });

  it('open (logoutAt=null) sessions are treated as running to infinity', async () => {
    const r = await register({ username: 'open', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.sessions.add({
      id: 's-1',
      userId: r.user.id,
      loginAt: 1000,
      logoutAt: null,
      durationMs: null,
    });
    await db.rounds.add({
      id: 'r-1',
      userId: r.user.id,
      game: 'blackjack',
      betAmount: 100,
      payout: 200,
      netChange: 100,
      outcome: 'win',
      details: {},
      balanceAfter: 1100,
      playedAt: 9_999_999_999,
    });
    expect((await getUserSessionStats(r.user.id)).count).toBe(1);
  });
});

describe('getUserExtras', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('returns 0/null for no rounds', async () => {
    const r = await register({ username: 'a', password: 'password123' });
    if (!r.ok) throw new Error();
    expect(await getUserExtras(r.user.id)).toEqual({ avgBetSize: 0, winRate: null });
  });

  it('avgBetSize = mean bet, rounded', async () => {
    const r = await register({ username: 'b', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.rounds.bulkAdd([
      {
        id: 'r-1',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 10,
        payout: 0,
        netChange: -10,
        outcome: 'loss',
        details: {},
        balanceAfter: 990,
        playedAt: 1000,
      },
      {
        id: 'r-2',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 25,
        payout: 50,
        netChange: 25,
        outcome: 'win',
        details: {},
        balanceAfter: 1015,
        playedAt: 2000,
      },
    ]);
    expect((await getUserExtras(r.user.id)).avgBetSize).toBe(18); // round((10+25)/2)=18
  });

  it('winRate excludes pushes from denominator', async () => {
    const r = await register({ username: 'wr', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.rounds.bulkAdd([
      {
        id: 'r-1',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 10,
        payout: 20,
        netChange: 10,
        outcome: 'win',
        details: {},
        balanceAfter: 1010,
        playedAt: 1000,
      },
      {
        id: 'r-2',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 10,
        payout: 10,
        netChange: 0,
        outcome: 'push',
        details: {},
        balanceAfter: 1010,
        playedAt: 2000,
      },
      {
        id: 'r-3',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 10,
        payout: 0,
        netChange: -10,
        outcome: 'loss',
        details: {},
        balanceAfter: 1000,
        playedAt: 3000,
      },
    ]);
    // 1 win / (1 win + 1 loss) = 50%
    expect((await getUserExtras(r.user.id)).winRate).toBeCloseTo(50, 1);
  });

  it('winRate is null when there are no non-push rounds', async () => {
    const r = await register({ username: 'only-pushes', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.rounds.add({
      id: 'r-1',
      userId: r.user.id,
      game: 'blackjack',
      betAmount: 10,
      payout: 10,
      netChange: 0,
      outcome: 'push',
      details: {},
      balanceAfter: 1000,
      playedAt: 1000,
    });
    expect((await getUserExtras(r.user.id)).winRate).toBeNull();
  });
});

describe('getUserWinLossTimeline', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('returns newest-first up to limit', async () => {
    const r = await register({ username: 't', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.rounds.bulkAdd(
      Array.from({ length: 10 }, (_, i) => ({
        id: `r-${i}`,
        userId: r.user.id,
        game: 'blackjack' as const,
        betAmount: 10,
        payout: 0,
        netChange: -10,
        outcome: 'loss' as const,
        details: {},
        balanceAfter: 1000 - 10 * (i + 1),
        playedAt: (i + 1) * 1000,
      })),
    );
    const tl = await getUserWinLossTimeline(r.user.id, undefined, 5);
    expect(tl).toHaveLength(5);
    expect(tl[0]!.playedAt).toBe(10000); // newest first
  });
});

describe('getUserBetSizeHistogram', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('empty rounds → empty array', async () => {
    const r = await register({ username: 'h', password: 'password123' });
    if (!r.ok) throw new Error();
    expect(await getUserBetSizeHistogram(r.user.id)).toEqual([]);
  });

  it('all bets equal → single bin with full count', async () => {
    const r = await register({ username: 'h', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.rounds.bulkAdd(
      Array.from({ length: 3 }, (_, i) => ({
        id: `r-${i}`,
        userId: r.user.id,
        game: 'blackjack' as const,
        betAmount: 50,
        payout: 0,
        netChange: -50,
        outcome: 'loss' as const,
        details: {},
        balanceAfter: 1000 - 50 * (i + 1),
        playedAt: (i + 1) * 1000,
      })),
    );
    const h = await getUserBetSizeHistogram(r.user.id);
    expect(h).toHaveLength(1);
    expect(h[0]!.count).toBe(3);
    expect(h[0]!.binMin).toBe(50);
  });

  it('5 bins span min→max with counts summing to total rounds', async () => {
    const r = await register({ username: 'h2', password: 'password123' });
    if (!r.ok) throw new Error();
    const bets = [5, 10, 25, 50, 100];
    await db.rounds.bulkAdd(
      bets.map((b, i) => ({
        id: `r-${i}`,
        userId: r.user.id,
        game: 'blackjack' as const,
        betAmount: b,
        payout: 0,
        netChange: -b,
        outcome: 'loss' as const,
        details: {},
        balanceAfter: 0,
        playedAt: (i + 1) * 1000,
      })),
    );
    const h = await getUserBetSizeHistogram(r.user.id);
    expect(h).toHaveLength(5);
    expect(h.reduce((s, b) => s + b.count, 0)).toBe(5);
  });
});

describe('getLeaderboard', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  async function seedTwoPlayersOneBanned() {
    const a = await register({ username: 'alice', password: 'password123' });
    const b = await register({ username: 'bob', password: 'password123' });
    const c = await register({ username: 'cheater', password: 'password123' });
    if (!a.ok || !b.ok || !c.ok) throw new Error();
    await db.users.update(c.user.id, { isBanned: true });
    await db.rounds.bulkAdd([
      {
        id: 'a-1',
        userId: a.user.id,
        game: 'blackjack',
        betAmount: 100,
        payout: 300,
        netChange: 200,
        outcome: 'win',
        details: {},
        balanceAfter: 1200,
        playedAt: 1000,
      },
      {
        id: 'b-1',
        userId: b.user.id,
        game: 'blackjack',
        betAmount: 100,
        payout: 200,
        netChange: 100,
        outcome: 'win',
        details: {},
        balanceAfter: 1100,
        playedAt: 2000,
      },
      {
        id: 'c-1',
        userId: c.user.id,
        game: 'blackjack',
        betAmount: 100,
        payout: 1000,
        netChange: 900,
        outcome: 'win',
        details: {},
        balanceAfter: 1900,
        playedAt: 3000,
      },
    ]);
    return { aliceId: a.user.id, bobId: b.user.id, cheaterId: c.user.id };
  }

  it('netWinner sorts descending and assigns rank', async () => {
    const { aliceId, bobId } = await seedTwoPlayersOneBanned();
    const lb = await getLeaderboard('netWinner');
    expect(lb).toHaveLength(2); // cheater excluded
    expect(lb[0]!.userId).toBe(aliceId);
    expect(lb[0]!.rank).toBe(1);
    expect(lb[0]!.value).toBe(200);
    expect(lb[1]!.userId).toBe(bobId);
  });

  it('banned users excluded across all metrics', async () => {
    const { cheaterId } = await seedTwoPlayersOneBanned();
    for (const m of ['netWinner', 'mostRounds', 'biggestSingleWin'] as const) {
      const lb = await getLeaderboard(m);
      expect(lb.map((r) => r.userId)).not.toContain(cheaterId);
    }
  });

  it('per-game leaderboard scopes to that game only', async () => {
    const a = await register({ username: 'a', password: 'password123' });
    if (!a.ok) throw new Error();
    await db.rounds.bulkAdd([
      {
        id: 'b-1',
        userId: a.user.id,
        game: 'blackjack',
        betAmount: 100,
        payout: 200,
        netChange: 100,
        outcome: 'win',
        details: {},
        balanceAfter: 1100,
        playedAt: 1000,
      },
      {
        id: 's-1',
        userId: a.user.id,
        game: 'slots',
        betAmount: 50,
        payout: 100,
        netChange: 50,
        outcome: 'win',
        details: {},
        balanceAfter: 1150,
        playedAt: 2000,
      },
    ]);
    const bj = await getLeaderboard('netWinner', 'blackjack');
    expect(bj[0]!.value).toBe(100);
    const slots = await getLeaderboard('netWinner', 'slots');
    expect(slots[0]!.value).toBe(50);
  });

  it('mostVariety counts distinct games and includes users with 0 in current scope', async () => {
    const a = await register({ username: 'variety', password: 'password123' });
    if (!a.ok) throw new Error();
    await db.rounds.bulkAdd([
      {
        id: 'b-1',
        userId: a.user.id,
        game: 'blackjack',
        betAmount: 1,
        payout: 0,
        netChange: -1,
        outcome: 'loss',
        details: {},
        balanceAfter: 999,
        playedAt: 1000,
      },
      {
        id: 's-1',
        userId: a.user.id,
        game: 'slots',
        betAmount: 1,
        payout: 0,
        netChange: -1,
        outcome: 'loss',
        details: {},
        balanceAfter: 998,
        playedAt: 2000,
      },
    ]);
    const lb = await getLeaderboard('mostVariety');
    expect(lb[0]!.value).toBe(2);
  });

  it('tiebreaker on equal values: older user (smaller createdAt) wins', async () => {
    const older = await register({ username: 'older', password: 'password123' });
    if (!older.ok) throw new Error();
    const newer = await register({ username: 'newer', password: 'password123' });
    if (!newer.ok) throw new Error();
    await db.users.update(older.user.id, { createdAt: 100 });
    await db.users.update(newer.user.id, { createdAt: 200 });
    await db.rounds.bulkAdd([
      {
        id: 'o-1',
        userId: older.user.id,
        game: 'blackjack',
        betAmount: 100,
        payout: 200,
        netChange: 100,
        outcome: 'win',
        details: {},
        balanceAfter: 1100,
        playedAt: 1000,
      },
      {
        id: 'n-1',
        userId: newer.user.id,
        game: 'blackjack',
        betAmount: 100,
        payout: 200,
        netChange: 100,
        outcome: 'win',
        details: {},
        balanceAfter: 1100,
        playedAt: 2000,
      },
    ]);
    const lb = await getLeaderboard('netWinner');
    expect(lb[0]!.userId).toBe(older.user.id);
  });
});

describe('getUserWinRateByGame', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('returns empty for a user with no rounds', async () => {
    const r = await register({ username: 'wr1', password: 'password123' });
    if (!r.ok) throw new Error();
    expect(await getUserWinRateByGame(r.user.id)).toEqual([]);
  });

  it('computes win rate per game and sorts desc', async () => {
    const r = await register({ username: 'wr2', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.rounds.bulkAdd([
      // blackjack: 2 wins / 4 non-push = 50%
      {
        id: 'b-1',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 10,
        payout: 20,
        netChange: 10,
        outcome: 'win',
        details: {},
        balanceAfter: 1010,
        playedAt: 1000,
      },
      {
        id: 'b-2',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 10,
        payout: 20,
        netChange: 10,
        outcome: 'win',
        details: {},
        balanceAfter: 1020,
        playedAt: 2000,
      },
      {
        id: 'b-3',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 10,
        payout: 0,
        netChange: -10,
        outcome: 'loss',
        details: {},
        balanceAfter: 1010,
        playedAt: 3000,
      },
      {
        id: 'b-4',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 10,
        payout: 0,
        netChange: -10,
        outcome: 'loss',
        details: {},
        balanceAfter: 1000,
        playedAt: 4000,
      },
      // slots: 0 wins / 1 non-push = 0%
      {
        id: 's-1',
        userId: r.user.id,
        game: 'slots',
        betAmount: 10,
        payout: 0,
        netChange: -10,
        outcome: 'loss',
        details: {},
        balanceAfter: 990,
        playedAt: 5000,
      },
    ]);
    const result = await getUserWinRateByGame(r.user.id);
    expect(result).toHaveLength(2);
    expect(result[0]!.game).toBe('blackjack');
    expect(result[0]!.winRate).toBeCloseTo(50, 1);
    expect(result[1]!.game).toBe('slots');
    expect(result[1]!.winRate).toBe(0);
  });

  it('excludes pushes from denominator', async () => {
    const r = await register({ username: 'wr3', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.rounds.bulkAdd([
      {
        id: 'b-1',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 10,
        payout: 20,
        netChange: 10,
        outcome: 'win',
        details: {},
        balanceAfter: 1010,
        playedAt: 1000,
      },
      {
        id: 'b-2',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 10,
        payout: 10,
        netChange: 0,
        outcome: 'push',
        details: {},
        balanceAfter: 1010,
        playedAt: 2000,
      },
    ]);
    const result = await getUserWinRateByGame(r.user.id);
    expect(result[0]!.winRate).toBe(100); // 1 win / 1 non-push
  });
});

// ─── Phase 15 #6 — Roulette all-time admin stats ────────────────────────

import { columnOf, dozenOf, getRouletteAllTimeStats, getRouletteNumberDistribution } from './stats';
import type { RouletteRoundDetails, PocketColor } from '@/games/roulette/types';

const RED_NUMBERS = new Set<number>([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

function colorFor(n: number): PocketColor {
  if (n === 0) return 'green';
  return RED_NUMBERS.has(n) ? 'red' : 'black';
}

function rouletteRow(opts: {
  id: string;
  userId: string;
  number: number;
  betAmount: number;
  payout: number;
  playedAt: number;
}): {
  id: string;
  userId: string;
  game: 'roulette';
  betAmount: number;
  payout: number;
  netChange: number;
  outcome: 'win' | 'loss' | 'push';
  details: RouletteRoundDetails;
  balanceAfter: number;
  playedAt: number;
} {
  const netChange = opts.payout - opts.betAmount;
  const outcome: 'win' | 'loss' | 'push' = netChange > 0 ? 'win' : netChange < 0 ? 'loss' : 'push';
  const color = colorFor(opts.number);
  const details: RouletteRoundDetails = {
    spin: { number: opts.number, color, pocketIndex: 0 },
    bets: [],
  };
  return {
    id: opts.id,
    userId: opts.userId,
    game: 'roulette',
    betAmount: opts.betAmount,
    payout: opts.payout,
    netChange,
    outcome,
    details,
    balanceAfter: 1000,
    playedAt: opts.playedAt,
  };
}

/** Seeds 20 roulette rows covering every colour, parity, dozen, column,
 *  and the zero. Returns the expected aggregation summary. */
async function seedRouletteRows() {
  await resetDb();
  // Numbers chosen to hit each bucket at least once:
  //   0           — green / no-parity / no-dozen / no-column
  //   1,2,3       — dozen-1 / cols 1,2,3   (odd, even, odd)
  //   4,6         — dozen-1 (col 1, col 3) — even, even
  //   12          — dozen-1 edge (col 3)   — even
  //   13,14,15    — dozen-2 / cols 1,2,3   (odd, even, odd)
  //   18          — low edge (dozen-2, col 3) — even
  //   19          — high edge (dozen-2, col 1) — odd
  //   24          — dozen-2 edge (col 3) — even
  //   25,26,27    — dozen-3 / cols 1,2,3   (odd, even, odd)
  //   34,35,36    — dozen-3 / cols 1,2,3   (even, even, even)
  // 20 rows total.
  const numbers = [0, 1, 2, 3, 4, 6, 12, 13, 14, 15, 18, 19, 24, 25, 26, 27, 34, 35, 36, 1];
  // Stake 10 each; payout pattern alternates win/loss for cumulative house net = 0:
  //   even-index rows: payout 0 (house +10), odd-index rows: payout 20 (house -10)
  const rows = numbers.map((n, i) =>
    rouletteRow({
      id: `roul-${i}`,
      userId: 'u-1',
      number: n,
      betAmount: 10,
      payout: i % 2 === 0 ? 0 : 20,
      playedAt: 1_000_000 + i,
    }),
  );
  await db.rounds.bulkAdd(rows);
  return numbers;
}

describe('roulette aggregations — column/dozen helpers', () => {
  it('columnOf maps zero to 0 and the three columns correctly', () => {
    expect(columnOf(0)).toBe(0);
    expect(columnOf(1)).toBe(1);
    expect(columnOf(2)).toBe(2);
    expect(columnOf(3)).toBe(3);
    expect(columnOf(34)).toBe(1);
    expect(columnOf(35)).toBe(2);
    expect(columnOf(36)).toBe(3);
  });

  it('dozenOf maps zero to 0 and the three dozens correctly', () => {
    expect(dozenOf(0)).toBe(0);
    expect(dozenOf(1)).toBe(1);
    expect(dozenOf(12)).toBe(1);
    expect(dozenOf(13)).toBe(2);
    expect(dozenOf(24)).toBe(2);
    expect(dozenOf(25)).toBe(3);
    expect(dozenOf(36)).toBe(3);
  });
});

describe('queries.getRouletteAllTimeStats', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('returns zeros when no roulette rounds exist', async () => {
    const s = await getRouletteAllTimeStats();
    expect(s).toEqual({
      ballsSpun: 0,
      netHouseChips: 0,
      netPlayerChips: 0,
      redCount: 0,
      blackCount: 0,
      greenCount: 0,
      oddCount: 0,
      evenCount: 0,
      lowCount: 0,
      highCount: 0,
      dozenCounts: [0, 0, 0],
      columnCounts: [0, 0, 0],
    });
  });

  it('ignores rounds from other games', async () => {
    await db.rounds.add({
      id: 'bj-1',
      userId: 'u-1',
      game: 'blackjack',
      betAmount: 100,
      payout: 0,
      netChange: -100,
      outcome: 'loss',
      details: {},
      balanceAfter: 900,
      playedAt: 1_000,
    });
    const s = await getRouletteAllTimeStats();
    expect(s.ballsSpun).toBe(0);
    expect(s.netHouseChips).toBe(0);
  });

  it('aggregates all colours, parities, dozens, columns, and the zero from 20 fixture rows', async () => {
    const numbers = await seedRouletteRows();
    const s = await getRouletteAllTimeStats();

    expect(s.ballsSpun).toBe(20);
    // Even-index rows (10 rows) win 0 → house +10 each = +100; odd-index rows
    // (10 rows) win 20 → house -10 each = -100. Net = 0.
    expect(s.netHouseChips).toBe(0);
    expect(s.netPlayerChips).toBe(0);

    const greens = numbers.filter((n) => n === 0).length;
    const reds = numbers.filter((n) => n !== 0 && RED_NUMBERS.has(n)).length;
    const blacks = numbers.filter((n) => n !== 0 && !RED_NUMBERS.has(n)).length;
    expect(s.greenCount).toBe(greens);
    expect(s.redCount).toBe(reds);
    expect(s.blackCount).toBe(blacks);
    expect(s.greenCount + s.redCount + s.blackCount).toBe(20);

    const odd = numbers.filter((n) => n !== 0 && n % 2 === 1).length;
    const even = numbers.filter((n) => n !== 0 && n % 2 === 0).length;
    expect(s.oddCount).toBe(odd);
    expect(s.evenCount).toBe(even);

    const low = numbers.filter((n) => n >= 1 && n <= 18).length;
    const high = numbers.filter((n) => n >= 19 && n <= 36).length;
    expect(s.lowCount).toBe(low);
    expect(s.highCount).toBe(high);

    const d1 = numbers.filter((n) => n >= 1 && n <= 12).length;
    const d2 = numbers.filter((n) => n >= 13 && n <= 24).length;
    const d3 = numbers.filter((n) => n >= 25 && n <= 36).length;
    expect(s.dozenCounts).toEqual([d1, d2, d3]);

    const c1 = numbers.filter((n) => n !== 0 && n % 3 === 1).length;
    const c2 = numbers.filter((n) => n !== 0 && n % 3 === 2).length;
    const c3 = numbers.filter((n) => n !== 0 && n % 3 === 0).length;
    expect(s.columnCounts).toEqual([c1, c2, c3]);

    // Sanity: dozens sum to the non-zero count.
    expect(s.dozenCounts[0] + s.dozenCounts[1] + s.dozenCounts[2]).toBe(20 - greens);
    expect(s.columnCounts[0] + s.columnCounts[1] + s.columnCounts[2]).toBe(20 - greens);
  });

  it('treats net house chips as positive when the house wins more than it pays', async () => {
    await db.rounds.bulkAdd([
      rouletteRow({ id: 'r-1', userId: 'u-1', number: 7, betAmount: 100, payout: 0, playedAt: 1 }),
      rouletteRow({ id: 'r-2', userId: 'u-1', number: 7, betAmount: 100, payout: 0, playedAt: 2 }),
    ]);
    const s = await getRouletteAllTimeStats();
    expect(s.netHouseChips).toBe(200);
    expect(s.netPlayerChips).toBe(-200);
  });

  it('treats net house chips as negative when the house pays more than it takes', async () => {
    await db.rounds.bulkAdd([
      rouletteRow({
        id: 'r-1',
        userId: 'u-1',
        number: 7,
        betAmount: 10,
        payout: 360,
        playedAt: 1,
      }),
    ]);
    const s = await getRouletteAllTimeStats();
    expect(s.netHouseChips).toBe(-350);
    expect(s.netPlayerChips).toBe(350);
  });
});

describe('queries.getRouletteNumberDistribution', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('returns 37 entries with the right colour mapping when no data', async () => {
    const dist = await getRouletteNumberDistribution();
    expect(dist).toHaveLength(37);
    expect(dist[0]).toEqual({ number: 0, count: 0, color: 'green' });
    expect(dist[1]).toEqual({ number: 1, count: 0, color: 'red' });
    expect(dist[2]).toEqual({ number: 2, count: 0, color: 'black' });
    expect(dist[36]).toEqual({ number: 36, count: 0, color: 'red' });
    expect(dist.every((p, i) => p.number === i)).toBe(true);
  });

  it('counts hits per pocket across the fixture', async () => {
    await seedRouletteRows();
    const dist = await getRouletteNumberDistribution();
    expect(dist).toHaveLength(37);
    // 1 appears twice in the fixture (first and last), others appear once.
    expect(dist[1]!.count).toBe(2);
    expect(dist[0]!.count).toBe(1);
    expect(dist[36]!.count).toBe(1);
    // Numbers not in the fixture remain zero.
    expect(dist[5]!.count).toBe(0);
    // Totals across all pockets equal ballsSpun.
    const total = dist.reduce((s, p) => s + p.count, 0);
    expect(total).toBe(20);
  });

  it('ignores rounds without spin details', async () => {
    await db.rounds.add({
      id: 'bad-row',
      userId: 'u-1',
      game: 'roulette',
      betAmount: 10,
      payout: 0,
      netChange: -10,
      outcome: 'loss',
      // Intentionally missing spin field — exercise the `if (!d?.spin) continue` guard.
      details: {},
      balanceAfter: 990,
      playedAt: 1,
    });
    const dist = await getRouletteNumberDistribution();
    expect(dist.reduce((s, p) => s + p.count, 0)).toBe(0);
  });
});

// ─── Phase 15 #7 — Slots all-time admin stats ────────────────────────

import {
  getSlotsAllTimeStats,
  getSlotsCombinationDistribution,
  getSlotsSymbolDistribution,
} from './stats';
import type {
  PayoutHit,
  SlotsRoundDetails,
  SpinResult,
  Symbol as SlotsSymbol,
  WinTier,
} from '@/games/slots/types';

function slotsDetails(
  reels: readonly [SlotsSymbol, SlotsSymbol, SlotsSymbol],
  payout: PayoutHit | null,
  bet: number,
  winTier: WinTier,
): SlotsRoundDetails {
  const spin: SpinResult = { reels };
  return {
    spin,
    payout,
    bet,
    winTier,
    config: {
      weights: { cherry: 4, lemon: 5, bell: 3, bar: 2, seven: 1 },
      minBet: 5,
      maxBet: 1_000,
    },
  };
}

function slotsRow(opts: {
  id: string;
  reels: readonly [SlotsSymbol, SlotsSymbol, SlotsSymbol];
  payout: PayoutHit | null;
  betAmount: number;
  payoutChips: number;
  winTier: WinTier;
  playedAt: number;
}) {
  const netChange = opts.payoutChips - opts.betAmount;
  const outcome: 'win' | 'loss' | 'push' = netChange > 0 ? 'win' : netChange < 0 ? 'loss' : 'push';
  return {
    id: opts.id,
    userId: 'u-1',
    game: 'slots' as const,
    betAmount: opts.betAmount,
    payout: opts.payoutChips,
    netChange,
    outcome,
    details: slotsDetails(opts.reels, opts.payout, opts.betAmount, opts.winTier),
    balanceAfter: 1000,
    playedAt: opts.playedAt,
  };
}

/** Seed 18 slot rows covering every win tier + every paytable combo + every
 *  symbol on every reel. Returns a tally used by the assertions. */
async function seedSlotsRows() {
  await resetDb();
  const rows = [
    // Losing spins (winTier 'none') — symbol coverage on each reel.
    slotsRow({
      id: 's-loss-1',
      reels: ['cherry', 'lemon', 'bell'],
      payout: null,
      betAmount: 10,
      payoutChips: 0,
      winTier: 'none',
      playedAt: 1,
    }),
    slotsRow({
      id: 's-loss-2',
      reels: ['lemon', 'bar', 'seven'],
      payout: null,
      betAmount: 10,
      payoutChips: 0,
      winTier: 'none',
      playedAt: 2,
    }),
    slotsRow({
      id: 's-loss-3',
      reels: ['bar', 'seven', 'cherry'],
      payout: null,
      betAmount: 10,
      payoutChips: 0,
      winTier: 'none',
      playedAt: 3,
    }),
    slotsRow({
      id: 's-loss-4',
      reels: ['bell', 'cherry', 'lemon'],
      payout: null,
      betAmount: 10,
      payoutChips: 0,
      winTier: 'none',
      playedAt: 4,
    }),
    slotsRow({
      id: 's-loss-5',
      reels: ['seven', 'bell', 'bar'],
      payout: null,
      betAmount: 10,
      payoutChips: 0,
      winTier: 'none',
      playedAt: 5,
    }),
    // Small win: 2× cherry (multiple 2).
    slotsRow({
      id: 's-2c-1',
      reels: ['cherry', 'lemon', 'cherry'],
      payout: { key: 'two-cherry', multiple: 2, winningReelIndices: [0, 2] },
      betAmount: 10,
      payoutChips: 20,
      winTier: 'small',
      playedAt: 6,
    }),
    slotsRow({
      id: 's-2c-2',
      reels: ['cherry', 'bar', 'cherry'],
      payout: { key: 'two-cherry', multiple: 2, winningReelIndices: [0, 2] },
      betAmount: 10,
      payoutChips: 20,
      winTier: 'small',
      playedAt: 7,
    }),
    // Medium win: 3× cherry (multiple 5).
    slotsRow({
      id: 's-3c',
      reels: ['cherry', 'cherry', 'cherry'],
      payout: { key: 'cherry-cherry-cherry', multiple: 5, winningReelIndices: [0, 1, 2] },
      betAmount: 10,
      payoutChips: 50,
      winTier: 'medium',
      playedAt: 8,
    }),
    // Medium win: 3× lemon (multiple 8).
    slotsRow({
      id: 's-3l',
      reels: ['lemon', 'lemon', 'lemon'],
      payout: { key: 'lemon-lemon-lemon', multiple: 8, winningReelIndices: [0, 1, 2] },
      betAmount: 10,
      payoutChips: 80,
      winTier: 'medium',
      playedAt: 9,
    }),
    // Medium win: 3× bell (multiple 12).
    slotsRow({
      id: 's-3bl',
      reels: ['bell', 'bell', 'bell'],
      payout: { key: 'bell-bell-bell', multiple: 12, winningReelIndices: [0, 1, 2] },
      betAmount: 10,
      payoutChips: 120,
      winTier: 'medium',
      playedAt: 10,
    }),
    // Medium win: 3× BAR (multiple 20).
    slotsRow({
      id: 's-3b',
      reels: ['bar', 'bar', 'bar'],
      payout: { key: 'bar-bar-bar', multiple: 20, winningReelIndices: [0, 1, 2] },
      betAmount: 10,
      payoutChips: 200,
      winTier: 'medium',
      playedAt: 11,
    }),
    // Jackpot: 3× 7 (multiple 50).
    slotsRow({
      id: 's-3s',
      reels: ['seven', 'seven', 'seven'],
      payout: { key: 'seven-seven-seven', multiple: 50, winningReelIndices: [0, 1, 2] },
      betAmount: 10,
      payoutChips: 500,
      winTier: 'jackpot',
      playedAt: 12,
    }),
  ];
  await db.rounds.bulkAdd(rows);
  return rows;
}

describe('queries.getSlotsAllTimeStats', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('returns zeros when no slots rounds exist', async () => {
    const s = await getSlotsAllTimeStats();
    expect(s).toEqual({
      spinsRun: 0,
      totalWagered: 0,
      totalPaid: 0,
      netHouseChips: 0,
      netPlayerChips: 0,
      actualRtp: null,
      targetRtp: 0.86,
      tierCounts: { none: 0, small: 0, medium: 0, jackpot: 0 },
      jackpotsHit: 0,
    });
  });

  it('ignores rounds from other games', async () => {
    await db.rounds.add({
      id: 'bj-1',
      userId: 'u-1',
      game: 'blackjack',
      betAmount: 100,
      payout: 0,
      netChange: -100,
      outcome: 'loss',
      details: {},
      balanceAfter: 900,
      playedAt: 1_000,
    });
    const s = await getSlotsAllTimeStats();
    expect(s.spinsRun).toBe(0);
    expect(s.netHouseChips).toBe(0);
    expect(s.actualRtp).toBeNull();
  });

  it('ignores slots rounds without spin details', async () => {
    await db.rounds.add({
      id: 'bad-row',
      userId: 'u-1',
      game: 'slots',
      betAmount: 10,
      payout: 0,
      netChange: -10,
      outcome: 'loss',
      // Intentionally missing spin field — exercise the `if (!d?.spin) continue` guard.
      details: {},
      balanceAfter: 990,
      playedAt: 1,
    });
    const s = await getSlotsAllTimeStats();
    expect(s.spinsRun).toBe(0);
  });

  it('aggregates spins, wagering, payouts, and tier counts from the fixture', async () => {
    await seedSlotsRows();
    const s = await getSlotsAllTimeStats();
    // 12 valid spins seeded.
    expect(s.spinsRun).toBe(12);
    // Each row bets 10 → 12 * 10 = 120.
    expect(s.totalWagered).toBe(120);
    // Payouts: 5 losses (0) + 2 two-cherry (20+20=40) + 50 + 80 + 120 + 200 + 500 = 990.
    expect(s.totalPaid).toBe(990);
    expect(s.netHouseChips).toBe(120 - 990); // -870
    expect(s.netPlayerChips).toBe(870);
    expect(s.actualRtp).toBeCloseTo(990 / 120);
    expect(s.targetRtp).toBe(0.86);
    expect(s.tierCounts).toEqual({ none: 5, small: 2, medium: 4, jackpot: 1 });
    expect(s.jackpotsHit).toBe(1);
  });

  it('treats netHouseChips as positive when the house is ahead', async () => {
    await db.rounds.bulkAdd([
      slotsRow({
        id: 's-1',
        reels: ['cherry', 'lemon', 'bell'],
        payout: null,
        betAmount: 100,
        payoutChips: 0,
        winTier: 'none',
        playedAt: 1,
      }),
      slotsRow({
        id: 's-2',
        reels: ['cherry', 'lemon', 'bar'],
        payout: null,
        betAmount: 100,
        payoutChips: 0,
        winTier: 'none',
        playedAt: 2,
      }),
    ]);
    const s = await getSlotsAllTimeStats();
    expect(s.netHouseChips).toBe(200);
    expect(s.netPlayerChips).toBe(-200);
  });
});

describe('queries.getSlotsCombinationDistribution', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('returns every paytable combo with count 0 when there is no data', async () => {
    const combos = await getSlotsCombinationDistribution();
    expect(combos).toHaveLength(6);
    // Sorted by payout multiple descending.
    expect(combos[0]!.key).toBe('seven-seven-seven');
    expect(combos[0]!.payoutMultiple).toBe(50);
    expect(combos[0]!.tier).toBe('jackpot');
    expect(combos[0]!.count).toBe(0);
    expect(combos[0]!.totalPaid).toBe(0);
    expect(combos[combos.length - 1]!.key).toBe('two-cherry');
    expect(combos[combos.length - 1]!.payoutMultiple).toBe(2);
    expect(combos[combos.length - 1]!.tier).toBe('small');
  });

  it('counts hits per combination across the fixture', async () => {
    await seedSlotsRows();
    const combos = await getSlotsCombinationDistribution();
    const byKey = Object.fromEntries(combos.map((c) => [c.key, c]));
    expect(byKey['seven-seven-seven']!.count).toBe(1);
    expect(byKey['seven-seven-seven']!.totalPaid).toBe(500);
    expect(byKey['bar-bar-bar']!.count).toBe(1);
    expect(byKey['bar-bar-bar']!.totalPaid).toBe(200);
    expect(byKey['bell-bell-bell']!.count).toBe(1);
    expect(byKey['bell-bell-bell']!.totalPaid).toBe(120);
    expect(byKey['lemon-lemon-lemon']!.count).toBe(1);
    expect(byKey['lemon-lemon-lemon']!.totalPaid).toBe(80);
    expect(byKey['cherry-cherry-cherry']!.count).toBe(1);
    expect(byKey['cherry-cherry-cherry']!.totalPaid).toBe(50);
    expect(byKey['two-cherry']!.count).toBe(2);
    expect(byKey['two-cherry']!.totalPaid).toBe(40);
  });

  it('attaches the correct tier to each combo', async () => {
    const combos = await getSlotsCombinationDistribution();
    const byKey = Object.fromEntries(combos.map((c) => [c.key, c]));
    expect(byKey['seven-seven-seven']!.tier).toBe('jackpot');
    expect(byKey['bar-bar-bar']!.tier).toBe('medium');
    expect(byKey['bell-bell-bell']!.tier).toBe('medium');
    expect(byKey['lemon-lemon-lemon']!.tier).toBe('medium');
    expect(byKey['cherry-cherry-cherry']!.tier).toBe('medium');
    expect(byKey['two-cherry']!.tier).toBe('small');
  });

  it('ignores losing spins (no payout key)', async () => {
    await db.rounds.bulkAdd([
      slotsRow({
        id: 's-l1',
        reels: ['cherry', 'lemon', 'bell'],
        payout: null,
        betAmount: 10,
        payoutChips: 0,
        winTier: 'none',
        playedAt: 1,
      }),
    ]);
    const combos = await getSlotsCombinationDistribution();
    expect(combos.every((c) => c.count === 0)).toBe(true);
  });
});

describe('queries.getSlotsSymbolDistribution', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('returns all 5 symbols with zero counts when no data', async () => {
    const dist = await getSlotsSymbolDistribution();
    expect(dist).toHaveLength(5);
    expect(dist.map((d) => d.symbol)).toEqual(['cherry', 'lemon', 'bell', 'bar', 'seven']);
    expect(
      dist.every((d) => d.reel0 === 0 && d.reel1 === 0 && d.reel2 === 0 && d.total === 0),
    ).toBe(true);
  });

  it('counts per-reel symbol landings across the fixture', async () => {
    await seedSlotsRows();
    const dist = await getSlotsSymbolDistribution();
    const byKey = Object.fromEntries(dist.map((d) => [d.symbol, d]));

    // Tally cherry across the 12 seeded rows:
    //   reel0: s-loss-1, s-loss-4? no (s-loss-4 = bell,cherry,lemon → reel1), s-2c-1 (cherry), s-2c-2 (cherry), s-3c (cherry)
    //   Counted reel-by-reel:
    //     reel0 cherries: s-loss-1, s-loss-3 no(bar), s-2c-1, s-2c-2, s-3c → 4? Let me recount via cases:
    //   s-loss-1: ['cherry','lemon','bell']    → r0=cherry, r1=lemon, r2=bell
    //   s-loss-2: ['lemon','bar','seven']       → r0=lemon,  r1=bar,   r2=seven
    //   s-loss-3: ['bar','seven','cherry']      → r0=bar,    r1=seven, r2=cherry
    //   s-loss-4: ['bell','cherry','lemon']     → r0=bell,   r1=cherry,r2=lemon
    //   s-loss-5: ['seven','bell','bar']        → r0=seven,  r1=bell,  r2=bar
    //   s-2c-1:   ['cherry','lemon','cherry']   → r0=cherry, r1=lemon, r2=cherry
    //   s-2c-2:   ['cherry','bar','cherry']     → r0=cherry, r1=bar,   r2=cherry
    //   s-3c:     ['cherry','cherry','cherry']  → r0=cherry, r1=cherry,r2=cherry
    //   s-3l:     ['lemon','lemon','lemon']     → r0=lemon,  r1=lemon, r2=lemon
    //   s-3bl:    ['bell','bell','bell']        → r0=bell,   r1=bell,  r2=bell
    //   s-3b:     ['bar','bar','bar']           → r0=bar,    r1=bar,   r2=bar
    //   s-3s:     ['seven','seven','seven']     → r0=seven,  r1=seven, r2=seven
    //
    // Cherry: r0 = {s-loss-1, s-2c-1, s-2c-2, s-3c} = 4, r1 = {s-loss-4, s-3c} = 2, r2 = {s-loss-3, s-2c-1, s-2c-2, s-3c} = 4
    expect(byKey['cherry']!.reel0).toBe(4);
    expect(byKey['cherry']!.reel1).toBe(2);
    expect(byKey['cherry']!.reel2).toBe(4);
    expect(byKey['cherry']!.total).toBe(10);

    // Lemon: r0 = {s-loss-2, s-3l} = 2, r1 = {s-loss-1, s-2c-1, s-3l} = 3, r2 = {s-loss-4, s-3l} = 2
    expect(byKey['lemon']!.reel0).toBe(2);
    expect(byKey['lemon']!.reel1).toBe(3);
    expect(byKey['lemon']!.reel2).toBe(2);
    expect(byKey['lemon']!.total).toBe(7);

    // Bell: r0 = {s-loss-4, s-3bl} = 2, r1 = {s-loss-5, s-3bl} = 2, r2 = {s-loss-1, s-3bl} = 2
    expect(byKey['bell']!.reel0).toBe(2);
    expect(byKey['bell']!.reel1).toBe(2);
    expect(byKey['bell']!.reel2).toBe(2);
    expect(byKey['bell']!.total).toBe(6);

    // Bar: r0 = {s-loss-3, s-3b} = 2, r1 = {s-loss-2, s-2c-2, s-3b} = 3, r2 = {s-loss-5, s-3b} = 2
    expect(byKey['bar']!.reel0).toBe(2);
    expect(byKey['bar']!.reel1).toBe(3);
    expect(byKey['bar']!.reel2).toBe(2);
    expect(byKey['bar']!.total).toBe(7);

    // Seven: r0 = {s-loss-5, s-3s} = 2, r1 = {s-loss-3, s-3s} = 2, r2 = {s-loss-2, s-3s} = 2
    expect(byKey['seven']!.reel0).toBe(2);
    expect(byKey['seven']!.reel1).toBe(2);
    expect(byKey['seven']!.reel2).toBe(2);
    expect(byKey['seven']!.total).toBe(6);

    // Sanity: per-reel totals across all 5 symbols == spinsRun.
    const r0 = dist.reduce((s, d) => s + d.reel0, 0);
    const r1 = dist.reduce((s, d) => s + d.reel1, 0);
    const r2 = dist.reduce((s, d) => s + d.reel2, 0);
    expect(r0).toBe(12);
    expect(r1).toBe(12);
    expect(r2).toBe(12);
  });

  it('ignores rounds without spin reels', async () => {
    await db.rounds.add({
      id: 'bad-row',
      userId: 'u-1',
      game: 'slots',
      betAmount: 10,
      payout: 0,
      netChange: -10,
      outcome: 'loss',
      // Intentionally missing spin/reels — exercise the `if (!d?.spin?.reels) continue` guard.
      details: {},
      balanceAfter: 990,
      playedAt: 1,
    });
    const dist = await getSlotsSymbolDistribution();
    expect(dist.every((d) => d.total === 0)).toBe(true);
  });
});

// ─── Phase 15 #8 — Baccarat all-time admin stats ───────────────────────

import {
  getBaccaratAllTimeStats,
  getBaccaratStreakStats,
  getBaccaratWinnerDistribution,
} from './stats';
import type {
  Card as BaccaratCard,
  Hand as BaccaratHand,
  HandTotal,
  RoundResult as BaccaratRoundResult,
  Winner as BaccaratWinner,
} from '@/games/baccarat/types';

/** Pseudo-card for fixture purposes — exact rank/suit don't matter for the
 *  aggregations under test (they read winner / margin / totalCards / pair
 *  flags from the precomputed RoundResult). */
function fakeCard(): BaccaratCard {
  return { rank: 'A', suit: '♠', faceUp: true };
}

function fakeHand(total: HandTotal, cardCount: number): BaccaratHand {
  return {
    cards: Array.from({ length: cardCount }, () => fakeCard()),
    total,
  };
}

function baccaratDetails(opts: {
  winner: BaccaratWinner;
  playerTotal: HandTotal;
  bankerTotal: HandTotal;
  playerCards: number;
  bankerCards: number;
  margin: number;
  winnerNatural: boolean;
  bothNatural: boolean;
  playerPair: boolean;
  bankerPair: boolean;
}): BaccaratRoundResult {
  return {
    player: fakeHand(opts.playerTotal, opts.playerCards),
    banker: fakeHand(opts.bankerTotal, opts.bankerCards),
    winner: opts.winner,
    margin: opts.margin,
    winnerNatural: opts.winnerNatural,
    bothNatural: opts.bothNatural,
    playerPair: opts.playerPair,
    bankerPair: opts.bankerPair,
    totalCards: opts.playerCards + opts.bankerCards,
  };
}

function baccaratRow(opts: {
  id: string;
  details: BaccaratRoundResult;
  betAmount: number;
  payoutChips: number;
  playedAt: number;
}) {
  const netChange = opts.payoutChips - opts.betAmount;
  const outcome: 'win' | 'loss' | 'push' = netChange > 0 ? 'win' : netChange < 0 ? 'loss' : 'push';
  return {
    id: opts.id,
    userId: 'u-1',
    game: 'baccarat' as const,
    betAmount: opts.betAmount,
    payout: opts.payoutChips,
    netChange,
    outcome,
    details: opts.details as unknown,
    balanceAfter: 1000,
    playedAt: opts.playedAt,
  };
}

/** Seed 20 baccarat rounds covering every winner / pair / natural / dragon /
 *  big-small combination the aggregations must measure. Counts:
 *
 *  Winners — player 8, banker 9, tie 3 (total 20)
 *  Naturals — 4 (3 player + 1 banker — none of which are dragons)
 *  Double naturals — 1 (the b-nat-tie row, both 8)
 *  Pairs — playerPair 3, bankerPair 2
 *  Big (totalCards ≥ 5) — 9 ;  Small (totalCards === 4) — 11
 *  Dragons — playerDragons 2 (margin 4 + 5, non-natural), bankerDragons 3 (margin 4 + 5 + 6, non-natural)
 */
async function seedBaccaratRows() {
  await resetDb();
  const rows = [
    // 1. Player wins natural 8 vs banker 6 (small — both 2 cards).
    baccaratRow({
      id: 'b-01',
      details: baccaratDetails({
        winner: 'player',
        playerTotal: 8,
        bankerTotal: 6,
        playerCards: 2,
        bankerCards: 2,
        margin: 2,
        winnerNatural: true,
        bothNatural: false,
        playerPair: false,
        bankerPair: false,
      }),
      betAmount: 100,
      payoutChips: 200,
      playedAt: 1,
    }),
    // 2. Player wins natural 9 vs banker 7 (small).
    baccaratRow({
      id: 'b-02',
      details: baccaratDetails({
        winner: 'player',
        playerTotal: 9,
        bankerTotal: 7,
        playerCards: 2,
        bankerCards: 2,
        margin: 2,
        winnerNatural: true,
        bothNatural: false,
        playerPair: false,
        bankerPair: false,
      }),
      betAmount: 50,
      payoutChips: 100,
      playedAt: 2,
    }),
    // 3. Banker natural 8 vs player natural 8 — tie + bothNatural.
    baccaratRow({
      id: 'b-03',
      details: baccaratDetails({
        winner: 'tie',
        playerTotal: 8,
        bankerTotal: 8,
        playerCards: 2,
        bankerCards: 2,
        margin: 0,
        winnerNatural: true,
        bothNatural: true,
        playerPair: false,
        bankerPair: false,
      }),
      betAmount: 25,
      payoutChips: 225, // 8:1 tie pays 200 net + 25 stake returned
      playedAt: 3,
    }),
    // 4. Banker natural 9 (small).
    baccaratRow({
      id: 'b-04',
      details: baccaratDetails({
        winner: 'banker',
        playerTotal: 6,
        bankerTotal: 9,
        playerCards: 2,
        bankerCards: 2,
        margin: 3,
        winnerNatural: true,
        bothNatural: false,
        playerPair: false,
        bankerPair: false,
      }),
      betAmount: 40,
      payoutChips: 78, // 1:1 minus 5% commission (floor(40 * 0.05) = 2)
      playedAt: 4,
    }),
    // 5. Player dragon — player 8 vs banker 3, margin 5, non-natural (6 cards big).
    baccaratRow({
      id: 'b-05',
      details: baccaratDetails({
        winner: 'player',
        playerTotal: 8,
        bankerTotal: 3,
        playerCards: 3,
        bankerCards: 3,
        margin: 5,
        winnerNatural: false,
        bothNatural: false,
        playerPair: false,
        bankerPair: false,
      }),
      betAmount: 20,
      payoutChips: 40,
      playedAt: 5,
    }),
    // 6. Player dragon — player 7 vs banker 3, margin 4, non-natural (5 cards big).
    baccaratRow({
      id: 'b-06',
      details: baccaratDetails({
        winner: 'player',
        playerTotal: 7,
        bankerTotal: 3,
        playerCards: 2,
        bankerCards: 3,
        margin: 4,
        winnerNatural: false,
        bothNatural: false,
        playerPair: false,
        bankerPair: false,
      }),
      betAmount: 20,
      payoutChips: 40,
      playedAt: 6,
    }),
    // 7. Banker dragon — margin 6, non-natural (big).
    baccaratRow({
      id: 'b-07',
      details: baccaratDetails({
        winner: 'banker',
        playerTotal: 3,
        bankerTotal: 9,
        playerCards: 3,
        bankerCards: 3,
        margin: 6,
        winnerNatural: false,
        bothNatural: false,
        playerPair: false,
        bankerPair: false,
      }),
      betAmount: 10,
      payoutChips: 20,
      playedAt: 7,
    }),
    // 8. Banker dragon — margin 5, non-natural (big).
    baccaratRow({
      id: 'b-08',
      details: baccaratDetails({
        winner: 'banker',
        playerTotal: 2,
        bankerTotal: 7,
        playerCards: 3,
        bankerCards: 2,
        margin: 5,
        winnerNatural: false,
        bothNatural: false,
        playerPair: false,
        bankerPair: false,
      }),
      betAmount: 10,
      payoutChips: 20,
      playedAt: 8,
    }),
    // 9. Banker dragon — margin 4, non-natural (big).
    baccaratRow({
      id: 'b-09',
      details: baccaratDetails({
        winner: 'banker',
        playerTotal: 1,
        bankerTotal: 5,
        playerCards: 3,
        bankerCards: 3,
        margin: 4,
        winnerNatural: false,
        bothNatural: false,
        playerPair: false,
        bankerPair: false,
      }),
      betAmount: 10,
      payoutChips: 20,
      playedAt: 9,
    }),
    // 10. Banker wins by 3 (no dragon). Big (5 cards).
    baccaratRow({
      id: 'b-10',
      details: baccaratDetails({
        winner: 'banker',
        playerTotal: 4,
        bankerTotal: 7,
        playerCards: 3,
        bankerCards: 2,
        margin: 3,
        winnerNatural: false,
        bothNatural: false,
        playerPair: false,
        bankerPair: false,
      }),
      betAmount: 30,
      payoutChips: 0,
      playedAt: 10,
    }),
    // 11. Player wins (banker 4, player 6) — small.
    baccaratRow({
      id: 'b-11',
      details: baccaratDetails({
        winner: 'player',
        playerTotal: 6,
        bankerTotal: 4,
        playerCards: 2,
        bankerCards: 2,
        margin: 2,
        winnerNatural: false,
        bothNatural: false,
        playerPair: false,
        bankerPair: false,
      }),
      betAmount: 20,
      payoutChips: 40,
      playedAt: 11,
    }),
    // 12. Player wins with playerPair (small).
    baccaratRow({
      id: 'b-12',
      details: baccaratDetails({
        winner: 'player',
        playerTotal: 8,
        bankerTotal: 6,
        playerCards: 2,
        bankerCards: 2,
        margin: 2,
        winnerNatural: true, // 8-card 2-card natural counted in naturals — keep it varied
        bothNatural: false,
        playerPair: true,
        bankerPair: false,
      }),
      betAmount: 15,
      payoutChips: 30,
      playedAt: 12,
    }),
    // 13. Player wins with both pairs (small).
    baccaratRow({
      id: 'b-13',
      details: baccaratDetails({
        winner: 'player',
        playerTotal: 6,
        bankerTotal: 4,
        playerCards: 2,
        bankerCards: 2,
        margin: 2,
        winnerNatural: false,
        bothNatural: false,
        playerPair: true,
        bankerPair: true,
      }),
      betAmount: 10,
      payoutChips: 20,
      playedAt: 13,
    }),
    // 14. Banker wins with playerPair side-bet (small).
    baccaratRow({
      id: 'b-14',
      details: baccaratDetails({
        winner: 'banker',
        playerTotal: 3,
        bankerTotal: 7,
        playerCards: 2,
        bankerCards: 2,
        margin: 4, // NOT a dragon (winnerNatural will be false) — verify margin-4 rule
        winnerNatural: false,
        bothNatural: false,
        playerPair: true,
        bankerPair: false,
      }),
      betAmount: 10,
      payoutChips: 0,
      playedAt: 14,
    }),
    // 15. Banker wins with bankerPair (big).
    baccaratRow({
      id: 'b-15',
      details: baccaratDetails({
        winner: 'banker',
        playerTotal: 5,
        bankerTotal: 8,
        playerCards: 3,
        bankerCards: 2,
        margin: 3,
        winnerNatural: false,
        bothNatural: false,
        playerPair: false,
        bankerPair: true,
      }),
      betAmount: 10,
      payoutChips: 0,
      playedAt: 15,
    }),
    // 16. Tie (player 5, banker 5, small).
    baccaratRow({
      id: 'b-16',
      details: baccaratDetails({
        winner: 'tie',
        playerTotal: 5,
        bankerTotal: 5,
        playerCards: 2,
        bankerCards: 2,
        margin: 0,
        winnerNatural: false,
        bothNatural: false,
        playerPair: false,
        bankerPair: false,
      }),
      betAmount: 10,
      payoutChips: 10, // tie side-bet not active — push on main bet
      playedAt: 16,
    }),
    // 17. Player wins (big, 5 cards).
    baccaratRow({
      id: 'b-17',
      details: baccaratDetails({
        winner: 'player',
        playerTotal: 8,
        bankerTotal: 7,
        playerCards: 3,
        bankerCards: 2,
        margin: 1,
        winnerNatural: false,
        bothNatural: false,
        playerPair: false,
        bankerPair: false,
      }),
      betAmount: 10,
      payoutChips: 20,
      playedAt: 17,
    }),
    // 18. Banker wins (big, 6 cards) — bankerPair.
    baccaratRow({
      id: 'b-18',
      details: baccaratDetails({
        winner: 'banker',
        playerTotal: 5,
        bankerTotal: 6,
        playerCards: 3,
        bankerCards: 3,
        margin: 1,
        winnerNatural: false,
        bothNatural: false,
        playerPair: false,
        bankerPair: true,
      }),
      betAmount: 10,
      payoutChips: 0,
      playedAt: 18,
    }),
    // 19. Banker wins (small).
    baccaratRow({
      id: 'b-19',
      details: baccaratDetails({
        winner: 'banker',
        playerTotal: 6,
        bankerTotal: 7,
        playerCards: 2,
        bankerCards: 2,
        margin: 1,
        winnerNatural: false,
        bothNatural: false,
        playerPair: false,
        bankerPair: false,
      }),
      betAmount: 10,
      payoutChips: 0,
      playedAt: 19,
    }),
    // 20. Tie (small).
    baccaratRow({
      id: 'b-20',
      details: baccaratDetails({
        winner: 'tie',
        playerTotal: 7,
        bankerTotal: 7,
        playerCards: 2,
        bankerCards: 2,
        margin: 0,
        winnerNatural: false,
        bothNatural: false,
        playerPair: false,
        bankerPair: false,
      }),
      betAmount: 5,
      payoutChips: 5,
      playedAt: 20,
    }),
  ];
  await db.rounds.bulkAdd(rows);
  return rows;
}

describe('queries.getBaccaratAllTimeStats', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('returns zeros when no baccarat rounds exist', async () => {
    const s = await getBaccaratAllTimeStats();
    expect(s).toEqual({
      roundsPlayed: 0,
      totalWagered: 0,
      totalPaid: 0,
      netHouseChips: 0,
      netPlayerChips: 0,
      actualRtp: null,
      playerWins: 0,
      bankerWins: 0,
      ties: 0,
      naturalWins: 0,
      doubleNaturals: 0,
      playerPairs: 0,
      bankerPairs: 0,
      bigCount: 0,
      smallCount: 0,
      playerDragons: 0,
      bankerDragons: 0,
    });
  });

  it('ignores rounds from other games', async () => {
    await db.rounds.add({
      id: 'rl-1',
      userId: 'u-1',
      game: 'roulette',
      betAmount: 100,
      payout: 0,
      netChange: -100,
      outcome: 'loss',
      details: { spin: { number: 0, color: 'green' } },
      balanceAfter: 900,
      playedAt: 1_000,
    });
    const s = await getBaccaratAllTimeStats();
    expect(s.roundsPlayed).toBe(0);
    expect(s.netHouseChips).toBe(0);
    expect(s.actualRtp).toBeNull();
  });

  it('ignores baccarat rounds without winner details', async () => {
    await db.rounds.add({
      id: 'bad',
      userId: 'u-1',
      game: 'baccarat',
      betAmount: 10,
      payout: 0,
      netChange: -10,
      outcome: 'loss',
      // Intentionally missing winner — exercise the `if (!d?.winner) continue` guard.
      details: {},
      balanceAfter: 990,
      playedAt: 1,
    });
    const s = await getBaccaratAllTimeStats();
    expect(s.roundsPlayed).toBe(0);
  });

  it('aggregates winners, naturals, pairs, big/small, and dragons from the fixture', async () => {
    await seedBaccaratRows();
    const s = await getBaccaratAllTimeStats();
    expect(s.roundsPlayed).toBe(20);
    // bets: 100+50+25+40+20+20+10+10+10+30+20+15+10+10+10+10+10+10+10+5 = 425
    expect(s.totalWagered).toBe(425);
    // payouts: 200+100+225+78+40+40+20+20+20+0+40+30+20+0+0+10+20+0+0+5 = 868
    expect(s.totalPaid).toBe(868);
    expect(s.netHouseChips).toBe(425 - 868); // -443
    expect(s.netPlayerChips).toBe(443);
    expect(s.actualRtp).toBeCloseTo(868 / 425);
    // Winners: 7 player rows (b-01, b-02, b-05, b-06, b-11, b-12, b-13, b-17) = 8.
    expect(s.playerWins).toBe(8);
    // Banker: b-04, b-07, b-08, b-09, b-10, b-14, b-15, b-18, b-19 = 9.
    expect(s.bankerWins).toBe(9);
    // Ties: b-03, b-16, b-20 = 3.
    expect(s.ties).toBe(3);
    // Naturals: b-01, b-02, b-03 (both-natural counts once for winner since tie wins natural too), b-04, b-12 = 5.
    expect(s.naturalWins).toBe(5);
    expect(s.doubleNaturals).toBe(1);
    // playerPairs: b-12, b-13, b-14 = 3.
    expect(s.playerPairs).toBe(3);
    // bankerPairs: b-13, b-15, b-18 = 3.
    expect(s.bankerPairs).toBe(3);
    // Small (totalCards===4): b-01, b-02, b-03, b-04, b-11, b-12, b-13, b-14, b-16, b-19, b-20 = 11.
    expect(s.smallCount).toBe(11);
    // Big (totalCards >= 5): b-05, b-06, b-07, b-08, b-09, b-10, b-15, b-17, b-18 = 9.
    expect(s.bigCount).toBe(9);
    // Player dragons: b-05 (margin 5), b-06 (margin 4) = 2.
    expect(s.playerDragons).toBe(2);
    // Banker dragons: b-07 (margin 6), b-08 (margin 5), b-09 (margin 4) = 3.
    // b-14 has margin 4 but winnerNatural is false — derivation passes, dragon=true.
    // Re-check: b-14 banker wins margin 4 non-natural → counts. Add 1 more.
    expect(s.bankerDragons).toBe(4);
  });

  it('treats netHouseChips as positive when the house is ahead', async () => {
    await db.rounds.bulkAdd([
      baccaratRow({
        id: 'b-1',
        details: baccaratDetails({
          winner: 'banker',
          playerTotal: 3,
          bankerTotal: 7,
          playerCards: 2,
          bankerCards: 2,
          margin: 4,
          winnerNatural: false,
          bothNatural: false,
          playerPair: false,
          bankerPair: false,
        }),
        betAmount: 100,
        payoutChips: 0,
        playedAt: 1,
      }),
      baccaratRow({
        id: 'b-2',
        details: baccaratDetails({
          winner: 'player',
          playerTotal: 7,
          bankerTotal: 6,
          playerCards: 2,
          bankerCards: 2,
          margin: 1,
          winnerNatural: false,
          bothNatural: false,
          playerPair: false,
          bankerPair: false,
        }),
        betAmount: 100,
        payoutChips: 0,
        playedAt: 2,
      }),
    ]);
    const s = await getBaccaratAllTimeStats();
    expect(s.netHouseChips).toBe(200);
    expect(s.netPlayerChips).toBe(-200);
  });
});

describe('queries.getBaccaratWinnerDistribution', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('returns 3 zero-count rows in canonical Player → Banker → Tie order when empty', async () => {
    const dist = await getBaccaratWinnerDistribution();
    expect(dist).toEqual([
      { winner: 'player', count: 0 },
      { winner: 'banker', count: 0 },
      { winner: 'tie', count: 0 },
    ]);
  });

  it('counts winners across the fixture', async () => {
    await seedBaccaratRows();
    const dist = await getBaccaratWinnerDistribution();
    const byWinner = Object.fromEntries(dist.map((d) => [d.winner, d.count]));
    expect(byWinner['player']).toBe(8);
    expect(byWinner['banker']).toBe(9);
    expect(byWinner['tie']).toBe(3);
  });

  it('ignores rounds without winner details', async () => {
    await db.rounds.add({
      id: 'bad',
      userId: 'u-1',
      game: 'baccarat',
      betAmount: 10,
      payout: 0,
      netChange: -10,
      outcome: 'loss',
      details: {},
      balanceAfter: 990,
      playedAt: 1,
    });
    const dist = await getBaccaratWinnerDistribution();
    expect(dist.reduce((s, p) => s + p.count, 0)).toBe(0);
  });
});

describe('queries.getBaccaratStreakStats', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('returns zeros when no rounds exist', async () => {
    const s = await getBaccaratStreakStats();
    expect(s).toEqual({
      longestPlayerStreak: 0,
      longestBankerStreak: 0,
      longestTieStreak: 0,
    });
  });

  it('detects the longest run per winner across an out-of-order seed', async () => {
    // Walk: P P B B B T P P P B B T T B (chronological).
    const winners: BaccaratWinner[] = [
      'player',
      'player',
      'banker',
      'banker',
      'banker',
      'tie',
      'player',
      'player',
      'player',
      'banker',
      'banker',
      'tie',
      'tie',
      'banker',
    ];
    // Seed in reverse playedAt order to verify the function re-sorts.
    const rows = winners
      .map((winner, i) =>
        baccaratRow({
          id: `b-${i}`,
          details: baccaratDetails({
            winner,
            playerTotal: 5,
            bankerTotal: 5,
            playerCards: 2,
            bankerCards: 2,
            margin: winner === 'tie' ? 0 : 1,
            winnerNatural: false,
            bothNatural: false,
            playerPair: false,
            bankerPair: false,
          }),
          betAmount: 10,
          payoutChips: 0,
          playedAt: i + 1,
        }),
      )
      .reverse(); // out of order on disk
    await db.rounds.bulkAdd(rows);
    const s = await getBaccaratStreakStats();
    expect(s.longestPlayerStreak).toBe(3); // P P P at indices 6/7/8
    expect(s.longestBankerStreak).toBe(3); // B B B at indices 2/3/4
    expect(s.longestTieStreak).toBe(2); // T T at indices 11/12
  });

  it('ignores rounds without winner details when computing streaks', async () => {
    await db.rounds.add({
      id: 'bad',
      userId: 'u-1',
      game: 'baccarat',
      betAmount: 10,
      payout: 0,
      netChange: -10,
      outcome: 'loss',
      details: {},
      balanceAfter: 990,
      playedAt: 1,
    });
    const s = await getBaccaratStreakStats();
    expect(s).toEqual({
      longestPlayerStreak: 0,
      longestBankerStreak: 0,
      longestTieStreak: 0,
    });
  });
});
