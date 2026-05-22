import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { clearHistory, deleteAccount } from './account';
import type {
  Adjustment,
  Balance,
  GameVisit,
  LotteryDraw,
  LotteryFavorite,
  LotteryLine,
  LotteryTicket,
  Prefs,
  Round,
  Session,
  User,
} from '@/db';

function makeUser(id: string): User {
  return {
    id,
    username: id,
    usernameLower: id,
    passwordHash: '',
    passwordSalt: '',
    pbkdf2Iterations: 600_000,
    avatarColor: '#a3122a',
    createdAt: Date.now(),
  };
}

function makeBalance(userId: string): Balance {
  return { userId, chips: 1_000, updatedAt: Date.now() };
}

function makeRound(id: string, userId: string): Round {
  return {
    id,
    userId,
    game: 'coin-flip',
    betAmount: 10,
    payout: 20,
    netChange: 10,
    outcome: 'win',
    details: {},
    balanceAfter: 1_010,
    playedAt: Date.now(),
  };
}

function makeSession(id: string, userId: string): Session {
  return { id, userId, loginAt: Date.now(), logoutAt: null, durationMs: null };
}

function makeGameVisit(id: string, userId: string): GameVisit {
  return {
    id,
    userId,
    sessionId: 's',
    game: 'coin-flip',
    enteredAt: Date.now(),
    exitedAt: null,
    durationMs: null,
  };
}

function makeAdjustment(id: string, userId: string): Adjustment {
  return { id, userId, amount: 5, reason: 'test', adjustedAt: Date.now() };
}

function makeTicket(id: string, userId: string): LotteryTicket {
  return { id, userId, drawId: '2026-05-22', purchasedAt: Date.now(), totalCost: 5, lineCount: 1 };
}

function makeLine(id: string, userId: string): LotteryLine {
  return {
    id,
    ticketId: 't',
    userId,
    drawId: '2026-05-22',
    mainNumbers: [1, 2, 3, 4, 5],
    bonusNumber: 3,
    isLuckyDip: false,
    isFreeReentry: false,
    settled: false,
    matchTier: null,
    payout: 0,
  };
}

function makeFavorite(id: string, userId: string): LotteryFavorite {
  return {
    id,
    userId,
    name: 'fav',
    mainNumbers: [1, 2, 3, 4, 5],
    bonusNumber: 3,
    createdAt: Date.now(),
  };
}

function makePrefs(userId: string): Prefs {
  return {
    userId,
    soundEnabled: true,
    masterVolume: 0.7,
    muteUi: false,
    muteGame: false,
    muteAmbience: true,
    motionPref: 'system',
  };
}

const draw: LotteryDraw = {
  id: '2026-05-22',
  drawAt: Date.now(),
  mainNumbers: [1, 2, 3, 4, 5],
  bonus: 3,
  totalLines: 0,
  totalRevenue: 0,
  totalPayout: 0,
};

/** Seed two users (u1 + u2) fully across every user-keyed table + one global draw. */
async function seed(): Promise<void> {
  await db.lotteryDraws.add(draw); // global — must survive deleteAccount
  for (const uid of ['u1', 'u2'] as const) {
    await db.users.add(makeUser(uid));
    await db.balances.add(makeBalance(uid));
    await db.rounds.bulkAdd([makeRound(`${uid}-r1`, uid), makeRound(`${uid}-r2`, uid)]);
    await db.sessions.add(makeSession(`${uid}-s1`, uid));
    await db.gameVisits.add(makeGameVisit(`${uid}-gv1`, uid));
    await db.adjustments.add(makeAdjustment(`${uid}-a1`, uid));
    await db.lotteryTickets.add(makeTicket(`${uid}-lt1`, uid));
    await db.lotteryLines.add(makeLine(`${uid}-ll1`, uid));
    await db.lotteryFavorites.add(makeFavorite(`${uid}-lf1`, uid));
    await db.prefs.add(makePrefs(uid));
  }
}

beforeEach(async () => {
  await resetDb();
  await seed();
});
afterEach(async () => {
  await resetDb();
});

describe('clearHistory', () => {
  it('removes only the target user rounds, leaving the other user intact', async () => {
    await clearHistory('u1');
    expect(await db.rounds.where('userId').equals('u1').count()).toBe(0);
    expect(await db.rounds.where('userId').equals('u2').count()).toBe(2);
  });

  it('leaves all non-rounds tables untouched', async () => {
    await clearHistory('u1');
    expect(await db.users.get('u1')).toBeDefined();
    expect(await db.balances.get('u1')).toBeDefined();
    expect(await db.prefs.get('u1')).toBeDefined();
    expect(await db.sessions.where('userId').equals('u1').count()).toBe(1);
  });
});

describe('deleteAccount', () => {
  it('removes every user-keyed row for the target user', async () => {
    await deleteAccount('u1');
    expect(await db.users.get('u1')).toBeUndefined();
    expect(await db.balances.get('u1')).toBeUndefined();
    expect(await db.prefs.get('u1')).toBeUndefined();
    expect(await db.rounds.where('userId').equals('u1').count()).toBe(0);
    expect(await db.sessions.where('userId').equals('u1').count()).toBe(0);
    expect(await db.gameVisits.where('userId').equals('u1').count()).toBe(0);
    expect(await db.adjustments.where('userId').equals('u1').count()).toBe(0);
    expect(await db.lotteryTickets.where('userId').equals('u1').count()).toBe(0);
    expect(await db.lotteryLines.where('userId').equals('u1').count()).toBe(0);
    expect(await db.lotteryFavorites.where('userId').equals('u1').count()).toBe(0);
  });

  it('leaves the other user fully intact', async () => {
    await deleteAccount('u1');
    expect(await db.users.get('u2')).toBeDefined();
    expect(await db.balances.get('u2')).toBeDefined();
    expect(await db.prefs.get('u2')).toBeDefined();
    expect(await db.rounds.where('userId').equals('u2').count()).toBe(2);
    expect(await db.sessions.where('userId').equals('u2').count()).toBe(1);
    expect(await db.gameVisits.where('userId').equals('u2').count()).toBe(1);
    expect(await db.adjustments.where('userId').equals('u2').count()).toBe(1);
    expect(await db.lotteryTickets.where('userId').equals('u2').count()).toBe(1);
    expect(await db.lotteryLines.where('userId').equals('u2').count()).toBe(1);
    expect(await db.lotteryFavorites.where('userId').equals('u2').count()).toBe(1);
  });

  it('leaves global lotteryDraws intact', async () => {
    await deleteAccount('u1');
    expect(await db.lotteryDraws.get('2026-05-22')).toBeDefined();
  });
});
