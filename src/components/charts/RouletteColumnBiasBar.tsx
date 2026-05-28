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
import { ChartTooltipShell } from './ChartTooltip';

interface ColumnPoint {
  /** 1-indexed column label (1st / 2nd / 3rd) — for the x-axis tick. */
  column: 1 | 2 | 3;
  count: number;
}

interface Props {
  /** Exactly 3 entries in [1st-col, 2nd-col, 3rd-col] order. */
  data: readonly ColumnPoint[];
  height?: number;
}

const COLUMN_FILL: Record<ColumnPoint['column'], string> = {
  1: '#e9c449', // gold-bright
  2: '#d4af37', // gold
  3: '#9b7333', // brass
};

const COLUMN_LABEL: Record<ColumnPoint['column'], string> = {
  1: '1st column',
  2: '2nd column',
  3: '3rd column',
};

export function RouletteColumnTooltip({
  active,
  payload,
}: TooltipProps<number, string>): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  if (!item) return null;
  const point = item.payload as ColumnPoint;
  return (
    <ChartTooltipShell variant="roulette-column-bias">
      <div className="font-display text-[10px] uppercase tracking-[0.18em] text-gold">
        {COLUMN_LABEL[point.column]}
      </div>
      <div className="font-body text-sm text-ivory">
        {point.count.toLocaleString()} hit{point.count === 1 ? '' : 's'}
      </div>
    </ChartTooltipShell>
  );
}

/** 3-bar roulette column-bias chart (1st/2nd/3rd column hit counts).
 *  Renders alongside the existing PocketDistributionBar on AdminRoulettePage. */
export default function RouletteColumnBiasBar({ data, height = 220 }: Props): JSX.Element {
  const display = data.map((d) => ({ ...d, label: COLUMN_LABEL[d.column] }));
  return (
    <div className="w-full" data-roulette-column-bias-bar>
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
          <Tooltip cursor={{ fill: 'rgba(199,154,75,0.12)' }} content={<RouletteColumnTooltip />} />
          <Bar dataKey="count" isAnimationActive={false}>
            {display.map((d) => (
              <Cell key={d.column} fill={COLUMN_FILL[d.column]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
