import type { JSX } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import StatCard from './StatCard';
import NetFlowLine from '@/components/charts/NetFlowLine';
import WinnersLosersBar from '@/components/charts/WinnersLosersBar';
import GameDistributionDonut from '@/components/charts/GameDistributionDonut';
import DailyActivitySparkline from '@/components/charts/DailyActivitySparkline';
import {
  getDailyActivity,
  getGameDistribution,
  getNetFlowSeries,
  getRecentAdjustments,
  getSiteWideStats,
  getTopGamesBySessions,
  getTopLosers,
  getTopWinners,
  type DailyActivityPoint,
  type GameDistributionPoint,
  type NetFlowPoint,
  type RecentAdjustmentRow,
  type SiteWideStats,
  type TopGameRow,
  type UserStatsRow,
} from '@/systems/stats';

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
const EMPTY_TOP_GAMES: TopGameRow[] = [];
const EMPTY_ACTIVITY: DailyActivityPoint[] = [];
const EMPTY_ADJUSTMENTS: RecentAdjustmentRow[] = [];

export default function AdminOverviewPage(): JSX.Element {
  const stats: SiteWideStats = useLiveQuery(getSiteWideStats, [], ZERO_STATS);
  const netFlow: NetFlowPoint[] = useLiveQuery(getNetFlowSeries, [], EMPTY_NET_FLOW);
  const winners: UserStatsRow[] = useLiveQuery(() => getTopWinners(5), [], EMPTY_USERS);
  const losers: UserStatsRow[] = useLiveQuery(() => getTopLosers(5), [], EMPTY_USERS);
  const distribution: GameDistributionPoint[] = useLiveQuery(getGameDistribution, [], EMPTY_DIST);
  const topGames: TopGameRow[] = useLiveQuery(() => getTopGamesBySessions(3), [], EMPTY_TOP_GAMES);
  const activity: DailyActivityPoint[] = useLiveQuery(
    () => getDailyActivity(14),
    [],
    EMPTY_ACTIVITY,
  );
  const recentAdjustments: RecentAdjustmentRow[] = useLiveQuery(
    () => getRecentAdjustments(10),
    [],
    EMPTY_ADJUSTMENTS,
  );

  // House net = − sum of user net (player wins = house losses).
  const houseNet = -stats.totalNetChange;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-base tracking-wider text-gold-bright">OVERVIEW</h1>
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

      <section aria-label="Top games by sessions">
        <h2 className="mb-2 font-display text-xs tracking-wider text-ivory/60">
          TOP GAMES BY SESSIONS
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {topGames.length === 0 ? (
            <p className="col-span-full py-4 text-center text-xs text-ivory/40">No sessions yet.</p>
          ) : (
            topGames.map((g) => (
              <div
                key={g.game}
                className="rounded-md border border-brass/60 bg-velvet-deep p-4"
                data-top-game={g.game}
              >
                <div className="font-display text-xs uppercase tracking-[0.18em] text-gold-bright">
                  {g.game.replace('-', ' ')}
                </div>
                <div className="mt-1 font-mono text-lg tabular-nums text-ivory">
                  {g.sessions.toLocaleString()}
                </div>
                <div className="text-xs text-ivory/55">sessions</div>
                <div
                  className={[
                    'mt-1 font-mono text-xs tabular-nums',
                    g.houseNet >= 0 ? 'text-chip-win' : 'text-casino-red',
                  ].join(' ')}
                >
                  House {g.houseNet >= 0 ? '+' : ''}
                  {g.houseNet.toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section aria-label="Daily activity">
        <h2 className="mb-2 font-display text-xs tracking-wider text-ivory/60">
          ACTIVITY (LAST 14 DAYS)
        </h2>
        <div className="rounded-md border border-brass/60 bg-velvet-deep p-4">
          <DailyActivitySparkline data={activity} />
        </div>
      </section>

      <section aria-label="Recent adjustments">
        <h2 className="mb-2 font-display text-xs tracking-wider text-ivory/60">
          RECENT ADJUSTMENTS
        </h2>
        <div className="rounded-md border border-brass/60 bg-velvet-deep p-4">
          {recentAdjustments.length === 0 ? (
            <p className="py-4 text-center text-xs text-ivory/40">No adjustments recorded.</p>
          ) : (
            <ul className="divide-y divide-brass/20" data-recent-adjustments>
              {recentAdjustments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 py-2 text-xs"
                  data-recent-adjustment-id={a.id}
                >
                  <span className="tabular-nums text-ivory/55">
                    {new Date(a.adjustedAt).toISOString().slice(0, 19).replace('T', ' ')}
                  </span>
                  <span className="flex-1 truncate text-ivory">{a.targetUser}</span>
                  <span
                    className={[
                      'font-mono tabular-nums',
                      a.amount >= 0 ? 'text-chip-win' : 'text-casino-red',
                    ].join(' ')}
                  >
                    {a.amount >= 0 ? '+' : ''}
                    {a.amount.toLocaleString()}
                  </span>
                  <span className="truncate text-ivory/55">{a.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-display text-xs tracking-wider text-ivory/60">NET FLOW</h2>
        <NetFlowLine data={netFlow} />
      </section>

      <section>
        <h2 className="mb-2 font-display text-xs tracking-wider text-ivory/60">
          TOP WINNERS / LOSERS
        </h2>
        <WinnersLosersBar winners={winners} losers={losers} />
      </section>

      <section>
        <h2 className="mb-2 font-display text-xs tracking-wider text-ivory/60">
          GAME DISTRIBUTION
        </h2>
        <GameDistributionDonut data={distribution} />
      </section>
    </div>
  );
}
