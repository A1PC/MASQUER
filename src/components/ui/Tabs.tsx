import { forwardRef } from 'react';
import type { JSX } from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';
import { cn } from './cn';

/**
 * `Tabs` wraps `@radix-ui/react-tabs` (roving-tabindex keyboard nav, arrow keys
 * move the active tab, `aria-selected` managed by Radix). Velvet Deco styling:
 * a brass hairline under the list, Cinzel triggers that turn gold with a gold
 * underline when active. Controlled (`value`) and uncontrolled (`defaultValue`)
 * both pass through.
 */
export const TabsList = forwardRef<
  React.ElementRef<typeof RadixTabs.List>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.List>
>(function TabsList({ className, ...rest }, ref) {
  return (
    <RadixTabs.List
      ref={ref}
      className={cn('flex items-stretch gap-1 border-b border-brass/40', className)}
      {...rest}
    />
  );
});

export const TabsTrigger = forwardRef<
  React.ElementRef<typeof RadixTabs.Trigger>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Trigger>
>(function TabsTrigger({ className, ...rest }, ref) {
  return (
    <RadixTabs.Trigger
      ref={ref}
      className={cn(
        'relative -mb-px min-h-[44px] cursor-pointer border-b-2 border-transparent px-4 py-2.5 ' +
          'font-display text-sm tracking-[0.04em] text-ivory/65 outline-none transition-colors ' +
          'hover:text-ivory focus-visible:ring-2 focus-visible:ring-gold/40 ' +
          'data-[state=active]:border-gold data-[state=active]:text-gold ' +
          'disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...rest}
    />
  );
});

export const TabsContent = forwardRef<
  React.ElementRef<typeof RadixTabs.Content>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Content>
>(function TabsContent({ className, ...rest }, ref) {
  return (
    <RadixTabs.Content
      ref={ref}
      className={cn(
        'mt-4 font-body text-sm text-ivory/90 outline-none focus-visible:ring-2 focus-visible:ring-gold/30',
        className,
      )}
      {...rest}
    />
  );
});

type TabsRootProps = React.ComponentPropsWithoutRef<typeof RadixTabs.Root>;

/**
 * Root of the compound `Tabs`. Sub-parts attach as statics
 * (`Tabs.List` / `Tabs.Trigger` / `Tabs.Content`) so call-sites read as one
 * vocabulary, mirroring `Select`.
 */
export function Tabs(props: TabsRootProps): JSX.Element {
  return <RadixTabs.Root {...props} />;
}

Tabs.List = TabsList;
Tabs.Trigger = TabsTrigger;
Tabs.Content = TabsContent;
