import type { JSX } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Entry = { username: string; totalNetChange: number };
type Props = { winners: Entry[]; losers: Entry[]; height?: number };

export default function WinnersLosersBar({ winners, losers, height = 240 }: Props): JSX.Element {
  const combined = [...winners.slice().reverse(), ...losers];
  if (combined.length === 0) {
    return <div className="text-xs text-white/40">No winners or losers yet.</div>;
  }
  const chartData = combined.map((e) => ({ name: e.username, value: e.totalNetChange }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid stroke="rgba(212,175,55,0.12)" />
        <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={10} />
        <YAxis
          dataKey="name"
          type="category"
          stroke="rgba(255,255,255,0.5)"
          fontSize={11}
          width={70}
        />
        <Tooltip
          contentStyle={{
            background: '#06120c',
            border: '1px solid #d4af37',
            fontSize: 12,
            color: '#f0c64a',
          }}
        />
        <Bar dataKey="value">
          {chartData.map((d) => (
            <Cell key={d.name} fill={d.value >= 0 ? '#3dd17a' : '#a3122a'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
