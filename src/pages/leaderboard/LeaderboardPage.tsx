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
  poker: 'POKER',
};

export default function LeaderboardPage(): JSX.Element {
  const { game } = useParams<{ game?: string }>();
  const title = TITLES[game ?? ''] ?? 'OVERVIEW';
  return (
    <div className="flex h-full flex-col bg-felt-table text-ivory" data-leaderboard-page>
      <div className="flex flex-1 overflow-hidden">
        <LeaderboardLeftRail />
        <main className="flex flex-1 flex-col overflow-auto p-6" data-leaderboard-main>
          <header className="mb-4 flex items-center justify-between">
            <h1 className="font-display text-2xl tracking-[0.18em] text-gold-bright">
              LEADERBOARD · {title}
            </h1>
            <ViewModeToggle />
          </header>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
