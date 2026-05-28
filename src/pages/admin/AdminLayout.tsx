import type { JSX } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { useSessionStore } from '@/store/sessionStore';

const NAV_ITEMS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/users', label: 'Users', end: false },
  { to: '/admin/adjustments', label: 'Adjustments', end: false },
  { to: '/admin/sessions', label: 'Sessions', end: false },
  { to: '/admin/leaderboard', label: 'Leaderboard', end: false },
  { to: '/admin/lottery', label: 'Lottery', end: false },
  { to: '/admin/bingo', label: 'Bingo', end: false },
  { to: '/admin/roulette', label: 'Roulette', end: false },
  { to: '/admin/slots', label: 'Slots', end: false },
  { to: '/admin/blackjack', label: 'Blackjack', end: false },
  { to: '/admin/poker', label: 'Poker', end: false },
  { to: '/admin/craps', label: 'Craps', end: false },
  { to: '/admin/plinko', label: 'Plinko', end: false },
  { to: '/admin/baccarat', label: 'Baccarat', end: false },
] as const;

export default function AdminLayout(): JSX.Element {
  const navigate = useNavigate();
  const logoutAdmin = useSessionStore((s) => s.logoutAdmin);

  function handleLogout() {
    logoutAdmin();
    void navigate('/admin/login', { replace: true });
  }

  return (
    <div className="flex h-full flex-col bg-felt-table text-ivory" data-admin-layout>
      <header
        className="flex items-center justify-between border-b border-brass/60 bg-velvet-deep px-6 py-3"
        data-admin-topbar
      >
        <h1 className="font-display text-sm tracking-[0.18em] text-gold-bright">
          MASQUER &middot; Admin
        </h1>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md border border-brass/60 px-3 py-1 font-display text-xs tracking-[0.18em] text-ivory hover:bg-velvet"
          data-admin-logout
        >
          Log out
        </button>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside
          className="w-44 shrink-0 overflow-y-auto border-r border-brass/60 bg-velvet-deep py-4"
          data-admin-sidebar
        >
          <div className="px-4 pb-4 font-display text-xs tracking-[0.2em] text-gold-bright">
            ADMIN
          </div>
          <nav className="flex flex-col">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    'border-l-[3px] px-4 py-2 text-xs transition',
                    isActive
                      ? 'border-brass bg-velvet font-display tracking-[0.12em] text-gold-bright'
                      : 'border-transparent text-ivory/55 hover:bg-velvet/50',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex-1 overflow-auto bg-felt-table p-6" data-admin-main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
