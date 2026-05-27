import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import StatCard from '@/pages/admin/StatCard';
import NumberFrequencyBar from '@/components/charts/NumberFrequencyBar';
import DateRangeFilter, {
  rangeToSinceMs,
  type RangePreset,
} from '@/components/admin/DateRangeFilter';
import {
  getLotteryAdminStats,
  getNumberFrequency,
  type LotteryAdminStats,
} from '@/systems/lottery';
import { db, type LotteryDraw, type LotteryLine, type LotteryMatchTier } from '@/db';

const EMPTY_STATS: LotteryAdminStats = {
  ticketsSoldToday: 0,
  linesSoldToday: 0,
  totalRevenue: 0,
  totalPayout: 0,
  netProfit: 0,
};
const EMPTY_FREQ: number[] = [];
const EMPTY_DRAWS: readonly LotteryDraw[] = [];
const EMPTY_LINES: readonly LotteryLine[] = [];

/**
 * AdminLotteryPage — operator dashboard. Restyled in Phase 15 #9 to match the
 * brand-consistent pattern (mirrors #250 — ivory body, brass borders, a
 * coloured tier badge per row showing the biggest hit on that draw).
 * `NumberFrequencyBar` was migrated to ChartTooltipShell in #251; no chart
 * changes here.
 *
 * Ordering: uses `orderBy('id').reverse()` rather than `.where(...).reverse()`
 * — `id` is the date string `YYYY-MM-DD` which sorts lexicographically equal
 * to chronological. Roulette / baccarat / slots had a `.where().reverse()`
 * bug fixed in #250; lottery doesn't have that bug.
 */
