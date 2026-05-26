import type { JSX } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { HistogramBin } from '@/systems/stats';
import { DefaultChartTooltip } from './ChartTooltip';

type Props = { data: HistogramBin[]; height?: number };

export default function BetSizeHistogram({ data, height = 200 }: Props): JSX.Element {
  if (data.length === 0) {
    return <div className="text-xs text-white/40">No rounds yet — bets will plot here.</div>;
  }
  const chartData = data.map((b) => ({
    label: `${b.binMin}–${b.binMax}`,
    count: b.count,
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData}>
        <CartesianGrid stroke="rgba(212,175,55,0.12)" />
        <XAxis dataKey="label" stroke="rgba(255,255,255,0.5)" fontSize={10} />
        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} allowDecimals={false} />
        <Tooltip cursor={{ fill: 'rgba(199,154,75,0.12)' }} content={<DefaultChartTooltip />} />
        <Bar dataKey="count" fill="#d4af37" />
      </BarChart>
    </ResponsiveContainer>
  );
}
