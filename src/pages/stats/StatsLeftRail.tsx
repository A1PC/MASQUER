import type { JSX } from 'react';
import { NavLink } from 'react-router';

interface Item {
  to: string;
  icon: string;
  label: string;
  end?: boolean;
}

interface Props {
  /** Base path: '/stats' or '/leaderboard'. The rail builds child links from this. */
  basePath: '/stats' | '/leaderboard';
}

const TABS: Omit<Item, 'to'>[] = [
  { icon: '📊', label: 'Overview', end: true },
  { icon: '🃏', label: 'Blackjack' },
  { icon: '🎡', label: 'Roulette' },
  { icon: '🎰', label: 'Slots' },
  { icon: '🎴', label: 'Baccarat' },
  { icon: '🪙', label: 'Coin Flip' },
  { icon: '🎟️', label: 'Lottery' },
  { icon: '🎯', label: 'Bingo' },
  { icon: '🔻', label: 'Plinko' },
  { icon: '♠️', label: 'Poker' },
  { icon: '🎲', label: 'Craps' },
];

const SLUG: Record<string, string> = {
  Overview: '',
  Blackjack: 'blackjack',
  Roulette: 'roulette',
  Slots: 'slots',
  Baccarat: 'baccarat',
  'Coin Flip': 'coin-flip',
  Lottery: 'lottery',
  Bingo: 'bingo',
  Plinko: 'plinko',
  Poker: 'poker',
  Craps: 'craps',
};

export default function StatsLeftRail({ basePath }: Props): JSX.Element {
  const heading = basePath === '/stats' ? 'STATS' : 'LEADERBOARD';
  return (
    <aside
      className="w-40 shrink-0 overflow-y-auto border-r border-brass/60 bg-velvet-deep py-4"
      data-stats-rail
    >
      <div className="px-4 pb-4 font-display text-xs tracking-[0.2em] text-gold-bright">
        {heading}
      </div>
      <nav className="flex flex-col">
        {TABS.map((t) => {
          const slug = SLUG[t.label] ?? '';
          const to = slug === '' ? basePath : `${basePath}/${slug}`;
          return (
            <NavLink
              key={t.label}
              to={to}
              {...(t.end ? { end: true } : {})}
              className={({ isActive }) =>
                [
                  'flex items-center gap-2 border-l-[3px] px-4 py-2 text-xs transition',
                  isActive
                    ? 'border-brass bg-velvet font-display tracking-[0.12em] text-gold-bright'
                    : 'border-transparent text-ivory/55 hover:bg-velvet/50',
                ].join(' ')
              }
            >
              <span aria-hidden>{t.icon}</span>
              <span>{t.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
