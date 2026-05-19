import type { JSX } from 'react';
import StatCard from '@/pages/admin/StatCard';
import {
  formatChips,
  formatSignedChips,
  formatPercent,
  formatDuration,
  formatDate,
} from './formatters';
import type { UserMetrics, StreakStats, Peaks, SessionStats, ExtraStats } from '@/systems/stats';

interface Props {
  metrics: UserMetrics;
  streaks: StreakStats;
  peaks: Peaks;
  sessions: SessionStats;
  extras: ExtraStats;
}

export default function StatCardGrid({
  metrics,
  streaks,
  peaks,
  sessions,
  extras,
}: Props): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-stat-grid>
      {/* Row 1 — core 4 */}
      <StatCard
        label="Net change"
        value={formatSignedChips(metrics.netChange)}
        tone={metrics.netChange > 0 ? 'positive' : metrics.netChange < 0 ? 'negative' : 'neutral'}
      />
      <StatCard label="Rounds played" value={formatChips(metrics.totalRounds)} />
      <StatCard label="Total wagered" value={formatChips(metrics.totalWagered)} />
      <StatCard
        label="RTP"
        value={formatPercent(metrics.rtp)}
        sub={`won ${formatChips(metrics.totalWon)}`}
      />

      {/* Row 2 — core remainders + time */}
      <StatCard label="Total won" value={formatChips(metrics.totalWon)} />
      <StatCard label="Total lost" value={formatChips(metrics.totalLost)} />
      <StatCard label="Time played" value={formatDuration(metrics.timePlayedMs)} />
      <StatCard
        label="Win rate"
        value={formatPercent(extras.winRate)}
        sub={extras.winRate === null ? undefined : 'excludes pushes'}
      />

      {/* Row 3 — peaks */}
      <StatCard
        label="Biggest win"
        value={formatSignedChips(peaks.biggestWin)}
        tone={peaks.biggestWin > 0 ? 'positive' : 'neutral'}
        sub={formatDate(peaks.biggestWinAt)}
      />
      <StatCard
        label="Biggest loss"
        value={peaks.biggestLoss > 0 ? `-${formatChips(peaks.biggestLoss)}` : '0'}
        tone={peaks.biggestLoss > 0 ? 'negative' : 'neutral'}
        sub={formatDate(peaks.biggestLossAt)}
      />
      <StatCard label="Highest balance" value={formatChips(peaks.highestBalance)} />
      <StatCard label="Avg bet" value={formatChips(extras.avgBetSize)} />

      {/* Row 4 — streaks + sessions */}
      <StatCard label="Win streak" value={formatChips(streaks.longestWin)} />
      <StatCard label="Loss streak" value={formatChips(streaks.longestLoss)} />
      <StatCard
        label="Best session"
        value={formatSignedChips(sessions.best)}
        tone={sessions.best > 0 ? 'positive' : 'neutral'}
        sub={`${sessions.count} sessions`}
      />
      <StatCard
        label="Worst session"
        value={formatSignedChips(sessions.worst)}
        tone={sessions.worst < 0 ? 'negative' : 'neutral'}
      />
    </div>
  );
}
