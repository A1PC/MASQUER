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
import type { PlinkoBinDistribution } from '@/systems/stats';
import { ChartTooltipShell } from './ChartTooltip';

interface Props {
  /** Exactly 27 entries (one per bin 0..26). Centre bin (13) reads as the
   *  dimmest "loss territory" colour; edges (0 / 26) read as the brightest
   *  jewel-magenta "jackpot territory" colour with a smooth gradient
   *  between, so the chart visually echoes the multiplier curve shape on
   *  the game-side board. */
  data: readonly PlinkoBinDistribution[];
  height?: number;
}

/** Edge-bin signature colour (matches the bin-row jewel-magenta jackpot
 *  treatment in `BinRow.tsx`) and the central loss-territory dim gold. The
 *  in-between bars interpolate linearly between the two. */
const EDGE_FILL = '#e84a8c'; // jewel-magenta (mirrors BaccaratWinnerBar tier-3)
const CENTRE_FILL = '#6a5520'; // dim gold (mid-shadow of brass tone)

/** Linear-RGB hex interpolation between two #rrggbb colours. Used to
 *  shade bars from CENTRE (loss territory) outwards to EDGE (jackpot
 *  territory) so the visual mirrors the V-shaped multiplier curve.
 *  `t` is clamped to [0, 1]. */
function lerpHex(a: string, b: string, t: number): string {
  const tt = Math.max(0, Math.min(1, t));
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * tt);
  const g = Math.round(ag + (bg - ag) * tt);
  const bch = Math.round(ab + (bb - ab) * tt);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(bch)}`;
}

/** Resolve a bar fill from its bin index + total bin count. Edge bins land
 *  at EDGE_FILL; the centre bin lands at CENTRE_FILL; the rest interpolate
 *  by Manhattan distance from the centre normalised to [0, 1]. */
function binFill(bin: number, total: number): string {
  const centre = Math.floor(total / 2);
  // Distance from centre normalised so centre = 0 and either edge = 1.
  const maxDist = Math.max(centre, total - 1 - centre);
  const t = maxDist === 0 ? 0 : Math.abs(bin - centre) / maxDist;
  return lerpHex(CENTRE_FILL, EDGE_FILL, t);
}

/**
 * Custom Recharts tooltip — ivory body on velvet-deep ground with a brass
 * hairline border. Mirrors the PocketDistributionBar (#237),
 * SlotsCombinationBar (#242), and BaccaratWinnerBar (#247) tooltips so
 * chart hover treatment stays consistent across the admin shell.
 *
 * Exported for unit-testing (Recharts only mounts tooltip content on
 * hover, which jsdom can't simulate reliably; testing the component
 * directly is the cleanest path — see #251).
 */
export function ChartTooltip({
  active,
  payload,
}: TooltipProps<number, string>): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  if (!item) return null;
  const point = item.payload as PlinkoBinDistribution;
  const { bin, count } = point;
  // Edge bins get a brighter eyebrow so the jackpot territory reads at a
  // glance on hover; gold for everything else.
  const isEdge = bin === 0 || bin === 26;
  const eyebrow = isEdge ? 'text-ivory' : 'text-gold';
  return (
    <ChartTooltipShell variant="plinko-bin-distribution">
      <div className={`font-display text-[10px] uppercase tracking-[0.18em] ${eyebrow}`}>
        bin {bin}
        {isEdge ? ' · edge' : bin === 13 ? ' · centre' : ''}
      </div>
      <div className="font-body text-sm tabular-nums text-ivory">
        {count.toLocaleString()} ball{count === 1 ? '' : 's'}
      </div>
    </ChartTooltipShell>
  );
}

/** Thin Recharts wrapper for the 27-bar plinko bin-distribution chart.
 *  Each bar is coloured by its distance from the centre bin so the visual
 *  echoes the V-shaped multiplier curve on the game-side board.
 *  ADR-0039 — Recharts ships in the admin chunk only. */
export default function PlinkoBinDistributionBar({ data, height = 240 }: Props): JSX.Element {
  const total = data.length;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data as PlinkoBinDistribution[]}
        margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
      >
        <CartesianGrid stroke="rgba(212,175,55,0.12)" />
        <XAxis
          dataKey="bin"
          stroke="rgba(255,255,255,0.5)"
          fontSize={9}
          interval={2}
          tickLine={false}
        />
        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} allowDecimals={false} width={32} />
        <Tooltip cursor={{ fill: 'rgba(199,154,75,0.12)' }} content={<ChartTooltip />} />
        <Bar dataKey="count" isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.bin} fill={binFill(d.bin, total)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
