import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';
import StatCard from '@/pages/admin/StatCard';
import PlinkoBinDistributionBar from '@/components/charts/PlinkoBinDistributionBar';
import { ChartTooltipShell } from '@/components/charts/ChartTooltip';
import DateRangeFilter, {
  rangeToSinceMs,
  type RangePreset,
} from '@/components/admin/DateRangeFilter';
import {
  getPlinkoAllTimeStats,
  getPlinkoBinDistribution,
  type PlinkoAllTimeStats,
  type PlinkoBinDistribution,
  type PlinkoRisk,
} from '@/systems/stats';
import { MULTIPLIER_CURVES } from '@/games/plinko/logic';
import { db } from '@/db';
import type { Round } from '@/db';

/**
 * Shape of `rounds.details` for a plinko row — flattened at persist time
 * in PlinkoPage's `settle` call. Mirrored in `src/systems/stats.ts` and
 * the stats test fixtures. (Avoids the nested-type trap that crashed
 * baccarat admin in #249 — re-read the persisted shape, don't reuse the
 * in-memory ball object's nested types.)
 */
interface PersistedPlinkoDetails {
  readonly risk: PlinkoRisk;
  readonly bin: number;
  readonly multiplier: number;
}

const EMPTY_STATS: PlinkoAllTimeStats = {
  ballsDropped: 0,
  totalWagered: 0,
  totalPaid: 0,
  netHouseChips: 0,
  netPlayerChips: 0,
  actualRtp: null,
  perRisk: {
    safe: { drops: 0, wagered: 0, paid: 0, rtp: null },
    low: { drops: 0, wagered: 0, paid: 0, rtp: null },
    medium: { drops: 0, wagered: 0, paid: 0, rtp: null },
    high: { drops: 0, wagered: 0, paid: 0, rtp: null },
  },
  jackpotHits: 0,
  edgeBinHits: 0,
  centreBinHits: 0,
};
const EMPTY_DIST: readonly PlinkoBinDistribution[] = [];
const EMPTY_ROUNDS: readonly Round[] = [];

/** Canonical per-risk display order + label / accent classes. The accent
 *  class drives the sparkline stroke colour AND the per-risk mini-bar fill
 *  so the two panels read consistently. */
const RISK_PANEL: Record<PlinkoRisk, { label: string; fillClass: string; stroke: string }> = {
  safe: { label: 'Safe', fillClass: 'bg-gold/55', stroke: '#d4af37' }, // gold
  low: { label: 'Low', fillClass: 'bg-gold/70', stroke: '#e9c449' }, // gold-bright
  medium: { label: 'Medium', fillClass: 'bg-jewel-magenta/70', stroke: '#e84a8c' },
  high: { label: 'High', fillClass: 'bg-jewel-magenta', stroke: '#f291bd' },
};
const RISK_ORDER: readonly PlinkoRisk[] = ['safe', 'low', 'medium', 'high'];

interface MiniBarProps {
  label: string;
  drops: number;
  rtp: number | null;
  total: number;
  fillClass: string;
}

/** Per-risk mini-bar — drops out of the total + RTP percentage tucked on
 *  the right. Mirrors the MiniBar pattern in AdminBaccaratPage so the
 *  admin pages read consistently. */
