import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import DateRangeFilter, {
  rangeToSinceMs,
  type RangePreset,
} from '@/components/admin/DateRangeFilter';
import {
  getLeaderboardBiggestSingleWins,
  getLeaderboardLongestStreaks,
  getLeaderboardTopVolume,
  getLeaderboardTopWinners,
  type LeaderboardSingleWinRow,
  type LeaderboardStreakRow,
  type LeaderboardVolumeRow,
  type LeaderboardWinnerRow,
} from '@/systems/stats';

/**
 * Cross-game admin leaderboard (Phase 15 #14 PR C + PR D wire-up).
 *
 * Four tabbed boards backed by per-tab `useLiveQuery` aggregations against
 * the shared `db.rounds` table. Each board shows 25 rows. The PR D follow-up
 * threads the shared `<DateRangeFilter>` from PR B into the `sinceMs` arg of
 * every aggregator, with a per-tab `localStorage` key so admins keep their
 * preferred range per board.
 *
 * The tab bar mirrors the AdminPokerPage variant-tabs pattern; the body is a
 * single rounded card hosting whichever table matches the active tab.
 */

type TabKey = 'winners' | 'volume' | 'single-win' | 'streak';

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: 'winners', label: 'Top winners' },
  { key: 'volume', label: 'Top by volume' },
  { key: 'single-win', label: 'Biggest single win' },
  { key: 'streak', label: 'Longest win streak' },
];

/** Stable empty-array fallbacks so `useLiveQuery`'s initial render doesn't
 *  thrash referential identity (would re-render tab tables every paint). */
const EMPTY_WINNERS: LeaderboardWinnerRow[] = [];
const EMPTY_VOLUME: LeaderboardVolumeRow[] = [];
const EMPTY_SINGLE: LeaderboardSingleWinRow[] = [];
const EMPTY_STREAK: LeaderboardStreakRow[] = [];

const ROW_LIMIT = 25;

function formatTimestamp(ms: number): string {
  return new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
}

