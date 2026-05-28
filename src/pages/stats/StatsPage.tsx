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
  lottery: 'LOTTERY',
  bingo: 'BINGO',
  plinko: 'PLINKO',
  poker: 'POKER',
};

export default function StatsPage(): JSX.Element {
  const { game } = useParams<{ game?: string }>();
  const title = TITLES[game ?? ''] ?? 'OVERVIEW';
  return (
    <div className="flex h-full flex-col bg-felt-table text-ivory" data-stats-page>
      <div className="flex flex-1 overflow-hidden">
        <StatsLeftRail basePath="/stats" />
        <main className="flex flex-1 flex-col overflow-auto p-6" data-stats-main>
          <header className="mb-4 flex items-center justify-between">
            <h1 className="font-display text-2xl tracking-[0.18em] text-gold-bright">
              STATS · {title}
            </h1>
            <ViewModeToggle />
          </header>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
