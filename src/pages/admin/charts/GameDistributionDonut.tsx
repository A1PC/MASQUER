import type { JSX } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { GameDistributionPoint } from '@/pages/admin/queries';

const COLORS: Record<string, string> = {
  blackjack: '#3dd17a',
  roulette: '#a3122a',
  slots: '#d4af37',
  baccarat: '#5b6ed1',
  'coin-flip': '#9b59b6',
};

type Props = { data: GameDistributionPoint[]; height?: number };

export default function GameDistributionDonut({ data, height = 220 }: Props): JSX.Element {
  if (data.length === 0) {
    return <div className="text-xs text-white/40">No rounds yet.</div>;
  }
  const chartData = data.map((d) => ({ name: d.game, value: d.rounds }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
        >
          {chartData.map((d) => (
            <Cell key={d.name} fill={COLORS[d.name] ?? '#888'} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: '#06120c',
            border: '1px solid #d4af37',
            fontSize: 12,
            color: '#f0c64a',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
