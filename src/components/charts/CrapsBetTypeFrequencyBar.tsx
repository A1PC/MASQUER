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
import type { CrapsBetTypeWagered } from '@/systems/stats';
import { ChartTooltipShell } from './ChartTooltip';

interface Props {
  /** Bet-type buckets sorted desc by `totalWagered` (per `getCrapsBetTypeFrequency`).
   *  Empty when no session has persisted the additive `betTypeWagered`
   *  field — the wrapper renders a friendly placeholder in that case. */
  data: readonly CrapsBetTypeWagered[];
  height?: number;
}

/** Human-readable label for each canonical bet id from `src/games/craps/bets.ts`.
 *  Falls back to the raw id when an unknown bet type appears (forward-compat). */
const BET_TYPE_LABEL: Record<string, string> = {
  pass: 'Pass Line',
  'dont-pass': "Don't Pass",
  come: 'Come',
  'dont-come': "Don't Come",
  'odds-pass': 'Pass Odds',
  'odds-dont': "Don't Odds",
  'place-4': 'Place 4',
  'place-5': 'Place 5',
  'place-6': 'Place 6',
  'place-8': 'Place 8',
  'place-9': 'Place 9',
  'place-10': 'Place 10',
  field: 'Field',
  'hard-4': 'Hard 4',
  'hard-6': 'Hard 6',
  'hard-8': 'Hard 8',
  'hard-10': 'Hard 10',
  'any-7': 'Any 7',
  'any-craps': 'Any Craps',
  'prop-2': '2 (Aces)',
  'prop-3': '3',
  'prop-11': '11 (Yo)',
  'prop-12': '12 (Boxcars)',
  horn: 'Horn',
  'c-and-e': 'C & E',
};

/** Bet-category fill palette — line bets gold-bright (the canonical
 *  Pass/Don't axis), place bets brass, field velvet, hardways jewel-magenta,
 *  propositions deep velvet. Mirrors the poker per-variant palette to keep
 *  the admin chart visuals consistent. */
const LINE_FILL = '#e9c449'; // gold-bright
const PLACE_FILL = '#c7994b'; // brass
const FIELD_FILL = '#9c5b6b'; // velvet
const HARD_FILL = '#e84a8c'; // jewel-magenta
const PROP_FILL = '#7a1f2b'; // velvet-deep

/** Map a canonical bet id to a category fill. Unknown ids fall back to the
 *  brass place tone so a stray bet type never renders invisibly. */
function fillFor(betType: string): string {
  if (
    betType === 'pass' ||
    betType === 'dont-pass' ||
    betType === 'come' ||
    betType === 'dont-come' ||
    betType === 'odds-pass' ||
    betType === 'odds-dont'
  ) {
    return LINE_FILL;
  }
  if (betType.startsWith('place-')) return PLACE_FILL;
  if (betType === 'field') return FIELD_FILL;
  if (betType.startsWith('hard-')) return HARD_FILL;
  if (
    betType === 'any-7' ||
    betType === 'any-craps' ||
    betType === 'horn' ||
    betType === 'c-and-e' ||
    betType.startsWith('prop-')
  ) {
    return PROP_FILL;
  }
  return PLACE_FILL;
}

/** Human-readable label for the tooltip + x-axis tick. */
function labelOf(betType: string): string {
  return BET_TYPE_LABEL[betType] ?? betType;
}

/** Custom Recharts tooltip — ivory body on velvet-deep with brass hairline.
 *  Echoes the existing chart tooltips so hover treatment stays consistent
 *  across the admin shell (#251). Exported for unit-testing — Recharts only
 *  mounts tooltip content on hover, which jsdom can't simulate. */
export function ChartTooltip({
  active,
  payload,
}: TooltipProps<number, string>): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  if (!item) return null;
  const point = item.payload as CrapsBetTypeWagered;
  return (
    <ChartTooltipShell variant="craps-bet-type-frequency">
      <div className="font-display text-[10px] uppercase tracking-[0.18em] text-gold">
        {labelOf(point.betType)}
      </div>
      <div className="font-body text-sm tabular-nums text-ivory">
        {point.totalWagered.toLocaleString()} chip{point.totalWagered === 1 ? '' : 's'}
      </div>
    </ChartTooltipShell>
  );
}

/** Thin Recharts wrapper for the craps bet-type frequency chart. Each bar
 *  represents one canonical bet type, coloured by category so the operator
 *  can read line / place / field / hardway / prop mix at a glance.
 *
 *  Renders a friendly placeholder when `data.length === 0` — pre-Phase 15
 *  #13 sessions don't carry the additive `details.betTypeWagered` field,
 *  so the chart needs a graceful empty state for fresh installs / legacy
 *  data. (Spec §5.3.)
 *
 *  ADR-0039 — Recharts ships in the admin chunk only. */
export default function CrapsBetTypeFrequencyBar({ data, height = 240 }: Props): JSX.Element {
  if (data.length === 0) {
    return (
      <div
        data-craps-bet-type-empty
        className="rounded-md border border-brass/30 bg-felt-deep p-6 text-center text-xs text-ivory/55"
      >
        Bet-type tracking starts with sessions played after Phase 15 #13.
      </div>
    );
  }
  // Recharts wants a plain mutable array. Map adds the human-readable label
  // for the x-axis tick + tooltip eyebrow.
  const shaped = data.map((d) => ({ ...d, label: labelOf(d.betType) }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={shaped} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid stroke="rgba(212,175,55,0.12)" />
        <XAxis
          dataKey="label"
          stroke="rgba(255,255,255,0.5)"
          fontSize={9}
          interval={0}
          tickLine={false}
          angle={-30}
          textAnchor="end"
          height={56}
        />
        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} allowDecimals={false} width={48} />
        <Tooltip cursor={{ fill: 'rgba(199,154,75,0.12)' }} content={<ChartTooltip />} />
        <Bar dataKey="totalWagered" isAnimationActive={false}>
          {shaped.map((d) => (
            <Cell key={d.betType} fill={fillFor(d.betType)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
