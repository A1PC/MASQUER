import type { JSX } from 'react';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { NavLink, useLocation } from 'react-router';
import { useCurrentUser } from '@/store/sessionStore';
import { markDrawSeen, useLatestDrawId, useUnreadDot } from '@/systems/lottery-unread';
import { Icon, type IconName } from '@/components/ui';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
import { NAV_ICON } from '@/components/nav/gameIcons';

interface Props {
  collapsed: boolean;
}

interface NavItemDef {
  to: string;
  /** Lucide `Icon` name from the single-source `NAV_ICON` map. */
  iconName: IconName;
  label: string;
  badge?: 'NEW';
}

const GAMES: NavItemDef[] = [
  { to: '/lobby', iconName: NAV_ICON.lobby, label: 'Lobby' },
  { to: '/play/coin-flip', iconName: NAV_ICON['coin-flip'], label: 'Coin Flip' },
  { to: '/play/blackjack', iconName: NAV_ICON.blackjack, label: 'Blackjack' },
  { to: '/play/roulette', iconName: NAV_ICON.roulette, label: 'Roulette' },
  { to: '/play/slots', iconName: NAV_ICON.slots, label: 'Slots' },
  { to: '/play/baccarat', iconName: NAV_ICON.baccarat, label: 'Baccarat', badge: 'NEW' },
  { to: '/play/bingo', iconName: NAV_ICON.bingo, label: 'Bingo' },
  { to: '/play/plinko', iconName: NAV_ICON.plinko, label: 'Plinko' },
  { to: '/play/poker', iconName: NAV_ICON.poker, label: 'Poker' },
  { to: '/play/craps', iconName: NAV_ICON.craps, label: 'Craps' },
];

const YOU: NavItemDef[] = [
  { to: '/stats', iconName: NAV_ICON.stats, label: 'Stats' },
  { to: '/leaderboard', iconName: NAV_ICON.leaderboard, label: 'Leaderboard' },
  { to: '/settings', iconName: NAV_ICON.settings, label: 'Settings' },
];

export default function Sidebar({ collapsed }: Props): JSX.Element {
  const reduce = useEffectiveReducedMotion();
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
          <NavItem key={item.to} item={item} reduce={reduce} />
        ))}
        <NavItem
          item={{ to: '/lottery', iconName: NAV_ICON.lottery, label: 'Lottery' }}
          reduce={reduce}
          unread={hasUnread}
        />
        <Divider />
        <SectionLabel>YOU</SectionLabel>
        {YOU.map((item) => (
          <NavItem key={item.to} item={item} reduce={reduce} />
        ))}
      </nav>
    </motion.aside>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 pb-1 font-display text-[10px] tracking-[1.5px] text-gold/80">
      {children}
    </div>
  );
}

function Divider() {
  return <div className="mx-4 my-3.5 border-t border-gold/20" />;
}

function NavItem({
  item,
  reduce,
  unread = false,
}: {
  item: NavItemDef;
  reduce: boolean;
  unread?: boolean;
}) {
  const { to, iconName, label, badge } = item;
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group relative flex items-center justify-between px-4 py-2 text-[13px] outline-none transition-colors focus-visible:bg-gold/10 ${
          isActive ? 'text-gold' : 'text-ivory/85 hover:bg-white/5 hover:text-ivory'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive &&
            (reduce ? (
              <span className="absolute inset-y-1 left-0 w-[3px] rounded-r bg-gold" />
            ) : (
              <motion.span
                layoutId="sidebar-active-rail"
                className="absolute inset-y-1 left-0 w-[3px] rounded-r bg-gold"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            ))}
          <span className="flex items-center gap-2">
            <Icon
              name={iconName}
              size={15}
              className={isActive ? 'text-gold' : 'text-ivory/70 group-hover:text-ivory'}
            />
            {label}
          </span>
          {unread && (
            <span
              data-testid="unread-dot"
              className="ml-1 inline-block h-2 w-2 rounded-full bg-casino-red"
              aria-label="New lottery draw"
            />
          )}
          {badge && (
            <span className="rounded-full bg-neon-cyan px-1.5 text-[9px] font-bold text-felt-deep">
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}
