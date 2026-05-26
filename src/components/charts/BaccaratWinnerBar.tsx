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
import type { BaccaratWinnerCount } from '@/systems/stats';

interface Props {
  /** Exactly 3 entries in canonical Player → Banker → Tie order. */
  data: readonly BaccaratWinnerCount[];
  height?: number;
}

/** Bar fill per winner — matches the scoreboard-* tokens promoted in PR A
 *  (#247). Banker red / Player blue / Tie green is the universal Punto Banco
 *  scoreboard convention; using the same tokens here keeps the admin chart
 *  reading consistent with the bead-plate + big-road on the game side. */
const WINNER_FILL: Record<BaccaratWinnerCount['winner'], string> = {
  player: '#1e3a8a', // scoreboard-player
  banker: '#a3122a', // scoreboard-banker
  tie: '#3dd17a', // scoreboard-tie
};

/** Eyebrow tone per winner — ivory reads well on red/blue, gold pops on
 *  green for the tie. Mirrors the eyebrow-per-tier choice in the slots and
 *  roulette wrappers so admin chart hover treatment stays coherent. */
const WINNER_EYEBROW: Record<BaccaratWinnerCount['winner'], string> = {
  player: 'text-ivory',
  banker: 'text-ivory',
  tie: 'text-gold',
};

const WINNER_LABEL: Record<BaccaratWinnerCount['winner'], string> = {
  player: 'Player',
  banker: 'Banker',
  tie: 'Tie',
};

/**
 * Custom Recharts tooltip — ivory body on velvet-deep ground with a brass
 * hairline border. Mirrors the PocketDistributionBar (#237) and
 * SlotsCombinationBar (#242) tooltips so chart hover treatment stays
 * consistent across the admin shell.
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
  const point = item.payload as BaccaratWinnerCount;
  const { winner, count } = point;
  return (
    <div
      data-chart-tooltip="baccarat-winner"
      className="rounded-md border border-brass/60 bg-velvet-deep px-3 py-2 text-ivory shadow-lg"
    >
      <div
        className={`font-display text-[10px] uppercase tracking-[0.18em] ${WINNER_EYEBROW[winner]}`}
      >
        {WINNER_LABEL[winner]}
      </div>
      <div className="font-body text-sm text-ivory">
        {count.toLocaleString()} win{count === 1 ? '' : 's'}
      </div>
    </div>
  );
}

/** Thin Recharts wrapper for the 3-bar baccarat winner-distribution chart.
 *  Each bar is coloured by its scoreboard-* token so the visual maps to the
 *  bead-plate + big-road on the game side. ADR-0039 — Recharts ships in a
 *  shared admin chunk. */
export default function BaccaratWinnerBar({ data, height = 220 }: Props): JSX.Element {
  // Capitalised display labels keep the X-axis legible without an extra
  // legend. Underlying `winner` key drives the Cell colour lookup.
  const display = data.map((d) => ({ ...d, label: WINNER_LABEL[d.winner] }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={display} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
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
        <Bar dataKey="count" isAnimationActive={false}>
          {display.map((d) => (
            <Cell key={d.winner} fill={WINNER_FILL[d.winner]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
