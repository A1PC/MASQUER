import { forwardRef } from 'react';
import * as RadixSwitch from '@radix-ui/react-switch';
import { cn } from './cn';

/**
 * Toggle built on `@radix-ui/react-switch`: brass-edged dark track that fills
 * gold when checked, with a porcelain thumb. Focus-visible shows the gold ring;
 * the 44px-wide hit area keeps it touch-friendly. Controlled (`checked`) and
 * uncontrolled (`defaultChecked`) both pass through.
 */
export const Switch = forwardRef<
  React.ElementRef<typeof RadixSwitch.Root>,
  React.ComponentPropsWithoutRef<typeof RadixSwitch.Root>
>(function Switch({ className, ...rest }, ref) {
  return (
    <RadixSwitch.Root
      ref={ref}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-brass ' +
          'bg-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gold/40 ' +
          'data-[state=checked]:border-gold data-[state=checked]:bg-gold ' +
          'disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...rest}
    >
      <RadixSwitch.Thumb
        className={
          'pointer-events-none block h-4 w-4 translate-x-1 rounded-full bg-porcelain shadow ' +
          'transition-transform motion-reduce:transition-none data-[state=checked]:translate-x-6 ' +
          'data-[state=checked]:bg-base'
        }
      />
    </RadixSwitch.Root>
  );
});
