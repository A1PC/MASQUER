import type { JSX } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import StatCard from '@/pages/admin/StatCard';
import SlotsCombinationBar from '@/components/charts/SlotsCombinationBar';
import SlotsSymbolReelHeatmap from '@/components/charts/SlotsSymbolReelHeatmap';
import {
  getSlotsAllTimeStats,
  getSlotsCombinationDistribution,
  getSlotsSymbolDistribution,
  type SlotsAllTimeStats,
  type SlotsCombinationCount,
  type SlotsSymbolDistribution,
} from '@/systems/stats';
import { db } from '@/db';
import type { Round } from '@/db';
import type { SlotsRoundDetails } from '@/games/slots/types';

const EMPTY_STATS: SlotsAllTimeStats = {
  spinsRun: 0,
  totalWagered: 0,
  totalPaid: 0,
  netHouseChips: 0,
  netPlayerChips: 0,
  actualRtp: null,
  targetRtp: 0.86,
  tierCounts: { none: 0, small: 0, medium: 0, jackpot: 0 },
  jackpotsHit: 0,
};
const EMPTY_COMBOS: readonly SlotsCombinationCount[] = [];
const EMPTY_SYMBOLS: readonly SlotsSymbolDistribution[] = [];
const EMPTY_ROUNDS: readonly Round[] = [];

/** Tier → label + Tailwind badge classes. Mirrors the celebration palette
 *  used in SlotsCombinationBar so the recent-spins table and the chart
 *  read consistently. */
const TIER_BADGE: Record<'none' | 'small' | 'medium' | 'jackpot', { label: string; cls: string }> =
  {
    none: { label: 'Loss', cls: 'bg-white/5 text-white/50 border-white/10' },
    small: { label: 'Small', cls: 'bg-[#3dd17a]/15 text-[#5dd9a0] border-[#3dd17a]/40' },
    medium: { label: 'Medium', cls: 'bg-gold/15 text-gold-bright border-gold/40' },
    jackpot: { label: 'Jackpot', cls: 'bg-[#e84a8c]/15 text-[#f291bd] border-[#e84a8c]/50' },
  };

const SYMBOL_SHORT: Record<string, string> = {
  cherry: 'Cherry',
  lemon: 'Lemon',
  bell: 'Bell',
  bar: 'BAR',
  seven: '7',
};

interface MiniTierBarProps {
  label: string;
  count: number;
  total: number;
  fillClass: string;
}

function MiniTierBar({ label, count, total, fillClass }: MiniTierBarProps): JSX.Element {
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

export default function AdminSlotsPage(): JSX.Element {
  // Phase 9 lesson — let useLiveQuery infer T from the querier's Promise<T>
  // return; do NOT pass an explicit generic. (See: getRouletteAllTimeStats
  // call in AdminRoulettePage.)
  const stats = useLiveQuery(() => getSlotsAllTimeStats(), [], EMPTY_STATS);
  const combos = useLiveQuery(() => getSlotsCombinationDistribution(), [], EMPTY_COMBOS);
  const symbolDist = useLiveQuery(() => getSlotsSymbolDistribution(), [], EMPTY_SYMBOLS);
  const recentRounds = useLiveQuery(
    () => db.rounds.where('game').equals('slots').reverse().limit(20).toArray(),
    [],
    EMPTY_ROUNDS,
  );

  const spinsRun = stats.spinsRun;
  const rtpDisplay = stats.actualRtp === null ? '—' : `${(stats.actualRtp * 100).toFixed(1)}%`;
  const targetDisplay = `target ${(stats.targetRtp * 100).toFixed(0)}%`;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-base tracking-wider text-gold-bright">SLOTS</h1>

      {/* Top row: 4 StatCards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard label="Spins run (all-time)" value={spinsRun.toLocaleString()} />
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
        <StatCard label="Actual RTP" value={rtpDisplay} sub={targetDisplay} />
        <StatCard label="Jackpots hit" value={stats.jackpotsHit.toLocaleString()} sub="3× 7" />
      </div>

      {/* Combination distribution — hero chart */}
      <section aria-label="Slots combination distribution">
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
          COMBINATION DISTRIBUTION
        </h2>
        <div className="rounded-md border border-gold/30 bg-felt-deep p-4">
          {spinsRun === 0 ? (
            <p className="py-8 text-center text-xs text-white/40">No slots spins recorded yet.</p>
          ) : (
            <SlotsCombinationBar data={combos} />
          )}
        </div>
      </section>

      {/* Secondary panels: win-tier breakdown + symbol × reel matrix */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-label="Slots win-tier breakdown">
          <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
            WIN-TIER BREAKDOWN
          </h2>
          <div className="flex flex-col gap-3 rounded-md border border-gold/30 bg-felt-deep p-4">
            <MiniTierBar
              label="None (loss)"
              count={stats.tierCounts.none}
              total={spinsRun}
              fillClass="bg-white/30"
            />
            <MiniTierBar
              label="Small"
              count={stats.tierCounts.small}
              total={spinsRun}
              fillClass="bg-[#3dd17a]"
            />
            <MiniTierBar
              label="Medium"
              count={stats.tierCounts.medium}
              total={spinsRun}
              fillClass="bg-gold/70"
            />
            <MiniTierBar
              label="Jackpot"
              count={stats.tierCounts.jackpot}
              total={spinsRun}
              fillClass="bg-[#e84a8c]"
            />
          </div>
        </section>

        <section aria-label="Slots symbol-by-reel landing counts">
          <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
            SYMBOL × REEL DISTRIBUTION
          </h2>
          <div className="rounded-md border border-gold/30 bg-felt-deep p-4">
            {spinsRun === 0 ? (
              <p className="py-8 text-center text-xs text-white/40">
                No spins recorded — symbol weights will populate once players spin.
              </p>
            ) : (
              <SlotsSymbolReelHeatmap data={symbolDist} />
            )}
          </div>
        </section>
      </div>

      {/* Recent spins table */}
      <section aria-label="Recent slots spins">
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
          RECENT SPINS (LAST 20)
        </h2>
        {recentRounds.length === 0 ? (
          <p className="text-xs text-white/40">No spins yet.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gold/30 uppercase tracking-wider text-white/40">
                <th className="py-2 pr-3">Played at</th>
                <th className="py-2 pr-3">Reels</th>
                <th className="py-2 pr-3">Tier</th>
                <th className="py-2 pr-3 text-right">Bet</th>
                <th className="py-2 pr-3 text-right">Payout</th>
                <th className="py-2 text-right">House P/L</th>
              </tr>
            </thead>
            <tbody>
              {recentRounds.map((r) => {
                const d = r.details as SlotsRoundDetails | undefined;
                const reels = d?.spin?.reels ?? ['cherry', 'cherry', 'cherry'];
                const tier = d?.winTier ?? 'none';
                const badge = TIER_BADGE[tier];
                const reelLabel = reels.map((s) => SYMBOL_SHORT[s] ?? s).join(' · ');
                const housePl = r.betAmount - r.payout;
                return (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="py-1.5 pr-3 tabular-nums text-white/70">
                      {new Date(r.playedAt).toISOString().slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className="py-1.5 pr-3 font-display text-ivory tabular-nums">
                      {reelLabel}
                    </td>
                    <td className="py-1.5 pr-3">
                      <span
                        data-tier={tier}
                        className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${badge.cls}`}
                      >
                        {badge.label}
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
