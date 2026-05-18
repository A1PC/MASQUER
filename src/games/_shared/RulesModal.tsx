import type { JSX, ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface Props {
  /** True = modal is open and rendered. */
  open: boolean;
  /** Game title, shown in the modal header. */
  title: string;
  /** Rules content (paragraphs, tables, lists). */
  children: ReactNode;
  /** Called when the user clicks the X, hits ESC, or clicks the backdrop. */
  onClose: () => void;
}

/**
 * Centered overlay popup with a fixed header and scrollable body. ESC and
 * backdrop click both close. Focus is moved to the close button on open so
 * keyboard users can dismiss immediately.
 */
export default function RulesModal({ open, title, children, onClose }: Props): JSX.Element | null {
  const reduce = useReducedMotion() ?? false;
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    closeBtnRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="rules-backdrop"
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4"
          initial={reduce ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.15 }}
          onClick={onClose}
          role="presentation"
          data-rules-backdrop
        >
          <motion.div
            key="rules-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rules-modal-title"
            className="relative max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-lg border-2 border-gold bg-felt-deep shadow-gold-glow"
            initial={reduce ? { scale: 1, opacity: 1 } : { scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduce ? { scale: 1, opacity: 0 } : { scale: 0.96, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.18, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-gold/40 px-5 py-3">
              <h2
                id="rules-modal-title"
                className="font-display text-base tracking-[0.18em] text-gold-bright"
              >
                {title} — Rules
              </h2>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={onClose}
                aria-label="Close rules"
                className="grid h-7 w-7 place-items-center rounded-full border border-white/30 text-white/70 hover:bg-white/10 hover:text-white"
              >
                ×
              </button>
            </header>
            <div className="overflow-y-auto px-5 py-4 text-sm leading-relaxed text-white/85">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
