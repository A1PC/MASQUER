import type { JSX } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { useSessionStore } from '@/store/sessionStore';

const NAV_ITEMS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/users', label: 'Users', end: false },
  { to: '/admin/adjustments', label: 'Adjustments', end: false },
  { to: '/admin/sessions', label: 'Sessions', end: false },
  { to: '/admin/lottery', label: 'Lottery', end: false },
  { to: '/admin/bingo', label: 'Bingo', end: false },
  { to: '/admin/roulette', label: 'Roulette', end: false },
  { to: '/admin/slots', label: 'Slots', end: false },
] as const;

export default function AdminLayout(): JSX.Element {
  const navigate = useNavigate();
  const logoutAdmin = useSessionStore((s) => s.logoutAdmin);

  function handleLogout() {
    logoutAdmin();
    void navigate('/admin/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-felt-deep text-white">
      <aside className="w-44 shrink-0 border-r border-gold/40 bg-felt-deep py-4">
        <div className="px-4 pb-4 font-display text-xs tracking-[0.2em] text-gold">ADMIN</div>
        <nav className="flex flex-col">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'border-l-[3px] px-4 py-2 text-xs',
                  isActive
                    ? 'border-gold bg-gold/10 text-gold-bright'
                    : 'border-transparent text-white/60 hover:bg-white/5',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
          <div className="my-3 border-t border-gold/30" />
          <button
            type="button"
            onClick={handleLogout}
            className="border-l-[3px] border-transparent px-4 py-2 text-left text-xs text-white/60 hover:bg-white/5"
          >
            Log out
          </button>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
