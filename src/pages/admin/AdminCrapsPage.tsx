import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import StatCard from '@/pages/admin/StatCard';
import CrapsBetTypeFrequencyBar from '@/components/charts/CrapsBetTypeFrequencyBar';
import DateRangeFilter, {
  rangeToSinceMs,
  type RangePreset,
} from '@/components/admin/DateRangeFilter';
import TopPlayersPanel from '@/components/admin/TopPlayersPanel';
import {
  getCrapsAllTimeStats,
  getCrapsBetTypeFrequency,
  getCrapsBiggestSessionWins,
  type CrapsAllTimeStats,
  type CrapsBetTypeWagered,
  type CrapsBiggestSession,
  type CrapsTier,
} from '@/systems/stats';
import { db } from '@/db';
import type { Round } from '@/db';

/**
 * Shape of `rounds.details` for a craps row — flattened at persist time in
 * `src/games/craps/CrapsPage.tsx`'s `doSettle`. Mirrored in
 * `src/systems/stats.ts` (`PersistedCrapsDetails`) and the stats test
 * fixtures. The persisted shape is FLAT, not the nested in-memory
 * `CrapsContext` (re: baccarat #249 / plinko / poker lesson).
 *
 * `betTypeWagered` is the additive PR-A field — pre-PR-A sessions don't
 * carry it, so the recent-sessions table never relies on it.
 */
interface PersistedCrapsDetails {
  readonly tier: CrapsTier;
  readonly rollsPlayed: number;
  readonly rebuys: number;
  readonly biggestRollWin: number;
  readonly sessionId: string;
  readonly betTypeWagered?: Record<string, number>;
}

const EMPTY_STATS: CrapsAllTimeStats = {
  sessions: 0,
  totalRolls: 0,
  totalWagered: 0,
  totalPaid: 0,
  netHouseChips: 0,
  netPlayerChips: 0,
  actualRtp: null,
  biggestRollWin: 0,
  // Phase 15 #14.5 PR B — additive KPI defaults.
  avgRollsPerSession: 0,
  sevenOutRate: null,
  pointMadeRate: null,
  betTypeVariety: 0,
};
const EMPTY_FREQ: readonly CrapsBetTypeWagered[] = [];
const EMPTY_BIGGEST: readonly CrapsBiggestSession[] = [];
const EMPTY_ROUNDS: readonly Round[] = [];

const TIER_LABEL: Record<CrapsTier, string> = {
  low: 'Low',
  mid: 'Mid',
  high: 'High',
};

function formatTimestamp(ms: number): string {
  return new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
}

