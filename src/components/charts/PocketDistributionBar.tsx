import type { JSX } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
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
        <Tooltip
          contentStyle={{
            background: '#06120c',
            border: '1px solid #d4af37',
            fontSize: 12,
            color: '#f0c64a',
          }}
          labelFormatter={(label: number) => `Pocket ${label}`}
          formatter={(value: number) => [`${value} hit${value === 1 ? '' : 's'}`, 'count']}
        />
        <Bar dataKey="count" isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.number} fill={POCKET_FILL[d.color]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
