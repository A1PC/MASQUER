import type { JSX } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCurrentUser } from '@/store/sessionStore';
import { getLeaderboard, type LeaderboardRow } from '@/systems/stats';
import EmptyState from '@/pages/stats/EmptyState';
import Board from './Board';

const EMPTY: readonly LeaderboardRow[] = [];

export default function LeaderboardOverviewPage(): JSX.Element | null {
  const user = useCurrentUser();

  const netWinner = useLiveQuery(() => getLeaderboard('netWinner', undefined, 100), [], EMPTY);
  const mostRounds = useLiveQuery(() => getLeaderboard('mostRounds', undefined, 100), [], EMPTY);
  const biggestSingleWin = useLiveQuery(
    () => getLeaderboard('biggestSingleWin', undefined, 100),
    [],
    EMPTY,
  );
  const longestWinStreak = useLiveQuery(
    () => getLeaderboard('longestWinStreak', undefined, 100),
    [],
    EMPTY,
  );
  const mostVariety = useLiveQuery(() => getLeaderboard('mostVariety', undefined, 100), [], EMPTY);

  if (!user) return null;

  const allEmpty =
    netWinner.length === 0 &&
    mostRounds.length === 0 &&
    biggestSingleWin.length === 0 &&
    longestWinStreak.length === 0 &&
    mostVariety.length === 0;
  if (allEmpty) return <EmptyState />;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Board title="BIGGEST NET WINNER" rows={netWinner} currentUserId={user.id} />
      <Board title="MOST ROUNDS PLAYED" rows={mostRounds} currentUserId={user.id} />
      <Board title="BIGGEST SINGLE WIN" rows={biggestSingleWin} currentUserId={user.id} />
      <Board title="LONGEST WIN STREAK" rows={longestWinStreak} currentUserId={user.id} />
      <Board title="MOST VARIETY" rows={mostVariety} currentUserId={user.id} />
    </div>
  );
}
