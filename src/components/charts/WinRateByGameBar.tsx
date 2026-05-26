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
import { ChartTooltipShell } from './ChartTooltip';

function WinRateTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  if (!item) return null;
  const v = typeof item.value === 'number' ? item.value : 0;
  return (
    <ChartTooltipShell variant="win-rate">
      <div className="mb-0.5 font-display text-[10px] uppercase tracking-[0.18em] text-gold">
        {String(label ?? '')}
      </div>
      <div className="font-mono text-xs tabular-nums text-ivory">{v.toFixed(1)}%</div>
    </ChartTooltipShell>
  );
}

export type WinRatePoint = {
  game: string;
  /** 0-100. */
  winRate: number;
};

type Props = { data: WinRatePoint[]; height?: number };

export default function WinRateByGameBar({ data, height = 220 }: Props): JSX.Element {
  if (data.length === 0) {
    return (
      <div className="text-xs text-white/40">No rounds yet — play a few to see win rates.</div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid stroke="rgba(212,175,55,0.12)" />
        <XAxis
          type="number"
          domain={[0, 100]}
          stroke="rgba(255,255,255,0.4)"
          fontSize={10}
          tickFormatter={(v: number) => `${v}%`}
        />
        <YAxis
          dataKey="game"
          type="category"
          stroke="rgba(255,255,255,0.5)"
          fontSize={11}
          width={80}
        />
        <Tooltip cursor={{ fill: 'rgba(199,154,75,0.12)' }} content={<WinRateTooltip />} />
        <Bar dataKey="winRate">
          {data.map((d) => (
            <Cell key={d.game} fill={d.winRate >= 50 ? '#3dd17a' : '#d4af37'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
