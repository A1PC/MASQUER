import type { JSX } from 'react';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { NavLink, useLocation } from 'react-router';
import { useCurrentUser } from '@/store/sessionStore';
import { markDrawSeen, useLatestDrawId, useUnreadDot } from '@/systems/lottery-unread';
import { Icon, type IconName } from '@/components/ui';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
import { NAV_ICON } from '@/components/nav/gameIcons';
import { usePrefetchOnHover } from '@/router/usePrefetchOnHover';

interface Props {
  collapsed: boolean;
}

interface NavItemDef {
  to: string;
  /** Lucide `Icon` name from the single-source `NAV_ICON` map. */
  iconName: IconName;
  label: string;
  badge?: 'NEW';
  /** Optional prefetch key — must match a `registerPrefetcher` key in router.tsx. */
  prefetchKey?: string;
}

const GAMES: NavItemDef[] = [
  { to: '/lobby', iconName: NAV_ICON.lobby, label: 'Lobby', prefetchKey: 'lobby' },
  {
    to: '/play/coin-flip',
    iconName: NAV_ICON['coin-flip'],
    label: 'Coin Flip',
    prefetchKey: 'coin-flip',
  },
  {
    to: '/play/blackjack',
    iconName: NAV_ICON.blackjack,
    label: 'Blackjack',
    prefetchKey: 'blackjack',
  },
  {
    to: '/play/roulette',
    iconName: NAV_ICON.roulette,
    label: 'Roulette',
    prefetchKey: 'roulette',
  },
  { to: '/play/slots', iconName: NAV_ICON.slots, label: 'Slots', prefetchKey: 'slots' },
  {
    to: '/play/baccarat',
    iconName: NAV_ICON.baccarat,
    label: 'Baccarat',
    prefetchKey: 'baccarat',
  },
  { to: '/play/bingo', iconName: NAV_ICON.bingo, label: 'Bingo', prefetchKey: 'bingo' },
  { to: '/play/plinko', iconName: NAV_ICON.plinko, label: 'Plinko', prefetchKey: 'plinko' },
  { to: '/play/poker', iconName: NAV_ICON.poker, label: 'Poker', prefetchKey: 'poker' },
  { to: '/play/craps', iconName: NAV_ICON.craps, label: 'Craps', prefetchKey: 'craps' },
];

const YOU: NavItemDef[] = [
  { to: '/stats', iconName: NAV_ICON.stats, label: 'Stats', prefetchKey: 'stats' },
  {
    to: '/leaderboard',
    iconName: NAV_ICON.leaderboard,
    label: 'Leaderboard',
    prefetchKey: 'leaderboard',
  },
  { to: '/settings', iconName: NAV_ICON.settings, label: 'Settings', prefetchKey: 'settings' },
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
      className="flex-shrink-0 overflow-hidden border-r border-brass/40 bg-velvet-deep shadow-[inset_-8px_0_16px_-12px_rgba(0,0,0,0.6)]"
      aria-hidden={collapsed}
      // `inert` removes the collapsed sidebar from the tab order entirely —
      // `aria-hidden` alone doesn't prevent Tab-into-invisible-nav.
      // React 18 typings don't yet include `inert`, but ReactDOM forwards
      // unknown string attributes; spread to bypass the missing type until
      // the React 19 upgrade. Audit §1.2 — sidebar collapsed-tab-leak.
      {...(collapsed ? ({ inert: '' } as unknown as { inert?: string }) : {})}
    >
      <nav className="w-[200px] py-5">
        <SectionLabel>GAMES</SectionLabel>
        {GAMES.map((item) => (
          <NavItem key={item.to} item={item} reduce={reduce} />
        ))}
        <NavItem
          item={{
            to: '/lottery',
            iconName: NAV_ICON.lottery,
            label: 'Lottery',
            prefetchKey: 'lottery',
          }}
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
    <div className="mb-1 px-4 pt-1 font-display text-[10px] uppercase tracking-[0.22em] text-gold">
      {children}
    </div>
  );
}

function Divider() {
  return <div className="mx-4 my-4 border-t border-brass/30" />;
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
  const { to, iconName, label, badge, prefetchKey } = item;
  // Hover/focus pre-warms the lazy chunk for the matching route key. When the
  // key is missing or no prefetcher is registered the handlers are no-ops, so
  // it's always safe to spread them onto the NavLink.
  const prefetchHandlers = usePrefetchOnHover(prefetchKey ?? '');
  return (
    <NavLink
      to={to}
      {...prefetchHandlers}
      className={({ isActive }) =>
        `group relative flex items-center justify-between px-4 py-2 font-display text-[12.5px] tracking-[0.05em] outline-none transition-colors focus-visible:bg-gold/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/40 ${
          isActive
            ? 'bg-gradient-to-r from-gold/15 to-transparent text-gold-bright'
            : 'text-ivory/85 hover:bg-gold/5 hover:text-ivory'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive &&
            (reduce ? (
              <span className="absolute inset-y-1 left-0 w-[3px] rounded-r bg-gold-bright shadow-[0_0_8px_rgba(232,189,109,0.7)]" />
            ) : (
              <motion.span
                layoutId="sidebar-active-rail"
                className="absolute inset-y-1 left-0 w-[3px] rounded-r bg-gold-bright shadow-[0_0_8px_rgba(232,189,109,0.7)]"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            ))}
          <span className="flex items-center gap-2.5">
            <Icon
              name={iconName}
              size={15}
              className={isActive ? 'text-gold-bright' : 'text-ivory/65 group-hover:text-gold'}
            />
            {label}
          </span>
          {unread && (
            <span
              data-testid="unread-dot"
              className="ml-1 inline-block h-2 w-2 rounded-full bg-casino-red shadow-[0_0_6px_rgba(220,38,38,0.7)]"
              aria-label="New lottery draw"
            />
          )}
          {badge && (
            <span className="rounded-full border border-gold-bright/60 bg-velvet px-1.5 text-[9px] font-bold uppercase tracking-wider text-gold-bright">
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}
