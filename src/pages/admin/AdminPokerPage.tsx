import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import StatCard from '@/pages/admin/StatCard';
import PokerSessionsByVariantBar from '@/components/charts/PokerSessionsByVariantBar';
import DateRangeFilter, {
  rangeToSinceMs,
  type RangePreset,
} from '@/components/admin/DateRangeFilter';
import TopPlayersPanel from '@/components/admin/TopPlayersPanel';
import PokerWinRateByPositionBar from '@/components/charts/PokerWinRateByPositionBar';
import {
  getPokerAllTimeStats,
  getPokerBiggestPots,
  getPokerSessionsByVariant,
  getPokerWinRateByTableSize,
  type PokerAllTimeStats,
  type PokerBiggestPot,
  type PokerSessionsByVariantDay,
  type PokerVariant,
  type PokerWinRateByTableSize,
} from '@/systems/stats';
import { db } from '@/db';
import type { Round } from '@/db';

/**
 * Shape of `rounds.details` for a poker row — mirrored from
 * `src/systems/stats.ts` (`PersistedPokerDetails`). The admin page only
 * reads the scalar fields it needs for the recent-sessions table; the
 * shape MUST match what HoldemPage's `doSettle` actually writes (flat,
 * not the nested in-memory context — re: baccarat #249 lesson).
 */
interface PersistedPokerDetails {
  readonly variant: PokerVariant;
  readonly tableSize: number;
  readonly stakes: { sb: number; bb: number };
  readonly handsPlayed: number;
  readonly rebuys: number;
  readonly biggestPotWon: number;
  readonly sessionId: string;
}

type TabKey = 'all' | PokerVariant;

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'holdem', label: "Hold'em" },
  { key: 'five-card-draw', label: 'Five-Card Draw' },
  { key: 'omaha', label: 'Omaha' },
];

const VARIANT_LABEL: Record<PokerVariant, string> = {
  holdem: "Hold'em",
  'five-card-draw': 'Five-Card Draw',
  omaha: 'Omaha',
};

const EMPTY_STATS: PokerAllTimeStats = {
  sessions: 0,
  hands: 0,
  totalWagered: 0,
  totalPaid: 0,
  netHouseChips: 0,
  netPlayerChips: 0,
  actualRtp: null,
  biggestPotEver: 0,
  // Phase 15 #14.5 PR B — additive KPI defaults.
  avgHandsPerSession: 0,
  winRate: null,
  avgBuyIn: 0,
  allInFrequency: null,
};
const EMPTY_DAYS: readonly PokerSessionsByVariantDay[] = [];
const EMPTY_POTS: readonly PokerBiggestPot[] = [];
const EMPTY_ROUNDS: readonly Round[] = [];
const EMPTY_TABLE_WIN_RATE: readonly PokerWinRateByTableSize[] = [];

function formatStakes(stakes: { sb: number; bb: number }): string {
  return `${stakes.sb}/${stakes.bb}`;
}

function formatTimestamp(ms: number): string {
  return new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
}

