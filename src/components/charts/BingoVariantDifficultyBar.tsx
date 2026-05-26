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
import type { BingoVariantDifficultyCount } from '@/systems/stats';
import { ChartTooltipShell } from './ChartTooltip';

interface Props {
  /** 6 entries — canonical order is British(easy/medium/hard) then American
   *  (easy/medium/hard) per `getBingoVariantDifficultyDistribution`. */
  data: readonly BingoVariantDifficultyCount[];
  height?: number;
}

const VARIANT_LABEL: Record<BingoVariantDifficultyCount['variant'], string> = {
  british: 'British',
  american: 'American',
};

const DIFFICULTY_LABEL: Record<BingoVariantDifficultyCount['difficulty'], string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

/** Stacked-bar segment fill per difficulty. Easy = jewel emerald (calm),
 *  Medium = gold (warm middle), Hard = velvet (hot signature). Mirrors the
 *  semantic colour map other charts use. */
const DIFFICULTY_FILL: Record<BingoVariantDifficultyCount['difficulty'], string> = {
  easy: '#3dd17a', // jewel-emerald approx
  medium: '#d4af37', // gold
  hard: '#7a1f2b', // velvet-deep approx
};

interface RowShape {
  variant: BingoVariantDifficultyCount['variant'];
  label: string;
  easy: number;
  medium: number;
  hard: number;
  total: number;
}

/** Reshape the 6-row flat list into the 2-row stacked shape Recharts needs.
 *  Kept as a private helper — the test covers it via the rendered chart's
 *  data attributes rather than a direct export (avoids the
 *  react-refresh/only-export-components warning). */
function shapeForChart(data: readonly BingoVariantDifficultyCount[]): RowShape[] {
  const map = new Map<BingoVariantDifficultyCount['variant'], RowShape>();
  for (const v of ['british', 'american'] as const) {
    map.set(v, { variant: v, label: VARIANT_LABEL[v], easy: 0, medium: 0, hard: 0, total: 0 });
  }
  for (const d of data) {
    const row = map.get(d.variant);
    if (!row) continue;
    row[d.difficulty] = d.count;
    row.total += d.count;
  }
  return Array.from(map.values());
}

/**
 * Custom Recharts tooltip — ivory body on velvet-deep with the brass
 * hairline. Hovering a stack shows every segment so the operator can read
 * the breakdown without squinting at the legend.
 */
export function ChartTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <ChartTooltipShell variant="bingo-variant-difficulty">
      <div className="mb-1 font-display text-[10px] uppercase tracking-[0.18em] text-gold">
        {String(label ?? '')}
      </div>
      <div className="space-y-0.5 text-xs">
        {payload.map((p) => {
          const rawKey = String(p.dataKey ?? p.name ?? '');
          const isDifficulty = rawKey === 'easy' || rawKey === 'medium' || rawKey === 'hard';
          const display = isDifficulty ? DIFFICULTY_LABEL[rawKey] : rawKey;
          const value = typeof p.value === 'number' ? p.value : 0;
          return (
            <div key={rawKey} className="flex items-center justify-between gap-3 tabular-nums">
              <span className="flex items-center gap-1.5 text-ivory/70">
                <span
                  aria-hidden="true"
                  className="inline-block h-2 w-2 rounded-full"
                  style={{
                    background: isDifficulty ? DIFFICULTY_FILL[rawKey] : 'transparent',
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
 * Stacked-bar wrapper for the variant × difficulty distribution. Each bar
 * represents one variant; segments stack Easy → Medium → Hard. Recharts
 * lazy-loads via the admin chunk (ADR-0039). Mirrors the
 * `PocketDistributionBar` / `BaccaratWinnerBar` patterns from earlier
 * Phase 15 sub-projects.
 */
export default function BingoVariantDifficultyBar({ data, height = 220 }: Props): JSX.Element {
  const shaped = shapeForChart(data);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={shaped} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid stroke="rgba(212,175,55,0.12)" />
        <XAxis
          dataKey="label"
          stroke="rgba(255,255,255,0.5)"
          fontSize={11}
          interval={0}
          tickLine={false}
        />
        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} allowDecimals={false} width={32} />
        <Tooltip cursor={{ fill: 'rgba(199,154,75,0.12)' }} content={<ChartTooltip />} />
        <Bar
          dataKey="easy"
          stackId="difficulty"
          fill={DIFFICULTY_FILL.easy}
          isAnimationActive={false}
        />
        <Bar
          dataKey="medium"
          stackId="difficulty"
          fill={DIFFICULTY_FILL.medium}
          isAnimationActive={false}
        />
        <Bar
          dataKey="hard"
          stackId="difficulty"
          fill={DIFFICULTY_FILL.hard}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
