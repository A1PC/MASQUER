import type { JSX } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { getAllUserStats, type UserStatsRow } from '@/systems/stats';
import AdminDangerZone from '@/components/admin/AdminDangerZone';

const EMPTY_ROWS: UserStatsRow[] = [];

export default function AdminUsersListPage(): JSX.Element {
  const rows: UserStatsRow[] = useLiveQuery(getAllUserStats, [], EMPTY_ROWS);

  return (
    <div>
      <h1 className="mb-4 font-display text-base tracking-wider text-gold">
        USERS · {rows.length}
      </h1>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gold/30 text-xs uppercase tracking-wider text-white/50">
            <th className="py-2 pr-3">Username</th>
            <th className="py-2 pr-3">Balance</th>
            <th className="py-2 pr-3">Net change</th>
            <th className="py-2 pr-3">Rounds</th>
            <th className="py-2 pr-3">Logins</th>
            <th className="py-2 pr-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.userId} className="border-b border-white/5 hover:bg-white/5">
              <td className="py-2 pr-3">
                <Link to={`/admin/users/${r.userId}`} className="text-gold-bright hover:underline">
                  {r.username}
                </Link>
              </td>
              <td className="py-2 pr-3">{r.currentBalance.toLocaleString()}</td>
              <td
                className={`py-2 pr-3 ${
                  r.totalNetChange > 0
                    ? 'text-chip-win'
                    : r.totalNetChange < 0
                      ? 'text-casino-red'
                      : 'text-white/70'
                }`}
              >
                {r.totalNetChange > 0 ? '+' : ''}
                {r.totalNetChange.toLocaleString()}
              </td>
              <td className="py-2 pr-3">{r.totalRounds}</td>
              <td className="py-2 pr-3">{r.loginCount}</td>
              <td className="py-2 pr-3">
                {r.isBanned ? (
                  <span className="rounded-sm bg-casino-red/20 px-2 py-0.5 text-xs uppercase tracking-wider text-casino-red">
                    Banned
                  </span>
                ) : (
                  <span className="text-xs text-white/40">active</span>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-xs text-white/40">
                No users registered yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <AdminDangerZone />
    </div>
  );
}
