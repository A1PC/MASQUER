import type { JSX } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';
import type { PokerWinRateByTableSize } from '@/systems/stats';
import { ChartTooltipShell } from './ChartTooltip';

interface Props {
  data: readonly PokerWinRateByTableSize[];
  height?: number;
}

/** Custom Recharts tooltip — ivory body on velvet-deep ground. */
export function PokerWinRateTooltip({
  active,
  payload,
}: TooltipProps<number, string>): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  if (!item) return null;
  const point = item.payload as PokerWinRateByTableSize;
  return (
    <ChartTooltipShell variant="poker-win-rate-position">
      <div className="font-display text-[10px] uppercase tracking-[0.18em] text-gold">
        {point.tableSize}-seat table
      </div>
      <div className="font-body text-sm text-ivory">
        {(point.winRate * 100).toFixed(1)}% win rate
      </div>
      <div className="font-body text-[10px] text-ivory/55">
        {point.sessions.toLocaleString()} session{point.sessions === 1 ? '' : 's'}
      </div>
    </ChartTooltipShell>
  );
}

/**
 * Win-rate by table-size — degraded proxy for the spec's "win rate by seat
 * position" (per-seat data isn't persisted; table-size is the closest
 * available aggregate). The chart shows percent win-rate per observed
 * tableSize value sorted ascending.
 */
export default function PokerWinRateByPositionBar({ data, height = 220 }: Props): JSX.Element {
  const display = data.map((d) => ({ ...d, label: `${d.tableSize}-seat`, pct: d.winRate * 100 }));
  return (
    <div className="w-full" data-poker-win-rate-position-bar>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={display} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="rgba(212,175,55,0.12)" />
          <XAxis
            dataKey="label"
            stroke="rgba(246,239,222,0.55)"
            fontSize={11}
            interval={0}
            tickLine={false}
          />
          <YAxis
            stroke="rgba(246,239,222,0.45)"
            fontSize={10}
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
            width={36}
          />
          <Tooltip cursor={{ fill: 'rgba(199,154,75,0.12)' }} content={<PokerWinRateTooltip />} />
          <Bar dataKey="pct" fill="#e9c449" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
