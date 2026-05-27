import type { JSX } from 'react';
import { useEffect } from 'react';

/**
 * Shared date-range preset for admin filtering panels (Phase 15 #14 — PR B).
 * Four-tab selector that converts to a `sinceMs` epoch threshold downstream
 * via `rangeToSinceMs(preset)`. `'all'` returns `undefined` so per-game
 * aggregators can skip the post-load filter entirely.
 */
export type RangePreset = '7d' | '30d' | '90d' | 'all';

export interface DateRangeFilterProps {
  value: RangePreset;
  onChange: (next: RangePreset) => void;
  /**
   * Optional localStorage key. If provided, the component hydrates from the
   * key on mount and writes back on change so admins keep their preferred
   * range between visits / route switches.
   */
  storageKey?: string;
}

const PRESETS: ReadonlyArray<{ key: RangePreset; label: string }> = [
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: 'all', label: 'All' },
];

const DAY_MS = 86_400_000;

/**
 * Convert a preset to a milliseconds-since-epoch threshold. `'all'` returns
 * `undefined` so aggregators can skip their post-load filter (cheaper and
 * preserves pre-PR-B behaviour for back-compat).
 */
// eslint-disable-next-line react-refresh/only-export-components -- co-located helper used by every admin page that consumes the filter
export function rangeToSinceMs(preset: RangePreset): number | undefined {
  if (preset === 'all') return undefined;
  if (preset === '7d') return Date.now() - 7 * DAY_MS;
  if (preset === '30d') return Date.now() - 30 * DAY_MS;
  return Date.now() - 90 * DAY_MS;
}

/** Type guard so the hydrate effect only writes back a valid preset. */
function isRangePreset(v: string | null): v is RangePreset {
  return v === '7d' || v === '30d' || v === '90d' || v === 'all';
}

/**
 * Tab-strip date-range filter. Brand tokens only — active tab is gold-bright
 * + brass underline, inactive tabs read at ivory/55 with a hover lift. The
 * container exposes `data-date-range-filter` so admin tests can scope to it
 * without coupling to copy.
 */
export default function DateRangeFilter({
  value,
  onChange,
  storageKey,
}: DateRangeFilterProps): JSX.Element {
  // Hydrate from localStorage on mount when a storageKey was provided. We
  // intentionally run this once via the empty dep-array — re-reading the
  // store on every onChange would clobber the active selection.
  useEffect(() => {
    if (!storageKey) return;
    const stored = localStorage.getItem(storageKey);
    if (isRangePreset(stored) && stored !== value) {
      onChange(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on every change so the next mount can rehydrate.
  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, value);
  }, [storageKey, value]);

  return (
    <div
      role="tablist"
      aria-label="Date range filter"
      className="flex items-center gap-4 border-b border-brass/30"
      data-date-range-filter
    >
      {PRESETS.map((p) => {
        const selected = p.key === value;
        return (
          <button
            key={p.key}
            type="button"
            role="tab"
            aria-selected={selected}
            data-range={p.key}
            onClick={() => onChange(p.key)}
            className={[
              'px-1 pb-2 pt-1 text-xs transition',
              selected
                ? 'font-display text-gold-bright border-b-2 border-brass'
                : 'text-ivory/55 hover:text-ivory/80',
            ].join(' ')}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
