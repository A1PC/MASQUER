import type { JSX } from 'react';
import { useParams } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCurrentUser } from '@/store/sessionStore';
import { useStatsViewMode } from '@/store/uiStore';
import type { Round } from '@/db';
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

type Game = Round['game'];

const GAME_LABELS: Record<Game, string> = {
  blackjack: 'Blackjack',
  roulette: 'Roulette',
  slots: 'Slots',
  baccarat: 'Baccarat',
  'coin-flip': 'Coin Flip',
};

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

export default function StatsPerGamePage(): JSX.Element | null {
  const user = useCurrentUser();
  const mode = useStatsViewMode();
  const { game } = useParams<{ game: Game }>();
  const userId = user?.id ?? '';

  const metrics: UserMetrics = useLiveQuery(
    () => getUserMetrics(userId, game),
    [userId, game],
    EMPTY_METRICS,
  );
  const streaks: StreakStats = useLiveQuery(
    () => getUserStreaks(userId, game),
    [userId, game],
    EMPTY_STREAKS,
  );
  const peaks: Peaks = useLiveQuery(() => getUserPeaks(userId, game), [userId, game], EMPTY_PEAKS);
  const sessions: SessionStats = useLiveQuery(
    () => getUserSessionStats(userId, game),
    [userId, game],
    EMPTY_SESSIONS,
  );
  const extras: ExtraStats = useLiveQuery(
    () => getUserExtras(userId, game),
    [userId, game],
    EMPTY_EXTRAS,
  );

  if (!user || !game) return null;
  const label = GAME_LABELS[game];
  if (metrics.totalRounds === 0) {
    return <EmptyState gameName={label} ctaTo={`/play/${game}`} />;
  }

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
