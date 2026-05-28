import type { JSX } from 'react';
import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { getTopPlayersForGame, type TopPlayerRow } from '@/systems/stats';
import type { Round } from '@/db';

/**
 * Phase 15 #14.5 PR B — shared per-game top-players drill-down. Rendered on
 * every game admin page (the existing 9 + the 2 new) as a NEW vertical
 * section (additive — never overwrites any existing chart / table).
 *
 * Per-row click navigates to `/admin/users/:userId` so the operator can
 * pivot from "who's the biggest baccarat winner?" straight into that user's
 * full per-user dashboard.
 *
 * Empty state renders a quiet "No players yet." instead of a blank table so
 * a fresh install / fresh range filter degrades gracefully.
 */

interface Props {
  game: Round['game'];
  limit?: number;
  sinceMs?: number;
}

const EMPTY: TopPlayerRow[] = [];

export default function TopPlayersPanel({ game, limit = 10, sinceMs }: Props): JSX.Element {
  // Phase 9 lesson — let useLiveQuery infer T from the querier's Promise<T>
  // return; do NOT pass an explicit generic.
  const rows = useLiveQuery(
    () => getTopPlayersForGame(game, limit, sinceMs),
    [game, limit, sinceMs],
    EMPTY,
  );

  return (
    <section aria-label="Top players" data-top-players-panel={game}>
      <h2 className="mb-2 font-display text-xs tracking-wider text-ivory/60">TOP PLAYERS</h2>
      <div className="rounded-md border border-brass/60 bg-velvet-deep p-4">
        {rows.length === 0 ? (
          <p className="py-4 text-center text-xs text-ivory/40">No players yet.</p>
        ) : (
          <table className="w-full text-left text-xs" data-top-players-table>
            <thead>
              <tr className="border-b border-brass/30 uppercase tracking-wider text-ivory/40">
                <th className="py-2 pr-3 text-right">#</th>
                <th className="py-2 pr-3">Player</th>
                <th className="py-2 pr-3 text-right">Rounds</th>
                <th className="py-2 pr-3 text-right">Net chips</th>
                <th className="py-2 pr-3 text-right">Biggest win</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.userId} className="border-b border-brass/10" data-top-players-row>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums text-ivory/55">
                    {i + 1}
                  </td>
                  <td className="py-2 pr-3 text-ivory">
                    <Link
                      to={`/admin/users/${r.userId}`}
                      className="hover:text-gold-bright"
                      data-top-players-link={r.userId}
                    >
                      {r.username}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums text-ivory/55">
                    {r.rounds.toLocaleString()}
                  </td>
                  <td
                    className={[
                      'py-2 pr-3 text-right font-mono tabular-nums',
                      r.netChips > 0
                        ? 'text-chip-win'
                        : r.netChips < 0
                          ? 'text-casino-red'
                          : 'text-ivory/60',
                    ].join(' ')}
                  >
                    {r.netChips > 0 ? '+' : ''}
                    {r.netChips.toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums text-gold-bright">
                    {r.biggestWin > 0 ? `+${r.biggestWin.toLocaleString()}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
