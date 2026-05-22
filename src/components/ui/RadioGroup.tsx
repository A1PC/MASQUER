import { forwardRef } from 'react';
import * as RadixRadioGroup from '@radix-ui/react-radio-group';
import { cn } from './cn';

/**
 * Radio group built on `@radix-ui/react-radio-group`: each item is a
 * brass-ringed circle on the dark base that shows a gold dot when selected.
 * Arrow keys move the selection; focus-visible shows the gold ring. Controlled
 * (`value`) and uncontrolled (`defaultValue`) both pass through.
 */
export const RadioGroup = forwardRef<
  React.ElementRef<typeof RadixRadioGroup.Root>,
  React.ComponentPropsWithoutRef<typeof RadixRadioGroup.Root>
>(function RadioGroup({ className, ...rest }, ref) {
  return (
    <RadixRadioGroup.Root ref={ref} className={cn('flex flex-col gap-2', className)} {...rest} />
  );
});

export const RadioGroupItem = forwardRef<
  React.ElementRef<typeof RadixRadioGroup.Item>,
  React.ComponentPropsWithoutRef<typeof RadixRadioGroup.Item>
>(function RadioGroupItem({ className, ...rest }, ref) {
  return (
    <RadixRadioGroup.Item
      ref={ref}
      className={cn(
        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-brass bg-base ' +
          'outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gold/40 ' +
          'data-[state=checked]:border-gold disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...rest}
    >
      <RadixRadioGroup.Indicator className="block h-2.5 w-2.5 rounded-full bg-gold" />
    </RadixRadioGroup.Item>
  );
});
