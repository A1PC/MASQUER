import type { JSX } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCurrentUser } from '@/store/sessionStore';
import { useStatsViewMode } from '@/store/uiStore';
import { getLeaderboard, type LeaderboardRow } from '@/systems/stats';
import EmptyState from '@/pages/stats/EmptyState';
import BoardBar from '@/components/charts/BoardBar';
import { formatChips, formatSignedChips } from '@/pages/stats/formatters';
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

  const mode = useStatsViewMode();

  if (!user) return null;

  const allEmpty =
    netWinner.length === 0 &&
    mostRounds.length === 0 &&
    biggestSingleWin.length === 0 &&
    longestWinStreak.length === 0 &&
    mostVariety.length === 0;
  if (allEmpty) return <EmptyState />;

  if (mode === 'graphs') {
    return (
      <div className="flex flex-col gap-6">
        <section>
          <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
            BIGGEST NET WINNER
          </h2>
          <BoardBar rows={netWinner} currentUserId={user.id} formatValue={formatSignedChips} />
        </section>
        <section>
          <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
            MOST ROUNDS PLAYED
          </h2>
          <BoardBar rows={mostRounds} currentUserId={user.id} formatValue={formatChips} />
        </section>
        <section>
          <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
            BIGGEST SINGLE WIN
          </h2>
          <BoardBar
            rows={biggestSingleWin}
            currentUserId={user.id}
            formatValue={formatSignedChips}
          />
        </section>
        <section>
          <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
            LONGEST WIN STREAK
          </h2>
          <BoardBar rows={longestWinStreak} currentUserId={user.id} formatValue={formatChips} />
        </section>
        <section>
          <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">MOST VARIETY</h2>
          <BoardBar rows={mostVariety} currentUserId={user.id} />
        </section>
      </div>
    );
  }

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
