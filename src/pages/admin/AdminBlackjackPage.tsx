import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import StatCard from '@/pages/admin/StatCard';
import BlackjackHandOutcomeBar from '@/components/charts/BlackjackHandOutcomeBar';
import DateRangeFilter, {
  rangeToSinceMs,
  type RangePreset,
} from '@/components/admin/DateRangeFilter';
import TopPlayersPanel from '@/components/admin/TopPlayersPanel';
import {
  getBlackjackAllTimeStats,
  getBlackjackHandOutcomeDistribution,
  type BlackjackAllTimeStats,
  type BlackjackHandOutcome,
} from '@/systems/stats';
import { db } from '@/db';
import type { Round } from '@/db';

const EMPTY_STATS: BlackjackAllTimeStats = {
  hands: 0,
  totalWagered: 0,
  totalPaid: 0,
  netHouseChips: 0,
  netPlayerChips: 0,
  actualRtp: null,
  winRate: null,
  bustRate: null,
  splitRate: null,
  biggestHandWon: 0,
  avgHandValue: 0,
};
const EMPTY_OUTCOMES: readonly BlackjackHandOutcome[] = [];
const EMPTY_ROUNDS: readonly Round[] = [];

/**
 * Phase 15 #14.5 PR B — NEW admin page for Blackjack. Mirrors the AdminPlinkoPage
 * layout: 4-StatCard top row + hero chart + secondary panels + recent table.
 * Adds the per-user TopPlayersPanel drill-down + a 5-KPI secondary StatCard
 * grid (avg hand value, win rate, bust rate, split rate, biggest hand won).
 */
export default function AdminBlackjackPage(): JSX.Element {
  const [range, setRange] = useState<RangePreset>('all');
  const sinceMs = useMemo(() => rangeToSinceMs(range), [range]);

  // Phase 9 lesson — let useLiveQuery infer T; do NOT pass an explicit generic.
  const stats = useLiveQuery(() => getBlackjackAllTimeStats(sinceMs), [sinceMs], EMPTY_STATS);
  const outcomes = useLiveQuery(
    () => getBlackjackHandOutcomeDistribution(sinceMs),
    [sinceMs],
    EMPTY_OUTCOMES,
  );
  const recentRounds = useLiveQuery(
    async () => {
      const all = await db.rounds.where('game').equals('blackjack').toArray();
      return all.sort((a, b) => b.playedAt - a.playedAt).slice(0, 20);
    },
    [],
    EMPTY_ROUNDS,
  );
  const filteredRecent = useMemo(
    () => (sinceMs !== undefined ? recentRounds.filter((r) => r.playedAt > sinceMs) : recentRounds),
    [recentRounds, sinceMs],
  );

  const houseNetTone: 'positive' | 'negative' | 'neutral' =
    stats.netHouseChips > 0 ? 'positive' : stats.netHouseChips < 0 ? 'negative' : 'neutral';
  const houseNetSub =
    stats.netHouseChips > 0
      ? 'House ahead'
      : stats.netHouseChips < 0
        ? 'House behind'
        : 'Break-even';
  const rtpDisplay = stats.actualRtp === null ? '—' : `${(stats.actualRtp * 100).toFixed(1)}%`;
  const winRateDisplay = stats.winRate === null ? '—' : `${(stats.winRate * 100).toFixed(1)}%`;
  const bustRateDisplay = stats.bustRate === null ? '—' : `${(stats.bustRate * 100).toFixed(1)}%`;
  const splitRateDisplay =
    stats.splitRate === null ? '—' : `${(stats.splitRate * 100).toFixed(1)}%`;
  const avgHandDisplay = stats.avgHandValue === 0 ? '—' : stats.avgHandValue.toLocaleString();
  const biggestHandDisplay =
    stats.biggestHandWon === 0 ? '—' : `+${stats.biggestHandWon.toLocaleString()}`;

  return (
    <div className="flex flex-col gap-6" data-admin-blackjack>
      <h1 className="font-display text-base tracking-wider text-gold-bright">BLACKJACK</h1>

      <DateRangeFilter value={range} onChange={setRange} storageKey="admin.blackjack.range" />

      {/* Top row: 4 StatCards (matches every other admin page) */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard label="Hands played" value={stats.hands.toLocaleString()} />
        <StatCard label="Total wagered" value={stats.totalWagered.toLocaleString()} />
        <StatCard
          label="House net chips"
          value={
            stats.netHouseChips >= 0
              ? `+${stats.netHouseChips.toLocaleString()}`
              : stats.netHouseChips.toLocaleString()
          }
          tone={houseNetTone}
          sub={houseNetSub}
        />
        <StatCard label="Actual RTP" value={rtpDisplay} sub="target ~99%" />
      </div>

      {/* Hero chart — hand outcome distribution */}
      <section aria-label="Hand outcome distribution">
        <h2 className="mb-2 font-display text-xs tracking-wider text-ivory/60">HAND OUTCOMES</h2>
        <div className="rounded-md border border-brass/60 bg-velvet-deep p-4">
          {stats.hands === 0 ? (
            <p className="py-8 text-center text-xs text-ivory/40">
              No blackjack hands recorded yet.
            </p>
          ) : (
            <BlackjackHandOutcomeBar data={outcomes} />
          )}
        </div>
      </section>

      {/* New KPI grid (secondary StatCard row) */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5" data-admin-kpi-grid>
        <StatCard label="Avg hand value" value={avgHandDisplay} />
        <StatCard label="Win rate" value={winRateDisplay} />
        <StatCard label="Bust rate" value={bustRateDisplay} />
        <StatCard label="Split rate" value={splitRateDisplay} />
        <StatCard label="Biggest hand won" value={biggestHandDisplay} />
      </div>

      <TopPlayersPanel game="blackjack" {...(sinceMs !== undefined ? { sinceMs } : {})} />

      {/* Recent rounds table */}
      <section aria-label="Recent blackjack hands">
        <h2 className="mb-2 font-display text-xs tracking-wider text-ivory/60">
          RECENT HANDS (LAST 20)
        </h2>
        {filteredRecent.length === 0 ? (
          <p className="text-xs text-ivory/40">No hands recorded.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-brass/30 uppercase tracking-wider text-ivory/40">
                <th className="py-2 pr-3">Played at</th>
                <th className="py-2 pr-3 text-right">Bet</th>
                <th className="py-2 pr-3 text-right">Payout</th>
                <th className="py-2 text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecent.map((r) => {
                const net = r.netChange;
                return (
                  <tr key={r.id} className="border-b border-brass/10">
                    <td className="py-1.5 pr-3 tabular-nums text-ivory/70">
                      {new Date(r.playedAt).toISOString().slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-ivory/85">
                      {r.betAmount.toLocaleString()}
                    </td>
                    <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-gold-bright">
                      {r.payout.toLocaleString()}
                    </td>
                    <td
                      className={`py-1.5 text-right font-mono tabular-nums ${
                        net > 0 ? 'text-chip-win' : net < 0 ? 'text-casino-red' : 'text-ivory/60'
                      }`}
                    >
                      {net > 0 ? '+' : ''}
                      {net.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
