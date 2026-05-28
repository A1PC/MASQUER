import type { JSX, ReactNode } from 'react';
import { useState } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { cn } from './cn';
import { Icon } from './Icon';
import { scaleIn, slideInRight, fadeIn } from '@/motion/variants';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';

/**
 * `Modal` / `Drawer` wrap `@radix-ui/react-dialog`, which provides the
 * accessibility contract (focus trap + restore-on-close, Escape-to-close,
 * `role="dialog"` + `aria-modal`, and a scrim that blocks the background).
 * Velvet Deco styling: a 55% scrim over the page, a deco-framed surface panel,
 * a Cinzel gold title, and a labelled close affordance.
 *
 * Enter/exit motion uses the shared Framer variant library (`scaleIn` for the
 * modal panel, `slideInRight` for the drawer, `fadeIn` for the scrim), gated by
 * `useEffectiveReducedMotion()` so reduced-motion users get instant state.
 * Radix `forceMount` keeps the dialog node mounted while `AnimatePresence` plays
 * the exit, and the `motion.div` lives *inside* Radix `Content` so the focus
 * trap stays attached to the Radix-managed element.
 */

const overlayClass = 'fixed inset-0 z-40 bg-black/55 backdrop-blur-sm';

const closeButtonClass =
  'absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full ' +
  'text-brass outline-none transition-colors hover:bg-gold/10 hover:text-gold ' +
  'focus-visible:ring-2 focus-visible:ring-gold/40';

interface DialogShellProps {
  /** Element that opens the dialog; rendered through Radix `Trigger` (`asChild`). */
  trigger?: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  /** Controlled open state (passthrough to Radix). */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

interface ContentVariantProps extends DialogShellProps {
  /** Positioning applied to the Radix `Content` node (no animated transform). */
  positionClass: string;
  /** Visual panel styling applied to the inner (animated) element. */
  panelClass: string;
  /** The panel-entrance variant (`scaleIn` for modal, `slideInRight` for drawer). */
  panelVariants: Variants;
}

function DialogShell({
  trigger,
  title,
  description,
  children,
  open,
  defaultOpen,
  onOpenChange,
  className,
  positionClass,
  panelClass,
  panelVariants,
}: ContentVariantProps): JSX.Element {
  const reduce = useEffectiveReducedMotion();
  // Track open state internally so `AnimatePresence` can play the exit before
  // Radix unmounts. Mirrors the controlled prop when provided, else owns it.
  const [internalOpen, setInternalOpen] = useState<boolean>(defaultOpen ?? false);
  const isOpen = open ?? internalOpen;

  const handleOpenChange = (next: boolean): void => {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const body = (
    <>
      <RadixDialog.Title className="mb-1 pr-8 font-display text-lg tracking-[0.04em] text-gold">
        {title}
      </RadixDialog.Title>
      {description ? (
        <RadixDialog.Description className="mb-3 font-body text-sm font-light leading-relaxed text-ivory/80">
          {description}
        </RadixDialog.Description>
      ) : null}
      <div className="font-body text-sm text-ivory/90">{children}</div>
      <RadixDialog.Close aria-label="Close" className={closeButtonClass}>
        <Icon name="X" size={18} />
      </RadixDialog.Close>
    </>
  );

  return (
    <RadixDialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      {trigger ? <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger> : null}
      <AnimatePresence>
        {isOpen ? (
          <RadixDialog.Portal forceMount>
            <RadixDialog.Overlay asChild forceMount>
              {reduce ? (
                <div className={overlayClass} />
              ) : (
                <motion.div
                  className={overlayClass}
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                />
              )}
            </RadixDialog.Overlay>
            <RadixDialog.Content
              forceMount
              className={positionClass}
              // When no description is provided, opt out of Radix's
              // aria-describedby warning rather than duplicating the title
              // into an sr-only Description (audit §1.1 — screen readers
              // were hearing the title twice).
              {...(description ? {} : { 'aria-describedby': undefined })}
            >
              {reduce ? (
                <div className={cn(panelClass, className)}>{body}</div>
              ) : (
                <motion.div
                  className={cn(panelClass, className)}
                  variants={panelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {body}
                </motion.div>
              )}
            </RadixDialog.Content>
          </RadixDialog.Portal>
        ) : null}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}

// Radix `Content` is the focus-trapped node; it owns positioning only (no
// transform, so Framer's animated transform never fights a Tailwind translate).
const modalPositionClass = 'fixed inset-0 z-50 grid place-items-center p-4 focus:outline-none';
const modalPanelClass = cn(
  'relative w-[min(92vw,420px)] rounded-xl border border-brass bg-surface p-5 shadow-velvet-panel',
  'before:pointer-events-none before:absolute before:inset-1.5 before:rounded-lg before:border before:border-brass/40',
);

export function Modal(props: DialogShellProps): JSX.Element {
  return (
    <DialogShell
      {...props}
      positionClass={modalPositionClass}
      panelClass={modalPanelClass}
      panelVariants={scaleIn}
    />
  );
}

const drawerPositionClass = 'fixed inset-y-0 right-0 z-50 flex focus:outline-none';
const drawerPanelClass = cn(
  'relative flex w-[min(90vw,360px)] flex-col border-l border-brass bg-surface p-5 shadow-velvet-panel',
  'before:pointer-events-none before:absolute before:inset-1.5 before:rounded-lg before:border before:border-brass/40',
);

export function Drawer(props: DialogShellProps): JSX.Element {
  return (
    <DialogShell
      {...props}
      positionClass={drawerPositionClass}
      panelClass={drawerPanelClass}
      panelVariants={slideInRight}
    />
  );
}
