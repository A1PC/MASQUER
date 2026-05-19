import type { JSX } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import StatCard from './StatCard';
import NetFlowLine from '@/components/charts/NetFlowLine';
import WinnersLosersBar from '@/components/charts/WinnersLosersBar';
import GameDistributionDonut from '@/components/charts/GameDistributionDonut';
import {
  getGameDistribution,
  getNetFlowSeries,
  getSiteWideStats,
  getTopLosers,
  getTopWinners,
  type SiteWideStats,
  type NetFlowPoint,
  type GameDistributionPoint,
  type UserStatsRow,
} from './queries';

const ZERO_STATS: SiteWideStats = {
  userCount: 0,
  totalWagered: 0,
  totalPaidOut: 0,
  totalNetChange: 0,
  totalRounds: 0,
};
const EMPTY_NET_FLOW: NetFlowPoint[] = [];
const EMPTY_USERS: UserStatsRow[] = [];
const EMPTY_DIST: GameDistributionPoint[] = [];

export default function AdminOverviewPage(): JSX.Element {
  const stats: SiteWideStats = useLiveQuery(getSiteWideStats, [], ZERO_STATS);
  const netFlow: NetFlowPoint[] = useLiveQuery(getNetFlowSeries, [], EMPTY_NET_FLOW);
  const winners: UserStatsRow[] = useLiveQuery(() => getTopWinners(5), [], EMPTY_USERS);
  const losers: UserStatsRow[] = useLiveQuery(() => getTopLosers(5), [], EMPTY_USERS);
  const distribution: GameDistributionPoint[] = useLiveQuery(getGameDistribution, [], EMPTY_DIST);

  // House net = − sum of user net (player wins = house losses).
  const houseNet = -stats.totalNetChange;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-base tracking-wider text-gold">OVERVIEW</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Users" value={stats.userCount} sub={`${stats.totalRounds} rounds`} />
        <StatCard label="Total wagered" value={stats.totalWagered.toLocaleString()} />
        <StatCard label="Total paid out" value={stats.totalPaidOut.toLocaleString()} />
        <StatCard
          label="Net house"
          value={houseNet.toLocaleString()}
          tone={houseNet >= 0 ? 'positive' : 'negative'}
        />
      </div>

      <section>
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">NET FLOW</h2>
        <NetFlowLine data={netFlow} />
      </section>

      <section>
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
          TOP WINNERS / LOSERS
        </h2>
        <WinnersLosersBar winners={winners} losers={losers} />
      </section>

      <section>
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
          GAME DISTRIBUTION
        </h2>
        <GameDistributionDonut data={distribution} />
      </section>
    </div>
  );
}
