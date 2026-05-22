import { forwardRef } from 'react';
import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { cn } from './cn';
import { Icon } from './Icon';

/**
 * Checkbox built on `@radix-ui/react-checkbox`: a brass box on the dark base
 * that fills gold and shows a dark check glyph when selected. Focus-visible
 * shows the gold ring. Controlled (`checked`) and uncontrolled
 * (`defaultChecked`) both pass through.
 */
export const Checkbox = forwardRef<
  React.ElementRef<typeof RadixCheckbox.Root>,
  React.ComponentPropsWithoutRef<typeof RadixCheckbox.Root>
>(function Checkbox({ className, ...rest }, ref) {
  return (
    <RadixCheckbox.Root
      ref={ref}
      className={cn(
        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-brass bg-base ' +
          'outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gold/40 ' +
          'data-[state=checked]:border-gold data-[state=checked]:bg-gold ' +
          'disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...rest}
    >
      <RadixCheckbox.Indicator className="text-[#241702]">
        <Icon name="Check" size={14} />
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );
});
