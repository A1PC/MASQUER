import type { JSX } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import StatCard from '@/pages/admin/StatCard';
import NumberFrequencyBar from '@/components/charts/NumberFrequencyBar';
import {
  getLotteryAdminStats,
  getNumberFrequency,
  type LotteryAdminStats,
} from '@/systems/lottery';
import { db, type LotteryDraw } from '@/db';

const EMPTY_STATS: LotteryAdminStats = {
  ticketsSoldToday: 0,
  linesSoldToday: 0,
  totalRevenue: 0,
  totalPayout: 0,
  netProfit: 0,
};
const EMPTY_FREQ: number[] = [];
const EMPTY_DRAWS: readonly LotteryDraw[] = [];

export default function AdminLotteryPage(): JSX.Element {
  const stats = useLiveQuery(() => getLotteryAdminStats(), [], EMPTY_STATS);
  const mainFreq = useLiveQuery(() => getNumberFrequency('main'), [], EMPTY_FREQ);
  const bonusFreq = useLiveQuery(() => getNumberFrequency('bonus'), [], EMPTY_FREQ);
  const recentDraws = useLiveQuery(
    () => db.lotteryDraws.orderBy('id').reverse().limit(50).toArray(),
    [],
    EMPTY_DRAWS,
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-base tracking-wider text-gold-bright">LOTTERY</h1>

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
          <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
            MAIN POOL FREQUENCY (1–50)
          </h2>
          <NumberFrequencyBar
            data={mainFreq.length === 50 ? mainFreq : Array.from({ length: 50 }, () => 0)}
            color="#d4af37"
          />
        </section>
        <section>
          <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
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
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">RECENT DRAWS</h2>
        {recentDraws.length === 0 ? (
          <p className="text-xs text-white/40">No draws yet.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gold/30 uppercase tracking-wider text-white/40">
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Numbers</th>
                <th className="py-2 pr-3 text-right">Lines</th>
                <th className="py-2 pr-3 text-right">Revenue</th>
                <th className="py-2 pr-3 text-right">Payout</th>
                <th className="py-2 text-right">P/L</th>
              </tr>
            </thead>
            <tbody>
              {recentDraws.map((d) => {
                const pl = d.totalRevenue - d.totalPayout;
                return (
                  <tr key={d.id} className="border-b border-white/5">
                    <td className="py-1.5 pr-3 tabular-nums">{d.id}</td>
                    <td className="py-1.5 pr-3 tabular-nums">
                      {d.mainNumbers.join(' · ')} <span className="text-white/40">|</span> {d.bonus}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{d.totalLines}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">
                      {d.totalRevenue.toLocaleString()}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">
                      {d.totalPayout.toLocaleString()}
                    </td>
                    <td
                      className={`py-1.5 text-right tabular-nums ${pl >= 0 ? 'text-chip-win' : 'text-casino-red'}`}
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
