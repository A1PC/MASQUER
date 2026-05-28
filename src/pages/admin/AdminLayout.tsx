import type { JSX } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { useSessionStore } from '@/store/sessionStore';
import { Button } from '@/components/ui';

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
  { to: '/admin/coin-flip', label: 'Coin-flip', end: false },
] as const;

/**
 * Background-token rule (audit §1.3): `bg-felt-table` is the outer surface,
 * `bg-velvet-deep` is the chrome (topbar + sidebar), `bg-felt-deep` is the
 * inner-card colour (e.g. AdminRoulettePage panels). Don't mix these roles.
 */
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
        <h1 className="font-display text-sm tracking-[0.18em] text-gold-bright">MASQUER · Admin</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          data-admin-logout
          className="border border-brass/60 px-3 py-1 text-ivory hover:bg-velvet"
        >
          Log out
        </Button>
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
                    'border-l-[3px] px-4 py-2 text-xs outline-none transition',
                    'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/40',
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
