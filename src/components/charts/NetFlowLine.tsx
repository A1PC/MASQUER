import type { JSX } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { NetFlowPoint } from '@/systems/stats';
import { DefaultChartTooltip } from './ChartTooltip';

type Props = { data: NetFlowPoint[]; height?: number };

export default function NetFlowLine({ data, height = 220 }: Props): JSX.Element {
  if (data.length === 0) {
    return <div className="text-xs text-white/40">No data yet — play a round to populate.</div>;
  }
  const chartData = data.map((p) => ({
    day: new Date(p.dayStartMs).toISOString().slice(0, 10),
    netChange: p.netChange,
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <CartesianGrid stroke="rgba(212,175,55,0.12)" />
        <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={10} />
        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
        <Tooltip
          cursor={{ stroke: 'rgba(199,154,75,0.3)', strokeWidth: 1 }}
          content={<DefaultChartTooltip />}
        />
        <Line
          type="monotone"
          dataKey="netChange"
          stroke="#d4af37"
          strokeWidth={2}
          dot={{ r: 2, fill: '#d4af37' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
