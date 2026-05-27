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
import type { PokerSessionsByVariantDay } from '@/systems/stats';
import { ChartTooltipShell } from './ChartTooltip';

interface Props {
  /** Last-N-days spine, oldest first. Each entry contributes one stacked bar
   *  (Hold'em / Draw / Omaha segments). */
  data: readonly PokerSessionsByVariantDay[];
  height?: number;
}

/** Stacked-segment fill per variant. Hold'em = gold-bright (lead), Draw =
 *  brass (warm middle), Omaha = velvet (deep signature). Mirrors the
 *  poker palette established in the variant modal + lobby. */
const VARIANT_FILL = {
  holdem: '#e9c449', // gold-bright
  fiveCardDraw: '#c7994b', // brass
  omaha: '#7a1f2b', // velvet-deep
} as const;

const VARIANT_LABEL = {
  holdem: "Hold'em",
  fiveCardDraw: 'Five-Card Draw',
  omaha: 'Omaha',
} as const;

/** Shorten a YYYY-MM-DD label to MM-DD for the x-axis so 30 ticks fit. */
function shortDate(date: string): string {
  // date is YYYY-MM-DD; slice the last 5 chars for MM-DD.
  return date.length >= 10 ? date.slice(5) : date;
}

/** Custom Recharts tooltip — ivory body on velvet-deep with brass hairline.
 *  Echoes the BingoVariantDifficultyBar / PocketDistributionBar pattern so
 *  the admin charts read consistently (#251). */
export function ChartTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <ChartTooltipShell variant="poker-sessions-by-variant">
      <div className="mb-1 font-display text-[10px] uppercase tracking-[0.18em] text-gold">
        {String(label ?? '')}
      </div>
      <div className="space-y-0.5 text-xs">
        {payload.map((p) => {
          const rawKey = String(p.dataKey ?? p.name ?? '');
          const isVariant = rawKey === 'holdem' || rawKey === 'fiveCardDraw' || rawKey === 'omaha';
          const display = isVariant ? VARIANT_LABEL[rawKey] : rawKey;
          const value = typeof p.value === 'number' ? p.value : 0;
          return (
            <div key={rawKey} className="flex items-center justify-between gap-3 tabular-nums">
              <span className="flex items-center gap-1.5 text-ivory/70">
                <span
                  aria-hidden="true"
                  className="inline-block h-2 w-2 rounded-full"
                  style={{
                    background: isVariant ? VARIANT_FILL[rawKey] : 'transparent',
                  }}
                />
                {display}
              </span>
              <span className="font-mono text-ivory">{value.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </ChartTooltipShell>
  );
}

/**
 * Stacked-bar wrapper for the per-day poker sessions × variant chart. Each
 * bar = one UTC day; segments stack Hold'em → Draw → Omaha. Recharts
 * lazy-loads via the admin chunk (ADR-0039). Mirrors the
 * `BingoVariantDifficultyBar` + `PlinkoBinDistributionBar` shape from the
 * earlier Phase 15 admin pages.
 */
export default function PokerSessionsByVariantBar({ data, height = 240 }: Props): JSX.Element {
  // Recharts wants a plain mutable array. Map adds the short x-axis label.
  const shaped = data.map((d) => ({ ...d, label: shortDate(d.date) }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={shaped} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid stroke="rgba(212,175,55,0.12)" />
        <XAxis
          dataKey="label"
          stroke="rgba(255,255,255,0.5)"
          fontSize={9}
          interval={2}
          tickLine={false}
        />
        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} allowDecimals={false} width={32} />
        <Tooltip cursor={{ fill: 'rgba(199,154,75,0.12)' }} content={<ChartTooltip />} />
        <Bar
          dataKey="holdem"
          stackId="variant"
          fill={VARIANT_FILL.holdem}
          isAnimationActive={false}
        />
        <Bar
          dataKey="fiveCardDraw"
          stackId="variant"
          fill={VARIANT_FILL.fiveCardDraw}
          isAnimationActive={false}
        />
        <Bar
          dataKey="omaha"
          stackId="variant"
          fill={VARIANT_FILL.omaha}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