function MiniBar({ label, drops, rtp, total, fillClass }: MiniBarProps): JSX.Element {
  const pct = total === 0 ? 0 : (drops / total) * 100;
  const rtpDisplay = rtp === null ? '—' : `${(rtp * 100).toFixed(1)}%`;
  return (
    <div className="flex flex-col gap-1" data-mini-bar={label}>
      <div className="flex items-baseline justify-between text-[10px] tracking-wider text-white/60">
        <span className="font-display uppercase">{label}</span>
        <span className="tabular-nums text-white/80">
          {drops.toLocaleString()} drops <span className="text-white/40">({pct.toFixed(1)}%)</span>
          <span className="ml-2 text-gold/80">RTP {rtpDisplay}</span>
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-sm bg-black/40"
        role="img"
        aria-label={`${label}: ${drops} of ${total} drops, RTP ${rtpDisplay}`}
      >
        <div
          className={`h-full ${fillClass}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}

/** Single multiplier-curve sparkline. Pinned y-domain at the curve's own
 *  max so each risk's V-shape fills its panel; we render with a log-ish
 *  feel via Recharts default linear (the V is already dramatic enough). */
function CurveSparkline({
  risk,
  curve,
}: {
  risk: PlinkoRisk;
  curve: readonly number[];
}): JSX.Element {
  const panel = RISK_PANEL[risk];
  const data = curve.map((multiplier, bin) => ({ bin, multiplier }));
  const maxMult = Math.max(...curve);
  return (
    <div
      data-curve-risk={risk}
      className="flex flex-col gap-1 rounded-sm border border-gold/20 bg-black/30 p-2"
    >
      <div className="flex items-baseline justify-between text-[10px] tracking-wider text-white/60">
        <span className="font-display uppercase">{panel.label}</span>
        <span className="font-mono tabular-nums text-gold-bright">
          edge {maxMult.toLocaleString()}×
        </span>
      </div>
      <div className="h-16 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <Line
              type="monotone"
              dataKey="multiplier"
              stroke={panel.stroke}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <XAxis dataKey="bin" hide />
            <YAxis hide domain={[0, maxMult]} />
            <Tooltip
              cursor={{ stroke: 'rgba(199,154,75,0.3)', strokeWidth: 1 }}
              content={<CurveTooltip />}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Custom curve tooltip — shares the brand shell so the multiplier viewer
 *  reads consistently with the bin-distribution chart on the same page. */
function CurveTooltip({ active, payload }: TooltipProps<number, string>): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  if (!item) return null;
  const point = item.payload as { bin: number; multiplier: number };
  return (
    <ChartTooltipShell variant="plinko-curve">
      <div className="font-display text-[10px] uppercase tracking-[0.18em] text-gold">
        bin {point.bin}
      </div>
      <div className="font-mono text-sm tabular-nums text-ivory">
        {point.multiplier.toLocaleString()}×
      </div>
    </ChartTooltipShell>
  );
}

export default function AdminPlinkoPage(): JSX.Element {
  // Phase 15 #14 PR B — shared date-range filter persisted across mounts.
  const [range, setRange] = useState<RangePreset>('all');
  const sinceMs = useMemo(() => rangeToSinceMs(range), [range]);

  // Phase 9 lesson — let useLiveQuery infer T from the querier's Promise<T>
  // return; do NOT pass an explicit generic. (Mirrors the other admin
  // pages.)
  const stats = useLiveQuery(() => getPlinkoAllTimeStats(sinceMs), [sinceMs], EMPTY_STATS);
  const distribution = useLiveQuery(() => getPlinkoBinDistribution(), [], EMPTY_DIST);
  // `.where(...).reverse()` ties-break by primary key (lexicographic on
  // betId strings), not by `playedAt` — so it did not give "newest first".
  // Sort in memory; admin pages tolerate the full scan (#250 pattern).
  const recentRounds = useLiveQuery(
    async () => {
      const all = await db.rounds.where('game').equals('plinko').toArray();
      return all.sort((a, b) => b.playedAt - a.playedAt).slice(0, 20);
    },
    [],
    EMPTY_ROUNDS,
  );
  const filteredRecent = useMemo(
    () => (sinceMs !== undefined ? recentRounds.filter((r) => r.playedAt > sinceMs) : recentRounds),
    [recentRounds, sinceMs],
  );

  const ballsDropped = stats.ballsDropped;
  const rtpDisplay = stats.actualRtp === null ? '—' : `${(stats.actualRtp * 100).toFixed(1)}%`;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-base tracking-wider text-gold-bright">PLINKO</h1>

      <DateRangeFilter value={range} onChange={setRange} storageKey="admin.plinko.range" />

      {/* Top row: 4 StatCards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard label="Balls dropped (all-time)" value={ballsDropped.toLocaleString()} />
        <StatCard
          label="House net chips"
          value={
            stats.netHouseChips >= 0
              ? `+${stats.netHouseChips.toLocaleString()}`
              : stats.netHouseChips.toLocaleString()
          }
          tone={
            stats.netHouseChips > 0 ? 'positive' : stats.netHouseChips < 0 ? 'negative' : 'neutral'
          }
          sub={
            stats.netHouseChips > 0
              ? 'House ahead'
              : stats.netHouseChips < 0
                ? 'House behind'
                : 'Break-even'
          }
        />
        <StatCard label="Actual RTP" value={rtpDisplay} sub="target 95–98% per risk" />
        <StatCard
          label="Jackpots hit"
          value={stats.jackpotHits.toLocaleString()}
          sub="high-risk edge bins"
        />
      </div>

      {/* Hero chart — bin landing distribution */}
      <section aria-label="Plinko bin landing distribution">
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
          BIN LANDING DISTRIBUTION (0–26)
        </h2>
        <div className="rounded-md border border-gold/30 bg-felt-deep p-4">
          {ballsDropped === 0 ? (
            <p className="py-8 text-center text-xs text-white/40">No plinko drops recorded yet.</p>
          ) : (
            <PlinkoBinDistributionBar data={distribution} />
          )}
        </div>
      </section>

      {/* Secondary panels: per-risk drops + multiplier curve viewer */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-label="Plinko per-risk drops and RTP">
          <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
            PER-RISK DROPS &amp; RTP
          </h2>
          <div className="flex flex-col gap-3 rounded-md border border-gold/30 bg-felt-deep p-4">
            {RISK_ORDER.map((risk) => {
              const panel = RISK_PANEL[risk];
              const bucket = stats.perRisk[risk];
              return (
                <MiniBar
                  key={risk}
                  label={panel.label}
                  drops={bucket.drops}
                  rtp={bucket.rtp}
                  total={ballsDropped}
                  fillClass={panel.fillClass}
                />
              );
            })}
            <p className="border-t border-gold/20 pt-3 text-[10px] tracking-wider text-white/40">
              Drops + realised return per risk vs the configured 95–98% target.
            </p>
          </div>
        </section>

        <section aria-label="Plinko multiplier curves">
          <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
            MULTIPLIER CURVES (READ-ONLY)
          </h2>
          <div className="grid grid-cols-2 gap-2 rounded-md border border-gold/30 bg-felt-deep p-4">
            {RISK_ORDER.map((risk) => (
              <CurveSparkline key={risk} risk={risk} curve={MULTIPLIER_CURVES[risk]} />
            ))}
          </div>
          <p className="mt-2 text-[10px] tracking-wider text-white/40">
            Configured payout curves per risk (27 bins). Tunability deferred to Phase 15 #14.
          </p>
        </section>
      </div>

      {/* Recent drops table */}
      <section aria-label="Recent plinko drops">
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
          RECENT DROPS (LAST 20)
        </h2>
        {filteredRecent.length === 0 ? (
          <p className="text-xs text-white/40">No drops yet.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gold/30 uppercase tracking-wider text-white/40">
                <th className="py-2 pr-3">Played at</th>
                <th className="py-2 pr-3">Risk</th>
                <th className="py-2 pr-3 text-right">Bin</th>
                <th className="py-2 pr-3 text-right">Multiplier</th>
                <th className="py-2 pr-3 text-right">Stake</th>
                <th className="py-2 pr-3 text-right">Payout</th>
                <th className="py-2 text-right">House P/L</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecent.map((r) => {
                const d = r.details as PersistedPlinkoDetails | undefined;
                const risk: PlinkoRisk = d?.risk ?? 'safe';
                const panel = RISK_PANEL[risk];
                const bin = d?.bin ?? 0;
                const multiplier = d?.multiplier ?? 0;
                const housePl = r.betAmount - r.payout;
                const isEdge = bin === 0 || bin === 26;
                return (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="py-1.5 pr-3 tabular-nums text-white/70">
                      {new Date(r.playedAt).toISOString().slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className="py-1.5 pr-3">
                      <span
                        data-risk={risk}
                        className={`inline-flex items-center rounded-sm border border-gold/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-ivory ${panel.fillClass}`}
                      >
                        {panel.label}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 text-right font-mono tabular-nums">
                      <span
                        data-bin-kind={isEdge ? 'edge' : bin === 13 ? 'centre' : 'interior'}
                        className={
                          isEdge
                            ? 'text-jewel-magenta'
                            : bin === 13
                              ? 'text-white/50'
                              : 'text-ivory'
                        }
                      >
                        {bin}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-gold-bright">
                      {multiplier.toLocaleString()}×
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">
                      {r.betAmount.toLocaleString()}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">
                      {r.payout.toLocaleString()}
                    </td>
                    <td
                      className={`py-1.5 text-right tabular-nums ${
                        housePl > 0
                          ? 'text-chip-win'
                          : housePl < 0
                            ? 'text-casino-red'
                            : 'text-white/60'
                      }`}
                    >
                      {housePl > 0 ? '+' : ''}
                      {housePl.toLocaleString()}
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
