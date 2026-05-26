import type { JSX } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import StatCard from '@/pages/admin/StatCard';
import BaccaratWinnerBar from '@/components/charts/BaccaratWinnerBar';
import {
  getBaccaratAllTimeStats,
  getBaccaratStreakStats,
  getBaccaratWinnerDistribution,
  type BaccaratAllTimeStats,
  type BaccaratStreakStats,
  type BaccaratWinnerCount,
} from '@/systems/stats';
import { db } from '@/db';
import type { Round } from '@/db';
import type { Winner } from '@/games/baccarat/types';

/**
 * Shape of `rounds.details` for a baccarat row — flattened at persist time
 * in BaccaratPage.persistRound (not the nested in-memory `RoundResult`).
 * The admin page only reads the scalar fields it needs.
 */
interface PersistedBaccaratDetails {
  readonly winner: Winner;
  readonly margin: number;
  readonly playerTotal: number;
  readonly bankerTotal: number;
  readonly playerPair: boolean;
  readonly bankerPair: boolean;
  readonly winnerNatural: boolean;
  readonly bothNatural: boolean;
  readonly totalCards: number;
}

const EMPTY_STATS: BaccaratAllTimeStats = {
  roundsPlayed: 0,
  totalWagered: 0,
  totalPaid: 0,
  netHouseChips: 0,
  netPlayerChips: 0,
  actualRtp: null,
  playerWins: 0,
  bankerWins: 0,
  ties: 0,
  naturalWins: 0,
  doubleNaturals: 0,
  playerPairs: 0,
  bankerPairs: 0,
  bigCount: 0,
  smallCount: 0,
  playerDragons: 0,
  bankerDragons: 0,
};
const EMPTY_DIST: readonly BaccaratWinnerCount[] = [];
const EMPTY_STREAKS: BaccaratStreakStats = {
  longestPlayerStreak: 0,
  longestBankerStreak: 0,
  longestTieStreak: 0,
};
const EMPTY_ROUNDS: readonly Round[] = [];

/** Winner → label + Tailwind badge classes. Mirrors the scoreboard palette
 *  used in BaccaratWinnerBar so the recent-rounds table reads consistently
 *  with the chart and the game-side bead-plate / big-road. */
const WINNER_BADGE: Record<Winner, { label: string; cls: string }> = {
  player: {
    label: 'Player',
    cls: 'bg-scoreboard-player/20 text-ivory border-scoreboard-player/60',
  },
  banker: {
    label: 'Banker',
    cls: 'bg-scoreboard-banker/20 text-ivory border-scoreboard-banker/60',
  },
  tie: {
    label: 'Tie',
    cls: 'bg-scoreboard-tie/15 text-scoreboard-tie border-scoreboard-tie/50',
  },
};

interface MiniBarProps {
  label: string;
  count: number;
  total: number;
  /** Tailwind background class for the bar fill. */
  fillClass: string;
}

