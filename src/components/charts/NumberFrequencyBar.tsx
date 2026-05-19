import type { JSX } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

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
        <Tooltip
          contentStyle={{
            background: '#06120c',
            border: '1px solid #d4af37',
            fontSize: 12,
            color: '#f0c64a',
          }}
          formatter={(value: number) => [`${value} times`, 'drawn']}
        />
        <Bar dataKey="count" fill={color} />
      </BarChart>
    </ResponsiveContainer>
  );
}
