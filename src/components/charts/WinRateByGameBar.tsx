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
        <Tooltip
          formatter={(value: number) => `${value.toFixed(1)}%`}
          contentStyle={{
            background: '#06120c',
            border: '1px solid #d4af37',
            fontSize: 12,
            color: '#f0c64a',
          }}
        />
        <Bar dataKey="winRate">
          {data.map((d) => (
            <Cell key={d.game} fill={d.winRate >= 50 ? '#3dd17a' : '#d4af37'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
