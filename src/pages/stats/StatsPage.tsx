import type { JSX } from 'react';
import { Outlet, useParams } from 'react-router';
import StatsLeftRail from './StatsLeftRail';
import ViewModeToggle from './ViewModeToggle';

const TITLES: Record<string, string> = {
  '': 'OVERVIEW',
  blackjack: 'BLACKJACK',
  roulette: 'ROULETTE',
  slots: 'SLOTS',
  baccarat: 'BACCARAT',
  'coin-flip': 'COIN FLIP',
};

export default function StatsPage(): JSX.Element {
  const { game } = useParams<{ game?: string }>();
  const title = TITLES[game ?? ''] ?? 'OVERVIEW';
  return (
    <div className="flex min-h-screen bg-felt-deep text-white">
      <StatsLeftRail basePath="/stats" />
      <main className="flex-1 overflow-auto p-6">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-base tracking-wider text-gold-bright">
            STATS · {title}
          </h1>
          <ViewModeToggle />
        </header>
        <Outlet />
      </main>
    </div>
  );
}
