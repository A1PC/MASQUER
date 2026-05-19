import { LocalGambleDB } from './schema';

export const db = new LocalGambleDB();

export type {
  User,
  Balance,
  Round,
  Session,
  GameVisit,
  Adjustment,
  LotteryDraw,
  LotteryTicket,
  LotteryLine,
  LotteryFavorite,
  LotteryMatchTier,
  BingoConfigRow,
} from './schema';
