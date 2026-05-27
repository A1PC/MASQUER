import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import StatCard from '@/pages/admin/StatCard';
import PocketDistributionBar from '@/components/charts/PocketDistributionBar';
import DateRangeFilter, {
  rangeToSinceMs,
  type RangePreset,
} from '@/components/admin/DateRangeFilter';
import {
  getRouletteAllTimeStats,
  getRouletteNumberDistribution,
  type RouletteAllTimeStats,
  type RouletteDistributionPoint,
} from '@/systems/stats';
import { db } from '@/db';
import type { Round } from '@/db';
import type { RouletteRoundDetails } from '@/games/roulette/types';

const EMPTY_STATS: RouletteAllTimeStats = {
  ballsSpun: 0,
  netHouseChips: 0,
  netPlayerChips: 0,
  redCount: 0,
  blackCount: 0,
  greenCount: 0,
  oddCount: 0,
  evenCount: 0,
  lowCount: 0,
  highCount: 0,
  dozenCounts: [0, 0, 0],
  columnCounts: [0, 0, 0],
};
const EMPTY_DIST: RouletteDistributionPoint[] = [];
const EMPTY_ROUNDS: readonly Round[] = [];

/** Format a count as `count (xx.x%)` against a non-zero denominator, or
 *  just `count` when the denominator is zero. */
function withPct(count: number, total: number): string {
  if (total === 0) return '0';
  const pct = (count / total) * 100;
  return `${count.toLocaleString()} (${pct.toFixed(1)}%)`;
}

function pocketColor(n: number): 'red' | 'black' | 'green' {
  if (n === 0) return 'green';
  const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  return RED.has(n) ? 'red' : 'black';
}

interface MiniBarProps {
  label: string;
  count: number;
  total: number;
  /** Tailwind background class for the bar fill. */
  fillClass: string;
}

