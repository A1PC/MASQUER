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
import type { RouletteDistributionPoint } from '@/systems/stats';

interface Props {
  /** 37 entries (one per pocket 0–36). Colours per ADR-0029. */
  data: readonly RouletteDistributionPoint[];
  height?: number;
}

/** Pocket fill per semantic colour. Matches `roulette-pocket-*` tokens used
 *  on the game-side wheel; mirrored here so the admin chart reads at a
 *  glance against the wheel itself. */
const POCKET_FILL: Record<RouletteDistributionPoint['color'], string> = {
  red: '#a3122a',
  black: '#1a1a1a',
  green: '#3dd17a',
};

/** Eyebrow colour per pocket — gold on black for legibility, ivory on
 *  red/green so the colour name reads at the same contrast as the body. */
const POCKET_EYEBROW: Record<RouletteDistributionPoint['color'], string> = {
  red: 'text-ivory',
  black: 'text-gold',
  green: 'text-ivory',
};

/**
 * Custom Recharts tooltip — ivory body on velvet-deep ground with a brass
 * hairline border. Replaces Recharts' default black-on-white tooltip so
 * the chart matches the MASQUER Velvet Deco palette and stays legible
 * (4.5 : 1 contrast minimum on body text).
 *
 * Exported for unit-testing (Recharts only mounts tooltip content on
 * hover, which jsdom can't simulate reliably; testing the component
 * directly is the cleanest path).
 */
export function ChartTooltip({
  active,
  payload,
}: TooltipProps<number, string>): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  if (!item) return null;
  const point = item.payload as RouletteDistributionPoint;
  const { number, count, color } = point;
  return (
    <div
      data-chart-tooltip="pocket-distribution"
      className="rounded-md border border-brass/60 bg-velvet-deep px-3 py-2 text-ivory shadow-lg"
    >
      <div
        className={`font-display text-[10px] uppercase tracking-[0.18em] ${POCKET_EYEBROW[color]}`}
      >
        {color} pocket {number}
      </div>
      <div className="font-body text-sm text-ivory">
        {count.toLocaleString()} spin{count === 1 ? '' : 's'}
      </div>
    </div>
  );
}

/** Thin Recharts wrapper for the 37-bar roulette distribution chart.
 *  Each bar is coloured by its pocket colour so the visual maps directly
 *  to the wheel. ADR-0039 — Recharts ships in the admin chunk only. */
export default function PocketDistributionBar({ data, height = 220 }: Props): JSX.Element {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data as RouletteDistributionPoint[]}
        margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
      >
        <CartesianGrid stroke="rgba(212,175,55,0.12)" />
        <XAxis
          dataKey="number"
          stroke="rgba(255,255,255,0.5)"
          fontSize={9}
          interval={2}
          tickLine={false}
        />
        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} allowDecimals={false} width={32} />
        <Tooltip cursor={{ fill: 'rgba(199,154,75,0.12)' }} content={<ChartTooltip />} />
        <Bar dataKey="count" isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.number} fill={POCKET_FILL[d.color]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
