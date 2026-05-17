import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import type { Round } from '@/db';
import type { Game } from '@/systems/wallet';

/** Reactive: returns the latest `limit` rounds for this user+game, newest first.
 *  Pass `game = undefined` to get rounds across ALL games. */
export function useRecentRounds(
  userId: string | undefined,
  game: Game | undefined,
  limit = 12,
): Round[] {
  return useLiveQuery(
    async (): Promise<Round[]> => {
      if (!userId) return [];
      const rows = await db.rounds
        .where('[userId+playedAt]')
        .between([userId, 0], [userId, Number.MAX_SAFE_INTEGER])
        .reverse()
        .limit(game === undefined ? limit : limit * 3)
        .toArray();
      const filtered = game === undefined ? rows : rows.filter((r) => r.game === game);
      return filtered.slice(0, limit);
    },
    [userId, game, limit],
    [] as Round[],
  );
}
