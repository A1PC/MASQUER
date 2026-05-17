import type { JSX } from 'react';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router';
import { useCurrentUser, useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';

export default function ProfileDropdown(): JSX.Element | null {
  const user = useCurrentUser();
  const logout = useSessionStore((s) => s.logout);
  const clearWallet = useWalletStore((s) => s.clear);
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!user) return null;

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    clearWallet();
    void navigate('/login', { replace: true });
  };

  const go = (to: string) => {
    setOpen(false);
    void navigate(to);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded border-transparent bg-transparent px-1 py-1 text-sm text-white hover:bg-white/5"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span
          className="inline-block h-7 w-7 rounded-full"
          style={{ backgroundColor: user.avatarColor }}
        />
        {user.username}
        <span className="text-[9px] opacity-70">{open ? '▴' : '▾'}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-[calc(100%+8px)] z-10 w-[220px] rounded-lg border border-gold bg-felt py-2 shadow-2xl"
            role="menu"
          >
            <div className="border-b border-gold/15 px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <span
                  className="inline-block h-8 w-8 rounded-full"
                  style={{ backgroundColor: user.avatarColor }}
                />
                <div>
                  <div className="text-[13px] font-semibold text-white">{user.username}</div>
                  <div className="font-mono text-[11px] text-white/50">
                    Joined {timeAgo(user.createdAt)}
                  </div>
                </div>
              </div>
            </div>
            <MenuItem icon="👤" label="View profile" onClick={() => go('/profile')} />
            <MenuItem icon="✏️" label="Edit profile" onClick={() => go('/profile/edit')} />
            <MenuItem icon="📊" label="My stats" onClick={() => go('/stats')} />
            <MenuItem icon="⚙️" label="Settings" onClick={() => go('/settings')} />
            <div className="my-1.5 border-t border-gold/15" />
            <MenuItem
              icon="🚪"
              label="Log out"
              onClick={() => void handleLogout()}
              variant="danger"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  variant = 'default',
}: {
  icon: string;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}) {
  return (
    <button
      onClick={onClick}
      role="menuitem"
      className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] ${
        variant === 'danger' ? 'text-chip-loss' : 'text-white'
      } hover:bg-white/5`}
    >
      <span>{icon}</span> {label}
    </button>
  );
}

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  const days = Math.floor(seconds / 86_400);
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'} ago`;
  const hours = Math.floor(seconds / 3600);
  if (hours >= 1) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes >= 1) return `${minutes} min ago`;
  return 'just now';
}
