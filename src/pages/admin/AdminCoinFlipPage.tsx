import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import StatCard from '@/pages/admin/StatCard';
import CoinFlipFaceDistributionBar from '@/components/charts/CoinFlipFaceDistributionBar';
import DateRangeFilter, {
  rangeToSinceMs,
  type RangePreset,
} from '@/components/admin/DateRangeFilter';
import TopPlayersPanel from '@/components/admin/TopPlayersPanel';
import {
  getCoinFlipAllTimeStats,
  getCoinFlipFaceDistribution,
  type CoinFlipAllTimeStats,
  type CoinFlipFaceCount,
  type CoinSide,
} from '@/systems/stats';
import { db } from '@/db';
import type { Round } from '@/db';

interface PersistedCoinFlipDetails {
  readonly call: CoinSide;
  readonly landed: CoinSide;
}

const EMPTY_STATS: CoinFlipAllTimeStats = {
  flips: 0,
  totalWagered: 0,
  totalPaid: 0,
  netHouseChips: 0,
  netPlayerChips: 0,
  actualRtp: null,
  longestStreak: 0,
  headsCallRate: null,
  tailsCallRate: null,
  avgBet: 0,
  biggestSingleWin: 0,
};
const EMPTY_FACES: readonly CoinFlipFaceCount[] = [];
const EMPTY_ROUNDS: readonly Round[] = [];

const FACE_LABEL: Record<CoinSide, string> = { heads: 'Heads', tails: 'Tails' };

/**
 * Phase 15 #14.5 PR B — NEW admin page for Coin-flip. Mirrors AdminBlackjackPage:
 * 4-StatCard top row + hero face-distribution chart + 5 KPIs in the secondary
 * grid + TopPlayersPanel drill-down + last-20 flips table.
 */
export default function AdminCoinFlipPage(): JSX.Element {
  const [range, setRange] = useState<RangePreset>('all');
  const sinceMs = useMemo(() => rangeToSinceMs(range), [range]);

  const stats = useLiveQuery(() => getCoinFlipAllTimeStats(sinceMs), [sinceMs], EMPTY_STATS);
  const faces = useLiveQuery(() => getCoinFlipFaceDistribution(sinceMs), [sinceMs], EMPTY_FACES);
  const recentRounds = useLiveQuery(
    async () => {
      const all = await db.rounds.where('game').equals('coin-flip').toArray();
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
  const headsCallDisplay =
    stats.headsCallRate === null ? '—' : `${(stats.headsCallRate * 100).toFixed(1)}%`;
  const tailsCallDisplay =
    stats.tailsCallRate === null ? '—' : `${(stats.tailsCallRate * 100).toFixed(1)}%`;
  const avgBetDisplay = stats.avgBet === 0 ? '—' : stats.avgBet.toLocaleString();
  const biggestWinDisplay =
    stats.biggestSingleWin === 0 ? '—' : `+${stats.biggestSingleWin.toLocaleString()}`;

  return (
    <div className="flex flex-col gap-6" data-admin-coin-flip>
      <h1 className="font-display text-base tracking-wider text-gold-bright">COIN-FLIP</h1>

      <DateRangeFilter value={range} onChange={setRange} storageKey="admin.coin-flip.range" />

      {/* Top row: 4 StatCards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard label="Flips played" value={stats.flips.toLocaleString()} />
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
        <StatCard label="Actual RTP" value={rtpDisplay} sub="target 100% (fair coin)" />
      </div>

      {/* Hero chart — landed face distribution */}
      <section aria-label="Coin face distribution">
        <h2 className="mb-2 font-display text-xs tracking-wider text-ivory/60">
          LANDED FACE DISTRIBUTION
        </h2>
        <div className="rounded-md border border-brass/60 bg-velvet-deep p-4">
          {stats.flips === 0 ? (
            <p className="py-8 text-center text-xs text-ivory/40">No coin flips recorded yet.</p>
          ) : (
            <CoinFlipFaceDistributionBar data={faces} />
          )}
        </div>
      </section>

      {/* New KPI grid (secondary StatCard row) */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5" data-admin-kpi-grid>
        <StatCard label="Longest streak" value={stats.longestStreak.toLocaleString()} />
        <StatCard label="Heads-call rate" value={headsCallDisplay} />
        <StatCard label="Tails-call rate" value={tailsCallDisplay} />
        <StatCard label="Avg bet" value={avgBetDisplay} />
        <StatCard label="Biggest single win" value={biggestWinDisplay} />
      </div>

      <TopPlayersPanel game="coin-flip" {...(sinceMs !== undefined ? { sinceMs } : {})} />

      {/* Recent flips table */}
      <section aria-label="Recent coin flips">
        <h2 className="mb-2 font-display text-xs tracking-wider text-ivory/60">
          RECENT FLIPS (LAST 20)
        </h2>
        {filteredRecent.length === 0 ? (
          <p className="text-xs text-ivory/40">No flips yet.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-brass/30 uppercase tracking-wider text-ivory/40">
                <th className="py-2 pr-3">Played at</th>
                <th className="py-2 pr-3">Called</th>
                <th className="py-2 pr-3">Landed</th>
                <th className="py-2 pr-3 text-right">Bet</th>
                <th className="py-2 pr-3 text-right">Payout</th>
                <th className="py-2 text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecent.map((r) => {
                const d = r.details as PersistedCoinFlipDetails | undefined;
                const callLabel = d?.call ? FACE_LABEL[d.call] : '—';
                const landedLabel = d?.landed ? FACE_LABEL[d.landed] : '—';
                const net = r.netChange;
                return (
                  <tr key={r.id} className="border-b border-brass/10">
                    <td className="py-1.5 pr-3 tabular-nums text-ivory/70">
                      {new Date(r.playedAt).toISOString().slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className="py-1.5 pr-3 text-ivory/85">{callLabel}</td>
                    <td className="py-1.5 pr-3 text-ivory">{landedLabel}</td>
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
