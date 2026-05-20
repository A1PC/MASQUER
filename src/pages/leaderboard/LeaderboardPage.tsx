import type { JSX } from 'react';
import { Outlet, useParams } from 'react-router';
import LeaderboardLeftRail from './LeaderboardLeftRail';
import ViewModeToggle from '@/pages/stats/ViewModeToggle';

const TITLES: Record<string, string> = {
  '': 'OVERVIEW',
  blackjack: 'BLACKJACK',
  roulette: 'ROULETTE',
  slots: 'SLOTS',
  baccarat: 'BACCARAT',
  'coin-flip': 'COIN FLIP',
  lottery: 'LOTTERY',
  bingo: 'BINGO',
  plinko: 'PLINKO',
};

export default function LeaderboardPage(): JSX.Element {
  const { game } = useParams<{ game?: string }>();
  const title = TITLES[game ?? ''] ?? 'OVERVIEW';
  return (
    <div className="flex min-h-screen bg-felt-deep text-white">
      <LeaderboardLeftRail />
      <main className="flex-1 overflow-auto p-6">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-base tracking-wider text-gold-bright">
            LEADERBOARD · {title}
          </h1>
          <ViewModeToggle />
        </header>
        <Outlet />
      </main>
    </div>
  );
}
