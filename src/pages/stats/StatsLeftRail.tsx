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
};

export default function StatsLeftRail({ basePath }: Props): JSX.Element {
  return (
    <aside className="w-40 shrink-0 border-r border-gold/40 bg-felt-deep py-4">
      <nav className="flex flex-col" data-stats-rail>
        {TABS.map((t) => {
          const slug = SLUG[t.label] ?? '';
          const to = slug === '' ? basePath : `${basePath}/${slug}`;
          return (
            <NavLink
              key={t.label}
              to={to}
              end={t.end ?? false}
              className={({ isActive }) =>
                [
                  'border-l-[3px] px-4 py-2 text-xs',
                  isActive
                    ? 'border-gold bg-gold/10 text-gold-bright'
                    : 'border-transparent text-white/60 hover:bg-white/5',
                ].join(' ')
              }
            >
              {t.icon} {t.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
