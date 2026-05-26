import type { JSX } from 'react';
import type { SlotsSymbolDistribution } from '@/systems/stats';

interface Props {
  /** 5 entries (one per symbol). Counts per reel — see `getSlotsSymbolDistribution`. */
  data: readonly SlotsSymbolDistribution[];
}

const SYMBOL_LABELS: Record<SlotsSymbolDistribution['symbol'], string> = {
  cherry: 'Cherry',
  lemon: 'Lemon',
  bell: 'Bell',
  bar: 'BAR',
  seven: '7',
};

/** Tailwind background-class for a cell, ramped from velvet-deep (cold)
 *  to gold-bright (hot). Five steps. */
function fillForRatio(ratio: number): string {
  if (ratio <= 0) return 'bg-velvet-deep/70';
  if (ratio < 0.2) return 'bg-gold/20';
  if (ratio < 0.4) return 'bg-gold/35';
  if (ratio < 0.6) return 'bg-gold/55';
  if (ratio < 0.8) return 'bg-gold/75';
  return 'bg-gold-bright/90';
}

/** Heatmap of (symbol × reel) landing counts. 5 rows × 3 cols.
 *  Each cell shows the raw count, shaded relative to the global max
 *  so the busiest cells read at a glance.
 *
 *  Used to verify the per-reel symbol weights from ADR-0032 are
 *  behaving — if a symbol's frequency drifts on one reel, it'll show
 *  here long before it'd surface in RTP. */
export default function SlotsSymbolReelHeatmap({ data }: Props): JSX.Element {
  // Use the global max across all cells so the colour ramp is comparable
  // both within a reel and across reels. Guard against 0 to avoid NaN.
  let max = 0;
  for (const row of data) {
    if (row.reel0 > max) max = row.reel0;
    if (row.reel1 > max) max = row.reel1;
    if (row.reel2 > max) max = row.reel2;
  }
  const totalSpins = data.reduce((s, d) => s + d.total, 0) / 3;
  return (
    <div data-chart="slots-symbol-reel-heatmap" className="overflow-x-auto">
      <table
        className="w-full min-w-[260px] border-separate border-spacing-1 text-xs"
        aria-label="Symbol × reel landing counts"
      >
        <thead>
          <tr className="font-display text-[10px] uppercase tracking-[0.18em] text-white/40">
            <th scope="col" className="px-2 py-1 text-left">
              Symbol
            </th>
            <th scope="col" className="px-2 py-1 text-center">
              Reel 1
            </th>
            <th scope="col" className="px-2 py-1 text-center">
              Reel 2
            </th>
            <th scope="col" className="px-2 py-1 text-center">
              Reel 3
            </th>
            <th scope="col" className="px-2 py-1 text-right">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const cells: ReadonlyArray<{ key: 'reel0' | 'reel1' | 'reel2'; reel: number }> = [
              { key: 'reel0', reel: row.reel0 },
              { key: 'reel1', reel: row.reel1 },
              { key: 'reel2', reel: row.reel2 },
            ];
            return (
              <tr key={row.symbol} data-row={row.symbol}>
                <th
                  scope="row"
                  className="px-2 py-1 text-left font-display text-ivory tracking-wider"
                >
                  {SYMBOL_LABELS[row.symbol]}
                </th>
                {cells.map((c, i) => {
                  const ratio = max === 0 ? 0 : c.reel / max;
                  const pct = totalSpins === 0 ? 0 : (c.reel / totalSpins) * 100;
                  return (
                    <td
                      key={c.key}
                      data-cell={`${row.symbol}-${i}`}
                      className={`px-2 py-2 text-center tabular-nums text-ivory ${fillForRatio(ratio)}`}
                      title={`${SYMBOL_LABELS[row.symbol]} · Reel ${i + 1}: ${c.reel} (${pct.toFixed(1)}%)`}
                    >
                      <div>{c.reel.toLocaleString()}</div>
                      <div className="text-[10px] text-ivory/60">{pct.toFixed(1)}%</div>
                    </td>
                  );
                })}
                <td className="px-2 py-1 text-right tabular-nums text-white/70">
                  {row.total.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
