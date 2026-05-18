import type { JSX } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { db } from '@/db';
import type { Adjustment } from '@/db';

type AuditRow = Adjustment & { username: string };

const EMPTY_ROWS: AuditRow[] = [];

export default function AdminAuditPage(): JSX.Element {
  const rows: AuditRow[] = useLiveQuery(
    async (): Promise<AuditRow[]> => {
      const adjustments = await db.adjustments.orderBy('adjustedAt').reverse().toArray();
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

  return (
    <div>
      <h1 className="mb-4 font-display text-base tracking-wider text-gold">
        ADJUSTMENTS · {rows.length}
      </h1>
      {rows.length === 0 ? (
        <p className="text-xs text-white/40">No adjustments recorded.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gold/30 text-xs uppercase tracking-wider text-white/50">
              <th className="py-2 pr-3">When</th>
              <th className="py-2 pr-3">User</th>
              <th className="py-2 pr-3">Amount</th>
              <th className="py-2 pr-3">Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-white/5">
                <td className="py-2 pr-3 text-white/60">
                  {new Date(r.adjustedAt).toISOString().slice(0, 19).replace('T', ' ')}
                </td>
                <td className="py-2 pr-3">
                  <Link
                    to={`/admin/users/${r.userId}`}
                    className="text-gold-bright hover:underline"
                  >
                    {r.username}
                  </Link>
                </td>
                <td className={`py-2 pr-3 ${r.amount > 0 ? 'text-chip-win' : 'text-casino-red'}`}>
                  {r.amount > 0 ? '+' : ''}
                  {r.amount}
                </td>
                <td className="py-2 pr-3">{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
