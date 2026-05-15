import { LocalGambleDB } from './schema';

export const db = new LocalGambleDB();

export type { User, Balance, Round } from './schema';
