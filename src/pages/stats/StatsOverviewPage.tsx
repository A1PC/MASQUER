import type { JSX } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCurrentUser } from '@/store/sessionStore';
import { useStatsViewMode } from '@/store/uiStore';
import {
  getUserExtras,
  getUserGameDistribution,
  getUserMetrics,
  getUserNetFlowSeries,
  getUserPeaks,
  getUserSessionStats,
  getUserStreaks,
  getUserWinRateByGame,
  type ExtraStats,
  type Peaks,
  type SessionStats,
  type StreakStats,
  type UserMetrics,
} from '@/systems/stats';
import NetFlowLine from '@/components/charts/NetFlowLine';
import GameDistributionDonut from '@/components/charts/GameDistributionDonut';
import WinRateByGameBar from '@/components/charts/WinRateByGameBar';
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
  const netFlow = useLiveQuery(
    () => getUserNetFlowSeries(userId),
    [userId],
    [] as Awaited<ReturnType<typeof getUserNetFlowSeries>>,
  );
  const distribution = useLiveQuery(
    () => getUserGameDistribution(userId),
    [userId],
    [] as Awaited<ReturnType<typeof getUserGameDistribution>>,
  );
  const winRates = useLiveQuery(
    () => getUserWinRateByGame(userId),
    [userId],
    [] as Awaited<ReturnType<typeof getUserWinRateByGame>>,
  );

  if (!user) return null;
  if (metrics.totalRounds === 0) return <EmptyState />;

  if (mode === 'graphs') {
    return (
      <div className="flex flex-col gap-6">
        <section>
          <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">NET FLOW</h2>
          <NetFlowLine data={netFlow} />
        </section>
        <section>
          <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
            GAME DISTRIBUTION
          </h2>
          <GameDistributionDonut data={distribution} />
        </section>
        <section>
          <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
            WIN RATE BY GAME
          </h2>
          <WinRateByGameBar data={winRates} />
        </section>
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