export default function AdminLotteryPage(): JSX.Element {
  // Phase 15 #14 PR B — shared date-range filter persisted across mounts.
  // sinceMs flows into both lottery aggregators (StatCards + frequency
  // charts) and the recent-draws table client-side filter.
  const [range, setRange] = useState<RangePreset>('all');
  const sinceMs = useMemo(() => rangeToSinceMs(range), [range]);

  const stats = useLiveQuery(
    () => getLotteryAdminStats(Date.now(), sinceMs),
    [sinceMs],
    EMPTY_STATS,
  );
  const mainFreq = useLiveQuery(() => getNumberFrequency('main', sinceMs), [sinceMs], EMPTY_FREQ);
  const bonusFreq = useLiveQuery(() => getNumberFrequency('bonus', sinceMs), [sinceMs], EMPTY_FREQ);
  const recentDraws = useLiveQuery(
    () => db.lotteryDraws.orderBy('id').reverse().limit(50).toArray(),
    [],
    EMPTY_DRAWS,
  );
  const filteredRecentDraws = useMemo(
    () => (sinceMs !== undefined ? recentDraws.filter((d) => d.drawAt > sinceMs) : recentDraws),
    [recentDraws, sinceMs],
  );
  // Pull all settled lines for the listed draws so we can derive the biggest
  // tier hit per row. Boolean indexes aren't natively supported by IndexedDB,
  // so we filter in memory after the load (small N).
  const allLines = useLiveQuery(
    () => db.lotteryLines.toArray().then((all) => all.filter((l) => l.settled)),
    [],
    EMPTY_LINES,
  );
  const bestTierByDraw = bestTierPerDraw(allLines);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-base tracking-[0.18em] text-gold-bright">LOTTERY</h1>

      <DateRangeFilter value={range} onChange={setRange} storageKey="admin.lottery.range" />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard
          label="Tickets sold today"
          value={`${stats.ticketsSoldToday} (${stats.linesSoldToday} lines)`}
        />
        <StatCard label="Revenue (all-time)" value={stats.totalRevenue.toLocaleString()} />
        <StatCard label="Payout (all-time)" value={stats.totalPayout.toLocaleString()} />
        <StatCard
          label="House profit"
          value={
            stats.netProfit >= 0
              ? `+${stats.netProfit.toLocaleString()}`
              : stats.netProfit.toLocaleString()
          }
          tone={stats.netProfit >= 0 ? 'positive' : 'negative'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 font-display text-xs tracking-[0.18em] text-ivory/60">
            MAIN POOL FREQUENCY (1–50)
          </h2>
          <NumberFrequencyBar
            data={mainFreq.length === 50 ? mainFreq : Array.from({ length: 50 }, () => 0)}
            color="#d4af37"
          />
        </section>
        <section>
          <h2 className="mb-2 font-display text-xs tracking-[0.18em] text-ivory/60">
            BONUS POOL FREQUENCY (1–10)
          </h2>
          <NumberFrequencyBar
            data={bonusFreq.length === 10 ? bonusFreq : Array.from({ length: 10 }, () => 0)}
            color="#e84a8c"
            height={160}
          />
        </section>
      </div>

      <section>
        <h2 className="mb-2 font-display text-xs tracking-[0.18em] text-ivory/60">
          RECENT DRAWS (LAST 50)
        </h2>
        {filteredRecentDraws.length === 0 ? (
          <p className="text-xs text-ivory/40">No draws yet.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-brass/50 uppercase tracking-[0.18em] text-ivory/40">
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Numbers</th>
                <th className="py-2 pr-3 text-center">Best hit</th>
                <th className="py-2 pr-3 text-right">Lines</th>
                <th className="py-2 pr-3 text-right">Revenue</th>
                <th className="py-2 pr-3 text-right">Payout</th>
                <th className="py-2 text-right">P/L</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecentDraws.map((d) => {
                const pl = d.totalRevenue - d.totalPayout;
                const best = bestTierByDraw.get(d.id) ?? null;
                return (
                  <tr key={d.id} className="border-b border-brass/20">
                    <td className="py-1.5 pr-3 tabular-nums text-ivory/85">{d.id}</td>
                    <td className="py-1.5 pr-3 tabular-nums text-ivory">
                      {d.mainNumbers.join(' · ')} <span className="text-ivory/40">|</span> {d.bonus}
                    </td>
                    <td className="py-1.5 pr-3 text-center">
                      <TierBadge tier={best} />
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums text-ivory/85">
                      {d.totalLines}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums text-ivory/85">
                      {d.totalRevenue.toLocaleString()}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums text-ivory/85">
                      {d.totalPayout.toLocaleString()}
                    </td>
                    <td
                      className={`py-1.5 text-right tabular-nums ${
                        pl >= 0 ? 'text-state-win' : 'text-state-loss'
                      }`}
                    >
                      {pl >= 0 ? '+' : ''}
                      {pl.toLocaleString()}
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

/** Per spec §4.6: tier badge for the biggest hit on each draw row. */
function TierBadge({ tier }: { tier: LotteryMatchTier | null }): JSX.Element {
  if (tier === null) {
    return (
      <span
        data-tier-badge="none"
        className="inline-flex h-6 min-w-[36px] items-center justify-center rounded-full border border-brass/40 px-2 font-display text-[10px] tabular-nums text-ivory/40"
      >
        None
      </span>
    );
  }
  // Higher tiers get warmer / brighter colours.
  const tone =
    tier === '6'
      ? 'border-gold bg-gold text-velvet-deep shadow-gold-glow'
      : tier === '5+bonus'
        ? 'border-jewel-magenta bg-jewel-magenta text-ivory'
        : tier === '5'
          ? 'border-gold bg-velvet-deep text-gold-bright'
          : tier === '4'
            ? 'border-brass bg-velvet-deep text-ivory'
            : tier === '3'
              ? 'border-brass/60 bg-felt-table-deep text-ivory/85'
              : 'border-brass/40 bg-felt-table-deep text-ivory/70'; // '2'
  return (
    <span
      data-tier-badge={tier}
      className={`inline-flex h-6 min-w-[36px] items-center justify-center rounded-full border px-2 font-display text-[10px] tabular-nums ${tone}`}
    >
      {tier}
    </span>
  );
}

/** Find the highest tier hit per draw. Used to decorate the recent-draws row.
 *  Pure — exported only for testing. */
function bestTierPerDraw(lines: readonly LotteryLine[]): Map<string, LotteryMatchTier | null> {
  const result = new Map<string, LotteryMatchTier | null>();
  for (const line of lines) {
    if (!line.matchTier) continue;
    const cur = result.get(line.drawId);
    if (cur === undefined || tierRank(line.matchTier) > tierRank(cur)) {
      result.set(line.drawId, line.matchTier);
    }
  }
  return result;
}

function tierRank(tier: LotteryMatchTier | null): number {
  switch (tier) {
    case '6':
      return 6;
    case '5+bonus':
      return 5;
    case '5':
      return 4;
    case '4':
      return 3;
    case '3':
      return 2;
    case '2':
      return 1;
    case null:
      return 0;
  }
}