export default function AdminCrapsPage(): JSX.Element {
  // Phase 15 #14 PR B — shared date-range filter persisted across mounts.
  const [range, setRange] = useState<RangePreset>('all');
  const sinceMs = useMemo(() => rangeToSinceMs(range), [range]);

  // Phase 9 lesson — let useLiveQuery infer T from the querier's Promise<T>
  // return; do NOT pass an explicit generic. (Mirrors the other admin
  // pages.)
  const stats = useLiveQuery(() => getCrapsAllTimeStats(sinceMs), [sinceMs], EMPTY_STATS);
  const frequency = useLiveQuery(() => getCrapsBetTypeFrequency(), [], EMPTY_FREQ);
  const biggestSessions = useLiveQuery(() => getCrapsBiggestSessionWins(10), [], EMPTY_BIGGEST);
  // Load-all + sort by playedAt desc + slice(20) — #250 pattern; do NOT use
  // `.where(...).reverse().limit(...)` (ties-break by primary key, not
  // chronologically). Admin pages tolerate the full scan.
  const recentRounds = useLiveQuery(
    async () => {
      const all = await db.rounds.where('game').equals('craps').toArray();
      return all.sort((a, b) => b.playedAt - a.playedAt).slice(0, 20);
    },
    [],
    EMPTY_ROUNDS,
  );
  const filteredRecent = useMemo(
    () => (sinceMs !== undefined ? recentRounds.filter((r) => r.playedAt > sinceMs) : recentRounds),
    [recentRounds, sinceMs],
  );

  const rtpDisplay = stats.actualRtp === null ? '—' : `${(stats.actualRtp * 100).toFixed(1)}%`;

  // Casino-operator perspective (matches every other admin page): house ahead
  // reads GREEN, house behind reads RED.
  const houseNetTone: 'positive' | 'negative' | 'neutral' =
    stats.netHouseChips > 0 ? 'positive' : stats.netHouseChips < 0 ? 'negative' : 'neutral';
  const houseNetSub =
    stats.netHouseChips > 0
      ? 'House ahead'
      : stats.netHouseChips < 0
        ? 'House behind'
        : 'Break-even';

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-base tracking-wider text-gold-bright">CRAPS</h1>

      <DateRangeFilter value={range} onChange={setRange} storageKey="admin.craps.range" />

      {/* 4 StatCards row */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard label="Sessions played" value={stats.sessions.toLocaleString()} />
        <StatCard label="Total rolls" value={stats.totalRolls.toLocaleString()} />
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
        <StatCard label="Actual RTP" value={rtpDisplay} sub="all sessions, all bets" />
      </div>

      {/* Hero chart — total chips wagered per bet type. Graceful empty state
          when no session has persisted the additive betTypeWagered field
          yet (handled inside the chart wrapper). */}
      <section aria-label="Craps bet-type frequency">
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
          BET-TYPE FREQUENCY (CHIPS WAGERED)
        </h2>
        <div className="rounded-md border border-gold/30 bg-felt-deep p-4">
          <CrapsBetTypeFrequencyBar data={frequency} />
        </div>
      </section>

      {/* Biggest sessions panel — top 10 by net win across all tiers. */}
      <section aria-label="Biggest craps session wins">
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
          BIGGEST SESSION WINS (TOP 10)
        </h2>
        <div className="rounded-md border border-gold/30 bg-felt-deep p-4">
          {biggestSessions.length === 0 ? (
            <p className="py-4 text-center text-xs text-white/40">No winning sessions yet.</p>
          ) : (
            <table className="w-full text-left text-xs" data-biggest-sessions>
              <thead>
                <tr className="border-b border-gold/30 uppercase tracking-wider text-white/40">
                  <th className="py-2 pr-3 text-right">#</th>
                  <th className="py-2 pr-3 text-right">Net</th>
                  <th className="py-2 pr-3">Tier</th>
                  <th className="py-2">Played at</th>
                </tr>
              </thead>
              <tbody>
                {biggestSessions.map((s, i) => (
                  <tr key={`${s.playedAt}-${i}`} className="border-b border-white/5">
                    <td className="py-1.5 pr-3 text-right tabular-nums text-white/60">{i + 1}</td>
                    <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-gold-bright">
                      +{s.net.toLocaleString()}
                    </td>
                    <td className="py-1.5 pr-3 text-ivory">{TIER_LABEL[s.tier]}</td>
                    <td className="py-1.5 tabular-nums text-white/70">
                      {formatTimestamp(s.playedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Recent sessions table (last 20). */}
      <section aria-label="Recent craps sessions">
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
          RECENT SESSIONS (LAST 20)
        </h2>
        {filteredRecent.length === 0 ? (
          <p className="text-xs text-white/40">No sessions yet.</p>
        ) : (
          <table className="w-full text-left text-xs" data-recent-sessions>
            <thead>
              <tr className="border-b border-gold/30 uppercase tracking-wider text-white/40">
                <th className="py-2 pr-3">Time</th>
                <th className="py-2 pr-3">Tier</th>
                <th className="py-2 pr-3 text-right">Bought in</th>
                <th className="py-2 pr-3 text-right">Final</th>
                <th className="py-2 pr-3 text-right">Net</th>
                <th className="py-2 text-right">Rolls</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecent.map((r) => {
                const d = r.details as PersistedCrapsDetails | undefined;
                const tier = d?.tier ?? null;
                const rollsPlayed = d?.rollsPlayed ?? 0;
                const net = r.payout - r.betAmount;
                return (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="py-1.5 pr-3 tabular-nums text-white/70">
                      {formatTimestamp(r.playedAt)}
                    </td>
                    <td className="py-1.5 pr-3 text-ivory">{tier ? TIER_LABEL[tier] : '—'}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">
                      {r.betAmount.toLocaleString()}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">
                      {r.payout.toLocaleString()}
                    </td>
                    <td
                      className={`py-1.5 pr-3 text-right tabular-nums ${
                        net > 0 ? 'text-chip-win' : net < 0 ? 'text-casino-red' : 'text-white/60'
                      }`}
                    >
                      {net > 0 ? '+' : ''}
                      {net.toLocaleString()}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-ivory/80">{rollsPlayed}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Phase 15 #14.5 PR B — NEW additive sections (KPI grid + per-user
          drill-down). Spec §4.3.4 skips a new chart for Craps because
          CrapsBetTypeFrequencyBar (above) already covers the slot. None of
          the existing StatCards / hero bet-type chart / biggest-sessions
          panel / recent-sessions table is modified or moved. */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5" data-admin-kpi-grid>
        <StatCard
          label="Avg rolls / session"
          value={stats.avgRollsPerSession === 0 ? '—' : stats.avgRollsPerSession.toLocaleString()}
        />
        <StatCard
          label="Seven-out rate"
          value={stats.sevenOutRate === null ? '—' : `${(stats.sevenOutRate * 100).toFixed(1)}%`}
          sub="not tracked yet"
        />
        <StatCard
          label="Point-made rate"
          value={stats.pointMadeRate === null ? '—' : `${(stats.pointMadeRate * 100).toFixed(1)}%`}
          sub="not tracked yet"
        />
        <StatCard
          label="Bet-type variety"
          value={stats.betTypeVariety.toLocaleString()}
          sub="distinct bet types"
        />
        <StatCard
          label="Biggest single roll"
          value={stats.biggestRollWin === 0 ? '—' : `+${stats.biggestRollWin.toLocaleString()}`}
        />
      </div>

      <TopPlayersPanel game="craps" {...(sinceMs !== undefined ? { sinceMs } : {})} />
    </div>
  );
}
