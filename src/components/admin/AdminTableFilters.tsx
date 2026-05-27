import type { JSX, ReactNode } from 'react';
import DateRangeFilter, { type RangePreset } from './DateRangeFilter';

/**
 * Free-text input slot — used for the user filter and the catch-all search.
 * Caller owns the controlled value + placeholder copy so this stays a dumb
 * primitive.
 */
export interface AdminTableFiltersSearchSlot {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}

/**
 * Date-range slot — wraps `DateRangeFilter`. We don't expose `storageKey` from
 * here because admin pages backed by `useAdminTableState` already persist via
 * the URL query string; a localStorage echo would conflict with the URL on
 * first paint.
 */
export interface AdminTableFiltersRangeSlot {
  value: RangePreset;
  onChange: (next: RangePreset) => void;
}

/**
 * Dropdown slot for enum-like filters (e.g. action type on AdminAuditPage).
 * `value === ''` means "all" — caller controls the option list.
 */
export interface AdminTableFiltersSelectSlot {
  value: string;
  onChange: (next: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}

export interface AdminTableFiltersProps {
  /** User filter (plain text; future iteration may upgrade to typeahead). */
  user?: AdminTableFiltersSearchSlot;
  /** Action-type dropdown (e.g. `credit-adjust` / `ban` / `unban`). */
  type?: AdminTableFiltersSelectSlot;
  /** Date-range tab strip. */
  range?: AdminTableFiltersRangeSlot;
  /** Free-text catch-all search input. */
  search?: AdminTableFiltersSearchSlot;
  /** Optional reset button — only renders when supplied. */
  onReset?: () => void;
  /** Optional trailing slot for callers that need a custom control (sort,
   *  export, etc.) without expanding the primitive's surface. */
  trailing?: ReactNode;
}

const INPUT_CLASS =
  'rounded-md border border-brass/60 bg-velvet-deep px-2 py-1 text-xs text-ivory placeholder-ivory/35 focus:border-gold-bright focus:outline-none';

/**
 * Composable filter row for admin tables (Phase 15 #14 PR D). Renders only
 * the slots the caller provides — pages can opt in to any subset of
 * {user, type, range, search} + an optional reset button.
 *
 * Tokens-only Tailwind throughout; the container exposes
 * `data-admin-table-filters` for test scoping.
 */
export default function AdminTableFilters({
  user,
  type,
  range,
  search,
  onReset,
  trailing,
}: AdminTableFiltersProps): JSX.Element {
  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-md border border-brass/30 bg-velvet-deep/40 px-3 py-2"
      data-admin-table-filters
    >
      {user && (
        <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-ivory/55">
          <span>User</span>
          <input
            type="text"
            value={user.value}
            onChange={(e) => user.onChange(e.target.value)}
            placeholder={user.placeholder}
            className={`${INPUT_CLASS} w-36`}
            data-admin-filter-user
          />
        </label>
      )}
      {type && (
        <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-ivory/55">
          <span>Type</span>
          <select
            value={type.value}
            onChange={(e) => type.onChange(e.target.value)}
            className={INPUT_CLASS}
            data-admin-filter-type
          >
            <option value="">All</option>
            {type.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {range && (
        <div className="flex items-center gap-2" data-admin-filter-range>
          <DateRangeFilter value={range.value} onChange={range.onChange} />
        </div>
      )}
      {search && (
        <label className="flex flex-1 items-center gap-2 text-xs uppercase tracking-wider text-ivory/55">
          <span>Search</span>
          <input
            type="text"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder}
            className={`${INPUT_CLASS} flex-1 normal-case tracking-normal`}
            data-admin-filter-search
          />
        </label>
      )}
      {trailing}
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-brass/60 px-3 py-1 text-xs uppercase tracking-wider text-ivory/80 transition hover:bg-velvet hover:text-gold-bright"
          data-admin-filter-reset
        >
          Reset
        </button>
      )}
    </div>
  );
}
