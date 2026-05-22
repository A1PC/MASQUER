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
  game:
    | 'blackjack'
    | 'roulette'
    | 'slots'
    | 'baccarat'
    | 'coin-flip'
    | 'lottery'
    | 'bingo'
    | 'plinko'
    | 'poker'
    | 'craps';
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

/** v3 (Phase 10): one row per scheduled daily draw. Settled lazily on app open
 *  via settleMissedDraws(). Numbers are deterministic from the date seed. */
export interface LotteryDraw {
  /** Date string `YYYY-MM-DD` (user's local timezone). Primary key. */
  id: string;
  /** Epoch ms when the draw was actually run (NOT the scheduled time). */
  drawAt: number;
  /** Sorted-asc 5 main numbers in [1, 50]. */
  mainNumbers: number[];
  /** Bonus number in [1, 10]. */
  bonus: number;
  /** Count of all lines (paid + free-re-entry) participating in this draw. */
  totalLines: number;
  /** Sum of chip revenue collected from line sales (excludes free re-entries). */
  totalRevenue: number;
  /** Sum of chip payouts paid to winning lines. */
  totalPayout: number;
}

/** v3 (Phase 10): one row per purchase event. Wraps 1..N lines. */
export interface LotteryTicket {
  id: string;
  userId: string;
  drawId: string;
  purchasedAt: number;
  /** Total chips debited at purchase (0 if a free-re-entry wrapper). */
  totalCost: number;
  lineCount: number;
}

/** v3 (Phase 10): one row per 5+1 entry into a draw. */
export interface LotteryLine {
  id: string;
  ticketId: string;
  userId: string;
  drawId: string;
  mainNumbers: number[];
  bonusNumber: number;
  isLuckyDip: boolean;
  isFreeReentry: boolean;
  settled: boolean;
  matchTier: LotteryMatchTier | null;
  payout: number;
  /** For free re-entries, the settled line that earned this entry. */
  sourceLineId?: string;
}

export type LotteryMatchTier =
  | '5+bonus'
  | '5'
  | '4+bonus'
  | '4'
  | '3+bonus'
  | '3'
  | '2+bonus'
  | '2';

/** v3 (Phase 10): user-saved favorite number sets. */
export interface LotteryFavorite {
  id: string;
  userId: string;
  name: string;
  mainNumbers: number[];
  bonusNumber: number;
  createdAt: number;
}

/** v4 (Phase 11.5): admin-tunable per-difficulty bingo config. One row per
 *  difficulty; absent row means use the code default from DIFFICULTY[d]. */
export interface BingoConfigRow {
  /** Primary key — one of 'easy' | 'medium' | 'hard'. */
  difficulty: 'easy' | 'medium' | 'hard';
  cpuCount: number;
  potMultiplier: number;
  cpuLatencyMin: number;
  cpuLatencyMax: number;
  forceManual: boolean;
}

/** v5 (Phase 15 #2): per-user preferences (sound + motion). One row per user,
 *  keyed by `userId`. Created lazily with defaults on first access. */
export interface Prefs {
  userId: string; // PK
  soundEnabled: boolean;
  masterVolume: number; // 0..1
  muteUi: boolean;
  muteGame: boolean;
  muteAmbience: boolean;
  motionPref: 'system' | 'full' | 'reduced';
}

export class LocalGambleDB extends Dexie {
  users!: EntityTable<User, 'id'>;
  balances!: EntityTable<Balance, 'userId'>;
  rounds!: EntityTable<Round, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  gameVisits!: EntityTable<GameVisit, 'id'>;
  adjustments!: EntityTable<Adjustment, 'id'>;
  lotteryDraws!: EntityTable<LotteryDraw, 'id'>;
  lotteryTickets!: EntityTable<LotteryTicket, 'id'>;
  lotteryLines!: EntityTable<LotteryLine, 'id'>;
  lotteryFavorites!: EntityTable<LotteryFavorite, 'id'>;
  bingoConfig!: Dexie.Table<BingoConfigRow, 'easy' | 'medium' | 'hard'>;
  prefs!: EntityTable<Prefs, 'userId'>;

  constructor(name = 'localGamble') {
    super(name);
    this.version(1).stores({
      users: 'id, &usernameLower, createdAt',
      balances: 'userId',
      rounds: 'id, userId, game, playedAt, [userId+playedAt]',
    });
    this.version(2).stores({
      // isBanned intentionally NOT indexed — IndexedDB doesn't support boolean
      // keys; callers filter banned users in memory (small N).
      users: 'id, &usernameLower, createdAt',
      balances: 'userId',
      rounds: 'id, userId, game, playedAt, [userId+playedAt]',
      sessions: 'id, userId, loginAt, [userId+loginAt]',
      gameVisits: 'id, userId, game, sessionId, [userId+game], [userId+enteredAt]',
      adjustments: 'id, userId, adjustedAt, [userId+adjustedAt]',
    });
    this.version(3).stores({
      users: 'id, &usernameLower, createdAt',
      balances: 'userId',
      rounds: 'id, userId, game, playedAt, [userId+playedAt]',
      sessions: 'id, userId, loginAt, [userId+loginAt]',
      gameVisits: 'id, userId, game, sessionId, [userId+game], [userId+enteredAt]',
      adjustments: 'id, userId, adjustedAt, [userId+adjustedAt]',
      // Phase 10 additions
      lotteryDraws: 'id, drawAt',
      lotteryTickets: 'id, userId, drawId, purchasedAt, [userId+drawId]',
      lotteryLines: 'id, ticketId, userId, drawId, settled, [userId+drawId], [drawId+settled]',
      lotteryFavorites: 'id, userId, createdAt, [userId+createdAt]',
    });
    this.version(4).stores({
      users: 'id, &usernameLower, createdAt',
      balances: 'userId',
      rounds: 'id, userId, game, playedAt, [userId+playedAt]',
      sessions: 'id, userId, loginAt, [userId+loginAt]',
      gameVisits: 'id, userId, game, sessionId, [userId+game], [userId+enteredAt]',
      adjustments: 'id, userId, adjustedAt, [userId+adjustedAt]',
      lotteryDraws: 'id, drawAt',
      lotteryTickets: 'id, userId, drawId, purchasedAt, [userId+drawId]',
      lotteryLines: 'id, ticketId, userId, drawId, settled, [userId+drawId], [drawId+settled]',
      lotteryFavorites: 'id, userId, createdAt, [userId+createdAt]',
      // Phase 11.5: admin-tunable bingo config
      bingoConfig: '&difficulty',
    });
    this.version(5).stores({
      users: 'id, &usernameLower, createdAt',
      balances: 'userId',
      rounds: 'id, userId, game, playedAt, [userId+playedAt]',
      sessions: 'id, userId, loginAt, [userId+loginAt]',
      gameVisits: 'id, userId, game, sessionId, [userId+game], [userId+enteredAt]',
      adjustments: 'id, userId, adjustedAt, [userId+adjustedAt]',
      lotteryDraws: 'id, drawAt',
      lotteryTickets: 'id, userId, drawId, purchasedAt, [userId+drawId]',
      lotteryLines: 'id, ticketId, userId, drawId, settled, [userId+drawId], [drawId+settled]',
      lotteryFavorites: 'id, userId, createdAt, [userId+createdAt]',
      bingoConfig: '&difficulty',
      // Phase 15 #2: per-user sound + motion preferences
      prefs: 'userId',
    });
  }
}
