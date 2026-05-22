import type { JSX, ReactNode } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { cn } from './cn';
import { Icon } from './Icon';

/**
 * `Modal` / `Drawer` wrap `@radix-ui/react-dialog`, which provides the
 * accessibility contract (focus trap + restore-on-close, Escape-to-close,
 * `role="dialog"` + `aria-modal`, and a scrim that blocks the background).
 * Velvet Deco styling: a 55% scrim over the page, a deco-framed surface panel,
 * a Cinzel gold title, and a labelled close affordance. All enter/exit motion
 * is `motion-safe` only — `prefers-reduced-motion` users get instant state.
 */

const overlayClass =
  'fixed inset-0 z-40 bg-black/55 backdrop-blur-sm ' +
  'motion-safe:data-[state=open]:animate-fadeIn motion-safe:data-[state=closed]:animate-fadeOut';

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
  contentClass: string;
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
  contentClass,
}: ContentVariantProps): JSX.Element {
  const rootProps: RadixDialog.DialogProps = {
    ...(open !== undefined ? { open } : {}),
    ...(defaultOpen !== undefined ? { defaultOpen } : {}),
    ...(onOpenChange ? { onOpenChange } : {}),
  };
  return (
    <RadixDialog.Root {...rootProps}>
      {trigger ? <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger> : null}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={overlayClass} />
        <RadixDialog.Content className={cn(contentClass, className)}>
          <RadixDialog.Title className="mb-1 pr-8 font-display text-lg tracking-[0.04em] text-gold">
            {title}
          </RadixDialog.Title>
          {description ? (
            <RadixDialog.Description className="mb-3 font-body text-sm font-light leading-relaxed text-ivory/80">
              {description}
            </RadixDialog.Description>
          ) : (
            <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
          )}
          <div className="font-body text-sm text-ivory/90">{children}</div>
          <RadixDialog.Close aria-label="Close" className={closeButtonClass}>
            <Icon name="X" size={18} />
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

const modalContentClass =
  'fixed left-1/2 top-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 ' +
  'rounded-xl border border-brass bg-surface p-5 shadow-velvet-panel ' +
  'before:pointer-events-none before:absolute before:inset-1.5 before:rounded-lg before:border before:border-brass/40 ' +
  'focus:outline-none ' +
  'motion-safe:data-[state=open]:animate-scaleIn motion-safe:data-[state=closed]:animate-scaleOut';

export function Modal(props: DialogShellProps): JSX.Element {
  return <DialogShell {...props} contentClass={modalContentClass} />;
}

const drawerContentClass =
  'fixed inset-y-0 right-0 z-50 flex w-[min(90vw,360px)] flex-col border-l border-brass bg-surface p-5 shadow-velvet-panel ' +
  'before:pointer-events-none before:absolute before:inset-1.5 before:rounded-lg before:border before:border-brass/40 ' +
  'focus:outline-none ' +
  'motion-safe:data-[state=open]:animate-slideInRight motion-safe:data-[state=closed]:animate-slideOutRight';

export function Drawer(props: DialogShellProps): JSX.Element {
  return <DialogShell {...props} contentClass={drawerContentClass} />;
}
