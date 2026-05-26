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
import type { SlotsCombinationCount } from '@/systems/stats';
import { ChartTooltipShell } from './ChartTooltip';

interface Props {
  /** One entry per paytable combination, paytable-order (highest first). */
  data: readonly SlotsCombinationCount[];
  height?: number;
}

/** Bar fill per win tier — magenta for jackpot, gold for medium, green for
 *  small. Mirrors the celebration palette in the game UI so the chart reads
 *  as "rarer = brighter". */
const TIER_FILL: Record<SlotsCombinationCount['tier'], string> = {
  jackpot: '#e84a8c',
  medium: '#d4af37',
  small: '#3dd17a',
};

/** Eyebrow tone per tier — gold reads well on velvet for medium/small,
 *  ivory keeps magenta legible at small sizes. */
const TIER_EYEBROW: Record<SlotsCombinationCount['tier'], string> = {
  jackpot: 'text-ivory',
  medium: 'text-gold',
  small: 'text-gold',
};

/**
 * Custom Recharts tooltip — ivory body on velvet-deep ground with a brass
 * hairline border. Mirrors the PocketDistributionBar tooltip (shipped at
 * #237) so chart hover treatment stays consistent across the admin shell.
 */
export function ChartTooltip({
  active,
  payload,
}: TooltipProps<number, string>): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  if (!item) return null;
  const point = item.payload as SlotsCombinationCount;
  const { label, count, totalPaid, payoutMultiple, tier } = point;
  return (
    <ChartTooltipShell variant="slots-combination">
      <div className={`font-display text-[10px] uppercase tracking-[0.18em] ${TIER_EYEBROW[tier]}`}>
        {label} · {payoutMultiple}× · {tier}
      </div>
      <div className="font-body text-sm text-ivory">
        {count.toLocaleString()} hit{count === 1 ? '' : 's'}
      </div>
      <div className="font-body text-[11px] text-ivory/70">
        paid {totalPaid.toLocaleString()} chip{totalPaid === 1 ? '' : 's'}
      </div>
    </ChartTooltipShell>
  );
}

/** Thin Recharts wrapper for the slots combination distribution chart.
 *  Each bar is coloured by its win tier so the visual maps directly to
 *  the celebration palette. ADR-0039 — Recharts ships in a shared chunk. */
export default function SlotsCombinationBar({ data, height = 240 }: Props): JSX.Element {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data as SlotsCombinationCount[]}
        margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
      >
        <CartesianGrid stroke="rgba(212,175,55,0.12)" />
        <XAxis
          dataKey="label"
          stroke="rgba(255,255,255,0.5)"
          fontSize={10}
          tickLine={false}
          interval={0}
        />
        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} allowDecimals={false} width={32} />
        <Tooltip cursor={{ fill: 'rgba(199,154,75,0.12)' }} content={<ChartTooltip />} />
        <Bar dataKey="count" isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.key} fill={TIER_FILL[d.tier]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
