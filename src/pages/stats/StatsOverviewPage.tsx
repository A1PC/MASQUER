import type { JSX } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCurrentUser } from '@/store/sessionStore';
import { useStatsViewMode } from '@/store/uiStore';
import {
  getUserExtras,
  getUserMetrics,
  getUserPeaks,
  getUserSessionStats,
  getUserStreaks,
  type ExtraStats,
  type Peaks,
  type SessionStats,
  type StreakStats,
  type UserMetrics,
} from '@/systems/stats';
import EmptyState from './EmptyState';
import StatCardGrid from './StatCardGrid';

const EMPTY_METRICS: UserMetrics = {
  totalRounds: 0,
  totalWagered: 0,
  totalWon: 0,
  totalLost: 0,
  netChange: 0,
  rtp: null,
  timePlayedMs: 0,
};
const EMPTY_STREAKS: StreakStats = { longestWin: 0, longestLoss: 0 };
const EMPTY_PEAKS: Peaks = {
  biggestWin: 0,
  biggestWinAt: null,
  biggestLoss: 0,
  biggestLossAt: null,
  highestBalance: 0,
};
const EMPTY_SESSIONS: SessionStats = { best: 0, worst: 0, count: 0 };
const EMPTY_EXTRAS: ExtraStats = { avgBetSize: 0, winRate: null };

export default function StatsOverviewPage(): JSX.Element | null {
  const user = useCurrentUser();
  const mode = useStatsViewMode();
  const userId = user?.id ?? '';

  const metrics: UserMetrics = useLiveQuery(() => getUserMetrics(userId), [userId], EMPTY_METRICS);
  const streaks: StreakStats = useLiveQuery(() => getUserStreaks(userId), [userId], EMPTY_STREAKS);
  const peaks: Peaks = useLiveQuery(() => getUserPeaks(userId), [userId], EMPTY_PEAKS);
  const sessions: SessionStats = useLiveQuery(
    () => getUserSessionStats(userId),
    [userId],
    EMPTY_SESSIONS,
  );
  const extras: ExtraStats = useLiveQuery(() => getUserExtras(userId), [userId], EMPTY_EXTRAS);

  if (!user) return null;
  if (metrics.totalRounds === 0) return <EmptyState />;

  if (mode === 'graphs') {
    return (
      <div className="rounded border border-dashed border-gold/40 bg-felt-deep p-6 text-center text-sm text-white/50">
        Graphs view — ships in PR C.
      </div>
    );
  }

  return (
    <StatCardGrid
      metrics={metrics}
      streaks={streaks}
      peaks={peaks}
      sessions={sessions}
      extras={extras}
    />
  );
}
