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
import type { LeaderboardRow } from '@/systems/stats';

interface Props {
  rows: readonly LeaderboardRow[];
  currentUserId: string | null;
  height?: number;
  /** Formatter applied to the tooltip value. */
  formatValue?: (v: number) => string;
}

const DEFAULT_FORMAT = (v: number): string => v.toLocaleString();

export default function BoardBar({
  rows,
  currentUserId,
  height = 220,
  formatValue = DEFAULT_FORMAT,
}: Props): JSX.Element {
  if (rows.length === 0) {
    return <div className="text-xs text-white/40">No rankings yet.</div>;
  }
  const chartData = rows.slice(0, 10).map((r) => ({
    name: r.username,
    value: r.value,
    isCurrent: r.userId === currentUserId,
  }));
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
          width={80}
        />
        <Tooltip
          formatter={(value: number) => formatValue(value)}
          contentStyle={{
            background: '#06120c',
            border: '1px solid #d4af37',
            fontSize: 12,
            color: '#f0c64a',
          }}
        />
        <Bar dataKey="value">
          {chartData.map((d) => (
            <Cell
              key={d.name}
              fill={d.isCurrent ? '#f0c64a' : '#d4af37'}
              opacity={d.isCurrent ? 1 : 0.7}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
