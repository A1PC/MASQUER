import type { JSX } from 'react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Adjustment, type Round } from '@/db';
import { banUser, unbanUser } from '@/systems/admin';
import StatCard from './StatCard';
import UserActivityLine from './charts/UserActivityLine';
import GameDistributionDonut from './charts/GameDistributionDonut';
import AdjustCreditsModal from './AdjustCreditsModal';
import {
  getUserGameDistribution,
  getUserGameTime,
  getUserNetFlowSeries,
  getUserSessionTime,
  getUserStatsRow,
  type GameDistributionPoint,
  type NetFlowPoint,
  type UserStatsRow,
} from './queries';

type GameTime = { game: Round['game']; durationMs: number };

const EMPTY_SERIES: NetFlowPoint[] = [];
const EMPTY_DIST: GameDistributionPoint[] = [];
const EMPTY_TIMES: GameTime[] = [];
const EMPTY_ADJ: Adjustment[] = [];

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec % 60}s`;
  return `${sec}s`;
}

export default function AdminUserPage(): JSX.Element {
  const { id = '' } = useParams<{ id: string }>();
  const [adjustOpen, setAdjustOpen] = useState(false);

  const stats: UserStatsRow | null | undefined = useLiveQuery(() => getUserStatsRow(id), [id]);
  const series: NetFlowPoint[] = useLiveQuery(() => getUserNetFlowSeries(id), [id], EMPTY_SERIES);
  const dist: GameDistributionPoint[] = useLiveQuery(
    () => getUserGameDistribution(id),
    [id],
    EMPTY_DIST,
  );
  const times: GameTime[] = useLiveQuery(() => getUserGameTime(id), [id], EMPTY_TIMES);
  const totalSessionMs: number = useLiveQuery(() => getUserSessionTime(id), [id], 0);
  const adjustments: Adjustment[] = useLiveQuery(
    () =>
      db.adjustments
        .where('[userId+adjustedAt]')
        .between([id, 0], [id, Infinity])
        .reverse()
        .toArray(),
    [id],
    EMPTY_ADJ,
  );

  if (stats === undefined) {
    return <div className="text-sm text-white/60">Loading…</div>;
  }
  if (stats === null) {
    return <div className="text-sm text-white/60">User not found.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-base tracking-wider text-gold">
          {stats.username}
          {stats.isBanned && (
            <span className="ml-3 rounded-sm bg-casino-red/20 px-2 py-0.5 text-xs uppercase tracking-wider text-casino-red">
              Banned
            </span>
          )}
        </h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              void (stats.isBanned ? unbanUser(stats.userId) : banUser(stats.userId));
            }}
            className="rounded-sm border border-white/20 px-3 py-2 text-xs uppercase tracking-wider text-white/70 hover:bg-white/5"
          >
            {stats.isBanned ? 'Unban' : 'Ban'}
          </button>
          <button
            type="button"
            onClick={() => setAdjustOpen(true)}
            className="rounded-sm bg-gold px-3 py-2 text-xs uppercase tracking-wider text-felt-deep hover:bg-gold-bright"
          >
            Adjust credits
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Balance" value={stats.currentBalance.toLocaleString()} />
        <StatCard
          label="Net change"
          value={(stats.totalNetChange > 0 ? '+' : '') + stats.totalNetChange.toLocaleString()}
          tone={
            stats.totalNetChange > 0
              ? 'positive'
              : stats.totalNetChange < 0
                ? 'negative'
                : 'neutral'
          }
          sub={`${stats.totalRounds} rounds`}
        />
        <StatCard label="Logins" value={stats.loginCount} />
        <StatCard label="Time on site" value={formatDuration(totalSessionMs)} />
      </div>

      <section>
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">ACTIVITY</h2>
        <UserActivityLine data={series} />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">ROUNDS BY GAME</h2>
          <GameDistributionDonut data={dist} />
        </div>
        <div>
          <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">TIME BY GAME</h2>
          <ul className="text-sm text-white/80">
            {times.length === 0 && (
              <li className="text-xs text-white/40">No game visits recorded yet.</li>
            )}
            {times.map((t) => (
              <li key={t.game} className="flex justify-between border-b border-white/5 py-1">
                <span className="capitalize">{t.game}</span>
                <span>{formatDuration(t.durationMs)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
          ADJUSTMENT HISTORY
        </h2>
        {adjustments.length === 0 ? (
          <p className="text-xs text-white/40">No admin adjustments yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gold/30 text-xs uppercase tracking-wider text-white/50">
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Amount</th>
                <th className="py-2 pr-3">Reason</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((a) => (
                <tr key={a.id} className="border-b border-white/5">
                  <td className="py-2 pr-3 text-white/60">
                    {new Date(a.adjustedAt).toISOString().slice(0, 19).replace('T', ' ')}
                  </td>
                  <td className={`py-2 pr-3 ${a.amount > 0 ? 'text-chip-win' : 'text-casino-red'}`}>
                    {a.amount > 0 ? '+' : ''}
                    {a.amount}
                  </td>
                  <td className="py-2 pr-3">{a.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <AdjustCreditsModal
        open={adjustOpen}
        userId={stats.userId}
        username={stats.username}
        onClose={() => setAdjustOpen(false)}
      />
    </div>
  );
}
