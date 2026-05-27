import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { RangePreset } from './DateRangeFilter';

/**
 * Snapshot shape for admin tables backed by URL query params (Phase 15 #14
 * PR D). Every field is always defined — `page` defaults to 1, all string
 * fields default to `''`, and `range` defaults to `'all'`. That keeps the
 * call-site filtering simple (no `?? ''` sprinkles everywhere).
 */
export interface AdminTableState {
  page: number;
  user: string;
  type: string;
  range: RangePreset;
  search: string;
}

/**
 * Per-page defaults — every field optional. Passed once on first mount,
 * applied only if the URL itself has no value for that key.
 */
export interface AdminTableStateDefaults {
  page?: number;
  user?: string;
  type?: string;
  range?: RangePreset;
  search?: string;
}

/** Guard so `setSearchParams` only commits valid presets to the URL. */
function parseRange(v: string | null): RangePreset {
  if (v === '7d' || v === '30d' || v === '90d' || v === 'all') return v;
  return 'all';
}

/**
 * URL-query-param-backed state for admin tables. Returns a normalised
 * snapshot + a setter that merges partial updates into the query string.
 *
 * Empty / `'all'` values are deleted from the URL rather than written as
 * empty params so the URL stays tidy when filters are cleared. State is
 * driven by `useSearchParams` from react-router; we never read
 * `window.location.search` directly so the hook stays compatible with the
 * router's memory mode used by tests.
 */
export function useAdminTableState(defaults: AdminTableStateDefaults = {}): {
  state: AdminTableState;
  setState: (patch: Partial<AdminTableState>) => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();

  // `state` is recomputed on every render where `searchParams` changes —
  // the underlying URLSearchParams instance is stable across no-op renders
  // so the memo cache hits in the common case. We intentionally exclude
  // `defaults` from the dep array because it's expected to be a stable
  // shape baked in by the call-site; re-deriving on every defaults
  // identity change would thrash referential identity for downstream memos.
  const state = useMemo<AdminTableState>(
    () => {
      const rawPage = searchParams.get('page');
      const page = rawPage !== null ? Number(rawPage) : (defaults.page ?? 1);
      return {
        page: Number.isFinite(page) && page >= 1 ? page : 1,
        user: searchParams.get('user') ?? defaults.user ?? '',
        type: searchParams.get('type') ?? defaults.type ?? '',
        range: parseRange(searchParams.get('range') ?? defaults.range ?? 'all'),
        search: searchParams.get('q') ?? defaults.search ?? '',
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams],
  );

  const setState = useCallback(
    (patch: Partial<AdminTableState>): void => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (patch.page !== undefined) {
            if (patch.page > 1) next.set('page', String(patch.page));
            else next.delete('page');
          }
          if (patch.user !== undefined) {
            if (patch.user) next.set('user', patch.user);
            else next.delete('user');
          }
          if (patch.type !== undefined) {
            if (patch.type) next.set('type', patch.type);
            else next.delete('type');
          }
          if (patch.range !== undefined) {
            if (patch.range !== 'all') next.set('range', patch.range);
            else next.delete('range');
          }
          if (patch.search !== undefined) {
            if (patch.search) next.set('q', patch.search);
            else next.delete('q');
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return { state, setState };
}
