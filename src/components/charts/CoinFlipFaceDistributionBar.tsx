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
import type { CoinFlipFaceCount, CoinSide } from '@/systems/stats';
import { ChartTooltipShell } from './ChartTooltip';

interface Props {
  data: readonly CoinFlipFaceCount[];
  height?: number;
}

const FACE_FILL: Record<CoinSide, string> = {
  // Heads = brass / warm gold; tails = velvet / cool brass.
  heads: '#e9c449', // gold-bright
  tails: '#9b7333', // brass
};

const FACE_LABEL: Record<CoinSide, string> = {
  heads: 'Heads',
  tails: 'Tails',
};

/** Custom Recharts tooltip — ivory body on velvet-deep ground with a brass
 *  hairline border. Mirrors other admin chart wrappers (#251). */
export function CoinFlipFaceTooltip({
  active,
  payload,
}: TooltipProps<number, string>): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  if (!item) return null;
  const point = item.payload as CoinFlipFaceCount;
  return (
    <ChartTooltipShell variant="coin-flip-face">
      <div className="font-display text-[10px] uppercase tracking-[0.18em] text-gold">
        {FACE_LABEL[point.outcome]}
      </div>
      <div className="font-body text-sm text-ivory">
        {point.count.toLocaleString()} flip{point.count === 1 ? '' : 's'}
      </div>
    </ChartTooltipShell>
  );
}

/** Two-bar coin-flip landed-face distribution. */
export default function CoinFlipFaceDistributionBar({ data, height = 220 }: Props): JSX.Element {
  const display = data.map((d) => ({ ...d, label: FACE_LABEL[d.outcome] }));
  return (
    <div className="w-full" data-coin-flip-face-bar>
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
          <Tooltip cursor={{ fill: 'rgba(199,154,75,0.12)' }} content={<CoinFlipFaceTooltip />} />
          <Bar dataKey="count" isAnimationActive={false}>
            {display.map((d) => (
              <Cell key={d.outcome} fill={FACE_FILL[d.outcome]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
