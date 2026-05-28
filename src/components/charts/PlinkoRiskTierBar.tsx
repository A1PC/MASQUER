import type { JSX } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';
import type { PlinkoRisk, PlinkoRiskDistribution } from '@/systems/stats';
import { ChartTooltipShell } from './ChartTooltip';

interface Props {
  data: readonly PlinkoRiskDistribution[];
  height?: number;
}

const RISK_FILL: Record<PlinkoRisk, string> = {
  safe: '#d4af37', // gold
  low: '#e9c449', // gold-bright
  medium: '#e84a8c', // jewel-magenta mid
  high: '#f291bd', // jewel-magenta high
};

const RISK_LABEL: Record<PlinkoRisk, string> = {
  safe: 'Safe',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export function PlinkoRiskTooltip({
  active,
  payload,
}: TooltipProps<number, string>): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  if (!item) return null;
  const point = item.payload as PlinkoRiskDistribution;
  return (
    <ChartTooltipShell variant="plinko-risk">
      <div className="font-display text-[10px] uppercase tracking-[0.18em] text-gold">
        {RISK_LABEL[point.risk]} risk
      </div>
      <div className="font-body text-sm text-ivory">
        {point.count.toLocaleString()} drop{point.count === 1 ? '' : 's'}
      </div>
    </ChartTooltipShell>
  );
}

/** 4-bar plinko risk-tier distribution (safe/low/medium/high session drops).
 *  Sits ALONGSIDE the existing bin-distribution hero chart on AdminPlinkoPage. */
export default function PlinkoRiskTierBar({ data, height = 220 }: Props): JSX.Element {
  const display = data.map((d) => ({ ...d, label: RISK_LABEL[d.risk] }));
  return (
    <div className="w-full" data-plinko-risk-tier-bar>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={display} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="rgba(212,175,55,0.12)" />
          <XAxis
            dataKey="label"
            stroke="rgba(246,239,222,0.55)"
            fontSize={11}
            interval={0}
            tickLine={false}
          />
          <YAxis stroke="rgba(246,239,222,0.45)" fontSize={10} allowDecimals={false} width={32} />
          <Tooltip cursor={{ fill: 'rgba(199,154,75,0.12)' }} content={<PlinkoRiskTooltip />} />
          <Bar dataKey="count" isAnimationActive={false}>
            {display.map((d) => (
              <Cell key={d.risk} fill={RISK_FILL[d.risk]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