function MiniBar({ label, count, total, fillClass }: MiniBarProps): JSX.Element {
  const pct = total === 0 ? 0 : (count / total) * 100;
  return (
    <div className="flex flex-col gap-1" data-mini-bar={label}>
      <div className="flex items-baseline justify-between text-[10px] tracking-wider text-white/60">
        <span className="font-display uppercase">{label}</span>
        <span className="tabular-nums text-white/80">
          {count.toLocaleString()} <span className="text-white/40">({pct.toFixed(1)}%)</span>
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-sm bg-black/40"
        role="img"
        aria-label={`${label}: ${count} of ${total} (${pct.toFixed(1)}%)`}
      >
        <div
          className={`h-full ${fillClass}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}

interface StreakCellProps {
  label: string;
  count: number;
  fillClass: string;
}

/** Display a single streak — large numeral + capped horizontal bar (max
 *  visualises ten rounds; beyond that the bar caps at 100% but the numeral
 *  still reads the true length). */
function StreakCell({ label, count, fillClass }: StreakCellProps): JSX.Element {
  const pct = Math.min(100, count * 10);
  return (
    <div className="flex flex-col gap-1.5" data-streak={label}>
      <div className="flex items-baseline justify-between text-[10px] tracking-wider text-white/60">
        <span className="font-display uppercase">{label}</span>
        <span className="font-display text-base tabular-nums text-ivory">
          {count.toLocaleString()}
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-sm bg-black/40"
        role="img"
        aria-label={`${label}: longest run of ${count}`}
      >
        <div className={`h-full ${fillClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AdminBaccaratPage(): JSX.Element {
  // Phase 9 lesson — let useLiveQuery infer T from the querier's Promise<T>
  // return; do NOT pass an explicit generic. (Mirrors AdminRoulettePage /
  // AdminSlotsPage.)
  const stats = useLiveQuery(() => getBaccaratAllTimeStats(), [], EMPTY_STATS);
  const distribution = useLiveQuery(() => getBaccaratWinnerDistribution(), [], EMPTY_DIST);
  const streaks = useLiveQuery(() => getBaccaratStreakStats(), [], EMPTY_STREAKS);
  const recentRounds = useLiveQuery(
    () => db.rounds.where('game').equals('baccarat').reverse().limit(20).toArray(),
    [],
    EMPTY_ROUNDS,
  );

  const roundsPlayed = stats.roundsPlayed;
  const rtpDisplay = stats.actualRtp === null ? '—' : `${(stats.actualRtp * 100).toFixed(1)}%`;
  const naturalsPct =
    roundsPlayed === 0 ? '—' : `${((stats.naturalWins / roundsPlayed) * 100).toFixed(1)}%`;
  const totalPairs = stats.playerPairs + stats.bankerPairs;
  const totalDragons = stats.playerDragons + stats.bankerDragons;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-base tracking-wider text-gold-bright">BACCARAT</h1>

      {/* Top row: 4 StatCards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard label="Rounds played (all-time)" value={roundsPlayed.toLocaleString()} />
        <StatCard
          label="House net chips"
          value={
            stats.netHouseChips >= 0
              ? `+${stats.netHouseChips.toLocaleString()}`
              : stats.netHouseChips.toLocaleString()
          }
          tone={
            stats.netHouseChips > 0 ? 'positive' : stats.netHouseChips < 0 ? 'negative' : 'neutral'
          }
          sub={
            stats.netHouseChips > 0
              ? 'House ahead'
              : stats.netHouseChips < 0
                ? 'House behind'
                : 'Break-even'
          }
        />
        <StatCard label="Actual RTP" value={rtpDisplay} sub="all bets · all zones" />
        <StatCard
          label="Naturals %"
          value={naturalsPct}
          sub={`${stats.naturalWins.toLocaleString()} of ${roundsPlayed.toLocaleString()}`}
        />
      </div>

      {/* Winner-distribution chart — hero */}
      <section aria-label="Baccarat winner distribution">
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
          WINNER DISTRIBUTION
        </h2>
        <div className="rounded-md border border-gold/30 bg-felt-deep p-4">
          {roundsPlayed === 0 ? (
            <p className="py-8 text-center text-xs text-white/40">
              No baccarat rounds recorded yet.
            </p>
          ) : (
            <BaccaratWinnerBar data={distribution} />
          )}
        </div>
      </section>

      {/* Secondary panels: side-bet hit rates + streaks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-label="Baccarat side-bet hit rates">
          <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
            SIDE-BET HIT RATES
          </h2>
          <div className="flex flex-col gap-3 rounded-md border border-gold/30 bg-felt-deep p-4">
            <MiniBar
              label="Pairs (Player + Banker)"
              count={totalPairs}
              total={roundsPlayed}
              fillClass="bg-gold/70"
            />
            <MiniBar
              label="Big (5–6 cards)"
              count={stats.bigCount}
              total={roundsPlayed}
              fillClass="bg-gold/55"
            />
            <MiniBar
              label="Small (4 cards)"
              count={stats.smallCount}
              total={roundsPlayed}
              fillClass="bg-gold/40"
            />
            <MiniBar
              label="Dragons (Player + Banker)"
              count={totalDragons}
              total={roundsPlayed}
              fillClass="bg-jewel-magenta"
            />
            <div className="grid grid-cols-2 gap-2 border-t border-gold/20 pt-3 text-[10px] tracking-wider text-white/50">
              <div className="flex items-baseline justify-between">
                <span className="font-display uppercase">Player pair</span>
                <span className="tabular-nums text-white/80">
                  {stats.playerPairs.toLocaleString()}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-display uppercase">Banker pair</span>
                <span className="tabular-nums text-white/80">
                  {stats.bankerPairs.toLocaleString()}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-display uppercase">Player dragon</span>
                <span className="tabular-nums text-white/80">
                  {stats.playerDragons.toLocaleString()}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-display uppercase">Banker dragon</span>
                <span className="tabular-nums text-white/80">
                  {stats.bankerDragons.toLocaleString()}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-display uppercase">Double naturals</span>
                <span className="tabular-nums text-white/80">
                  {stats.doubleNaturals.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Baccarat longest winner streaks">
          <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
            LONGEST STREAKS
          </h2>
          <div className="flex flex-col gap-4 rounded-md border border-gold/30 bg-felt-deep p-4">
            <StreakCell
              label="Player"
              count={streaks.longestPlayerStreak}
              fillClass="bg-scoreboard-player"
            />
            <StreakCell
              label="Banker"
              count={streaks.longestBankerStreak}
              fillClass="bg-scoreboard-banker"
            />
            <StreakCell
              label="Tie"
              count={streaks.longestTieStreak}
              fillClass="bg-scoreboard-tie"
            />
            <p className="border-t border-gold/20 pt-3 text-[10px] tracking-wider text-white/40">
              Chronological run-length per winner across all recorded rounds.
            </p>
          </div>
        </section>
      </div>

      {/* Recent rounds table */}
      <section aria-label="Recent baccarat rounds">
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
          RECENT ROUNDS (LAST 20)
        </h2>
        {recentRounds.length === 0 ? (
          <p className="text-xs text-white/40">No rounds yet.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gold/30 uppercase tracking-wider text-white/40">
                <th className="py-2 pr-3">Played at</th>
                <th className="py-2 pr-3">Winner</th>
                <th className="py-2 pr-3">Totals</th>
                <th className="py-2 pr-3">Side bets</th>
                <th className="py-2 pr-3 text-right">Bet</th>
                <th className="py-2 pr-3 text-right">Payout</th>
                <th className="py-2 text-right">House P/L</th>
              </tr>
            </thead>
            <tbody>
              {recentRounds.map((r) => {
                const d = r.details as PersistedBaccaratDetails | undefined;
                const winner: Winner = d?.winner ?? 'tie';
                const badge = WINNER_BADGE[winner];
                const playerTotal = d?.playerTotal ?? 0;
                const bankerTotal = d?.bankerTotal ?? 0;
                const totalCards = d?.totalCards ?? 0;
                const margin = d?.margin ?? 0;
                const winnerNatural = d?.winnerNatural ?? false;
                const playerPair = d?.playerPair ?? false;
                const bankerPair = d?.bankerPair ?? false;
                const isBig = totalCards >= 5;
                const isSmall = totalCards === 4;
                const isDragon = winner !== 'tie' && margin >= 4 && !winnerNatural;
                const housePl = r.betAmount - r.payout;
                return (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="py-1.5 pr-3 tabular-nums text-white/70">
                      {new Date(r.playedAt).toISOString().slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className="py-1.5 pr-3">
                      <span
                        data-winner={winner}
                        className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 font-display text-ivory tabular-nums">
                      P {playerTotal} / B {bankerTotal}
                    </td>
                    <td className="py-1.5 pr-3">
                      <div className="flex flex-wrap items-center gap-1">
                        {playerPair && (
                          <span
                            data-side-bet="player-pair"
                            className="inline-flex items-center rounded-sm border border-gold/40 bg-gold/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-gold-bright"
                          >
                            P-Pair
                          </span>
                        )}
                        {bankerPair && (
                          <span
                            data-side-bet="banker-pair"
                            className="inline-flex items-center rounded-sm border border-gold/40 bg-gold/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-gold-bright"
                          >
                            B-Pair
                          </span>
                        )}
                        {isBig && (
                          <span
                            data-side-bet="big"
                            className="inline-flex items-center rounded-sm border border-white/30 bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/70"
                          >
                            Big
                          </span>
                        )}
                        {isSmall && (
                          <span
                            data-side-bet="small"
                            className="inline-flex items-center rounded-sm border border-white/20 bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/60"
                          >
                            Small
                          </span>
                        )}
                        {isDragon && (
                          <span
                            data-side-bet="dragon"
                            className="inline-flex items-center rounded-sm border border-jewel-magenta/60 bg-jewel-magenta/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-jewel-magenta"
                          >
                            Dragon
                          </span>
                        )}
                        {!playerPair && !bankerPair && !isBig && !isSmall && !isDragon && (
                          <span className="text-white/30">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">
                      {r.betAmount.toLocaleString()}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">
                      {r.payout.toLocaleString()}
                    </td>
                    <td
                      className={`py-1.5 text-right tabular-nums ${
                        housePl > 0
                          ? 'text-chip-win'
                          : housePl < 0
                            ? 'text-casino-red'
                            : 'text-white/60'
                      }`}
                    >
                      {housePl > 0 ? '+' : ''}
                      {housePl.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
