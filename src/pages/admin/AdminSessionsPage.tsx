import type { JSX } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { db } from '@/db';
import type { Session } from '@/db';

type SessionRow = Session & { username: string };

const EMPTY_ROWS: SessionRow[] = [];

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec % 60}s`;
  return `${sec}s`;
}

export default function AdminSessionsPage(): JSX.Element {
  const rows: SessionRow[] = useLiveQuery<SessionRow[]>(
    async () => {
      const sessions = await db.sessions.orderBy('loginAt').reverse().toArray();
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

  return (
    <div>
      <h1 className="mb-4 font-display text-base tracking-wider text-gold">
        SESSIONS · {rows.length}
      </h1>
      {rows.length === 0 ? (
        <p className="text-xs text-white/40">No sessions recorded.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gold/30 text-xs uppercase tracking-wider text-white/50">
              <th className="py-2 pr-3">Login</th>
              <th className="py-2 pr-3">User</th>
              <th className="py-2 pr-3">Duration</th>
              <th className="py-2 pr-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-white/5">
                <td className="py-2 pr-3 text-white/60">
                  {new Date(r.loginAt).toISOString().slice(0, 19).replace('T', ' ')}
                </td>
                <td className="py-2 pr-3">
                  <Link
                    to={`/admin/users/${r.userId}`}
                    className="text-gold-bright hover:underline"
                  >
                    {r.username}
                  </Link>
                </td>
                <td className="py-2 pr-3">
                  {r.durationMs !== null ? formatDuration(r.durationMs) : '—'}
                </td>
                <td className="py-2 pr-3">
                  {r.logoutAt === null ? (
                    <span className="rounded-sm bg-chip-win/20 px-2 py-0.5 text-xs uppercase tracking-wider text-chip-win">
                      Active
                    </span>
                  ) : (
                    <span className="text-xs text-white/40">closed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
