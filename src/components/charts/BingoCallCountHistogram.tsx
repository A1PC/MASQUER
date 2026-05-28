import type { JSX } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';
import type { BingoCallCountBin } from '@/systems/stats';
import { ChartTooltipShell } from './ChartTooltip';

interface Props {
  data: readonly BingoCallCountBin[];
  height?: number;
}

function binLabel(b: BingoCallCountBin): string {
  if (!Number.isFinite(b.binMax)) return `${b.binMin}+`;
  return `${b.binMin}-${b.binMax}`;
}

export function BingoCallCountTooltip({
  active,
  payload,
}: TooltipProps<number, string>): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  if (!item) return null;
  const point = item.payload as BingoCallCountBin & { label: string };
  return (
    <ChartTooltipShell variant="bingo-call-count">
      <div className="font-display text-[10px] uppercase tracking-[0.18em] text-gold">
        {point.label} calls
      </div>
      <div className="font-body text-sm text-ivory">
        {point.count.toLocaleString()} game{point.count === 1 ? '' : 's'}
      </div>
    </ChartTooltipShell>
  );
}

/** 9-bin histogram of `finalCallCount` per settled bingo game (binned in
 *  10-call windows from 0-9 up to 80+). Sits alongside the existing
 *  variant/difficulty hero chart on AdminBingoPage. */
export default function BingoCallCountHistogram({ data, height = 220 }: Props): JSX.Element {
  const display = data.map((d) => ({ ...d, label: binLabel(d) }));
  return (
    <div className="w-full" data-bingo-call-count-histogram>
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
          <Tooltip cursor={{ fill: 'rgba(199,154,75,0.12)' }} content={<BingoCallCountTooltip />} />
          <Bar dataKey="count" fill="#e9c449" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
