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
import type { BlackjackHandOutcome, BlackjackOutcomeKey } from '@/systems/stats';
import { ChartTooltipShell } from './ChartTooltip';

interface Props {
  data: readonly BlackjackHandOutcome[];
  height?: number;
}

/** Outcome → fill colour (brand tokens). Blackjack = signature gold-bright;
 *  win = chip-win green; push = ivory; lose = casino-red; bust = darker red. */
const OUTCOME_FILL: Record<BlackjackOutcomeKey, string> = {
  blackjack: '#e9c449', // gold-bright
  win: '#4ade80', // chip-win
  push: '#f6efde', // ivory
  lose: '#b91c1c', // casino-red
  bust: '#7f1d1d', // darker red
};

const OUTCOME_LABEL: Record<BlackjackOutcomeKey, string> = {
  blackjack: 'Blackjack',
  win: 'Win',
  push: 'Push',
  lose: 'Lose',
  bust: 'Bust',
};

/** Custom Recharts tooltip — ivory body on velvet-deep ground with a brass
 *  hairline border. Mirrors the other admin chart wrappers (#251). */
export function BlackjackOutcomeTooltip({
  active,
  payload,
}: TooltipProps<number, string>): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  if (!item) return null;
  const point = item.payload as BlackjackHandOutcome;
  return (
    <ChartTooltipShell variant="blackjack-outcome">
      <div className="font-display text-[10px] uppercase tracking-[0.18em] text-gold">
        {OUTCOME_LABEL[point.outcome]}
      </div>
      <div className="font-body text-sm text-ivory">
        {point.count.toLocaleString()} hand{point.count === 1 ? '' : 's'}
      </div>
    </ChartTooltipShell>
  );
}

/** Thin Recharts wrapper for the 5-bar blackjack hand-outcome distribution.
 *  Renders Blackjack / Win / Push / Lose / Bust in fixed canonical order.
 *  ADR-0039 — Recharts ships in a shared admin chunk. */
export default function BlackjackHandOutcomeBar({ data, height = 220 }: Props): JSX.Element {
  const display = data.map((d) => ({ ...d, label: OUTCOME_LABEL[d.outcome] }));
  return (
    <div className="w-full" data-blackjack-outcome-bar>
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
          <Tooltip
            cursor={{ fill: 'rgba(199,154,75,0.12)' }}
            content={<BlackjackOutcomeTooltip />}
          />
          <Bar dataKey="count" isAnimationActive={false}>
            {display.map((d) => (
              <Cell key={d.outcome} fill={OUTCOME_FILL[d.outcome]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
