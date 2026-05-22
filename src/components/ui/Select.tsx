import { forwardRef } from 'react';
import type { JSX } from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { cn } from './cn';
import { Icon } from './Icon';

/**
 * `Select` wraps `@radix-ui/react-select` in the Velvet Deco language: the
 * trigger reads like an `Input` (dark base, brass border, gold focus ring), the
 * content is a deco panel, and items highlight gold on focus/hover. Controlled
 * (`value`/`onValueChange`) and uncontrolled (`defaultValue`) both pass through.
 */
export const SelectTrigger = forwardRef<
  React.ElementRef<typeof RadixSelect.Trigger>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Trigger>
>(function SelectTrigger({ className, children, ...rest }, ref) {
  return (
    <RadixSelect.Trigger
      ref={ref}
      className={cn(
        'inline-flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg border border-brass ' +
          'bg-base px-3 py-2.5 font-body text-ivory outline-none transition-colors ' +
          'data-[placeholder]:text-ivory/40 focus-visible:border-gold focus-visible:ring-2 ' +
          'focus-visible:ring-gold/30 disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...rest}
    >
      {children}
      <RadixSelect.Icon asChild>
        <Icon name="ChevronDown" size={16} className="text-brass" />
      </RadixSelect.Icon>
    </RadixSelect.Trigger>
  );
});

export const SelectContent = forwardRef<
  React.ElementRef<typeof RadixSelect.Content>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Content>
>(function SelectContent({ className, children, position = 'popper', ...rest }, ref) {
  return (
    <RadixSelect.Portal>
      <RadixSelect.Content
        ref={ref}
        position={position}
        className={cn(
          'relative z-50 overflow-hidden rounded-lg border border-brass bg-surface text-ivory shadow-velvet-panel ' +
            'before:pointer-events-none before:absolute before:inset-1 before:rounded-md before:border before:border-brass/40',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
          className,
        )}
        {...rest}
      >
        <RadixSelect.Viewport className="p-1.5">{children}</RadixSelect.Viewport>
      </RadixSelect.Content>
    </RadixSelect.Portal>
  );
});

export const SelectItem = forwardRef<
  React.ElementRef<typeof RadixSelect.Item>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Item>
>(function SelectItem({ className, children, ...rest }, ref) {
  return (
    <RadixSelect.Item
      ref={ref}
      className={cn(
        'relative flex min-h-[40px] cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 ' +
          'font-body text-sm text-ivory/90 outline-none transition-colors ' +
          'data-[highlighted]:bg-gold/15 data-[highlighted]:text-gold ' +
          'data-[state=checked]:text-gold data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
        className,
      )}
      {...rest}
    >
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
      <RadixSelect.ItemIndicator className="ml-auto">
        <Icon name="Check" size={15} />
      </RadixSelect.ItemIndicator>
    </RadixSelect.Item>
  );
});

type SelectRootProps = React.ComponentPropsWithoutRef<typeof RadixSelect.Root>;

/**
 * Root of the compound `Select`. Sub-parts are attached as statics
 * (`Select.Trigger` / `Select.Content` / `Select.Item` / `Select.Value` /
 * `Select.Group`) so call-sites read as one vocabulary.
 */
export function Select(props: SelectRootProps): JSX.Element {
  return <RadixSelect.Root {...props} />;
}

Select.Group = RadixSelect.Group;
Select.Value = RadixSelect.Value;
Select.Trigger = SelectTrigger;
Select.Content = SelectContent;
Select.Item = SelectItem;
