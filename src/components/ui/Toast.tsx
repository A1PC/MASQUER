import { useCallback, useMemo, useRef, useState } from 'react';
import type { JSX, ReactNode } from 'react';
import * as RadixToast from '@radix-ui/react-toast';
import { cn } from './cn';
import { Icon, type IconName } from './Icon';
import MaskMark from '@/components/brand/MaskMark';
import {
  ToastContext,
  type ToastContextValue,
  type ToastOptions,
  type ToastTone,
} from './toast-context';
import { useSound } from '@/systems/sound/useSound';
import type { SoundId } from '@/systems/sound/ids';

/**
 * Toast system on `@radix-ui/react-toast`. `ToastProvider` holds a queue in
 * React state and renders the Radix `Provider` + bottom-right `Viewport`;
 * `useToast()` returns `toast({ title, description?, tone? })`. Radix gives the
 * accessibility contract: each toast is a live region (`aria-live` /
 * `role="status"`), is auto-dismissed after `duration`, does not steal focus,
 * and is keyboard-dismissible. Velvet Deco styling: a surface card with a gold
 * left-accent bar and a `MaskMark` icon. Enter/exit motion is `motion-safe`
 * only — reduced-motion users get instant toasts.
 */

interface ToastEntry extends ToastOptions {
  id: number;
  open: boolean;
}

const accentByTone: Record<ToastTone, string> = {
  info: 'before:bg-brass',
  win: 'before:bg-gold',
  loss: 'before:bg-[#a3243a]',
};

// Functional colour is always paired with an icon (a11y: never colour-only).
const iconByTone: Record<ToastTone, IconName> = {
  info: 'Info',
  win: 'Sparkles',
  loss: 'TrendingDown',
};

// Each tone is announced with a matching sound (prefs-gated by useSound).
const soundByTone: Record<ToastTone, SoundId> = {
  info: 'ui.toggle',
  win: 'win.medium',
  loss: 'loss',
};

const iconColorByTone: Record<ToastTone, string> = {
  info: 'text-brass',
  win: 'text-gold',
  loss: 'text-[#e3a8af]',
};

interface ToastProviderProps {
  children: ReactNode;
  /** Default auto-dismiss duration in ms for every toast (Radix default 4000). */
  duration?: number;
}

export function ToastProvider({ children, duration = 4000 }: ToastProviderProps): JSX.Element {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(0);
  const { play } = useSound();

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, open: true, tone: 'info', ...options }]);
      play(soundByTone[options.tone ?? 'info']);
    },
    [play],
  );

  const setOpen = useCallback((id: number, open: boolean) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, open } : t)));
    if (!open) {
      // Drop the entry after Radix's exit animation has run.
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 200);
    }
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      <RadixToast.Provider duration={duration} swipeDirection="right">
        {children}
        {toasts.map((t) => {
          const tone = t.tone ?? 'info';
          return (
            <RadixToast.Root
              key={t.id}
              type="background"
              open={t.open}
              onOpenChange={(open) => setOpen(t.id, open)}
              {...(t.duration !== undefined ? { duration: t.duration } : {})}
              className={cn(
                'relative flex items-center gap-3 overflow-hidden rounded-lg border border-brass bg-surface ' +
                  'py-3 pl-5 pr-3 shadow-velvet-panel ' +
                  'before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-[""] ' +
                  'motion-safe:data-[state=open]:animate-toastIn motion-safe:data-[state=closed]:animate-toastOut ' +
                  'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] ' +
                  'data-[swipe=cancel]:translate-x-0 data-[swipe=end]:animate-toastOut',
                accentByTone[tone],
              )}
            >
              <span className={cn('shrink-0', iconColorByTone[tone])}>
                <MaskMark size={26} variant="simple" title="" />
              </span>
              <div className="min-w-0 flex-1">
                <RadixToast.Title className="flex items-center gap-1.5 font-display text-sm tracking-[0.04em] text-gold">
                  <Icon name={iconByTone[tone]} size={14} className={iconColorByTone[tone]} />
                  {t.title}
                </RadixToast.Title>
                {t.description ? (
                  <RadixToast.Description className="mt-0.5 font-body text-xs font-light leading-snug text-ivory/80">
                    {t.description}
                  </RadixToast.Description>
                ) : null}
              </div>
              <RadixToast.Close
                aria-label="Dismiss"
                className="shrink-0 rounded-full p-1 text-brass outline-none transition-colors hover:bg-gold/10 hover:text-gold focus-visible:ring-2 focus-visible:ring-gold/40"
              >
                <Icon name="X" size={16} />
              </RadixToast.Close>
            </RadixToast.Root>
          );
        })}
        <RadixToast.Viewport className="fixed bottom-4 right-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2.5 outline-none" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}
