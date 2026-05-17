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

export class LocalGambleDB extends Dexie {
  users!: EntityTable<User, 'id'>;
  balances!: EntityTable<Balance, 'userId'>;
  rounds!: EntityTable<Round, 'id'>;

  constructor(name = 'localGamble') {
    super(name);
    this.version(1).stores({
      users: 'id, &usernameLower, createdAt',
      balances: 'userId',
      rounds: 'id, userId, game, playedAt, [userId+playedAt]',
    });
  }
}