export default function AdminLeaderboardPage(): JSX.Element {
  const [tab, setTab] = useState<TabKey>('winners');
  // PR D follow-up — date-range filter threaded into every aggregator. Per-
  // tab storage key so each board remembers its own preferred range across
  // mounts (spec §4.4 caveat closed here once PR B's DateRangeFilter landed).
  const [range, setRange] = useState<RangePreset>('all');
  const sinceMs = useMemo(() => rangeToSinceMs(range), [range]);

  // Phase 9 lesson — let useLiveQuery infer T from the querier's Promise<T>
  // return; do NOT pass an explicit generic. All four boards load eagerly so
  // tab-switching is instant — the data is tiny (25 rows × 4 tables = 100
  // rows max) and we want zero flash-of-empty on tab change. `sinceMs` is in
  // the dep array so a range change re-runs every aggregator.
  const winners = useLiveQuery(
    () => getLeaderboardTopWinners(ROW_LIMIT, sinceMs),
    [sinceMs],
    EMPTY_WINNERS,
  );
  const volume = useLiveQuery(
    () => getLeaderboardTopVolume(ROW_LIMIT, sinceMs),
    [sinceMs],
    EMPTY_VOLUME,
  );
  const singleWins = useLiveQuery(
    () => getLeaderboardBiggestSingleWins(ROW_LIMIT, sinceMs),
    [sinceMs],
    EMPTY_SINGLE,
  );
  const streaks = useLiveQuery(
    () => getLeaderboardLongestStreaks(ROW_LIMIT, sinceMs),
    [sinceMs],
    EMPTY_STREAK,
  );

  return (
    <div className="flex flex-col gap-6" data-admin-leaderboard>
      <h1 className="font-display text-base tracking-wider text-gold-bright">LEADERBOARD</h1>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Leaderboard tab"
        className="flex items-center gap-6 border-b border-brass/30"
      >
        {TABS.map((t) => {
          const selected = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={selected}
              data-leaderboard-tab={t.key}
              onClick={() => setTab(t.key)}
              className={[
                'px-1 pb-2 pt-1 text-xs transition',
                selected
                  ? 'border-b-2 border-brass font-display text-gold-bright'
                  : 'text-ivory/55 hover:text-ivory/80',
              ].join(' ')}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Date-range filter — per-tab storage key (PR D follow-up). Re-keying
          on `tab` swap forces the hook to re-hydrate from the per-tab
          localStorage entry rather than carrying the previous tab's range
          across switches. */}
      <DateRangeFilter
        key={tab}
        value={range}
        onChange={setRange}
        storageKey={`admin.leaderboard.${tab}.range`}
      />

      {/* Tab body */}
      <div className="rounded-md border border-brass/60 bg-velvet-deep p-4">
        {tab === 'winners' && <WinnersTable rows={winners} />}
        {tab === 'volume' && <VolumeTable rows={volume} />}
        {tab === 'single-win' && <SingleWinTable rows={singleWins} />}
        {tab === 'streak' && <StreakTable rows={streaks} />}
      </div>
    </div>
  );
}

function WinnersTable({ rows }: { rows: LeaderboardWinnerRow[] }): JSX.Element {
  if (rows.length === 0)
    return (
      <p className="py-4 text-center text-xs text-ivory/40" data-leaderboard-empty>
        No data yet.
      </p>
    );
  return (
    <table className="w-full text-left text-xs" data-leaderboard-winners>
      <thead>
        <tr className="border-b border-brass/30 uppercase tracking-wider text-ivory/40">
          <th className="py-2 pr-3">#</th>
          <th className="py-2 pr-3">Player</th>
          <th className="py-2 pr-3">Net chips</th>
          <th className="py-2 pr-3">Rounds</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          // House net tone: positive netChips for the PLAYER means the HOUSE
          // is behind, so colour the cell red (operator perspective). Player
          // losses (negative netChips) are house wins → green.
          const playerAhead = r.netChips >= 0;
          return (
            <tr key={`${r.username}-${i}`} className="border-b border-brass/10">
              <td className="py-2 pr-3 font-mono tabular-nums text-ivory/55">{i + 1}</td>
              <td className="py-2 pr-3 text-ivory">{r.username}</td>
              <td
                className={[
                  'py-2 pr-3 font-mono tabular-nums',
                  playerAhead ? 'text-casino-red' : 'text-chip-win',
                ].join(' ')}
              >
                {playerAhead ? '+' : ''}
                {r.netChips.toLocaleString()}
              </td>
              <td className="py-2 pr-3 font-mono tabular-nums text-ivory/55">
                {r.rounds.toLocaleString()}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function VolumeTable({ rows }: { rows: LeaderboardVolumeRow[] }): JSX.Element {
  if (rows.length === 0)
    return (
      <p className="py-4 text-center text-xs text-ivory/40" data-leaderboard-empty>
        No data yet.
      </p>
    );
  return (
    <table className="w-full text-left text-xs" data-leaderboard-volume>
      <thead>
        <tr className="border-b border-brass/30 uppercase tracking-wider text-ivory/40">
          <th className="py-2 pr-3">#</th>
          <th className="py-2 pr-3">Player</th>
          <th className="py-2 pr-3">Total wagered</th>
          <th className="py-2 pr-3">Rounds</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.username}-${i}`} className="border-b border-brass/10">
            <td className="py-2 pr-3 font-mono tabular-nums text-ivory/55">{i + 1}</td>
            <td className="py-2 pr-3 text-ivory">{r.username}</td>
            <td className="py-2 pr-3 font-mono tabular-nums text-gold-bright">
              {r.totalWagered.toLocaleString()}
            </td>
            <td className="py-2 pr-3 font-mono tabular-nums text-ivory/55">
              {r.rounds.toLocaleString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SingleWinTable({ rows }: { rows: LeaderboardSingleWinRow[] }): JSX.Element {
  if (rows.length === 0)
    return (
      <p className="py-4 text-center text-xs text-ivory/40" data-leaderboard-empty>
        No data yet.
      </p>
    );
  return (
    <table className="w-full text-left text-xs" data-leaderboard-single-win>
      <thead>
        <tr className="border-b border-brass/30 uppercase tracking-wider text-ivory/40">
          <th className="py-2 pr-3">#</th>
          <th className="py-2 pr-3">Player</th>
          <th className="py-2 pr-3">Game</th>
          <th className="py-2 pr-3">Payout</th>
          <th className="py-2 pr-3">Net</th>
          <th className="py-2 pr-3">When</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.username}-${r.playedAt}-${i}`} className="border-b border-brass/10">
            <td className="py-2 pr-3 font-mono tabular-nums text-ivory/55">{i + 1}</td>
            <td className="py-2 pr-3 text-ivory">{r.username}</td>
            <td className="py-2 pr-3 text-ivory/85">{r.game}</td>
            <td className="py-2 pr-3 font-mono tabular-nums text-gold-bright">
              {r.payout.toLocaleString()}
            </td>
            {/* Single-win board only contains wins (netChange > 0) so house
                is always behind by netChange → render red. */}
            <td className="py-2 pr-3 font-mono tabular-nums text-casino-red">
              +{r.netChange.toLocaleString()}
            </td>
            <td className="py-2 pr-3 font-mono tabular-nums text-ivory/55">
              {formatTimestamp(r.playedAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StreakTable({ rows }: { rows: LeaderboardStreakRow[] }): JSX.Element {
  if (rows.length === 0)
    return (
      <p className="py-4 text-center text-xs text-ivory/40" data-leaderboard-empty>
        No data yet.
      </p>
    );
  return (
    <table className="w-full text-left text-xs" data-leaderboard-streak>
      <thead>
        <tr className="border-b border-brass/30 uppercase tracking-wider text-ivory/40">
          <th className="py-2 pr-3">#</th>
          <th className="py-2 pr-3">Player</th>
          <th className="py-2 pr-3">Streak</th>
          <th className="py-2 pr-3">Game</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.username}-${i}`} className="border-b border-brass/10">
            <td className="py-2 pr-3 font-mono tabular-nums text-ivory/55">{i + 1}</td>
            <td className="py-2 pr-3 text-ivory">{r.username}</td>
            <td className="py-2 pr-3 font-mono tabular-nums text-gold-bright">{r.streakLength}</td>
            <td className="py-2 pr-3 text-ivory/85">{r.game}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
