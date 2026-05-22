import { forwardRef } from 'react';
import type { JSX, ReactNode } from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import { cn } from './cn';

/**
 * `Tooltip` wraps `@radix-ui/react-tooltip`. Radix gives the accessibility
 * contract: the content carries `role="tooltip"`, it shows on hover *and*
 * keyboard focus, and Escape dismisses it. Velvet Deco styling: a small
 * deco-framed surface panel. Enter animation is `motion-safe` only so
 * reduced-motion users get an instant tooltip.
 *
 * Wrap the app (or a subtree) once in `TooltipProvider`, then use `Tooltip`
 * per-target.
 */
export function TooltipProvider(
  props: React.ComponentProps<typeof RadixTooltip.Provider>,
): JSX.Element {
  return <RadixTooltip.Provider {...props} />;
}

interface TooltipProps {
  /** The trigger element; rendered through Radix `Trigger` (`asChild`). */
  children: ReactNode;
  content: ReactNode;
  side?: RadixTooltip.TooltipContentProps['side'];
  /** Delay before showing, ms (Radix default 700). */
  delayDuration?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const TooltipContent = forwardRef<
  React.ElementRef<typeof RadixTooltip.Content>,
  React.ComponentPropsWithoutRef<typeof RadixTooltip.Content>
>(function TooltipContent({ className, sideOffset = 6, children, ...rest }, ref) {
  return (
    <RadixTooltip.Portal>
      <RadixTooltip.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'relative z-50 max-w-[220px] rounded-lg border border-brass bg-surface px-3 py-2 ' +
            'font-body text-xs leading-relaxed text-ivory shadow-velvet-panel ' +
            'before:pointer-events-none before:absolute before:inset-1 before:rounded-md before:border before:border-brass/40 ' +
            'motion-safe:data-[state=delayed-open]:animate-fadeIn',
          className,
        )}
        {...rest}
      >
        {children}
        <RadixTooltip.Arrow className="fill-brass" />
      </RadixTooltip.Content>
    </RadixTooltip.Portal>
  );
});

export function Tooltip({
  children,
  content,
  side = 'top',
  delayDuration,
  open,
  defaultOpen,
  onOpenChange,
}: TooltipProps): JSX.Element {
  const rootProps: RadixTooltip.TooltipProps = {
    ...(delayDuration !== undefined ? { delayDuration } : {}),
    ...(open !== undefined ? { open } : {}),
    ...(defaultOpen !== undefined ? { defaultOpen } : {}),
    ...(onOpenChange ? { onOpenChange } : {}),
  };
  return (
    <RadixTooltip.Root {...rootProps}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <TooltipContent side={side}>{content}</TooltipContent>
    </RadixTooltip.Root>
  );
}
