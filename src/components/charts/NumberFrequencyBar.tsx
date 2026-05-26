import type { JSX } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltipShell } from './ChartTooltip';
import type { TooltipProps } from 'recharts';

function NumberFrequencyTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  if (!item) return null;
  const count = typeof item.value === 'number' ? item.value : 0;
  return (
    <ChartTooltipShell variant="number-frequency">
      <div className="mb-0.5 font-display text-[10px] uppercase tracking-[0.18em] text-gold">
        Number {String(label)}
      </div>
      <div className="text-xs tabular-nums text-ivory">
        Drawn <span className="font-mono">{count.toLocaleString()}</span>{' '}
        {count === 1 ? 'time' : 'times'}
      </div>
    </ChartTooltipShell>
  );
}

interface Props {
  /** Array of frequencies; index i = number (i+1). */
  data: number[];
  /** Bar color hex. */
  color?: string;
  height?: number;
}

export default function NumberFrequencyBar({
  data,
  color = '#d4af37',
  height = 200,
}: Props): JSX.Element {
  const chartData = data.map((count, i) => ({ number: i + 1, count }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData}>
        <CartesianGrid stroke="rgba(212,175,55,0.12)" />
        <XAxis dataKey="number" stroke="rgba(255,255,255,0.5)" fontSize={9} interval={4} />
        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} allowDecimals={false} />
        <Tooltip cursor={{ fill: 'rgba(199,154,75,0.12)' }} content={<NumberFrequencyTooltip />} />
        <Bar dataKey="count" fill={color} />
      </BarChart>
    </ResponsiveContainer>
  );
}
