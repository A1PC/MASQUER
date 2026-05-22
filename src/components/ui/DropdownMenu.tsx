import { forwardRef } from 'react';
import type { JSX } from 'react';
import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import { cn } from './cn';

/**
 * `DropdownMenu` wraps `@radix-ui/react-dropdown-menu` (focus trap while open,
 * arrow-key navigation, type-ahead, Escape-to-close, `role="menu"`/`menuitem`
 * all managed by Radix). Velvet Deco styling: a deco-framed surface panel,
 * items that highlight gold on focus/hover, brass separators. Content enter
 * motion is `motion-safe` only. Controlled/uncontrolled pass through Radix.
 */
export const DropdownMenuContent = forwardRef<
  React.ElementRef<typeof RadixMenu.Content>,
  React.ComponentPropsWithoutRef<typeof RadixMenu.Content>
>(function DropdownMenuContent({ className, sideOffset = 6, ...rest }, ref) {
  return (
    <RadixMenu.Portal>
      <RadixMenu.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'relative z-50 min-w-[180px] overflow-hidden rounded-lg border border-brass bg-surface p-1.5 ' +
            'text-ivory shadow-velvet-panel ' +
            'before:pointer-events-none before:absolute before:inset-1 before:rounded-md before:border before:border-brass/40 ' +
            'motion-safe:data-[state=open]:animate-scaleIn motion-safe:data-[state=closed]:animate-fadeOut',
          className,
        )}
        {...rest}
      />
    </RadixMenu.Portal>
  );
});

export const DropdownMenuItem = forwardRef<
  React.ElementRef<typeof RadixMenu.Item>,
  React.ComponentPropsWithoutRef<typeof RadixMenu.Item>
>(function DropdownMenuItem({ className, ...rest }, ref) {
  return (
    <RadixMenu.Item
      ref={ref}
      className={cn(
        'relative flex min-h-[40px] cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 ' +
          'font-body text-sm text-ivory/90 outline-none transition-colors ' +
          'data-[highlighted]:bg-gold/15 data-[highlighted]:text-gold ' +
          'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
        className,
      )}
      {...rest}
    />
  );
});

export const DropdownMenuSeparator = forwardRef<
  React.ElementRef<typeof RadixMenu.Separator>,
  React.ComponentPropsWithoutRef<typeof RadixMenu.Separator>
>(function DropdownMenuSeparator({ className, ...rest }, ref) {
  return (
    <RadixMenu.Separator ref={ref} className={cn('my-1 h-px bg-brass/30', className)} {...rest} />
  );
});

export const DropdownMenuLabel = forwardRef<
  React.ElementRef<typeof RadixMenu.Label>,
  React.ComponentPropsWithoutRef<typeof RadixMenu.Label>
>(function DropdownMenuLabel({ className, ...rest }, ref) {
  return (
    <RadixMenu.Label
      ref={ref}
      className={cn(
        'px-3 py-1.5 font-body text-[10px] uppercase tracking-[0.15em] text-ivory/50',
        className,
      )}
      {...rest}
    />
  );
});

type DropdownMenuRootProps = React.ComponentPropsWithoutRef<typeof RadixMenu.Root>;

/**
 * Root of the compound `DropdownMenu`. Sub-parts attach as statics
 * (`Trigger` / `Content` / `Item` / `Separator` / `Label`).
 */
export function DropdownMenu(props: DropdownMenuRootProps): JSX.Element {
  return <RadixMenu.Root {...props} />;
}

DropdownMenu.Trigger = RadixMenu.Trigger;
DropdownMenu.Content = DropdownMenuContent;
DropdownMenu.Item = DropdownMenuItem;
DropdownMenu.Separator = DropdownMenuSeparator;
DropdownMenu.Label = DropdownMenuLabel;
