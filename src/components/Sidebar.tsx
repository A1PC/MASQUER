import type { JSX } from 'react';
import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { NavLink, useLocation } from 'react-router';
import { useCurrentUser } from '@/store/sessionStore';
import { markDrawSeen, useLatestDrawId, useUnreadDot } from '@/systems/lottery-unread';

interface Props {
  collapsed: boolean;
}

interface NavItemDef {
  to: string;
  icon: string;
  label: string;
  badge?: 'NEW';
}

const GAMES: NavItemDef[] = [
  { to: '/lobby', icon: '🏛️', label: 'Lobby' },
  { to: '/play/coin-flip', icon: '🪙', label: 'Coin Flip' },
  { to: '/play/blackjack', icon: '🃏', label: 'Blackjack' },
  { to: '/play/roulette', icon: '🎡', label: 'Roulette' },
  { to: '/play/slots', icon: '🎰', label: 'Slots' },
  { to: '/play/baccarat', icon: '🎴', label: 'Baccarat', badge: 'NEW' },
  { to: '/play/bingo', icon: '🎯', label: 'Bingo' },
];

const YOU: NavItemDef[] = [
  { to: '/stats', icon: '📊', label: 'Stats' },
  { to: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
];

export default function Sidebar({ collapsed }: Props): JSX.Element {
  const reduce = useReducedMotion();
  const user = useCurrentUser();
  const lastDrawId = useLatestDrawId();
  const hasUnread = useUnreadDot(user?.id ?? null);
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/lottery' && user?.id && lastDrawId) {
      markDrawSeen(user.id, lastDrawId);
    }
  }, [location.pathname, user?.id, lastDrawId]);

  return (
    <motion.aside
      animate={{ width: collapsed ? 0 : 200 }}
      initial={false}
      transition={reduce ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
      className="flex-shrink-0 overflow-hidden border-r border-gold/20 bg-felt-deep"
      aria-hidden={collapsed}
    >
      <nav className="w-[200px] py-4">
        <SectionLabel>GAMES</SectionLabel>
        {GAMES.map((item) => (
          <NavItem key={item.to} item={item} />
        ))}
        <NavLink
          to="/lottery"
          className={({ isActive }) =>
            `flex items-center justify-between px-4 py-2 text-[13px] transition-colors ${
              isActive
                ? 'border-l-[3px] border-gold-bright bg-gold-bright/10 text-gold-bright'
                : 'text-white hover:bg-white/5'
            }`
          }
        >
          <span>🎟️ Lottery</span>
          {hasUnread && (
            <span
              data-testid="unread-dot"
              className="ml-1 inline-block h-2 w-2 rounded-full bg-casino-red"
              aria-label="New lottery draw"
            />
          )}
        </NavLink>
        <Divider />
        <SectionLabel>YOU</SectionLabel>
        {YOU.map((item) => (
          <NavItem key={item.to} item={item} />
        ))}
      </nav>
    </motion.aside>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 pb-1 font-display text-[10px] tracking-[1.5px] text-gold">{children}</div>
  );
}

function Divider() {
  return <div className="mx-4 my-3.5 border-t border-gold/20" />;
}

function NavItem({ item }: { item: NavItemDef }) {
  const { to, icon, label, badge } = item;
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center justify-between px-4 py-2 text-[13px] transition-colors ${
          isActive
            ? 'border-l-[3px] border-gold-bright bg-gold-bright/10 text-gold-bright'
            : 'text-white hover:bg-white/5'
        }`
      }
    >
      <span>
        {icon} {label}
      </span>
      {badge && (
        <span className="rounded-full bg-neon-cyan px-1.5 text-[9px] font-bold text-felt-deep">
          {badge}
        </span>
      )}
    </NavLink>
  );
}
