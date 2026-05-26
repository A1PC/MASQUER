import type { JSX, ReactNode } from 'react';
import type { TooltipProps } from 'recharts';
import { cn } from '@/components/ui';

interface ChartTooltipShellProps {
  /** Optional kebab-cased identifier set as `data-chart-tooltip` for testing. */
  variant?: string;
  /** Optional extra Tailwind utility classes appended to the shell. */
  className?: string;
  children: ReactNode;
}

/**
 * Brand-consistent visual shell for Recharts custom tooltips: ivory text on
 * velvet-deep with brass border and a soft shadow. Use this as the outer
 * wrapper for any custom `<Tooltip content={...}>` so every chart's hover
 * box reads the same across the admin pages.
 */
export function ChartTooltipShell({
  variant,
  className,
  children,
}: ChartTooltipShellProps): JSX.Element {
  return (
    <div
      data-chart-tooltip={variant ?? 'default'}
      className={cn(
        'rounded-md border border-brass/60 bg-velvet-deep px-3 py-2 text-ivory shadow-lg',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Generic default tooltip for charts that don't need a custom layout — just
 * a label row + one or more `{ name: value }` rows. Drop into any Recharts
 * chart as `<Tooltip content={<DefaultChartTooltip />} />`.
 *
 * Handles the common cases used across the admin pages:
 *  - `label`: x-axis tick (or category) rendered as a gold eyebrow.
 *  - Each `payload` entry: dataKey/name in muted ivory, value in mono ivory.
 *  - Numeric values get `toLocaleString()` for thousands separators.
 *
 * Charts that need a richer body (e.g. tier eyebrow, multi-row totals) can
 * compose their own content + use `ChartTooltipShell` for visual parity.
 */
export function DefaultChartTooltip<TValue extends number | string, TName extends string | number>({
  active,
  payload,
  label,
}: TooltipProps<TValue, TName>): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <ChartTooltipShell variant="default">
      {label !== undefined && label !== '' && (
        <div className="mb-1 font-display text-[10px] uppercase tracking-[0.18em] text-gold">
          {String(label)}
        </div>
      )}
      <div className="space-y-0.5 text-xs">
        {payload.map((p, i) => {
          const seriesName = String(p.name ?? p.dataKey ?? '—');
          const raw = p.value;
          const formatted =
            typeof raw === 'number' ? raw.toLocaleString() : raw !== undefined ? String(raw) : '—';
          // Optional series colour swatch — only render when Recharts gave us
          // a colour (line/bar/area do; some chart types don't).
          const swatch = typeof p.color === 'string' ? p.color : null;
          return (
            <div key={i} className="flex items-center justify-between gap-3 tabular-nums">
              <span className="flex items-center gap-1.5 text-ivory/70">
                {swatch !== null && (
                  <span
                    aria-hidden="true"
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: swatch }}
                  />
                )}
                {seriesName}
              </span>
              <span className="font-mono text-ivory">{formatted}</span>
            </div>
          );
        })}
      </div>
    </ChartTooltipShell>
  );
}
