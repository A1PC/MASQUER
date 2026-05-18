import Dexie, { type EntityTable } from 'dexie';

export interface User {
  id: string;
  username: string;
  usernameLower: string;
  passwordHash: string;
  passwordSalt: string;
  pbkdf2Iterations: number;
  avatarColor: string;
  createdAt: number;
  /** v2: soft-ban flag. Banned users cannot log in. Undefined = false. */
  isBanned?: boolean;
  /** v2: number of successful logins (incremented in sessionStore.login). */
  loginCount?: number;
  /** v2: epoch ms of the most recent successful login. */
  lastLoginAt?: number;
}

export interface Balance {
  userId: string;
  chips: number;
  updatedAt: number;
  /** Timestamp of last daily +50 claim. undefined for users created before this
   *  field existed (treated as "never claimed → eligible immediately"). */
  lastDailyClaimAt?: number;
}

export interface Round {
  id: string;
  userId: string;
  game: 'blackjack' | 'roulette' | 'slots' | 'baccarat' | 'coin-flip';
  betAmount: number;
  payout: number;
  netChange: number;
  outcome: 'win' | 'loss' | 'push';
  details: unknown;
  balanceAfter: number;
  playedAt: number;
}

/** v2: one row per user login. Closed by logout, beforeunload, or orphan
 *  cleanup at next login. ADR-0035. */
export interface Session {
  id: string;
  userId: string;
  loginAt: number;
  logoutAt: number | null;
  durationMs: number | null;
}

/** v2: one row per game-page mount. Closed on unmount. ADR-0035. */
export interface GameVisit {
  id: string;
  userId: string;
  sessionId: string;
  game: Round['game'];
  enteredAt: number;
  exitedAt: number | null;
  durationMs: number | null;
}

/** v2: one row per admin chip adjustment. Signed amount. ADR-0035. */
export interface Adjustment {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  adjustedAt: number;
}

export class LocalGambleDB extends Dexie {
  users!: EntityTable<User, 'id'>;
  balances!: EntityTable<Balance, 'userId'>;
  rounds!: EntityTable<Round, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  gameVisits!: EntityTable<GameVisit, 'id'>;
  adjustments!: EntityTable<Adjustment, 'id'>;

  constructor(name = 'localGamble') {
    super(name);
    this.version(1).stores({
      users: 'id, &usernameLower, createdAt',
      balances: 'userId',
      rounds: 'id, userId, game, playedAt, [userId+playedAt]',
    });
    this.version(2).stores({
      users: 'id, &usernameLower, createdAt, isBanned',
      balances: 'userId',
      rounds: 'id, userId, game, playedAt, [userId+playedAt]',
      sessions: 'id, userId, loginAt, [userId+loginAt]',
      gameVisits: 'id, userId, game, sessionId, [userId+game], [userId+enteredAt]',
      adjustments: 'id, userId, adjustedAt, [userId+adjustedAt]',
    });
  }
}
