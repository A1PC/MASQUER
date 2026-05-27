import type { JSX } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltipShell } from './ChartTooltip';
import type { DailyActivityPoint } from '@/systems/stats';

interface Props {
  data: DailyActivityPoint[];
}

function Body({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: DailyActivityPoint }>;
}): JSX.Element | null {
  if (!active || !payload?.[0]) return null;
  const p = payload[0].payload;
  return (
    <ChartTooltipShell variant="daily-activity">
      <div className="font-mono text-[10px] tabular-nums text-ivory">
        {p.date}: <span className="text-gold-bright">{p.sessions}</span>
      </div>
    </ChartTooltipShell>
  );
}

/**
 * Tiny line chart of sessions/day for the admin Overview. No axes, brand-
 * tokened stroke (gold), `ChartTooltipShell`-based tooltip for visual parity
 * with the rest of the admin chart suite (#251 pattern). Phase 15 #14.
 */
export default function DailyActivitySparkline({ data }: Props): JSX.Element {
  return (
    <div className="h-16 w-full" data-daily-activity-sparkline>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <XAxis dataKey="date" hide />
          <YAxis hide allowDecimals={false} />
          <Tooltip content={<Body />} cursor={{ stroke: '#c79a4b', strokeOpacity: 0.4 }} />
          <Line
            type="monotone"
            dataKey="sessions"
            stroke="#f0c64a"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
