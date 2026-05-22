import type { JSX } from 'react';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { Button, Icon } from '@/components/ui';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
import { useBalance, useNextDailyEligibleAt, useWalletStore } from '@/store/walletStore';
import { useCurrentUser } from '@/store/sessionStore';
import { WALLET_CONFIG } from '@/systems/wallet';

export default function CreditsDropdown(): JSX.Element {
  const [open, setOpen] = useState(false);
  const balance = useBalance() ?? 0;
  const eligibleAt = useNextDailyEligibleAt();
  const claim = useWalletStore((s) => s.claimDaily);
  const user = useCurrentUser();
  const reduce = useEffectiveReducedMotion();

  // Countdown state — recomputed every second while dropdown is open.
  const [remaining, setRemaining] = useState(() => Math.max(0, (eligibleAt ?? 0) - Date.now()));
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => {
      setRemaining(Math.max(0, (eligibleAt ?? 0) - Date.now()));
    }, 1_000);
    return () => clearInterval(id);
  }, [open, eligibleAt]);

  // Click-outside to close.
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Animated count-up/down on balance change.
  const display = useMotionValue(balance);
  const rounded = useTransform(display, (v) => Math.round(v).toLocaleString());
  useEffect(() => {
    const controls = animate(display, balance, {
      duration: reduce ? 0 : 0.6,
      ease: 'easeOut',
    });
    return controls.stop;
  }, [balance, display, reduce]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-brass bg-transparent px-3.5 py-1.5 font-numeral tabular-nums text-gold transition-colors hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Your chips: ${balance.toLocaleString()}`}
      >
        <Icon name="Coins" size={15} className="text-gold" />
        <motion.span>{rounded}</motion.span>
        <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size={13} className="text-gold/60" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: reduce ? 0 : 0.15 }}
            className="absolute right-0 top-[calc(100%+8px)] z-20 w-[268px] rounded-xl border border-brass bg-velvet-deep p-4 shadow-2xl"
            role="menu"
          >
            <div className="mb-3 flex items-baseline justify-between border-b border-gold/20 pb-2.5">
              <span className="font-display text-[13px] tracking-[0.12em] text-gold">
                YOUR CHIPS
              </span>
              <span className="font-numeral text-xl tabular-nums text-gold">
                <motion.span>{rounded}</motion.span>
              </span>
            </div>
            <div className="mb-1.5 text-[11px] uppercase tracking-[0.1em] text-ivory/55">
              Next daily drop
            </div>
            {remaining > 0 ? (
              <div className="flex items-center justify-between rounded-lg border border-brass/40 bg-felt-deep px-3 py-2.5">
                <span className="font-numeral text-lg tabular-nums text-gold">
                  {formatCountdown(remaining)}
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-chip-win">
                  +{WALLET_CONFIG.DAILY_CLAIM_AMOUNT}
                  <Icon name="Coins" size={13} />
                </span>
              </div>
            ) : (
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => {
                  if (user) void claim(user.id);
                }}
              >
                <Icon name="Gift" size={15} />
                Claim +{WALLET_CONFIG.DAILY_CLAIM_AMOUNT}
              </Button>
            )}
            <p className="mt-2 text-[11px] leading-relaxed text-ivory/50">
              Claim {WALLET_CONFIG.DAILY_CLAIM_AMOUNT} free chips every 24 hours from your last
              claim.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatCountdown(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}
