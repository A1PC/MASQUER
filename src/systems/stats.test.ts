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