function MiniBar({ label, count, total, fillClass }: MiniBarProps): JSX.Element {
  const pct = total === 0 ? 0 : (count / total) * 100;
  return (
    <div className="flex flex-col gap-1" data-mini-bar={label}>
      <div className="flex items-baseline justify-between text-[10px] tracking-wider text-white/60">
        <span className="font-display uppercase">{label}</span>
        <span className="tabular-nums text-white/80">
          {count.toLocaleString()} <span className="text-white/40">({pct.toFixed(1)}%)</span>
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-sm bg-black/40"
        role="img"
        aria-label={`${label}: ${count} of ${total} (${pct.toFixed(1)}%)`}
      >
        <div
          className={`h-full ${fillClass}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}

export default function AdminRoulettePage(): JSX.Element {
  // Phase 15 #14 PR B — shared date-range filter persisted across mounts.
  const [range, setRange] = useState<RangePreset>('all');
  const sinceMs = useMemo(() => rangeToSinceMs(range), [range]);

  const stats = useLiveQuery(() => getRouletteAllTimeStats(sinceMs), [sinceMs], EMPTY_STATS);
  const distribution = useLiveQuery(() => getRouletteNumberDistribution(), [], EMPTY_DIST);
  // Dexie's `.where(...).reverse()` iterates by the queried index (`game`),
  // and within the matching set it ties-break by primary key. Roulette
  // rounds.id is a wallet betId string (or 'spin-only-…' from #237), which
  // sorts lexicographically, NOT chronologically — so reverse() did not
  // give "newest first". Sort by `playedAt` in memory instead. Admin pages
  // are loaded infrequently and the scan is bounded by total roulette rows.
  const recentRounds = useLiveQuery(
    async () => {
      const all = await db.rounds.where('game').equals('roulette').toArray();
      return all.sort((a, b) => b.playedAt - a.playedAt).slice(0, 20);
    },
    [],
    EMPTY_ROUNDS,
  );
  const filteredRecent = useMemo(
    () => (sinceMs !== undefined ? recentRounds.filter((r) => r.playedAt > sinceMs) : recentRounds),
    [recentRounds, sinceMs],
  );

  const totalSpins = stats.ballsSpun;
  const redPct = withPct(stats.redCount, totalSpins);
  const blackPct = withPct(stats.blackCount, totalSpins);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-base tracking-wider text-gold-bright">ROULETTE</h1>

      <DateRangeFilter value={range} onChange={setRange} storageKey="admin.roulette.range" />

      {/* Top row: 4 StatCards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard label="Balls spun (all-time)" value={totalSpins.toLocaleString()} />
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
        <StatCard label="Red %" value={redPct} />
        <StatCard label="Black %" value={blackPct} />
      </div>

      {/* Distribution chart hero */}
      <section aria-label="Roulette pocket distribution">
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
          POCKET DISTRIBUTION (0–36)
        </h2>
        <div className="rounded-md border border-gold/30 bg-felt-deep p-4">
          {totalSpins === 0 ? (
            <p className="py-8 text-center text-xs text-white/40">
              No roulette spins recorded yet.
            </p>
          ) : (
            <PocketDistributionBar data={distribution} />
          )}
        </div>
      </section>

      {/* Secondary panels: parity + dozens/columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-label="Roulette parity and range">
          <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
            PARITY · COLOUR · RANGE
          </h2>
          <div className="flex flex-col gap-3 rounded-md border border-gold/30 bg-felt-deep p-4">
            <MiniBar
              label="Red"
              count={stats.redCount}
              total={totalSpins}
              fillClass="bg-[#a3122a]"
            />
            <MiniBar
              label="Black"
              count={stats.blackCount}
              total={totalSpins}
              fillClass="bg-white/30"
            />
            <MiniBar
              label="Green (zero)"
              count={stats.greenCount}
              total={totalSpins}
              fillClass="bg-[#3dd17a]"
            />
            <MiniBar label="Odd" count={stats.oddCount} total={totalSpins} fillClass="bg-gold/70" />
            <MiniBar
              label="Even"
              count={stats.evenCount}
              total={totalSpins}
              fillClass="bg-gold/40"
            />
            <MiniBar
              label="Low (1–18)"
              count={stats.lowCount}
              total={totalSpins}
              fillClass="bg-gold/70"
            />
            <MiniBar
              label="High (19–36)"
              count={stats.highCount}
              total={totalSpins}
              fillClass="bg-gold/40"
            />
          </div>
        </section>

        <section aria-label="Roulette dozens and columns">
          <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
            DOZENS &amp; COLUMNS
          </h2>
          <div className="flex flex-col gap-4 rounded-md border border-gold/30 bg-felt-deep p-4">
            <div className="flex flex-col gap-2">
              <div className="font-display text-[10px] tracking-[0.2em] text-white/40">DOZENS</div>
              <MiniBar
                label="1st 12"
                count={stats.dozenCounts[0]}
                total={totalSpins}
                fillClass="bg-gold/70"
              />
              <MiniBar
                label="2nd 12"
                count={stats.dozenCounts[1]}
                total={totalSpins}
                fillClass="bg-gold/55"
              />
              <MiniBar
                label="3rd 12"
                count={stats.dozenCounts[2]}
                total={totalSpins}
                fillClass="bg-gold/40"
              />
            </div>
            <div className="flex flex-col gap-2 border-t border-gold/20 pt-3">
              <div className="font-display text-[10px] tracking-[0.2em] text-white/40">COLUMNS</div>
              <MiniBar
                label="Column 1"
                count={stats.columnCounts[0]}
                total={totalSpins}
                fillClass="bg-gold/70"
              />
              <MiniBar
                label="Column 2"
                count={stats.columnCounts[1]}
                total={totalSpins}
                fillClass="bg-gold/55"
              />
              <MiniBar
                label="Column 3"
                count={stats.columnCounts[2]}
                total={totalSpins}
                fillClass="bg-gold/40"
              />
            </div>
          </div>
        </section>
      </div>

      {/* Recent spins table — styled to match the baccarat / slots admin
       *  patterns. Number + colour collapse into one circular pocket
       *  badge that reads like the wheel itself (red / black / green). */}
      <section aria-label="Recent roulette spins">
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
          RECENT SPINS (LAST 20)
        </h2>
        {filteredRecent.length === 0 ? (
          <p className="text-xs text-white/40">No spins yet.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gold/30 uppercase tracking-wider text-white/40">
                <th className="py-2 pr-3">Played at</th>
                <th className="py-2 pr-3">Pocket</th>
                <th className="py-2 pr-3 text-right">Bet</th>
                <th className="py-2 pr-3 text-right">Payout</th>
                <th className="py-2 text-right">House P/L</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecent.map((r) => {
                const d = r.details as RouletteRoundDetails | undefined;
                const n = d?.spin?.number ?? 0;
                const color = d?.spin?.color ?? pocketColor(n);
                const housePl = r.betAmount - r.payout;
                const badgeBg =
                  color === 'red'
                    ? 'bg-roulette-pocket-red'
                    : color === 'green'
                      ? 'bg-roulette-pocket-green'
                      : 'bg-roulette-pocket';
                // Black + red bg → ivory text; green bg → dark text for contrast.
                const badgeText = color === 'green' ? 'text-[#06120c]' : 'text-ivory';
                return (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="py-1.5 pr-3 tabular-nums text-white/70">
                      {new Date(r.playedAt).toISOString().slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className="py-1.5 pr-3">
                      <span
                        data-pocket-color={color}
                        data-pocket-number={n}
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full border border-brass/60 font-display text-[11px] tabular-nums ${badgeBg} ${badgeText}`}
                      >
                        {n}
                      </span>
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
