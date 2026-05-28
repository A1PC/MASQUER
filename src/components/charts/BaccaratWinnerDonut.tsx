import type { JSX } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, type TooltipProps } from 'recharts';
import type { BaccaratWinnerCount } from '@/systems/stats';
import { ChartTooltipShell } from './ChartTooltip';

interface Props {
  /** Exactly 3 entries in canonical Player → Banker → Tie order. */
  data: readonly BaccaratWinnerCount[];
  height?: number;
}

/** Same scoreboard tokens as BaccaratWinnerBar — keeps the donut + bar
 *  reading consistent when stacked on the same admin page. */
const WINNER_FILL: Record<BaccaratWinnerCount['winner'], string> = {
  player: '#1e3a8a', // scoreboard-player
  banker: '#a3122a', // scoreboard-banker
  tie: '#3dd17a', // scoreboard-tie
};

const WINNER_LABEL: Record<BaccaratWinnerCount['winner'], string> = {
  player: 'Player',
  banker: 'Banker',
  tie: 'Tie',
};

export function BaccaratDonutTooltip({
  active,
  payload,
}: TooltipProps<number, string>): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  if (!item) return null;
  const point = item.payload as BaccaratWinnerCount;
  return (
    <ChartTooltipShell variant="baccarat-winner-donut">
      <div className="font-display text-[10px] uppercase tracking-[0.18em] text-gold">
        {WINNER_LABEL[point.winner]}
      </div>
      <div className="font-body text-sm text-ivory">
        {point.count.toLocaleString()} round{point.count === 1 ? '' : 's'}
      </div>
    </ChartTooltipShell>
  );
}

/** Donut variant of the baccarat winner distribution. Renders alongside (not
 *  instead of) `BaccaratWinnerBar`; PR B additive constraint. */
export default function BaccaratWinnerDonut({ data, height = 220 }: Props): JSX.Element {
  return (
    <div className="w-full" data-baccarat-winner-donut>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Tooltip cursor={{ fill: 'rgba(199,154,75,0.12)' }} content={<BaccaratDonutTooltip />} />
          <Pie
            data={[...data]}
            dataKey="count"
            nameKey="winner"
            cx="50%"
            cy="50%"
            innerRadius="50%"
            outerRadius="80%"
            isAnimationActive={false}
            stroke="rgba(212,175,55,0.3)"
          >
            {data.map((d) => (
              <Cell key={d.winner} fill={WINNER_FILL[d.winner]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
