import { beforeEach, describe, expect, it } from 'vitest';
import { register } from '@/systems/auth';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { WALLET_CONFIG } from '@/systems/wallet';
import {
  getAllUserStats,
  getGameDistribution,
  getNetFlowSeries,
  getSiteWideStats,
  getTopLosers,
  getTopWinners,
  getUserMetrics,
  getUserPeaks,
  getUserStreaks,
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