export default function AdminPokerPage(): JSX.Element {
  // Local tab state — drives the StatCards, biggest-pots panel, and the
  // recent-sessions table. Hero chart deliberately ignores the tab so the
  // operator sees the full 3-variant picture at a glance regardless.
  const [tab, setTab] = useState<TabKey>('all');

  // Phase 15 #14 PR B — shared date-range filter persisted across mounts.
  // Combines with the existing variant tab to scope the StatCards / biggest-
  // pots / recent-sessions panels.
  const [range, setRange] = useState<RangePreset>('all');
  const sinceMs = useMemo(() => rangeToSinceMs(range), [range]);

  // Phase 9 lesson — let useLiveQuery infer T from the querier's Promise<T>
  // return; do NOT pass an explicit generic. (Mirrors the other admin
  // pages.) Tab is in the deps so the filtered querier re-runs on change.
  // For `getPokerAllTimeStats`, sinceMs is the SECOND positional arg after
  // the variant filter.
  const variantArg: PokerVariant | undefined = tab === 'all' ? undefined : tab;
  const stats = useLiveQuery(
    () => getPokerAllTimeStats(variantArg, sinceMs),
    [variantArg, sinceMs],
    EMPTY_STATS,
  );
  // Hero chart always shows all 3 variants — independent of the active tab.
  const sessionsByVariant = useLiveQuery(() => getPokerSessionsByVariant(30), [], EMPTY_DAYS);
  // Phase 15 #14.5 PR B — additive win-rate-by-table-size chart (degraded
  // proxy for spec's "win rate by seat position"; per-seat data isn't persisted).
  const winRateByTableSize = useLiveQuery(
    () => getPokerWinRateByTableSize(sinceMs),
    [sinceMs],
    EMPTY_TABLE_WIN_RATE,
  );
  const biggestPots = useLiveQuery(
    () => getPokerBiggestPots(10, variantArg),
    [variantArg],
    EMPTY_POTS,
  );
  // Load-all + sort by playedAt desc + slice(20) — #250 pattern; do NOT use
  // `.where(...).reverse().limit(...)` (ties-break by primary key, not
  // chronologically).
  const recentRounds = useLiveQuery(
    async () => {
      const all = await db.rounds.where('game').equals('poker').toArray();
      return all.sort((a, b) => b.playedAt - a.playedAt).slice(0, 20);
    },
    [],
    EMPTY_ROUNDS,
  );

  // Filter the recent-sessions table client-side by BOTH the active tab and
  // the active range. (The page already loads the full set for the chart, so
  // both filters are free.)
  const filteredRecent = useMemo(() => {
    let out = recentRounds;
    if (sinceMs !== undefined) out = out.filter((r) => r.playedAt > sinceMs);
    if (tab !== 'all') {
      out = out.filter((r) => {
        const d = r.details as PersistedPokerDetails | undefined;
        return d?.variant === tab;
      });
    }
    return out;
  }, [recentRounds, tab, sinceMs]);

  const rtpDisplay = stats.actualRtp === null ? '—' : `${(stats.actualRtp * 100).toFixed(1)}%`;

  // Casino-operator perspective (matches every other admin page): house ahead
  // reads GREEN, house behind reads RED. Spec §5.1's "red if positive" was
  // written from the player's perspective and got reverted to align with the
  // rest of the admin suite.
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
      <h1 className="font-display text-base tracking-wider text-gold-bright">POKER</h1>

      {/* Variant tabs */}
      <div
        role="tablist"
        aria-label="Poker variant filter"
        className="flex items-center gap-6 border-b border-brass/30"
      >
        {TABS.map((t) => {
          const selected = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={selected}
              data-poker-tab={t.key}
              onClick={() => setTab(t.key)}
              className={[
                'px-1 pb-2 pt-1 text-xs transition',
                selected
                  ? 'font-display text-gold-bright border-b-2 border-brass'
                  : 'text-ivory/55 hover:text-ivory/80',
              ].join(' ')}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <DateRangeFilter value={range} onChange={setRange} storageKey="admin.poker.range" />

      {/* 4 StatCards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard label="Sessions played" value={stats.sessions.toLocaleString()} />
        <StatCard label="Hands played" value={stats.hands.toLocaleString()} />
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
        <StatCard label="Actual RTP" value={rtpDisplay} sub="target ~95–98%" />
      </div>

      {/* Hero chart — sessions by variant across the last 30 days. Always
          renders all 3 variants regardless of the active tab so the
          operator sees the full picture at a glance. */}
      <section aria-label="Poker sessions by variant (last 30 days)">
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
          SESSIONS BY VARIANT (LAST 30 DAYS)
        </h2>
        <div className="rounded-md border border-gold/30 bg-felt-deep p-4">
          <PokerSessionsByVariantBar data={sessionsByVariant} />
        </div>
      </section>

      {/* Biggest pots panel */}
      <section aria-label="Biggest poker pots">
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
          BIGGEST POTS WON (TOP 10)
        </h2>
        <div className="rounded-md border border-gold/30 bg-felt-deep p-4">
          {biggestPots.length === 0 ? (
            <p className="py-4 text-center text-xs text-white/40">No pots recorded yet.</p>
          ) : (
            <table className="w-full text-left text-xs" data-biggest-pots>
              <thead>
                <tr className="border-b border-gold/30 uppercase tracking-wider text-white/40">
                  <th className="py-2 pr-3 text-right">#</th>
                  <th className="py-2 pr-3 text-right">Amount</th>
                  <th className="py-2 pr-3">Variant</th>
                  <th className="py-2">Played at</th>
                </tr>
              </thead>
              <tbody>
                {biggestPots.map((p, i) => (
                  <tr key={`${p.playedAt}-${i}`} className="border-b border-white/5">
                    <td className="py-1.5 pr-3 text-right tabular-nums text-white/60">{i + 1}</td>
                    <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-gold-bright">
                      {p.amount.toLocaleString()}
                    </td>
                    <td className="py-1.5 pr-3 text-ivory">{VARIANT_LABEL[p.variant]}</td>
                    <td className="py-1.5 tabular-nums text-white/70">
                      {formatTimestamp(p.playedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Recent sessions table (last 20, optionally tab-filtered) */}
      <section aria-label="Recent poker sessions">
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
                <th className="py-2 pr-3">Variant</th>
                <th className="py-2 pr-3 text-right">Table</th>
                <th className="py-2 pr-3">Stakes</th>
                <th className="py-2 pr-3 text-right">Bought in</th>
                <th className="py-2 pr-3 text-right">Final</th>
                <th className="py-2 pr-3 text-right">Net</th>
                <th className="py-2 text-right">Hands</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecent.map((r) => {
                const d = r.details as PersistedPokerDetails | undefined;
                const variant = d?.variant ?? null;
                const tableSize = d?.tableSize ?? 0;
                const stakes = d?.stakes ?? null;
                const handsPlayed = d?.handsPlayed ?? 0;
                const net = r.payout - r.betAmount;
                return (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="py-1.5 pr-3 tabular-nums text-white/70">
                      {formatTimestamp(r.playedAt)}
                    </td>
                    <td className="py-1.5 pr-3 text-ivory">
                      {variant ? VARIANT_LABEL[variant] : '—'}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums text-ivory/80">
                      {tableSize}
                    </td>
                    <td className="py-1.5 pr-3 tabular-nums text-ivory/80">
                      {stakes ? formatStakes(stakes) : '—'}
                    </td>
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
                    <td className="py-1.5 text-right tabular-nums text-ivory/80">{handsPlayed}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Phase 15 #14.5 PR B — NEW additive sections rendered BELOW the
          existing variant tabs / 4 top StatCards / sessions-by-variant chart /
          biggest-pots panel / recent-sessions table. None of the above are
          modified or removed. */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5" data-admin-kpi-grid>
        <StatCard
          label="Avg hands / session"
          value={stats.avgHandsPerSession === 0 ? '—' : stats.avgHandsPerSession.toLocaleString()}
        />
        <StatCard
          label="Win rate"
          value={stats.winRate === null ? '—' : `${(stats.winRate * 100).toFixed(1)}%`}
        />
        <StatCard
          label="Biggest pot ever"
          value={stats.biggestPotEver === 0 ? '—' : `+${stats.biggestPotEver.toLocaleString()}`}
        />
        <StatCard
          label="Avg buy-in"
          value={stats.avgBuyIn === 0 ? '—' : stats.avgBuyIn.toLocaleString()}
        />
        <StatCard
          label="All-in frequency"
          value={
            stats.allInFrequency === null ? '—' : `${(stats.allInFrequency * 100).toFixed(1)}%`
          }
          sub="not tracked yet"
        />
      </div>

      <section aria-label="Poker win-rate by table size">
        <h2 className="mb-2 font-display text-xs tracking-wider text-ivory/60">
          WIN RATE BY TABLE SIZE
        </h2>
        <div className="rounded-md border border-brass/60 bg-velvet-deep p-4">
          {winRateByTableSize.length === 0 ? (
            <p className="py-4 text-center text-xs text-ivory/40">No sessions yet.</p>
          ) : (
            <PokerWinRateByPositionBar data={winRateByTableSize} />
          )}
        </div>
      </section>

      <TopPlayersPanel game="poker" {...(sinceMs !== undefined ? { sinceMs } : {})} />
    </div>
  );
}
