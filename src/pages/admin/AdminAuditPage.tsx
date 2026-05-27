import type { JSX } from 'react';
import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { db } from '@/db';
import type { Adjustment } from '@/db';
import AdminTableFilters from '@/components/admin/AdminTableFilters';
import AdminPagination from '@/components/admin/AdminPagination';
import { useAdminTableState } from '@/components/admin/useAdminTableState';
import { rangeToSinceMs } from '@/components/admin/DateRangeFilter';

type AuditRow = Adjustment & { username: string };

const PAGE_SIZE = 25;
const EMPTY_ROWS: AuditRow[] = [];

/**
 * Action-type filter options. The `Adjustment` row schema doesn't carry an
 * explicit type column today (ADR-0035 keeps the row a thin signed-amount
 * record) — we infer the bucket from the `reason` string via `inferType`
 * below. Adding a real `type` field would be a future schema bump; this
 * scheme is back-compat for every existing row.
 */
const TYPE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'credit-adjust', label: 'Credit adjust' },
  { value: 'ban', label: 'Ban' },
  { value: 'unban', label: 'Unban' },
];

/**
 * Infer the action bucket from the adjustment reason. Convention here is:
 * - "unban" → unban (checked first so we don't false-positive into "ban")
 * - any reason containing "ban" → ban
 * - everything else → credit-adjust (the default)
 */
function inferType(reason: string): string {
  const lower = reason.toLowerCase();
  if (lower.includes('unban')) return 'unban';
  if (lower.includes('ban')) return 'ban';
  return 'credit-adjust';
}

/** ISO-ish timestamp `YYYY-MM-DD HH:MM:SS` — keeps columns predictable. */
function formatTimestamp(ms: number): string {
  return new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Phase 15 #14 PR D — admin audit log with filter/search/paginate via the
 * shared `AdminTableFilters` + `AdminPagination` primitives. Filter state
 * lives in the URL query string via `useAdminTableState` so admins can
 * link-share a filtered view.
 *
 * Filters: user (substring match on username), action type (inferred from
 * reason), date range (preset tabs), and a free-text search across reason +
 * username. Pagination is 25/page client-side over the filtered set.
 */
export default function AdminAuditPage(): JSX.Element {
  const { state, setState } = useAdminTableState({ page: 1, range: 'all' });
  const sinceMs = useMemo(() => rangeToSinceMs(state.range), [state.range]);

  // Load every adjustment + resolve usernames once. The admin scale is
  // small (~hundreds) so a full scan is fine; filtering happens in-memory
  // below. Phase 9 lesson — let useLiveQuery infer T from the querier's
  // Promise<T> return; do NOT pass an explicit generic.
  const allRows: AuditRow[] = useLiveQuery(
    async (): Promise<AuditRow[]> => {
      const adjustments = await db.adjustments.toArray();
      adjustments.sort((a, b) => b.adjustedAt - a.adjustedAt);
      const userIds = [...new Set(adjustments.map((a) => a.userId))];
      const users = await db.users.bulkGet(userIds);
      const usernameById = new Map<string, string>();
      users.forEach((u, i) => {
        if (u) usernameById.set(userIds[i]!, u.username);
      });
      return adjustments.map((a) => ({
        ...a,
        username: usernameById.get(a.userId) ?? '<deleted>',
      }));
    },
    [],
    EMPTY_ROWS,
  );

  // Apply filters in-memory. Each filter is layered so we short-circuit
  // quickly when filters narrow the set.
  const filtered = useMemo(() => {
    let rows = allRows;
    if (sinceMs !== undefined) rows = rows.filter((r) => r.adjustedAt > sinceMs);
    if (state.user) {
      const needle = state.user.toLowerCase();
      rows = rows.filter((r) => r.username.toLowerCase().includes(needle));
    }
    if (state.type) {
      rows = rows.filter((r) => inferType(r.reason) === state.type);
    }
    if (state.search) {
      const needle = state.search.toLowerCase();
      rows = rows.filter(
        (r) => r.reason.toLowerCase().includes(needle) || r.username.toLowerCase().includes(needle),
      );
    }
    return rows;
  }, [allRows, sinceMs, state.user, state.type, state.search]);

  // Clamp the page to the available range so a filter narrowing the set
  // doesn't leave the user staring at an empty page-N view.
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(state.page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  function handleReset(): void {
    setState({ page: 1, user: '', type: '', range: 'all', search: '' });
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-base tracking-wider text-gold-bright">
        ADJUSTMENTS · {filtered.length.toLocaleString()}
      </h1>

      <AdminTableFilters
        user={{
          value: state.user,
          onChange: (v) => setState({ user: v, page: 1 }),
          placeholder: 'Username',
        }}
        type={{
          value: state.type,
          options: TYPE_OPTIONS,
          onChange: (v) => setState({ type: v, page: 1 }),
        }}
        range={{ value: state.range, onChange: (r) => setState({ range: r, page: 1 }) }}
        search={{
          value: state.search,
          onChange: (v) => setState({ search: v, page: 1 }),
          placeholder: 'Reason or username',
        }}
        onReset={handleReset}
      />

      {pageRows.length === 0 ? (
        <p className="py-4 text-center text-xs text-ivory/40" data-admin-audit-empty>
          {allRows.length === 0
            ? 'No adjustments recorded.'
            : 'No adjustments match the current filters.'}
        </p>
      ) : (
        <table className="w-full text-left text-sm" data-admin-audit-table>
          <thead>
            <tr className="border-b border-brass/30 text-xs uppercase tracking-wider text-ivory/40">
              <th className="py-2 pr-3">When</th>
              <th className="py-2 pr-3">User</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Amount</th>
              <th className="py-2 pr-3">Reason</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => {
              const positive = r.amount >= 0;
              return (
                <tr key={r.id} className="border-b border-brass/10">
                  <td className="py-2 pr-3 font-mono tabular-nums text-ivory/55">
                    {formatTimestamp(r.adjustedAt)}
                  </td>
                  <td className="py-2 pr-3 text-ivory">
                    <Link
                      to={`/admin/users/${r.userId}`}
                      className="transition hover:text-gold-bright"
                    >
                      {r.username}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 text-xs uppercase tracking-wider text-ivory/55">
                    {inferType(r.reason)}
                  </td>
                  <td
                    className={[
                      'py-2 pr-3 font-mono tabular-nums',
                      positive ? 'text-chip-win' : 'text-casino-red',
                    ].join(' ')}
                  >
                    {positive ? '+' : ''}
                    {r.amount.toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 text-ivory/85">{r.reason}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <AdminPagination
        page={safePage}
        pageSize={PAGE_SIZE}
        totalRows={filtered.length}
        onChange={(p) => setState({ page: p })}
      />
    </div>
  );
}
