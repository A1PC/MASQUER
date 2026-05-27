import type { JSX } from 'react';
import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { db } from '@/db';
import type { Session } from '@/db';
import AdminTableFilters from '@/components/admin/AdminTableFilters';
import AdminPagination from '@/components/admin/AdminPagination';
import { useAdminTableState } from '@/components/admin/useAdminTableState';
import { rangeToSinceMs } from '@/components/admin/DateRangeFilter';

type SessionRow = Session & { username: string };

const PAGE_SIZE = 25;
const EMPTY_ROWS: SessionRow[] = [];

/** Human-readable duration. Keeps the column compact for typical sessions. */
function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec % 60}s`;
  return `${sec}s`;
}

/** ISO-ish timestamp `YYYY-MM-DD HH:MM:SS`. */
function formatTimestamp(ms: number): string {
  return new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Phase 15 #14 PR D — admin sessions log with filter/search/paginate. Same
 * primitives as AdminAuditPage but drops the `type` filter (sessions are
 * uniform — there's no action enum to bucket by).
 *
 * Filters: user (substring on username), date range (preset tabs), and a
 * free-text search across username. Pagination is 25/page client-side.
 */
export default function AdminSessionsPage(): JSX.Element {
  const { state, setState } = useAdminTableState({ page: 1, range: 'all' });
  const sinceMs = useMemo(() => rangeToSinceMs(state.range), [state.range]);

  const allRows: SessionRow[] = useLiveQuery(
    async (): Promise<SessionRow[]> => {
      const sessions = await db.sessions.toArray();
      sessions.sort((a, b) => b.loginAt - a.loginAt);
      const userIds = [...new Set(sessions.map((s) => s.userId))];
      const users = await db.users.bulkGet(userIds);
      const usernameById = new Map<string, string>();
      users.forEach((u, i) => {
        if (u) usernameById.set(userIds[i]!, u.username);
      });
      return sessions.map((s) => ({
        ...s,
        username: usernameById.get(s.userId) ?? '<deleted>',
      }));
    },
    [],
    EMPTY_ROWS,
  );

  const filtered = useMemo(() => {
    let rows = allRows;
    if (sinceMs !== undefined) rows = rows.filter((r) => r.loginAt > sinceMs);
    if (state.user) {
      const needle = state.user.toLowerCase();
      rows = rows.filter((r) => r.username.toLowerCase().includes(needle));
    }
    if (state.search) {
      const needle = state.search.toLowerCase();
      rows = rows.filter((r) => r.username.toLowerCase().includes(needle));
    }
    return rows;
  }, [allRows, sinceMs, state.user, state.search]);

  // Clamp page to the available range — same rationale as AdminAuditPage.
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(state.page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  function handleReset(): void {
    setState({ page: 1, user: '', range: 'all', search: '' });
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-base tracking-wider text-gold-bright">
        SESSIONS · {filtered.length.toLocaleString()}
      </h1>

      <AdminTableFilters
        user={{
          value: state.user,
          onChange: (v) => setState({ user: v, page: 1 }),
          placeholder: 'Username',
        }}
        range={{ value: state.range, onChange: (r) => setState({ range: r, page: 1 }) }}
        search={{
          value: state.search,
          onChange: (v) => setState({ search: v, page: 1 }),
          placeholder: 'Username',
        }}
        onReset={handleReset}
      />

      {pageRows.length === 0 ? (
        <p className="py-4 text-center text-xs text-ivory/40" data-admin-sessions-empty>
          {allRows.length === 0
            ? 'No sessions recorded.'
            : 'No sessions match the current filters.'}
        </p>
      ) : (
        <table className="w-full text-left text-sm" data-admin-sessions-table>
          <thead>
            <tr className="border-b border-brass/30 text-xs uppercase tracking-wider text-ivory/40">
              <th className="py-2 pr-3">Login</th>
              <th className="py-2 pr-3">User</th>
              <th className="py-2 pr-3">Duration</th>
              <th className="py-2 pr-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.id} className="border-b border-brass/10">
                <td className="py-2 pr-3 font-mono tabular-nums text-ivory/55">
                  {formatTimestamp(r.loginAt)}
                </td>
                <td className="py-2 pr-3 text-ivory">
                  <Link
                    to={`/admin/users/${r.userId}`}
                    className="transition hover:text-gold-bright"
                  >
                    {r.username}
                  </Link>
                </td>
                <td className="py-2 pr-3 font-mono tabular-nums text-ivory/85">
                  {r.durationMs !== null ? formatDuration(r.durationMs) : '—'}
                </td>
                <td className="py-2 pr-3">
                  {r.logoutAt === null ? (
                    <span className="rounded-sm bg-chip-win/20 px-2 py-0.5 text-xs uppercase tracking-wider text-chip-win">
                      Active
                    </span>
                  ) : (
                    <span className="text-xs uppercase tracking-wider text-ivory/40">closed</span>
                  )}
                </td>
              </tr>
            ))}
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
