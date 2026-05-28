import type { JSX } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';
import type { LotteryPrizeTierBin } from '@/systems/lottery';
import { ChartTooltipShell } from './ChartTooltip';

interface Props {
  /** Six entries in canonical order: '6', '5+bonus', '5', '4', '3', '2'. */
  data: readonly LotteryPrizeTierBin[];
  height?: number;
}

const TIER_FILL: Record<LotteryPrizeTierBin['tier'], string> = {
  '6': '#e9c449', // gold-bright (jackpot)
  '5+bonus': '#e84a8c', // jewel-magenta
  '5': '#d4af37', // gold
  '4': '#9b7333', // brass
  '3': '#7a5728', // darker brass
  '2': '#5c4221', // darkest brass
};

export function LotteryPrizeTierTooltip({
  active,
  payload,
}: TooltipProps<number, string>): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  if (!item) return null;
  const point = item.payload as LotteryPrizeTierBin;
  return (
    <ChartTooltipShell variant="lottery-prize-tier">
      <div className="font-display text-[10px] uppercase tracking-[0.18em] text-gold">
        Tier {point.tier}
      </div>
      <div className="font-body text-sm text-ivory">
        {point.count.toLocaleString()} hit{point.count === 1 ? '' : 's'}
      </div>
    </ChartTooltipShell>
  );
}

/** Six-bar lottery prize-tier hit distribution (6 / 5+bonus / 5 / 4 / 3 / 2).
 *  Sits below the existing main + bonus frequency charts on AdminLotteryPage. */
export default function LotteryPrizeTierBar({ data, height = 220 }: Props): JSX.Element {
  const display = data.map((d) => ({ ...d, label: d.tier }));
  return (
    <div className="w-full" data-lottery-prize-tier-bar>
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
          <YAxis stroke="rgba(246,239,222,0.45)" fontSize={10} allowDecimals={false} width={32} />
          <Tooltip
            cursor={{ fill: 'rgba(199,154,75,0.12)' }}
            content={<LotteryPrizeTierTooltip />}
          />
          <Bar dataKey="count" isAnimationActive={false}>
            {display.map((d) => (
              <Cell key={d.tier} fill={TIER_FILL[d.tier]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
