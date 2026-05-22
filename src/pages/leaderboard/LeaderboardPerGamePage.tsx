import type { JSX } from 'react';
import { useParams } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCurrentUser } from '@/store/sessionStore';
import { useStatsViewMode } from '@/store/uiStore';
import type { Round } from '@/db';
import { getLeaderboard, type LeaderboardRow } from '@/systems/stats';
import EmptyState from '@/pages/stats/EmptyState';
import BoardBar from '@/components/charts/BoardBar';
import { formatChips, formatSignedChips } from '@/pages/stats/formatters';
import Board from './Board';

type Game = Round['game'];

const GAME_LABELS: Record<Game, string> = {
  blackjack: 'BLACKJACK',
  roulette: 'ROULETTE',
  slots: 'SLOTS',
  baccarat: 'BACCARAT',
  'coin-flip': 'COIN FLIP',
  lottery: 'LOTTERY', // A.8 will complete full wiring
  bingo: 'BINGO', // PR D will complete full wiring
  plinko: 'PLINKO', // PR D will complete full wiring
  poker: 'POKER',
  craps: 'CRAPS',
};

const EMPTY: readonly LeaderboardRow[] = [];

export default function LeaderboardPerGamePage(): JSX.Element | null {
  const { game } = useParams<{ game: Game }>();
  const user = useCurrentUser();

  const netWinner = useLiveQuery(
    () => (game ? getLeaderboard('netWinner', game, 100) : Promise.resolve([] as LeaderboardRow[])),
    [game],
    EMPTY,
  );
  const biggestSingleWin = useLiveQuery(
    () =>
      game
        ? getLeaderboard('biggestSingleWin', game, 100)
        : Promise.resolve([] as LeaderboardRow[]),
    [game],
    EMPTY,
  );
  const mostRounds = useLiveQuery(
    () =>
      game ? getLeaderboard('mostRounds', game, 100) : Promise.resolve([] as LeaderboardRow[]),
    [game],
    EMPTY,
  );

  const mode = useStatsViewMode();

  if (!user || !game) return null;

  const allEmpty =
    netWinner.length === 0 && biggestSingleWin.length === 0 && mostRounds.length === 0;
  if (allEmpty) {
    const label = GAME_LABELS[game];
    return <EmptyState gameName={label ?? game} ctaTo={`/play/${game}`} />;
  }

  const label = GAME_LABELS[game] ?? game;

  if (mode === 'graphs') {
    return (
      <div className="flex flex-col gap-6">
        <section>
          <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
            {label} — BEST PLAYER
          </h2>
          <BoardBar rows={netWinner} currentUserId={user.id} formatValue={formatSignedChips} />
        </section>
        <section>
          <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
            {label} — BIGGEST SINGLE WIN
          </h2>
          <BoardBar
            rows={biggestSingleWin}
            currentUserId={user.id}
            formatValue={formatSignedChips}
          />
        </section>
        <section>
          <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
            {label} — MOST ROUNDS PLAYED
          </h2>
          <BoardBar rows={mostRounds} currentUserId={user.id} formatValue={formatChips} />
        </section>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Board title={`${label} — BEST PLAYER`} rows={netWinner} currentUserId={user.id} />
      <Board
        title={`${label} — BIGGEST SINGLE WIN`}
        rows={biggestSingleWin}
        currentUserId={user.id}
      />
      <Board title={`${label} — MOST ROUNDS PLAYED`} rows={mostRounds} currentUserId={user.id} />
    </div>
  );
}
