import type { JSX } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { NetFlowPoint } from '@/systems/stats';
import { DefaultChartTooltip } from './ChartTooltip';

type Props = { data: NetFlowPoint[]; height?: number };

export default function UserActivityLine({ data, height = 180 }: Props): JSX.Element {
  if (data.length === 0) {
    return <div className="text-xs text-white/40">No rounds yet for this user.</div>;
  }
  const chartData = data.map((p) => ({
    day: new Date(p.dayStartMs).toISOString().slice(0, 10),
    netChange: p.netChange,
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData}>
        <CartesianGrid stroke="rgba(212,175,55,0.12)" />
        <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={10} />
        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
        <Tooltip
          cursor={{ stroke: 'rgba(199,154,75,0.3)', strokeWidth: 1 }}
          content={<DefaultChartTooltip />}
        />
        <Area
          type="monotone"
          dataKey="netChange"
          stroke="#5b6ed1"
          fill="rgba(91,110,209,0.25)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
